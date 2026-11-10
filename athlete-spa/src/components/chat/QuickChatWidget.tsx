import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useUser } from '@/lib/db-hooks';
import { useUnreadChatCount } from './hooks/useConversations';

/** Header shortcut to the chat, with the number of unread messages. */
export function QuickChatWidget() {
    const { user } = useUser();
    const unreadCount = useUnreadChatCount();

    if (!user) return null;

    return (
        <Link
            to="/athlete/chat"
            aria-label={unreadCount > 0 ? `Czat: ${unreadCount} nowych wiadomości` : 'Czat'}
            className="relative grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90 active:bg-secondary"
        >
            <MessageCircle className="h-[22px] w-[22px]" />
            {unreadCount > 0 && (
                <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
