import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

export async function GET(req: Request, { params }: { params: { fileId: string } }) {
  try {
    const db = await getMongoDb();
    const bucket = new GridFSBucket(db, { bucketName: 'images' });
    const fileId = new ObjectId(params.fileId);

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
