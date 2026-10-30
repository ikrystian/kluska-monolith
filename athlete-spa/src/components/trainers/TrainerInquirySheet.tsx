import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, MessageSquare, Send } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { INQUIRY_GOALS } from './trainer-meta';

const MAX_MESSAGE = 1000;

interface TrainerInquirySheetProps {
  trainer: Pick<UserProfile, 'id' | 'name'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Offer the athlete asked about; pre-fills the message. */
  topic?: string;
}

/** Bottom sheet where an athlete introduces themselves and asks a trainer about working together. */
export function TrainerInquirySheet({ trainer, open, onOpenChange, topic }: TrainerInquirySheetProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading } = useCreateDoc();
  const [goal, setGoal] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  // A fresh form every time the sheet opens; the topic only seeds the message.
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setGoal(null);
    setMessage(topic ? `Interesuje mnie: ${topic}. ` : '');
  }, [open, topic]);

  const canSend = !!goal && message.trim().length >= 10 && !isLoading;

  const submit = async () => {
    if (!user || !goal) return;
    try {
      await createDoc('trainerRequests', {
        athleteId: user.uid,
        athleteName: user.name,
        trainerId: trainer.id,
        goal,
        message: message.trim(),
        status: 'pending',
      });
      haptic('success');
      setSent(true);
    } catch {
      toast({
        title: 'Nie udało się wysłać zapytania',
        description: 'Sprawdź połączenie i spróbuj ponownie.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
      >
        {sent ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <SheetTitle className="mt-4 font-headline text-2xl font-bold">Zapytanie wysłane</SheetTitle>
            <SheetDescription className="mt-1 max-w-xs">
              {trainer.name} dostanie Twoją wiadomość i odpowie w czacie. Możesz też od razu napisać dalej.
            </SheetDescription>
            <Button asChild className="mt-6 h-12 w-full rounded-full text-base">
              <Link to={`/athlete/chat?userId=${trainer.id}`}>
                <MessageSquare className="mr-2 h-4 w-4" /> Przejdź do czatu
              </Link>
            </Button>
            <Button variant="ghost" className="mt-2 w-full rounded-full" onClick={() => onOpenChange(false)}>
              Zamknij
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader className="mb-5 text-left">
              <SheetTitle className="font-headline text-2xl font-bold">Zapytaj o współpracę</SheetTitle>
              <SheetDescription>
                Powiedz trenerowi, nad czym chcesz pracować — łatwiej dobierze plan i odpisze konkretnie.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Twój cel</p>
                <div className="flex flex-wrap gap-2">
                  {INQUIRY_GOALS.map(g => (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={goal === g}
                      onClick={() => setGoal(g)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-semibold transition-colors active:scale-95',
                        goal === g
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border/70 bg-card text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="inquiry-message" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Wiadomość
                </label>
                <Textarea
                  id="inquiry-message"
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                  rows={5}
                  placeholder="Opisz doświadczenie, ile razy w tygodniu możesz trenować i czego oczekujesz."
                  className="rounded-2xl"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">
                  {message.length}/{MAX_MESSAGE}
                </p>
              </div>

              <Button className="h-12 w-full rounded-full text-base" disabled={!canSend} onClick={submit}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Wyślij zapytanie
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Wysyłając zapytanie, udostępniasz trenerowi swoje imię i treść wiadomości.
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
