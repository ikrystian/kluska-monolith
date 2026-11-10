import { lazy, Suspense, useEffect, useState } from 'react';
import useSWR from 'swr';
import {
    Apple,
    Check,
    ChefHat,
    ChevronRight,
    History,
    Loader2,
    Minus,
    PencilLine,
    Plus,
    ScanBarcode,
    Search,
    Sparkles,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { apiFetch } from '@/lib/api-client';
import {
    productId,
    relogBody,
    type DiaryGoal,
    type DiaryTotals,
    type FoodProduct,
    type MealType,
    type ReadyMeal,
    type RecentFood,
} from '@/lib/nutrition';
import { ReadyMealCarousel, ReadyMealDetail, ReadyMealList, ReadyMealRow, useDebounced, useReadyMeals } from '@/components/nutrition/ReadyMeals';
import { FoodIcon, FoodRow, GoalImpact, MacroSummary, MealTypePicker, SectionLabel, SubHeader } from '@/components/nutrition/FoodParts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    onAdded: () => void;
    /** Daily goal + current totals; when provided, added calories are shown relative to the goal. */
    goal?: DiaryGoal | null;
    totals?: DiaryTotals;
}

type View = 'home' | 'meals' | 'scan' | 'manual';
type SelectedProduct = FoodProduct & { entrySource: 'search' | 'barcode' | 'manual'; initialAmount?: number };

const VIEW_TITLES: Record<View, string> = {
    home: 'Dodaj do dzienniczka',
    meals: 'Gotowe dania',
    scan: 'Skanuj kod kreskowy',
    manual: 'Wpisz ręcznie',
};

async function recentFetcher(url: string): Promise<RecentFood[]> {
    const response = await apiFetch(url);
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    return data.foods ?? [];
}

const formatAmount = (food: { amount: number; unit: string }) => `${food.amount.toLocaleString('pl-PL')} ${food.unit}`;

