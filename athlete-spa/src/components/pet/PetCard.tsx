import { Link } from 'react-router-dom';
import { ChevronRight, Gift } from 'lucide-react';
import { SectionHeader } from '@/components/ui/section';
import { usePet } from '@/hooks/usePet';
import { PetAvatar } from './PetAvatar';
import { MOOD_LABEL, petLine, THOUGHT_ICON } from './pet-meta';

/** Zwierzak na ekranie „Dziś”: nastrój, dymek z myślą i wejście do pokoju. */
export function PetCard() {
  const { state, pet, isLoading } = usePet();
  if (isLoading || !state) return null;

  if (!pet) {
    return (
      <section>
        <SectionHeader title="Zwierzak" />
        <Link to="/athlete/pet" className="row-tap flex items-center gap-3 rounded-2xl bg-card p-3 pr-4">
          <PetAvatar species="hamster" stage="baby" mood="happy" size={72} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Adoptuj towarzysza treningów</span>
            <span className="block text-sm text-muted-foreground">Karmisz go FitCoinami z treningów, a on rośnie razem z Tobą.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </section>
    );
  }

  const ThoughtIcon = pet.thought ? THOUGHT_ICON[pet.thought] : null;

  return (
    <section>
      <SectionHeader title="Zwierzak" href="/athlete/pet" linkLabel="Pokój" />
      <Link to="/athlete/pet" className="row-tap flex items-center gap-3 rounded-2xl bg-card p-3 pr-4">
        <span className="relative shrink-0">
          <PetAvatar species={pet.species} stage={pet.progress.stage} build={pet.progress.build} mood={pet.mood} equipped={pet.equipped} shiny={pet.shiny} size={84} />
          {ThoughtIcon && (
            <span className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border">
              <ThoughtIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[15px] font-semibold">{pet.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{MOOD_LABEL[pet.mood]}</span>
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">„{petLine(pet)}”</span>
          {state.chests.length > 0 && (
            <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-food">
              <Gift className="h-3.5 w-3.5" /> Skrzynia czeka na otwarcie
            </span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </section>
  );
}
