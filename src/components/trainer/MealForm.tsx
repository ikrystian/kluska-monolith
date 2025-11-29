'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Ingredient {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    source: 'fatsecret' | 'manual';
    fatSecretId?: string;
    amount: number;
    unit: string;
    baseValues: {
        amount: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
}

interface MealFormProps {
    initialData?: {
        _id?: string;
        name: string;
        ingredients: Ingredient[];
        category?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    };
}

export default function MealForm({ initialData }: MealFormProps) {
    const router = useRouter();
    const [mealName, setMealName] = useState(initialData?.name || '');
    const [category, setCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>(initialData?.category || 'Breakfast');
    const [ingredients, setIngredients] = useState<Ingredient[]>(initialData?.ingredients || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const isEdit = !!initialData?._id;

    // Manual entry form
    const { register, handleSubmit, reset } = useForm<Ingredient>();

    const handleSearch = async () => {
        if (!searchQuery) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/fatsecret/search?query=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data.foods) {
                setSearchResults(data.foods);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            toast({ title: 'Błąd', description: 'Nie udało się wyszukać produktów', variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };

    const addFatSecretFood = async (food: any) => {
        try {
            let servings = food.servings?.serving;

            // If not present in search result, fetch details
            if (!servings) {
                const res = await fetch(`/api/fatsecret/search?foodId=${food.food_id}`);
                const data = await res.json();
                servings = data.servings;
            }

            if (servings) {
                // Default to the first serving or let user choose (simplified for now)
                const serving = Array.isArray(servings) ? servings[0] : servings;
                const baseAmount = parseFloat(serving.metric_serving_amount || '100');

                const newIngredient: Ingredient = {
                    name: food.food_name,
                    calories: parseFloat(serving.calories),
                    protein: parseFloat(serving.protein),
                    carbs: parseFloat(serving.carbohydrate),
                    fat: parseFloat(serving.fat),
                    source: 'fatsecret',
                    fatSecretId: food.food_id,
                    amount: baseAmount,
                    unit: serving.metric_serving_unit || 'g',
                    baseValues: {
                        amount: baseAmount,
                        calories: parseFloat(serving.calories),
                        protein: parseFloat(serving.protein),
                        carbs: parseFloat(serving.carbohydrate),
                        fat: parseFloat(serving.fat),
                    }
                };
                setIngredients([...ingredients, newIngredient]);
                toast({ title: 'Dodano', description: `${food.food_name} dodano do posiłku.` });
            } else {
                toast({ title: 'Błąd', description: 'Brak informacji o porcji', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Add food error:', error);
            toast({ title: 'Błąd', description: 'Nie udało się pobrać szczegółów produktu', variant: 'destructive' });
        }
    };

    const onManualSubmit = async (data: any) => {
        // Assume manual entry is for 100g if not specified
        const amount = data.amount || 100;
        const unit = data.unit || 'g';

        // Save to DB
        try {
            const res = await fetch('/api/trainer/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    calories: data.calories,
                    protein: data.protein,
                    carbs: data.carbs,
                    fat: data.fat,
                    unit: unit
                })
            });

            if (res.ok) {
                toast({ title: 'Zapisano', description: 'Produkt został zapisany w Twojej bazie.' });
            }
        } catch (error) {
            console.error('Failed to save custom product', error);
        }

        const newIngredient: Ingredient = {
            name: data.name,
            calories: data.calories,
            protein: data.protein,
            carbs: data.carbs,
            fat: data.fat,
            source: 'manual',
            amount: amount,
            unit: unit,
            baseValues: {
                amount: amount,
                calories: data.calories,
                protein: data.protein,
                carbs: data.carbs,
                fat: data.fat,
            }
        };

        setIngredients([...ingredients, newIngredient]);
        reset();
        toast({ title: 'Dodano', description: 'Składnik dodany ręcznie.' });
    };

    const removeIngredient = (index: number) => {
        const newIngredients = [...ingredients];
        newIngredients.splice(index, 1);
        setIngredients(newIngredients);
    };

    const handleAmountChange = (index: number, newAmount: string) => {
        const amount = parseFloat(newAmount);
        if (isNaN(amount) || amount < 0) return;

        const newIngredients = [...ingredients];
        const ingredient = newIngredients[index];
        const ratio = amount / ingredient.baseValues.amount;

        ingredient.amount = amount;
        ingredient.calories = ingredient.baseValues.calories * ratio;
        ingredient.protein = ingredient.baseValues.protein * ratio;
        ingredient.carbs = ingredient.baseValues.carbs * ratio;
        ingredient.fat = ingredient.baseValues.fat * ratio;

        setIngredients(newIngredients);
    };

    const calculateTotals = () => {
        return ingredients.reduce(
            (acc, curr) => ({
                calories: acc.calories + (curr.calories || 0),
                protein: acc.protein + (curr.protein || 0),
                carbs: acc.carbs + (curr.carbs || 0),
                fat: acc.fat + (curr.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    };

    const totals = calculateTotals();

    const handleSaveMeal = async () => {
        if (!mealName) {
            toast({ title: 'Błąd', description: 'Proszę podać nazwę posiłku', variant: 'destructive' });
            return;
        }
        if (ingredients.length === 0) {
            toast({ title: 'Błąd', description: 'Proszę dodać przynajmniej jeden składnik', variant: 'destructive' });
            return;
        }

        try {
            const url = isEdit
                ? `/api/trainer/meals/${initialData._id}`
                : '/api/trainer/meals';

            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: mealName,
                    ingredients,
                    totalCalories: totals.calories,
                    totalProtein: totals.protein,
                    totalCarbs: totals.carbs,
                    totalFat: totals.fat,
                    category,
                }),
            });

            if (res.ok) {
                toast({ title: 'Sukces', description: `Posiłek ${isEdit ? 'zaktualizowany' : 'zapisany'} pomyślnie` });
                router.push('/trainer/diet/meals'); // Redirect to list
                router.refresh();
            } else {
                toast({ title: 'Błąd', description: 'Nie udało się zapisać posiłku', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Save error:', error);
            toast({ title: 'Błąd', description: 'Nie udało się zapisać posiłku', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{isEdit ? 'Edytuj Posiłek' : 'Utwórz Nowy Posiłek'}</h1>
                <Button onClick={handleSaveMeal} className="gap-2">
                    <Save className="w-4 h-4" /> {isEdit ? 'Zaktualizuj Posiłek' : 'Zapisz Posiłek'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Add Ingredients */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dodaj Składniki</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="search">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="search">Szukaj w FatSecret</TabsTrigger>
                                    <TabsTrigger value="manual">Ręczne Wprowadzanie</TabsTrigger>
                                </TabsList>

                                <TabsContent value="search" className="space-y-4">
                                    <div className="flex gap-2 relative">
                                        <div className="relative w-full">
                                            <Input
                                                placeholder="Szukaj produktu (np. Chicken Breast)"
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    if (e.target.value.length > 2) {
                                                        const query = encodeURIComponent(e.target.value);

                                                        // Fetch both local and FatSecret suggestions
                                                        Promise.all([
                                                            fetch(`/api/trainer/products?query=${query}`).then(res => res.json()),
                                                            fetch(`/api/fatsecret/search?query=${query}&autocomplete=true`).then(res => res.json())
                                                        ]).then(([localData, fatSecretData]) => {
                                                            let combinedResults: any[] = [];

                                                            // Add Local Results
                                                            if (localData.products) {
                                                                combinedResults = [...combinedResults, ...localData.products.map((p: any) => ({
                                                                    ...p,
                                                                    food_name: p.name,
                                                                    food_description: `${p.calories} kcal | B: ${p.protein} | W: ${p.carbs} | T: ${p.fat}`,
                                                                    isLocal: true,
                                                                    isSuggestion: false // Local products are full items, not just suggestions
                                                                }))];
                                                            }

                                                            // Add FatSecret Suggestions
                                                            if (fatSecretData.suggestions) {
                                                                combinedResults = [...combinedResults, ...fatSecretData.suggestions.map((s: string) => ({
                                                                    food_name: s,
                                                                    isSuggestion: true,
                                                                    isLocal: false
                                                                }))];
                                                            }

                                                            setSearchResults(combinedResults);
                                                        });
                                                    }
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            />
                                        </div>
                                        <Button onClick={handleSearch} disabled={isSearching}>
                                            {isSearching ? 'Szukanie...' : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {searchResults.map((item, idx) => (
                                            <div key={idx} className={`flex justify-between items-center p-3 border rounded hover:bg-accent cursor-pointer ${item.isLocal ? 'bg-green-50/50 border-green-200' : ''}`}
                                                onClick={() => {
                                                    if (item.isSuggestion) {
                                                        setSearchQuery(item.food_name);
                                                        handleSearch(); // Trigger full search for FatSecret suggestion
                                                    } else if (item.isLocal) {
                                                        // Directly add local product
                                                        const baseAmount = 100; // Default for local products
                                                        const newIngredient: Ingredient = {
                                                            name: item.name,
                                                            calories: item.calories,
                                                            protein: item.protein,
                                                            carbs: item.carbs,
                                                            fat: item.fat,
                                                            source: 'manual', // Treat as manual/custom
                                                            amount: baseAmount,
                                                            unit: item.unit || 'g',
                                                            baseValues: {
                                                                amount: baseAmount,
                                                                calories: item.calories,
                                                                protein: item.protein,
                                                                carbs: item.carbs,
                                                                fat: item.fat,
                                                            }
                                                        };
                                                        setIngredients([...ingredients, newIngredient]);
                                                        toast({ title: 'Dodano', description: `${item.name} dodano do posiłku.` });
                                                    }
                                                }}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">{item.food_name}</p>
                                                        {item.isLocal && <span className="text-[10px] bg-green-100 text-green-800 px-1 rounded">Moje</span>}
                                                    </div>
                                                    {!item.isSuggestion && <p className="text-sm text-muted-foreground">{item.food_description}</p>}
                                                </div>
                                                {!item.isSuggestion && (
                                                    <Button size="sm" variant="outline" onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (item.isLocal) {
                                                            // Duplicate logic from onClick above, refactor ideally
                                                            const baseAmount = 100;
                                                            const newIngredient: Ingredient = {
                                                                name: item.name,
                                                                calories: item.calories,
                                                                protein: item.protein,
                                                                carbs: item.carbs,
                                                                fat: item.fat,
                                                                source: 'manual',
                                                                amount: baseAmount,
                                                                unit: item.unit || 'g',
                                                                baseValues: {
                                                                    amount: baseAmount,
                                                                    calories: item.calories,
                                                                    protein: item.protein,
                                                                    carbs: item.carbs,
                                                                    fat: item.fat,
                                                                }
                                                            };
                                                            setIngredients([...ingredients, newIngredient]);
                                                            toast({ title: 'Dodano', description: `${item.name} dodano do posiłku.` });
                                                        } else {
                                                            addFatSecretFood(item);
                                                        }
                                                    }}>
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {item.isSuggestion && (
                                                    <Button size="sm" variant="ghost" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSearchQuery(item.food_name);
                                                        handleSearch();
                                                    }}>
                                                        <Search className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {searchResults.length === 0 && !isSearching && searchQuery && (
                                            <p className="text-center text-muted-foreground py-4">Brak wyników.</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="manual">
                                    <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Nazwa</Label>
                                                <Input {...register('name', { required: true })} placeholder="Nazwa składnika" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Ilość</Label>
                                                <div className="flex gap-2">
                                                    <Input type="number" step="0.1" {...register('amount', { valueAsNumber: true })} placeholder="100" defaultValue={100} />
                                                    <Input {...register('unit')} placeholder="g" defaultValue="g" className="w-20" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Kalorie</Label>
                                                <Input type="number" step="0.1" {...register('calories', { required: true, valueAsNumber: true })} placeholder="kcal" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Białko (g)</Label>
                                                <Input type="number" step="0.1" {...register('protein', { required: true, valueAsNumber: true })} placeholder="g" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Węglowodany (g)</Label>
                                                <Input type="number" step="0.1" {...register('carbs', { required: true, valueAsNumber: true })} placeholder="g" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tłuszcz (g)</Label>
                                                <Input type="number" step="0.1" {...register('fat', { required: true, valueAsNumber: true })} placeholder="g" />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full">Dodaj Składnik</Button>
                                    </form>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Meal Summary */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Szczegóły Posiłku</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nazwa Posiłku</Label>
                                <Input
                                    value={mealName}
                                    onChange={(e) => setMealName(e.target.value)}
                                    placeholder="np. Wysokobiałkowe Śniadanie"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Kategoria</Label>
                                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
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
                                <h3 className="font-semibold">Składniki ({ingredients.length})</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {ingredients.map((ing, idx) => (
                                        <div key={idx} className="flex flex-col p-3 bg-muted rounded gap-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{ing.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {ing.calories.toFixed(1)} kcal | B: {ing.protein.toFixed(1)}g | W: {ing.carbs.toFixed(1)}g | T: {ing.fat.toFixed(1)}g
                                                    </p>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeIngredient(idx)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs">Ilość:</Label>
                                                <Input
                                                    type="number"
                                                    className="h-7 w-20 text-xs"
                                                    value={ing.amount}
                                                    onChange={(e) => handleAmountChange(idx, e.target.value)}
                                                />
                                                <span className="text-xs text-muted-foreground">{ing.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t space-y-2">
                                <div className="flex justify-between font-bold">
                                    <span>Kalorie Całkowite</span>
                                    <span>{totals.calories.toFixed(1)} kcal</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Białko</span>
                                    <span>{totals.protein.toFixed(1)} g</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Węglowodany</span>
                                    <span>{totals.carbs.toFixed(1)} g</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Tłuszcz</span>
                                    <span>{totals.fat.toFixed(1)} g</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
