import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCheck,
  Compass,
  Inbox,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { cn } from '@/lib/utils';
import type { Conversation, UserProfile } from '@/lib/chat/types';
import { LEAD_TRAINER_ID } from '@/lib/chat/constants';
import { haptic } from '@/lib/haptics';

const ICEBREAKERS = [
  '👋 Cześć Krystian! Chcę skonsultować mój aktualny plan treningowy.',
  '🎯 Od czego najlepiej zacząć powrót do regularnej formy?',
  '🥗 Szukam wskazówek jak dobrać kalorie i makroskładniki pod redukcję.',
];

function formatChatTime(dateInput: Date | string | number | undefined | null): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'Wczoraj';
  }
  return format(date, 'd MMM', { locale: pl });
}

function roleLabel(role: string): string {
  if (role === 'trainer') return 'Trener personalny';
  if (role === 'admin') return 'Zespół Leniwej Kluski';
  return 'Sportowiec';
}

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  isLoading: boolean;
  leadTrainer?: UserProfile | null;
  /** Offer the head coach when there are no conversations (never to the head coach themself). */
  showLeadTrainerOffer: boolean;
  onSelect: (conversation: Conversation) => void;
  onStartWithLeadTrainer?: (initialMessage?: string) => Promise<void> | void;
  header?: React.ReactNode;
}

