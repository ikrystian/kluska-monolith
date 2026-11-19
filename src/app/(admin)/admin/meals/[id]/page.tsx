import { MealEditView } from '@/components/shared/meals/MealViews';

interface AdminEditMealPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminEditMealPage({ params }: AdminEditMealPageProps) {
    const { id } = await params;

    return <MealEditView role="admin" basePath="/admin/meals" mealId={id} />;
}
