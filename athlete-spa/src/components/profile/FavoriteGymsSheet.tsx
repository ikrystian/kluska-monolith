import { useMemo, useState } from 'react';
import { Check, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCollection, useUser, useUpdateDoc } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Gym, UserProfile } from '@/lib/types';

interface FavoriteGymsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile;
  onSaved: () => void;
}

/** Gym picker; the gyms list is only fetched while the sheet is mounted. */
export function FavoriteGymsSheet({ open, onOpenChange, userProfile, onSaved }: FavoriteGymsSheetProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const { data: gyms, isLoading } = useCollection<Gym>('gyms');
  const [selected, setSelected] = useState<string[]>(() => userProfile.favoriteGymIds ?? []);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pl');
    const list = gyms ?? [];
    if (!term) return list;
    return list.filter(g => [g.name, g.address].some(v => v?.toLocaleLowerCase('pl').includes(term)));
  }, [gyms, search]);

  const initial = userProfile.favoriteGymIds ?? [];
  const isDirty = selected.length !== initial.length || selected.some(id => !initial.includes(id));

  const toggle = (id: string) =>
    setSelected(prev => (prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]));

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc('users', user.uid, { ...userProfile, favoriteGymIds: selected });
      toast({ title: 'Zapisano ulubione siłownie' });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: 'Błąd!', description: 'Nie udało się zapisać siłowni.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[2rem] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-headline text-xl">Ulubione siłownie</SheetTitle>
          <SheetDescription>Wybierz miejsca, w których trenujesz najczęściej.</SheetDescription>
        </SheetHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj siłowni"
            aria-label="Szukaj siłowni"
            className="h-11 rounded-full pl-10"
          />
        </div>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {isLoading && !gyms ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? 'Brak siłowni pasujących do wyszukiwania.' : 'Brak siłowni do wyboru.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map(gym => {
                const isSelected = selected.includes(gym.id);
                return (
                  <li key={gym.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggle(gym.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                        isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/60 hover:bg-secondary/50'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{gym.name}</p>
                        {gym.address && (
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {gym.address}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors',
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Button className="h-11 w-full rounded-full font-semibold" disabled={!isDirty || isSaving} onClick={handleSave}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Zapisz {selected.length > 0 && `(${selected.length})`}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
