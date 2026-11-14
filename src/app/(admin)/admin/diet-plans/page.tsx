'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';

interface DietPlan {
    _id: string;
    name: string;
    description?: string;
    days: any[];
    trainerId: string;
    createdAt: string;
}

export default function AdminDietPlansPage() {
    const { toast } = useToast();

    const [plans, setPlans] = useState<DietPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '10' });
            if (appliedSearch) params.set('search', appliedSearch);
            const res = await fetch(`/api/admin/diet-plans?${params}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setPlans(data.plans);
            setTotalPages(Math.max(1, data.pagination.pages));
        } catch (error) {
            console.error("Failed to fetch plans", error);
            toast({ variant: "destructive", title: "Błąd", description: "Nie udało się pobrać planów dietetycznych." });
        } finally {
            setLoading(false);
        }
    }, [page, appliedSearch, toast]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const applySearch = () => {
        setPage(1);
        setAppliedSearch(searchQuery.trim());
    };

    // Po usunięciu ostatniego planu na dalszej stronie wracamy o stronę, zamiast zostawiać pustą listę.
    const handleDeleted = () => {
        if (plans.length === 1 && page > 1) setPage((p) => p - 1);
        else fetchPlans();
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plany Dietetyczne</h1>
                    <p className="text-muted-foreground">Zarządzaj planami dietetycznymi w systemie.</p>
                </div>
                <Link href="/admin/diet-plans/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Utwórz Plan
                    </Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Szukaj planów..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                        className="pl-8"
                    />
                </div>
                <Button variant="secondary" onClick={applySearch}>Szukaj</Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nazwa</TableHead>
                            <TableHead>Opis</TableHead>
                            <TableHead className="text-right">Dni</TableHead>
                            <TableHead className="text-right">Akcje</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Ładowanie...</TableCell>
                            </TableRow>
                        ) : plans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Brak planów dietetycznych.</TableCell>
                            </TableRow>
                        ) : (
                            plans.map((plan) => (
                                <TableRow key={plan._id}>
                                    <TableCell className="font-medium">{plan.name}</TableCell>
                                    <TableCell>{plan.description || '-'}</TableCell>
                                    <TableCell className="text-right">{plan.days?.length || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/diet-plans/${plan._id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <DeletePlanDialog planId={plan._id} onDelete={handleDeleted} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <Button variant="outline" size="icon" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} aria-label="Poprzednia strona">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>{page} / {totalPages}</span>
                    <Button variant="outline" size="icon" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} aria-label="Następna strona">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

function DeletePlanDialog({ planId, onDelete }: { planId: string, onDelete: () => void }) {
    const { toast } = useToast();

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/admin/diet-plans/${planId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error();

            toast({ title: "Plan usunięty", description: "Pomyślnie usunięto plan dietetyczny." });
            onDelete();
        } catch (e) {
            toast({ variant: "destructive", title: "Błąd", description: "Nie udało się usunąć planu." });
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Czy na pewno chcesz usunąć ten plan?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tej operacji nie można cofnąć.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Usuń
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
