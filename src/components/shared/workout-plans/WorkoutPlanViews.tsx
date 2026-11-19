'use client';

import { useRouter } from 'next/navigation';
import { useCreateDoc, useDoc, useUpdateDoc, useUser } from '@/lib/db-hooks';
import { TrainingPlan } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { FormPageLayout } from '@/components/shared/FormPageLayout';
import type { PanelRole } from '@/components/shared/panel-config';
import { PlanForm } from './PlanForm';

interface WorkoutPlanCreateViewProps {
    /** Lista planów danego panelu, np. `/admin/workout-plans`. */
    basePath: string;
}

export function WorkoutPlanCreateView({ basePath }: WorkoutPlanCreateViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { createDoc, isLoading } = useCreateDoc();
    const { user: currentUser } = useUser();

    const handleSubmit = async (data: TrainingPlan) => {
        if (!currentUser) {
            toast({
                title: 'Błąd',
                description: 'Musisz być zalogowany, aby utworzyć plan.',
                variant: 'destructive',
            });
            return;
        }

        try {
            await createDoc('workoutPlans', { ...data, trainerId: currentUser.uid });
            toast({ title: 'Sukces!', description: 'Plan treningowy został utworzony.' });
            router.push(basePath);
        } catch {
            toast({ title: 'Błąd', description: 'Nie udało się utworzyć planu.', variant: 'destructive' });
        }
    };

    return (
        <FormPageLayout backHref={basePath} title="Nowy Plan Treningowy">
            <PlanForm onSubmit={handleSubmit} isLoading={isLoading} allowCustomDays />
        </FormPageLayout>
    );
}

interface WorkoutPlanEditViewProps {
    role: PanelRole;
    /** Lista planów danego panelu, np. `/trainer/workout-plans`. */
    basePath: string;
    planId: string;
}

export function WorkoutPlanEditView({ role, basePath, planId }: WorkoutPlanEditViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { data: plan, isLoading: isFetching, error } = useDoc<TrainingPlan>('workoutPlans', planId);
    const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
    const { user: currentUser } = useUser();

    const handleSubmit = async (data: TrainingPlan) => {
        try {
            await updateDoc('workoutPlans', planId, data);
            toast({ title: 'Sukces!', description: 'Plan treningowy został zaktualizowany.' });
            router.push(basePath);
        } catch {
            toast({ title: 'Błąd', description: 'Nie udało się zaktualizować planu.', variant: 'destructive' });
        }
    };

    // Trener edytuje wyłącznie swoje plany; admin może edytować każdy.
    const isOwnedByAnotherTrainer =
        role === 'trainer' && !!currentUser && !!plan?.trainerId && plan.trainerId !== currentUser.uid;

    let loadError: { title: string; message: string } | null = null;
    if (error || (!isFetching && !plan)) {
        loadError = { title: 'Błąd', message: 'Nie znaleziono planu lub wystąpił błąd.' };
    } else if (isOwnedByAnotherTrainer) {
        loadError = { title: 'Brak dostępu', message: 'Nie masz uprawnień do edycji tego planu.' };
    }

    return (
        <FormPageLayout backHref={basePath} title="Edytuj Plan Treningowy" isLoading={isFetching} error={loadError}>
            {plan && !loadError && (
                <PlanForm initialData={plan} onSubmit={handleSubmit} isLoading={isUpdating} allowCustomDays />
            )}
        </FormPageLayout>
    );
}
