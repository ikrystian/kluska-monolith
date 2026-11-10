import React, { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, CheckCheck, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { chatRoleLabel, type Conversation } from '@/lib/chat/types';
import { ChatAvatar } from './ChatAvatar';

export function formatChatTime(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Wczoraj';
    return format(date, 'd MMM', { locale: pl });
}

interface ConversationListProps {
    conversations: Conversation[];
    /** Document id of the open conversation, for highlighting. */
    selectedId: string | null;
    currentUserId: string;
    isLoading: boolean;
    /** Hide on small screens while a conversation is open. */
    collapsed: boolean;
    onSelect: (conversation: Conversation) => void;
    header?: React.ReactNode;
}

export function ConversationList({
    conversations,
    selectedId,
    currentUserId,
    isLoading,
    collapsed,
    onSelect,
    header,
}: ConversationListProps) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter(
            c => c.contact.name.toLowerCase().includes(q) || (c.lastMessage?.text ?? '').toLowerCase().includes(q)
        );
    }, [conversations, search]);

    return (
        <aside className={cn('flex h-full min-h-0 flex-col border-r', collapsed && 'hidden md:flex')}>
            {header && <header className="space-y-3 border-b p-4">{header}</header>}
            {conversations.length > 3 && (
                <div className="relative border-b p-3">
                    <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Szukaj rozmowy…"
                        className="h-9 pl-9"
                    />
                </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading && conversations.length === 0 &&
                    [0, 1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3 border-b p-4">
                            <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-secondary" />
                            <div className="flex-1 space-y-2">
                                <span className="block h-3 w-1/3 animate-pulse rounded bg-secondary" />
                                <span className="block h-2.5 w-2/3 animate-pulse rounded bg-secondary" />
                            </div>
                        </div>
                    ))}

                {filtered.map(convo => {
                    const { contact } = convo;
                    const hasUnread = convo.unread > 0;
                    const isMeLast = convo.lastMessage?.senderId === currentUserId;

                    return (
                        <button
                            key={convo.id}
                            type="button"
                            onClick={() => onSelect(convo)}
                            className={cn(
                                'flex w-full items-center gap-3 border-b p-4 text-left transition-colors hover:bg-secondary/50',
                                selectedId === convo.id && 'bg-secondary'
                            )}
                        >
                            <ChatAvatar contact={contact} />
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <p className={cn('truncate font-semibold', hasUnread && 'text-primary')}>{contact.name}</p>
                                    <span className={cn('shrink-0 text-xs', hasUnread ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                                        {formatChatTime(convo.lastMessage?.createdAt ?? convo.updatedAt)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <p className={cn('flex min-w-0 items-center gap-1 text-sm', hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                                        {isMeLast &&
                                            (convo.unreadByContact === 0 ? (
                                                <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Przeczytane" />
                                            ) : (
                                                <Check className="h-3.5 w-3.5 shrink-0" aria-label="Wysłane" />
                                            ))}
                                        <span className="truncate">
                                            {isMeLast && 'Ty: '}
                                            {convo.lastMessage?.text ?? (
                                                <span className="italic">{chatRoleLabel(contact.role)} · brak wiadomości</span>
                                            )}
                                        </span>
                                    </p>
                                    {hasUnread && (
                                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                            {convo.unread > 99 ? '99+' : convo.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}

                {!isLoading && conversations.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        <Users className="mx-auto mb-4 h-12 w-12" />
                        <h3 className="font-semibold">Brak konwersacji</h3>
                        <p className="text-sm">Rozpocznij czat z jednym ze swoich kontaktów.</p>
                    </div>
                )}
                {conversations.length > 0 && filtered.length === 0 && (
                    <p className="p-8 text-center text-sm text-muted-foreground">Nie znaleziono rozmów.</p>
                )}
            </div>
        </aside>
    );
}
