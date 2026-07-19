import { useEffect, useState } from 'react';
import { ArrowLeft, Flame, Loader2, Plus, ScanBarcode, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api-client';
import {
    MEAL_TYPES,
    MEAL_TYPE_LABELS,
    productId,
    type DiaryGoal,
    type DiaryTotals,
    type FoodProduct,
    type MealType,
} from '@/lib/nutrition';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarcodeScanner } from '@/components/nutrition/BarcodeScanner';

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

type SelectedProduct = FoodProduct & { entrySource: 'search' | 'barcode' };

const QUICK_AMOUNTS = [50, 100, 150, 200, 250];

export function AddFoodDialog({ open, onOpenChange, date, defaultMealType, onAdded, goal, totals }: AddFoodDialogProps) {
    const [tab, setTab] = useState<'search' | 'scan'>('search');

    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<FoodProduct[] | null>(null);

    const [isResolvingCode, setIsResolvingCode] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const [selected, setSelected] = useState<SelectedProduct | null>(null);
    const [amount, setAmount] = useState('100');
    const [mealType, setMealType] = useState<MealType>(defaultMealType);
    const [isSaving, setIsSaving] = useState(false);

    // Fresh state on every open, with the meal type the user tapped "+" on
    useEffect(() => {
        if (open) {
            setTab('search');
            setQuery('');
            setResults(null);
            setSelected(null);
            setAmount('100');
            setScanError(null);
            setMealType(defaultMealType);
        }
    }, [open, defaultMealType]);

    const handleSearch = async (event?: React.FormEvent) => {
        event?.preventDefault();
        const trimmed = query.trim();
        if (trimmed.length < 2 || isSearching) return;

        setIsSearching(true);
        setResults(null);
        try {
            const response = await apiFetch(`/api/athlete/nutrition/search?query=${encodeURIComponent(trimmed)}`);
            if (!response.ok) throw new Error('Request failed');
            const data = await response.json();
            setResults(data.products ?? []);
        } catch {
            toast.error('Nie udało się wyszukać produktów. Spróbuj ponownie.');
            setResults(null);
        } finally {
            setIsSearching(false);
        }
    };

    const handleCodeDetected = async (code: string) => {
        setIsResolvingCode(true);
        setScanError(null);
        try {
            const response = await apiFetch(`/api/athlete/nutrition/barcode?code=${encodeURIComponent(code)}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.product) {
                setScanError(data.error ?? 'Nie znaleziono produktu dla tego kodu. Spróbuj wyszukać po nazwie.');
                return;
            }
            setSelected({ ...data.product, entrySource: 'barcode' });
        } catch {
            setScanError('Nie udało się rozpoznać kodu. Sprawdź połączenie z internetem.');
        } finally {
            setIsResolvingCode(false);
        }
    };

    const handleSave = async () => {
        if (!selected) return;
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            toast.error('Podaj prawidłową ilość w gramach.');
            return;
        }

        setIsSaving(true);
        try {
            const response = await apiFetch('/api/athlete/nutrition/diary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    mealType,
                    name: selected.brand && !selected.name.toLowerCase().includes(selected.brand.toLowerCase())
                        ? `${selected.name} (${selected.brand})`
                        : selected.name,
                    amount: parsedAmount,
                    per100: {
                        calories: selected.calories,
                        protein: selected.protein,
                        carbs: selected.carbs,
                        fat: selected.fat,
                    },
                    productId: productId(selected),
                    barcode: selected.barcode,
                    source: selected.entrySource,
                }),
            });
            if (!response.ok) throw new Error('Request failed');

            toast.success(`Dodano „${selected.name}" do dzienniczka.`);
            onAdded();
            onOpenChange(false);
        } catch {
            toast.error('Nie udało się zapisać wpisu. Spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    const factor = (Number(amount) || 0) / 100;

    // Contrast effect: kalorie porcji pokazujemy na tle dziennego celu, nie w izolacji
    const addedCalories = selected ? Math.round(selected.calories * factor) : 0;
    const goalPercent = goal && goal.dailyCalories > 0
        ? Math.round((addedCalories / goal.dailyCalories) * 100)
        : null;
    const remainingAfter = goal
        ? Math.round(goal.dailyCalories - (totals?.calories ?? 0) - addedCalories)
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{selected ? 'Dodaj do dzienniczka' : 'Dodaj produkt'}</DialogTitle>
                </DialogHeader>

                {selected ? (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={() => setSelected(null)}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Wybierz inny produkt
                        </button>

                        <div className="rounded-xl border bg-secondary/30 p-4">
                            <p className="font-semibold leading-snug">{selected.name}</p>
                            {selected.brand && <p className="text-sm text-muted-foreground">{selected.brand}</p>}
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">
                                    <Flame className="mr-1 h-3 w-3 text-primary" />
                                    {Math.round(selected.calories)} kcal / 100 g
                                </Badge>
                                <Badge variant="outline" className="text-xs">B: {selected.protein} g</Badge>
                                <Badge variant="outline" className="text-xs">W: {selected.carbs} g</Badge>
                                <Badge variant="outline" className="text-xs">T: {selected.fat} g</Badge>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="food-amount">Ilość (g)</Label>
                            <Input
                                id="food-amount"
                                type="number"
                                inputMode="decimal"
                                min={1}
                                max={5000}
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                            />
                            <div className="flex flex-wrap gap-2">
                                {QUICK_AMOUNTS.map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        type="button"
                                        onClick={() => setAmount(String(quickAmount))}
                                        className="pressable-sm rounded-full border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {quickAmount} g
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Posiłek</Label>
                            <Select value={mealType} onValueChange={(value) => setMealType(value as MealType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEAL_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {MEAL_TYPE_LABELS[type]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 gap-2 rounded-xl border border-primary/10 bg-primary/5 p-3 text-center">
                            <div>
                                <p className="text-lg font-bold leading-none text-primary">{addedCalories}</p>
                                <p className="mt-1 text-xs text-muted-foreground">kcal</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold leading-none">{(selected.protein * factor).toFixed(1)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Białko</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold leading-none">{(selected.carbs * factor).toFixed(1)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Węgle</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold leading-none">{(selected.fat * factor).toFixed(1)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Tłuszcze</p>
                            </div>
                        </div>

                        {goalPercent !== null && remainingAfter !== null && (
                            <p className="rounded-xl bg-secondary/40 px-3 py-2 text-center text-xs text-muted-foreground">
                                {goalPercent <= 25 ? `To tylko ${goalPercent}%` : `To ${goalPercent}%`} Twojego
                                dziennego celu ({goal!.dailyCalories} kcal).{' '}
                                {remainingAfter >= 0
                                    ? `Po dodaniu zostanie Ci jeszcze ${remainingAfter} kcal.`
                                    : `Po dodaniu przekroczysz cel o ${-remainingAfter} kcal.`}
                            </p>
                        )}

                        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            Dodaj do dzienniczka
                        </Button>
                    </div>
                ) : (
                    <Tabs value={tab} onValueChange={(value) => setTab(value as 'search' | 'scan')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="search">
                                <Search className="mr-1.5 h-4 w-4" />
                                Szukaj
                            </TabsTrigger>
                            <TabsTrigger value="scan">
                                <ScanBarcode className="mr-1.5 h-4 w-4" />
                                Skanuj kod
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="search" className="space-y-3">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input
                                    placeholder="np. twaróg półtłusty"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    autoFocus
                                />
                                <Button type="submit" size="icon" className="shrink-0" disabled={isSearching || query.trim().length < 2}>
                                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </form>

                            {isSearching && (
                                <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 py-8 text-sm text-muted-foreground">
                                    <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                                    AI szuka wartości odżywczych…
                                </div>
                            )}

                            {!isSearching && results !== null && results.length === 0 && (
                                <p className="rounded-xl border-2 border-dashed bg-muted/30 py-8 text-center text-sm text-muted-foreground">
                                    Nie znaleziono produktów dla „{query.trim()}".
                                </p>
                            )}

                            {!isSearching && results && results.length > 0 && (
                                <ul className="space-y-2">
                                    {results.map((product, index) => (
                                        <li key={productId(product) ?? index}>
                                            <button
                                                type="button"
                                                onClick={() => setSelected({ ...product, entrySource: 'search' })}
                                                className="pressable-sm flex w-full items-center justify-between gap-3 rounded-xl border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:bg-secondary/60"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        B: {product.protein} g · W: {product.carbs} g · T: {product.fat} g / 100 g
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-bold text-primary">{Math.round(product.calories)}</p>
                                                    <p className="text-[10px] text-muted-foreground">kcal / 100 g</p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </TabsContent>

                        <TabsContent value="scan" className="space-y-3">
                            {/* Mount the camera only while this tab is visible */}
                            {tab === 'scan' && (
                                <BarcodeScanner onDetected={handleCodeDetected} paused={isResolvingCode} />
                            )}

                            {isResolvingCode ? (
                                <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 py-4 text-sm text-muted-foreground">
                                    <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                                    Rozpoznaję produkt…
                                </div>
                            ) : scanError ? (
                                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive">
                                    {scanError}
                                </p>
                            ) : (
                                <p className="text-center text-sm text-muted-foreground">
                                    Nakieruj aparat na kod kreskowy lub QR produktu.
                                </p>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
