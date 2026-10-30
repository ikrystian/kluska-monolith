import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Layers, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TrainerCard } from '@/lib/types';
import { AVAILABILITY, RESPONSE_LABEL } from './trainer-meta';

export interface ContactState {
  trainerId: string;
  /** This trainer is already the athlete's trainer. */
  isMine: boolean;
  /** The athlete has an unanswered inquiry with this trainer. */
  pending: boolean;
  card?: TrainerCard;
  onInquire: () => void;
}

/** Primary + secondary contact buttons; their meaning depends on the athlete's relation to the trainer. */
export function ContactActions({ trainerId, isMine, pending, card, onInquire, compact }: ContactState & { compact?: boolean }) {
  const chat = `/athlete/chat?userId=${trainerId}`;
  const height = compact ? 'h-11' : 'h-12';

  if (isMine) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className={cn(height, 'flex-1 rounded-full text-base')}>
          <Link to={chat}>
            <MessageSquare className="mr-2 h-4 w-4" /> Napisz do trenera
          </Link>
        </Button>
        {!compact && (
          <Button asChild variant="outline" className={cn(height, 'flex-1 rounded-full')}>
            <Link to="/athlete/workout-plans">
              <Layers className="mr-2 h-4 w-4" /> Mój program
              <ArrowRight className="ml-auto h-4 w-4 sm:ml-2" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const closed = card?.availability === 'closed';
  const label = pending ? 'Zapytanie wysłane' : closed ? 'Zapytaj o wolny termin' : card?.ctaText || 'Wyślij zapytanie';

  return (
    <div className="flex gap-2">
      <Button
        className={cn(height, 'min-w-0 flex-1 rounded-full text-base shadow-glow')}
        disabled={pending}
        onClick={onInquire}
      >
        {pending ? <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" /> : <Send className="mr-2 h-4 w-4 shrink-0" />}
        <span className="truncate">{label}</span>
      </Button>
      <Button asChild variant="outline" className={cn(height, 'shrink-0 rounded-full px-4')} aria-label="Napisz na czacie">
        <Link to={chat}>
          <MessageSquare className="h-4 w-4" />
          <span className={cn('ml-2', pending ? '' : 'hidden sm:inline')}>Czat</span>
        </Link>
      </Button>
    </div>
  );
}

const PROMISES = ['Plan dopasowany do Twojego celu', 'Stały kontakt w czacie', 'Korekty programu na bieżąco'];

/** Desktop sidebar: availability, response time and the main call to action. */
export function ContactCard(props: ContactState) {
  const { card, isMine } = props;
  const availability = card?.availability ? AVAILABILITY[card.availability] : undefined;

  return (
    <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-lifted">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
        {isMine ? 'Twój trener' : 'Rozpocznij współpracę'}
      </p>

      {(availability || card?.responseTime) && (
        <ul className="mt-3 space-y-2 text-sm">
          {availability && (
            <li className="flex items-center gap-2 font-semibold">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', availability.dot)} />
              {availability.label}
            </li>
          )}
          {card?.responseTime && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              Odpowiada {RESPONSE_LABEL[card.responseTime]}
            </li>
          )}
        </ul>
      )}

      <div className="mt-4">
        <ContactActions {...props} />
      </div>

      {!isMine && (
        <ul className="mt-5 space-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          {PROMISES.map(p => (
            <li key={p} className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
