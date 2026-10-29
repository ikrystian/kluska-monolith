import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { formatPace } from './running-format';

const runSchema = z
  .object({
    date: z.string().min(1, 'Podaj datę.'),
    distance: z.coerce.number().positive('Dystans musi być liczbą dodatnią.'),
    hours: z.coerce.number().int().min(0).max(48),
    minutes: z.coerce.number().int().min(0).max(59, 'Max 59.'),
    seconds: z.coerce.number().int().min(0).max(59, 'Max 59.'),
    notes: z.string().optional(),
  })
  .refine(v => v.hours * 3600 + v.minutes * 60 + v.seconds > 0, {
    message: 'Podaj czas biegu.',
    path: ['minutes'],
  })
  .refine(v => new Date(v.date) <= new Date(), { message: 'Data nie może być z przyszłości.', path: ['date'] });

type RunFormInput = z.input<typeof runSchema>;
type RunFormValues = z.output<typeof runSchema>;

const nowLocal = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");

const defaults = (): RunFormInput => ({
  date: nowLocal(),
  distance: undefined,
  hours: 0,
  minutes: undefined,
  seconds: 0,
  notes: '',
});

/** Bottom sheet for logging a run done without the in-app tracker. */
export function ManualRunSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading } = useCreateDoc();
  const form = useForm<RunFormInput, unknown, RunFormValues>({ resolver: zodResolver(runSchema), defaultValues: defaults() });

  useEffect(() => {
    if (open) form.reset(defaults());
  }, [open, form]);

  const [distance, hours, minutes, seconds] = form.watch(['distance', 'hours', 'minutes', 'seconds']);
  const totalMin = (Number(hours) || 0) * 60 + (Number(minutes) || 0) + (Number(seconds) || 0) / 60;
  const previewPace = Number(distance) > 0 && totalMin > 0 ? totalMin / Number(distance) : 0;

  const onSubmit = async (data: RunFormValues) => {
    if (!user) return;
    const duration = data.hours * 60 + data.minutes + data.seconds / 60;
    try {
      await createDoc('runningSessions', {
        date: new Date(data.date).toISOString(),
        distance: data.distance,
        duration,
        avgPace: duration / data.distance,
        notes: data.notes,
        ownerId: user.uid,
      });
      haptic('success');
      toast({ title: 'Bieg zapisany', description: 'Dodano go do Twojej historii.' });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error('Error saving run:', error);
      haptic('warning');
      toast({ title: 'Błąd', description: 'Nie udało się zapisać biegu.', variant: 'destructive' });
    }
  };

  const timeField = (name: 'hours' | 'minutes' | 'seconds', label: string, placeholder: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1">
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={placeholder}
              className="h-12 rounded-xl text-center text-lg font-semibold tabular-nums"
              aria-label={label}
              {...field}
              value={(field.value as number | undefined) ?? ''}
            />
          </FormControl>
          <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        </FormItem>
      )}
    />
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="font-headline text-xl">Dodaj bieg ręcznie</SheetTitle>
          <SheetDescription>Dla biegów z zegarka lub bieżni, bez nagrywania trasy.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dystans</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="5,00"
                        className="h-14 rounded-xl pr-12 font-display text-2xl font-extrabold tabular-nums"
                        {...field}
                        value={(field.value as number | undefined) ?? ''}
                      />
                    </FormControl>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      km
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Czas</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {timeField('hours', 'godz', '0')}
                {timeField('minutes', 'min', '25')}
                {timeField('seconds', 'sek', '0')}
              </div>
              {(form.formState.errors.minutes || form.formState.errors.seconds) && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.minutes?.message ?? form.formState.errors.seconds?.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">Średnie tempo</span>
              <span className="font-headline text-lg font-bold tabular-nums">{formatPace(previewPace)}</span>
            </div>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kiedy</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" max={nowLocal()} className="h-12 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Jak się czułeś/aś? Jaka była pogoda?" className="rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Zapisz bieg
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
