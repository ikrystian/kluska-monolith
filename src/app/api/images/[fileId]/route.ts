import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId: id } = await params;

    // Validate that the id is a valid MongoDB ObjectId (24 character hex string)
    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid file ID format. Expected a 24 character hex string.' },
        { status: 400 }
      );
    }

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
