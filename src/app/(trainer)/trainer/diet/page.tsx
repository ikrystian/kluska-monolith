'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Loader2, Trash2, Search, ChefHat, Wheat, Beef, Drumstick } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useCreateDoc } from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchFood } from '@/ai/flows/fatsecret-flow';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface FatSecretServing {
    food_name: string;
    serving_id: string;
    serving_description: string;
    calories: string;
    protein: string;
    carbohydrate: string;
    fat: string;
}

interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Athlete {
  id: string;
  name: string;
  email: string;
}

const foodItemSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana."),
  calories: z.coerce.number().min(0, "Wartość musi być nieujemna."),
  protein: z.coerce.number().min(0, "Wartość musi być nieujemna."),
  carbs: z.coerce.number().min(0, "Wartość musi być nieujemna."),
  fat: z.coerce.number().min(0, "Wartość musi być nieujemna."),
});

const createDietSchema = z.object({
  athleteId: z.string().min(1, "Wybierz sportowca."),
  type: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack']),
  foodItems: z.array(foodItemSchema).min(1, 'Dieta musi zawierać co najmniej jeden produkt.'),
});

type CreateDietFormValues = z.infer<typeof createDietSchema>;

const MEAL_ICONS: Record<string, React.ElementType> = {
  Breakfast: Wheat,
  Lunch: ChefHat,
  Dinner: Drumstick,
  Snack: Beef,
};

function SearchFoodItemForm({ onAdd }: { onAdd: (item: FoodItem) => void }) {
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<FatSecretServing[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        try {
            const servings = await searchFood(query);
            setResults(servings);
        } catch (err) {
            setError('Błąd podczas wyszukiwania. Spróbuj ponownie.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    const handleAdd = (serving: FatSecretServing) => {
        const foodItem: FoodItem = {
            name: serving.food_name,
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

export default function TrainerDietPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { createDoc, isLoading: isCreating } = useCreateDoc();

  // Fetch trainer's athletes
  const { data: athletes, isLoading: athletesLoading } = useCollection<Athlete>(
    user ? 'users' : null,
    user ? { trainerId: user.uid, role: 'athlete' } : undefined
  );

  const form = useForm<CreateDietFormValues>({
    resolver: zodResolver(createDietSchema),
    defaultValues: {
      athleteId: '',
      type: 'Breakfast',
      foodItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'foodItems',
  });

  const totalNutrition = useMemo(() => {
    return fields.reduce((totals, item) => {
      totals.calories += item.calories;
      totals.protein += item.protein;
      totals.carbs += item.carbs;
      totals.fat += item.fat;
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [fields]);

  const onSubmit = async (data: CreateDietFormValues) => {
    if (!user) return;

    try {
      await createDoc('meals', {
        ownerId: data.athleteId,
        trainerId: user.uid,
        date: new Date(),
        type: data.type,
        foodItems: data.foodItems,
      });

      toast({
        title: 'Dieta Zapisana!',
        description: `${data.type} został dodany dla sportowca.`,
      });
      form.reset({ athleteId: '', type: 'Breakfast', foodItems: [] });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać diety.',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const selectedAthleteId = form.watch('athleteId');
  const selectedMealType = form.watch('type');
  const MealIcon = MEAL_ICONS[selectedMealType] || ChefHat;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Zarządzanie Dietami Sportowców</h1>
      
      {athletesLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : !athletes || athletes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Nie masz przypisanych sportowców.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <MealIcon className="h-5 w-5" />
                    Dodaj Dietę
                  </CardTitle>
                  <CardDescription>
                    Wyszukaj produkty za pomocą FatSecret API lub dodaj je ręcznie.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="athleteId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sportowiec</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz sportowca" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {athletes.map((athlete) => (
                              <SelectItem key={athlete.id} value={athlete.id}>
                                {athlete.name} ({athlete.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typ Posiłku</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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

                  <SearchFoodItemForm onAdd={(item) => append(item)} />
                  
                  <div className="space-y-3 rounded-lg border p-4">
                    <h3 className="font-semibold text-lg">Aktualna Dieta</h3>
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="w-full grid grid-cols-4 gap-2 text-sm">
                    <div className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Kalorie</p>
                      <p className="font-bold">{totalNutrition.calories.toFixed(0)}</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Białko</p>
                      <p className="font-bold">{totalNutrition.protein.toFixed(0)}g</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Węglowodany</p>
                      <p className="font-bold">{totalNutrition.carbs.toFixed(0)}g</p>
                    </div>
                    <div className="rounded-lg bg-primary/10 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Tłuszcze</p>
                      <p className="font-bold">{totalNutrition.fat.toFixed(0)}g</p>
                    </div>
                  </div>
                  <Button type="submit" disabled={isCreating || fields.length === 0} className="w-full">
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Zapisz Dietę
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Instrukcje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Jak korzystać z tej strony:</h4>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Wybierz sportowca z listy</li>
                  <li>Wybierz typ posiłku (śniadanie, obiad, kolacja, przekąska)</li>
                  <li>Wyszukaj produkty za pomocą FatSecret API lub dodaj je ręcznie</li>
                  <li>Przejrzyj podsumowanie wartości odżywczych</li>
                  <li>Kliknij "Zapisz Dietę" aby dodać posiłek dla sportowca</li>
                </ol>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Wyszukiwanie produktów:</h4>
                <p className="text-muted-foreground">
                  Wpisz nazwę produktu (np. "pierś z kurczaka 100g") i kliknij szukaj. System wyszuka produkty z bazy FatSecret API.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

