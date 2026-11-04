import React from 'react';
import { Conversation, Message, UserProfile } from '@/lib/chat/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api-client';

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
        <div data-immersive className="flex h-full flex-col bg-background">
            <header className="flex shrink-0 items-center gap-2.5 border-b border-border/60 px-2 py-2">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack} aria-label="Wróć do listy rozmów">
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Avatar className="h-9 w-9">
                    <AvatarImage src={resolveMediaUrl(otherParticipant?.avatarUrl)} alt="" />
                    <AvatarFallback>{otherParticipant?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold leading-tight">{otherParticipant?.name}</h2>
                    <p className="text-xs text-muted-foreground">{otherParticipant?.role === 'trainer' ? 'Trener' : 'Sportowiec'}</p>
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
