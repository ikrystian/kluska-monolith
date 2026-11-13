import { Link } from 'react-router-dom';
import { ChevronRight, Gift } from 'lucide-react';
import type { PetWorkoutGain } from '@/models/types/pet';
import { PetAvatar } from './PetAvatar';

export interface PetCheerProps {
  pet: PetWorkoutGain | null;
  coins: number;
  multiplier?: number;
  weekStreak?: number;
  chest?: boolean;
  /** Co zasiliło konto: „12 400 kg” albo „8,2 km”. */
  effort?: string;
}

/**
 * Podsumowanie treningu oczami zwierzaka: skacze z radości i mówi, ile
 * FitCoins dla niego wpadło. Bez zwierzaka — zachęta do adopcji.
 */
export function PetCheer({ pet, coins, multiplier = 1, weekStreak = 0, chest, effort }: PetCheerProps) {
  if (coins <= 0 && !pet) return null;

  return (
    <Link to="/athlete/pet" className="row-tap flex items-center gap-3 rounded-2xl bg-primary/10 p-3 pr-4">
      <span className="grid h-[88px] w-[88px] shrink-0 place-items-end justify-center">
        <PetAvatar species={pet?.species ?? 'hamster'} stage={pet?.stageUp?.to ?? 'junior'} mood="energetic" action="cheer" size={88} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold leading-snug">
          {pet ? `${pet.name} się cieszy!` : 'Te monety czekają na pupila'}
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">+{coins} FitCoins</span>
          {effort ? ` za ${effort}` : ''}
          {multiplier > 1 ? ` · mnożnik ×${multiplier.toLocaleString('pl-PL')}` : ''}
        </span>
        {multiplier > 1 && weekStreak > 0 && (
          <span className="block text-xs text-muted-foreground">{weekStreak}. tydzień z rzędu z 3 treningami</span>
        )}
        {pet?.stageUp && <span className="mt-1 block text-xs font-semibold text-primary">Urósł — teraz to {pet.stageUp.toName}!</span>}
        {chest && (
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-food">
            <Gift className="h-3.5 w-3.5" /> Skrzynia za rekord do otwarcia
          </span>
        )}
        {!pet && <span className="mt-1 block text-xs font-semibold text-primary">Adoptuj zwierzaka</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
