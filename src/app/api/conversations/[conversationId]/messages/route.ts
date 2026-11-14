import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { findConversationFor, listMessages, requireChatUser, sendMessage } from '@/lib/chat';
import { chatErrorResponse } from '@/lib/chat-response';
import { etagMatches, etagOf, notModified, sendSerialized } from '@/lib/http-cache';

type Params = { params: Promise<{ conversationId: string }> };

// GET - The latest messages, oldest first.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    const { conversationId } = await params;
    await connectToDatabase();
    const conversation = await findConversationFor(conversationId, user.id);

    // An open chat polls this every few seconds. Every message bumps the
    // conversation (updatedAt, lastMessage, unread counters) in `sendMessage`,
    // so that one document — already loaded for the access check — tells whether
    // the list changed. Unchanged: 304 without reading the messages at all.
    const unread = conversation.unreadCount;
    const etag = etagOf(
      JSON.stringify([
        conversation._id,
        conversation.updatedAt,
        conversation.lastMessage?.createdAt ?? null,
        // A Map serializes to `{}` — spell its entries out.
        unread instanceof Map ? [...unread.entries()] : (unread ?? null),
      ])
    );
    if (etagMatches(request, etag)) return notModified(etag);

    const body = JSON.stringify({ data: await listMessages(String(conversation._id)) });
    return sendSerialized(request, { body, etag });
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
