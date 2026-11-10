import { NextResponse } from 'next/server';
import { ChatError } from '@/lib/chat';

/** Maps a chat route failure to a JSON response (ChatError → its status, anything else → 500). */
export function chatErrorResponse(error: unknown, context: string) {
  if (error instanceof ChatError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${context} error:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
