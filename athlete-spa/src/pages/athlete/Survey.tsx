import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCollection, useCreateDoc, useDoc, useUser } from '@/lib/db-hooks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface SurveyQuestion {
  id: string;
  type: 'open' | 'closed';
  text: string;
  options?: string[];
  required: boolean;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  trainerName: string;
  questions: SurveyQuestion[];
  status: 'draft' | 'active' | 'closed';
}

interface SurveyResponseRow {
  id: string;
  surveyId: string;
  athleteId: string;
}

/** Ankieta przypisana przez trenera: sportowiec odpowiada na pytania i wysyła odpowiedzi. */
export default function AthleteSurveyPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading: saving } = useCreateDoc();

  const { data: survey, isLoading } = useDoc<Survey>('surveys', id ?? null);
  const { data: responses, isLoading: responsesLoading, refetch } = useCollection<SurveyResponseRow>(
    user && id ? 'surveyResponses' : null,
    user && id ? { surveyId: id, athleteId: user.uid } : undefined
  );
  const answered = (responses?.length ?? 0) > 0;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const missingRequired = useMemo(
    () => (survey?.questions ?? []).filter(q => q.required && !(answers[q.id] ?? '').trim()),
    [survey, answers]
  );

  if (isLoading || responsesLoading) {
    return (
      <div className="page space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="page py-20 text-center">
        <h2 className="font-headline text-2xl font-bold">Nie znaleziono ankiety</h2>
        <p className="mb-6 mt-1 text-muted-foreground">Ta ankieta nie istnieje albo nie jest przypisana do Ciebie.</p>
        <Button asChild><Link to="/athlete/dashboard">Wróć do pulpitu</Link></Button>
      </div>
    );
  }

  const closed = survey.status !== 'active';
  const done = answered || sent;

  const submit = async () => {
    if (!user || missingRequired.length > 0 || saving) return;
    try {
      await createDoc('surveyResponses', {
        surveyId: survey.id,
        athleteId: user.uid,
        athleteName: user.name,
        answers: survey.questions.map(q => ({ questionId: q.id, answer: (answers[q.id] ?? '').trim() })),
      });
      haptic('success');
      setSent(true);
      refetch();
    } catch (error) {
      toast({
        title: 'Nie udało się wysłać ankiety',
        description: error instanceof Error ? error.message : 'Spróbuj ponownie.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="page space-y-5 pb-24">

      <header>
        <p className="text-xs font-semibold text-primary">Ankieta od trenera · {survey.trainerName}</p>
        <h1 className="mt-1 font-headline text-3xl font-bold leading-tight tracking-tight">{survey.title}</h1>
        {survey.description && <p className="mt-2 text-sm text-muted-foreground">{survey.description}</p>}
      </header>

      {done ? (
        <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-volt/15 text-volt">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="mt-4 font-headline text-xl font-bold">Dziękujemy za odpowiedzi!</p>
          <p className="mt-1 text-sm text-muted-foreground">{survey.trainerName} dostanie Twoje odpowiedzi.</p>
        </div>
      ) : closed ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
          Ta ankieta jest już zamknięta.
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            void submit();
          }}
        >
          {survey.questions.map((question, index) => (
            <fieldset key={question.id} className="space-y-2.5 rounded-2xl bg-card p-4">
              <legend className="px-0 text-[15px] font-semibold leading-snug">
                {index + 1}. {question.text}
                {question.required && <span className="ml-1 text-destructive">*</span>}
              </legend>

              {question.type === 'open' ? (
                <Textarea
                  value={answers[question.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                  rows={3}
                  placeholder="Twoja odpowiedź"
                  disabled={saving}
                />
              ) : (
                <div role="radiogroup" className="space-y-2">
                  {(question.options ?? []).map(option => {
                    const selected = answers[question.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={saving}
                        onClick={() => {
                          haptic('tap');
                          setAnswers(prev => ({ ...prev, [question.id]: option }));
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-colors',
                          selected ? 'border-primary bg-primary/10' : 'border-border/60 bg-background active:bg-secondary'
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                            selected ? 'border-primary' : 'border-muted-foreground/50'
                          )}
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
          ))}

          <div className="sticky bottom-[calc(var(--app-bottom,0px)+0.75rem)]">
            <Button type="submit" size="lg" className="h-12 w-full" disabled={missingRequired.length > 0 || saving}>
              {saving ? 'Wysyłanie…' : 'Wyślij odpowiedzi'}
            </Button>
            {missingRequired.length > 0 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Odpowiedz na pytania oznaczone gwiazdką.
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
