'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useDoc, useUpdateDoc } from '@/lib/db-hooks';
import { WorkoutForm } from '@/components/admin/workout-form';
import { useToast } from '@/hooks/use-toast';
import { Workout } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditWorkoutPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { toast } = useToast();
    const { data: workout, isLoading: isFetching, error } = useDoc<Workout>('workouts', id);
    const { updateDoc, isLoading: isUpdating } = useUpdateDoc();

    const handleSubmit = async (data: Workout) => {
        try {
            await updateDoc('workouts', id, data);
            toast({
                title: "Sukces!",
                description: "Trening został zaktualizowany.",
            });
            router.push('/admin/workouts');
        } catch (error) {
            toast({
                title: "Błąd",
                description: "Nie udało się zaktualizować treningu.",
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

    if (error || !workout) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                <h1 className="text-2xl font-bold text-destructive">Błąd</h1>
                <p className="text-muted-foreground">Nie znaleziono treningu lub wystąpił błąd.</p>
                <Button asChild className="mt-4">
                    <Link href="/admin/workouts">Powrót do listy</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/admin/workouts">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Powrót do listy
                    </Link>
                </Button>
                <h1 className="font-headline text-3xl font-bold">Edytuj Trening</h1>
            </div>

            <WorkoutForm initialData={workout} onSubmit={handleSubmit} isLoading={isUpdating} />
        </div>
    );
}
