import React from 'react';
import { Conversation, Message, UserProfile } from '@/lib/chat/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';

interface ChatViewProps {
    conversation: Conversation;
    messages: Message[];
    currentUserId: string;
    otherParticipant: UserProfile | null;
    isLoadingMessages: boolean;
    onSendMessage: (text: string) => void;
    onBack: () => void;
}

export function ChatView({
    conversation,
    messages,
    currentUserId,
    otherParticipant,
    isLoadingMessages,
    onSendMessage,
    onBack
}: ChatViewProps) {
    if (!otherParticipant) {
        return <div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-4 p-4 border-b bg-background">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <Avatar>
                    <AvatarImage src={placeholderImages.find(p => p.id === 'avatar-male')?.imageUrl} />
                    <AvatarFallback>{otherParticipant?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="font-semibold text-lg">{otherParticipant?.name}</h2>
                    <p className="text-sm text-muted-foreground capitalize">{otherParticipant?.role}</p>
                </div>
            </header>

            <MessageList
                messages={messages}
                currentUserId={currentUserId}
                isLoading={isLoadingMessages}
            />

            <MessageInput onSendMessage={onSendMessage} />
        </div>
    );
}
