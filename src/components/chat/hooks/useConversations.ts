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
        // The server removes the conversation's messages along with it.
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
