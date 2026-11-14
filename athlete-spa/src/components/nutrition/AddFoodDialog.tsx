import { lazy, Suspense, useEffect, useState } from 'react';
import useSWR from 'swr';
import { Apple, Check, ChefHat, ChevronDown, ChevronRight, Globe, History, Loader2, PencilLine, Plus, ScanBarcode, Search, Sparkles, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiFetch } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import {
    MACROS,
    formatGrams,
    formatKcal,
    productId,
    relogBody,
    type DiaryEntry,
    type DiaryGoal,
    type DiaryTotals,
    type FoodProduct,
    type MealType,
    type ReadyMeal,
    type RecentFood,
} from '@/lib/nutrition';
import { pluralForm } from '@/lib/plural';
import { ReadyMealCarousel, ReadyMealDetail, ReadyMealList, ReadyMealRow, useDebounced, useReadyMeals } from '@/components/nutrition/ReadyMeals';
import {
    BudgetLine,
    FoodIcon,
    FoodList,
    FoodRow,
    GramsStepper,
    MacroSummary,
    MealTypePicker,
    QuickAddButton,
    SectionLabel,
    SubHeader,
} from '@/components/nutrition/FoodParts';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// html5-qrcode is ~300 kB — only pulled in when the athlete opens the scanner.
const BarcodeScanner = lazy(() =>
    import('@/components/nutrition/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner }))
);

interface AddFoodDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Diary day the entry will be saved to (YYYY-MM-DD). */
    date: string;
    defaultMealType: MealType;
    /** Called with every entry saved while the dialog is open — it stays open so a whole meal can be logged in one go. */
    onAdded: (entry: DiaryEntry) => void;
    /** Daily goal + current totals; when provided, the header shows the budget and what a portion would leave. */
    goal?: DiaryGoal | null;
    totals?: DiaryTotals;
}

/** Full-sheet steps reached from the list; picking a product or a dish opens its portion view on top of any of them. */
type View = 'home' | 'scan' | 'manual';
/** What the list shows: the athlete's own foods or the catalogue of ready-made dishes. */
type Tab = 'mine' | 'dishes';
type SelectedProduct = FoodProduct & { entrySource: 'search' | 'barcode' | 'manual'; initialAmount?: number };

const VIEW_TITLES: Record<View, string> = {
    home: 'Dodaj jedzenie',
    scan: 'Skanuj kod kreskowy',
    manual: 'Szybki wpis',
};

/** "Zwykle na …" — the meal in the accusative. */
const MEAL_ACCUSATIVE: Record<MealType, string> = {
    Breakfast: 'śniadanie',
    Lunch: 'obiad',
    Dinner: 'kolację',
    Snack: 'przekąskę',
};

interface RecentResponse {
    foods: RecentFood[];
    /** Echo of the `mealType` filter; missing when the backend predates it and returned the unfiltered list. */
    mealType: MealType | null;
}

async function recentFetcher(url: string): Promise<RecentResponse> {
    const response = await apiFetch(url);
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    return { foods: data.foods ?? [], mealType: data.mealType ?? null };
}

/** Cached products only; an older backend without this route simply yields no instant matches. */
async function localProductsFetcher(url: string): Promise<FoodProduct[]> {
    const response = await apiFetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.products ?? [];
}

const formatAmount = (food: { amount: number; unit: string }) => `${food.amount.toLocaleString('pl-PL')} ${food.unit}`;
const macroLine = (food: { protein: number; carbs: number; fat: number }) => MACROS.map((macro) => `${macro.short} ${formatGrams(Math.round(food[macro.key]))}`).join(' · ');
const productMacros = (product: FoodProduct) => MACROS.map((macro) => `${macro.short} ${formatGrams(product[macro.key])}`).join(' · ');
const isDish = (food: RecentFood) => food.source === 'meal' || food.source === 'recipe';
const recentIcon = (food: RecentFood) => (isDish(food) ? ChefHat : food.source === 'barcode' ? ScanBarcode : food.unit === 'g' ? Apple : Zap);
const foodKey = (food: RecentFood) => `food:${food.name.toLowerCase()}`;
const mealKey = (meal: ReadyMeal) => `meal:${meal.id}`;

/** What has been logged since the dialog opened. */
interface Session {
    count: number;
    calories: number;
}

/** One-tap logging shared by every list: which row is being saved and how many times each was added. */
interface QuickAdd {
    busyKey: string | null;
    counts: Map<string, number>;
    relog: (food: RecentFood) => void;
    addMeal: (meal: ReadyMeal) => void;
}

