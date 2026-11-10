import { motion } from 'framer-motion';
import { Bot, Clock, Dumbbell, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import gymPhoto from '@/assets/auth-gym.jpg';

interface WelcomeStepProps {
  name?: string;
  onNext: () => void;
  onSkip: () => void;
  totalQuestions: number;
}

const benefits = [
  { icon: Dumbbell, title: 'Plany na Twoją miarę', text: 'Objętość i obciążenia dobrane do poziomu', tint: 'bg-primary/15 text-primary' },
  { icon: Flame, title: 'Kalorie bez liczenia', text: 'Zapotrzebowanie i makro wyliczone za Ciebie', tint: 'bg-food/15 text-food' },
  { icon: Bot, title: 'Trener AI, który Cię zna', text: 'Wskazówki pasujące do Twojego ciała', tint: 'bg-run/15 text-run' },
];

export function WelcomeStep({ name, onNext, onSkip, totalQuestions }: WelcomeStepProps) {
  const firstName = name?.trim().split(/\s+/)[0];

  return (
    <div className="relative flex min-h-[100svh] flex-col bg-background">
      {/* Poster header — same gym photo as the login screen, so it feels like one flow. */}
      <div className="relative px-4 pb-8 pt-[calc(5rem+env(safe-area-inset-top))]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <img src={gymPhoto} alt="" className="h-full w-full object-cover" decoding="async" />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="app-column relative"
        >
          <p className="text-xl font-semibold text-primary">
            {firstName ? `Cześć, ${firstName}!` : 'Cześć!'}
          </p>
          <h1 className="mt-1 font-display text-[3.75rem] font-bold uppercase leading-[0.9] text-white">
            Ustawmy
            <br />
            Twój profil
          </h1>
        </motion.div>
      </div>

      <div className="app-column flex flex-1 flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Kilka szybkich pytań i #leniwakluska zacznie pracować pod Ciebie, a nie pod przeciętnego użytkownika.
        </p>

        <ul className="stagger-rise mt-6 space-y-2.5">
          {benefits.map(({ icon: Icon, title, text, tint }) => (
            <li key={title} className="flex items-center gap-3.5 rounded-2xl bg-card p-3.5">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight">{title}</span>
                <span className="block text-xs text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-8">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {totalQuestions} krótkich pytań · około minuty
          </p>
          <Button onClick={onNext} size="lg" className="h-14 w-full rounded-2xl text-base">
            Zaczynamy
          </Button>
          <button
            type="button"
            onClick={onSkip}
            className="mt-2 h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground transition-colors active:bg-secondary"
          >
            Pomiń na razie
          </button>
        </div>
      </div>
    </div>
  );
}
