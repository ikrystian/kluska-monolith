import { motion } from 'framer-motion';
import { ArrowRight, Bot, Clock, Dumbbell, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import gymPhoto from '@/assets/auth-gym.jpg';
import { EASE, RevealText, SPRING } from '../motion';

interface WelcomeStepProps {
  name?: string;
  onNext: () => void;
  onSkip: () => void;
  totalQuestions: number;
  /** Tablet: the photo and the headline live on the poster pane next door. */
  compact?: boolean;
}

const benefits = [
  { icon: Dumbbell, title: 'Plany na Twoją miarę', text: 'Objętość i obciążenia dobrane do poziomu', tint: 'bg-primary/15 text-primary' },
  { icon: Flame, title: 'Kalorie bez liczenia', text: 'Zapotrzebowanie i makro wyliczone za Ciebie', tint: 'bg-food/15 text-food' },
  { icon: Bot, title: 'Trener AI, który Cię zna', text: 'Wskazówki pasujące do Twojego ciała', tint: 'bg-run/15 text-run' },
];

const TICKER = ['Siła', 'Regularność', 'Progres', '#leniwakluska', 'Bez wymówek', 'Krok po kroku'];

/** Slanted lime tape with the app's mottos, looping forever. */
export function Ticker({ className }: { className?: string }) {
  return (
    <div className={`onb-ticker ${className ?? ''}`} aria-hidden>
      <div className="onb-ticker__track">
        {[0, 1, 2, 3].map((copy) => (
          <span key={copy}>
            {TICKER.map((word) => (
              <span key={word} className="flex items-center gap-3.5">
                {word}
                <span className="h-1.5 w-1.5 rotate-45 bg-current" />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

const fadeUp = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0, transition: SPRING },
};

export function WelcomeStep({ name, onNext, onSkip, totalQuestions, compact }: WelcomeStepProps) {
  const firstName = name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Cześć, ${firstName}!` : 'Cześć!';

  return (
    <motion.div
      className="flex h-full min-h-0 flex-col"
      initial="enter"
      animate="center"
      variants={{ enter: {}, center: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
    >
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {compact ? (
          <div className="app-column px-5 pt-[calc(3.5rem+env(safe-area-inset-top))]">
            <motion.p variants={fadeUp} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="h-px w-5 bg-primary" aria-hidden />
              Zanim zaczniemy
            </motion.p>
            <h1 className="mt-2.5 font-display text-[3.5rem] font-bold uppercase leading-[0.9]">
              <RevealText text={greeting} />
            </h1>
          </div>
        ) : (
          // Poster header — same gym photo as the login screen, so it feels like one flow.
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <img src={gymPhoto} alt="" className="onb-kenburns h-full w-full object-cover" decoding="async" />
              <div className="absolute inset-0 bg-black/55" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </div>
            <div className="app-column relative px-5 pb-12 pt-[calc(5.5rem+env(safe-area-inset-top))]">
              <motion.p variants={fadeUp} className="font-display text-2xl font-semibold uppercase tracking-wide text-lime">
                {greeting}
              </motion.p>
              <h1 className="mt-1 font-display text-[clamp(3.25rem,17vw,4.25rem)] font-bold uppercase leading-[0.86] text-white">
                <RevealText text="Ustawmy" />
                <RevealText text="Twój profil" delay={0.08} />
              </h1>
            </div>
            <motion.div
              className="relative -mt-5"
              variants={{ enter: { opacity: 0, x: -60 }, center: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } } }}
            >
              <Ticker />
            </motion.div>
          </div>
        )}

        <div className="app-column px-5 pb-4 pt-6">
          <motion.p variants={fadeUp} className="text-[15px] leading-relaxed text-muted-foreground">
            Kilka szybkich pytań i #leniwakluska zacznie pracować pod Ciebie, a nie pod przeciętnego użytkownika.
          </motion.p>

          <ul className="mt-5 space-y-2.5">
            {benefits.map(({ icon: Icon, title, text, tint }) => (
              <motion.li key={title} variants={fadeUp} className="onb-card flex items-center gap-3.5 rounded-2xl p-3.5">
                <motion.span
                  variants={{ enter: { scale: 0.4, rotate: -20 }, center: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 380, damping: 16 } } }}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}
                >
                  <Icon className="h-5 w-5" />
                </motion.span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold leading-tight">{title}</span>
                  <span className="block text-xs text-muted-foreground">{text}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      <motion.div variants={fadeUp} className="app-column shrink-0 px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {totalQuestions} krótkich pytań · około minuty
        </p>
        <Button onClick={onNext} size="lg" className="onb-cta h-14 w-full rounded-2xl text-base">
          Zaczynamy
          <ArrowRight className="onb-cta__arrow" />
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="mt-1.5 h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground transition-colors active:bg-secondary"
        >
          Pomiń na razie
        </button>
      </motion.div>
    </motion.div>
  );
}
