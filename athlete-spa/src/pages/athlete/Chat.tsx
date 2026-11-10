import { useMemo, useEffect, useCallback, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useUser, useDoc, useCollection, useCreateDoc } from '@/lib/db-hooks';
import { UserProfile } from '@/lib/chat/types';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatView } from '@/components/chat/ChatView';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { useChat } from '@/components/chat/hooks/useChat';
import { Compass, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';

const LEAD_TRAINER_ID = '6a5cf516f9fe894c859bb9af';

export default function AthleteChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createDoc } = useCreateDoc();

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
    currentUser,
    refetchConversations,
  } = useChat();

  const { data: userProfile } = useDoc<UserProfile>('users', currentUser?.uid || null);

  // Lead Trainer profile (6a5cf516f9fe894c859bb9af)
  const { data: leadTrainer } = useDoc<UserProfile>('users', LEAD_TRAINER_ID);

  // All trainers collection for potential contacts
  const { data: allTrainers, isLoading: trainersLoading } = useCollection<UserProfile>('users', {
    role: 'trainer',
  });

  // Athlete's assigned trainer if any
  const { data: myTrainerProfile } = useDoc<UserProfile>(
    'users',
    userProfile?.role === 'athlete' && userProfile.trainerId ? userProfile.trainerId : null
  );

  // Existing conversation participant IDs
  const existingParticipantIds = useMemo(() => {
    const ids = new Set<string>();
    conversations?.forEach(c => {
      c.participants.forEach(p => {
        if (p !== currentUser?.uid) ids.add(p);
      });
    });
    return ids;
  }, [conversations, currentUser?.uid]);

  // Potential contacts for new message dialog:
  // Combines assigned trainer, lead trainer, and all other trainers not yet in conversation
  const potentialContacts = useMemo(() => {
    if (!currentUser) return [];
    const list: UserProfile[] = [];

    // Assigned trainer first
    if (myTrainerProfile && !existingParticipantIds.has(myTrainerProfile.id)) {
      list.push(myTrainerProfile);
    }

    // Lead trainer second
    if (leadTrainer && !existingParticipantIds.has(leadTrainer.id) && !list.some(c => c.id === leadTrainer.id)) {
      list.push(leadTrainer);
    }

    // Other trainers from collection
    (allTrainers ?? []).forEach(t => {
      if (t.id !== currentUser.uid && !existingParticipantIds.has(t.id) && !list.some(c => c.id === t.id)) {
        list.push(t);
      }
    });

    return list;
  }, [currentUser, myTrainerProfile, leadTrainer, allTrainers, existingParticipantIds]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
      navigate(`/athlete/chat?conversationId=${id}`, { replace: true });
    },
    [navigate, setSelectedConversationId]
  );

  const handleBackToList = useCallback(() => {
    setSelectedConversationId(null);
    navigate('/athlete/chat', { replace: true });
  }, [navigate, setSelectedConversationId]);

  // Robust create conversation handler that works with any trainer
  const handleCreateConversation = useCallback(
    async (targetUserId: string, initialMessage?: string) => {
      if (!currentUser) return;

      // Check if conversation already exists
      const existing = conversations?.find(c => c.participants.includes(targetUserId));
      if (existing) {
        handleSelectConversation(existing.id || existing.conversationId);
        if (initialMessage) {
          await sendMessage(initialMessage);
        }
        return;
      }

      // Determine target user details
      const targetUser =
        targetUserId === LEAD_TRAINER_ID
          ? leadTrainer
          : allTrainers?.find(t => t.id === targetUserId) ||
            (targetUserId === myTrainerProfile?.id ? myTrainerProfile : null);

      const targetName = targetUser?.name || (targetUserId === LEAD_TRAINER_ID ? 'Krystian' : 'Trener');
      const myName = userProfile?.name || 'Sportowiec';
      const conversationId = [currentUser.uid, targetUserId].sort().join('_');
      const now = new Date();

      const newConvData = {
        conversationId,
        participants: [currentUser.uid, targetUserId],
        trainerId: targetUserId,
        athleteId: currentUser.uid,
        trainerName: targetName,
        athleteName: myName,
        lastMessage: initialMessage
          ? {
              text: initialMessage,
              senderId: currentUser.uid,
              createdAt: now,
            }
          : null,
        updatedAt: now,
        unreadCount: {
          [currentUser.uid]: 0,
          [targetUserId]: initialMessage ? 1 : 0,
        },
      };

      const created = (await createConversation(newConvData)) as any;
      const targetId = created?.id || created?._id || conversationId;

      if (initialMessage) {
        try {
          await createDoc('messages', {
            conversationId: targetId,
            senderId: currentUser.uid,
            text: initialMessage,
            createdAt: now,
          });
        } catch (e) {
          console.error('Failed to save initial message:', e);
        }
      }

      refetchConversations();
      handleSelectConversation(targetId);
    },
    [
      currentUser,
      conversations,
      leadTrainer,
      allTrainers,
      myTrainerProfile,
      userProfile,
      createConversation,
      createDoc,
      refetchConversations,
      handleSelectConversation,
      sendMessage,
    ]
  );

  // Sync from URL search params: conversationId or userId
  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversationId');
    const userIdFromUrl = searchParams.get('userId');

    if (conversationIdFromUrl) {
      setSelectedConversationId(conversationIdFromUrl);
    } else if (userIdFromUrl && currentUser && !isLoading) {
      // Find existing or start conversation with user
      const existing = conversations?.find(c => c.participants.includes(userIdFromUrl));
      if (existing) {
        handleSelectConversation(existing.id || existing.conversationId);
      } else {
        handleCreateConversation(userIdFromUrl);
      }
    } else {
      setSelectedConversationId(null);
    }
  }, [searchParams, currentUser, isLoading, conversations, setSelectedConversationId, handleSelectConversation, handleCreateConversation]);

  // Handler for starting chat with Lead Trainer (6a5cf516f9fe894c859bb9af)
  const handleStartWithLeadTrainer = useCallback(
    async (initialMessage?: string) => {
      await handleCreateConversation(LEAD_TRAINER_ID, initialMessage);
    },
    [handleCreateConversation]
  );

  const otherParticipantId = useMemo(() => {
    return selectedConversation?.participants.find(id => id !== currentUser?.uid);
  }, [selectedConversation, currentUser]);

  const { data: otherParticipantProfile } = useDoc<UserProfile>('users', otherParticipantId || null);

  return (
    <ChatLayout>
      <ConversationList
        conversations={conversations || []}
        selectedId={selectedConversationId}
        currentUserId={currentUser?.uid || ''}
        userRole={userProfile?.role === 'trainer' ? 'trainer' : 'athlete'}
        isLoading={isLoading}
        leadTrainer={leadTrainer}
        onSelect={handleSelectConversation}
        onDelete={c => deleteConversation(c.id)}
        onStartWithLeadTrainer={handleStartWithLeadTrainer}
        header={
          <NewConversationDialog
            potentialContacts={potentialContacts}
            isLoading={trainersLoading}
            onStartConversation={handleCreateConversation}
          />
        }
      />

      <main className={`h-full ${!selectedConversationId ? 'hidden' : ''}`}>
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
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageSquare className="h-8 w-8" />
            </span>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
              Wybierz konwersację
            </h2>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Wybierz rozmowę z listy po lewej stronie lub rozpocznij nowy czat z certyfikowanym trenerem.
            </p>
          </div>
        )}
      </main>
    </ChatLayout>
  );
}
