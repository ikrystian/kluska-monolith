import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { findConversationFor, markConversationRead, requireChatUser } from '@/lib/chat';
import { chatErrorResponse } from '@/lib/chat-response';

type Params = { params: Promise<{ conversationId: string }> };

// POST - Marks the conversation read for the caller.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    const { conversationId } = await params;
    await connectToDatabase();
    const conversation = await findConversationFor(conversationId, user.id);
    await markConversationRead(conversation, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return chatErrorResponse(error, 'POST /api/conversations/[id]/read');
  }
}
