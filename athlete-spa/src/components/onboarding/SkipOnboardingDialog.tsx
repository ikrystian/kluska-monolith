import { AlertTriangle, Bot, Dumbbell, Flame } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { plural } from '@/lib/plural';

interface SkipOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmSkip: () => void;
  remainingSteps: number;
}

const losses = [
  { icon: Flame, text: 'Nie policzymy Twojego zapotrzebowania kalorycznego ani makro' },
  { icon: Dumbbell, text: 'Plany i obciążenia nie będą dopasowane do Twojego poziomu' },
  { icon: Bot, text: 'Trener AI i statystyki (BMI, siła względna) będą niedokładne' },
];

/** Speed bump before skipping: explains what the athlete loses, but lets them go. */
export function SkipOnboardingDialog({ open, onOpenChange, onConfirmSkip, remainingSteps }: SkipOnboardingDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-5">
        <AlertDialogHeader className="space-y-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-food/15 text-food">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <AlertDialogTitle className="font-display text-[2rem] font-bold uppercase leading-[0.95]">
            Na pewno pominąć?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[15px] leading-relaxed">
            Te dane są dość potrzebne — bez nich aplikacja działa trochę na ślepo:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="space-y-2.5">
          {losses.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-xl bg-secondary/60 p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-sm leading-snug">{text}</span>
            </li>
          ))}
        </ul>

        {remainingSteps > 0 && (
          <p className="text-sm font-medium">
            Zostało tylko {plural(remainingSteps, 'pytanie', 'pytania', 'pytań')} — to mniej niż minuta.
          </p>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogCancel className="m-0 h-12 w-full rounded-2xl border-0 bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">
            Dokończę teraz
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmSkip}
            className="m-0 h-12 w-full rounded-2xl bg-transparent text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            Pomiń mimo to
          </AlertDialogAction>
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Profil uzupełnisz później z ekranu głównego.
          </p>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
