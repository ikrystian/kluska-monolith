'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, Timestamp, getDocs } from 'firebase/firestore';
import type { UserProfile, TrainerRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Check, Handshake, Loader2, LocateFixed, Search } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function TrainersPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const trainersQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'users'), where('role', '==', 'trainer'));
    }, [firestore]);
    
    const requestsQuery = useMemoFirebase(() => {
        return user ? query(collection(firestore, `users/${user.uid}/trainerRequests`)) : null;
    }, [user, firestore]);

    const { data: trainers, isLoading: trainersLoading } = useCollection<UserProfile>(trainersQuery);
    const { data: sentRequests, isLoading: requestsLoading } = useCollection<TrainerRequest>(requestsQuery);

    const isLoading = trainersLoading || requestsLoading;

    const filteredTrainers = trainers?.filter(trainer => 
        trainer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        trainer.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const handleSendRequest = async (trainer: UserProfile) => {
        if (!user) {
            toast({ title: "Błąd", description: "Musisz być zalogowany, aby wysłać zapytanie.", variant: "destructive" });
            return;
        }

        setIsSubmitting(trainer.id);

        const requestRef = doc(collection(firestore, 'users', trainer.id, 'trainerRequests'));
        
        const newRequest: Omit<TrainerRequest, 'id'> = {
            athleteId: user.uid,
            athleteName: user.displayName || 'Anonimowy Sportowiec',
            trainerId: trainer.id,
            status: 'pending',
            createdAt: Timestamp.now(),
        };

        setDoc(requestRef, { ...newRequest, id: requestRef.id })
            .then(() => {
                toast({ title: 'Zapytanie Wysłane!', description: `Twoje zapytanie zostało wysłane do ${trainer.name}.` });
            })
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: requestRef.path,
                    operation: 'create',
                    requestResourceData: newRequest
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSubmitting(null));
    };

    const getRequestStatus = (trainerId: string) => {
        const request = sentRequests?.find(req => req.trainerId === trainerId);
        return request ? request.status : null;
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="font-headline text-3xl font-bold">Znajdź Trenera</h1>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Szukaj po nazwie lub lokalizacji..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                        <Card key={index}>
                            <CardContent className="p-6 text-center">
                                <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
                                <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
                                <Skeleton className="h-4 w-1/2 mx-auto" />
                            </CardContent>
                            <CardFooter>
                                <Skeleton className="h-10 w-full" />
                            </CardFooter>
                        </Card>
                    ))
                ) : filteredTrainers && filteredTrainers.length > 0 ? (
                    filteredTrainers.map(trainer => {
                        const avatarImage = placeholderImages.find((img) => img.id === 'avatar-male');
                        const status = getRequestStatus(trainer.id);

                        return (
                            <Card key={trainer.id} className="flex flex-col">
                                <CardContent className="p-6 text-center flex-grow">
                                    <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary">
                                        {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt={trainer.name} />}
                                        <AvatarFallback>{getInitials(trainer.name)}</AvatarFallback>
                                    </Avatar>
                                    <h3 className="font-headline text-xl font-semibold">{trainer.name}</h3>
                                    {trainer.location && (
                                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                                            <LocateFixed className="h-3 w-3" />
                                            {trainer.location}
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    {status === 'pending' ? (
                                        <Button className="w-full" disabled>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Oczekuje
                                        </Button>
                                    ) : status === 'accepted' ? (
                                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
                                            <Check className="mr-2 h-4 w-4"/> Zaakceptowano
                                        </Button>
                                    ) : (
                                        <Button className="w-full" onClick={() => handleSendRequest(trainer)} disabled={isSubmitting === trainer.id}>
                                            {isSubmitting === trainer.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Handshake className="mr-2 h-4 w-4"/>}
                                            Wyślij zapytanie
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                    <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-12">
                        <p className="text-muted-foreground">Nie znaleziono trenerów pasujących do Twoich kryteriów.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
