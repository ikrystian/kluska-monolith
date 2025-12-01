import { useCollection, useCreateDoc, useDeleteDoc, useUpdateDoc } from '@/lib/db-hooks';
import { Conversation } from '@/lib/chat/types';
import { useUser } from '@/lib/db-hooks';

export function useConversations() {
    const { user } = useUser();
    const { createDoc } = useCreateDoc();
    const { deleteDoc } = useDeleteDoc();
    const { updateDoc } = useUpdateDoc();

    const { data: conversations, isLoading, refetch } = useCollection<Conversation>(
        user ? 'conversations' : null,
        user ? { participants: user.uid } : undefined,
        { sort: { updatedAt: -1 } }
    );

    const createConversation = async (conversationData: Partial<Conversation>) => {
        return await createDoc('conversations', conversationData);
    };

    const deleteConversation = async (conversationId: string) => {
        // First fetch messages to delete them
        // Note: In a real app, this should be a backend function or a batch operation
        try {
            const response = await fetch(`/api/db/messages?query=${encodeURIComponent(JSON.stringify({ conversationId }))}`);
            const messages = await response.json();

            if (messages && Array.isArray(messages)) {
                await Promise.all(messages.map((m: any) => deleteDoc('messages', m.id)));
            }
        } catch (e) {
            console.error("Failed to delete messages for conversation", e);
        }

        return await deleteDoc('conversations', conversationId);
    };

    const markAsRead = async (conversationId: string, userId: string) => {
        return await updateDoc('conversations', conversationId, {
            [`unreadCount.${userId}`]: 0
        });
    };

    return {
        conversations,
        isLoading,
        refetch,
        createConversation,
        deleteConversation,
        markAsRead
    };
}
