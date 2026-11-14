import { motion, useReducedMotion } from 'framer-motion';
import { Activity, ChevronRight, HeartPulse } from 'lucide-react';
import type { OnboardingState } from '@/hooks/useOnboarding';
import { pluralForm } from '@/lib/plural';
import { cn } from '@/lib/utils';
import { CountUp, EASE, RevealText, Rise } from '../motion';
import { ageFromIso } from './BirthDateStep';
import { LevelBars } from './TrainingLevelStep';

interface SummaryStepProps {
  data: OnboardingState;
  onEdit: (step: number) => void;
}

const genderLabels = { male: 'Mężczyzna', female: 'Kobieta', other: 'Inna' } as const;
const levelLabels = { beginner: 'Początkujący', intermediate: 'Średniozaawansowany', advanced: 'Zaawansowany' } as const;
const levelBars = { beginner: 1, intermediate: 2, advanced: 3 } as const;

/** Sparks flying out of the badge — the one loud moment of the whole flow. */
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const radius = 58 + (i % 3) * 22;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rotate: (i % 2 ? 1 : -1) * (120 + i * 20),
    lime: i % 3 !== 0,
    delay: 0.32 + (i % 4) * 0.025,
  };
});

function DoneBadge() {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-[4.5rem] w-[4.5rem]">
      {!reduce &&
        SPARKS.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden
            className={cn('absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-[2px]', s.lime ? 'bg-lime' : 'bg-primary')}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: s.x, y: s.y, scale: [0, 1.2, 0.5], opacity: [0, 1, 0], rotate: s.rotate }}
            transition={{ duration: 0.95, delay: s.delay, ease: EASE }}
          />
        ))}
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-lime"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 2.1, opacity: [0, 0.7, 0] }}
          transition={{ duration: 1, delay: 0.3, ease: EASE }}
        />
      )}
      <motion.div
        className="relative grid h-full w-full place-items-center rounded-full bg-lime text-lime-foreground shadow-[0_14px_40px_-10px_hsl(var(--lime)/0.75)]"
        initial={{ scale: 0, rotate: -60 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
      >
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.38, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

function Stat({
  label,
  value,
  decimals,
  unit,
  delay,
  onEdit,
}: {
  label: string;
  value: number | null;
  decimals?: number;
  unit: string;
  delay: number;
  onEdit: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onEdit}
      whileTap={{ scale: 0.95 }}
      aria-label={`${label}: ${value ?? '–'} ${unit}. Zmień`}
      className="onb-card min-w-0 rounded-2xl px-3 py-3.5 text-left"
    >
      <span className="eyebrow block">{label}</span>
      <span className="num mt-1.5 block text-[2.125rem]">
        {value !== null ? <CountUp value={value} decimals={decimals} delay={delay} /> : '–'}
      </span>
      <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">{unit}</span>
    </motion.button>
  );
}

function Row({ label, value, onEdit, children }: { label: string; value: string; onEdit: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${label}: ${value}. Zmień`}
      className="row-tap flex w-full items-center gap-3 px-4 py-3.5 text-left"
    >
      <span className="eyebrow w-14 shrink-0">{label}</span>
      <span className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-tight">{value}</span>
      {children}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
    </button>
  );
}

export function SummaryStep({ data, onEdit }: SummaryStepProps) {
  const age = ageFromIso(data.dateOfBirth);
  const firstName = data.name.trim().split(/\s+/)[0];
  const bmi = data.height && data.weight ? data.weight / (data.height / 100) ** 2 : null;

  return (
    <div>
      <div className="mb-6">
        <DoneBadge />
        <Rise className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-volt">
          <span className="h-px w-5 bg-volt" aria-hidden />
          Profil gotowy
        </Rise>
        <h1 className="mt-2.5 font-display text-[3.25rem] font-bold uppercase leading-[0.9]">
          <RevealText text={firstName ? `Gotowe, ${firstName}!` : 'Gotowe!'} delay={0.15} />
        </h1>
        <Rise className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Rzuć okiem, czy wszystko się zgadza. Dotknij pola, żeby coś poprawić.
        </Rise>
      </div>

      <Rise className="grid grid-cols-3 gap-2.5">
        <Stat label="Wiek" value={age} unit={age !== null ? pluralForm(age, 'rok', 'lata', 'lat') : 'lat'} delay={0.35} onEdit={() => onEdit(3)} />
        <Stat label="Wzrost" value={data.height} unit="cm" delay={0.43} onEdit={() => onEdit(4)} />
        <Stat label="Waga" value={data.weight} decimals={data.weight && data.weight % 1 ? 1 : 0} unit="kg" delay={0.51} onEdit={() => onEdit(5)} />
      </Rise>

      <Rise className="onb-card @container mt-2.5 divide-y divide-border overflow-hidden rounded-2xl">
        <Row label="Imię" value={data.name || '–'} onEdit={() => onEdit(1)} />
        <Row label="Płeć" value={data.gender ? genderLabels[data.gender] : '–'} onEdit={() => onEdit(2)} />
        <Row label="Poziom" value={data.trainingLevel ? levelLabels[data.trainingLevel] : '–'} onEdit={() => onEdit(6)}>
          {data.trainingLevel && <LevelBars count={levelBars[data.trainingLevel]} active className="h-5 shrink-0 @max-xs:hidden" />}
        </Row>
      </Rise>

      {bmi !== null && age !== null && (
        <Rise className="mt-2.5 rounded-2xl bg-lime/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-volt">Już coś o Tobie wiemy</p>
          <div className="mt-2.5 flex gap-5">
            <span className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-volt" aria-hidden />
              <span className="text-muted-foreground">BMI</span>
              <span className="font-semibold">{bmi.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            </span>
            <span className="flex items-center gap-2 text-sm">
              <HeartPulse className="h-4 w-4 text-volt" aria-hidden />
              <span className="text-muted-foreground">Tętno maks.</span>
              <span className="font-semibold">ok. {220 - age}</span>
            </span>
          </div>
        </Rise>
      )}
    </div>
  );
}
