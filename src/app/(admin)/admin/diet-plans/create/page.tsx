'use client';

import DietPlanForm from '@/components/admin/diet-plans/DietPlanForm';

export default function CreateDietPlanPage() {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold tracking-tight mb-8">Nowy Plan Dietetyczny</h1>
            <DietPlanForm />
        </div>
    );
}
