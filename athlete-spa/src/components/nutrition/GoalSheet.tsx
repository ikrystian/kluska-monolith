import { useMemo, useState } from 'react';
import { Calculator, ChevronDown, Loader2, Minus, Plus, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';

import { apiFetch } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import {
    ACTIVITY_LEVELS,
    GOAL_DIRECTIONS,
    MACROS,
    MACRO_SPLITS,
    estimateDailyCalories,
    formatKcal,
    macroCalories,
    macrosForSplit,
    matchSplit,
    type DiaryGoal,
    type EnergyProfile,
    type MacroSplitId,
    type MacroTargets,
} from '@/lib/nutrition';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { SectionLabel } from '@/components/nutrition/FoodParts';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIN_KCAL = 800;
const MAX_KCAL = 10000;
const DEFAULT_KCAL = 2000;

interface GoalSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    goal: DiaryGoal | null;
    onSaved: (goal: DiaryGoal) => void;
}

/** Lets the athlete set the daily calorie and macro target, with an optional estimate from body data. */
export function GoalSheet({ open, onOpenChange, goal, onSaved }: GoalSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" onOpenAutoFocus={(event) => event.preventDefault()}>
                {open && <GoalEditor goal={goal} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
            </SheetContent>
        </Sheet>
    );
}

/** `inset` chips sit on a tinted panel and need the darker resting background. */
function Chip({ active, onClick, children, inset }: { active: boolean; onClick: () => void; children: React.ReactNode; inset?: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'pressable-sm min-w-0 rounded-xl px-3 py-2 text-left transition-colors',
                active ? 'bg-foreground text-background' : inset ? 'bg-background/60 text-foreground' : 'bg-secondary/60 text-foreground'
            )}
        >
            {children}
        </button>
    );
}

function ChipLabel({ title, hint, active }: { title: string; hint?: string; active: boolean }) {
    return (
        <>
            <span className="block truncate text-[13px] font-semibold leading-tight">{title}</span>
            {hint && <span className={cn('block truncate text-[11px] leading-tight', active ? 'text-background/70' : 'text-muted-foreground')}>{hint}</span>}
        </>
    );
}

function NumberField({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="block min-w-0 rounded-xl bg-secondary/60 px-3 py-2">
            <span className="block truncate text-[11px] font-medium text-muted-foreground">{label}</span>
            <span className="flex items-baseline gap-1">
                <input
                    type="text"
                    inputMode="decimal"
                    maxLength={5}
                    value={value}
                    onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ''))}
                    onFocus={(event) => event.target.select()}
                    className="w-full min-w-0 bg-transparent font-display text-xl font-bold tabular-nums outline-none"
                />
                <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>
            </span>
        </label>
    );
}

const toNumber = (value: string) => Number(value.replace(',', '.'));

function ageFrom(dateOfBirth?: string): string {
    if (!dateOfBirth) return '';
    const born = new Date(dateOfBirth);
    if (Number.isNaN(born.getTime())) return '';
    const now = new Date();
    const hadBirthday = now.getMonth() > born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
    const age = now.getFullYear() - born.getFullYear() - (hadBirthday ? 0 : 1);
    return age > 0 && age < 120 ? String(age) : '';
}

