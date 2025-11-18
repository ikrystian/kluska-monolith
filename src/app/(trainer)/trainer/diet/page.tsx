'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Loader2, Trash2, Search, ChefHat, Wheat, Beef, Drumstick, Calendar, ChevronDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useCreateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchFood } from '@/ai/flows/fatsecret-flow';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface Meal {
  id: string;
  ownerId: string;
  trainerId?: string;
  date: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
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

function NutritionGoalsManager() {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const { data: athletes, isLoading: athletesLoading } = useCollection<Athlete>(
    user ? 'users' : null,
    user ? { trainerId: user.uid, role: 'athlete' } : undefined
  );

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');

  const { data: goals, isLoading: goalsLoading, refetch } = useCollection<NutritionGoal>(
    selectedAthleteId ? 'nutritiongoals' : null,
    selectedAthleteId ? { ownerId: selectedAthleteId, isActive: true } : undefined,
    { sort: { createdAt: -1 }, limit: 1 }
  );

  const currentGoal = goals && goals.length > 0 ? goals[0] : null;

  const goalSchema = z.object({
    dailyCalories: z.coerce.number().min(0, 'Wartość musi być nieujemna.'),
    dailyProtein: z.coerce.number().min(0, 'Wartość musi być nieujemna.'),
    dailyCarbs: z.coerce.number().min(0, 'Wartość musi być nieujemna.'),
    dailyFat: z.coerce.number().min(0, 'Wartość musi być nieujemna.'),
    notes: z.string().optional(),
  });

  type GoalFormValues = z.infer<typeof goalSchema>;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      dailyCalories: currentGoal?.dailyCalories || 2000,
      dailyProtein: currentGoal?.dailyProtein || 150,
      dailyCarbs: currentGoal?.dailyCarbs || 200,
      dailyFat: currentGoal?.dailyFat || 60,
      notes: currentGoal?.notes || '',
    },
  });

  // Update form when current goal changes
  React.useEffect(() => {
    if (currentGoal) {
      form.reset({
        dailyCalories: currentGoal.dailyCalories,
        dailyProtein: currentGoal.dailyProtein,
        dailyCarbs: currentGoal.dailyCarbs,
        dailyFat: currentGoal.dailyFat,
        notes: currentGoal.notes || '',
      });
    }
  }, [currentGoal, form]);

  const onSubmit = async (data: GoalFormValues) => {
    if (!user || !selectedAthleteId) return;

    try {
      await createDoc('nutritiongoals', {
        ownerId: selectedAthleteId,
        trainerId: user.uid,
        dailyCalories: data.dailyCalories,
        dailyProtein: data.dailyProtein,
        dailyCarbs: data.dailyCarbs,
        dailyFat: data.dailyFat,
        startDate: new Date(),
        isActive: true,
        notes: data.notes,
      });

      toast({
        title: 'Cel żywieniowy zapisany!',
        description: 'Nowe cele żywieniowe zostały ustawione dla sportowca.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać celów żywieniowych.',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  if (athletesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Cele Żywieniowe Sportowców</h2>
        <p className="text-muted-foreground">Ustaw dzienny cel makroskładników dla swoich sportowców</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wybierz Sportowca</CardTitle>
          <CardDescription>Wybierz sportowca, aby ustawić jego cele żywieniowe</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz sportowca" />
            </SelectTrigger>
            <SelectContent>
              {athletes?.map((athlete) => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  {athlete.name} ({athlete.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedAthleteId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle>Ustaw Cele Żywieniowe</CardTitle>
                  <CardDescription>
                    Określ dzienny cel kalorii i makroskładników
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="dailyCalories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dzienny cel kalorii (kcal)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dailyProtein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dzienny cel białka (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dailyCarbs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dzienny cel węglowodanów (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dailyFat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dzienny cel tłuszczów (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notatki (opcjonalne)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Dodatkowe informacje..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Zapisz Cele
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aktualny Cel Żywieniowy</CardTitle>
              <CardDescription>
                {currentGoal ? 'Obecne cele sportowca' : 'Brak ustawionych celów'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : currentGoal ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Kalorie</p>
                      <p className="text-2xl font-bold text-primary">{currentGoal.dailyCalories}</p>
                      <p className="text-xs text-muted-foreground">kcal/dzień</p>
                    </div>
                    <div className="p-4 bg-secondary/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Białko</p>
                      <p className="text-2xl font-bold">{currentGoal.dailyProtein}g</p>
                      <p className="text-xs text-muted-foreground">/dzień</p>
                    </div>
                    <div className="p-4 bg-secondary/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Węglowodany</p>
                      <p className="text-2xl font-bold">{currentGoal.dailyCarbs}g</p>
                      <p className="text-xs text-muted-foreground">/dzień</p>
                    </div>
                    <div className="p-4 bg-secondary/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">Tłuszcze</p>
                      <p className="text-2xl font-bold">{currentGoal.dailyFat}g</p>
                      <p className="text-xs text-muted-foreground">/dzień</p>
                    </div>
                  </div>
                  {currentGoal.notes && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-semibold mb-1">Notatki:</p>
                      <p className="text-sm text-muted-foreground">{currentGoal.notes}</p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground text-center">
                    Ustawiono: {format(new Date(currentGoal.startDate), 'd MMMM yyyy', { locale: pl })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nie ustawiono jeszcze celów żywieniowych dla tego sportowca.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MealHistoryView() {
  const { user } = useUser();
  const { toast } = useToast();
  const { deleteDoc } = useDeleteDoc();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('all');

  // Fetch trainer's athletes
  const { data: athletes, isLoading: athletesLoading } = useCollection<Athlete>(
    user ? 'users' : null,
    user ? { trainerId: user.uid, role: 'athlete' } : undefined
  );

  // Fetch meals
  const { data: allMeals, isLoading: mealsLoading, refetch } = useCollection<Meal>(
    user ? 'meals' : null,
    user ? { trainerId: user.uid } : undefined,
    { sort: { date: -1 }, limit: 100 }
  );

  const filteredMeals = useMemo(() => {
    if (!allMeals) return [];
    if (selectedAthleteId === 'all') return allMeals;
    return allMeals.filter(meal => meal.ownerId === selectedAthleteId);
  }, [allMeals, selectedAthleteId]);

  const groupedMeals = useMemo(() => {
    const groups: Record<string, Meal[]> = {};
    filteredMeals.forEach(meal => {
      const dateKey = format(new Date(meal.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(meal);
    });
    return groups;
  }, [filteredMeals]);

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

  const getAthleteById = (id: string) => athletes?.find(a => a.id === id);

  if (athletesLoading || mealsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Historia Diet Sportowców</h2>
          <p className="text-muted-foreground">Przeglądaj i zarządzaj posiłkami swoich sportowców</p>
        </div>
        <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtruj po sportowcu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy sportowcy</SelectItem>
            {athletes?.map((athlete) => (
              <SelectItem key={athlete.id} value={athlete.id}>
                {athlete.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredMeals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Brak posiłków do wyświetlenia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMeals).map(([dateKey, meals]) => (
            <Card key={dateKey}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(new Date(dateKey), 'd MMMM yyyy', { locale: pl })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {meals.map(meal => {
                    const athlete = getAthleteById(meal.ownerId);
                    const Icon = MEAL_ICONS[meal.type];
                    const mealNutrition = meal.foodItems.reduce((totals, item) => {
                      totals.calories += item.calories;
                      totals.protein += item.protein;
                      totals.carbs += item.carbs;
                      totals.fat += item.fat;
                      return totals;
                    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

                    return (
                      <Collapsible key={meal.id} className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-secondary/50 rounded-t-lg">
                          <div className="flex items-center gap-3">
                            <Icon className="h-6 w-6 text-primary"/>
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{meal.type}</p>
                                {athlete && (
                                  <Badge variant="secondary">{athlete.name}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {mealNutrition.calories.toFixed(0)} kcal ·
                                B: {mealNutrition.protein.toFixed(0)}g ·
                                W: {mealNutrition.carbs.toFixed(0)}g ·
                                T: {mealNutrition.fat.toFixed(0)}g
                              </p>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <ul className="p-4 pt-0 space-y-2">
                            {meal.foodItems.map((item, index) => (
                              <li key={index} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                                <span>{item.name}</span>
                                <span className="text-muted-foreground">
                                  {item.calories.toFixed(0)} kcal |
                                  B: {item.protein.toFixed(0)}g |
                                  W: {item.carbs.toFixed(0)}g |
                                  T: {item.fat.toFixed(0)}g
                                </span>
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
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
            <TabsTrigger value="create">Dodaj Dietę</TabsTrigger>
            <TabsTrigger value="history">Historia Diet</TabsTrigger>
            <TabsTrigger value="goals">Cele Żywieniowe</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
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
          </TabsContent>

          <TabsContent value="history">
            <MealHistoryView />
          </TabsContent>

          <TabsContent value="goals">
            <NutritionGoalsManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