export function AddFoodDialog({ open, onOpenChange, date, defaultMealType, onAdded, goal, totals }: AddFoodDialogProps) {
    const [view, setView] = useState<View>('home');
    const [mealType, setMealType] = useState<MealType>(defaultMealType);
    const [selected, setSelected] = useState<SelectedProduct | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<ReadyMeal | null>(null);

    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<FoodProduct[] | null>(null);
    const [searchedQuery, setSearchedQuery] = useState('');

    const [relogging, setRelogging] = useState<string | null>(null);
    const [relogged, setRelogged] = useState<Set<string>>(new Set());

    // Fresh state on every open, with the meal type the user tapped "+" on
    useEffect(() => {
        if (open) {
            setView('home');
            setMealType(defaultMealType);
            setSelected(null);
            setSelectedMeal(null);
            setQuery('');
            setResults(null);
            setSearchedQuery('');
            setRelogged(new Set());
        }
    }, [open, defaultMealType]);

    const { data: recent, mutate: mutateRecent } = useSWR<RecentFood[]>(open ? '/api/athlete/nutrition/recent' : null, recentFetcher);
    const debouncedQuery = useDebounced(query.trim(), 250);
    const dishQuery = debouncedQuery.length >= 2 ? debouncedQuery : '';
    const { data: dishes } = useReadyMeals(open ? dishQuery : '');

    const afterAdd = (name: string, close: boolean) => {
        toast.success(`Dodano „${name}" do dzienniczka.`);
        onAdded();
        void mutateRecent();
        if (close) onOpenChange(false);
    };

    const handleSearch = async (event?: React.FormEvent) => {
        event?.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length < 2 || isSearching) return;

        setIsSearching(true);
        setResults(null);
        setSearchedQuery(trimmed);
        try {
            const response = await apiFetch(`/api/athlete/nutrition/search?query=${encodeURIComponent(trimmed)}`);
            if (!response.ok) throw new Error('Request failed');
            const data = await response.json();
            setResults(data.products ?? []);
        } catch {
            toast.error('Nie udało się wyszukać produktów. Spróbuj ponownie.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRelog = async (food: RecentFood) => {
        setRelogging(food.name);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(relogBody(food, date, mealType)),
            });
            if (!response.ok) throw new Error('Request failed');
            setRelogged((current) => new Set(current).add(food.name));
            afterAdd(food.name, false);
        } catch {
            toast.error('Nie udało się dodać. Spróbuj ponownie.');
        } finally {
            setRelogging(null);
        }
    };

    /** Opens a recent product in the amount picker (per-100 g values rebuilt from the logged portion). */
    const openRecent = (food: RecentFood) => {
        if (food.source === 'meal' || food.source === 'recipe') {
            void handleRelog(food);
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

    const subTitle = selected ? 'Produkt' : selectedMeal ? 'Danie' : VIEW_TITLES[view];
    const goBack = () => {
        if (selected) setSelected(null);
        else if (selectedMeal) setSelectedMeal(null);
        else setView('home');
    };
    const isHome = view === 'home' && !selected && !selectedMeal;
    const remaining = goal ? Math.round(goal.dailyCalories - (totals?.calories ?? 0)) : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="h-[88dvh] max-h-[88dvh] content-start">
                {isHome ? (
                    <DialogHeader className="space-y-0.5 pr-10 text-left">
                        <DialogTitle className="text-xl">Dodaj do dzienniczka</DialogTitle>
                        {remaining !== null && (
                            <p className="text-[13px] text-muted-foreground">
                                {remaining >= 0 ? (
                                    <>Zostało <span className="font-semibold tabular-nums text-foreground">{remaining} kcal</span> z {goal!.dailyCalories}</>
                                ) : (
                                    <>Cel przekroczony o <span className="font-semibold tabular-nums text-destructive">{-remaining} kcal</span></>
                                )}
                            </p>
                        )}
                    </DialogHeader>
                ) : (
                    <div className="pr-10">
                        <DialogTitle className="sr-only">{subTitle}</DialogTitle>
                        <SubHeader title={subTitle} onBack={goBack} />
                    </div>
                )}

                <div className="min-w-0 space-y-4">
                    <MealTypePicker value={mealType} onChange={setMealType} />

                    {selected ? (
                        <ProductDetail
                            key={`${productId(selected) ?? ''}-${selected.name}`}
                            product={selected}
                            date={date}
                            mealType={mealType}
                            goal={goal}
                            totals={totals}
                            onSaved={(name) => afterAdd(name, true)}
                        />
                    ) : selectedMeal ? (
                        <ReadyMealDetail
                            key={selectedMeal.id}
                            meal={selectedMeal}
                            date={date}
                            mealType={mealType}
                            goal={goal}
                            totals={totals}
                            onSaved={(meal) => afterAdd(meal.name, true)}
                            onError={(message) => toast.error(message)}
                        />
                    ) : view === 'meals' ? (
                        <ReadyMealList initialQuery={query.trim()} onSelect={setSelectedMeal} />
                    ) : view === 'scan' ? (
                        <ScanView onFound={(product) => setSelected({ ...product, entrySource: 'barcode' })} />
                    ) : view === 'manual' ? (
                        <ManualEntry date={date} mealType={mealType} initialName={query.trim()} onSaved={(name) => afterAdd(name, true)} />
                    ) : (
                        <>
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Szukaj produktu lub dania"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    className="h-12 rounded-2xl border-transparent bg-secondary/60 pl-11 pr-11 text-[15px]"
                                    enterKeyHint="search"
                                    autoComplete="off"
                                />
                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuery('');
                                            setResults(null);
                                        }}
                                        aria-label="Wyczyść"
                                        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground active:bg-secondary"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </form>

                            {query.trim().length < 2 ? (
                                <StartScreen
                                    recent={recent}
                                    relogging={relogging}
                                    relogged={relogged}
                                    onRelog={handleRelog}
                                    onOpenRecent={openRecent}
                                    onOpenView={setView}
                                    onSelectMeal={setSelectedMeal}
                                />
                            ) : (
                                <SearchResults
                                    query={query.trim()}
                                    searchedQuery={searchedQuery}
                                    dishes={dishQuery ? dishes : undefined}
                                    results={results}
                                    isSearching={isSearching}
                                    onSearch={() => handleSearch()}
                                    onSelectProduct={(product) => setSelected({ ...product, entrySource: 'search' })}
                                    onSelectMeal={setSelectedMeal}
                                    onShowAllDishes={() => setView('meals')}
                                    onManual={() => setView('manual')}
                                />
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ───────────────────────── Start screen ───────────────────────── */

function StartScreen({
    recent,
    relogging,
    relogged,
    onRelog,
    onOpenRecent,
    onOpenView,
    onSelectMeal,
}: {
    recent: RecentFood[] | undefined;
    relogging: string | null;
    relogged: Set<string>;
    onRelog: (food: RecentFood) => void;
    onOpenRecent: (food: RecentFood) => void;
    onOpenView: (view: View) => void;
    onSelectMeal: (meal: ReadyMeal) => void;
}) {
    const { data: popular } = useReadyMeals('');
    const actions = [
        { view: 'scan' as const, icon: ScanBarcode, label: 'Skanuj kod', hint: 'z opakowania' },
        { view: 'meals' as const, icon: ChefHat, label: 'Gotowe dania', hint: 'gotowe porcje' },
        { view: 'manual' as const, icon: PencilLine, label: 'Wpisz ręcznie', hint: 'własne wartości' },
    ];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
                {actions.map(({ view, icon: Icon, label, hint }) => (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onOpenView(view)}
                        className="pressable-sm flex min-w-0 flex-col items-start gap-2.5 rounded-2xl bg-secondary/40 p-3 text-left"
                    >
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-food/15 text-food">
                            <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="w-full min-w-0">
                            <span className="block truncate text-[13px] font-semibold leading-tight">{label}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
                        </span>
                    </button>
                ))}
            </div>

            <section className="space-y-2.5">
                <SectionLabel>Ostatnio dodawane</SectionLabel>
                {recent === undefined ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />
                        ))}
                    </div>
                ) : recent.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3.5 text-[13px] text-muted-foreground">
                        <History className="h-5 w-5 shrink-0" />
                        Tu pojawią się produkty, które jesz najczęściej — dodasz je jednym tapnięciem.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {recent.map((food) => {
                            const done = relogged.has(food.name);
                            return (
                                <li key={food.name}>
                                    <FoodRow
                                        icon={<FoodIcon icon={food.source === 'meal' || food.source === 'recipe' ? ChefHat : food.source === 'barcode' ? ScanBarcode : Apple} />}
                                        title={food.name}
                                        detail={`${formatAmount(food)} · B ${Math.round(food.protein)} · W ${Math.round(food.carbs)} · T ${Math.round(food.fat)}`}
                                        calories={food.calories}
                                        caloriesLabel="kcal"
                                        onClick={() => onOpenRecent(food)}
                                        trailing={
                                            <button
                                                type="button"
                                                onClick={() => onRelog(food)}
                                                disabled={relogging === food.name}
                                                aria-label={`Dodaj ponownie: ${food.name}`}
                                                className={cn(
                                                    'grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors',
                                                    done ? 'bg-food text-background' : 'bg-background/70 text-foreground active:bg-background'
                                                )}
                                            >
                                                {relogging === food.name ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : done ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <Plus className="h-4 w-4" />
                                                )}
                                            </button>
                                        }
                                    />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {popular && popular.length > 0 && (
                <section className="space-y-2.5">
                    <SectionLabel
                        action={
                            <button type="button" onClick={() => onOpenView('meals')} className="flex items-center text-xs font-semibold text-food">
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
    searchedQuery,
    dishes,
    results,
    isSearching,
    onSearch,
    onSelectProduct,
    onSelectMeal,
    onShowAllDishes,
    onManual,
}: {
    query: string;
    searchedQuery: string;
    dishes: ReadyMeal[] | undefined;
    results: FoodProduct[] | null;
    isSearching: boolean;
    onSearch: () => void;
    onSelectProduct: (product: FoodProduct) => void;
    onSelectMeal: (meal: ReadyMeal) => void;
    onShowAllDishes: () => void;
    onManual: () => void;
}) {
    const showProducts = results !== null && searchedQuery === query;

    return (
        <div className="space-y-5">
            {dishes && dishes.length > 0 && (
                <section className="space-y-2.5">
                    <SectionLabel
                        action={
                            dishes.length > 3 && (
                                <button type="button" onClick={onShowAllDishes} className="flex items-center text-xs font-semibold text-food">
                                    Wszystkie ({dishes.length}) <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            )
                        }
                    >
                        Dania
                    </SectionLabel>
                    <ul className="space-y-2">
                        {dishes.slice(0, 3).map((meal) => (
                            <li key={meal.id}>
                                <ReadyMealRow meal={meal} onSelect={onSelectMeal} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="space-y-2.5">
                <SectionLabel>Produkty</SectionLabel>
                {isSearching ? (
                    <div className="space-y-2">
                        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <Sparkles className="h-4 w-4 animate-pulse text-food" />
                            Szukam w bazie i w internecie…
                        </p>
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />
                        ))}
                    </div>
                ) : !showProducts ? (
                    <button
                        type="button"
                        onClick={onSearch}
                        className="pressable-sm flex w-full items-center gap-3 rounded-2xl bg-food/10 px-3 py-3 text-left"
                    >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-food text-background">
                            <Search className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">Szukaj produktu „{query}"</span>
                            <span className="block text-xs text-muted-foreground">Baza produktów i wyszukiwanie w sieci</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                ) : results.length === 0 ? (
                    <div className="rounded-2xl bg-secondary/40 px-4 py-6 text-center">
                        <p className="text-sm text-muted-foreground">Nie znaleziono produktów dla „{searchedQuery}".</p>
                        <Button variant="secondary" size="sm" className="mt-3 rounded-full" onClick={onManual}>
                            <PencilLine className="mr-1.5 h-4 w-4" />
                            Wpisz wartości ręcznie
                        </Button>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {results.map((product, index) => (
                            <li key={productId(product) ?? index}>
                                <FoodRow
                                    icon={<ProductThumb product={product} />}
                                    title={product.name}
                                    detail={`${product.brand ? `${product.brand} · ` : ''}B ${product.protein} · W ${product.carbs} · T ${product.fat}`}
                                    calories={product.calories}
                                    caloriesLabel="kcal / 100 g"
                                    onClick={() => onSelectProduct(product)}
                                />
                            </li>
                        ))}
                    </ul>
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
        <span className={cn(box, 'grid shrink-0 place-items-center bg-food/15 text-food')}>
            <Apple className={size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} />
        </span>
    );
}

/* ───────────────────────── Product amount picker ───────────────────────── */

const QUICK_AMOUNTS = [50, 100, 150, 200, 250];

function ProductDetail({
    product,
    date,
    mealType,
    goal,
    totals,
    onSaved,
}: {
    product: SelectedProduct;
    date: string;
    mealType: MealType;
    goal?: DiaryGoal | null;
    totals?: DiaryTotals;
    onSaved: (name: string) => void;
}) {
    const [amount, setAmount] = useState(String(product.initialAmount ?? 100));
    const [isSaving, setIsSaving] = useState(false);
    const grams = Number(amount) || 0;
    const factor = grams / 100;
    const added = {
        calories: Math.round(product.calories * factor),
        protein: product.protein * factor,
        carbs: product.carbs * factor,
        fat: product.fat * factor,
    };
    const step = (delta: number) => setAmount(String(Math.min(5000, Math.max(5, Math.round((grams + delta) / 5) * 5))));

    const handleSave = async () => {
        if (!Number.isFinite(grams) || grams <= 0) {
            toast.error('Podaj prawidłową ilość w gramach.');
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
            onSaved(product.name);
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
                        {Math.round(product.calories)} kcal · B {product.protein} · W {product.carbs} · T {product.fat} / 100 g
                    </p>
                </div>
            </div>

            <div className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center gap-3">
                    <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => step(-10)} aria-label="Mniej">
                        <Minus className="h-4 w-4" />
                    </Button>
                    <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
                        <input
                            type="number"
                            inputMode="decimal"
                            min={1}
                            max={5000}
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            aria-label="Ilość w gramach"
                            className="w-24 bg-transparent text-center font-display text-4xl font-bold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-sm font-medium text-muted-foreground">g</span>
                    </label>
                    <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => step(10)} aria-label="Więcej">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {QUICK_AMOUNTS.map((quick) => (
                        <button
                            key={quick}
                            type="button"
                            onClick={() => setAmount(String(quick))}
                            className={cn(
                                'pressable-sm rounded-xl py-1.5 text-xs font-semibold transition-colors',
                                grams === quick ? 'bg-foreground text-background' : 'bg-background/60 text-muted-foreground'
                            )}
                        >
                            {quick} g
                        </button>
                    ))}
                </div>
            </div>

            <MacroSummary {...added} />
            <GoalImpact goal={goal} totals={totals} adding={added.calories} />

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
                    <Sparkles className="h-4 w-4 animate-pulse text-food" />
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

/* ───────────────────────── Manual entry ───────────────────────── */

function ManualEntry({
    date,
    mealType,
    initialName,
    onSaved,
}: {
    date: string;
    mealType: MealType;
    initialName: string;
    onSaved: (name: string) => void;
}) {
    const [name, setName] = useState(initialName);
    const [amount, setAmount] = useState('100');
    const [values, setValues] = useState({ calories: '', protein: '', carbs: '', fat: '' });
    const [isSaving, setIsSaving] = useState(false);

    const num = (value: string) => Number(value.replace(',', '.'));
    const grams = num(amount);
    const kcal = num(values.calories);
    const valid = name.trim().length > 0 && grams > 0 && Number.isFinite(kcal) && kcal >= 0 && values.calories !== '';

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!valid || isSaving) return;
        const per100 = (value: string) => {
            const n = num(value || '0');
            return Number.isFinite(n) && n > 0 ? Math.round((n / grams) * 1000) / 10 : 0;
        };

        setIsSaving(true);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    mealType,
                    name: name.trim(),
                    amount: grams,
                    per100: {
                        calories: per100(values.calories),
                        protein: per100(values.protein),
                        carbs: per100(values.carbs),
                        fat: per100(values.fat),
                    },
                    source: 'manual',
                }),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error === 'Invalid nutrition values' ? 'Wartości są nierealne dla tej gramatury.' : 'Nie udało się zapisać wpisu.');
            }
            onSaved(name.trim());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać wpisu.');
        } finally {
            setIsSaving(false);
        }
    };

    const macroFields = [
        { key: 'protein' as const, label: 'Białko' },
        { key: 'carbs' as const, label: 'Węgle' },
        { key: 'fat' as const, label: 'Tłuszcz' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="manual-name">Nazwa</Label>
                <Input id="manual-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Kanapka z bufetu" className="h-11 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor="manual-amount">Porcja (g)</Label>
                    <Input id="manual-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="manual-kcal">Kalorie (kcal)</Label>
                    <Input
                        id="manual-kcal"
                        inputMode="decimal"
                        value={values.calories}
                        onChange={(e) => setValues((v) => ({ ...v, calories: e.target.value }))}
                        placeholder="0"
                        className="h-11 rounded-xl"
                    />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {macroFields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={`manual-${field.key}`} className="text-xs">
                            {field.label} (g)
                        </Label>
                        <Input
                            id={`manual-${field.key}`}
                            inputMode="decimal"
                            value={values[field.key]}
                            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                            placeholder="0"
                            className="h-11 rounded-xl"
                        />
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">Podaj wartości dla całej porcji — np. z etykiety albo menu restauracji.</p>
            <Button type="submit" className="h-12 w-full rounded-2xl text-[15px]" disabled={!valid || isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Dodaj{kcal > 0 ? ` · ${Math.round(kcal)} kcal` : ''}
            </Button>
        </form>
    );
}