function GoalEditor({ goal, onSaved, onClose }: { goal: DiaryGoal | null; onSaved: (goal: DiaryGoal) => void; onClose: () => void }) {
    const { userProfile } = useUserProfile();

    const [calories, setCalories] = useState(goal?.dailyCalories ?? DEFAULT_KCAL);
    const [caloriesText, setCaloriesText] = useState(String(goal?.dailyCalories ?? DEFAULT_KCAL));
    const [macros, setMacros] = useState<MacroTargets>(() =>
        goal ? { dailyProtein: goal.dailyProtein, dailyCarbs: goal.dailyCarbs, dailyFat: goal.dailyFat } : macrosForSplit(DEFAULT_KCAL, 'balanced')
    );
    // A chosen preset follows the calories; hand-typed grams stay as typed.
    const [split, setSplit] = useState<MacroSplitId | null>(() => (goal ? matchSplit(goal.dailyCalories, goal) : 'balanced'));
    const [isSaving, setIsSaving] = useState(false);

    const [calculatorOpen, setCalculatorOpen] = useState(!goal);
    const [gender, setGender] = useState<EnergyProfile['gender'] | null>(
        userProfile?.gender === 'male' || userProfile?.gender === 'female' ? userProfile.gender : null
    );
    const [age, setAge] = useState(() => ageFrom(userProfile?.dateOfBirth));
    const [height, setHeight] = useState(userProfile?.height ? String(userProfile.height) : '');
    const [weight, setWeight] = useState(userProfile?.weight ? String(userProfile.weight) : '');
    const [activity, setActivity] = useState<EnergyProfile['activity']>('medium');
    const [direction, setDirection] = useState<EnergyProfile['direction']>('keep');

    const applyCalories = (next: number, nextSplit: MacroSplitId | null = split) => {
        const clamped = Math.min(MAX_KCAL, Math.max(MIN_KCAL, Math.round(next)));
        setCalories(clamped);
        setCaloriesText(String(clamped));
        if (nextSplit) setMacros(macrosForSplit(clamped, nextSplit));
    };

    /** Typing updates the macros live once the value is plausible; clamping waits for blur. */
    const typeCalories = (text: string) => {
        setCaloriesText(text);
        const typed = Math.round(toNumber(text));
        if (typed >= MIN_KCAL && typed <= MAX_KCAL) {
            setCalories(typed);
            if (split) setMacros(macrosForSplit(typed, split));
        }
    };

    const estimate = useMemo(
        () => (gender ? estimateDailyCalories({ gender, age: toNumber(age), heightCm: toNumber(height), weightKg: toNumber(weight), activity, direction }) : null),
        [gender, age, height, weight, activity, direction]
    );

    const macroKcal = macroCalories(macros);
    const macroDrift = Math.abs(macroKcal - calories) / Math.max(calories, 1);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await apiFetch('/api/athlete/nutrition/goal', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dailyCalories: calories, ...macros }),
            });
            if (!response.ok) throw new Error('Request failed');
            const data = await response.json();
            haptic('success');
            toast.success('Cel dzienny zapisany.');
            onSaved(data.goal ?? { dailyCalories: calories, ...macros, setByTrainer: false });
            onClose();
        } catch {
            toast.error('Nie udało się zapisać celu. Spróbuj ponownie.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <SheetHeader>
                <SheetTitle>Dzienny cel</SheetTitle>
                <SheetDescription>Kalorie i makroskładniki, do których porównujemy każdy dzień.</SheetDescription>
            </SheetHeader>

            {goal?.setByTrainer && (
                <p className="flex items-start gap-2.5 rounded-2xl bg-secondary/50 px-3 py-2.5 text-[13px] text-muted-foreground">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Obecny cel ustawił Twój trener. Zapisanie zmian zastąpi go Twoim własnym.
                </p>
            )}

            <div className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center gap-3">
                    <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => applyCalories(calories - 50)} aria-label="Mniej o 50 kcal">
                        <Minus className="h-4 w-4" />
                    </Button>
                    <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            value={caloriesText}
                            onChange={(event) => typeCalories(event.target.value.replace(/\D/g, ''))}
                            onBlur={() => applyCalories(toNumber(caloriesText) || calories)}
                            onFocus={(event) => event.target.select()}
                            aria-label="Kalorie dziennie"
                            style={{ width: `${Math.max(3, caloriesText.length) + 0.5}ch` }}
                            className="bg-transparent text-center font-display text-[2.75rem] font-bold leading-none tabular-nums outline-none"
                        />
                        <span className="text-sm font-medium text-muted-foreground">kcal</span>
                    </label>
                    <Button type="button" variant="secondary" size="icon" className="rounded-full bg-background/70" onClick={() => applyCalories(calories + 50)} aria-label="Więcej o 50 kcal">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <section className="space-y-2.5">
                <SectionLabel>Podział makro · białko / węgle / tłuszcz</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                    {MACRO_SPLITS.map((option) => (
                        <Chip
                            key={option.id}
                            active={split === option.id}
                            onClick={() => {
                                setSplit(option.id);
                                setMacros(macrosForSplit(calories, option.id));
                            }}
                        >
                            <ChipLabel title={option.label} hint={`${option.hint}%`} active={split === option.id} />
                        </Chip>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {MACROS.map((macro) => (
                        <div key={macro.key} className="relative min-w-0">
                            <span className="absolute right-3 top-3 h-2 w-2 rounded-full" style={{ background: macro.color }} />
                            <NumberField
                                label={macro.label}
                                unit="g"
                                value={String(macros[macro.goalKey])}
                                onChange={(value) => {
                                    setSplit(null);
                                    setMacros((current) => ({ ...current, [macro.goalKey]: Math.min(2000, Math.round(toNumber(value) || 0)) }));
                                }}
                            />
                        </div>
                    ))}
                </div>
                <p className={cn('text-xs tabular-nums', macroDrift > 0.08 ? 'text-destructive' : 'text-muted-foreground')}>
                    Makro daje razem {formatKcal(macroKcal)} kcal
                    {macroDrift > 0.08 ? ` — to ${macroKcal > calories ? 'więcej' : 'mniej'} niż cel ${formatKcal(calories)} kcal.` : '.'}
                </p>
            </section>

            <section className="rounded-2xl bg-secondary/40">
                <button
                    type="button"
                    onClick={() => setCalculatorOpen((current) => !current)}
                    aria-expanded={calculatorOpen}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left"
                >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/60 text-volt">
                        <Calculator className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">Nie wiesz, ile wpisać?</span>
                        <span className="block truncate text-xs text-muted-foreground">Policzymy zapotrzebowanie z Twoich danych</span>
                    </span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', calculatorOpen && 'rotate-180')} />
                </button>

                {calculatorOpen && (
                    <div className="space-y-3 px-3 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                            <Chip active={gender === 'female'} onClick={() => setGender('female')} inset>
                                <span className="block text-center text-[13px] font-semibold">Kobieta</span>
                            </Chip>
                            <Chip active={gender === 'male'} onClick={() => setGender('male')} inset>
                                <span className="block text-center text-[13px] font-semibold">Mężczyzna</span>
                            </Chip>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <NumberField label="Wiek" unit="lat" value={age} onChange={setAge} />
                            <NumberField label="Wzrost" unit="cm" value={height} onChange={setHeight} />
                            <NumberField label="Waga" unit="kg" value={weight} onChange={setWeight} />
                        </div>
                        <div>
                            <p className="eyebrow mb-1.5">Aktywność</p>
                            <div className="grid grid-cols-2 gap-2">
                                {ACTIVITY_LEVELS.map((level) => (
                                    <Chip key={level.id} active={activity === level.id} onClick={() => setActivity(level.id)} inset>
                                        <ChipLabel title={level.label} hint={level.hint} active={activity === level.id} />
                                    </Chip>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="eyebrow mb-1.5">Kierunek</p>
                            <div className="grid grid-cols-3 gap-2">
                                {GOAL_DIRECTIONS.map((option) => (
                                    <Chip key={option.id} active={direction === option.id} onClick={() => setDirection(option.id)} inset>
                                        <ChipLabel title={option.label} hint={option.hint} active={direction === option.id} />
                                    </Chip>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl bg-background/60 px-3 py-2.5">
                            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                                {estimate ? (
                                    <>
                                        Szacunek: <span className="font-display text-xl font-bold tabular-nums text-foreground">{formatKcal(estimate)}</span> kcal dziennie
                                    </>
                                ) : (
                                    'Uzupełnij płeć, wiek, wzrost i wagę, żeby zobaczyć szacunek.'
                                )}
                            </p>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="shrink-0 rounded-full"
                                disabled={!estimate || estimate === calories}
                                onClick={() => {
                                    if (!estimate) return;
                                    haptic('tap');
                                    const nextSplit = split ?? 'balanced';
                                    setSplit(nextSplit);
                                    applyCalories(estimate, nextSplit);
                                }}
                            >
                                Użyj
                            </Button>
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                            Wzór Mifflina–St Jeora — to punkt wyjścia, nie zalecenie. Obserwuj wagę przez 2–3 tygodnie i skoryguj cel.
                        </p>
                    </div>
                )}
            </section>

            <Button type="button" className="h-12 w-full rounded-2xl text-[15px]" onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz cel · {formatKcal(calories)} kcal
            </Button>
        </div>
    );
}
