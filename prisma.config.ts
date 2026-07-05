import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  migrations: {
    seed: 'bun ./prisma/seed.ts',
  },
  datasource: {
    url: process.env.MONGO_DB_URI || process.env.DATABASE_URL || '',
  },
});
