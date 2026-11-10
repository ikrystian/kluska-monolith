import { useEffect, useMemo, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Check, CheckCheck, Clock3, Loader2 } from 'lucide-react';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import type { ChatContact, Message } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  /** How many of the user's latest messages the contact has not read yet. */
  unreadByContact: number;
  isLoading: boolean;
  /** The other participant — never the signed-in user. */
  contact: ChatContact;
  onSendStarter?: (text: string) => void;
}

const TRAINER_STARTERS = [
  '👋 Cześć! Od czego zacząć współpracę?',
  '📋 Chciałbym skonsultować mój plan treningowy',
  '🎯 Jakie są wolne terminy na treningi?',
];

function formatDateSeparator(dateInput: Date | string | number | undefined | null): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  if (isToday(date)) return 'Dzisiaj';
  if (isYesterday(date)) return 'Wczoraj';
  return format(date, 'd MMMM yyyy', { locale: pl });
}

export function MessageList({
  messages,
  currentUserId,
  unreadByContact,
  isLoading,
  contact,
  onSendStarter,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;
  const hasScrolled = useRef(false);

  // Jump to the bottom on open, glide on each new message (not on every poll).
  useEffect(() => {
    if (!lastId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: hasScrolled.current ? 'smooth' : 'auto', block: 'end' });
    hasScrolled.current = true;
  }, [lastId]);

  // The contact's unread counter covers the user's latest messages, newest first.
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
      messages.reduce<{ dateLabel: string; items: Message[] }[]>((acc, msg) => {
        const label = formatDateSeparator(msg.createdAt);
        const last = acc[acc.length - 1];
        if (last && last.dateLabel === label) last.items.push(msg);
        else acc.push({ dateLabel: label, items: [msg] });
        return acc;
      }, []),
    [messages]
  );

  const isTrainer = contact.role === 'trainer';

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
      {isLoading && messages.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="mx-auto my-6 max-w-sm rounded-3xl border border-border/70 bg-card/60 p-5 text-center shadow-xs">
          <div className="relative mx-auto mb-3 h-16 w-16">
            <TrainerAvatar trainer={contact} className="h-16 w-16 text-xl ring-2 ring-primary/40" />
            {isTrainer && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-volt text-[10px] font-black text-background ring-2 ring-card">
                ✓
              </span>
            )}
          </div>
          <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">Rozpocznij rozmowę</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isTrainer
              ? `Napisz do ${contact.name}. Zadaj pytanie o technikę, plan treningowy, zalecenia dietetyczne lub wspólną współpracę.`
              : `Napisz pierwszą wiadomość do ${contact.name}.`}
          </p>

          {onSendStarter && isTrainer && (
            <div className="mt-4 space-y-1.5 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Szybkie pytania:</p>
              {TRAINER_STARTERS.map(starter => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => onSendStarter(starter)}
                  className="w-full rounded-xl border border-border/60 bg-background/80 p-2 text-left text-xs text-foreground/90 transition-all active:scale-[0.98] active:bg-primary/5"
                >
                  {starter}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.dateLabel} className="space-y-1.5">
              <div className="my-3 flex items-center justify-center">
                <span className="rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                  {group.dateLabel}
                </span>
              </div>

              {group.items.map((message, index) => {
                const isMe = message.senderId === currentUserId;
                const next = group.items[index + 1];
                // The contact's avatar marks the last bubble of each of their runs.
                const endsRun = !next || next.senderId !== message.senderId;
                const timeStr = message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : '';

                return (
                  <div
                    key={message.id}
                    className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start', endsRun && 'pb-1')}
                  >
                    {!isMe &&
                      (endsRun ? (
                        <TrainerAvatar trainer={contact} className="h-7 w-7 shrink-0 text-xs ring-1 ring-border" />
                      ) : (
                        <span className="w-7 shrink-0" />
                      ))}

                    <div
                      className={cn(
                        'relative max-w-[82%] break-words px-3.5 py-2.5 shadow-xs transition-opacity',
                        isMe
                          ? 'rounded-2xl rounded-br-xs bg-primary text-primary-foreground'
                          : 'rounded-2xl rounded-bl-xs border border-border/70 bg-card text-card-foreground',
                        message.pending && 'opacity-70'
                      )}
                    >
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{message.text}</p>
                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-[10px] font-medium leading-none',
                          isMe ? 'text-primary-foreground/75' : 'text-muted-foreground'
                        )}
                      >
                        <span>{timeStr}</span>
                        {isMe &&
                          (message.pending ? (
                            <Clock3 className="h-3 w-3" aria-label="Wysyłanie" />
                          ) : unreadIds.has(message.id) ? (
                            <Check className="h-3 w-3" aria-label="Wysłane" />
                          ) : (
                            <CheckCheck className="h-3 w-3" aria-label="Przeczytane" />
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
