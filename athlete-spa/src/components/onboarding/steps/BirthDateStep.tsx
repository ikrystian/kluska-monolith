import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, ChevronDown, HeartPulse } from 'lucide-react';
import { pluralForm } from '@/lib/plural';
import { cn } from '@/lib/utils';
import { Rise, RollingNumber } from '../motion';

interface BirthDateStepProps {
  value: string;
  onChange: (value: string) => void;
}

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" → parts, read as a calendar date (no timezone shift). */
function splitIso(value: string) {
  const [y, m, d] = value.split('-');
  return { year: y ? String(Number(y)) : '', month: m ? String(Number(m)) : '', day: d ? String(Number(d)) : '' };
}

export function ageFromIso(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

function DateSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="eyebrow mb-1.5 block pl-1">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'h-16 w-full appearance-none rounded-2xl bg-card/85 pl-3 pr-6 text-base font-semibold outline-none ring-1 transition-shadow focus:ring-2 focus:ring-primary',
            value ? 'ring-primary/50' : 'text-muted-foreground ring-border',
          )}
        >
          <option value="">–</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

export function BirthDateStep({ value, onChange }: BirthDateStepProps) {
  const initial = splitIso(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const age = useMemo(() => ageFromIso(value), [value]);
  const currentYear = new Date().getFullYear();

  const update = (d: string, m: string, y: string) => {
    setDay(d);
    setMonth(m);
    setYear(y);
    const dn = Number(d);
    const mn = Number(m);
    const yn = Number(y);
    const date = new Date(yn, mn - 1, dn);
    const valid = dn && mn && yn && date.getDate() === dn && date.getMonth() === mn - 1;
    // Build the string by hand — toISOString() would shift to the previous day east of UTC.
    onChange(valid ? `${yn}-${pad(mn)}-${pad(dn)}` : '');
  };

  const outOfRange = age !== null && (age < 13 || age > 100);
  const impossibleDate = Boolean(day && month && year && !value);

  return (
    <div>
      <Rise className="flex gap-2">
        <DateSelect
          label="Dzień"
          value={day}
          onChange={(v) => update(v, month, year)}
          options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
          className="w-16 shrink-0"
        />
        <DateSelect
          label="Miesiąc"
          value={month}
          onChange={(v) => update(day, v, year)}
          options={MONTHS.map((label, i) => ({ value: String(i + 1), label }))}
          className="min-w-0 flex-1"
        />
        <DateSelect
          label="Rok"
          value={year}
          onChange={(v) => update(day, month, v)}
          options={Array.from({ length: 88 }, (_, i) => {
            const y = String(currentYear - 13 - i);
            return { value: y, label: y };
          })}
          className="w-[5.25rem] shrink-0"
        />
      </Rise>

      <Rise className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          {age !== null && !outOfRange ? (
            <motion.div
              key="age"
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 24 }}
              className="onb-card relative overflow-hidden rounded-3xl px-5 py-6"
            >
              <span aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
              <div className="relative flex items-end gap-2">
                <RollingNumber value={String(age)} className="num text-[5.5rem] leading-[0.82] text-primary" />
                <span className="pb-1 text-xl font-semibold text-muted-foreground">{pluralForm(age, 'rok', 'lata', 'lat')}</span>
              </div>
              <div className="relative mt-5 flex items-center gap-3 border-t border-border pt-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                  <HeartPulse className="h-5 w-5" />
                </span>
                <p className="text-sm leading-snug text-muted-foreground">
                  Szacowane tętno maksymalne:{' '}
                  <span className="font-semibold text-foreground">ok. {220 - age} ud./min</span>. Od niego liczymy strefy.
                </p>
              </div>
            </motion.div>
          ) : outOfRange || impossibleDate ? (
            <motion.p
              key="err"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: [-8, 6, -4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="text-sm font-medium text-destructive"
            >
              {impossibleDate ? 'Taka data nie istnieje — sprawdź dzień.' : 'Wiek musi być między 13 a 100 lat.'}
            </motion.p>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-6 text-sm text-muted-foreground"
            >
              <Cake className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              Wybierz dzień, miesiąc i rok — wiek policzymy sami.
            </motion.div>
          )}
        </AnimatePresence>
      </Rise>
    </div>
  );
}
