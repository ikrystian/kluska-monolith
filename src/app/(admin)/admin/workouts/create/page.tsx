'use client';

import { CreateWorkout } from '@/components/workouts/CreateWorkout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminCreateWorkoutPage() {
    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Link href="/admin/workouts">
                    <Button variant="ghost" className="mb-4 pl-0 hover:pl-0 hover:bg-transparent">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Powrót do listy
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold font-headline">Nowy Trening</h1>
                <p className="text-muted-foreground">Dodaj nowy trening do bazy systemowej.</p>
            </div>

            <CreateWorkout redirectPath="/admin/workouts" />
        </div>
    );
}
