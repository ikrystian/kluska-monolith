import { DietPlanCreateView } from '@/components/shared/diet-plans/DietPlanViews';

export default function AdminCreateDietPlanPage() {
    return <DietPlanCreateView role="admin" basePath="/admin/diet-plans" />;
}
