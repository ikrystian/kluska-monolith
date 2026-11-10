import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Conversation } from '@/models';
import { chatErrorResponse } from '@/lib/chat-response';
import {
  conversationView,
  findOrCreateConversation,
  listConversationViews,
  requireChatUser,
  sendMessage,
} from '@/lib/chat';

// GET - The caller's conversations, each with `contact` = the other participant.
export async function GET(request: NextRequest) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    await connectToDatabase();
    return NextResponse.json({ data: await listConversationViews(user.id) });
  } catch (error) {
    return chatErrorResponse(error, 'GET /api/conversations');
  }
}

// POST - Open (or create) the conversation with { userId }, optionally sending { text } in it.
export async function POST(request: NextRequest) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    const body = await request.json().catch(() => null);
    await connectToDatabase();

    const conversation = await findOrCreateConversation(user, String(body?.userId ?? ''));
    if (typeof body?.text === 'string' && body.text.trim()) {
      await sendMessage(conversation, user, body.text);
    }

    const fresh = await Conversation.findById(conversation._id);
    return NextResponse.json({ data: await conversationView(fresh ?? conversation, user.id) }, { status: 201 });
  } catch (error) {
    return chatErrorResponse(error, 'POST /api/conversations');
  }
}
