'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useChat } from './hooks/useChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function QuickChatWidget() {
    const router = useRouter();
    const { conversations, currentUser } = useChat();

    const unreadCount = useMemo(() => {
        if (!conversations || !currentUser) return 0;
        return conversations.reduce((acc, conv) => {
            return acc + (conv.unreadCount?.[currentUser.uid] || 0);
        }, 0);
    }, [conversations, currentUser]);

    const sortedConversations = useMemo(() => {
        if (!conversations) return [];
        return [...conversations].sort((a, b) => {
            const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return dateB - dateA;
        }).slice(0, 5); // Show only top 5 recent
    }, [conversations]);

    const handleSelectConversation = (conversationId: string) => {
        const role = currentUser?.role === 'trainer' ? 'trainer' : 'athlete';
        router.push(`/${role}/chat?conversationId=${conversationId}`);
    };

    const handleViewAll = () => {
        const role = currentUser?.role === 'trainer' ? 'trainer' : 'athlete';
        router.push(`/${role}/chat`);
    };

    if (!currentUser) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                >
                    <MessageSquare className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 mb-2" align="end" side="top">
                <div className="flex items-center justify-between border-b p-3">
                    <h3 className="font-semibold">Wiadomości</h3>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {unreadCount} nieprzeczytanych
                        </Badge>
                    )}
                </div>
                <ScrollArea className="h-72">
                    {sortedConversations.length > 0 ? (
                        <div className="flex flex-col">
                            {sortedConversations.map((conversation) => {
                                const otherParticipantId = conversation.participants.find(id => id !== currentUser.uid);
                                const isTrainer = currentUser.role === 'trainer';
                                const otherParticipantName = isTrainer ? conversation.athleteName : conversation.trainerName;
                                const unread = (conversation.unreadCount?.[currentUser.uid] || 0) > 0;

                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() => handleSelectConversation(conversation.conversationId)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                                            unread && "bg-muted/20"
                                        )}
                                    >
                                        <Avatar className="h-8 w-8 mt-1">
                                            <AvatarFallback>{otherParticipantName?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className={cn("text-sm font-medium", unread && "font-bold")}>
                                                    {otherParticipantName}
                                                </span>
                                                {conversation.lastMessage && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true, locale: pl })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={cn("text-xs truncate", unread ? "text-foreground font-medium" : "text-muted-foreground")}>
                                                {conversation.lastMessage?.text || 'Brak wiadomości'}
                                            </p>
                                        </div>
                                        {unread && (
                                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">Brak wiadomości</p>
                        </div>
                    )}
                </ScrollArea>
                <div className="border-t p-2">
                    <Button variant="ghost" size="sm" className="w-full" onClick={handleViewAll}>
                        Zobacz wszystkie
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
