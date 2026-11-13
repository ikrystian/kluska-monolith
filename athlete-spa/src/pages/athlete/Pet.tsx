import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Heart, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/section';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';
import { usePet } from '@/hooks/usePet';
import type { ChestLoot, PetItem, PetItemCategory, PetSlot, PetSpecies, PetState, PetView } from '@/models/types/pet';
import { PetAvatar, TOY_ACTION, type PetAction } from '@/components/pet/PetAvatar';
import { FurnitureThumb, PET_IN_ROOM, PetRoom, RoomThumb } from '@/components/pet/PetRoom';
import { CoinIcon, CoinStackArt, ItemArt } from '@/components/pet/ItemArt';
import { ChestArt, type ChestState } from '@/components/pet/ChestArt';
import { PetStats } from '@/components/pet/PetStats';
import { CATEGORY_META, itemEffect, MOOD_LABEL, petLine, SLOT_LABEL, STAGE_LABEL } from '@/components/pet/pet-meta';
import { tint } from '@/components/rewards/reward-meta';

const CATEGORIES: PetItemCategory[] = ['food', 'toy', 'clothes', 'decor'];
const SLOTS: PetSlot[] = ['head', 'eyes', 'back', 'wrists', 'feet'];
const coins = (value: number) => value.toLocaleString('pl-PL');

function Balance({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 py-1 pl-1.5 pr-3 text-sm font-semibold tabular-nums shadow-sm backdrop-blur-sm">
      <CoinIcon size={20} />
      {coins(value)}
    </span>
  );
}

/** Kafelek z ilustracją przedmiotu; tła i meble pokazują swój prawdziwy rysunek. */
function ItemIcon({ item, size = 48 }: { item: PetItem; size?: number }) {
  const color = CATEGORY_META[item.category].color;
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ width: size, height: size, background: tint(color, 14) }}>
      {item.decor === 'background' ? (
        <RoomThumb id={item.key} className="h-full w-full" />
      ) : item.decor === 'furniture' ? (
        <FurnitureThumb id={item.key} className="h-[78%] w-[78%]" />
      ) : (
        <ItemArt itemKey={item.key} size={size * 0.84} />
      )}
    </span>
  );
}

/* ---------- Adopcja ---------- */

function AdoptPanel({ state, onAdopt, first }: { state: PetState; onAdopt: (species: PetSpecies, name: string) => Promise<unknown>; first: boolean }) {
  const [species, setSpecies] = useState<PetSpecies>(state.adoptableSpecies[0]?.key ?? 'hamster');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = state.adoptableSpecies.find(entry => entry.key === species);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onAdopt(species, name.trim());
      haptic('celebrate');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nie udało się adoptować');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-xl font-bold">{first ? 'Wybierz towarzysza treningów' : 'Adoptuj kolejnego zwierzaka'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {first
            ? 'Za każdy trening i bieg dostajesz FitCoins. Karmisz nimi pupila, a on rośnie razem z Twoją formą.'
            : 'Twój Mistrz zostaje w drużynie. Nowy maluch zaczyna od zera.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gatunek">
        {state.adoptableSpecies.map(entry => (
          <button
            key={entry.key}
            type="button"
            role="radio"
            aria-checked={species === entry.key}
            onClick={() => {
              setSpecies(entry.key);
              haptic('tap');
            }}
            className={cn(
              'flex flex-col items-center rounded-2xl bg-card px-2 pb-3 pt-2 ring-2 ring-transparent transition-shadow',
              species === entry.key && 'ring-primary'
            )}
          >
            <PetAvatar species={entry.key} stage="baby" mood={species === entry.key ? 'energetic' : 'happy'} size={92} still={species !== entry.key} />
            <span className="text-sm font-semibold">{entry.name}</span>
          </button>
        ))}
      </div>

      {chosen && <p className="px-1 text-sm text-muted-foreground">{chosen.description}</p>}

      <div className="space-y-2">
        <label htmlFor="pet-name" className="px-1 text-sm font-semibold">
          Jak ma na imię?
        </label>
        <Input id="pet-name" value={name} maxLength={20} placeholder="np. Kluska" onChange={event => setName(event.target.value)} />
      </div>

      <Button className="w-full" disabled={busy || !name.trim()} onClick={submit}>
        Adoptuj
      </Button>
    </div>
  );
}

