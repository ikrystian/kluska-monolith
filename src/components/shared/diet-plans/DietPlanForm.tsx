'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Plus, Trash2, Save, Clock, Check, ChevronsUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { fetchSavedMeals, panelConfig, type PanelRole, type SavedMeal } from '@/components/shared/panel-config';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
    Breakfast: 'Śniadanie',
    Lunch: 'Obiad',
    Dinner: 'Kolacja',
    Snack: 'Przekąska',
};

/** Posiłek w dniu planu – plan przechowuje tylko id posiłku, a nazwę i makra bierzemy z listy posiłków. */
interface DietMeal {
    savedMealId: string;
    type: MealType;
    time?: string;
}

interface DietDay {
    dayNumber: number;
    meals: DietMeal[];
}

export interface DietPlanFormProps {
    /** Panel, z którego otwarto formularz: wybiera endpointy API i listę posiłków. */
    role: PanelRole;
    initialData?: {
        _id?: string;
        name: string;
        description?: string;
        days: DietDay[];
    };
    /** Lista planów danego panelu, na którą wracamy po zapisie. */
    redirectTo: string;
}

export function DietPlanForm({ role, initialData, redirectTo }: DietPlanFormProps) {
    const router = useRouter();
    const planId = initialData?._id;
    const isEdit = !!planId;

    const [dietName, setDietName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [days, setDays] = useState<DietDay[]>(() =>
        initialData?.days?.length
            ? initialData.days.map(day => ({
                dayNumber: day.dayNumber,
                meals: day.meals.map(meal => ({ savedMealId: meal.savedMealId, type: meal.type, time: meal.time })),
            }))
            : [{ dayNumber: 1, meals: [] }]
    );
    const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
    const [mealsLoading, setMealsLoading] = useState(true);
    const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false);
    const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchSavedMeals(role)
            .then(meals => {
                if (!cancelled) setSavedMeals(meals);
            })
            .catch(() => {
                if (!cancelled) toast({ title: 'Błąd', description: 'Nie udało się pobrać zapisanych posiłków', variant: 'destructive' });
            })
            .finally(() => {
                if (!cancelled) setMealsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [role]);

    const mealsById = new Map(savedMeals.map(meal => [meal._id, meal]));

    const addDay = () => {
        setDays([...days, { dayNumber: days.length + 1, meals: [] }]);
    };

    const removeDay = (index: number) => {
        if (days.length === 1) return;
        setDays(days.filter((_, i) => i !== index).map((day, i) => ({ ...day, dayNumber: i + 1 })));
    };

    const openMealSelector = (dayIndex: number) => {
        setCurrentDayIndex(dayIndex);
        setIsMealSelectorOpen(true);
    };

    const addMealToDay = (meal: SavedMeal, type: MealType, time: string) => {
        if (currentDayIndex === null) return;
        const dayNumber = days[currentDayIndex].dayNumber;
        setDays(days.map((day, index) =>
            index === currentDayIndex
                ? { ...day, meals: [...day.meals, { savedMealId: meal._id, type, time }] }
                : day
        ));
        setIsMealSelectorOpen(false);
        toast({ title: 'Dodano', description: `${meal.name} dodano do Dnia ${dayNumber}` });
    };

    const removeMealFromDay = (dayIndex: number, mealIndex: number) => {
        setDays(days.map((day, index) =>
            index === dayIndex
                ? { ...day, meals: day.meals.filter((_, i) => i !== mealIndex) }
                : day
        ));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dietName) {
            toast({ title: 'Błąd', description: 'Proszę podać nazwę diety', variant: 'destructive' });
            return;
        }

        if (!days.some(d => d.meals.length > 0)) {
            toast({ title: 'Ostrzeżenie', description: 'Twoja dieta nie ma posiłków. Jesteś pewien?', variant: 'destructive' });
        }

        const { dietPlansApi } = panelConfig[role];
        const url = planId ? `${dietPlansApi}/${planId}` : dietPlansApi;

        setIsSaving(true);
        try {
            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: dietName,
                    description,
                    days: days.map(d => ({
                        dayNumber: d.dayNumber,
                        meals: d.meals.map(m => ({ savedMealId: m.savedMealId, type: m.type, time: m.time })),
                    })),
                }),
            });

            if (!res.ok) throw new Error('Request failed');

            toast({ title: 'Sukces', description: `Plan diety ${isEdit ? 'zaktualizowany' : 'zapisany'} pomyślnie` });
            router.push(redirectTo);
            router.refresh();
        } catch (error) {
            console.error('Save error:', error);
            toast({ title: 'Błąd', description: 'Nie udało się zapisać planu diety', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-8">
            <div className="flex justify-end">
                <Button type="submit" className="gap-2" disabled={isSaving}>
                    <Save className="w-4 h-4" /> {isEdit ? 'Zaktualizuj Plan' : 'Zapisz Plan'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Szczegóły Planu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="diet-name">Nazwa Diety</Label>
                        <Input
                            id="diet-name"
                            value={dietName}
                            onChange={(e) => setDietName(e.target.value)}
                            placeholder="np. Plan Redukcyjny 4 Tygodnie"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="diet-description">Opis</Label>
                        <Textarea
                            id="diet-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Krótki opis planu diety..."
                            disabled={isSaving}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold">Dni</h2>
                    <Button type="button" onClick={addDay} variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" /> Dodaj Dzień
                    </Button>
                </div>

                {days.map((day, dayIndex) => (
                    <Card key={dayIndex}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Dzień {day.dayNumber}</CardTitle>
                            {days.length > 1 && (
                                <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => removeDay(dayIndex)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {mealsLoading ? (
                                <Skeleton className="h-16 w-full" />
                            ) : day.meals.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">Brak dodanych posiłków.</p>
                            ) : (
                                <div className="space-y-2">
                                    {day.meals.map((meal, mealIndex) => {
                                        const info = mealsById.get(meal.savedMealId);
                                        return (
                                            <div key={`${meal.savedMealId}-${mealIndex}`} className="flex justify-between items-center p-3 border rounded bg-card">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-primary/10 p-2 rounded text-primary font-bold text-xs w-20 text-center">
                                                        {MEAL_TYPE_LABELS[meal.type]}
                                                        {meal.time && <div className="font-normal text-[10px] flex items-center justify-center gap-1 mt-1"><Clock className="w-3 h-3" /> {meal.time}</div>}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{info?.name ?? 'Nieznany posiłek'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {(info?.totalCalories ?? 0).toFixed(0)} kcal | B: {(info?.totalProtein ?? 0).toFixed(0)} | W: {(info?.totalCarbs ?? 0).toFixed(0)} | T: {(info?.totalFat ?? 0).toFixed(0)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeMealFromDay(dayIndex, mealIndex)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => openMealSelector(dayIndex)} disabled={mealsLoading}>
                                <Plus className="w-4 h-4 mr-2" /> Dodaj Posiłek
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isMealSelectorOpen} onOpenChange={setIsMealSelectorOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Wybierz Posiłek</DialogTitle>
                    </DialogHeader>
                    <MealSelector
                        meals={savedMeals}
                        onSelect={addMealToDay}
                    />
                </DialogContent>
            </Dialog>
        </form>
    );
}

function MealSelector({ meals, onSelect }: { meals: SavedMeal[]; onSelect: (meal: SavedMeal, type: MealType, time: string) => void }) {
    const [selectedMealId, setSelectedMealId] = useState<string>('');
    const [time, setTime] = useState('08:00');
    const [open, setOpen] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const categories: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

    const handleAdd = () => {
        const meal = meals.find(m => m._id === selectedMealId);
        if (meal) {
            onSelect(meal, meal.category || 'Breakfast', time);
        }
    };

    const toggleCategory = (category: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const selectedMeal = meals.find(m => m._id === selectedMealId);

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2 flex flex-col">
                <Label>Posiłek</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                            {selectedMeal
                                ? `${selectedMeal.name} (${selectedMeal.totalCalories.toFixed(0)} kcal)`
                                : "Wybierz zapisany posiłek..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                        <Command shouldFilter={false}>
                            <CommandInput placeholder="Szukaj posiłku..." value={searchTerm} onValueChange={setSearchTerm} />
                            <CommandList>
                                <CommandEmpty>Nie znaleziono posiłku.</CommandEmpty>
                                {categories.map((category) => {
                                    const categoryMeals = meals.filter(m => (m.category || 'Breakfast') === category);
                                    if (categoryMeals.length === 0) return null;

                                    // Filtrujemy ręcznie, bo domyślne filtrowanie nie współpracuje ze zwijanymi grupami.
                                    const filteredMeals = categoryMeals.filter(meal =>
                                        meal.name.toLowerCase().includes(searchTerm.toLowerCase())
                                    );

                                    if (filteredMeals.length === 0 && searchTerm) return null;

                                    const isCollapsed = collapsedCategories[category] && !searchTerm;

                                    return (
                                        <CommandGroup key={category} heading={
                                            <div
                                                className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                                                onClick={(e) => toggleCategory(category, e)}
                                            >
                                                {isCollapsed ? <ChevronRight className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
                                                {MEAL_TYPE_LABELS[category]}
                                            </div>
                                        }>
                                            {!isCollapsed && filteredMeals.map(meal => (
                                                <CommandItem
                                                    key={meal._id}
                                                    value={meal.name}
                                                    onSelect={() => {
                                                        setSelectedMealId(meal._id);
                                                        setOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedMealId === meal._id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {meal.name} ({meal.totalCalories.toFixed(0)} kcal)
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    );
                                })}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <Label>Godzina (Opcjonalnie)</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>

            <Button type="button" onClick={handleAdd} disabled={!selectedMealId} className="w-full">
                Dodaj do Dnia
            </Button>
        </div>
    );
}
