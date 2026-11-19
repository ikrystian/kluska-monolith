import { DietPlanEditView } from '@/components/shared/diet-plans/DietPlanViews';

interface AdminEditDietPlanPageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminEditDietPlanPage({ params }: AdminEditDietPlanPageProps) {
    const { id } = await params;

    return <DietPlanEditView role="admin" basePath="/admin/diet-plans" planId={id} />;
}
