import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useUser } from '@/lib/db-hooks';
import { useConversations } from './useConversations';
import { useMessages } from './useMessages';

/**
 * Chat state for the page: the conversation list, the open conversation
 * (`selectedId` = document id or legacy `a_b` key, taken from the URL) and
 * its messages, plus the actions on them.
 */
export function useChat(selectedId: string | null) {
    const { user } = useUser();
    const me = user?.uid ?? '';
    const list = useConversations();
    const { conversations, markRead, patchList } = list;

    const selectedConversation = useMemo(
        () => conversations?.find(c => c.id === selectedId || c.conversationId === selectedId) ?? null,
        [conversations, selectedId]
    );
    const openId = selectedConversation?.id ?? null;

    const { messages, isLoading: messagesLoading, send } = useMessages(openId);

    // Read receipts: clear the badge on entering, and again whenever a new
    // message from the contact arrives while the conversation is open.
    const lastIncomingId = useMemo(() => {
        const incoming = (messages ?? []).filter(m => m.senderId !== me);
        return incoming[incoming.length - 1]?.id ?? null;
    }, [messages, me]);
    const readMarker = useRef<string | null>(null);
    const unread = selectedConversation?.unread ?? 0;
    useEffect(() => {
        if (!openId || !messages) return;
        const marker = `${openId}:${lastIncomingId ?? ''}`;
        if (unread > 0 || (readMarker.current?.startsWith(`${openId}:`) && readMarker.current !== marker)) {
            void markRead(openId);
        }
        readMarker.current = marker;
    }, [openId, messages, lastIncomingId, unread, markRead]);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!openId || !me) throw new Error('Brak rozmowy');
            const saved = await send(text, me);
            await patchList(items =>
                items.map(c =>
                    c.id === openId
                        ? {
                              ...c,
                              lastMessage: { text: saved.text, senderId: me, createdAt: saved.createdAt },
                              updatedAt: saved.createdAt,
                              unread: 0,
                              unreadByContact: c.unreadByContact + 1,
                          }
                        : c
                )
            );
        },
        [openId, me, send, patchList]
    );

    return {
        currentUserId: me,
        conversations,
        conversationsLoading: list.isLoading,
        selectedConversation,
        messages: messages ?? [],
        messagesLoading,
        sendMessage,
        startConversation: list.start,
        deleteConversation: list.remove,
    };
}
