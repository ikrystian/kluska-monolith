'use client';

import React, { useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser, useDoc } from '@/lib/db-hooks';
import { UserProfile } from '@/lib/chat/types';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatView } from '@/components/chat/ChatView';
import { NewConversationDialog } from '@/components/chat/NewConversationDialog';
import { useChat } from '@/components/chat/hooks/useChat';
import { MessageSquare } from 'lucide-react';

export default function AthleteChatPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
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
        currentUser
    } = useChat();

    const { data: userProfile } = useDoc<UserProfile>('users', currentUser?.uid || '');

    // Fetch trainer profile if user is athlete
    const { data: trainerProfile, isLoading: trainerLoading } = useDoc<UserProfile>(
        'users',
        userProfile?.role === 'athlete' && userProfile.trainerId ? userProfile.trainerId : ''
    );

    const existingConversationIds = useMemo(() => conversations?.map(c => c.conversationId) || [], [conversations]);

    const potentialContacts = useMemo(() => {
        if (!trainerProfile || !currentUser) return [];
        // Athlete can only start conversation with their trainer
        const contacts = [trainerProfile];

        return contacts.filter(contact => {
            const conversationId = [currentUser.uid, contact.id].sort().join('_');
            return !existingConversationIds.includes(conversationId);
        });
    }, [trainerProfile, currentUser, existingConversationIds]);

    useEffect(() => {
        const conversationIdFromUrl = searchParams.get('conversationId');
        if (conversationIdFromUrl) {
            setSelectedConversationId(conversationIdFromUrl);
        } else {
            setSelectedConversationId(null);
        }
    }, [searchParams, setSelectedConversationId]);

    const handleSelectConversation = (id: string) => {
        setSelectedConversationId(id);
        navigate(`/athlete/chat?conversationId=${id}`, { replace: true });
    };

    const handleBackToList = () => {
        setSelectedConversationId(null);
        navigate('/athlete/chat', { replace: true });
    };

    const handleCreateConversation = async (userId: string) => {
        if (!currentUser || !userProfile || !trainerProfile) return;

        // For athlete, userId should be the trainerId
        if (userId !== trainerProfile.id) return;

        const conversationId = [currentUser.uid, userId].sort().join('_');

        await createConversation({
            conversationId: conversationId,
            participants: [currentUser.uid, userId],
            trainerId: userId,
            athleteId: currentUser.uid,
            trainerName: trainerProfile.name,
            athleteName: userProfile.name,
            lastMessage: null,
            updatedAt: new Date(),
            unreadCount: {
                [currentUser.uid]: 0,
                [userId]: 0,
            }
        });

        handleSelectConversation(conversationId);
    };

    const otherParticipantId = useMemo(() => {
        return selectedConversation?.participants.find(id => id !== currentUser?.uid);
    }, [selectedConversation, currentUser]);

    const { data: otherParticipantProfile } = useDoc<UserProfile>('users', otherParticipantId || '');

    return (
        <ChatLayout>
            <ConversationList
                conversations={conversations || []}
                selectedId={selectedConversationId}
                currentUserId={currentUser?.uid || ''}
                userRole="athlete"
                isLoading={isLoading}
                onSelect={handleSelectConversation}
                onDelete={(c) => deleteConversation(c.id)}
                header={
                    <div className="flex items-center justify-between">
                        <h1 className="font-headline text-2xl font-bold">Czat</h1>
                        <NewConversationDialog
                            potentialContacts={potentialContacts}
                            isLoading={trainerLoading}
                            onStartConversation={handleCreateConversation}
                        />
                    </div>
                }
            />
            <main className={`md:col-span-2 xl:col-span-3 ${!selectedConversationId ? 'hidden md:block' : ''}`}>
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
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageSquare className="h-16 w-16 mb-4" />
                        <h2 className="text-xl font-semibold">Wybierz konwersację</h2>
                        <p>Wybierz rozmowę z listy, aby wyświetlić wiadomości.</p>
                    </div>
                )}
            </main>
        </ChatLayout>
    );
}
