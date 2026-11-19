import { MealEditView } from '@/components/shared/meals/MealViews';

interface TrainerEditMealPageProps {
    params: Promise<{ id: string }>;
}

export default async function TrainerEditMealPage({ params }: TrainerEditMealPageProps) {
    const { id } = await params;

    return <MealEditView role="trainer" basePath="/trainer/diet/meals" mealId={id} />;
}
