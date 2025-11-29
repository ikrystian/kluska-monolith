'use client';

import { useUser, useCollection } from '@/lib/db-hooks';
import { Workout } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Dumbbell, Clock, Signal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function TrainerWorkoutsPage() {
    const { user } = useUser();

    // Fetch workouts created by this trainer
    const { data: workouts, isLoading } = useCollection<Workout>(
        user ? 'workouts' : null,
        user ? { ownerId: user.uid } : undefined
    );

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Baza Treningów</h1>
                    <p className="text-muted-foreground">Zarządzaj treningami, które możesz przypisywać podopiecznym.</p>
                </div>
                <Link href="/trainer/workouts/create">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Utwórz Trening
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <Skeleton className="h-48 w-full" />
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                        </Card>
                    ))
                ) : workouts && workouts.length > 0 ? (
                    workouts.map((workout) => (
                        <Card key={workout.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                            <div className="relative h-48 w-full bg-muted">
                                {workout.imageUrl ? (
                                    <Image
                                        src={workout.imageUrl}
                                        alt={workout.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        <Dumbbell className="h-12 w-12 opacity-20" />
                                    </div>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle className="line-clamp-1">{workout.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    <Signal className="h-3 w-3" /> {workout.level}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="flex items-center text-sm text-muted-foreground mb-2">
                                    <Clock className="h-4 w-4 mr-1" /> {workout.durationMinutes} min
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {workout.exerciseSeries.length} ćwiczeń
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full">Edytuj</Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
                        <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Brak treningów</h3>
                        <p className="text-muted-foreground mb-4">Nie stworzyłeś jeszcze żadnych treningów.</p>
                        <Link href="/trainer/workouts/create">
                            <Button variant="outline">Utwórz Trening</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
