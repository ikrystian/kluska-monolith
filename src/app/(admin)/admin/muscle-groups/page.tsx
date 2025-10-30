'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2, Dumbbell, Edit } from 'lucide-react';
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
import type { MuscleGroup } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const muscleGroupSchema = z.object({
  name: z.string().min(1, 'Nazwa grupy jest wymagana.'),
  imageUrl: z.string().url('Nieprawidłowy URL obrazka.').optional(),
});

type MuscleGroupFormValues = z.infer<typeof muscleGroupSchema>;

export default function MuscleGroupsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MuscleGroup | null>(null);

  const muscleGroupsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'muscleGroups') : null),
    [firestore]
  );
  const { data: muscleGroups, isLoading } = useCollection<MuscleGroup>(muscleGroupsRef);

  const form = useForm<MuscleGroupFormValues>({
    resolver: zodResolver(muscleGroupSchema),
    defaultValues: {
      name: '',
      imageUrl: '',
    },
  });

  const handleOpenEditDialog = (group: MuscleGroup) => {
    setEditingGroup(group);
    form.reset({
        name: group.name,
        imageUrl: group.imageUrl,
    });
  };
  
  const handleCloseDialogs = () => {
    setEditingGroup(null);
    form.reset({ name: '', imageUrl: '' });
  }

  const handleFormSubmit = async (data: MuscleGroupFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    if (editingGroup) {
        // Update
        const groupDocRef = doc(firestore, 'muscleGroups', editingGroup.id);
        const updatedData = {
            ...editingGroup,
            ...data,
            imageHint: data.name.toLowerCase(),
        };
        updateDoc(groupDocRef, updatedData)
            .then(() => {
                toast({ title: 'Sukces!', description: 'Grupa mięśniowa została zaktualizowana.'});
                handleCloseDialogs();
            })
            .catch((serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: groupDocRef.path,
                    operation: 'update',
                    requestResourceData: updatedData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSubmitting(false));

    } else {
        // Create
        const newGroupData = {
            name: data.name,
            imageUrl: data.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(data.name)}/400/300`,
            imageHint: data.name.toLowerCase(),
        };
    
        addDoc(muscleGroupsRef!, newGroupData)
          .then(() => {
            toast({
              title: 'Sukces!',
              description: `Grupa mięśniowa "${data.name}" została dodana.`,
            });
            handleCloseDialogs();
          })
          .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
              path: muscleGroupsRef!.path,
              operation: 'create',
              requestResourceData: newGroupData,
            });
            errorEmitter.emit('permission-error', permissionError);
          })
          .finally(() => setIsSubmitting(false));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!firestore) return;
    const groupDocRef = doc(firestore, 'muscleGroups', groupId);
    deleteDoc(groupDocRef)
      .then(() => {
        toast({
          title: 'Sukces!',
          description: 'Grupa mięśniowa została usunięta.',
          variant: 'destructive'
        });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: groupDocRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Zarządzanie Grupami Mięśniowymi</h1>
      <div className="grid grid-cols-1 gap-8">
        <Dialog onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
            <Card>
                <CardHeader>
                    <CardTitle>Dodaj Nową Grupę</CardTitle>
                    <CardDescription>
                    Dodaj nową grupę mięśniową. Jeśli nie podasz URL obrazka, zostanie on wygenerowany automatycznie.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Dodaj nową grupę
                        </Button>
                    </DialogTrigger>
                </CardContent>
            </Card>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Dodaj nową grupę</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                       <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nazwa Grupy</FormLabel>
                              <FormControl>
                                <Input placeholder="np. Klatka piersiowa" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL Obrazka (opcjonalnie)</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/image.jpg" {...field} />
                              </FormControl>
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
                            Dodaj
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <div>
            <h2 className="text-2xl font-headline font-semibold mb-4">Istniejące Grupy</h2>
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                 {isLoading && (
                  Array.from({ length: 4 }).map((_, i) => (
                     <Card key={i}>
                        <Skeleton className="h-40 w-full" />
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                         <CardFooter>
                            <Skeleton className="h-8 w-full" />
                        </CardFooter>
                     </Card>
                  ))
                )}
                {muscleGroups?.map((group) => (
                  <Card key={group.id} className="overflow-hidden flex flex-col">
                      <div className="relative h-40 w-full">
                          {group.imageUrl && (
                              <Image 
                                src={group.imageUrl}
                                alt={group.name}
                                fill
                                className="object-cover"
                                data-ai-hint={group.imageHint}
                              />
                          )}
                      </div>
                    <CardHeader className="flex-grow">
                        <CardTitle className="font-headline">{group.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="flex gap-2">
                      <Dialog onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
                        <DialogTrigger asChild>
                           <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenEditDialog(group)}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edytuj
                            </Button>
                        </DialogTrigger>
                         <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edytuj grupę mięśniową</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Nazwa Grupy</FormLabel>
                                        <FormControl>
                                            <Input placeholder="np. Klatka piersiowa" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>URL Obrazka</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com/image.jpg" {...field} />
                                        </FormControl>
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
                                    Zapisz zmiany
                                    </Button>
                                </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                 {!isLoading && muscleGroups?.length === 0 && (
                    <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4 flex flex-col items-center justify-center border-dashed py-20">
                        <CardContent className="text-center">
                            <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="font-headline text-xl font-semibold mb-2">Brak grup mięśniowych</h3>
                            <p className="text-muted-foreground">Nie znaleziono żadnych grup. Dodaj pierwszą, aby zacząć.</p>
                        </CardContent>
                    </Card>
                 )}
            </div>
        </div>
      </div>
    </div>
  );
}
