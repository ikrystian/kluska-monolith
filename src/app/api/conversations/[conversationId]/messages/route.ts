import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { findConversationFor, listMessages, requireChatUser, sendMessage } from '@/lib/chat';
import { chatErrorResponse } from '@/lib/chat-response';

type Params = { params: Promise<{ conversationId: string }> };

// GET - The latest messages, oldest first.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    const { conversationId } = await params;
    await connectToDatabase();
    const conversation = await findConversationFor(conversationId, user.id);
    return NextResponse.json({ data: await listMessages(String(conversation._id)) });
  } catch (error) {
    return chatErrorResponse(error, 'GET /api/conversations/[id]/messages');
  }
}

// POST - Sends { text } as the caller.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    const { conversationId } = await params;
    const body = await request.json().catch(() => null);
    await connectToDatabase();
    const conversation = await findConversationFor(conversationId, user.id);
    const message = await sendMessage(conversation, user, body?.text);
    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error, 'POST /api/conversations/[id]/messages');
  }
}