export function AddFoodDialog({ open, onOpenChange, date, defaultMealType, onAdded, goal, totals }: AddFoodDialogProps) {
    const [view, setView] = useState<View>('home');
    const [tab, setTab] = useState<Tab>('mine');
    const [mealType, setMealType] = useState<MealType>(defaultMealType);
    const [selected, setSelected] = useState<SelectedProduct | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<ReadyMeal | null>(null);
    /** Calories of the portion being adjusted in a detail view — previewed in the header's budget line. */
    const [pending, setPending] = useState(0);

    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<FoodProduct[] | null>(null);
    const [searchedQuery, setSearchedQuery] = useState('');

    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [counts, setCounts] = useState<Map<string, number>>(new Map());
    const [session, setSession] = useState<Session>({ count: 0, calories: 0 });

    // Fresh state on every open, with the meal type the user tapped "+" on
    useEffect(() => {
        if (open) {
            setView('home');
            setTab('mine');
            setMealType(defaultMealType);
            setSelected(null);
            setSelectedMeal(null);
            setPending(0);
            setQuery('');
            setResults(null);
            setSearchedQuery('');
            setCounts(new Map());
            setSession({ count: 0, calories: 0 });
        }
    }, [open, defaultMealType]);

    const trimmedQuery = query.trim();
    const debouncedQuery = useDebounced(trimmedQuery, 250);
    const liveQuery = debouncedQuery.length >= 2 ? debouncedQuery : '';
    const searching = trimmedQuery.length >= 2;

    const { data: recent, mutate: mutateRecent } = useSWR<RecentResponse>(open ? '/api/athlete/nutrition/recent' : null, recentFetcher);
    const { data: usual, mutate: mutateUsual } = useSWR<RecentResponse>(open ? `/api/athlete/nutrition/recent?mealType=${mealType}` : null, recentFetcher, {
        keepPreviousData: true,
    });
    const { data: dishes } = useReadyMeals(open ? liveQuery : '');
    const { data: history } = useSWR<RecentResponse>(
        open && liveQuery ? `/api/athlete/nutrition/recent?query=${encodeURIComponent(liveQuery)}` : null,
        recentFetcher,
        { keepPreviousData: true }
    );
    const { data: localProducts, isLoading: isLoadingLocal } = useSWR<FoodProduct[]>(
        open && liveQuery ? `/api/athlete/nutrition/search/local?query=${encodeURIComponent(liveQuery)}` : null,
        localProductsFetcher,
        { keepPreviousData: true }
    );

    /** Records a saved entry; `backHome` also returns to the list, ready for the next product. */
    const afterAdd = (entry: DiaryEntry, backHome: boolean) => {
        haptic('success');
        setSession((current) => ({ count: current.count + 1, calories: current.calories + entry.calories }));
        onAdded(entry);
        void mutateRecent();
        void mutateUsual();
        if (backHome) {
            setSelected(null);
            setSelectedMeal(null);
            setView('home');
            setQuery('');
            setResults(null);
            setSearchedQuery('');
        }
    };

    /** Looks the query up on the web — slower, so it only runs when asked for. */
    const handleWebSearch = async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (tab !== 'mine' || trimmedQuery.length < 2 || isSearching) return;

        setIsSearching(true);
        setResults(null);
        setSearchedQuery(trimmedQuery);
        try {
            const response = await apiFetch(`/api/athlete/nutrition/search?query=${encodeURIComponent(trimmedQuery)}&mode=web`);
            if (!response.ok) throw new Error('Request failed');
            const data = await response.json();
            setResults(data.products ?? []);
        } catch {
            setSearchedQuery('');
            toast.error('Nie udało się wyszukać produktów. Spróbuj ponownie.');
        } finally {
            setIsSearching(false);
        }
    };

    /** Saves a ready-to-send diary body straight from a list row. */
    const quickPost = async (key: string, body: unknown) => {
        if (busyKey) return;
        setBusyKey(key);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error('Request failed');
            const data = await response.json();
            setCounts((current) => new Map(current).set(key, (current.get(key) ?? 0) + 1));
            afterAdd(data.entry, false);
        } catch {
            toast.error('Nie udało się dodać. Spróbuj ponownie.');
        } finally {
            setBusyKey(null);
        }
    };

    const quick: QuickAdd = {
        busyKey,
        counts,
        relog: (food) => void quickPost(foodKey(food), relogBody(food, date, mealType)),
        addMeal: (meal) => void quickPost(mealKey(meal), { date, mealType, mealId: meal.id, servings: 1 }),
    };

    /** Opens a recent product in the amount picker (per-100 g values rebuilt from the logged portion). */
    const openRecent = (food: RecentFood) => {
        // Dishes and quick entries have no per-100 g base to rescale — they repeat as logged.
        if (isDish(food) || food.unit !== 'g') {
            quick.relog(food);
            return;
        }
        const per = (value: number) => Math.round((value / Math.max(food.amount, 0.1)) * 1000) / 10;
        setSelected({
            id: food.productId,
            name: food.name,
            calories: per(food.calories),
            protein: per(food.protein),
            carbs: per(food.carbs),
            fat: per(food.fat),
            unit: 'g',
            barcode: food.barcode,
            entrySource: food.source === 'barcode' ? 'barcode' : food.source === 'manual' ? 'manual' : 'search',
            initialAmount: food.amount,
        });
    };

    const subTitle = selected ? 'Ile zjedzone?' : selectedMeal ? 'Ile porcji?' : VIEW_TITLES[view];
    const goBack = () => {
        if (selected) setSelected(null);
        else if (selectedMeal) setSelectedMeal(null);
        else setView('home');
    };
    const isHome = view === 'home' && !selected && !selectedMeal;

    // Web results (once asked for) come first; cached matches that aren't among them follow.
    const webShown = results !== null && searchedQuery === trimmedQuery;
    const cached = liveQuery && trimmedQuery.toLowerCase().includes(liveQuery.toLowerCase()) ? localProducts ?? [] : [];
    const products = webShown ? [...results, ...cached.filter((item) => !results.some((found) => productId(found) === productId(item)))] : cached;
    const historyMatches = (liveQuery ? history?.foods ?? [] : []).filter((food) => food.name.toLowerCase().includes(trimmedQuery.toLowerCase()));

    // "Usually at this meal" only when the backend really scoped the list to the chosen meal.
    const usualFoods = usual?.mealType === mealType ? usual.foods.slice(0, 5) : [];
    const frequentFoods = recent?.foods.filter((food) => !usualFoods.some((item) => foodKey(item) === foodKey(food)));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* The sheet itself doesn't scroll: the meal picker and the budget stay put above the list, "Gotowe" below it. */}
            <DialogContent className="flex h-[92dvh] max-h-[92dvh] flex-col gap-0 overflow-hidden pb-0" onOpenAutoFocus={(event) => event.preventDefault()}>
                <div className="space-y-3 pb-3.5">
                    <div className="flex min-h-9 items-center pr-10">
                        {isHome ? (
                            <DialogTitle className="text-lg">{VIEW_TITLES.home}</DialogTitle>
                        ) : (
                            <>
                                <DialogTitle className="sr-only">{subTitle}</DialogTitle>
                                <SubHeader title={subTitle} onBack={goBack} />
                            </>
                        )}
                    </div>
                    <MealTypePicker value={mealType} onChange={setMealType} compact />
                    <BudgetLine goal={goal} totals={totals} pending={pending} />
                </div>

                <div className="-mx-5 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-0.5">
                    {selected ? (
                        <ProductDetail
                            key={`${productId(selected) ?? ''}-${selected.name}`}
                            product={selected}
                            date={date}
                            mealType={mealType}
                            onPreview={setPending}
                            onSaved={(entry) => afterAdd(entry, true)}
                        />
                    ) : selectedMeal ? (
                        <ReadyMealDetail
                            key={selectedMeal.id}
                            meal={selectedMeal}
                            date={date}
                            mealType={mealType}
                            onPreview={setPending}
                            onSaved={(entry) => afterAdd(entry, true)}
                            onError={(message) => toast.error(message)}
                        />
                    ) : view === 'scan' ? (
                        <ScanView onFound={(product) => setSelected({ ...product, entrySource: 'barcode' })} />
                    ) : view === 'manual' ? (
                        <QuickEntry date={date} mealType={mealType} initialName={trimmedQuery} onPreview={setPending} onSaved={(entry) => afterAdd(entry, true)} />
                    ) : (
                        <>
                            <form onSubmit={handleWebSearch} className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder={tab === 'dishes' ? 'Szukaj dania, np. pierogi' : 'Szukaj produktu lub dania'}
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    className="h-12 rounded-2xl border-transparent bg-secondary/60 pl-11 pr-14 text-[15px]"
                                    enterKeyHint="search"
                                    autoComplete="off"
                                />
                                {query ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuery('');
                                            setResults(null);
                                        }}
                                        aria-label="Wyczyść"
                                        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground active:bg-secondary"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setView('scan')}
                                        aria-label="Skanuj kod kreskowy"
                                        className="pressable-sm absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-background/70 text-volt"
                                    >
                                        <ScanBarcode className="h-[18px] w-[18px]" />
                                    </button>
                                )}
                            </form>

                            <div className="flex items-center gap-1.5">
                                {(
                                    [
                                        { id: 'mine', label: 'Twoje' },
                                        { id: 'dishes', label: 'Gotowe dania' },
                                    ] as const
                                ).map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={tab === option.id}
                                        onClick={() => setTab(option.id)}
                                        className={cn(
                                            'pressable-sm h-9 shrink-0 rounded-full px-3 text-[13px] font-semibold transition-colors',
                                            tab === option.id ? 'bg-foreground text-background' : 'bg-secondary/60 text-muted-foreground'
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setView('manual')}
                                    aria-label="Szybki wpis"
                                    className="pressable-sm ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] font-semibold"
                                >
                                    <Zap className="h-4 w-4 text-volt" />
                                    <span className="max-[359px]:hidden">Szybki wpis</span>
                                </button>
                            </div>

                            {tab === 'dishes' ? (
                                <ReadyMealList
                                    query={trimmedQuery}
                                    onSelect={setSelectedMeal}
                                    trailing={(meal) => <MealQuickAdd meal={meal} quick={quick} />}
                                />
                            ) : searching ? (
                                <SearchResults
                                    query={trimmedQuery}
                                    history={historyMatches}
                                    quick={quick}
                                    onOpenRecent={openRecent}
                                    dishes={liveQuery ? dishes : undefined}
                                    products={products}
                                    isLoadingProducts={trimmedQuery !== liveQuery || (isLoadingLocal && !localProducts)}
                                    isSearchingWeb={isSearching}
                                    webSearched={webShown}
                                    onSearchWeb={() => handleWebSearch()}
                                    onSelectProduct={(product) => setSelected({ ...product, entrySource: 'search' })}
                                    onSelectMeal={setSelectedMeal}
                                    onShowAllDishes={() => setTab('dishes')}
                                    onManual={() => setView('manual')}
                                />
                            ) : (
                                <StartScreen
                                    usual={usualFoods}
                                    usualLabel={`Zwykle na ${MEAL_ACCUSATIVE[mealType]}`}
                                    frequent={frequentFoods}
                                    quick={quick}
                                    onOpenRecent={openRecent}
                                    onShowDishes={() => setTab('dishes')}
                                    onSelectMeal={setSelectedMeal}
                                />
                            )}
                        </>
                    )}
                </div>

                {isHome && session.count > 0 && (
                    <div className="-mx-5 border-t border-border/50 px-5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3">
                        <Button className="h-12 w-full justify-between rounded-2xl px-4 text-[15px]" onClick={() => onOpenChange(false)}>
                            <span className="flex min-w-0 items-center gap-2">
                                <Check className="h-4 w-4 shrink-0" />
                                <span className="truncate">Gotowe</span>
                            </span>
                            <span className="shrink-0 text-[13px] font-medium tabular-nums opacity-85">
                                {session.count} {pluralForm(session.count, 'wpis', 'wpisy', 'wpisów')} · {formatKcal(session.calories)} kcal
                            </span>
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ───────────────────────── Rows ───────────────────────── */

/** A food from the athlete's own history: tap to adjust the amount, "+" to log it again as it was. */
function RecentRow({ food, quick, onOpen }: { food: RecentFood; quick: QuickAdd; onOpen: (food: RecentFood) => void }) {
    const key = foodKey(food);
    return (
        <FoodRow
            icon={<FoodIcon icon={recentIcon(food)} />}
            title={food.name}
            detail={`${formatAmount(food)} · ${macroLine(food)}`}
            calories={food.calories}
            caloriesLabel="kcal"
            onClick={() => onOpen(food)}
            trailing={<QuickAddButton label={`Dodaj ponownie: ${food.name}`} busy={quick.busyKey === key} count={quick.counts.get(key) ?? 0} onClick={() => quick.relog(food)} />}
        />
    );
}

/** "+" of a dish row: logs one serving without opening the portion view. */
function MealQuickAdd({ meal, quick }: { meal: ReadyMeal; quick: QuickAdd }) {
    const key = mealKey(meal);
    return <QuickAddButton label={`Dodaj 1 porcję: ${meal.name}`} busy={quick.busyKey === key} count={quick.counts.get(key) ?? 0} onClick={() => quick.addMeal(meal)} />;
}

/* ───────────────────────── Start screen ───────────────────────── */

const FREQUENT_PREVIEW = 6;

function StartScreen({
    usual,
    usualLabel,
    frequent,
    quick,
    onOpenRecent,
    onShowDishes,
    onSelectMeal,
}: {
    /** What the athlete tends to log at the chosen meal. */
    usual: RecentFood[];
    usualLabel: string;
    /** The rest of the frequently logged foods; `undefined` while loading. */
    frequent: RecentFood[] | undefined;
    quick: QuickAdd;
    onOpenRecent: (food: RecentFood) => void;
    onShowDishes: () => void;
    onSelectMeal: (meal: ReadyMeal) => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const known = usual.length + (frequent?.length ?? 0);
    // Newcomers have little history to tap, so they get dish ideas instead.
    const { data: popular } = useReadyMeals('');
    const suggestDishes = frequent !== undefined && known < 4 && popular && popular.length > 0;
    const shownFrequent = showAll ? frequent : frequent?.slice(0, FREQUENT_PREVIEW);

    if (frequent === undefined) {
        return <Skeleton className="h-[244px] w-full rounded-2xl" />;
    }

    return (
        <div className="space-y-5">
            {usual.length > 0 && (
                <section className="space-y-2">
                    <SectionLabel>{usualLabel}</SectionLabel>
                    <FoodList>
                        {usual.map((food) => (
                            <RecentRow key={food.name} food={food} quick={quick} onOpen={onOpenRecent} />
                        ))}
                    </FoodList>
                </section>
            )}

            {frequent.length > 0 && (
                <section className="space-y-2">
                    <SectionLabel>{usual.length > 0 ? 'Inne często dodawane' : 'Często dodawane'}</SectionLabel>
                    <FoodList>
                        {shownFrequent?.map((food) => (
                            <RecentRow key={food.name} food={food} quick={quick} onOpen={onOpenRecent} />
                        ))}
                    </FoodList>
                    {!showAll && frequent.length > FREQUENT_PREVIEW && (
                        <button
                            type="button"
                            onClick={() => setShowAll(true)}
                            className="flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[13px] font-semibold text-muted-foreground active:bg-secondary/60"
                        >
                            Pokaż więcej ({frequent.length - FREQUENT_PREVIEW}) <ChevronDown className="h-4 w-4" />
                        </button>
                    )}
                </section>
            )}

            {known === 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3.5 text-[13px] text-muted-foreground">
                    <History className="h-5 w-5 shrink-0" />
                    Tu pojawią się produkty, które jesz najczęściej — dodasz je jednym tapnięciem.
                </div>
            )}

            {suggestDishes && (
                <section className="space-y-2">
                    <SectionLabel
                        action={
                            <button type="button" onClick={onShowDishes} className="flex items-center text-xs font-semibold text-volt">
                                Wszystkie <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        }
                    >
                        Gotowe dania
                    </SectionLabel>
                    <ReadyMealCarousel meals={pickVaried(popular, 10)} onSelect={onSelectMeal} />
                </section>
            )}
        </div>
    );
}

/** One dish per category first, so the strip isn't ten breakfasts in a row. */
function pickVaried(meals: ReadyMeal[], count: number): ReadyMeal[] {
    const seen = new Set<string>();
    const first: ReadyMeal[] = [];
    const rest: ReadyMeal[] = [];
    for (const meal of meals) {
        const key = meal.fromTrainer ? 'trainer' : meal.dishCategory;
        if (!seen.has(key)) {
            seen.add(key);
            first.push(meal);
        } else {
            rest.push(meal);
        }
    }
    const trainerFirst = [...first.filter((m) => m.fromTrainer), ...first.filter((m) => !m.fromTrainer)];
    return [...trainerFirst, ...rest].slice(0, count);
}

/* ───────────────────────── Search results ───────────────────────── */

function SearchResults({
    query,
    history,
    quick,
    onOpenRecent,
    dishes,
    products,
    isLoadingProducts,
    isSearchingWeb,
    webSearched,
    onSearchWeb,
    onSelectProduct,
    onSelectMeal,
    onShowAllDishes,
    onManual,
}: {
    query: string;
    /** Matching foods the athlete has logged before. */
    history: RecentFood[];
    quick: QuickAdd;
    onOpenRecent: (food: RecentFood) => void;
    dishes: ReadyMeal[] | undefined;
    /** Cached matches, plus web results once they were asked for. */
    products: FoodProduct[];
    isLoadingProducts: boolean;
    isSearchingWeb: boolean;
    webSearched: boolean;
    onSearchWeb: () => void;
    onSelectProduct: (product: FoodProduct) => void;
    onSelectMeal: (meal: ReadyMeal) => void;
    onShowAllDishes: () => void;
    onManual: () => void;
}) {
    return (
        <div className="space-y-5">
            {history.length > 0 && (
                <section className="space-y-2">
                    <SectionLabel>Twoje</SectionLabel>
                    <FoodList>
                        {history.slice(0, 4).map((food) => (
                            <RecentRow key={food.name} food={food} quick={quick} onOpen={onOpenRecent} />
                        ))}
                    </FoodList>
                </section>
            )}

            {dishes && dishes.length > 0 && (
                <section className="space-y-2">
                    <SectionLabel
                        action={
                            dishes.length > 3 && (
                                <button type="button" onClick={onShowAllDishes} className="flex items-center text-xs font-semibold text-volt">
                                    Wszystkie ({dishes.length}) <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            )
                        }
                    >
                        Dania
                    </SectionLabel>
                    <FoodList>
                        {dishes.slice(0, 3).map((meal) => (
                            <ReadyMealRow key={meal.id} meal={meal} onSelect={onSelectMeal} trailing={<MealQuickAdd meal={meal} quick={quick} />} />
                        ))}
                    </FoodList>
                </section>
            )}

            <section className="space-y-2">
                <SectionLabel>Produkty</SectionLabel>

                {products.length > 0 && (
                    <FoodList>
                        {products.map((product, index) => (
                            <FoodRow
                                key={productId(product) ?? index}
                                icon={<ProductThumb product={product} />}
                                title={product.name}
                                detail={`${product.brand ? `${product.brand} · ` : ''}${productMacros(product)}`}
                                calories={product.calories}
                                caloriesLabel="kcal / 100 g"
                                onClick={() => onSelectProduct(product)}
                            />
                        ))}
                    </FoodList>
                )}

                {isSearchingWeb ? (
                    <div className="space-y-2">
                        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Sparkles className="h-4 w-4 animate-pulse text-volt" />
                            Szukam w internecie…
                        </p>
                        <Skeleton className="h-[120px] w-full rounded-2xl" />
                    </div>
                ) : isLoadingProducts && products.length === 0 ? (
                    <Skeleton className="h-[120px] w-full rounded-2xl" />
                ) : webSearched ? (
                    <div className="rounded-2xl bg-secondary/40 px-4 py-4 text-center">
                        <p className="text-[13px] text-muted-foreground">
                            {products.length === 0 ? `Nie znaleziono produktów dla „${query}".` : 'Nie ma tu tego, czego szukasz?'}
                        </p>
                        <Button variant="secondary" size="sm" className="mt-2.5 rounded-full" onClick={onManual}>
                            <PencilLine className="mr-1.5 h-4 w-4" />
                            Wpisz kalorie ręcznie
                        </Button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onSearchWeb}
                        className={cn(
                            'pressable-sm flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left',
                            products.length === 0 ? 'bg-food/10' : 'border border-dashed border-border'
                        )}
                    >
                        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', products.length === 0 ? 'bg-food text-background' : 'bg-secondary text-muted-foreground')}>
                            <Globe className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                                {products.length === 0 ? `Szukaj „${query}" w internecie` : 'Nie ma na liście? Szukaj w internecie'}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">Sprawdzimy wartości odżywcze · kilka sekund</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                )}
            </section>
        </div>
    );
}

function ProductThumb({ product, size = 'sm' }: { product: FoodProduct; size?: 'sm' | 'lg' }) {
    const [failed, setFailed] = useState(false);
    const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-9 w-9 rounded-xl';
    if (product.imageUrl && !failed) {
        return (
            <img
                src={product.imageUrl}
                alt=""
                loading="lazy"
                onError={() => setFailed(true)}
                className={cn(box, 'shrink-0 bg-white object-contain')}
            />
        );
    }
    return (
        <span className={cn(box, 'grid shrink-0 place-items-center bg-food/15 text-volt')}>
            <Apple className={size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} />
        </span>
    );
}

/* ───────────────────────── Product amount picker ───────────────────────── */

function ProductDetail({
    product,
    date,
    mealType,
    onPreview,
    onSaved,
}: {
    product: SelectedProduct;
    date: string;
    mealType: MealType;
    onPreview: (calories: number) => void;
    onSaved: (entry: DiaryEntry) => void;
}) {
    const [amount, setAmount] = useState(String(product.initialAmount ?? 100));
    const [isSaving, setIsSaving] = useState(false);
    const grams = Number(amount.replace(',', '.')) || 0;
    const factor = grams / 100;
    const added = {
        calories: Math.round(product.calories * factor),
        protein: product.protein * factor,
        carbs: product.carbs * factor,
        fat: product.fat * factor,
    };

    useEffect(() => {
        onPreview(added.calories);
        return () => onPreview(0);
    }, [added.calories, onPreview]);

    const handleSave = async () => {
        if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) {
            toast.error('Podaj ilość od 1 do 5000 g.');
            return;
        }
        const name =
            product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
                ? `${product.name} (${product.brand})`
                : product.name;

        setIsSaving(true);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    mealType,
                    name,
                    amount: grams,
                    per100: { calories: product.calories, protein: product.protein, carbs: product.carbs, fat: product.fat },
                    productId: productId(product),
                    barcode: product.barcode,
                    source: product.entrySource,
                }),
            });
            if (!response.ok) throw new Error('Request failed');
            onSaved((await response.json()).entry);
        } catch {
            toast.error('Nie udało się zapisać wpisu. Spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <ProductThumb product={product} size="lg" />
                <div className="min-w-0 pt-0.5">
                    <p className="text-[17px] font-semibold leading-snug">{product.name}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {product.brand ? `${product.brand} · ` : ''}
                        {Math.round(product.calories)} kcal · {productMacros(product)} / 100 g
                    </p>
                </div>
            </div>

            <GramsStepper value={amount} onChange={setAmount} />

            <MacroSummary {...added} />

            <Button className="h-12 w-full rounded-2xl text-[15px]" onClick={handleSave} disabled={isSaving || grams <= 0}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Dodaj · {added.calories} kcal
            </Button>
        </div>
    );
}

