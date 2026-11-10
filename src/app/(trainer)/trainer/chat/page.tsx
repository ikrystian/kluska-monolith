'use client';

import { useCollection, useUser } from '@/lib/db-hooks';
import type { UserProfile } from '@/lib/chat/types';
import { ChatScreen } from '@/components/chat/ChatScreen';

export default function TrainerChatPage() {
  const { user } = useUser();

  // The trainer's athletes can be messaged from "Nowa Wiadomość".
  const { data: athletes, isLoading } = useCollection<UserProfile>(
    user?.uid ? 'users' : null,
    { role: 'athlete', trainerId: user?.uid }
  );

  return (
    <ChatScreen
      basePath="/trainer/chat"
      contacts={athletes ?? []}
      contactsLoading={isLoading}
      profileHrefFor={contact => (contact.role === 'athlete' ? `/trainer/my-athletes/${contact.id}` : undefined)}
    />
  );
}
