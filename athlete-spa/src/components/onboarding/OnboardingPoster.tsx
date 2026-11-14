import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import gymPhoto from '@/assets/auth-gym.jpg';
import logoMark from '@/assets/logo-mark.png';
import type { OnboardingState } from '@/hooks/useOnboarding';
import { pluralForm } from '@/lib/plural';
import { cn } from '@/lib/utils';
import { EASE, RevealText } from './motion';
import { ageFromIso } from './steps/BirthDateStep';
import { Ticker } from './steps/WelcomeStep';

const genderLabels = { male: 'Mężczyzna', female: 'Kobieta', other: 'Inna' } as const;
const levelLabels = { beginner: 'Początkujący', intermediate: 'Średniozaaw.', advanced: 'Zaawansowany' } as const;

/**
 * Left pane on tablets and the unfolded Fold: the gym poster stays put while
 * the questions change next to it, and the list fills in with the answers.
 */
export function OnboardingPoster({ data, step }: { data: OnboardingState; step: number }) {
  const age = ageFromIso(data.dateOfBirth);
  const rows = [
    { label: 'Imię', value: data.name.trim() },
    { label: 'Płeć', value: data.gender ? genderLabels[data.gender] : '' },
    { label: 'Wiek', value: age !== null ? `${age} ${pluralForm(age, 'rok', 'lata', 'lat')}` : '' },
    { label: 'Wzrost', value: data.height ? `${data.height} cm` : '' },
    { label: 'Waga', value: data.weight ? `${data.weight.toLocaleString('pl-PL')} kg` : '' },
    { label: 'Poziom', value: data.trainingLevel ? levelLabels[data.trainingLevel] : '' },
  ];

  return (
    <motion.aside
      className="relative flex h-full min-h-0 flex-col overflow-hidden text-white"
      initial="enter"
      animate="center"
      variants={{ enter: {}, center: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}
    >
      <div aria-hidden className="absolute inset-0">
        <img src={gymPhoto} alt="" className="onb-kenburns h-full w-full object-cover" decoding="async" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
      </div>

      <div className="relative flex items-center gap-2.5 px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <img src={logoMark} alt="" className="h-8 w-auto" />
        <span className="font-display text-lg font-bold uppercase tracking-wide">#leniwakluska</span>
      </div>

      <div className="relative mt-auto px-6">
        <h2 className="font-display text-[3.5rem] font-bold uppercase leading-[0.86]">
          <RevealText text="Ustawmy" />
          <RevealText text="Twój profil" delay={0.08} className="text-primary" />
        </h2>
      </div>

      <motion.div
        className="relative mt-5"
        variants={{ enter: { opacity: 0, x: -60 }, center: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
      >
        <Ticker />
      </motion.div>

      <ol className="relative space-y-1 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7">
        {rows.map((row, i) => {
          const index = i + 1;
          const done = step > index;
          const active = step === index;
          return (
            <motion.li
              key={row.label}
              variants={{ enter: { opacity: 0, x: -16 }, center: { opacity: 1, x: 0 } }}
              className="flex h-9 items-center gap-3"
            >
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors duration-300',
                  done ? 'bg-lime text-lime-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-white/15 text-white/70',
                )}
              >
                {done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </motion.span>
                ) : (
                  index
                )}
              </span>
              <span className={cn('text-sm font-semibold transition-colors duration-300', done || active ? 'text-white' : 'text-white/55')}>
                {row.label}
              </span>
              {done && row.value && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-auto min-w-0 truncate text-sm text-white/75"
                >
                  {row.value}
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </ol>
    </motion.aside>
  );
}