/* ───────────────────────── Barcode scanner ───────────────────────── */

function ScanView({ onFound }: { onFound: (product: FoodProduct) => void }) {
    const [isResolving, setIsResolving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');

    const resolve = async (code: string) => {
        setIsResolving(true);
        setError(null);
        try {
            const response = await apiFetch(`/api/athlete/nutrition/barcode?code=${encodeURIComponent(code)}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.product) {
                setError(data.error ?? 'Nie znaleziono produktu dla tego kodu. Spróbuj wyszukać po nazwie.');
                return;
            }
            onFound(data.product);
        } catch {
            setError('Nie udało się rozpoznać kodu. Sprawdź połączenie z internetem.');
        } finally {
            setIsResolving(false);
        }
    };

    const handleManualSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (isResolving) return;
        // Spaces/dashes are common when copying the number from packaging — the API expects bare digits
        const digits = manualCode.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 14) {
            setError('Kod kreskowy składa się z 8–14 cyfr (najczęściej 13). Sprawdź numer pod kodem na opakowaniu.');
            return;
        }
        void resolve(digits);
    };

    return (
        <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl">
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center bg-black py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                        </div>
                    }
                >
                    <BarcodeScanner onDetected={resolve} paused={isResolving} />
                </Suspense>
            </div>

            {isResolving ? (
                <p className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse text-volt" />
                    Rozpoznaję produkt…
                </p>
            ) : error ? (
                <p className="rounded-2xl bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive">{error}</p>
            ) : (
                <p className="text-center text-sm text-muted-foreground">Nakieruj aparat na kod kreskowy lub QR produktu.</p>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-2 rounded-2xl bg-secondary/40 p-3">
                <Label htmlFor="manual-barcode" className="text-xs text-muted-foreground">
                    Lub wpisz numer spod kodu
                </Label>
                <div className="flex gap-2">
                    <Input
                        id="manual-barcode"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="np. 5901234123457"
                        maxLength={20}
                        value={manualCode}
                        onChange={(event) => setManualCode(event.target.value)}
                        className="rounded-xl bg-background/60"
                    />
                    <Button type="submit" className="shrink-0 rounded-xl" disabled={isResolving || manualCode.replace(/\D/g, '').length < 8}>
                        {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Szukaj'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

/* ───────────────────────── Quick entry ───────────────────────── */

const QUICK_KCAL = [100, 200, 300, 500];

/**
 * Calories typed in by hand — a restaurant dish, a label, a rough guess. Only
 * the calories are required; a name, macros and the portion weight are optional.
 */
function QuickEntry({
    date,
    mealType,
    initialName,
    onPreview,
    onSaved,
}: {
    date: string;
    mealType: MealType;
    initialName: string;
    onPreview: (calories: number) => void;
    onSaved: (entry: DiaryEntry) => void;
}) {
    const [name, setName] = useState(initialName);
    const [calories, setCalories] = useState('');
    const [details, setDetails] = useState({ protein: '', carbs: '', fat: '', grams: '' });
    const [isSaving, setIsSaving] = useState(false);

    const num = (value: string) => Number(value.replace(',', '.')) || 0;
    const clean = (value: string) => value.replace(/[^\d.,]/g, '');
    const kcal = Math.round(num(calories));
    const grams = num(details.grams);
    const valid = calories !== '' && kcal >= 0 && kcal <= 10000 && grams <= 5000;

    useEffect(() => {
        onPreview(kcal);
        return () => onPreview(0);
    }, [kcal, onPreview]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!valid || isSaving) return;

        setIsSaving(true);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    mealType,
                    entry: {
                        name: name.trim(),
                        calories: kcal,
                        protein: num(details.protein),
                        carbs: num(details.carbs),
                        fat: num(details.fat),
                        ...(grams > 0 ? { amount: grams, unit: 'g' } : { amount: 1, unit: 'porcja' }),
                        source: 'manual',
                    },
                }),
            });
            if (!response.ok) throw new Error('Request failed');
            onSaved((await response.json()).entry);
        } catch {
            toast.error('Nie udało się zapisać wpisu. Sprawdź wartości i spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    const fields = [
        ...MACROS.map((macro) => ({ key: macro.key, label: macro.label, color: macro.color as string | undefined })),
        { key: 'grams' as const, label: 'Waga', color: undefined },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl bg-secondary/40 p-3">
                <label className="flex items-baseline justify-center gap-1.5 py-1">
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={5}
                        autoFocus
                        value={calories}
                        onChange={(event) => setCalories(event.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        aria-label="Kalorie"
                        style={{ width: `${Math.max(1, calories.length) + 0.5}ch` }}
                        className="bg-transparent text-center font-display text-[3.25rem] font-bold leading-none tabular-nums outline-none placeholder:text-muted-foreground/40"
                    />
                    <span className="text-sm font-medium text-muted-foreground">kcal</span>
                </label>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {QUICK_KCAL.map((quick) => (
                        <button
                            key={quick}
                            type="button"
                            onClick={() => setCalories(String(Math.min(10000, kcal + quick)))}
                            className="pressable-sm rounded-xl bg-background/60 py-1.5 text-xs font-semibold tabular-nums text-muted-foreground"
                        >
                            +{quick}
                        </button>
                    ))}
                </div>
            </div>

            <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                placeholder="Nazwa (opcjonalnie), np. obiad na mieście"
                aria-label="Nazwa"
                className="h-12 rounded-2xl border-transparent bg-secondary/60 text-[15px]"
            />

            <div>
                <p className="eyebrow mb-1.5">Opcjonalnie · makro i waga porcji (g)</p>
                <div className="grid grid-cols-4 gap-2">
                    {fields.map((field) => (
                        <label key={field.key} className="block min-w-0 rounded-xl bg-secondary/60 px-2.5 py-2">
                            <span className="flex items-center gap-1 truncate text-[11px] font-medium text-muted-foreground">
                                {field.color && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: field.color }} />}
                                {field.label}
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                maxLength={6}
                                value={details[field.key]}
                                onChange={(event) => setDetails((current) => ({ ...current, [field.key]: clean(event.target.value) }))}
                                placeholder="–"
                                aria-label={`${field.label} w gramach`}
                                className="w-full min-w-0 bg-transparent font-display text-xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
                            />
                        </label>
                    ))}
                </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-2xl text-[15px]" disabled={!valid || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Dodaj{kcal > 0 ? ` · ${formatKcal(kcal)} kcal` : ''}
            </Button>
        </form>
    );
}
