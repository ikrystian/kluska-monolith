'use client';

import { CreateWorkout } from '@/components/workouts/CreateWorkout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CreateWorkoutPageLayoutProps {
    /** The URL to navigate back to (e.g., "/trainer/workouts") */
    backHref: string;
    /** The URL to redirect to after successful creation */
    redirectPath: string;
    /** Page title - defaults to "Nowy Trening" */
    title?: string;
    /** Page description text */
    description?: string;
    /** Back button text - defaults to "Powrót do listy" */
    backButtonText?: string;
}

/**
 * Shared layout component for workout creation pages.
 * Used by /trainer/workouts/create, /athlete/workouts/create, and /admin/workouts/create
 */
export function CreateWorkoutPageLayout({
    backHref,
    redirectPath,
    title = 'Nowy Trening',
    description,
    backButtonText = 'Powrót do listy',
}: CreateWorkoutPageLayoutProps) {
    return (
        <div className="container mx-auto px-4 py-4 md:p-8">
            <div className="mx-auto mb-4 flex max-w-2xl items-center gap-2 md:mb-6">
                <Button asChild variant="ghost" size="icon" className="-ml-2 h-10 w-10 shrink-0 rounded-full">
                    <Link to={backHref} aria-label={backButtonText}>
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold font-headline md:text-3xl">{title}</h1>
                    {description && (
                        <p className="hidden text-sm text-muted-foreground md:block">{description}</p>
                    )}
                </div>
            </div>

            <CreateWorkout redirectPath={redirectPath} />
        </div>
    );
}