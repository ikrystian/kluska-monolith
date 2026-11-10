import { useCallback } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/db-hooks';
import { messagesKey } from '@/lib/chat/constants';
import { postMessage } from '@/lib/chat/api';
import type { Message } from '@/lib/chat/types';

/** Messages of one conversation (by document id), polled while it is open. */
export function useMessages(conversationId: string | null) {
    const { data, isLoading, mutate } = useSWR<Message[]>(
        conversationId ? messagesKey(conversationId) : null,
        swrFetcher,
        { refreshInterval: 3_000 }
    );

    /** Sends `text`, showing it at once; resolves to the saved message, or throws (and drops it). */
    const send = useCallback(
        async (text: string, senderId: string): Promise<Message> => {
            if (!conversationId) throw new Error('Brak rozmowy');
            const temp: Message = {
                id: `pending-${Date.now()}`,
                conversationId,
                senderId,
                text,
                createdAt: new Date().toISOString(),
                pending: true,
            };
            const request = postMessage(conversationId, text);
            // The updater gets the list as it was before the optimistic bubble.
            await mutate(
                async committed => {
                    const saved = await request;
                    return [...(committed ?? []).filter(m => m.id !== saved.id), saved];
                },
                {
                    optimisticData: current => [...(current ?? []), temp],
                    rollbackOnError: true,
                    populateCache: true,
                    revalidate: false,
                }
            );
            return request;
        },
        [conversationId, mutate]
    );

    return {
        messages: data ?? null,
        isLoading: Boolean(conversationId) && isLoading && !data,
        send,
    };
}
