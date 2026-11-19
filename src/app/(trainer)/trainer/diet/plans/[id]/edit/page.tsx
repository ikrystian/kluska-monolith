import { DietPlanEditView } from '@/components/shared/diet-plans/DietPlanViews';

interface TrainerEditDietPlanPageProps {
    params: Promise<{ id: string }>;
}

export default async function TrainerEditDietPlanPage({ params }: TrainerEditDietPlanPageProps) {
    const { id } = await params;

    return <DietPlanEditView role="trainer" basePath="/trainer/diet/plans" planId={id} />;
}
