import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import { getMongoDb } from '@/lib/mongodb';
import { GridFSBucket } from 'mongodb';

export async function POST(req: Request) {
  try {
    const db = await getMongoDb();
    const bucket = new GridFSBucket(db, { bucketName: 'images' });

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
      stream.pipe(uploadStream)
        .on('error', reject)
        .on('finish', resolve);
    });

    return NextResponse.json({ fileId: uploadStream.id.toString() });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
