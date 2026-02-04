'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Type definitions for internal state
interface DietMeal {
    savedMealId: string; // Placeholder for now, ideally would be a selector
    type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    time?: string;
    // Temp fields for UI before integration with SavedMeals
    tempName?: string;
}

interface DietDay {
    dayNumber: number;
    meals: DietMeal[];
}

interface DietPlanFormProps {
    initialData?: any;
    isEditing?: boolean;
}

export default function DietPlanForm({ initialData, isEditing = false }: DietPlanFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [days, setDays] = useState<DietDay[]>(initialData?.days || [{ dayNumber: 1, meals: [] }]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name,
                description,
                days
            };

            const url = isEditing
                ? `/api/admin/diet-plans/${initialData._id}`
                : '/api/admin/diet-plans';

            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Request failed');

            toast({
                title: "Sukces",
                description: isEditing ? "Zaktualizowano plan." : "Utworzono nowy plan dietetyczny."
            });

            router.push('/admin/diet-plans');
            router.refresh();

        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: "Błąd",
                description: "Wystąpił błąd podczas zapisywania."
            });
        } finally {
            setLoading(false);
        }
    };

    // Helper to add a day
    const addDay = () => {
        setDays([...days, { dayNumber: days.length + 1, meals: [] }]);
    }

    // Helper to remove a day
    const removeDay = (index: number) => {
        const newDays = days.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 }));
        setDays(newDays);
    }

    // NOTE: Full meal editing logic would require selecting from SavedMeals.
    // For this generic 'CRUD' task, I'm providing the structure.
    // The user can implement the detailed meal selector (requiring searching SavedMeals) later or if requested.
    // I will add a simple placeholder for meals management.

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Szczegóły Planu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nazwa Planu</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="np. Redukcja 2000kcal"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Opis</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Opis planu..."
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Dni i Posiłki</CardTitle>
                        <Button type="button" variant="outline" onClick={addDay} size="sm">
                            <Plus className="h-4 w-4 mr-2" /> Dodaj Dzień
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="day-0" className="w-full">
                        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent">
                            {days.map((day, idx) => (
                                <TabsTrigger key={idx} value={`day-${idx}`} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                    Dzień {day.dayNumber}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        {days.map((day, idx) => (
                            <TabsContent key={idx} value={`day-${idx}`} className="border p-4 rounded-md mt-4 relative">
                                <div className="absolute right-4 top-4">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeDay(idx)} className="text-destructive">
                                        <Trash className="h-4 w-4" /> Usuń Dzień
                                    </Button>
                                </div>
                                <h3 className="font-semibold mb-4">Dzień {day.dayNumber}</h3>
                                <p className="text-sm text-muted-foreground italic">
                                    Edycja posiłków będzie dostępna wkrótce (wymaga integracji z bazą Posiłków).
                                    Obecnie możesz zapisać strukturę dni.
                                </p>
                                {/* Future Meal List Component Here */}
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Anuluj</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Zapisz Zmiany' : 'Utwórz Plan'}
                </Button>
            </div>
        </form>
    );
}
