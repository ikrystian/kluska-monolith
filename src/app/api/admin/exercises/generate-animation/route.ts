import { NextRequest, NextResponse } from 'next/server';
import { access, mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Exercise } from '@/models';

export const runtime = 'nodejs';

/**
 * Generowanie animacji ćwiczenia modelem Wan (text-to-video) przez treg.to.
 *
 *   POST  { name, instructions, muscleGroups }  -> { taskId }
 *   GET   ?taskId=...&exerciseId=...            -> { status: 'pending' | 'completed' | 'failed', url? }
 *
 * Generowanie trwa 1–5 minut, więc POST tylko zleca zadanie, a klient odpytuje
 * GET. Gdy zadanie się zakończy, GET pobiera MP4 do `upload-data/` i — jeśli
 * podano `exerciseId` — od razu zapisuje je jako animację ćwiczenia, żeby
 * opłacone wideo nie przepadło po zamknięciu formularza.
 *
 * Token treg zostaje na serwerze (TREG_TOKEN / TREG_ORG w .env).
 */

const TREG_BASE = 'https://treg.to/call';
const GENERATE_ENDPOINT = 'https://treg.to/call/openrouter.video-gen.wan-2-6.from_text';
const STATUS_ENDPOINT = 'openrouter.video-gen.task.status';
const RESULT_ENDPOINT = 'openrouter.video-gen.result.retrieve';

const VIDEO_MODEL = 'alibaba/wan-2.6';
const UPLOAD_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'upload-data');
const ANIMATION_SETUP_GROUP = 'Animacja';
const MAX_INSTRUCTIONS_LENGTH = 2000;

const FAILED_STATUSES = new Set(['failed', 'cancelled', 'expired']);

function tregHeaders(): Record<string, string> | null {
  const token = process.env.TREG_TOKEN;
  if (!token) return null;
  const headers: Record<string, string> = { 'X-Treg-Token': token };
  if (process.env.TREG_ORG) headers['X-Treg-Org'] = process.env.TREG_ORG;
  return headers;
}

async function requireAdmin(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

function buildPrompt(name: string, instructions: string, muscleGroups: string[]): string {
  const parts = [`generate tutorial exercise for (man without t-shirt): ${name}`];
  if (instructions) parts.push(instructions);
  let prompt = parts.join(' ');
  if (muscleGroups.length > 0) {
    prompt += `, zaznacz mięśnie które pracują przy tym ćwiczeniu ${muscleGroups.join(', ')} - nie dodawaj zadnych napisów do animacji`;
  }
  return prompt;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Szuka pierwszego URL-a http(s) w odpowiedzi JSON (gdy treg zwróci link zamiast pliku). */
function findUrl(value: unknown): string | null {
  if (typeof value === 'string') return /^https?:\/\//.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const found = findUrl(item);
      if (found) return found;
    }
  }
  return null;
}

