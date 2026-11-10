'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MessageSquare, MessageSquareOff } from 'lucide-react';
import { useDoc, useUser } from '@/lib/db-hooks';
import type { ChatContact, UserProfile } from '@/lib/chat/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ChatLayout } from './ChatLayout';
import { ConversationList } from './ConversationList';
import { ChatView } from './ChatView';
import { NewConversationDialog } from './NewConversationDialog';
import { useChat } from './hooks/useChat';

interface ChatScreenProps {
    basePath: '/trainer/chat' | '/athlete/chat';
    /** People the user may start a chat with; the user and existing contacts are filtered out here. */
    contacts: UserProfile[];
    contactsLoading: boolean;
    /** Profile link for a contact, if the app has a page for them. */
    profileHrefFor?: (contact: ChatContact) => string | undefined;
}

function toContact(profile: UserProfile): ChatContact {
    return { id: profile.id, name: profile.name || 'Użytkownik', avatarUrl: profile.avatarUrl, role: profile.role };
}

function Centered({ children }: { children: React.ReactNode }) {
    return <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">{children}</div>;
}

/**
 * Chat page for the web app (trainer and athlete).
 *
 *   ?conversationId=<id>  → open conversation (document id or legacy `a_b` key)
 *   ?userId=<id>          → the conversation with that user, or a draft of it —
 *                           nothing is saved until the first message is sent
 *
 * The URL is the only source of truth for what is open. Every name and avatar
 * comes from `conversation.contact` (the other participant, resolved by the
 * server), so the signed-in user never appears as their own chat partner; a
 * `?userId=` pointing at themselves is dropped.
 */
export function ChatScreen({ basePath, contacts, contactsLoading, profileHrefFor }: ChatScreenProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
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

    const goTo = useCallback(
        (query: string) => router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false }),
        [router, basePath]
    );
    const openConversation = useCallback((id: string) => goTo(`conversationId=${encodeURIComponent(id)}`), [goTo]);
    const backToList = useCallback(() => goTo(''), [goTo]);

    useEffect(() => {
        if (!isSelfLink) return;
        toast({ title: 'To Twoje konto', description: 'Wybierz innego rozmówcę.' });
        backToList();
    }, [isSelfLink, toast, backToList]);

    // ?userId= → jump to the existing conversation, or show a draft.
    const draftUserId = userIdParam && !isSelfLink && me ? userIdParam : null;
    const existingForDraft = draftUserId ? conversations?.find(c => c.contact.id === draftUserId) ?? null : null;

    useEffect(() => {
        if (existingForDraft) openConversation(existingForDraft.id);
    }, [existingForDraft, openConversation]);

    const listedProfile = draftUserId ? contacts.find(c => c.id === draftUserId) ?? null : null;
    const needsProfile = Boolean(draftUserId && conversations && !existingForDraft && !listedProfile);
    const { data: fetchedProfile, isLoading: profileLoading } = useDoc<UserProfile>('users', needsProfile ? draftUserId : null);
    const draftSource = listedProfile ?? fetchedProfile;
    const draftContact = draftSource && draftSource.id !== me ? toContact(draftSource) : null;

    const starting = useRef(false);
    const sendFirstMessage = useCallback(
        async (userId: string, text: string) => {
            if (starting.current) return;
            starting.current = true;
            try {
                const conversation = await startConversation(userId, text);
                openConversation(conversation.id);
            } finally {
                starting.current = false;
            }
        },
        [startConversation, openConversation]
    );

    const potentialContacts = useMemo(() => {
        const taken = new Set([me, ...(conversations ?? []).map(c => c.contact.id)]);
        return contacts.filter(c => c && !taken.has(c.id));
    }, [me, conversations, contacts]);

    const handleDelete = useCallback(
        async (id: string) => {
            try {
                await deleteConversation(id);
                backToList();
            } catch (error) {
                toast({
                    title: 'Nie udało się usunąć rozmowy',
                    description: error instanceof Error ? error.message : undefined,
                    variant: 'destructive',
                });
            }
        },
        [deleteConversation, backToList, toast]
    );

    const somethingOpen = Boolean(selectedId || draftUserId);
    let main: React.ReactNode;

    if (selectedId) {
        if (!conversations) {
            main = <Centered><Loader2 className="h-8 w-8 animate-spin" /></Centered>;
        } else if (selectedConversation) {
            main = (
                <ChatView
                    key={selectedConversation.id}
                    contact={selectedConversation.contact}
                    messages={messages}
                    currentUserId={me}
                    unreadByContact={selectedConversation.unreadByContact}
                    isLoadingMessages={messagesLoading}
                    onSendMessage={sendMessage}
                    onBack={backToList}
                    profileHref={profileHrefFor?.(selectedConversation.contact)}
                    onDelete={() => handleDelete(selectedConversation.id)}
                />
            );
        } else {
            main = (
                <Centered>
                    <MessageSquareOff className="h-12 w-12" />
                    <h2 className="text-xl font-semibold text-foreground">Nie znaleziono rozmowy</h2>
                    <p>Mogła zostać usunięta albo link jest nieaktualny.</p>
                    <Button variant="outline" onClick={backToList}>Wróć do listy</Button>
                </Centered>
            );
        }
    } else if (draftUserId) {
        if (!conversations || existingForDraft || (needsProfile && profileLoading)) {
            main = <Centered><Loader2 className="h-8 w-8 animate-spin" /></Centered>;
        } else if (draftContact) {
            main = (
                <ChatView
                    key={`draft-${draftContact.id}`}
                    contact={draftContact}
                    messages={[]}
                    currentUserId={me}
                    unreadByContact={0}
                    isLoadingMessages={false}
                    onSendMessage={text => sendFirstMessage(draftContact.id, text)}
                    onBack={backToList}
                    profileHref={profileHrefFor?.(draftContact)}
                />
            );
        } else {
            main = (
                <Centered>
                    <MessageSquareOff className="h-12 w-12" />
                    <h2 className="text-xl font-semibold text-foreground">Nie znaleziono użytkownika</h2>
                    <Button variant="outline" onClick={backToList}>Wróć do listy</Button>
                </Centered>
            );
        }
    } else {
        main = (
            <Centered>
                <MessageSquare className="h-16 w-16" />
                <h2 className="text-xl font-semibold">Wybierz konwersację</h2>
                <p>Wybierz rozmowę z listy, aby wyświetlić wiadomości.</p>
            </Centered>
        );
    }

    return (
        <ChatLayout>
            <ConversationList
                conversations={conversations ?? []}
                selectedId={selectedConversation?.id ?? null}
                currentUserId={me}
                isLoading={conversationsLoading}
                collapsed={somethingOpen}
                onSelect={c => openConversation(c.id)}
                header={
                    <div className="flex items-center justify-between">
                        <h1 className="font-headline text-2xl font-bold">Czat</h1>
                        <NewConversationDialog
                            potentialContacts={potentialContacts}
                            isLoading={contactsLoading}
                            onStartConversation={async userId => goTo(`userId=${encodeURIComponent(userId)}`)}
                        />
                    </div>
                }
            />
            <main className={`min-h-0 md:col-span-2 xl:col-span-3 ${somethingOpen ? '' : 'hidden md:block'}`}>{main}</main>
        </ChatLayout>
    );
}
