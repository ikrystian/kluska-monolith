import { MoveHorizontal } from 'lucide-react';
import { NumberDial } from '../NumberDial';
import { Rise } from '../motion';

interface HeightStepProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function HeightStep({ value, onChange }: HeightStepProps) {
  return (
    <div>
      <Rise>
        <NumberDial value={value ?? 175} onChange={onChange} min={100} max={250} step={1} unit="cm" label="wzrost" />
      </Rise>
      <Rise className="mt-3 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <MoveHorizontal className="h-4 w-4 shrink-0" aria-hidden />
        Przesuń miarkę albo przytrzymaj − i +.
      </Rise>
    </div>
  );
}
