'use client';

import { useRouter } from 'next/navigation';
import { useCreateDoc } from '@/lib/db-hooks';
import { PlanForm } from '@/components/admin/plan-form';
import { useToast } from '@/hooks/use-toast';
import { TrainingPlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewPlanPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { createDoc, isLoading } = useCreateDoc();

    const handleSubmit = async (data: TrainingPlan) => {
        try {
            await createDoc('workoutPlans', data);
            toast({
                title: "Sukces!",
                description: "Plan treningowy został utworzony.",
            });
            router.push('/admin/workout-plans');
        } catch (error) {
            toast({
                title: "Błąd",
                description: "Nie udało się utworzyć planu.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <Link href="/admin/workout-plans">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Powrót do listy
                    </Link>
                </Button>
                <h1 className="font-headline text-3xl font-bold">Nowy Plan Treningowy</h1>
            </div>

            <PlanForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
    );
}
