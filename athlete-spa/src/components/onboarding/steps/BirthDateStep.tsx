import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { pluralForm } from '@/lib/plural';
import { cn } from '@/lib/utils';

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
            'h-14 w-full appearance-none rounded-2xl bg-card pl-4 pr-8 text-lg font-semibold ring-1 ring-border transition-shadow focus:ring-2 focus:ring-primary',
            !value && 'text-muted-foreground',
          )}
        >
          <option value="">–</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
      <div className="flex gap-2.5">
        <DateSelect
          label="Dzień"
          value={day}
          onChange={(v) => update(v, month, year)}
          options={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
          className="w-[5.5rem] shrink-0"
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
          className="w-[6.5rem] shrink-0"
        />
      </div>

      <AnimatePresence mode="wait">
        {age !== null && !outOfRange ? (
          <motion.div
            key="age"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex items-end justify-center gap-2 rounded-2xl bg-card py-6"
          >
            <span className="num text-[4.5rem] text-primary">{age}</span>
            <span className="pb-2.5 text-lg font-semibold text-muted-foreground">{pluralForm(age, 'rok', 'lata', 'lat')}</span>
          </motion.div>
        ) : (
          (outOfRange || impossibleDate) && (
            <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm font-medium text-destructive">
              {impossibleDate ? 'Taka data nie istnieje — sprawdź dzień.' : 'Wiek musi być między 13 a 100 lat.'}
            </motion.p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
