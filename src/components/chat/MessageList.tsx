import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/lib/chat/types';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
    isLoading: boolean;
}

export function MessageList({ messages, currentUserId, isLoading }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
                {messages?.map(message => {
                    const isMe = message.senderId === currentUserId;
                    return (
                        <div key={message.id} className={cn("flex", isMe ? 'justify-end' : 'justify-start')}>
                            <div className={cn("max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg",
                                isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                            )}>
                                <p>{message.text}</p>
                                <p className={cn("text-xs mt-1", isMe ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                    {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: pl }) : 'teraz'}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
}
