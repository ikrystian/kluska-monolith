import { Pencil } from 'lucide-react';
import type { OnboardingState } from '@/hooks/useOnboarding';
import { pluralForm } from '@/lib/plural';
import { cn } from '@/lib/utils';
import { ageFromIso } from './BirthDateStep';

interface SummaryStepProps {
  data: OnboardingState;
  onEdit: (step: number) => void;
}

const genderLabels = { male: 'Mężczyzna', female: 'Kobieta', other: 'Inna' } as const;
const levelLabels = { beginner: 'Początkujący', intermediate: 'Średniozaawansowany', advanced: 'Zaawansowany' } as const;

function Tile({
  label,
  value,
  unit,
  onEdit,
  className,
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  onEdit: () => void;
  className?: string;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${label}: ${value}${unit ? ` ${unit}` : ''}. Zmień`}
      className={cn('row-tap relative rounded-2xl bg-card p-4 text-left', className)}
    >
      <span className="eyebrow block">{label}</span>
      <span className="mt-1.5 flex items-end gap-1">
        <span className={cn(big ? 'num text-[2.5rem]' : 'text-[17px] font-semibold leading-tight')}>{value}</span>
        {unit && <span className="pb-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
      </span>
      <Pencil className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
    </button>
  );
}

export function SummaryStep({ data, onEdit }: SummaryStepProps) {
  const age = ageFromIso(data.dateOfBirth);

  return (
    <div className="stagger-rise grid grid-cols-2 gap-2.5">
      <Tile label="Imię" value={data.name || '–'} onEdit={() => onEdit(1)} className="col-span-2" />
      <Tile label="Płeć" value={data.gender ? genderLabels[data.gender] : '–'} onEdit={() => onEdit(2)} />
      <Tile
        label="Wiek"
        value={age !== null ? String(age) : '–'}
        unit={age !== null ? pluralForm(age, 'rok', 'lata', 'lat') : undefined}
        onEdit={() => onEdit(3)}
        big
      />
      <Tile label="Wzrost" value={data.height ? String(data.height) : '–'} unit="cm" onEdit={() => onEdit(4)} big />
      <Tile
        label="Waga"
        value={data.weight ? data.weight.toLocaleString('pl-PL', { maximumFractionDigits: 1 }) : '–'}
        unit="kg"
        onEdit={() => onEdit(5)}
        big
      />
      <Tile
        label="Poziom"
        value={data.trainingLevel ? levelLabels[data.trainingLevel] : '–'}
        onEdit={() => onEdit(6)}
        className="col-span-2"
      />
    </div>
  );
}
