import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getMongoDb } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const db = await getMongoDb();
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const uploadStream = bucket.openUploadStream(file.name, {
      contentType: file.type,
    });

    await new Promise((resolve, reject) => {
      stream.pipe(uploadStream as any)
        .on('error', reject)
        .on('finish', resolve);
    });

    const fileId = uploadStream.id.toString();
    return NextResponse.json({
      fileId,
      url: `/api/images/${fileId}`,
    });
  } catch (error) {
    console.error('Upload media error:', error);
    return NextResponse.json({ error: 'Failed to upload media file' }, { status: 500 });
  }
}
