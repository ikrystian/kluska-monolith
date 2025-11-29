'use client';

import { useRouter } from 'next/navigation';
import { useCreateDoc } from '@/lib/db-hooks';
import { WorkoutForm } from '@/components/admin/workout-form';
import { useToast } from '@/hooks/use-toast';
import { Workout } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewWorkoutPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { createDoc, isLoading } = useCreateDoc();

    const handleSubmit = async (data: Workout) => {
        try {
            await createDoc('workouts', data);
            toast({
                title: "Sukces!",
                description: "Trening został utworzony.",
            });
            router.push('/admin/workouts');
        } catch (error) {
            toast({
                title: "Błąd",
                description: "Nie udało się utworzyć treningu.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/admin/workouts">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Powrót do listy
                    </Link>
                </Button>
                <h1 className="font-headline text-3xl font-bold">Nowy Trening</h1>
            </div>

            <WorkoutForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
    );
}
