import { MealCreateView } from '@/components/shared/meals/MealViews';

export default function AdminCreateMealPage() {
    return <MealCreateView role="admin" basePath="/admin/meals" />;
}
