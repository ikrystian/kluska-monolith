'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { FormPageLayout } from '@/components/shared/FormPageLayout';
import { panelConfig, type PanelRole } from '@/components/shared/panel-config';
import { DietPlanForm } from './DietPlanForm';

type DietPlanInitialData = NonNullable<ComponentProps<typeof DietPlanForm>['initialData']>;

interface DietPlanViewProps {
    role: PanelRole;
    /** Lista planów danego panelu, np. `/admin/diet-plans`. */
    basePath: string;
}

export function DietPlanCreateView({ role, basePath }: DietPlanViewProps) {
    return (
        <FormPageLayout backHref={basePath} title="Nowy Plan Dietetyczny">
            <DietPlanForm role={role} redirectTo={basePath} />
        </FormPageLayout>
    );
}

interface DietPlanEditViewProps extends DietPlanViewProps {
    planId: string;
}

export function DietPlanEditView({ role, basePath, planId }: DietPlanEditViewProps) {
    const [plan, setPlan] = useState<DietPlanInitialData | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let cancelled = false;
        fetch(`${panelConfig[role].dietPlansApi}/${planId}`)
            .then(async (res) => {
                if (!res.ok) throw new Error('Nie znaleziono planu.');
                const data = await res.json();
                // Panel trenera odpowiada `{ plan }`, panel admina zwraca sam dokument planu.
                const loaded = role === 'trainer' ? data.plan : data;
                if (!cancelled) {
                    setPlan(loaded);
                    setStatus('ready');
                }
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [role, planId]);

    return (
        <FormPageLayout
            backHref={basePath}
            title="Edytuj Plan Dietetyczny"
            isLoading={status === 'loading'}
            error={status === 'error' ? { title: 'Błąd', message: 'Nie znaleziono planu lub wystąpił błąd.' } : null}
        >
            {plan && <DietPlanForm role={role} initialData={plan} redirectTo={basePath} />}
        </FormPageLayout>
    );
}
