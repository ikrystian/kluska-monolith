'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useUpdateDoc, useUser } from '@/lib/db-hooks';
import { PlanForm } from '@/components/admin/plan-form';
import { useToast } from '@/hooks/use-toast';
import { TrainingPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditTrainerPlanPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { toast } = useToast();
    const { data: plan, isLoading: isFetching, error } = useDoc<TrainingPlan>('workoutPlans', id);
    const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
    const { user: currentUser } = useUser();

    const handleSubmit = async (data: TrainingPlan) => {
        try {
            await updateDoc('workoutPlans', id, data);
            toast({
                title: "Sukces!",
                description: "Plan treningowy został zaktualizowany.",
            });
            router.push('/trainer/workout-plans');
        } catch (error) {
            toast({
                title: "Błąd",
                description: "Nie udało się zaktualizować planu.",
                variant: "destructive",
            });
        }
    };

    if (isFetching) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="mb-6">
                    <Skeleton className="h-10 w-32 mb-4" />
                    <Skeleton className="h-10 w-64" />
                </div>
                <Skeleton className="h-[600px] w-full" />
            </div>
        )
    }

    if (error || !plan) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Błąd</h1>
                <p className="text-muted-foreground">Nie znaleziono planu lub wystąpił błąd.</p>
                <Button asChild className="mt-4">
                    <Link href="/trainer/workout-plans">Powrót do listy</Link>
                </Button>
            </div>
        )
    }

    if (currentUser && plan.trainerId && plan.trainerId !== currentUser.uid) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Brak dostępu</h1>
                <p className="text-muted-foreground">Nie masz uprawnień do edycji tego planu.</p>
                <Button asChild className="mt-4">
                    <Link href="/trainer/workout-plans">Powrót do listy</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/trainer/workout-plans">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Powrót do listy
                    </Link>
                </Button>
                <h1 className="font-headline text-3xl font-bold">Edytuj Plan Treningowy</h1>
            </div>

            <PlanForm initialData={plan} onSubmit={handleSubmit} isLoading={isUpdating} />
        </div>
    );
}
