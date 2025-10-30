'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, collection, query, where, doc } from '@/firebase';
import type { WorkoutPlan, UserProfile } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminWorkoutPlansPage() {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();

  const currentUserProfileRef = useMemoFirebase(
    () => (currentUser ? doc(firestore, 'users', currentUser.uid) : null),
    [currentUser, firestore]
  );
  const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<UserProfile>(currentUserProfileRef);

  const plansRef = useMemoFirebase(
    () => (firestore && currentUserProfile?.role === 'admin' ? collection(firestore, 'workoutPlans') : null),
    [firestore, currentUserProfile]
  );
  const { data: plans, isLoading: plansLoading } = useCollection<WorkoutPlan>(plansRef);

  const usersRef = useMemoFirebase(
    () => (firestore && currentUserProfile?.role === 'admin' ? collection(firestore, 'users') : null),
    [firestore, currentUserProfile]
  );
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersRef);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(u => [u.id, u.name]));
  }, [users]);

  const isLoading = isCurrentUserProfileLoading || (currentUserProfile?.role === 'admin' && (plansLoading || usersLoading));

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Wszystkie Plany Treningowe</CardTitle>
          <CardDescription>
            Lista wszystkich planów treningowych utworzonych przez użytkowników w systemie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa Planu</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Przypisani sportowcy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : plans && currentUserProfile?.role === 'admin' ? (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{usersMap.get(plan.trainerId) || plan.trainerId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{plan.assignedAthleteIds?.length || 0}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                        <p>Brak planów treningowych w systemie lub brak uprawnień do ich wyświetlenia.</p>
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
