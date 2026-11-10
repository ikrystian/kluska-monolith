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
      <div className="flex flex-col gap-2">
        <Button asChild className={cn(height, 'flex-1 text-base')}>
          <Link to={chat}>
            <MessageSquare className="mr-2 h-4 w-4" /> Napisz do trenera
          </Link>
        </Button>
        {!compact && (
          <Button asChild variant="outline" className={cn(height, 'flex-1 rounded-full')}>
            <Link to="/athlete/workout-plans">
              <Layers className="mr-2 h-4 w-4" /> Mój program
              <ArrowRight className="ml-auto h-4 w-4" />
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
        className={cn(height, 'min-w-0 flex-1 rounded-full text-base')}
        disabled={pending}
        onClick={onInquire}
      >
        {pending ? <CheckCircle2 className="mr-2 h-4 w-4 shrink-0" /> : <Send className="mr-2 h-4 w-4 shrink-0" />}
        <span className="truncate">{label}</span>
      </Button>
      <Button asChild variant="outline" className={cn(height, 'shrink-0 px-4')} aria-label="Napisz na czacie">
        <Link to={chat}>
          <MessageSquare className="h-4 w-4" />
          <span className={cn('ml-2', pending ? '' : 'hidden')}>Czat</span>
        </Link>
      </Button>
    </div>
  );
}
