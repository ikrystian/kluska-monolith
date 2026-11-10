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
import { useUser } from '@/lib/db-hooks';
import { useConversations } from './hooks/useConversations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatAvatar } from './ChatAvatar';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function QuickChatWidget() {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const { conversations } = useConversations();

    const unreadCount = useMemo(
        () => (conversations ?? []).reduce((acc, conv) => acc + (conv.unread || 0), 0),
        [conversations]
    );

    // Already newest first; show the 5 most recent.
    const sortedConversations = useMemo(() => (conversations ?? []).slice(0, 5), [conversations]);

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
                        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
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
                                const { contact } = conversation;
                                const unread = conversation.unread > 0;

                                return (
                                    <button
                                        key={conversation.id}
                                        onClick={() => handleSelectConversation(conversation.id)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                                            unread && "bg-muted/20"
                                        )}
                                    >
                                        <ChatAvatar contact={contact} className="mt-1 h-8 w-8" />
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className={cn("truncate text-sm font-medium", unread && "font-bold")}>
                                                    {contact.name}
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
