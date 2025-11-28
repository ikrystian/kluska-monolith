import { getMongoDb } from '../src/lib/mongodb';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    try {
        // Dynamic import
        const { getMongoDb } = await import('../src/lib/mongodb');
        const mongoose = (await import('mongoose')).default;
        const { Readable } = await import('stream');

        console.log('Connecting to DB...');
        const db = await getMongoDb();
        console.log('Connected.');

        // Use GridFSBucket from mongoose.mongo to match the driver version
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
        const content = Buffer.from('test content');
        const stream = Readable.from(content);

        console.log('Starting upload...');
        const uploadStream = bucket.openUploadStream('test.txt', {
            contentType: 'text/plain',
        });

        await new Promise((resolve, reject) => {
            stream.pipe(uploadStream)
                .on('error', (err) => {
                    console.error('Stream error:', err);
                    reject(err);
                })
                .on('finish', () => {
                    console.log('Stream finished');
                    resolve(null);
                });
        });

        console.log('Upload complete. File ID:', uploadStream.id);
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

main();
