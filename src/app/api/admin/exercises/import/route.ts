import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Exercise } from '@/models';
import {
  parseOpenGymExercises,
  buildExerciseDocs,
} from '@/lib/import-opengym-exercises';
import type { BuiltExercise } from '@/lib/import-opengym-exercises';

/**
 * POST /api/admin/exercises/import
 *
 * Importuje wszystkie ćwiczenia z pliku opengym-exercises-pl.json
 * (biblioteka openGym) zachowując strukturę obecną w bazie (model Exercise).
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
    const docs = buildExerciseDocs(parsed);

    if (docs.length === 0) {
      return NextResponse.json(
        { error: 'Plik nie zawiera ćwiczeń do zaimportowania.' },
        { status: 400 }
      );
    }

    // Pomiń ćwiczenia, które już istnieją w bazie (idempotentność).
    const existingNames = await Exercise.distinct('name', {
      name: { $in: docs.map(d => d.name) },
    });
    const existingSet = new Set(existingNames.map((n: unknown) => String(n).toLowerCase()));
    const toInsert = docs.filter(d => !existingSet.has(d.name.toLowerCase()));

    const inserted = toInsert.length > 0 ? await insertInChunks(toInsert) : 0;
    const skipped = docs.length - inserted;

    return NextResponse.json({
      success: true,
      total: docs.length,
      inserted,
      skipped,
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