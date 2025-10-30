'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Search, User as UserIcon, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  FirestoreError,
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { UserProfile } from '@/lib/types';


const searchSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail.'),
});

type SearchFormValues = z.infer<typeof searchSchema>;

type FoundUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function MyAthletesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const avatarImage = placeholderImages.find((img) => img.id === 'avatar-male');

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);


  const athletesCollectionRef = useMemoFirebase(() => {
    if (!user || userProfile?.role !== 'trainer') return null;
    return collection(firestore, `trainers/${user.uid}/athletes`);
  }, [firestore, user, userProfile]);

  const { data: athletes, isLoading: athletesLoading } = useCollection(athletesCollectionRef);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { email: '' },
  });

  const handleSearch = async ({ email }: SearchFormValues) => {
    if (userProfile?.role !== 'admin') {
      setSearchError('Tylko administratorzy mogą wyszukiwać użytkowników.');
      return;
    }

    setSearchLoading(true);
    setFoundUser(null);
    setSearchError(null);

    const usersRef = collection(firestore, 'users');
    const q = query(
      usersRef,
      where('email', '==', email),
      where('role', '==', 'athlete')
    );
    
    getDocs(q).then((querySnapshot) => {
       if (querySnapshot.empty) {
        setSearchError('Nie znaleziono sportowca z tym adresem e-mail.');
      } else {
        const userDoc = querySnapshot.docs[0];
        setFoundUser({ id: userDoc.id, ...(userDoc.data() as Omit<FoundUser, 'id'>) });
      }
    }).catch((error: FirestoreError) => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'users',
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setSearchError('Nie masz uprawnień do wyszukiwania użytkowników.');
        } else {
            console.error('Błąd wyszukiwania użytkownika:', error);
            setSearchError('Wystąpił błąd podczas wyszukiwania. Spróbuj ponownie.');
        }
    }).finally(() => {
      setSearchLoading(false);
    })
  };
  
  const handleAddAthlete = async () => {
    if (!foundUser || !user) return;

    if (athletes?.some(athlete => athlete.id === foundUser.id)) {
        toast({
            title: 'Sportowiec jest już przypisany',
            description: `${foundUser.name} jest już na Twojej liście.`,
            variant: 'destructive',
        });
        return;
    }

    setAddLoading(true);
    
    const athleteRef = doc(firestore, `trainers/${user.uid}/athletes`, foundUser.id);
    const athleteProfile = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: 'athlete',
        trainerId: user.uid,
    };
    
    setDoc(athleteRef, athleteProfile)
      .then(() => {
        toast({
            title: 'Sportowiec Dodany!',
            description: `${foundUser.name} został dodany do Twojej listy.`,
        });
        setFoundUser(null);
        form.reset();
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: athleteRef.path,
          operation: 'create',
          requestResourceData: athleteProfile,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setAddLoading(false);
      });
  };

  const handleRemoveAthlete = async (athleteId: string) => {
    if (!user) return;
    const athleteRef = doc(firestore, `trainers/${user.uid}/athletes`, athleteId);
    
    deleteDoc(athleteRef)
      .then(() => {
        toast({
            title: 'Sportowiec Usunięty!',
            description: `Sportowiec został usunięty z Twojej listy.`,
            variant: 'destructive'
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: athleteRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
  };


  return (
    <AlertDialog>
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Moi Sportowcy</h1>
      <div className="grid gap-8 md:grid-cols-2">
        {/* Add Athlete Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Dodaj Nowego Sportowca</CardTitle>
            <CardDescription>
              Wyszukaj sportowca po adresie e-mail, aby dodać go do swojej listy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSearch)} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel className="sr-only">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@sportowca.pl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={searchLoading}>
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
                  <span className='hidden sm:inline ml-2'>{searchLoading ? 'Szukanie...' : 'Szukaj'}</span>
                </Button>
              </form>
            </Form>

            {searchError && (
              <Alert variant="destructive" className="mt-4">
                 <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Błąd</AlertTitle>
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {foundUser && (
              <Card className="mt-4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                       {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt={foundUser.name} />}
                      <AvatarFallback>
                        {foundUser.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{foundUser.name}</p>
                      <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                    </div>
                  </div>
                  <Button onClick={handleAddAthlete} disabled={addLoading}>
                     <PlusCircle className="mr-2 h-4 w-4" />
                    {addLoading ? 'Dodawanie...' : 'Dodaj'}
                  </Button>
                </div>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Assigned Athletes List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Przypisani Sportowcy</CardTitle>
            <CardDescription>
              Lista sportowców, którymi obecnie zarządzasz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {athletesLoading ? (
              <p>Ładowanie listy sportowców...</p>
            ) : athletes && athletes.length > 0 ? (
              <ul className="space-y-3">
                {athletes.map((athlete: UserProfile) => (
                  <li key={athlete.id} className="flex items-center justify-between rounded-md border p-3">
                     <div className="flex items-center gap-4">
                        <Avatar>
                           {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt={athlete.name} />}
                            <AvatarFallback>{athlete.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{athlete.name}</p>
                            <p className="text-sm text-muted-foreground">{athlete.email}</p>
                        </div>
                     </div>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/my-athletes/${athlete.id}`}>Zobacz Profil</Link>
                        </Button>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className='h-9 w-9'>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Czy na pewno chcesz usunąć sportowca?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Tej operacji nie można cofnąć. Spowoduje to usunięcie sportowca <span className='font-bold'>{athlete.name}</span> z Twojej listy. Nie usunie to jego konta.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveAthlete(athlete.id)} className="bg-destructive hover:bg-destructive/90">
                                    Usuń
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">Brak sportowców</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nie masz jeszcze przypisanych żadnych sportowców. Użyj formularza, aby ich dodać.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </AlertDialog>
  );
}
