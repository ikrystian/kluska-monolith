import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useUser } from '@/lib/db-hooks';
import { apiFetch, resolveMediaUrl } from '@/lib/api-client';
import type { UserProfile } from '@/lib/types';

/**
 * AI coach's take on a finished workout: the trainer's avatar next to a chat
 * bubble. The summary is generated on the first open and stored on the log by
 * the API, so every later open (here or on another device) reads it back.
 */
export function CoachSummaryDialog({
  workoutLogId,
  savedSummary,
  open,
  onOpenChange,
}: {
  workoutLogId: string;
  savedSummary?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useUser();
  const { data: profile } = useDoc<UserProfile>('users', user?.uid ?? null);
  // Athletes with their own trainer see that trainer's face; others get the generic coach.
  const { data: trainer } = useDoc<UserProfile>('users', profile?.trainerId ?? null);

  const [summary, setSummary] = useState<string | null>(savedSummary ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (savedSummary) setSummary(savedSummary);
  }, [savedSummary]);

  const loadSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/athlete/workouts/${workoutLogId}/summary`, { method: 'POST' });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      setSummary(data.summary);
    } catch {
      setError('Trener chwilowo nie odpowiada. Spróbuj ponownie za chwilę.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && !summary && !isLoading && !error) loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, summary]);

  const coachName = trainer?.name || 'Trener';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Podsumowanie treningu</DialogTitle>
          <DialogDescription className="sr-only">Analiza treningu przygotowana przez trenera AI</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0 ring-4 ring-primary/20">
            {trainer?.avatarUrl && <AvatarImage src={resolveMediaUrl(trainer.avatarUrl)} alt={coachName} className="object-cover" />}
            <AvatarFallback className="bg-primary/10 text-2xl">🏋️</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{coachName}</p>
            <div className="rounded-2xl rounded-tl-none bg-muted p-4 text-sm leading-relaxed">
              {isLoading ? (
                <div className="space-y-2" aria-label="Trener pisze…">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : error ? (
                <div className="space-y-3">
                  <p className="text-destructive">{error}</p>
                  <Button size="sm" variant="secondary" onClick={loadSummary}>Spróbuj ponownie</Button>
                </div>
              ) : (
                <p className="whitespace-pre-line">{summary}</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
