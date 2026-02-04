'use client';

import { useEffect, useState } from 'react';
import DietPlanForm from '@/components/admin/diet-plans/DietPlanForm';
import { Loader2 } from 'lucide-react';

export default function EditDietPlanPage({ params }: { params: { id: string } }) {
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const res = await fetch(`/api/admin/diet-plans/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setPlan(data);
                }
            } catch (error) {
                console.error('Failed to fetch plan', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlan();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!plan) {
        return <div className="p-6">Nie znaleziono planu.</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold tracking-tight mb-8">Edytuj Plan Dietetyczny</h1>
            <DietPlanForm initialData={plan} isEditing />
        </div>
    );
}
