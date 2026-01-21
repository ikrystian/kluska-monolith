import { useState, useEffect } from 'react';
import { useConversations } from './useConversations';
import { useMessages } from './useMessages';
import { useUser, useDoc } from '@/lib/db-hooks';
import { UserProfile } from '@/lib/chat/types';

export function useChat() {
    const { user } = useUser();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

    const {
        conversations,
        isLoading: conversationsLoading,
        refetch: refetchConversations,
        createConversation,
        deleteConversation,
        markAsRead
    } = useConversations();

    const {
        messages,
        isLoading: messagesLoading,
        sendMessage: sendMessageInternal,
        refetch: refetchMessages
    } = useMessages(selectedConversationId);

    const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

    // Mark as read when entering conversation
    useEffect(() => {
        if (selectedConversationId && user && selectedConversation) {
            const unreadCount = selectedConversation.unreadCount?.[user.uid] || 0;
            if (unreadCount > 0) {
                markAsRead(selectedConversationId, user.uid);
                // Optimistically update local state if needed, or just wait for refetch
                refetchConversations();
            }
        }
    }, [selectedConversationId, user, selectedConversation]);

    const sendMessage = async (text: string) => {
        if (!selectedConversation || !user) return;

        const otherParticipantId = selectedConversation.participants.find(id => id !== user.uid);
        if (!otherParticipantId) return;

        await sendMessageInternal(text, otherParticipantId);
        refetchConversations(); // Update last message in list
    };

    return {
        conversations,
        selectedConversation,
        selectedConversationId,
        setSelectedConversationId,
        messages,
        isLoading: conversationsLoading || (selectedConversationId ? messagesLoading : false),
        sendMessage,
        createConversation,
        deleteConversation,
        currentUser: user,
        refetchConversations
    };
}
