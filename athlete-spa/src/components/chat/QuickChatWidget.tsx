'use client';

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useChat } from './hooks/useChat';

/** Header shortcut to the chat, with the number of unread messages. */
export function QuickChatWidget() {
    const { conversations, currentUser } = useChat();

    const unreadCount = useMemo(() => {
        if (!conversations || !currentUser) return 0;
        return conversations.reduce((acc, conv) => acc + (conv.unreadCount?.[currentUser.uid] || 0), 0);
    }, [conversations, currentUser]);

    if (!currentUser) return null;

    return (
        <Link
            to="/athlete/chat"
            aria-label={unreadCount > 0 ? `Czat: ${unreadCount} nowych wiadomości` : 'Czat'}
            className="relative grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90 active:bg-secondary"
        >
            <MessageCircle className="h-[22px] w-[22px]" />
            {unreadCount > 0 && (
                <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                    {unreadCount}
                </span>
            )}
        </Link>
    );
}
