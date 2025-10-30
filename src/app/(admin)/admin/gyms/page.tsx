'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useCollection, useFirestore, useMemoFirebase, collection, doc, setDoc, deleteDoc, addDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Edit, Loader2, PlusCircle, Trash2, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const gymSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana.'),
  address: z.string().min(1, 'Adres jest wymagany.'),
});

type GymFormValues = z.infer<typeof gymSchema>;

export default function GymsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);

  const gymsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'gyms') : null),
    [firestore]
  );
  const { data: gyms, isLoading } = useCollection<Gym>(gymsCollectionRef);

  const form = useForm<GymFormValues>({
    resolver: zodResolver(gymSchema),
    defaultValues: {
      name: '',
      address: '',
    }
  });

  const { formState: { isSubmitting } } = form;

  const handleOpenDialog = (gym: Gym | null) => {
    setEditingGym(gym);
    form.reset(gym ? { name: gym.name, address: gym.address } : { name: '', address: '' });
    setDialogOpen(true);
  };

  const handleFormSubmit = async (data: GymFormValues) => {
    if (!firestore || !gymsCollectionRef) return;

    try {
      if (editingGym) {
        // Update
        const gymDocRef = doc(firestore, 'gyms', editingGym.id);
        await setDoc(gymDocRef, data, { merge: true });
        toast({ title: 'Sukces!', description: 'Dane siłowni zostały zaktualizowane.' });
      } else {
        // Create
        await addDoc(gymsCollectionRef, data);
        toast({ title: 'Sukces!', description: 'Nowa siłownia została dodana.' });
      }
      setDialogOpen(false);
      setEditingGym(null);
      form.reset();
    } catch (e) {
      console.error(e);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `gyms/${editingGym?.id || ''}`,
        operation: editingGym ? 'update' : 'create',
        requestResourceData: data,
      }));
       toast({ title: 'Błąd!', description: 'Wystąpił błąd podczas zapisywania siłowni.', variant: 'destructive' });
    }
  };

  const handleDelete = async (gymId: string) => {
    if (!firestore) return;
    const gymDocRef = doc(firestore, 'gyms', gymId);
    try {
      await deleteDoc(gymDocRef);
      toast({ title: 'Usunięto!', description: 'Siłownia została usunięta.', variant: 'destructive' });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: gymDocRef.path,
        operation: 'delete',
      }));
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Zarządzanie Siłowniami</h1>
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj Siłownię
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista Siłowni</CardTitle>
          <CardDescription>
            Zarządzaj listą dostępnych siłowni w systemie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa Siłowni</TableHead>
                <TableHead>Adres</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : gyms?.map((gym: Gym) => (
                <TableRow key={gym.id}>
                  <TableCell className="font-medium">{gym.name}</TableCell>
                  <TableCell>{gym.address}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(gym)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edytuj
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(gym.id)}>
                      <Trash2 className="mr-2 h-3 w-3" />
                      Usuń
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
               {!isLoading && gyms?.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                        <Building2 className="h-12 w-12 mx-auto mb-4"/>
                        <p>Brak siłowni w systemie. Dodaj pierwszą, aby zacząć.</p>
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGym ? 'Edytuj Siłownię' : 'Dodaj Nową Siłownię'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa Siłowni</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adres</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isSubmitting}>
                    Anuluj
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
