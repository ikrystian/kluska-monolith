/**
 * Importuje bazę z pliku wyeksportowanego przez `scripts/db-export.ts`.
 *
 *   npm run db:import -- backups/kluska-2026-11-18T10-00-00.ndjson.gz
 *   npm run db:import -- plik.ndjson --drop        # najpierw czyści kolekcje z pliku
 *   npm run db:import -- plik.ndjson --yes         # bez pytania o potwierdzenie
 *   npm run db:import -- plik.ndjson --uri "mongodb://..."  # inna baza niż MONGO_DB_URI
 *
 * Domyślnie (bez --drop) dokumenty są wstawiane przez upsert po `_id`:
 * istniejące dokumenty o tym samym `_id` są nadpisywane, reszta zostaje.
 * Ponowny import tego samego pliku jest bezpieczny.
 *
 * --drop usuwa kolekcje obecne w pliku przed importem (pełne odtworzenie stanu).
 *
 * Skrypt przed zapisem wypisuje cel i wymaga wpisania TAK (chyba że podasz --yes).
 */
import 'dotenv/config';
import { BSON, MongoClient, type AnyBulkWriteOperation, type Document } from 'mongodb';
import { createReadStream, existsSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { createInterface as createPromptInterface } from 'node:readline/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const FORMAT = 'kluska-db-export';
const SUPPORTED_VERSION = 1;
const BATCH_SIZE = 1000;

const { EJSON } = BSON;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    uri: { type: 'string' },
    drop: { type: 'boolean', default: false },
    yes: { type: 'boolean', default: false },
  },
});

function maskUri(uri: string): string {
  return uri.replace(/:[^:@/]*@/, ':****@');
}

interface Header {
  t: 'header';
  format: string;
  version: number;
  exportedAt: string;
  database: string;
  collections: string[];
}

async function confirm(uri: string, header: Header, file: string): Promise<void> {
  console.log(`📦 Plik:            ${path.resolve(file)}`);
  console.log(`   Eksport z:       ${header.exportedAt} (baza "${header.database}")`);
  console.log(`   Kolekcje w pliku: ${header.collections.length}`);
  console.log(`🎯 Cel:             ${maskUri(uri)}`);
  console.log(
    values.drop
      ? '⚠️  --drop: kolekcje z pliku zostaną USUNIĘTE i odtworzone z pliku.'
      : 'ℹ️  Tryb upsert: dokumenty o istniejącym _id zostaną nadpisane.',
  );

  if (values.yes) return;

  if (!process.stdin.isTTY) {
    throw new Error('Brak terminala do potwierdzenia. Dodaj --yes, aby uruchomić bez pytania.');
  }

  const rl = createPromptInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('\nWpisz TAK, aby kontynuować: ');
    if (answer.trim() !== 'TAK') {
      throw new Error('Przerwano — nic nie zostało zmienione.');
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const file = positionals[0];
  if (!file) {
    throw new Error('Podaj ścieżkę do pliku eksportu, np. npm run db:import -- backups/plik.ndjson.gz');
  }
  if (!existsSync(file)) {
    throw new Error(`Nie znaleziono pliku: ${file}`);
  }

  const uri = values.uri ?? process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error('Brak adresu bazy: ustaw MONGO_DB_URI w .env albo podaj --uri.');
  }

  const source = file.endsWith('.gz')
    ? createReadStream(file).pipe(createGunzip())
    : createReadStream(file);
  const lines = createInterface({ input: source, crlfDelay: Infinity });

  const client = new MongoClient(uri);
  let header: Header | undefined;
  const pending = new Map<string, AnyBulkWriteOperation<Document>[]>();
  const counts = new Map<string, number>();
  const startTime = Date.now();

  const flush = async (name: string) => {
    const ops = pending.get(name);
    if (!ops || ops.length === 0) return;
    await client.db().collection(name).bulkWrite(ops, { ordered: false });
    pending.set(name, []);
  };

  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      const rec = EJSON.parse(line) as Record<string, any>;

      if (!header) {
        if (rec.t !== 'header' || rec.format !== FORMAT) {
          throw new Error('Plik nie wygląda na eksport z kluska (brak poprawnego nagłówka).');
        }
        if (rec.version > SUPPORTED_VERSION) {
          throw new Error(`Wersja formatu ${rec.version} jest nowsza niż obsługiwana (${SUPPORTED_VERSION}).`);
        }
        header = rec as Header;
        await confirm(uri, header, file);
        await client.connect();

        if (values.drop) {
          const db = client.db();
          for (const name of header.collections) {
            await db
              .collection(name)
              .drop()
              .catch((err: { codeName?: string }) => {
                if (err.codeName !== 'NamespaceNotFound') throw err;
              });
          }
          console.log(`🗑  Usunięto ${header.collections.length} kolekcji (--drop).`);
        }
        // Tworzy też puste kolekcje z pliku, których nie ma żadnych dokumentów.
        for (const name of header.collections) {
          await client
            .db()
            .createCollection(name)
            .catch((err: { codeName?: string }) => {
              if (err.codeName !== 'NamespaceExists') throw err;
            });
        }
        console.log('\n🚀 Import…');
        continue;
      }

      if (rec.t === 'index') {
        const { key, ...options } = rec.spec;
        try {
          await client.db().collection(rec.c).createIndex(key, options);
        } catch (err) {
          console.warn(`  ⚠️  Indeks ${rec.spec.name} w ${rec.c}: ${(err as Error).message}`);
        }
      } else if (rec.t === 'doc') {
        const name: string = rec.c;
        const doc: Document = rec.d;
        const ops = pending.get(name) ?? [];
        ops.push(
          doc._id !== undefined
            ? { replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }
            : { insertOne: { document: doc } },
        );
        pending.set(name, ops);
        counts.set(name, (counts.get(name) ?? 0) + 1);
        if (ops.length >= BATCH_SIZE) await flush(name);
      }
    }

    if (!header) throw new Error('Plik jest pusty.');

    for (const name of pending.keys()) await flush(name);

    console.log('');
    let total = 0;
    for (const [name, n] of counts) {
      console.log(`  ✓ ${name.padEnd(28)}: ${n} dokumentów`);
      total += n;
    }
    const seconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Import zakończony: ${total} dokumentów w ${seconds} s.`);
  } finally {
    lines.close();
    await client.close();
  }
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
