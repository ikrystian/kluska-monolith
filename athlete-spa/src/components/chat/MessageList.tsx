import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CheckCheck, Loader2, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { Message, UserProfile } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading: boolean;
  otherParticipant?: UserProfile | null;
  onSendStarter?: (text: string) => void;
}

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
  isLoading,
  otherParticipant,
  onSendStarter,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Group messages by day
  const grouped = messages?.reduce<{ dateLabel: string; items: Message[] }[]>((acc, msg) => {
    const label = formatDateSeparator(msg.createdAt);
    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.dateLabel === label) {
      lastGroup.items.push(msg);
    } else {
      acc.push({ dateLabel: label, items: [msg] });
    }
    return acc;
  }, []) ?? [];

  return (
    <ScrollArea className="min-h-0 flex-1 px-3 py-4">
      {isLoading && messages.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="mx-auto my-6 max-w-sm rounded-3xl border border-border/70 bg-card/60 p-5 text-center shadow-xs">
          {otherParticipant && (
            <div className="relative mx-auto mb-3 h-16 w-16">
              <TrainerAvatar trainer={otherParticipant} className="h-16 w-16 text-xl ring-2 ring-primary/40" />
              <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-volt text-[10px] font-black text-background ring-2 ring-card">
                ✓
              </span>
            </div>
          )}
          <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
            Rozpocznij rozmowę
          </h3>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Napisz do {otherParticipant?.name || 'trenera'}. Zadaj pytanie o technikę, plan treningowy, zalecenia dietetyczne lub wspólną współpracę.
          </p>

          {onSendStarter && (
            <div className="mt-4 space-y-1.5 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Szybkie pytania:
              </p>
              {[
                '👋 Cześć! Od czego zacząć współpracę?',
                '📋 Chciałbym skonsultować mój plan treningowy',
                '🎯 Jakie są wolne terminy na treningi?',
              ].map(starter => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => onSendStarter(starter)}
                  className="w-full rounded-xl border border-border/60 bg-background/80 p-2 text-xs text-foreground/90 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] text-left"
                >
                  {starter}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              {/* Date Separator Pill */}
              <div className="flex items-center justify-center my-3">
                <span className="rounded-full bg-secondary/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground backdrop-blur-xs">
                  {group.dateLabel}
                </span>
              </div>

              {/* Messages in day */}
              {group.items.map(message => {
                const isMe = message.senderId === currentUserId;
                const timeStr = message.createdAt
                  ? format(new Date(message.createdAt), 'HH:mm')
                  : '';

                return (
                  <div
                    key={message.id}
                    className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start')}
                  >
                    {!isMe && otherParticipant && (
                      <TrainerAvatar
                        trainer={otherParticipant}
                        className="h-7 w-7 shrink-0 text-xs ring-1 ring-border"
                      />
                    )}

                    <div
                      className={cn(
                        'relative max-w-[82%] px-3.5 py-2.5 shadow-xs transition-all break-words',
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-xs'
                          : 'bg-card border border-border/70 text-card-foreground rounded-2xl rounded-bl-xs'
                      )}
                    >
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-[10px] font-medium leading-none',
                          isMe ? 'text-primary-foreground/75' : 'text-muted-foreground'
                        )}
                      >
                        <span>{timeStr}</span>
                        {isMe && <CheckCheck className="h-3 w-3" />}
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
    </ScrollArea>
  );
}
