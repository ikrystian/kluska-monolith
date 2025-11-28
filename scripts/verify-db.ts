import * as dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local or .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    try {
        // Dynamic import to ensure env vars are loaded first
        const { getMongoDb } = await import('../src/lib/mongodb');
        console.log('Testing getMongoDb...');
        const db = await getMongoDb();
        console.log('Successfully connected to database:', db.databaseName);
        process.exit(0);
    } catch (error) {
        console.error('Failed to get database:', error);
        process.exit(1);
    }
}

main();
