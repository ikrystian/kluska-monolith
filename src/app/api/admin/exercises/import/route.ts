import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Exercise } from '@/models';
import {
  parseOpenGymExercises,
  buildExerciseDoc,
} from '@/lib/import-opengym-exercises';
import { downloadAllExerciseMedia } from '@/lib/import-exercise-media';
import type { BuiltExercise } from '@/lib/import-opengym-exercises';

/**
 * POST /api/admin/exercises/import
 *
 * Importuje wszystkie ćwiczenia z pliku opengym-exercises-pl.json
 * (biblioteka openGym) zachowując strukturę obecną w bazie (model Exercise).
 *
 * Obrazki i animacje są pobierane lokalnie do `upload-data/`, więc w bazie
 * trzymane są ścieżki `/upload-data/...` zamiast linków do opengym.ch.
 *
 * Plik jest odczytywany bezpośrednio po stronie serwera. Domyślna lokalizacja:
 *  - `OPENGYM_EXERCISES_JSON_PATH` (jeśli ustawiona)
 *  - `<katalog projektu>/scripts/data/opengym-exercises-pl.json`
 *  - fallback: `<katalog projektu>/athlete-spa/opengym-exercises-pl.json`
 *
 * Ćwiczenia o nazwie już obecnej w bazie są pomijane (import jest
 * idempotentny — wielokrotne kliknięcie nie tworzy duplikatów).
 */

const CHUNK_SIZE = 200;
const DOWNLOAD_CONCURRENCY = 10;

function normalizePath(p: string): string {
  return path.resolve(p);
}

async function findImportFile(): Promise<string | null> {
  const candidates = [
    process.env.OPENGYM_EXERCISES_JSON_PATH,
    path.join(process.cwd(), 'scripts', 'data', 'opengym-exercises-pl.json'),
    path.join(process.cwd(), 'athlete-spa', 'opengym-exercises-pl.json'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const normalized = normalizePath(candidate);
      const stat = await fs.stat(normalized);
      if (stat.isFile()) return normalized;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function insertInChunks(docs: BuiltExercise[]) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const res = await Exercise.insertMany(chunk, { ordered: false });
    inserted += res.length;
  }
  return inserted;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const filePath = await findImportFile();
    if (!filePath) {
      return NextResponse.json(
        {
          error:
            'Nie znaleziono pliku opengym-exercises-pl.json. Ustaw zmienną OPENGYM_EXERCISES_JSON_PATH lub umieść plik w scripts/data/.',
        },
        { status: 404 }
      );
    }

    const rawText = await fs.readFile(filePath, 'utf8');
    const parsed = parseOpenGymExercises(JSON.parse(rawText));

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: 'Plik nie zawiera ćwiczeń do zaimportowania.' },
        { status: 400 }
      );
    }

    // Pomiń duplikaty wewnątrz pliku oraz ćwiczenia już obecne w bazie.
    const seen = new Set<string>();
    const candidates: {
      ex: ReturnType<typeof parseOpenGymExercises>[number];
      media: { id: string; imageUrl: string; animationUrl: string };
    }[] = [];
    for (const ex of parsed) {
      if (!ex.name) continue;
      const lower = ex.name.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      candidates.push({ ex, media: { id: ex.id, imageUrl: ex.image_url, animationUrl: ex.animation_url } });
    }

    const candidateDocs: BuiltExercise[] = candidates.map(c => buildExerciseDoc(c.ex));

    const existingNames = await Exercise.distinct('name', {
      name: { $in: candidateDocs.map(d => d.name) },
    });
    const existingSet = new Set(existingNames.map((n: unknown) => String(n).toLowerCase()));

    const candidatesToInsert = candidates.filter(
      (c, i) => !existingSet.has(candidateDocs[i].name.toLowerCase())
    );

    // Pobierz obrazki i animacje lokalnie (tylko dla ćwiczeń, które wejdą do bazy).
    const mediaMap = await downloadAllExerciseMedia(
      candidatesToInsert.map(c => c.media),
      DOWNLOAD_CONCURRENCY
    );

    const docsToInsert: BuiltExercise[] = candidatesToInsert.map(c =>
      buildExerciseDoc(c.ex, mediaMap.get(c.media.id))
    );

    let externalFallbacks = 0;
    for (const d of docsToInsert) {
      if (d.mediaUrl.startsWith('http')) externalFallbacks++;
      const anim = d.setup.find(s => s.group === 'Animacja' && s.value.startsWith('http'));
      if (anim) externalFallbacks++;
    }

    const inserted = docsToInsert.length > 0 ? await insertInChunks(docsToInsert) : 0;
    const skipped = candidateDocs.length - inserted;

    return NextResponse.json({
      success: true,
      total: candidateDocs.length,
      inserted,
      skipped,
      mediaDownloaded: docsToInsert.length - externalFallbacks,
      mediaExternalFallbacks: externalFallbacks,
      file: filePath,
    });
  } catch (error) {
    console.error('POST /api/admin/exercises/import error:', error);
    return NextResponse.json(
      {
        error: 'Błąd importu ćwiczeń',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}