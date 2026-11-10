'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useUser } from '@/lib/db-hooks';
import {
    CONVERSATIONS_KEY,
    chatFetcher,
    markConversationRead,
    removeConversation,
    startConversation,
} from '@/lib/chat/client';
import type { Conversation } from '@/lib/chat/types';

function byActivity(a: Conversation, b: Conversation) {
    const at = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
    const bt = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
    return bt - at;
}

/**
 * The signed-in user's conversations, newest first. Each carries `contact` —
 * the other participant as resolved by the server — so nothing here guesses
 * "the other side" from roles. Polled so unread badges stay current.
 */
export function useConversations() {
    const { user } = useUser();

    const { data, isLoading, mutate } = useSWR<Conversation[]>(user?.uid ? CONVERSATIONS_KEY : null, chatFetcher, {
        refreshInterval: 20_000,
        keepPreviousData: true,
    });

    const patchList = useCallback(
        (update: (list: Conversation[]) => Conversation[]) =>
            mutate(current => update(current ?? []).sort(byActivity), { revalidate: false }),
        [mutate]
    );

    const upsert = useCallback(
        (conversation: Conversation) => patchList(list => [conversation, ...list.filter(c => c.id !== conversation.id)]),
        [patchList]
    );

    /** Opens (or creates) the conversation with `userId`, optionally sending `text` in it. */
    const start = useCallback(
        async (userId: string, text?: string) => {
            const conversation = await startConversation(userId, text);
            await upsert(conversation);
            return conversation;
        },
        [upsert]
    );

    const markRead = useCallback(
        async (conversationId: string) => {
            await patchList(list => list.map(c => (c.id === conversationId ? { ...c, unread: 0 } : c)));
            await markConversationRead(conversationId).catch(() => undefined);
        },
        [patchList]
    );

    const remove = useCallback(
        async (conversationId: string) => {
            await patchList(list => list.filter(c => c.id !== conversationId));
            try {
                await removeConversation(conversationId);
            } catch (error) {
                void mutate();
                throw error;
            }
        },
        [patchList, mutate]
    );

    return {
        conversations: data ?? null,
        isLoading: Boolean(user?.uid) && isLoading && !data,
        refetch: () => void mutate(),
        patchList,
        start,
        markRead,
        remove,
    };
}

/** Total unread messages across conversations (nav/header badges). */
export function useUnreadChatCount(): number {
    const { conversations } = useConversations();
    return (conversations ?? []).reduce((sum, c) => sum + (c.unread || 0), 0);
}
