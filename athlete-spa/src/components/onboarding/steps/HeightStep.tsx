import { NumberDial } from '../NumberDial';

interface HeightStepProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function HeightStep({ value, onChange }: HeightStepProps) {
  return (
    <div>
      <NumberDial value={value ?? 175} onChange={onChange} min={100} max={250} step={1} unit="cm" label="wzrost" />
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Przytrzymaj − lub +, żeby zmieniać szybciej.
      </p>
    </div>
  );
}
