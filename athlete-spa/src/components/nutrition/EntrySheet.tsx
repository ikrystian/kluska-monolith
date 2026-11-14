import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiFetch } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { isServingsUnit, type DiaryEntry, type DiaryGoal, type DiaryTotals, type MealType } from '@/lib/nutrition';
import { GoalImpact, GramsStepper, MacroSummary, MealTypePicker, ServingsStepper } from '@/components/nutrition/FoodParts';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface EntrySheetProps {
    /** The entry being edited; `null` keeps the sheet closed. */
    entry: DiaryEntry | null;
    onClose: () => void;
    /** Called with the updated entry once the server accepted the change. */
    onSaved: (entry: DiaryEntry) => void;
    onDelete: (entry: DiaryEntry) => void;
    goal?: DiaryGoal | null;
    totals?: DiaryTotals;
}

/** Edits one diary entry: how much was eaten and which meal it belongs to — or removes it. */
export function EntrySheet({ entry, onClose, onSaved, onDelete, goal, totals }: EntrySheetProps) {
    // The last opened entry stays rendered while the sheet slides away.
    const [shown, setShown] = useState<DiaryEntry | null>(entry);
    useEffect(() => {
        if (entry) setShown(entry);
    }, [entry]);

    return (
        <Sheet open={entry !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" onOpenAutoFocus={(event) => event.preventDefault()}>
                {shown && <EntryEditor key={shown.id} entry={shown} onSaved={onSaved} onDelete={onDelete} onClose={onClose} goal={goal} totals={totals} />}
            </SheetContent>
        </Sheet>
    );
}

function EntryEditor({ entry, onSaved, onDelete, onClose, goal, totals }: Omit<EntrySheetProps, 'entry'> & { entry: DiaryEntry }) {
    const servings = isServingsUnit(entry.unit);
    const [mealType, setMealType] = useState<MealType>(entry.mealType);
    const [amountText, setAmountText] = useState(String(entry.amount));
    const [isSaving, setIsSaving] = useState(false);

    const amount = Number(amountText.replace(',', '.')) || 0;
    const factor = entry.amount > 0 ? amount / entry.amount : 1;
    const scaled = {
        calories: Math.round(entry.calories * factor),
        protein: entry.protein * factor,
        carbs: entry.carbs * factor,
        fat: entry.fat * factor,
    };
    const amountChanged = amount !== entry.amount;
    const changed = amountChanged || mealType !== entry.mealType;
    const valid = amount > 0 && amount <= (servings ? 10 : 5000);

    const handleSave = async () => {
        if (!changed) {
            onClose();
            return;
        }
        if (!valid) {
            toast.error(servings ? 'Podaj liczbę porcji od 0,25 do 10.' : 'Podaj ilość od 1 do 5000 g.');
            return;
        }
        setIsSaving(true);
        try {
            const response = await apiFetch(`/api/athlete/nutrition/diary/${entry.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...(amountChanged ? { amount } : {}), ...(mealType !== entry.mealType ? { mealType } : {}) }),
            });
            if (!response.ok) throw new Error('Request failed');
            const data = await response.json();
            haptic('tap');
            onSaved(data.entry ?? { ...entry, ...scaled, amount, mealType });
            onClose();
        } catch {
            toast.error('Nie udało się zapisać zmian. Spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <SheetHeader>
                <SheetTitle className="line-clamp-2 text-lg">{entry.name}</SheetTitle>
                <SheetDescription>Zmień ilość albo przenieś do innego posiłku.</SheetDescription>
            </SheetHeader>

            <MealTypePicker value={mealType} onChange={setMealType} />

            {servings ? (
                <ServingsStepper value={amount || 0.5} onChange={(next) => setAmountText(String(next))} />
            ) : (
                <GramsStepper value={amountText} onChange={setAmountText} />
            )}

            <MacroSummary {...scaled} />
            {/* The entry is already counted in today's total, so only the difference moves the bar. */}
            <GoalImpact goal={goal} totals={totals ? { ...totals, calories: totals.calories - entry.calories } : undefined} adding={scaled.calories} />

            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    className="h-12 shrink-0 rounded-2xl px-4 text-destructive"
                    onClick={() => {
                        onDelete(entry);
                        onClose();
                    }}
                    disabled={isSaving}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                </Button>
                <Button type="button" className="h-12 min-w-0 flex-1 rounded-2xl text-[15px]" onClick={handleSave} disabled={isSaving || !valid}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {changed ? `Zapisz · ${scaled.calories} kcal` : 'Gotowe'}
                </Button>
            </div>
        </div>
    );
}
