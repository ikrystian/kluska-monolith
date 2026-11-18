/**
 * Eksportuje całą bazę MongoDB do pliku NDJSON (jedna linia = jeden dokument).
 *
 *   npm run db:export                              # → backups/kluska-<data>.ndjson.gz
 *   npm run db:export -- backups/moja.ndjson       # własna ścieżka (bez kompresji)
 *   npm run db:export -- --uri "mongodb://..."     # inna baza niż MONGO_DB_URI z .env
 *
 * Format: pierwsza linia to nagłówek, potem wpisy typu "index" i "doc".
 * Typy BSON (ObjectId, Date, Decimal128...) zapisywane są w Extended JSON,
 * więc import odtwarza je bez zmian. Pliki kończące się na `.gz` są kompresowane.
 *
 * Uwaga: kolekcje eksportowane są kolejno, nie w jednej migawce — jeśli ktoś
 * zapisuje do bazy w trakcie eksportu, dane mogą być niespójne między kolekcjami.
 */
import 'dotenv/config';
import { BSON, MongoClient } from 'mongodb';
import { createWriteStream, mkdirSync } from 'node:fs';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import type { Writable } from 'node:stream';
import path from 'node:path';
import { parseArgs } from 'node:util';

const EXPORT_FORMAT = 'kluska-db-export';
const EXPORT_VERSION = 1;

const { EJSON } = BSON;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    uri: { type: 'string' },
  },
});

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function maskUri(uri: string): string {
  return uri.replace(/:[^:@/]*@/, ':****@');
}

async function main() {
  const uri = values.uri ?? process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error('Brak adresu bazy: ustaw MONGO_DB_URI w .env albo podaj --uri.');
  }

  const outFile =
    positionals[0] ?? path.join('backups', `kluska-${timestamp()}.ndjson.gz`);
  mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });

  console.log('🚀 Eksport bazy MongoDB');
  console.log(`📡 Źródło: ${maskUri(uri)}`);
  console.log(`💾 Plik:   ${path.resolve(outFile)}`);

  const startTime = Date.now();
  const client = new MongoClient(uri);
  await client.connect();

  const sink = createWriteStream(outFile);
  const gzip = outFile.endsWith('.gz') ? createGzip() : null;
  if (gzip) gzip.pipe(sink);
  const out: Writable = gzip ?? sink;

  const write = async (record: unknown) => {
    const line = EJSON.stringify(record as Record<string, unknown>, { relaxed: false });
    if (!out.write(line + '\n')) await once(out, 'drain');
  };

  try {
    const db = client.db();
    const infos = await db.listCollections({}, { nameOnly: true }).toArray();
    const names = infos
      .filter((c) => !c.name.startsWith('system.'))
      .map((c) => c.name)
      .sort();

    await write({
      t: 'header',
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date(),
      database: db.databaseName,
      collections: names,
    });

    console.log(`\nZnaleziono ${names.length} kolekcji.\n`);
    let totalDocs = 0;

    for (const name of names) {
      const col = db.collection(name);

      const indexes = await col.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const { v: _v, ns: _ns, ...spec } = idx;
        await write({ t: 'index', c: name, spec });
      }

      const count = await col.countDocuments();
      if (count === 0) {
        console.log(`  - ${name.padEnd(28)}: pusta`);
        continue;
      }

      process.stdout.write(`  ⏳ ${name.padEnd(28)}: 0 / ${count}`);
      let written = 0;
      const cursor = col.find({}).batchSize(1000);
      for await (const doc of cursor) {
        await write({ t: 'doc', c: name, d: doc });
        written++;
        if (written % 1000 === 0) {
          process.stdout.write(`\r  ⏳ ${name.padEnd(28)}: ${written} / ${count}`);
        }
      }
      totalDocs += written;
      process.stdout.write(`\r  ✓ ${name.padEnd(28)}: ${written} dokumentów\n`);
    }

    out.end();
    await finished(sink);

    const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Eksport zakończony: ${totalDocs} dokumentów w ${seconds} s.`);
    console.log(`   Import: npm run db:import -- "${outFile}"`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ Błąd eksportu:', err);
  process.exit(1);
});
