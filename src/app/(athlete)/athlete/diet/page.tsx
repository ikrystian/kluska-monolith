'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Loader2, Trash2, ChevronDown, ChefHat, Wheat, Beef, Drumstick, Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useCreateDoc, useDeleteDoc } from '@/lib/db-hooks';
import type { FoodItem, MealType } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchFood } from '@/ai/flows/fatsecret-flow';
import { Skeleton } from '@/components/ui/skeleton';

interface FatSecretServing {
    food_name: string;
    serving_id: string;
    serving_description: string;
    calories: string;
    protein: string;
    carbohydrate: string;
    fat: string;
}

const foodItemSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana."),
  calories: z.coerce.number().min(0, "Wartość musi być nieujemna."),
  protein: z.coerce.number().min(0, "Wartość musi być nieujemna."),
  carbs: z.coerce.number().min(0, "Wartość musi być nieujemna."),
  fat: z.coerce.number().min(0, "Wartość musi być nieujemna."),
});

const addMealSchema = z.object({
  type: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  foodItems: z.array(foodItemSchema).min(1, 'Posiłek musi zawierać co najmniej jeden produkt.'),
});

type AddMealFormValues = z.infer<typeof addMealSchema>;

const MEAL_ICONS: Record<MealType, React.ElementType> = {
  Breakfast: Wheat,
  Lunch: ChefHat,
  Dinner: Drumstick,
  Snack: Beef,
};

interface Meal {
    id: string;
    ownerId: string;
    trainerId?: string;
    date: string;
    type: MealType;
    foodItems: FoodItem[];
}

interface NutritionGoal {
  id: string;
  ownerId: string;
  trainerId?: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
}