/* ---------- Skrzynia ---------- */

function ChestBanner({ count, onOpen, busy }: { count: number; onOpen: () => void; busy: boolean }) {
  return (
    <button type="button" onClick={onOpen} disabled={busy} className="row-tap flex w-full items-center gap-3 rounded-2xl bg-food/15 py-2 pl-2 pr-3 text-left">
      <span className="grid h-14 w-14 shrink-0 place-items-center">
        <ChestArt state={busy ? 'shake' : 'closed'} size={56} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Skrzynia za rekord{count > 1 ? ` (${count})` : ''}</span>
        <span className="block text-sm text-muted-foreground">Dotknij, żeby otworzyć</span>
      </span>
    </button>
  );
}

/** Otwarcie skrzyni: drży, wieko odskakuje, a łup wyskakuje ze światła. */
function LootReveal({ loot, onClose }: { loot: ChestLoot; onClose: () => void }) {
  const [phase, setPhase] = useState<ChestState>('shake');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const open = window.setTimeout(() => {
      setPhase('open');
      haptic('celebrate');
    }, 750);
    const reveal = window.setTimeout(() => setShown(true), 1150);
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(reveal);
    };
  }, []);

  // Portal: ekran siedzi w przewijanym, animowanym kontenerze, który zamknąłby `fixed` w sobie.
  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={shown ? onClose : undefined}
      role="dialog"
      aria-label="Zawartość skrzyni"
    >
      <div className="flex w-full max-w-xs flex-col items-center text-center" onClick={event => event.stopPropagation()}>
        <div className="relative mt-24 grid h-52 w-56 place-items-end justify-center">
          <ChestArt state={phase} size={200} />
          <AnimatePresence>
            {shown && (
              <motion.div
                className="absolute left-1/2 top-0"
                initial={{ opacity: 0, y: 60, x: '-50%', scale: 0.3 }}
                animate={{ opacity: 1, y: -92, x: '-50%', scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 13 }}
              >
                {loot.kind === 'coins' ? <CoinStackArt size={104} /> : <LootArt itemKey={loot.itemKey} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div className="mt-6 w-full" initial={false} animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 12 }} transition={{ delay: shown ? 0.25 : 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">W skrzyni było</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {loot.kind === 'coins' ? `${coins(loot.amount)} FitCoins` : `${loot.name}${loot.qty > 1 ? ` ×${loot.qty}` : ''}`}
          </p>
          <Button className="mt-5 w-full" onClick={onClose} disabled={!shown}>
            Super
          </Button>
        </motion.div>
      </div>
    </motion.div>,
    document.body
  );
}

function LootArt({ itemKey }: { itemKey: string }) {
  if (itemKey.startsWith('bg_')) return <RoomThumb id={itemKey} className="h-[84px] w-[120px] rounded-2xl" />;
  if (itemKey.startsWith('decor_')) return <FurnitureThumb id={itemKey} className="h-[104px] w-[104px]" />;
  return <ItemArt itemKey={itemKey} size={104} />;
}

/* ---------- Ekran ---------- */

export default function PetPage() {
  const { state, pet, isLoading, error, adopt, buy, feed, play, stroke, equip, setRoom, openChest, rename, switchPet } = usePet();
  const [tab, setTab] = useState('care');
  const [category, setCategory] = useState<PetItemCategory>('food');
  const [action, setAction] = useState<PetAction>('idle');
  const [eating, setEating] = useState<string | undefined>(undefined);
  const [hearts, setHearts] = useState<number[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loot, setLoot] = useState<ChestLoot | null>(null);
  const [adopting, setAdopting] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const actionTimer = useRef<number | undefined>(undefined);
  const strokeDistance = useRef(0);
  const lastStroke = useRef(0);

  useEffect(() => () => window.clearTimeout(actionTimer.current), []);

  const perform = useCallback((next: PetAction, ms: number, food?: string) => {
    window.clearTimeout(actionTimer.current);
    setAction(next);
    setEating(food);
    actionTimer.current = window.setTimeout(() => {
      setAction('idle');
      setEating(undefined);
    }, ms);
  }, []);

  /** Jedna akcja naraz na przycisk; błąd serwera (np. brak monet) trafia do toasta. */
  const guarded = useCallback(async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } catch (failure) {
      haptic('warning');
      toast.error(failure instanceof Error ? failure.message : 'Coś poszło nie tak');
    } finally {
      setBusy(null);
    }
  }, []);

  const itemsByKey = useMemo(() => new Map((state?.catalog ?? []).map(item => [item.key, item])), [state?.catalog]);
  const owned = useMemo(() => new Set(state?.ownedItems ?? []), [state?.ownedItems]);

  /* Głaskanie: przeciągnięcie palcem po zwierzaku. Serduszka lecą zawsze, radość liczy serwer. */
  const onStroke = (event: ReactPointerEvent) => {
    if (event.buttons === 0 && event.pointerType === 'mouse') return;
    strokeDistance.current += Math.abs(event.movementX) + Math.abs(event.movementY);
    if (strokeDistance.current < 90) return;
    strokeDistance.current = 0;
    setHearts(current => [...current.slice(-5), Date.now()]);
    haptic('tap');
    // Wtula się, dopóki trwa głaskanie; nie przerywa jedzenia ani zabawy.
    if (action === 'idle' || action === 'pet') perform('pet', 1500);
    if (Date.now() - lastStroke.current > 4000) {
      lastStroke.current = Date.now();
      stroke().catch(() => undefined);
    }
  };

  if (isLoading) {
    return (
      <div className="page space-y-4">
        <Skeleton className="aspect-[320/220] w-full rounded-3xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="page">
        <EmptyState title="Nie udało się wczytać zwierzaka" description="Sprawdź połączenie i spróbuj ponownie." />
      </div>
    );
  }

  if (!pet || adopting) {
    return (
      <div className="page">
        <AdoptPanel
          state={state}
          first={!pet}
          onAdopt={async (species, name) => {
            await adopt(species, name);
            setAdopting(false);
          }}
        />
        {pet && (
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setAdopting(false)}>
            Wróć
          </Button>
        )}
      </div>
    );
  }

  const food = state.inventory.map(entry => ({ ...entry, item: itemsByKey.get(entry.itemKey) })).filter((entry): entry is typeof entry & { item: PetItem } => Boolean(entry.item));
  const toys = state.catalog.filter(item => item.category === 'toy' && owned.has(item.key));
  const shopItems = state.catalog.filter(item => item.category === category && item.price > 0);
  const line = petLine(pet);

  const handleFeed = (item: PetItem) =>
    guarded(`feed:${item.key}`, async () => {
      await feed(item.key);
      haptic('success');
      perform('eat', 1900, item.key);
    });

  const handlePlay = (item: PetItem) =>
    guarded(`play:${item.key}`, async () => {
      perform(TOY_ACTION[item.key] ?? 'cheer', 3400);
      const result = await play(item.key);
      haptic('success');
      if (result.joyGained === 0) toast(`${pet.name} już się wybawił — radość wzrośnie za chwilę`);
    });

  const handleBuy = (item: PetItem) =>
    guarded(`buy:${item.key}`, async () => {
      await buy(item.key);
      haptic('success');
      toast.success(item.category === 'food' ? `${item.name} w plecaku` : `Kupione: ${item.name}`);
    });

  const handleChest = () =>
    guarded('chest', async () => {
      const result = await openChest(state.chests[0].id);
      haptic('celebrate');
      setLoot(result.loot);
    });

  return (
    <div className="page space-y-4">
      {/* Pokój */}
      <PetRoom
        background={state.room.background}
        furniture={state.room.furniture}
        overlay={
          <>
            <div className="absolute left-3 top-3">
              <Balance value={state.balance} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={line}
                className="absolute right-3 top-3 max-w-[56%] rounded-2xl rounded-bl-md bg-background/92 px-3 py-2 text-[13px] font-medium leading-snug shadow-md backdrop-blur-sm"
                style={{ transformOrigin: '20% 100%' }}
                initial={{ opacity: 0, scale: 0.7, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              >
                {line}
                <span className="absolute -bottom-1.5 left-4 h-3 w-3 rotate-45 rounded-[3px] bg-background/92" aria-hidden />
              </motion.div>
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
              <AnimatePresence>
                {hearts.map(id => (
                  <motion.span
                    key={id}
                    className="absolute text-primary drop-shadow"
                    initial={{ opacity: 0, y: 10, x: (id % 70) - 35, scale: 0.4, rotate: (id % 30) - 15 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -64, scale: [0.4, 1.25, 1, 0.9] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    onAnimationComplete={() => setHearts(current => current.filter(heart => heart !== id))}
                  >
                    <Heart className="h-5 w-5 fill-current" />
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </>
        }
      >
        <g
          onPointerMove={onStroke}
          onPointerDown={() => (strokeDistance.current = 0)}
          onClick={() => action === 'idle' && perform('cheer', 800)}
          style={{ touchAction: 'none', cursor: 'pointer' }}
          aria-label={`Pogłaszcz: ${pet.name}`}
        >
          <PetAvatar
            species={pet.species}
            stage={pet.progress.stage}
            build={pet.progress.build}
            mood={pet.mood}
            equipped={pet.equipped}
            shiny={pet.shiny}
            action={action}
            food={eating}
            {...PET_IN_ROOM}
          />
        </g>
      </PetRoom>

      {/* Imię, etap, postęp */}
      <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight">{pet.name}</h1>
            <p className="text-sm text-muted-foreground">
              {pet.speciesName} · {MOOD_LABEL[pet.mood]}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
            {STAGE_LABEL[pet.progress.stage]} · poz. {pet.progress.level}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round(pet.progress.stageProgress * 100)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {pet.progress.nextStage
            ? `Jeszcze ${coins(pet.progress.xpToNextStage)} pkt doświadczenia do etapu ${STAGE_LABEL[pet.progress.nextStage]} — rośnie z każdym kilometrem i każdą toną.`
            : 'Mistrz! Możesz adoptować kolejnego zwierzaka w zakładce Drużyna.'}
        </p>
      </div>

      <PetStats pet={pet} />

      {state.chests.length > 0 && <ChestBanner count={state.chests.length} onOpen={handleChest} busy={busy === 'chest'} />}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="care">Opieka</TabsTrigger>
          <TabsTrigger value="shop">Sklep</TabsTrigger>
          <TabsTrigger value="wardrobe">Szafa</TabsTrigger>
          <TabsTrigger value="team">Drużyna</TabsTrigger>
        </TabsList>

        {/* Opieka */}
        <TabsContent value="care" className="space-y-4">
          <section>
            <h2 className="mb-2 px-1 text-[15px] font-semibold">Nakarm</h2>
            {food.length === 0 ? (
              <EmptyState
                title="Plecak jest pusty"
                description="Jedzenie kupisz w sklepie za FitCoins z treningów."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setCategory('food');
                      setTab('shop');
                    }}
                  >
                    Do sklepu
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
                {food.map(({ item, qty }) => (
                  <div key={item.key} className="flex items-center gap-3 p-3">
                    <ItemIcon item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">
                        {item.name} <span className="font-normal text-muted-foreground">×{qty}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{itemEffect(item)}</p>
                    </div>
                    <Button size="sm" variant="volt" disabled={busy !== null} onClick={() => handleFeed(item)}>
                      Nakarm
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 px-1 text-[15px] font-semibold">Pobaw się</h2>
            {toys.length === 0 ? (
              <EmptyState
                title="Nie masz jeszcze zabawek"
                description="Pogłaskać możesz zawsze — przesuń palcem po zwierzaku."
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCategory('toy');
                      setTab('shop');
                    }}
                  >
                    Zobacz zabawki
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {toys.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => handlePlay(item)}
                    className="row-tap flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center disabled:opacity-50"
                  >
                    <ItemIcon item={item} size={56} />
                    <span className="text-sm font-semibold leading-tight">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* Sklep */}
        <TabsContent value="shop" className="space-y-3">
          <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Kategoria">
            {CATEGORIES.map(entry => (
              <button
                key={entry}
                type="button"
                role="tab"
                aria-selected={category === entry}
                onClick={() => setCategory(entry)}
                className={cn(
                  'h-10 min-w-0 truncate rounded-full px-1 text-[13px] font-semibold transition-colors',
                  category === entry ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
                )}
              >
                {CATEGORY_META[entry].label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
            {shopItems.map(item => {
              const has = item.category !== 'food' && owned.has(item.key);
              const affordable = state.balance >= item.price;
              return (
                <div key={item.key} className="flex items-center gap-3 p-3">
                  <ItemIcon item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{itemEffect(item) || item.description}</p>
                  </div>
                  {has ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-volt">
                      <Check className="h-4 w-4" /> Masz
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={affordable ? 'default' : 'secondary'}
                      disabled={!affordable || busy !== null}
                      onClick={() => handleBuy(item)}
                      aria-label={`Kup: ${item.name} za ${item.price} FitCoins`}
                    >
                      <CoinIcon size={18} /> {coins(item.price)}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            FitCoins zdobywasz za tonaż i kilometry. Trzy treningi w tygodniu włączają mnożnik, a rekord życiowy daje skrzynię.
          </p>
        </TabsContent>

        {/* Szafa i pokój */}
        <TabsContent value="wardrobe" className="space-y-4">
          <section>
            <h2 className="mb-2 px-1 text-[15px] font-semibold">Ubranka</h2>
            {state.catalog.some(item => item.category === 'clothes' && owned.has(item.key)) ? (
              <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
                {SLOTS.flatMap(slot =>
                  state.catalog
                    .filter(item => item.slot === slot && owned.has(item.key))
                    .map(item => {
                      const on = pet.equipped[slot] === item.key;
                      return (
                        <div key={item.key} className="flex items-center gap-3 p-3">
                          <ItemIcon item={item} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{SLOT_LABEL[slot]}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={on ? 'secondary' : 'default'}
                            disabled={busy !== null}
                            onClick={() => guarded(`equip:${item.key}`, async () => void (await equip(slot, on ? null : item.key)))}
                          >
                            {on ? 'Zdejmij' : 'Załóż'}
                          </Button>
                        </div>
                      );
                    })
                )}
              </div>
            ) : (
              <EmptyState
                title="Szafa świeci pustkami"
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setCategory('clothes');
                      setTab('shop');
                    }}
                  >
                    Zobacz ubranka
                  </Button>
                }
              />
            )}
          </section>

          <section>
            <h2 className="mb-2 px-1 text-[15px] font-semibold">Otoczenie</h2>
            <div className="grid grid-cols-2 gap-2">
              {state.catalog
                .filter(item => item.decor === 'background' && owned.has(item.key))
                .map(item => {
                  const on = state.room.background === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={on}
                      disabled={busy !== null}
                      onClick={() => guarded(`bg:${item.key}`, async () => void (await setRoom({ background: item.key })))}
                      className={cn('overflow-hidden rounded-2xl bg-card text-left ring-2 ring-transparent', on && 'ring-primary')}
                    >
                      <RoomThumb id={item.key} className="aspect-[16/9] w-full" />
                      <span className="block truncate px-3 py-2 text-sm font-semibold">{item.name}</span>
                    </button>
                  );
                })}
            </div>
          </section>

          {state.catalog.some(item => item.decor === 'furniture' && owned.has(item.key)) && (
            <section>
              <h2 className="mb-2 px-1 text-[15px] font-semibold">Meble</h2>
              <div className="grid grid-cols-3 gap-2">
                {state.catalog
                  .filter(item => item.decor === 'furniture' && owned.has(item.key))
                  .map(item => {
                    const on = state.room.furniture.includes(item.key);
                    const next = on ? state.room.furniture.filter(key => key !== item.key) : [...state.room.furniture, item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={on}
                        disabled={busy !== null}
                        onClick={() => guarded(`decor:${item.key}`, async () => void (await setRoom({ furniture: next })))}
                        className={cn('flex flex-col items-center gap-1 rounded-2xl bg-card p-3 ring-2 ring-transparent', on && 'ring-primary')}
                      >
                        <FurnitureThumb id={item.key} className="h-12 w-full" />
                        <span className="text-xs font-semibold leading-tight">{item.name}</span>
                      </button>
                    );
                  })}
              </div>
            </section>
          )}
        </TabsContent>

        {/* Drużyna */}
        <TabsContent value="team" className="space-y-3">
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
            {state.pets.map((member: PetView) => {
              const active = member.id === pet.id;
              return (
                <div key={member.id} className="flex items-center gap-3 p-3">
                  <PetAvatar species={member.species} stage={member.progress.stage} build={member.progress.build} mood={member.mood} equipped={member.equipped} size={60} still />
                  <div className="min-w-0 flex-1">
                    {renaming !== null && active ? (
                      <form
                        className="flex gap-2"
                        onSubmit={event => {
                          event.preventDefault();
                          const name = renaming.trim();
                          if (!name) return;
                          guarded('rename', async () => {
                            await rename(name);
                            setRenaming(null);
                          });
                        }}
                      >
                        <Input value={renaming} maxLength={20} autoFocus aria-label="Imię zwierzaka" onChange={event => setRenaming(event.target.value)} className="h-10" />
                        <Button size="sm" type="submit" disabled={busy !== null}>
                          Zapisz
                        </Button>
                      </form>
                    ) : (
                      <>
                        <p className="truncate text-[15px] font-semibold">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.speciesName} · {STAGE_LABEL[member.progress.stage]} · poz. {member.progress.level}
                        </p>
                      </>
                    )}
                  </div>
                  {active ? (
                    renaming === null && (
                      <Button size="icon" variant="ghost" aria-label="Zmień imię" onClick={() => setRenaming(member.name)}>
                        <Pencil />
                      </Button>
                    )
                  ) : (
                    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => guarded(`switch:${member.id}`, async () => void (await switchPet(member.id)))}>
                      Wybierz
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {state.canAdopt ? (
            <Button className="w-full" onClick={() => setAdopting(true)}>
              <Plus /> Adoptuj kolejnego
            </Button>
          ) : state.adoptableSpecies.length > 0 ? (
            <p className="px-1 text-sm text-muted-foreground">
              Kolejnego zwierzaka adoptujesz, gdy {pet.name} zostanie Mistrzem. Do wyboru: {state.adoptableSpecies.map(entry => entry.name).join(', ')}.
            </p>
          ) : (
            <p className="px-1 text-sm text-muted-foreground">Masz już całą drużynę.</p>
          )}

          <Link to="/athlete/goals" className="row-tap block rounded-2xl bg-card p-3 text-sm font-medium text-muted-foreground">
            Skąd biorą się FitCoins? Zobacz cele i wyzwania tygodnia
          </Link>
        </TabsContent>
      </Tabs>

      <AnimatePresence>{loot && <LootReveal loot={loot} onClose={() => setLoot(null)} />}</AnimatePresence>
    </div>
  );
}
