import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter on the keyboard moves on, like the main button. */
  onSubmit: () => void;
}

export function NameStep({ value, onChange, onSubmit }: NameStepProps) {
  const tooShort = value.trim().length > 0 && value.trim().length < 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Label htmlFor="onboarding-name" className="sr-only">
        Imię
      </Label>
      <Input
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
        className="h-16 rounded-2xl bg-card px-5 text-2xl font-semibold"
        autoFocus
      />
      <p className={tooShort ? 'mt-2 text-sm font-medium text-destructive' : 'mt-2 text-sm text-muted-foreground'}>
        {tooShort ? 'Imię musi mieć co najmniej 2 znaki' : 'Wystarczy samo imię albo ksywka.'}
      </p>
    </form>
  );
}
