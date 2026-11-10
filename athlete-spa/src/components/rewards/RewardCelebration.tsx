import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { haptic } from '@/lib/haptics';
import { pluralForm } from '@/lib/plural';
import type { AchievementUnlock } from '@/hooks/useRewards';
import { rarityOf, rewardIcon, tint } from './reward-meta';

export interface Celebration {
  title: string;
  description?: string;
  /** Punkty zdobyte poza osiągnięciami (np. za zamknięty cel). */
  points?: number;
  levelUp?: number | null;
  unlocked: AchievementUnlock[];
}

/** Arkusz z tym, co właśnie wpadło: osiągnięcia, punkty, nowy poziom. */
export function RewardCelebration({ celebration, onClose }: { celebration: Celebration | null; onClose: () => void }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (celebration) haptic('celebrate');
  }, [celebration]);

  const unlocked = celebration?.unlocked ?? [];
  const totalXp = (celebration?.points ?? 0) + unlocked.reduce((sum, item) => sum + item.pointsAwarded, 0);
  const shown = unlocked.slice(0, 6);
  const hidden = unlocked.length - shown.length;

  return (
    <Sheet open={celebration !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom">
        {celebration && (
          <>
            <SheetHeader className="items-center pr-0 text-center">
              <motion.span
                initial={reduceMotion ? false : { scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 14 }}
                className="mb-2 grid h-16 w-16 place-items-center rounded-3xl bg-volt font-display text-2xl font-bold text-volt-foreground"
              >
                {celebration.levelUp ? celebration.levelUp : `+${totalXp}`}
              </motion.span>
              <SheetTitle>{celebration.title}</SheetTitle>
              <SheetDescription>
                {celebration.levelUp
                  ? `Wskakujesz na poziom ${celebration.levelUp}.${totalXp > 0 ? ` Razem +${totalXp} XP.` : ''}`
                  : (celebration.description ?? `Razem +${totalXp} XP.`)}
              </SheetDescription>
            </SheetHeader>

            {shown.length > 0 && (
              <ul className="mt-5 space-y-2">
                {shown.map((item, index) => {
                  const Icon = rewardIcon(item.icon);
                  const rarity = rarityOf(item.rarity);
                  return (
                    <motion.li
                      key={item.achievementId}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={reduceMotion ? { duration: 0 } : { delay: 0.12 + index * 0.06 }}
                      className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3"
                    >
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                        style={{ background: tint(rarity.color, 18), color: rarity.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-volt">+{item.pointsAwarded} XP</span>
                    </motion.li>
                  );
                })}
              </ul>
            )}
            {hidden > 0 && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                …i jeszcze {hidden} {pluralForm(hidden, 'osiągnięcie', 'osiągnięcia', 'osiągnięć')}. Wszystkie znajdziesz niżej.
              </p>
            )}

            <Button className="mt-5 w-full" onClick={onClose}>
              Super
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
