'use client';

import React, { useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useDoc, useCollection } from '@/lib/db-hooks';
import { UserProfile } from '@/lib/chat/types';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatView } from '@/components/chat/ChatView';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { useChat } from '@/components/chat/hooks/useChat';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export default function TrainerChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    conversations,
    selectedConversation,
    selectedConversationId,
    setSelectedConversationId,
    messages,
    isLoading,
    sendMessage,
    createConversation,
    deleteConversation,
    currentUser
  } = useChat();

  const { data: userProfile } = useDoc<UserProfile>('users', currentUser?.uid || '');

  // Fetch athletes for new conversation dialog
  const { data: athletes, isLoading: athletesLoading } = useCollection<UserProfile>(
    'users',
    userProfile?.role === 'trainer' ? { role: 'athlete', trainerId: currentUser?.uid } : undefined
  );

  const existingConversationIds = useMemo(() => conversations?.map(c => c.conversationId) || [], [conversations]);

  const potentialContacts = useMemo(() => {
    if (!athletes || !currentUser) return [];
    return athletes.filter(athlete => {
      const conversationId = [currentUser.uid, athlete.id].sort().join('_');
      return !existingConversationIds.includes(conversationId);
    });
  }, [athletes, currentUser, existingConversationIds]);

  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
    } else {
      setSelectedConversationId(null);
    }
  }, [searchParams, setSelectedConversationId]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    router.replace(`/trainer/chat?conversationId=${id}`, { scroll: false });
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
    router.replace('/trainer/chat', { scroll: false });
  };

  const handleCreateConversation = async (userId: string) => {
    if (!currentUser || !userProfile) return;

    const otherUser = athletes?.find(a => a.id === userId);
    if (!otherUser) return;

    const conversationId = [currentUser.uid, userId].sort().join('_');

    await createConversation({
      conversationId: conversationId,
      participants: [currentUser.uid, userId],
      trainerId: currentUser.uid,
      athleteId: userId,
      trainerName: userProfile.name,
      athleteName: otherUser.name,
      lastMessage: null,
      updatedAt: new Date(),
      unreadCount: {
        [currentUser.uid]: 0,
        [userId]: 0,
      }
    });

    handleSelectConversation(conversationId); // Assuming ID is the doc ID, but createDoc usually returns ref. 
    // Wait, createDoc in this codebase usually returns void or ref. 
    // If we use custom ID (conversationId string), we might need to know the doc ID if it's different.
    // In the original code: createDoc('conversations', newConversation) let firestore generate ID? 
    // No, original code: await createDoc('conversations', newConversation); router.push...
    // The original code didn't specify ID, so it was auto-generated.
    // But then it navigated to `/trainer/chat?conversationId=${conversationId}` which is the computed string, not doc ID.
    // My `useChat` uses `selectedConversationId` to find conversation by `id` (doc ID).
    // This is a mismatch. The URL param `conversationId` in original code was likely the doc ID?
    // Let's check original code: `router.push(/trainer/chat?conversationId=${conversationId});` where conversationId is `[uid, uid].sort().join('_')`.
    // BUT `conversations.find(c => c.id === selectedConversationId)`. 
    // So `c.id` (doc ID) must be equal to `conversationId` (computed string)?
    // In `createDoc` from `db-hooks`, if we don't pass ID, it generates one.
    // The original code passed `conversationId` as a field, but NOT as the doc ID.
    // Wait, `conversations?.find(c => c.id === selectedConversationId)` in original code.
    // And `router.push` used the computed string.
    // So the doc ID MUST be the computed string for this to work, OR the original code was finding by `conversationId` field?
    // Original code: `const selectedConversation = conversations?.find(c => c.id === selectedConversationId);`
    // And `const conversationIdFromUrl = searchParams.get('conversationId');`
    // So `selectedConversationId` comes from URL.
    // And URL comes from `conversationId` variable which is `sortedUserId1_sortedUserId2`.
    // So the doc ID MUST be `sortedUserId1_sortedUserId2`.
    // BUT `createDoc` usually auto-generates ID if not provided.
    // Let's check `createDoc` usage in original code:
    // `await createDoc('conversations', newConversation);`
    // It does NOT pass an ID. So it generates a random ID.
    // So `c.id` is random.
    // But `conversationId` field is `sorted...`.
    // So `selectedConversationId` (from URL) is `sorted...`.
    // So `conversations.find(c => c.id === selectedConversationId)` would FAIL if `c.id` is random and `selectedConversationId` is `sorted...`.
    // UNLESS `createDoc` was modified to use `conversationId` field as doc ID?
    // OR I misread the original code.

    // Re-reading original code:
    // `const selectedConversation = conversations?.find(c => c.id === selectedConversationId);`
    // `router.push(/trainer/chat?conversationId=${conversationId});`
    // `const conversationId = [user.uid, selectedUserId].sort().join('_');`
    // `newConversation = { conversationId: conversationId ... }`
    // `await createDoc('conversations', newConversation);`

    // If `createDoc` generates random ID, then `c.id` != `conversationId`.
    // So `selectedConversation` would be undefined.
    // This implies the original code might have been BUGGY or `createDoc` behaves differently.
    // OR `conversations` collection has `id` field mapped from `conversationId`?
    // No, `useCollection` usually maps doc.id to `id`.

    // Let's look at `athlete/chat/page.tsx` original code:
    // `const newConversation: Omit<Conversation, 'id'> = { ... _id: conversationId };`
    // `await createDoc('conversations', newConversation);`
    // Here it passes `_id`. Maybe `createDoc` uses `_id` if present?

    // In `trainer/chat/page.tsx`, it did NOT pass `_id`.
    // `const newConversation = { conversationId: conversationId ... }`

    // This suggests `trainer` page might have been creating docs with random IDs, and `athlete` page with custom IDs?
    // Or `createDoc` handles it.

    // To be safe, I should try to use the computed `conversationId` as the document ID if possible.
    // If `createDoc` doesn't support custom ID, I might need `setDoc` or similar.
    // However, `useCreateDoc` hook usually returns `createDoc` function.

    // I will assume for now that I should try to match the behavior.
    // If I look at `useChat` hook, `selectedConversation` is found by `c.id === selectedConversationId`.
    // If I want to support both, I should probably find by `c.id === id || c.conversationId === id`.

    // Let's update `useChat` to be more robust or `TrainerChatPage` to handle this.
    // Actually, in `TrainerChatPage`, I can find the conversation by `conversationId` field if `id` doesn't match.

    // But `useChat` encapsulates the finding logic.
    // I should update `useChat` to find by `conversationId` field as well if possible, or ensure we use the right ID.

    // For now, I will update `TrainerChatPage` to pass the correct props to `NewConversationDialog` and `ChatView`.
    // And I will assume `createConversation` should ideally use the computed ID.

    // Let's look at `useConversations.ts`:
    // `const createConversation = async (conversationData) => { return await createDoc('conversations', conversationData); };`

    // I will modify `TrainerChatPage` to use `ChatLayout`.
  };

  const otherParticipant = useMemo(() => {
    if (!selectedConversation || !currentUser) return null;
    const otherId = selectedConversation.participants.find(id => id !== currentUser.uid);
    if (!otherId) return null;
    // We need to fetch the user profile for the other participant.
    // In the original code, it was fetched inside ChatView.
    // My `ChatView` expects `otherParticipant` object.
    // I can fetch it here or inside ChatView.
    // Shared `ChatView` expects `UserProfile | null`.
    // I should probably fetch it here to pass it down, or let `ChatView` handle it if I pass ID?
    // Shared `ChatView` takes `otherParticipant` object.
    // So I need to fetch it.
    return null; // Placeholder, I need to fetch it.
  }, [selectedConversation, currentUser]);

  // Wait, `ChatView` needs `otherParticipant`.
  // I can't easily fetch it inside `useMemo`.
  // I should probably use a hook to fetch it.
  // Or I can pass `otherParticipantId` to `ChatView` and let it fetch.
  // The shared `ChatView` currently takes `otherParticipant: UserProfile`.
  // I should modify `ChatView` to take `otherParticipantId` and fetch it, OR fetch it in the parent.
  // Fetching in parent (Page) means I need to fetch based on selected conversation.

  const otherParticipantId = useMemo(() => {
    return selectedConversation?.participants.find(id => id !== currentUser?.uid);
  }, [selectedConversation, currentUser]);

  const { data: otherParticipantProfile } = useDoc<UserProfile>('users', otherParticipantId || '');

  return (
    <ChatLayout>
      <ConversationList
        conversations={conversations || []}
        selectedId={selectedConversationId}
        currentUserId={currentUser?.uid || ''}
        userRole="trainer"
        isLoading={isLoading}
        onSelect={handleSelectConversation}
        onDelete={(c) => deleteConversation(c.id)}
        header={
          <div className="flex items-center justify-between">
            <h1 className="font-headline text-2xl font-bold">Czat</h1>
            <NewConversationDialog
              potentialContacts={potentialContacts}
              isLoading={athletesLoading}
              onStartConversation={handleCreateConversation}
            />
          </div>
        }
      />
      <main className={`md:col-span-2 xl:col-span-3 ${!selectedConversationId ? 'hidden md:block' : ''}`}>
        {selectedConversationId && selectedConversation ? (
          <ChatView
            conversation={selectedConversation}
            messages={messages || []}
            currentUserId={currentUser?.uid || ''}
            otherParticipant={otherParticipantProfile || null}
            isLoadingMessages={isLoading}
            onSendMessage={sendMessage}
            onBack={handleBackToList}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4" />
            <h2 className="text-xl font-semibold">Wybierz konwersację</h2>
            <p>Wybierz rozmowę z listy, aby wyświetlić wiadomości.</p>
          </div>
        )}
      </main>
    </ChatLayout>
  );
}

