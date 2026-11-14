import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Rise, Swap } from '../motion';

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter on the keyboard moves on, like the main button. */
  onSubmit: () => void;
}

export function NameStep({ value, onChange, onSubmit }: NameStepProps) {
  const trimmed = value.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < 2;
  const valid = trimmed.length >= 2;
  const firstName = trimmed.split(/\s+/)[0];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Rise>
        <Label htmlFor="onboarding-name" className="sr-only">
          Imię
        </Label>
        <div className="relative">
          <input
            id="onboarding-name"
            type="text"
            inputMode="text"
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Twoje imię"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={tooShort}
            className="peer h-[4.5rem] w-full bg-transparent pr-2 font-display text-[2.75rem] font-bold uppercase leading-none tracking-wide outline-none placeholder:text-foreground/20"
            autoFocus
          />
          {/* Underline: grey track, ember while typing, lime once the name is fine. */}
          <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-foreground/15" aria-hidden />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 rounded-full bg-primary transition-transform duration-500 ease-out peer-focus:scale-x-100"
          />
          <motion.span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[3px] origin-left rounded-full bg-lime"
            initial={false}
            animate={{ scaleX: valid ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          />
        </div>
      </Rise>

      <Rise className="mt-3 min-h-[1.5rem] text-sm">
        <Swap id={tooShort ? 'short' : valid ? 'ok' : 'hint'}>
          {tooShort ? (
            <p className="font-medium text-destructive">Imię musi mieć co najmniej 2 znaki</p>
          ) : valid ? (
            <p className="font-medium text-volt">Miło Cię poznać, {firstName}!</p>
          ) : (
            <p className="text-muted-foreground">Wystarczy samo imię albo ksywka.</p>
          )}
        </Swap>
      </Rise>
    </form>
  );
}
