import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, MessageSquareOff } from 'lucide-react';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { ChatContact, UserProfile } from '@/lib/chat/types';
import { LEAD_TRAINER_ID } from '@/lib/chat/constants';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatView } from '@/components/chat/ChatView';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { useChat } from '@/components/chat/hooks/useChat';
import { Button } from '@/components/ui/button';

const CHAT_PATH = '/athlete/chat';

function toContact(profile: UserProfile): ChatContact {
  return { id: profile.id, name: profile.name || 'Użytkownik', avatarUrl: profile.avatarUrl, role: profile.role };
}

function CenteredLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChatNotFound({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <MessageSquareOff className="h-7 w-7" />
      </span>
      <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">{title}</h2>
      <p className="max-w-xs text-xs text-muted-foreground">
        Mogła zostać usunięta albo link jest nieaktualny.
      </p>
      <Button variant="outline" className="rounded-xl" onClick={onBack}>
        Wróć do wiadomości
      </Button>
    </div>
  );
}

/**
 * /athlete/chat                       → conversation list
 * /athlete/chat?conversationId=<id>   → an open conversation (document id or legacy `a_b` key)
 * /athlete/chat?userId=<id>           → the conversation with that user, or a draft of it;
 *                                       nothing is saved until the first message is sent
 *
 * The URL is the only source of truth for what is open. The signed-in user is
 * never offered as a contact, and a link to their own id is dropped.
 */
