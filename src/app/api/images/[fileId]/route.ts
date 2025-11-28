import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId: id } = await params;
    const db = await getMongoDb();
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'images' });
    const fileId = new mongoose.mongo.ObjectId(id);

    const downloadStream = bucket.openDownloadStream(fileId);

    const response = new NextResponse(downloadStream as any, {
      headers: {
        'Content-Type': 'image/jpeg', // This should be dynamic based on the file's contentType
      },
    });

    return response;
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}
