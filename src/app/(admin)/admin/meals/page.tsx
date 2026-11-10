'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DISH_CATEGORIES, DISH_CATEGORY_LABELS, type DishCategory } from '@/lib/meal-catalog';

interface AdminMeal {
    _id: string;
    name: string;
    dishCategory?: DishCategory;
    category: string;
    isPublic?: boolean;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    ownerName: string;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
    Breakfast: 'Śniadanie',
    Lunch: 'Obiad',
    Dinner: 'Kolacja',
    Snack: 'Przekąska',
};

export default function AdminMealsPage() {
    const { toast } = useToast();
    const [meals, setMeals] = useState<AdminMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [dishCategory, setDishCategory] = useState<string>('all');
    const [visibility, setVisibility] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchMeals = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '25' });
            if (appliedSearch) params.set('search', appliedSearch);
            if (dishCategory !== 'all') params.set('dishCategory', dishCategory);
            if (visibility !== 'all') params.set('visibility', visibility);
            const res = await fetch(`/api/admin/meals?${params}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setMeals(data.meals);
            setPages(data.pagination.pages);
            setTotal(data.pagination.total);
        } catch {
            toast({ variant: 'destructive', title: 'Błąd', description: 'Nie udało się pobrać posiłków.' });
        } finally {
            setLoading(false);
        }
    }, [page, appliedSearch, dishCategory, visibility, toast]);

    useEffect(() => {
        fetchMeals();
    }, [fetchMeals]);

    const applySearch = () => {
        setPage(1);
        setAppliedSearch(search.trim());
    };

    const togglePublic = async (meal: AdminMeal, isPublic: boolean) => {
        setMeals((current) => current.map((m) => (m._id === meal._id ? { ...m, isPublic } : m)));
        try {
            const res = await fetch(`/api/admin/meals/${meal._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic }),
            });
            if (!res.ok) throw new Error();
        } catch {
            setMeals((current) => current.map((m) => (m._id === meal._id ? { ...m, isPublic: !isPublic } : m)));
            toast({ variant: 'destructive', title: 'Błąd', description: 'Nie udało się zmienić widoczności.' });
        }
    };

    const deleteMeal = async (meal: AdminMeal) => {
        try {
            const res = await fetch(`/api/admin/meals/${meal._id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            toast({ title: 'Usunięto', description: `„${meal.name}” został usunięty.` });
            fetchMeals();
        } catch {
            toast({ variant: 'destructive', title: 'Błąd', description: 'Nie udało się usunąć posiłku.' });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gotowe Posiłki</h1>
                    <p className="text-muted-foreground">
                        Katalog dań, które użytkownicy mogą wyszukać i dodać do dzienniczka. Publiczne widzi każdy.
                    </p>
                </div>
                <Link href="/admin/meals/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj Posiłek
                    </Button>
                </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Szukaj po nazwie..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        className="pl-8"
                    />
                </div>
                <Button variant="secondary" onClick={applySearch}>Szukaj</Button>
                <Select value={dishCategory} onValueChange={(v) => { setPage(1); setDishCategory(v); }}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Wszystkie kategorie</SelectItem>
                        {DISH_CATEGORIES.map((value) => (
                            <SelectItem key={value} value={value}>{DISH_CATEGORY_LABELS[value]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={visibility} onValueChange={(v) => { setPage(1); setVisibility(v); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Wszystkie</SelectItem>
                        <SelectItem value="public">Publiczne</SelectItem>
                        <SelectItem value="private">Prywatne</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nazwa</TableHead>
                            <TableHead>Kategoria</TableHead>
                            <TableHead>Pora</TableHead>
                            <TableHead className="text-right">kcal</TableHead>
                            <TableHead className="text-right">B / W / T</TableHead>
                            <TableHead>Autor</TableHead>
                            <TableHead>Publiczny</TableHead>
                            <TableHead className="text-right">Akcje</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">Ładowanie...</TableCell>
                            </TableRow>
                        ) : meals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">Brak posiłków.</TableCell>
                            </TableRow>
                        ) : (
                            meals.map((meal) => (
                                <TableRow key={meal._id}>
                                    <TableCell className="font-medium">{meal.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{DISH_CATEGORY_LABELS[meal.dishCategory ?? 'other'] ?? 'Inne'}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{MEAL_TYPE_LABELS[meal.category] ?? meal.category}</TableCell>
                                    <TableCell className="text-right tabular-nums">{Math.round(meal.totalCalories)}</TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                        {Math.round(meal.totalProtein)} / {Math.round(meal.totalCarbs)} / {Math.round(meal.totalFat)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{meal.ownerName}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={Boolean(meal.isPublic)}
                                            onCheckedChange={(checked) => togglePublic(meal, checked)}
                                            aria-label={`Publiczny: ${meal.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/meals/${meal._id}`}>
                                                <Button variant="ghost" size="icon" aria-label="Edytuj">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Usuń">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Usunąć „{meal.name}”?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Tej operacji nie można cofnąć. Wpisy w dzienniczkach użytkowników pozostaną bez zmian.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMeal(meal)} className="bg-destructive hover:bg-destructive/90">
                                                            Usuń
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Łącznie: {total}</span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Poprzednia strona">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>{page} / {pages}</span>
                    <Button variant="outline" size="icon" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Następna strona">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
