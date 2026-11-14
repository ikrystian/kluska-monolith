import { MongoClient } from 'mongodb';
import 'dotenv/config';

const ATLAS_URI =
  process.env.MONGO_ATLAS_URI ||
  'mongodb+srv://fasolqa_db_user:KUdziak1991!@cluster0.lnnjm5p.mongodb.net/?appName=Cluster0';

const LOCAL_URI =
  process.env.LOCAL_MONGO_URI ||
  process.env.MONGO_DB_URI ||
  'mongodb://127.0.0.1:27018/test?directConnection=true';

async function migrate() {
  console.log('🚀 Rozpoczynanie migracji danych z MongoDB Atlas do lokalnego MongoDB...');
  console.log(`📡 Źródło: ${ATLAS_URI.replace(/:[^:]*@/, ':****@')}`);
  console.log(`💾 Cel:    ${LOCAL_URI}`);

  const startTime = Date.now();

  const sourceClient = new MongoClient(ATLAS_URI);
  const targetClient = new MongoClient(LOCAL_URI);

  await sourceClient.connect();
  console.log('✅ Połączono ze źródłem: MongoDB Atlas');

  await targetClient.connect();
  console.log('✅ Połączono z celem: MongoDB Docker');

  const sourceDb = sourceClient.db();
  const targetDb = targetClient.db();

  const collections = await sourceDb.listCollections().toArray();
  console.log(`\nZnaleziono ${collections.length} kolekcji w bazie źródłowej.\n`);

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    const sourceCol = sourceDb.collection(colName);
    const targetCol = targetDb.collection(colName);

    const count = await sourceCol.countDocuments();
    if (count === 0) {
      console.log(`  - ${colName.padEnd(25)}: 0 / 0 (pusta kolekcja)`);
      continue;
    }

    process.stdout.write(`  ⏳ Kopiowanie ${colName} (${count} dokumentów)...`);
    const docs = await sourceCol.find().toArray();

    const batchSize = 1000;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      try {
        await targetCol.insertMany(chunk, { ordered: false });
      } catch {
        // Ignoruj błędy duplikatów przy ponownym uruchomieniu
      }
    }

    const targetCount = await targetCol.countDocuments();
    process.stdout.write(`\r  ✓ ${colName.padEnd(25)}: ${targetCount} / ${count} dokumentów\n`);
  }

  await sourceClient.close();
  await targetClient.close();

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Migracja zakończona pomyślnie w ${totalTime} s!`);
}

migrate().catch((err) => {
  console.error('❌ Błąd podczas migracji:', err);
  process.exit(1);
});

