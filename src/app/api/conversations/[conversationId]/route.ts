import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { conversationView, deleteConversation, findConversationFor, requireChatUser } from '@/lib/chat';
import { chatErrorResponse } from '@/lib/chat-response';

type Params = { params: Promise<{ conversationId: string }> };

// GET - One conversation of the caller (by document id or conversation key).
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    const { conversationId } = await params;
    await connectToDatabase();
    const conversation = await findConversationFor(conversationId, user.id);
    return NextResponse.json({ data: await conversationView(conversation, user.id) });
  } catch (error) {
    return chatErrorResponse(error, 'GET /api/conversations/[id]');
  }
}

// DELETE - Removes the conversation and its messages (participants only).
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = requireChatUser(await getRequestUser(request));
    const { conversationId } = await params;
    await connectToDatabase();
    const conversation = await findConversationFor(conversationId, user.id);
    await deleteConversation(conversation);
    return NextResponse.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    return chatErrorResponse(error, 'DELETE /api/conversations/[id]');
  }
}
