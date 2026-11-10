import React, { useEffect, useMemo, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, CheckCheck, Clock3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatContact, Message } from '@/lib/chat/types';
import { ChatAvatar } from './ChatAvatar';

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
    /** How many of the user's latest messages the contact has not read yet. */
    unreadByContact: number;
    isLoading: boolean;
    /** The other participant — never the signed-in user. */
    contact: ChatContact;
}

function dayLabel(value: string): string {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    if (isToday(date)) return 'Dzisiaj';
    if (isYesterday(date)) return 'Wczoraj';
    return format(date, 'd MMMM yyyy', { locale: pl });
}

export function MessageList({ messages, currentUserId, unreadByContact, isLoading, contact }: MessageListProps) {
    const endRef = useRef<HTMLDivElement>(null);
    const lastId = messages[messages.length - 1]?.id;
    const scrolled = useRef(false);

    // Jump to the bottom on open, glide on each new message (not on every poll).
    useEffect(() => {
        if (!lastId) return;
        endRef.current?.scrollIntoView({ behavior: scrolled.current ? 'smooth' : 'auto', block: 'end' });
        scrolled.current = true;
    }, [lastId]);

    const unreadIds = useMemo(() => {
        const ids = new Set<string>();
        for (let i = messages.length - 1; i >= 0 && ids.size < unreadByContact; i--) {
            const m = messages[i];
            if (m.senderId === currentUserId && !m.pending) ids.add(m.id);
        }
        return ids;
    }, [messages, currentUserId, unreadByContact]);

    const groups = useMemo(
        () =>
            messages.reduce<{ label: string; items: Message[] }[]>((acc, msg) => {
                const label = dayLabel(msg.createdAt);
                const last = acc[acc.length - 1];
                if (last && last.label === label) last.items.push(msg);
                else acc.push({ label, items: [msg] });
                return acc;
            }, []),
        [messages]
    );

    if (isLoading && messages.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                <ChatAvatar contact={contact} className="h-16 w-16 text-xl" />
                <p className="font-semibold text-foreground">Rozpocznij rozmowę z {contact.name}</p>
                <p className="max-w-xs text-sm">Napisz pierwszą wiadomość poniżej.</p>
            </div>
        );
    }

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
                {groups.map(group => (
                    <div key={group.label} className="space-y-2">
                        <div className="flex justify-center">
                            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">{group.label}</span>
                        </div>
                        {group.items.map(message => {
                            const isMe = message.senderId === currentUserId;
                            return (
                                <div key={message.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                                    <div
                                        className={cn(
                                            'max-w-xs break-words rounded-lg p-3 md:max-w-md lg:max-w-lg',
                                            isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary',
                                            message.pending && 'opacity-70'
                                        )}
                                    >
                                        <p className="whitespace-pre-wrap">{message.text}</p>
                                        <p
                                            className={cn(
                                                'mt-1 flex items-center justify-end gap-1 text-xs',
                                                isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                            )}
                                        >
                                            {format(new Date(message.createdAt), 'HH:mm')}
                                            {isMe &&
                                                (message.pending ? (
                                                    <Clock3 className="h-3 w-3" aria-label="Wysyłanie" />
                                                ) : unreadIds.has(message.id) ? (
                                                    <Check className="h-3 w-3" aria-label="Wysłane" />
                                                ) : (
                                                    <CheckCheck className="h-3 w-3" aria-label="Przeczytane" />
                                                ))}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}