function MealHistory() {
    const { user } = useUser();
    const { deleteDoc } = useDeleteDoc();
    const { toast } = useToast();

    const { startOfToday, endOfToday } = useMemo(() => {
        const today = new Date();
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));
        return { startOfToday, endOfToday };
    }, []);

    const { data: meals, isLoading, refetch } = useCollection<Meal>(
        user ? 'meals' : null,
        user ? { ownerId: user.uid } : undefined,
        { sort: { date: -1 }, limit: 50 }
    );

    const { data: goals } = useCollection<NutritionGoal>(
        user ? 'nutritiongoals' : null,
        user ? { ownerId: user.uid, isActive: true } : undefined,
        { sort: { createdAt: -1 }, limit: 1 }
    );

    const currentGoal = goals && goals.length > 0 ? goals[0] : null;

    const todaysMeals = useMemo(() => {
        if (!meals) return [];
        return meals.filter(meal => {
            const mealDate = new Date(meal.date);
            return mealDate >= startOfToday && mealDate <= endOfToday;
        });
    }, [meals, startOfToday, endOfToday]);

    const totalNutrition = useMemo(() => {
        return todaysMeals?.reduce((totals, meal) => {
            meal.foodItems.forEach(item => {
                totals.calories += item.calories;
                totals.protein += item.protein;
                totals.carbs += item.carbs;
                totals.fat += item.fat;
            });
            return totals;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [todaysMeals]);

    const handleDeleteMeal = async (mealId: string) => {
        try {
            await deleteDoc('meals', mealId);
            toast({
                title: 'Posiłek usunięty',
                description: 'Posiłek został pomyślnie usunięty.',
            });
            refetch();
        } catch (error) {
            toast({
                title: 'Błąd',
                description: 'Nie udało się usunąć posiłku.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Dzisiejsze podsumowanie</CardTitle>
                <CardDescription>{format(new Date(), 'd MMMM yyyy', { locale: pl })}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <p>Ładowanie posiłków...</p>}
                {!isLoading && (!todaysMeals || todaysMeals.length === 0) && <p className="text-muted-foreground">Brak zapisanych posiłków na dziś.</p>}

                {totalNutrition && todaysMeals && todaysMeals.length > 0 && (
                     <div className="space-y-4 mb-6">
                        {currentGoal && (
                            <div className="p-4 bg-primary/10 rounded-lg">
                                <p className="text-sm font-semibold mb-2">Twoje Cele Żywieniowe</p>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-muted-foreground">
                                    <div>Cel: {currentGoal.dailyCalories} kcal</div>
                                    <div>Cel: {currentGoal.dailyProtein}g białka</div>
                                    <div>Cel: {currentGoal.dailyCarbs}g węgl.</div>
                                    <div>Cel: {currentGoal.dailyFat}g tłuszczu</div>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-secondary/50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Kalorie</p>
                                <p className="text-2xl font-bold">{totalNutrition.calories.toFixed(0)}</p>
                                {currentGoal && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {((totalNutrition.calories / currentGoal.dailyCalories) * 100).toFixed(0)}% celu
                                    </p>
                                )}
                            </div>
                            <div className="p-4 bg-secondary/50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Białko</p>
                                <p className="text-2xl font-bold">{totalNutrition.protein.toFixed(0)}g</p>
                                {currentGoal && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {((totalNutrition.protein / currentGoal.dailyProtein) * 100).toFixed(0)}% celu
                                    </p>
                                )}
                            </div>
                            <div className="p-4 bg-secondary/50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Węglowodany</p>
                                <p className="text-2xl font-bold">{totalNutrition.carbs.toFixed(0)}g</p>
                                {currentGoal && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {((totalNutrition.carbs / currentGoal.dailyCarbs) * 100).toFixed(0)}% celu
                                    </p>
                                )}
                            </div>
                            <div className="p-4 bg-secondary/50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Tłuszcze</p>
                                <p className="text-2xl font-bold">{totalNutrition.fat.toFixed(0)}g</p>
                                {currentGoal && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {((totalNutrition.fat / currentGoal.dailyFat) * 100).toFixed(0)}% celu
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                {todaysMeals?.map(meal => {
                    const mealNutrition = meal.foodItems.reduce((totals, item) => {
                        totals.calories += item.calories;
                        totals.protein += item.protein;
                        return totals;
                    }, { calories: 0, protein: 0 });
                    const Icon = MEAL_ICONS[meal.type];

                    return (
                        <Collapsible key={meal.id} className="border rounded-lg">
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-secondary/50 rounded-t-lg">
                               <div className="flex items-center gap-3">
                                <Icon className="h-6 w-6 text-primary"/>
                                <div>
                                    <p className="font-semibold">{meal.type}</p>
                                    <p className="text-sm text-muted-foreground">{mealNutrition.calories.toFixed(0)} kcal · {mealNutrition.protein.toFixed(0)}g białka</p>
                                </div>
                               </div>
                                <ChevronDown className="h-4 w-4" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <ul className="p-4 pt-0 space-y-2">
                                    {meal.foodItems.map((item, index) => (
                                        <li key={index} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                                            <span>{item.name}</span>
                                            <span className="text-muted-foreground">{item.calories.toFixed(0)} kcal</span>
                                        </li>
                                    ))}
                                    <li className="pt-2 flex justify-end">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteMeal(meal.id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Usuń posiłek
                                        </Button>
                                    </li>
                                </ul>
                            </CollapsibleContent>
                        </Collapsible>
                    )
                })}
                </div>
            </CardContent>
        </Card>
    )
}

function SearchFoodItemForm({ onAdd }: { onAdd: (item: FoodItem) => void }) {
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FatSecretServing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
    const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
  
      setIsLoading(true);
      setError(null);
      setResults([]);
  
      try {
        const searchResult = await searchFood(query);
        setResults(searchResult);
        if (searchResult.length === 0) {
            toast({ title: 'Brak wyników', description: 'Nie znaleziono produktów pasujących do zapytania.' });
        }
      } catch (err: any) {
        setError(err.message || 'Wystąpił nieoczekiwany błąd.');
        toast({
          title: 'Błąd Wyszukiwania',
          description: err.message || 'Nie udało się wyszukać produktów.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleAdd = (serving: FatSecretServing) => {
        const foodItem: FoodItem = {
            name: `${serving.food_name} (${serving.serving_description})`,
            calories: parseFloat(serving.calories) || 0,
            protein: parseFloat(serving.protein) || 0,
            carbs: parseFloat(serving.carbohydrate) || 0,
            fat: parseFloat(serving.fat) || 0,
        };
        onAdd(foodItem);
        toast({
            title: 'Produkt dodany',
            description: `${foodItem.name} został dodany do listy.`,
        });
        setResults([]);
        setQuery('');
    }
  
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Wyszukaj Produkt (zamiast dodawać ręcznie)</h3>
        <div className="flex items-start gap-2">
            <Input 
                placeholder="np. pierś z kurczaka 100g"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
            />
            <Button type="button" onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
            </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        
        {isLoading && (
            <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )}

        {results.length > 0 && (
            <ScrollArea className="h-48">
                <div className="space-y-2 pr-4">
                    {results.map((serving) => (
                        <div key={serving.serving_id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/50 p-2 text-sm">
                            <div className="flex-1">
                                <p className="font-medium">{serving.food_name}</p>
                                <p className="text-xs text-muted-foreground">{serving.serving_description} - {serving.calories} kcal</p>
                            </div>
                            <Button type="button" size="sm" onClick={() => handleAdd(serving)}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Dodaj
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )}
      </div>
    );
  }

export default function DietPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { createDoc, isLoading: isCreating } = useCreateDoc();

  const form = useForm<AddMealFormValues>({
    resolver: zodResolver(addMealSchema),
    defaultValues: {
      type: 'Breakfast',
      foodItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'foodItems',
  });

  const onSubmit = async (data: AddMealFormValues) => {
    if (!user) return;

    try {
      await createDoc('meals', {
        ownerId: user.uid,
        date: new Date(),
        type: data.type,
        foodItems: data.foodItems,
      });

      toast({
        title: 'Posiłek Zapisany!',
        description: `${data.type} został dodany do Twojego dziennika.`,
      });
      form.reset({ type: 'Breakfast', foodItems: [] });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać posiłku.',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const totalNutrition = form.watch('foodItems').reduce(
    (totals, item) => {
      totals.calories += item.calories;
      totals.protein += item.protein;
      totals.carbs += item.carbs;
      totals.fat += item.fat;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Dziennik Żywieniowy</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle className="font-headline">Dodaj Posiłek</CardTitle>
                <CardDescription>
                  Wyszukaj produkty za pomocą FatSecret API lub dodaj je ręcznie, a następnie zapisz posiłek.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SearchFoodItemForm onAdd={(item) => append(item)} />
                
                <div className="space-y-3 rounded-lg border p-4">
                    <h3 className="font-semibold text-lg">Aktualny Posiłek</h3>
                    {fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Brak produktów. Dodaj coś, aby rozpocząć.</p>
                    ) : (
                        <ScrollArea className="h-48">
                            <div className="space-y-2 pr-4">
                                {fields.map((item, index) => (
                                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/50 p-2">
                                    <div className="flex-1">
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                        {item.calories.toFixed(0)} kcal | B: {item.protein.toFixed(0)}g | W: {item.carbs.toFixed(0)}g | T: {item.fat.toFixed(0)}g
                                        </p>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>

                {fields.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rodzaj posiłku</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz rodzaj posiłku" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Breakfast">Śniadanie</SelectItem>
                              <SelectItem value="Lunch">Obiad</SelectItem>
                              <SelectItem value="Dinner">Kolacja</SelectItem>
                              <SelectItem value="Snack">Przekąska</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="p-4 bg-primary/10 rounded-lg text-center">
                        <p className="text-sm font-medium text-primary">Suma Kalorii</p>
                        <p className="text-2xl font-bold text-primary">{totalNutrition.calories.toFixed(0)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={fields.length === 0 || isCreating}>
                   {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Zapisz Posiłek
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
        <MealHistory />
      </div>
    </div>
  );
}
