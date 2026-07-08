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
        <div className="flex flex-col h-full bg-background">
            <header className="flex items-center gap-3 p-4 border-b border-border/60 bg-card/60 backdrop-blur-sm">
                <Button variant="ghost" size="icon" className="-ml-1 shrink-0 md:hidden" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={placeholderImages.find(p => p.id === 'avatar-male')?.imageUrl} />
                    <AvatarFallback>{otherParticipant?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <h2 className="truncate font-semibold leading-tight">{otherParticipant?.name}</h2>
                    <p className="text-xs text-muted-foreground capitalize">{otherParticipant?.role}</p>
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
