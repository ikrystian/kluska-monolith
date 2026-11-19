'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { FormPageLayout } from '@/components/shared/FormPageLayout';
import { panelConfig, type PanelRole } from '@/components/shared/panel-config';
import { MealForm } from './MealForm';

type MealInitialData = NonNullable<ComponentProps<typeof MealForm>['initialData']>;

interface MealViewProps {
    role: PanelRole;
    /** Lista posiłków danego panelu, np. `/admin/meals`. */
    basePath: string;
}

export function MealCreateView({ role, basePath }: MealViewProps) {
    return (
        <FormPageLayout backHref={basePath} title="Utwórz Nowy Posiłek">
            <MealForm role={role} redirectTo={basePath} />
        </FormPageLayout>
    );
}

interface MealEditViewProps extends MealViewProps {
    mealId: string;
}

export function MealEditView({ role, basePath, mealId }: MealEditViewProps) {
    const [meal, setMeal] = useState<MealInitialData | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let cancelled = false;
        // Oba API zwracają `{ meal }`. Trener dostaje 404 dla cudzych posiłków, admin dla każdego istniejącego.
        fetch(`${panelConfig[role].mealsApi}/${mealId}`)
            .then(async (res) => {
                if (!res.ok) throw new Error('Nie znaleziono posiłku.');
                const data = await res.json();
                if (!cancelled) {
                    setMeal(data.meal);
                    setStatus('ready');
                }
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [role, mealId]);

    return (
        <FormPageLayout
            backHref={basePath}
            title="Edytuj Posiłek"
            isLoading={status === 'loading'}
            error={status === 'error' ? { title: 'Błąd', message: 'Nie znaleziono posiłku lub wystąpił błąd.' } : null}
        >
            {meal && <MealForm initialData={meal} role={role} redirectTo={basePath} />}
        </FormPageLayout>
    );
}