export default function AthleteChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const me = user?.uid ?? '';

  const selectedId = searchParams.get('conversationId');
  const userIdParam = searchParams.get('userId');
  const isSelfLink = Boolean(userIdParam && me && userIdParam === me);

  const {
    conversations,
    conversationsLoading,
    selectedConversation,
    messages,
    messagesLoading,
    sendMessage,
    startConversation,
    deleteConversation,
  } = useChat(selectedId);

  const isLeadTrainer = me === LEAD_TRAINER_ID;
  const { data: userProfile } = useDoc<UserProfile>('users', me || null);
  const { data: leadTrainer } = useDoc<UserProfile>('users', me && !isLeadTrainer ? LEAD_TRAINER_ID : null);
  const { data: allTrainers, isLoading: trainersLoading } = useCollection<UserProfile>(me ? 'users' : null, {
    role: 'trainer',
  });
  const assignedTrainerId = userProfile?.trainerId && userProfile.trainerId !== me ? userProfile.trainerId : null;
  const { data: myTrainer } = useDoc<UserProfile>('users', assignedTrainerId);

  // ── Navigation ────────────────────────────────────────────────────────────
  const openConversation = useCallback(
    (id: string, opts: { replace?: boolean } = {}) =>
      navigate(`${CHAT_PATH}?conversationId=${encodeURIComponent(id)}`, {
        replace: opts.replace,
        state: opts.replace ? location.state : { fromList: true },
      }),
    [navigate, location.state]
  );

  const openDraft = useCallback(
    (userId: string) => navigate(`${CHAT_PATH}?userId=${encodeURIComponent(userId)}`, { state: { fromList: true } }),
    [navigate]
  );

  const backToList = useCallback(() => {
    if ((location.state as { fromList?: boolean } | null)?.fromList) navigate(-1);
    else navigate(CHAT_PATH, { replace: true });
  }, [navigate, location.state]);

  // A link to yourself (e.g. a trainer opening their own "Napisz" button).
  useEffect(() => {
    if (!isSelfLink) return;
    toast('To Twoje konto — wybierz innego rozmówcę.', { id: 'chat-self' });
    navigate(CHAT_PATH, { replace: true });
  }, [isSelfLink, navigate]);

  // ── ?userId= → existing conversation or a draft ──────────────────────────
  const draftUserId = userIdParam && !isSelfLink && me ? userIdParam : null;
  const existingForDraft = draftUserId ? conversations?.find(c => c.contact.id === draftUserId) ?? null : null;

  useEffect(() => {
    if (existingForDraft) openConversation(existingForDraft.id, { replace: true });
  }, [existingForDraft, openConversation]);

  const trainerFromDirectory = useMemo(() => {
    if (!draftUserId) return null;
    return [myTrainer, leadTrainer, ...(allTrainers ?? [])].find(t => t?.id === draftUserId) ?? null;
  }, [draftUserId, myTrainer, leadTrainer, allTrainers]);

  const needsDraftProfile = Boolean(draftUserId && conversations && !existingForDraft && !trainerFromDirectory);
  const { data: draftProfile, isLoading: draftProfileLoading } = useDoc<UserProfile>(
    'users',
    needsDraftProfile ? draftUserId : null
  );
  const draftSource = trainerFromDirectory ?? draftProfile;
  const draftContact = draftSource && draftSource.id !== me ? toContact(draftSource) : null;

  const starting = useRef(false);
  const startWith = useCallback(
    async (userId: string, text?: string) => {
      if (starting.current || userId === me) return;
      starting.current = true;
      try {
        const conversation = await startConversation(userId, text);
        openConversation(conversation.id, { replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Nie udało się rozpocząć rozmowy.', { id: 'chat-send' });
        throw error;
      } finally {
        starting.current = false;
      }
    },
    [me, startConversation, openConversation]
  );

  // ── Contacts for "Nowa rozmowa": trainers you don't talk to yet, never yourself ──
  const potentialContacts = useMemo(() => {
    if (!me) return [];
    const taken = new Set([me, ...(conversations ?? []).map(c => c.contact.id)]);
    const list: UserProfile[] = [];
    for (const candidate of [myTrainer, leadTrainer, ...(allTrainers ?? [])]) {
      if (!candidate || taken.has(candidate.id)) continue;
      taken.add(candidate.id);
      list.push(candidate);
    }
    return list;
  }, [me, conversations, myTrainer, leadTrainer, allTrainers]);

  const handleDelete = useCallback(
    async (conversationId: string) => {
      try {
        await deleteConversation(conversationId);
        navigate(CHAT_PATH, { replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć rozmowy.');
      }
    },
    [deleteConversation, navigate]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  let content: React.ReactNode;

  if (selectedId) {
    if (!conversations) {
      content = <CenteredLoader label="Wczytywanie rozmowy…" />;
    } else if (selectedConversation) {
      content = (
        <ChatView
          contact={selectedConversation.contact}
          messages={messages}
          currentUserId={me}
          unreadByContact={selectedConversation.unreadByContact}
          isLoadingMessages={messagesLoading}
          onSendMessage={sendMessage}
          onBack={backToList}
          onDelete={() => handleDelete(selectedConversation.id)}
        />
      );
    } else {
      content = <ChatNotFound title="Nie znaleziono rozmowy" onBack={backToList} />;
    }
  } else if (draftUserId) {
    if (!conversations || existingForDraft || (needsDraftProfile && draftProfileLoading)) {
      content = <CenteredLoader label="Otwieranie rozmowy…" />;
    } else if (draftContact) {
      content = (
        <ChatView
          contact={draftContact}
          messages={[]}
          currentUserId={me}
          unreadByContact={0}
          isLoadingMessages={false}
          onSendMessage={text => startWith(draftContact.id, text)}
          onBack={backToList}
        />
      );
    } else {
      content = <ChatNotFound title="Nie znaleziono użytkownika" onBack={backToList} />;
    }
  } else {
    content = (
      <ConversationList
        conversations={conversations ?? []}
        currentUserId={me}
        isLoading={conversationsLoading || isSelfLink}
        leadTrainer={isLeadTrainer ? null : leadTrainer}
        showLeadTrainerOffer={Boolean(me) && !isLeadTrainer}
        onSelect={c => openConversation(c.id)}
        onStartWithLeadTrainer={text => (text ? startWith(LEAD_TRAINER_ID, text) : openDraft(LEAD_TRAINER_ID))}
        header={
          <NewConversationDialog
            potentialContacts={potentialContacts}
            isLoading={trainersLoading}
            onStartConversation={async userId => openDraft(userId)}
          />
        }
      />
    );
  }

  return <ChatLayout>{content}</ChatLayout>;
}