export function ConversationList({
  conversations,
  currentUserId,
  isLoading,
  leadTrainer,
  showLeadTrainerOffer,
  onSelect,
  onStartWithLeadTrainer,
  header,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isStartingLead, setIsStartingLead] = useState(false);

  const totalUnread = useMemo(
    () => (conversations ?? []).reduce((sum, c) => sum + (c.unread || 0), 0),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (conversations ?? [])
      .filter(c => {
        if (filter === 'unread') return c.unread > 0;
        return true;
      })
      .filter(c => {
        if (!q) return true;
        const name = c.contact.name.toLowerCase();
        const lastMsg = (c.lastMessage?.text || '').toLowerCase();
        return name.includes(q) || lastMsg.includes(q);
      });
  }, [conversations, search, filter]);

  const handleStartLead = async (msg?: string) => {
    if (!onStartWithLeadTrainer || isStartingLead) return;
    setIsStartingLead(true);
    try {
      await onStartWithLeadTrainer(msg);
    } catch {
      // The page already told the user what went wrong.
    } finally {
      setIsStartingLead(false);
    }
  };

  return (
    <aside className="flex h-full flex-col bg-background">
      {/* Top Header Bar */}
      <div className="shrink-0 space-y-3 px-4 pt-3 pb-2 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
              Wiadomości
            </h1>
            {totalUnread > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {totalUnread}
              </span>
            )}
          </div>
          {header}
        </div>

        {/* Search & Filter pills when conversations exist */}
        {conversations && conversations.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Szukaj w rozmowach…"
                className="h-9 rounded-xl pl-8 pr-7 text-xs bg-card/70 border-border/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Wyczyść"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {totalUnread > 0 && (
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                    filter === 'all'
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  Wszystkie ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                    filter === 'unread'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  Nieprzeczytane ({totalUnread})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main List / Empty State */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="p-3 space-y-1.5">
          {isLoading && conversations.length === 0 &&
            [0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3.5 rounded-2xl bg-card/60 p-3">
                <span className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <span className="block h-3 w-1/3 animate-pulse rounded bg-secondary" />
                  <span className="block h-2.5 w-2/3 animate-pulse rounded bg-secondary" />
                </div>
              </div>
            ))}

          {filteredConversations.map(convo => {
            const { contact } = convo;
            const hasUnread = convo.unread > 0;
            const isMeLast = convo.lastMessage?.senderId === currentUserId;
            const readByContact = isMeLast && convo.unreadByContact === 0;

            return (
              <button
                key={convo.id}
                type="button"
                onClick={() => {
                  haptic('tap');
                  onSelect(convo);
                }}
                className={cn(
                  'flex w-full items-center gap-3.5 rounded-2xl border p-3 text-left transition-all active:scale-[0.99]',
                  hasUnread
                    ? 'border-primary/30 bg-card shadow-sm'
                    : 'border-transparent bg-card/60 active:bg-secondary/70'
                )}
              >
                <div className="relative shrink-0">
                  <TrainerAvatar trainer={contact} className="h-12 w-12 text-lg ring-2 ring-background shadow-xs" />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-card" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className={cn('truncate text-sm font-bold', hasUnread ? 'text-foreground' : 'text-foreground/90')}>
                        {contact.name}
                      </p>
                      {contact.role === 'trainer' && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-volt" />}
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-[11px] font-medium',
                        hasUnread ? 'font-bold text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {formatChatTime(convo.lastMessage?.createdAt || convo.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('flex min-w-0 items-center gap-1 truncate text-xs', hasUnread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {isMeLast &&
                        (readByContact ? (
                          <CheckCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Przeczytane" />
                        ) : (
                          <Check className="h-3.5 w-3.5 shrink-0" aria-label="Wysłane" />
                        ))}
                      <span className="truncate">
                        {isMeLast && <span className="font-normal">Ty: </span>}
                        {convo.lastMessage?.text || <span className="italic">{roleLabel(contact.role)} · brak wiadomości</span>}
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

          {/* No conversations, and you are the head coach (or the offer is off): plain inbox state */}
          {!isLoading && conversations.length === 0 && !showLeadTrainerOffer && (
            <div className="space-y-2 py-16 text-center text-xs text-muted-foreground">
              <Inbox className="mx-auto h-9 w-9 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">Brak rozmów</p>
              <p className="mx-auto max-w-[16rem]">Gdy ktoś do Ciebie napisze albo zaczniesz nową rozmowę, pojawi się tutaj.</p>
            </div>
          )}

          {/* Empty State when 0 conversations exist: PROPOSE LEAD TRAINER 6a5cf516f9fe894c859bb9af */}
          {!isLoading && conversations.length === 0 && showLeadTrainerOffer && (
            <div className="py-2 space-y-4">
              {/* Proposal Hero Card */}
              <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm space-y-4">
                {/* Header badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" /> Polecany Trener Główny
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-volt">
                    <span className="h-2 w-2 rounded-full bg-volt animate-ping" /> Wolne miejsca
                  </span>
                </div>

                {/* Trainer identity */}
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <TrainerAvatar
                      trainer={{
                        name: leadTrainer?.name || 'Krystian',
                        avatarUrl: leadTrainer?.avatarUrl || '/upload-data/757dc5e5-731e-4b89-b4b7-f546f9bdd290.jpg',
                      }}
                      className="h-16 w-16 text-2xl ring-2 ring-primary/40 shadow-sm"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-volt text-[10px] font-black text-background ring-2 ring-card">
                      ✓
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display text-2xl font-bold uppercase leading-tight text-foreground">
                        {leadTrainer?.name || 'Krystian'}
                      </h2>
                      <ShieldCheck className="h-4 w-4 text-volt shrink-0" />
                    </div>
                    <p className="line-clamp-1 text-xs font-medium text-muted-foreground">
                      {leadTrainer?.trainerCard?.headline || 'To od którego poniedziałku zaczynasz ?'}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-primary">
                      {leadTrainer?.location ? `${leadTrainer.location} • ` : ''}8 lat doświadczenia
                    </p>
                  </div>
                </div>

                {/* Pitch description */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nie masz jeszcze żadnych rozmów. Skorzystaj z bezpośredniego kontaktu z naszym certyfikowanym trenerem, aby skonsultować swój plan, technikę ćwiczeń lub zadać dowolne pytania.
                </p>

                {/* Value perks strip */}
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-secondary/60 p-2.5 text-center text-[11px]">
                  <div className="flex flex-col items-center">
                    <Zap className="h-3.5 w-3.5 text-primary mb-0.5" />
                    <span className="font-bold text-foreground">Szybka odp.</span>
                    <span className="text-[10px] text-muted-foreground">do 24h</span>
                  </div>
                  <div className="flex flex-col items-center border-x border-border/60 px-1">
                    <Sparkles className="h-3.5 w-3.5 text-volt mb-0.5" />
                    <span className="font-bold text-foreground">Plan 1-na-1</span>
                    <span className="text-[10px] text-muted-foreground">indywidualny</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary mb-0.5" />
                    <span className="font-bold text-foreground">Certyfikat</span>
                    <span className="text-[10px] text-muted-foreground">zweryfikowany</span>
                  </div>
                </div>

                {/* Icebreakers / quick questions */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Zadaj pierwsze pytanie:
                  </p>
                  <div className="space-y-1.5">
                    {ICEBREAKERS.map((text, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isStartingLead}
                        onClick={() => handleStartLead(text)}
                        className="w-full text-left rounded-xl bg-card border border-border/70 p-2.5 text-xs text-foreground/90 transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] flex items-center justify-between gap-2"
                      >
                        <span className="line-clamp-1">{text}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Action Button */}
                <div className="space-y-2 pt-2">
                  <Button
                    size="lg"
                    disabled={isStartingLead}
                    onClick={() => handleStartLead()}
                    className="w-full rounded-2xl h-11 font-bold text-sm shadow-md"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Rozpocznij czat z Krystianem
                  </Button>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                      <Link to={`/athlete/trainers/${LEAD_TRAINER_ID}`} onClick={() => haptic('tap')}>
                        Profil trenera
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-primary font-semibold">
                      <Link to="/athlete/trainers" onClick={() => haptic('tap')}>
                        <Compass className="mr-1 h-3.5 w-3.5" /> Wszyscy trenerzy
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* If there are conversations, but search yielded 0 */}
          {!isLoading && conversations.length > 0 && filteredConversations.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="font-semibold text-foreground">Nie znaleziono rozmów</p>
              <p>Zmień zapytanie w wyszukiwarce lub filtrach.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
                className="rounded-xl mt-1 text-xs"
              >
                Wyczyść wyszukiwanie
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
