import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Star } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { jsonFetcher } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Section } from '@/components/trainers/TrainerProfileSections';
import { plural } from '@/components/trainers/trainer-meta';

interface TrainerReview {
  id: string;
  rating: number;
  text: string;
  athleteName: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
}

interface ReviewsResponse {
  reviews: TrainerReview[];
  average: number | null;
  count: number;
}

const MAX_TEXT = 600;
const reviewsKey = (trainerId: string) => `/api/trainers/${trainerId}/reviews`;

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Ocena ${value} z 5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={cn('h-4 w-4', n <= Math.round(value) ? 'fill-volt text-volt' : 'text-muted-foreground/40', className)}
        />
      ))}
    </span>
  );
}

/**
 * Opinie o trenerze. Każdy je widzi; dodać (albo zmienić) może tylko podopieczny
 * przypisany do tego trenera.
 */
export function TrainerReviews({ trainerId, canReview }: { trainerId: string; canReview: boolean }) {
  const { data, mutate, isLoading } = useSWR<ReviewsResponse>(reviewsKey(trainerId), jsonFetcher);
  const { toast } = useToast();
  const mine = data?.reviews.find(review => review.mine);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const showForm = canReview && (!mine || editing);

  const startEditing = () => {
    setRating(mine?.rating ?? 0);
    setText(mine?.text ?? '');
    setEditing(true);
  };

  const submit = async () => {
    if (!rating || saving) return;
    setSaving(true);
    try {
      const response = await apiFetch(reviewsKey(trainerId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, text: text.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Nie udało się zapisać opinii.');
      await mutate();
      setEditing(false);
      haptic('success');
      toast({ title: 'Dziękujemy!', description: 'Twoja opinia została zapisana.' });
    } catch (error) {
      toast({
        title: 'Nie udało się zapisać opinii',
        description: error instanceof Error ? error.message : 'Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section eyebrow="Opinie" title="Co mówią podopieczni">
      {data && data.count > 0 && data.average !== null && (
        <div className="mb-4 flex items-center gap-3">
          <span className="font-headline text-4xl font-bold leading-none tabular-nums">{data.average.toFixed(1)}</span>
          <div>
            <Stars value={data.average} />
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.count} {plural(data.count, 'opinia', 'opinie', 'opinii')}
            </p>
          </div>
        </div>
      )}

      {canReview && !showForm && mine && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-card p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Twoja opinia</p>
            <Stars value={mine.rating} className="mt-1 h-3.5 w-3.5" />
          </div>
          <Button variant="outline" size="sm" onClick={startEditing}>Zmień</Button>
        </div>
      )}

      {showForm && (
        <div className="mb-4 space-y-3 rounded-2xl bg-card p-4">
          <p className="text-sm font-semibold">{mine ? 'Zmień opinię' : 'Dodaj opinię'}</p>
          <div role="radiogroup" aria-label="Ocena trenera" className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} z 5`}
                onClick={() => {
                  haptic('tap');
                  setRating(n);
                }}
                className="grid h-10 w-10 place-items-center rounded-full active:scale-90"
              >
                <Star className={cn('h-7 w-7', n <= rating ? 'fill-volt text-volt' : 'text-muted-foreground/40')} />
              </button>
            ))}
          </div>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_TEXT))}
            placeholder="Co pomogło Ci w pracy z trenerem? (opcjonalnie)"
            rows={3}
          />
          <p className="text-right text-xs text-muted-foreground">{text.length}/{MAX_TEXT}</p>
          <div className="flex justify-end gap-2">
            {mine && (
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Anuluj</Button>
            )}
            <Button onClick={submit} disabled={!rating || saving}>
              {mine ? 'Zapisz zmiany' : 'Dodaj opinię'}
            </Button>
          </div>
        </div>
      )}

      {isLoading && !data && <div className="h-24 animate-pulse rounded-2xl bg-card" />}

      {data && data.reviews.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border/70 p-5 text-center text-sm text-muted-foreground">
          Nie ma jeszcze opinii o tym trenerze.
        </p>
      )}

      {data && data.reviews.length > 0 && (
        <ul className="space-y-3">
          {data.reviews.map(review => (
            <li key={review.id} className="rounded-2xl bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <Stars value={review.rating} className="h-3.5 w-3.5" />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(review.createdAt), 'd MMM yyyy', { locale: pl })}
                </span>
              </div>
              {review.text && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{review.text}</p>}
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {review.athleteName}{review.mine && ' · Ty'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
