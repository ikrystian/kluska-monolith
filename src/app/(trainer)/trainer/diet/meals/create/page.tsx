'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    baseValues: {
        amount: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
}

export default function CreateMealPage() {
    const router = useRouter();
    const [mealName, setMealName] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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
            toast({ title: 'Error', description: 'Failed to search foods', variant: 'destructive' });
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
                toast({ title: 'Added', description: `${food.food_name} added to meal.` });
            } else {
                toast({ title: 'Error', description: 'No serving information found', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Add food error:', error);
            toast({ title: 'Error', description: 'Failed to add food details', variant: 'destructive' });
        }
    };

    const onManualSubmit = (data: any) => {
        // Assume manual entry is for 100g if not specified, but let's add fields for it
        const amount = data.amount || 100;
        const unit = data.unit || 'g';

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
        toast({ title: 'Added', description: 'Manual ingredient added.' });
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
            toast({ title: 'Error', description: 'Please enter a meal name', variant: 'destructive' });
            return;
        }
        if (ingredients.length === 0) {
            toast({ title: 'Error', description: 'Please add at least one ingredient', variant: 'destructive' });
            return;
        }

        try {
            const res = await fetch('/api/trainer/meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: mealName,
                    ingredients,
                    totalCalories: totals.calories,
                    totalProtein: totals.protein,
                    totalCarbs: totals.carbs,
                    totalFat: totals.fat,
                }),
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Meal saved successfully' });
                router.push('/trainer/diet/meals'); // Redirect to list
            } else {
                toast({ title: 'Error', description: 'Failed to save meal', variant: 'destructive' });
            }
        } catch (error) {
            console.error('Save error:', error);
            toast({ title: 'Error', description: 'Failed to save meal', variant: 'destructive' });
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Create New Meal</h1>
                <Button onClick={handleSaveMeal} className="gap-2">
                    <Save className="w-4 h-4" /> Save Meal
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Add Ingredients */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Ingredients</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="search">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="search">Search FatSecret</TabsTrigger>
                                    <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                                </TabsList>

                                <TabsContent value="search" className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Search for food (e.g., Chicken Breast)"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                        <Button onClick={handleSearch} disabled={isSearching}>
                                            {isSearching ? 'Searching...' : <Search className="w-4 h-4" />}
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {searchResults.map((food) => (
                                            <div key={food.food_id} className="flex justify-between items-center p-3 border rounded hover:bg-accent">
                                                <div>
                                                    <p className="font-medium">{food.food_name}</p>
                                                    <p className="text-sm text-muted-foreground">{food.food_description}</p>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => addFatSecretFood(food)}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {searchResults.length === 0 && !isSearching && searchQuery && (
                                            <p className="text-center text-muted-foreground py-4">No results found.</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="manual">
                                    <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Name</Label>
                                                <Input {...register('name', { required: true })} placeholder="Ingredient Name" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Amount</Label>
                                                <div className="flex gap-2">
                                                    <Input type="number" step="0.1" {...register('amount', { valueAsNumber: true })} placeholder="100" defaultValue={100} />
                                                    <Input {...register('unit')} placeholder="g" defaultValue="g" className="w-20" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Calories</Label>
                                                <Input type="number" step="0.1" {...register('calories', { required: true, valueAsNumber: true })} placeholder="kcal" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Protein (g)</Label>
                                                <Input type="number" step="0.1" {...register('protein', { required: true, valueAsNumber: true })} placeholder="g" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Carbs (g)</Label>
                                                <Input type="number" step="0.1" {...register('carbs', { required: true, valueAsNumber: true })} placeholder="g" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Fat (g)</Label>
                                                <Input type="number" step="0.1" {...register('fat', { required: true, valueAsNumber: true })} placeholder="g" />
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full">Add Ingredient</Button>
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
                            <CardTitle>Meal Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Meal Name</Label>
                                <Input
                                    value={mealName}
                                    onChange={(e) => setMealName(e.target.value)}
                                    placeholder="e.g., High Protein Breakfast"
                                />
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-semibold">Ingredients ({ingredients.length})</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {ingredients.map((ing, idx) => (
                                        <div key={idx} className="flex flex-col p-3 bg-muted rounded gap-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{ing.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {ing.calories.toFixed(1)} kcal | P: {ing.protein.toFixed(1)}g | C: {ing.carbs.toFixed(1)}g | F: {ing.fat.toFixed(1)}g
                                                    </p>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeIngredient(idx)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs">Amount:</Label>
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
                                    <span>Total Calories</span>
                                    <span>{totals.calories.toFixed(1)} kcal</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Protein</span>
                                    <span>{totals.protein.toFixed(1)} g</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Carbs</span>
                                    <span>{totals.carbs.toFixed(1)} g</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Fat</span>
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
