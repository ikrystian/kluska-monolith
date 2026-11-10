import { useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher, useUser } from '@/lib/db-hooks';
import { CONVERSATIONS_KEY } from '@/lib/chat/constants';
import { markConversationRead, removeConversation, startConversation } from '@/lib/chat/api';
import type { Conversation } from '@/lib/chat/types';

/** Newest activity first, like the server returns them. */
function byActivity(a: Conversation, b: Conversation) {
    const at = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
    const bt = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
    return bt - at;
}

/**
 * The signed-in user's conversations. Each carries `contact` — the other
 * participant as resolved by the server — so nothing here has to guess who
 * "the other side" is from roles. Polled so unread badges stay current.
 */
export function useConversations() {
    const { user } = useUser();
    const enabled = Boolean(user?.uid && !user.isGuest);

    const { data, isLoading, mutate } = useSWR<Conversation[]>(enabled ? CONVERSATIONS_KEY : null, swrFetcher, {
        refreshInterval: 20_000,
    });

    /** Applies a local change to the cached list without refetching. */
    const patchList = useCallback(
        (update: (list: Conversation[]) => Conversation[]) =>
            mutate(current => update(current ?? []).sort(byActivity), { revalidate: false }),
        [mutate]
    );

    const upsert = useCallback(
        (conversation: Conversation) =>
            patchList(list => [conversation, ...list.filter(c => c.id !== conversation.id)]),
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
        isLoading: enabled && isLoading && !data,
        refetch: () => void mutate(),
        patchList,
        upsert,
        start,
        markRead,
        remove,
    };
}

/** Total unread messages across conversations (header badge). */
export function useUnreadChatCount(): number {
    const { conversations } = useConversations();
    return (conversations ?? []).reduce((sum, c) => sum + (c.unread || 0), 0);
}
