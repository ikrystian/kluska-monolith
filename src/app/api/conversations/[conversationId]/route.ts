import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { conversationId } = await params;
    const db = await getMongoDb();

    // Start a session for the transaction
    const session = db.client.startSession();

    try {
      await session.withTransaction(async () => {
        // Delete messages in the conversation
        await db.collection('messages').deleteMany({ conversationId }, { session });
        // Delete the conversation itself
        await db.collection('conversations').deleteOne({ _id: conversationId }, { session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