/** Pobiera gotowe wideo zadania jako bufor MP4. */
async function fetchVideo(taskId: string, headers: Record<string, string>): Promise<Buffer> {
  let res = await fetch(`${TREG_BASE}/${RESULT_ENDPOINT}?id=${encodeURIComponent(taskId)}`, { headers });
  if (!res.ok) {
    throw new Error(`Nie udało się pobrać wideo (HTTP ${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  if ((res.headers.get('content-type') ?? '').includes('json')) {
    const url = findUrl(await res.json());
    if (!url) throw new Error('Odpowiedź z wideo nie zawiera pliku ani linku.');
    res = await fetch(url);
    if (!res.ok) throw new Error(`Nie udało się pobrać wideo z linku (HTTP ${res.status}).`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  // MP4 ma sygnaturę "ftyp" na bajtach 4–8; chroni przed zapisaniem strony błędu jako .mp4.
  if (buffer.length < 12 || buffer.subarray(4, 8).toString('latin1') !== 'ftyp') {
    throw new Error('Pobrany plik nie jest wideo MP4.');
  }
  return buffer;
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const headers = tregHeaders();
    if (!headers) {
      return NextResponse.json({ error: 'Brak TREG_TOKEN w konfiguracji serwera.' }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const instructions =
      typeof body?.instructions === 'string'
        ? body.instructions.replace(/\s+/g, ' ').trim().slice(0, MAX_INSTRUCTIONS_LENGTH)
        : '';
    const muscleGroups: string[] = Array.isArray(body?.muscleGroups)
      ? body.muscleGroups.filter((g: unknown): g is string => typeof g === 'string' && g.trim() !== '')
      : [];

    if (!name) {
      return NextResponse.json({ error: 'Nazwa ćwiczenia jest wymagana.' }, { status: 400 });
    }

    const res = await fetch(`${TREG_BASE}/${GENERATE_ENDPOINT}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VIDEO_MODEL,
        prompt: buildPrompt(name, instructions, muscleGroups),
        duration: 5,
        generate_audio: false,
        resolution: '480p',
        aspect_ratio: '4:3',
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('generate-animation: treg error', res.status, text);
      return NextResponse.json(
        { error: `Generowanie nie wystartowało (HTTP ${res.status}).`, details: text.slice(0, 500) },
        { status: 502 },
      );
    }

    let data: { id?: string } | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      // obsłużone niżej
    }
    if (!data?.id) {
      console.error('generate-animation: brak id zadania', text);
      return NextResponse.json({ error: 'Odpowiedź nie zawiera id zadania.' }, { status: 502 });
    }

    return NextResponse.json({ taskId: data.id });
  } catch (error) {
    console.error('POST /api/admin/exercises/generate-animation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się zlecić generowania.' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const headers = tregHeaders();
    if (!headers) {
      return NextResponse.json({ error: 'Brak TREG_TOKEN w konfiguracji serwera.' }, { status: 500 });
    }

    const taskId = request.nextUrl.searchParams.get('taskId') ?? '';
    const exerciseId = request.nextUrl.searchParams.get('exerciseId') ?? '';
    // Id trafia do nazwy pliku — tylko bezpieczne znaki.
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(taskId)) {
      return NextResponse.json({ error: 'Nieprawidłowe id zadania.' }, { status: 400 });
    }

    const filename = `ai-anim-${taskId}.mp4`;
    const absolute = path.join(/* turbopackIgnore: true */ UPLOAD_DIR, filename);
    const url = `/upload-data/${filename}`;

    if (!(await fileExists(absolute))) {
      const statusRes = await fetch(`${TREG_BASE}/${STATUS_ENDPOINT}?id=${encodeURIComponent(taskId)}`, {
        headers,
        cache: 'no-store',
      });
      if (!statusRes.ok) {
        const details = (await statusRes.text()).slice(0, 500);
        console.error('generate-animation: status error', statusRes.status, details);
        return NextResponse.json(
          { error: `Nie udało się sprawdzić statusu (HTTP ${statusRes.status}).`, details },
          { status: 502 },
        );
      }

      const task = await statusRes.json();
      const status = String(task?.status ?? '');
      if (FAILED_STATUSES.has(status)) {
        const reason = typeof task?.error === 'string' ? task.error : task?.error?.message;
        return NextResponse.json({ status: 'failed', error: reason || `Zadanie zakończone: ${status}.` });
      }
      if (status !== 'completed') {
        return NextResponse.json({ status: 'pending' });
      }

      const buffer = await fetchVideo(taskId, headers);
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(absolute, buffer);
    }

    if (exerciseId) {
      await connectToDatabase();
      const exercise = await Exercise.findById(exerciseId);
      if (exercise) {
        const setup = (exercise.setup ?? []).filter((item) => item.group !== ANIMATION_SETUP_GROUP);
        setup.push({ group: ANIMATION_SETUP_GROUP, value: url });
        exercise.set('setup', setup);
        await exercise.save();
      }
    }

    return NextResponse.json({ status: 'completed', url });
  } catch (error) {
    console.error('GET /api/admin/exercises/generate-animation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się pobrać animacji.' },
      { status: 500 },
    );
  }
}
