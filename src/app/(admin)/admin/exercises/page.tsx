'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Exercise, MuscleGroup } from '@/lib/types';
import { Search, Loader2, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const exerciseSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana.'),
  muscleGroup: z.string().min(1, 'Grupa mięśniowa jest wymagana.'),
  description: z.string().min(1, 'Opis jest wymagany.'),
  image: z.string().url('Nieprawidłowy URL obrazu.'),
  type: z.enum(['system', 'custom'], { required_error: "Typ ćwiczenia jest wymagany."}),
});

type ExerciseFormValues = z.infer<typeof exerciseSchema>;

export default function AdminExercisesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const { data: allExercises, isLoading: exercisesLoading, refetch: refetchExercises } = useCollection<Exercise>('exercises');
  const { data: muscleGroups, isLoading: muscleGroupsLoading } = useCollection<MuscleGroup>('muscleGroups');
  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();

  const isLoading = exercisesLoading || muscleGroupsLoading;

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
  });

  const filteredExercises = allExercises?.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFormSubmit = async (data: ExerciseFormValues) => {
    if (!selectedExercise) return;

    const updatedData = {
        ...data,
        imageHint: data.name.toLowerCase(),
    };

    try {
      await updateDoc('exercises', selectedExercise.id || selectedExercise._id, updatedData);
      toast({ title: "Sukces!", description: "Ćwiczenie zostało zaktualizowane."});
      setEditDialogOpen(false);
      setSelectedExercise(null);
      refetchExercises();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować ćwiczenia.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    form.reset({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      description: exercise.description,
      image: exercise.image,
      type: exercise.type || 'system',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteExercise = async (exercise: Exercise) => {
    try {
      await deleteDoc('exercises', exercise.id || exercise._id);
      toast({ title: "Sukces!", description: "Ćwiczenie zostało usunięte.", variant: 'destructive'});
      refetchExercises();
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć ćwiczenia.",
        variant: "destructive"
      });
    }
  };

  const getOwnerBadge = (ownerId: string | undefined) => {
    if (ownerId === 'public') {
      return <Badge variant="secondary">Publiczne</Badge>;
    }
    if (ownerId) {
      return <Badge variant="outline">Użytkownika</Badge>;
    }
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Wszystkie Ćwiczenia</h1>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Szukaj ćwiczeń..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredExercises && filteredExercises.length > 0 ? (
          filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="overflow-hidden transition-all hover:shadow-lg flex flex-col">
              <div className="relative h-48 w-full">
                <Image
                  src={exercise.image}
                  alt={exercise.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <CardHeader>
                  <CardTitle className="font-headline">{exercise.name}</CardTitle>
                <div className="flex justify-between items-center pt-1">
                  <Badge variant="secondary">{exercise.muscleGroup}</Badge>
                  {getOwnerBadge(exercise.ownerId)}
                </div>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => openEditDialog(exercise)}>
                        <Edit className="mr-2 h-3 w-3" />
                        Edytuj
                    </Button>
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDeleteExercise(exercise)}>
                        <Trash2 className="mr-2 h-3 w-3" />
                        Usuń
                    </Button>
                  </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-20">
              <p>Brak ćwiczeń w systemie.</p>
          </Card>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setEditDialogOpen(isOpen); if(!isOpen) setSelectedExercise(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Edytuj Ćwiczenie</DialogTitle>
            <DialogDescription>
              Zaktualizuj szczegóły tego ćwiczenia.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa</FormLabel>
                    <FormControl><Input {...field} disabled={isUpdating} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="muscleGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupa mięśniowa</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUpdating || muscleGroupsLoading}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Wybierz grupę mięśniową" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {muscleGroups?.map(group => (
                                <SelectItem key={group.id || group._id} value={group.name}>{group.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ ćwiczenia</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUpdating}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz typ ćwiczenia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="system">Systemowe</SelectItem>
                        <SelectItem value="custom">Własne</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl><Textarea {...field} disabled={isUpdating} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Obrazu</FormLabel>
                    <FormControl><Input {...field} disabled={isUpdating} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isUpdating}>Anuluj</Button>
                </DialogClose>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Zapisz zmiany
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

