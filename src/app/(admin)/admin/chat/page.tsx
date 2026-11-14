'use client';

import { ChatScreen } from '@/components/chat/ChatScreen';

/**
 * The administrator's inbox: replies to the welcome message (lib/welcome-message)
 * land here. Admins answer existing conversations; they don't pick new contacts.
 */
export default function AdminChatPage() {
  return <ChatScreen basePath="/admin/chat" contacts={[]} contactsLoading={false} />;
}
