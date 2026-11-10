'use client';

import { useDoc, useUser } from '@/lib/db-hooks';
import type { UserProfile } from '@/lib/chat/types';
import { ChatScreen } from '@/components/chat/ChatScreen';

export default function AthleteChatPage() {
  const { user } = useUser();
  const { data: profile } = useDoc<UserProfile>('users', user?.uid || null);

  // An athlete starts chats with their own trainer.
  const trainerId = profile?.trainerId && profile.trainerId !== user?.uid ? profile.trainerId : null;
  const { data: trainer, isLoading } = useDoc<UserProfile>('users', trainerId);

  return (
    <ChatScreen basePath="/athlete/chat" contacts={trainer ? [trainer] : []} contactsLoading={Boolean(trainerId) && isLoading} />
  );
}
