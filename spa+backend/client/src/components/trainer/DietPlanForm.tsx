'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Save, Clock, Check, ChevronsUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SavedMeal {
    _id: string;
    name: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    category?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
}

interface DietDay {
    dayNumber: number;
    meals: {
        savedMealId: string;
        mealName: string; // For display
        type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
        time?: string;
        macros: {
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
        };
    }[];
}

interface DietPlanFormProps {
    initialData?: {
        _id?: string;
        name: string;
        description?: string;
        days: DietDay[];
    };
}

export default function DietPlanForm({ initialData }: DietPlanFormProps) {
    const router = useRouter();
    const [dietName, setDietName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [days, setDays] = useState<DietDay[]>(initialData?.days || [{ dayNumber: 1, meals: [] }]);
    const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
    const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false);
    const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);
    const isEdit = !!initialData?._id;

    useEffect(() => {
        fetchMeals();
    }, []);

    const fetchMeals = async () => {
        try {
            const res = await fetch('/api/trainer/meals');
            const data = await res.json();
            if (data.meals) {
                setSavedMeals(data.meals);
            }
        } catch (error) {
            console.error('Error fetching meals:', error);
            toast({ title: 'Błąd', description: 'Nie udało się pobrać zapisanych posiłków', variant: 'destructive' });
        }
    };

    const addDay = () => {
        setDays([...days, { dayNumber: days.length + 1, meals: [] }]);
    };

    const removeDay = (index: number) => {
        if (days.length === 1) return;
        const newDays = days.filter((_, i) => i !== index).map((day, i) => ({ ...day, dayNumber: i + 1 }));
        setDays(newDays);
    };

    const openMealSelector = (dayIndex: number) => {
        setCurrentDayIndex(dayIndex);
        setIsMealSelectorOpen(true);
    };

    const addMealToDay = (meal: SavedMeal, type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack', time: string) => {
        if (currentDayIndex === null) return;

        const newDays = [...days];
        newDays[currentDayIndex].meals.push({
            savedMealId: meal._id,
            mealName: meal.name,
            type,
            time,
            macros: {
                calories: meal.totalCalories,
                protein: meal.totalProtein,
                carbs: meal.totalCarbs,
                fat: meal.totalFat,
            },
        });
        setDays(newDays);
        setIsMealSelectorOpen(false);
        toast({ title: 'Dodano', description: `${meal.name} dodano do Dnia ${days[currentDayIndex].dayNumber}` });
    };

    const removeMealFromDay = (dayIndex: number, mealIndex: number) => {
        const newDays = [...days];
        newDays[dayIndex].meals.splice(mealIndex, 1);
        setDays(newDays);
    };

    const handleSaveDiet = async () => {
        if (!dietName) {
            toast({ title: 'Błąd', description: 'Proszę podać nazwę diety', variant: 'destructive' });
            return;
        }

        const hasMeals = days.some(d => d.meals.length > 0);
        if (!hasMeals) {
            toast({ title: 'Ostrzeżenie', description: 'Twoja dieta nie ma posiłków. Jesteś pewien?', variant: 'destructive' });
        }

        try {
            const url = isEdit
                ? `/api/trainer/diets/${initialData._id}`
                : '/api/trainer/diets';

            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: dietName,
                    description,
                    days: days.map(d => ({
                        dayNumber: d.dayNumber,
                        meals: d.meals.map(m => ({
                            savedMealId: m.savedMealId,
                            type: m.type,
                            time: m.time
                        }))
                    })),
                }),
            });

            if (res.ok) {
                toast({ title: 'Sukces', description: `Plan diety ${isEdit ? 'zaktualizowany' : 'zapisany'} pomyślnie` });
                router.push('/trainer/diet/plans');
                router.refresh();
            } else {
                toast({ title: 'Błąd', description: 'Nie udało się zapisać planu diety', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Save error:', error);
            toast({ title: 'Błąd', description: 'Nie udało się zapisać planu diety', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{isEdit ? 'Edytuj Plan Dietetyczny' : 'Utwórz Plan Dietetyczny'}</h1>
                <Button onClick={handleSaveDiet} className="gap-2">
                    <Save className="w-4 h-4" /> {isEdit ? 'Zaktualizuj Plan' : 'Zapisz Plan'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Szczegóły Planu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nazwa Diety</Label>
                        <Input value={dietName} onChange={(e) => setDietName(e.target.value)} placeholder="np. Plan Redukcyjny 4 Tygodnie" />
                    </div>
                    <div className="space-y-2">
                        <Label>Opis</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Krótki opis planu diety..." />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold">Dni</h2>
                    <Button onClick={addDay} variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" /> Dodaj Dzień
                    </Button>
                </div>

                {days.map((day, dayIndex) => (
                    <Card key={dayIndex}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Dzień {day.dayNumber}</CardTitle>
                            {days.length > 1 && (
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeDay(dayIndex)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {day.meals.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">Brak dodanych posiłków.</p>
                            ) : (
                                <div className="space-y-2">
                                    {day.meals.map((meal, mealIndex) => (
                                        <div key={mealIndex} className="flex justify-between items-center p-3 border rounded bg-card">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-primary/10 p-2 rounded text-primary font-bold text-xs w-20 text-center">
                                                    {meal.type === 'Breakfast' ? 'Śniadanie' :
                                                        meal.type === 'Lunch' ? 'Obiad' :
                                                            meal.type === 'Dinner' ? 'Kolacja' : 'Przekąska'}
                                                    {meal.time && <div className="font-normal text-[10px] flex items-center justify-center gap-1 mt-1"><Clock className="w-3 h-3" /> {meal.time}</div>}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{meal.mealName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {meal.macros.calories.toFixed(0)} kcal | B: {meal.macros.protein.toFixed(0)} | W: {meal.macros.carbs.toFixed(0)} | T: {meal.macros.fat.toFixed(0)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeMealFromDay(dayIndex, mealIndex)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Button variant="secondary" size="sm" className="w-full" onClick={() => openMealSelector(dayIndex)}>
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
                        onSelect={(meal, type, time) => addMealToDay(meal, type, time)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function MealSelector({ meals, onSelect }: { meals: SavedMeal[], onSelect: (meal: SavedMeal, type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack', time: string) => void }) {
    const [selectedMealId, setSelectedMealId] = useState<string>('');
    const [time, setTime] = useState('08:00');
    const [open, setOpen] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

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

                                    // Filter based on search term manually since we disabled default filtering to handle collapsed states
                                    const filteredMeals = categoryMeals.filter(meal =>
                                        meal.name.toLowerCase().includes(searchTerm.toLowerCase())
                                    );

                                    if (filteredMeals.length === 0 && searchTerm) return null;

                                    const isCollapsed = collapsedCategories[category] && !searchTerm;
                                    const categoryLabel = category === 'Breakfast' ? 'Śniadanie' :
                                        category === 'Lunch' ? 'Obiad' :
                                            category === 'Dinner' ? 'Kolacja' : 'Przekąska';

                                    return (
                                        <CommandGroup key={category} heading={
                                            <div
                                                className="flex items-center cursor-pointer hover:text-foreground transition-colors"
                                                onClick={(e) => toggleCategory(category, e)}
                                            >
                                                {isCollapsed ? <ChevronRight className="mr-1 h-3 w-3" /> : <ChevronDown className="mr-1 h-3 w-3" />}
                                                {categoryLabel}
                                            </div>
                                        }>
                                            {!isCollapsed && filteredMeals.map(meal => (
                                                <CommandItem
                                                    key={meal._id}
                                                    value={meal.name} // Use name for search if we were using default filter, but here it acts as ID for selection mostly
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

            <Button onClick={handleAdd} disabled={!selectedMealId} className="w-full">
                Dodaj do Dnia
            </Button>
        </div>
    );
}
