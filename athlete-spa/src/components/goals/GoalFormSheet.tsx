import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, Loader2, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCollection } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { Exercise } from '@/lib/types';
import type { GoalInput, GoalMetric, GoalView } from '@/hooks/useRewards';
import { GOAL_TEMPLATES, templateFor, tint } from '@/components/rewards/reward-meta';

/** Przyjmuje „82,5” tak samo jak „82.5” — polska klawiatura daje przecinek. */
function parseNumber(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

const todayValue = () => format(new Date(), 'yyyy-MM-dd');
/** Termin liczony do końca wybranego dnia. */
const toDeadline = (date: string) => new Date(`${date}T23:59:59`).toISOString();

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function ExercisePicker({ selectedId, onSelect }: { selectedId?: string; onSelect: (exercise: Exercise) => void }) {
  const { data: exercises, isLoading } = useCollection<Exercise>('exercises');
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (exercises ?? [])
      .filter(exercise => (exercise.type ?? 'weight') === 'weight')
      .filter(exercise => !query || exercise.name.toLowerCase().includes(query))
      .slice(0, 30);
  }, [exercises, search]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Szukaj ćwiczenia" className="pl-9" />
      </div>
      <ul className="mt-2 max-h-52 overflow-y-auto rounded-xl bg-secondary/50">
        {isLoading && !exercises ? (
          <li className="flex items-center justify-center p-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </li>
        ) : matches.length === 0 ? (
          <li className="p-4 text-center text-sm text-muted-foreground">Brak ćwiczeń o takiej nazwie.</li>
        ) : (
          matches.map(exercise => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  onSelect(exercise);
                }}
                className={cn(
                  'row-tap flex min-h-11 w-full items-center px-3 py-2 text-left text-sm',
                  exercise.id === selectedId && 'bg-primary/15 font-semibold text-primary'
                )}
              >
                {exercise.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

interface GoalFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ustawiony = edycja istniejącego celu. */
  goal: GoalView | null;
  onCreate: (input: GoalInput) => Promise<unknown>;
  onUpdate: (id: string, input: { title: string; target: number; unit?: string; deadline: string | null }) => Promise<unknown>;
}

/** Arkusz zakładania celu: najpierw typ, potem wartość, termin i nazwa. */
export function GoalFormSheet({ open, onOpenChange, goal, onCreate, onUpdate }: GoalFormSheetProps) {
  const [metric, setMetric] = useState<GoalMetric | null>(null);
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [unit, setUnit] = useState('');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [exercise, setExercise] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    if (goal) {
      setMetric(goal.metric);
      setTarget(String(goal.target).replace('.', ','));
      setUnit(goal.unit);
      setTitle(goal.title);
      setTitleTouched(true);
      setDeadline(goal.deadline ? format(new Date(goal.deadline), 'yyyy-MM-dd') : '');
      setExercise(goal.exerciseId ? { id: goal.exerciseId, name: goal.exerciseName ?? '' } : null);
    } else {
      setMetric(null);
      setTarget('');
      setCurrent('');
      setUnit('');
      setTitle('');
      setTitleTouched(false);
      setDeadline('');
      setExercise(null);
    }
  }, [open, goal]);

  const template = metric ? templateFor(metric) : null;
  const editing = goal !== null;

  // Nazwa podpowiada się z wartości, dopóki użytkownik nie wpisze własnej.
  const suggestedTitle = template && target.trim() ? template.title(target.trim(), exercise?.name) : '';
  const shownTitle = titleTouched ? title : suggestedTitle;

  const submit = async () => {
    if (!template || !metric) return;

    const targetValue = parseNumber(target);
    if (targetValue === null || targetValue <= 0) return setError('Podaj wartość docelową większą od zera.');
    if (!shownTitle.trim()) return setError('Nazwij swój cel.');
    if (metric === 'exercise_max_weight' && !exercise) return setError('Wybierz ćwiczenie.');
    if (metric === 'manual' && !unit.trim()) return setError('Podaj jednostkę, np. kg, km, razy.');
    if (deadline && !editing && deadline < todayValue()) return setError('Termin nie może być w przeszłości.');

    const currentValue = parseNumber(current);
    setError(null);
    setSaving(true);
    try {
      if (goal) {
        await onUpdate(goal.id, {
          title: shownTitle.trim(),
          target: targetValue,
          unit: metric === 'manual' ? unit.trim() : undefined,
          deadline: deadline ? toDeadline(deadline) : null,
        });
      } else {
        await onCreate({
          title: shownTitle.trim(),
          metric,
          target: targetValue,
          current: metric === 'manual' ? (currentValue ?? 0) : undefined,
          unit: metric === 'manual' ? unit.trim() : undefined,
          deadline: deadline ? toDeadline(deadline) : undefined,
          exerciseId: exercise?.id,
          exerciseName: exercise?.name,
        });
      }
      haptic('success');
      onOpenChange(false);
    } catch (cause) {
      haptic('warning');
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać celu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{editing ? 'Edytuj cel' : template ? template.label : 'Nowy cel'}</SheetTitle>
          <SheetDescription>
            {template ? template.hint : 'Wybierz, co chcesz osiągnąć. Większość celów liczy się sama z Twoich treningów.'}
          </SheetDescription>
        </SheetHeader>

        {!template ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {GOAL_TEMPLATES.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.metric}
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    setMetric(option.metric);
                    setUnit(option.unit ?? '');
                  }}
                  className="pressable flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-secondary/60 p-3 text-left"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ background: tint(option.color, 18), color: option.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold leading-tight">{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={event => {
              event.preventDefault();
              void submit();
            }}
          >
            {!editing && (
              <button
                type="button"
                onClick={() => setMetric(null)}
                className="-ml-1 flex min-h-9 items-center gap-0.5 text-sm font-medium text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Inny rodzaj celu
              </button>
            )}

            {metric === 'exercise_max_weight' && !editing && (
              <Field label="Ćwiczenie">
                <ExercisePicker selectedId={exercise?.id} onSelect={picked => setExercise({ id: picked.id, name: picked.name })} />
              </Field>
            )}

            <div className={cn('grid gap-3', metric === 'manual' ? 'grid-cols-[1fr_7rem]' : 'grid-cols-1')}>
              <Field label={template.targetLabel}>
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    value={target}
                    onChange={event => setTarget(event.target.value)}
                    placeholder={template.placeholder}
                    className={cn('font-display text-xl font-bold tabular-nums', template.unit && 'pr-24')}
                  />
                  {template.unit && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {template.unit}
                    </span>
                  )}
                </div>
              </Field>
              {metric === 'manual' && (
                <Field label="Jednostka">
                  <Input value={unit} onChange={event => setUnit(event.target.value)} placeholder="kg" maxLength={20} />
                </Field>
              )}
            </div>

            {metric === 'manual' && !editing && (
              <Field label="Gdzie jesteś teraz?" hint="Zostaw puste, jeśli zaczynasz od zera.">
                <Input inputMode="decimal" value={current} onChange={event => setCurrent(event.target.value)} placeholder="0" />
              </Field>
            )}

            <Field label="Nazwa celu">
              <Input
                value={shownTitle}
                onChange={event => {
                  setTitleTouched(true);
                  setTitle(event.target.value);
                }}
                placeholder="np. Przysiad 100 kg"
                maxLength={120}
              />
            </Field>

            <Field label="Termin" hint="Opcjonalny. Z terminem zobaczysz, czy trzymasz tempo.">
              <Input type="date" value={deadline} min={editing ? undefined : todayValue()} onChange={event => setDeadline(event.target.value)} />
            </Field>

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Zapisz zmiany' : 'Ustaw cel'}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ProgressSheetProps {
  goal: GoalView | null;
  onClose: () => void;
  onSave: (goal: GoalView, current: number) => Promise<unknown>;
}

/** Szybka aktualizacja postępu celu wpisywanego ręcznie. */
export function GoalProgressSheet({ goal, onClose, onSave }: ProgressSheetProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setValue(String(goal.current).replace('.', ','));
      setError(null);
    }
  }, [goal]);

  const submit = async () => {
    if (!goal) return;
    const parsed = parseNumber(value);
    if (parsed === null || parsed < 0) return setError('Podaj liczbę.');
    setSaving(true);
    try {
      await onSave(goal, parsed);
      haptic('success');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać postępu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={goal !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom">
        {goal && (
          <form
            onSubmit={event => {
              event.preventDefault();
              void submit();
            }}
          >
            <SheetHeader>
              <SheetTitle>Zaktualizuj postęp</SheetTitle>
              <SheetDescription>
                {goal.title} · cel: {goal.target.toLocaleString('pl-PL')} {goal.unit}
              </SheetDescription>
            </SheetHeader>
            <div className="relative mt-4">
              <Input
                autoFocus
                inputMode="decimal"
                value={value}
                onChange={event => setValue(event.target.value)}
                aria-label="Aktualna wartość"
                className="h-14 pr-20 font-display text-2xl font-bold tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{goal.unit}</span>
            </div>
            {error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="mt-4 w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
