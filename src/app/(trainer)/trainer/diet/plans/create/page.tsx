'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Save, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SavedMeal {
    _id: string;
    name: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
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

export default function CreateDietPage() {
    const router = useRouter();
    const [dietName, setDietName] = useState('');
    const [description, setDescription] = useState('');
    const [days, setDays] = useState<DietDay[]>([{ dayNumber: 1, meals: [] }]);
    const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
    const [isMealSelectorOpen, setIsMealSelectorOpen] = useState(false);
    const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);

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

        // Validate that at least one day has meals? Maybe not strictly required but good practice.
        const hasMeals = days.some(d => d.meals.length > 0);
        if (!hasMeals) {
            toast({ title: 'Ostrzeżenie', description: 'Twoja dieta nie ma posiłków. Jesteś pewien?', variant: 'destructive' });
            // Allow saving empty diets? Let's say yes for now but warn.
        }

        try {
            const res = await fetch('/api/trainer/diets', {
                method: 'POST',
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
                toast({ title: 'Sukces', description: 'Plan diety zapisany pomyślnie' });
                router.push('/trainer/diet/plans');
            } else {
                toast({ title: 'Błąd', description: 'Nie udało się zapisać planu diety', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Save error:', error);
            toast({ title: 'Błąd', description: 'Nie udało się zapisać planu diety', variant: 'destructive' });
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Utwórz Plan Dietetyczny</h1>
                <Button onClick={handleSaveDiet} className="gap-2">
                    <Save className="w-4 h-4" /> Zapisz Plan
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
    const [type, setType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Breakfast');
    const [time, setTime] = useState('08:00');

    const handleAdd = () => {
        const meal = meals.find(m => m._id === selectedMealId);
        if (meal) {
            onSelect(meal, type, time);
        }
    };

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Posiłek</Label>
                <Select onValueChange={setSelectedMealId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Wybierz zapisany posiłek" />
                    </SelectTrigger>
                    <SelectContent>
                        {meals.map(meal => (
                            <SelectItem key={meal._id} value={meal._id}>
                                {meal.name} ({meal.totalCalories.toFixed(0)} kcal)
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Typ</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Breakfast">Śniadanie</SelectItem>
                            <SelectItem value="Lunch">Obiad</SelectItem>
                            <SelectItem value="Dinner">Kolacja</SelectItem>
                            <SelectItem value="Snack">Przekąska</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Godzina (Opcjonalnie)</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
            </div>

            <Button onClick={handleAdd} disabled={!selectedMealId} className="w-full">
                Dodaj do Dnia
            </Button>
        </div>
    );
}
