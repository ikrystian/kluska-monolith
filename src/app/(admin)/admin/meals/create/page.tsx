'use client';

import MealForm from '@/components/trainer/MealForm';

export default function AdminCreateMealPage() {
    return (
        <div className="container mx-auto p-6">
            <MealForm apiBase="/api/admin/meals" redirectTo="/admin/meals" defaultPublic />
        </div>
    );
}
