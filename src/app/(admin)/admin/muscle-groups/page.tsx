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
import { useCollection, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
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
import { Skeleton } from '@/components/ui/skeleton';

interface MuscleGroup {
  id: string;
  name: string;
  imageUrl?: string;
  imageHint?: string;
}

const muscleGroupSchema = z.object({
  name: z.string().min(1, 'Nazwa grupy jest wymagana.'),
  imageUrl: z.string().url('Nieprawidłowy URL obrazka.').optional().or(z.literal('')),
});

type MuscleGroupFormValues = z.infer<typeof muscleGroupSchema>;

export default function MuscleGroupsPage() {
  const { toast } = useToast();
  const [editingGroup, setEditingGroup] = useState<MuscleGroup | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: muscleGroups, isLoading, refetch } = useCollection<MuscleGroup>('muscleGroups');
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      const imageUrl = `/api/images/${data.fileId}`;
      form.setValue('imageUrl', imageUrl);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać obrazka.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const isSubmitting = isCreating || isUpdating;

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
      imageUrl: group.imageUrl || '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setEditingGroup(null);
    form.reset({ name: '', imageUrl: '' });
    setIsDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setEditingGroup(null);
    form.reset({ name: '', imageUrl: '' });
    setIsDialogOpen(false);
  }

  const handleFormSubmit = async (data: MuscleGroupFormValues) => {
    try {
      if (editingGroup) {
        // Update
        const updatedData = {
          name: data.name,
          imageUrl: data.imageUrl || editingGroup.imageUrl,
          imageHint: data.name.toLowerCase(),
        };

        await updateDoc('muscleGroups', editingGroup.id, updatedData);
        toast({
          title: 'Sukces!',
          description: 'Grupa mięśniowa została zaktualizowana.'
        });
      } else {
        // Create
        const newGroupData = {
          name: data.name,
          imageUrl: data.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(data.name)}/400/300`,
          imageHint: data.name.toLowerCase(),
        };

        await createDoc('muscleGroups', newGroupData);
        toast({
          title: 'Sukces!',
          description: `Grupa mięśniowa "${data.name}" została dodana.`,
        });
      }

      handleCloseDialogs();
      refetch(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Błąd',
        description: editingGroup
          ? 'Nie udało się zaktualizować grupy mięśniowej.'
          : 'Nie udało się dodać grupy mięśniowej.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteDoc('muscleGroups', groupId);
      toast({
        title: 'Sukces!',
        description: 'Grupa mięśniowa została usunięta.',
        variant: 'destructive'
      });
      refetch(); // Refresh the list
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć grupy mięśniowej.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Zarządzanie Grupami Mięśniowymi</h1>
      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Dodaj Nową Grupę</CardTitle>
            <CardDescription>
              Dodaj nową grupę mięśniową. Jeśli nie podasz URL obrazka, zostanie on wygenerowany automatycznie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleOpenCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Dodaj nową grupę
            </Button>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseDialogs()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Edytuj grupę mięśniową' : 'Dodaj nową grupę'}</DialogTitle>
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

                <div className="space-y-2">
                  <FormLabel>Obrazek</FormLabel>
                  <div className="flex items-center gap-4">
                    {form.watch('imageUrl') && (
                      <div className="relative h-20 w-20 overflow-hidden rounded-md border">
                        <Image
                          src={form.watch('imageUrl') || ''}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                      />
                      {isUploadingImage && <p className="text-xs text-muted-foreground mt-1">Wysyłanie...</p>}
                    </div>
                  </div>
                  <input type="hidden" {...form.register('imageUrl')} />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSubmitting || isUploadingImage}>
                      Anuluj
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting || isUploadingImage}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingGroup ? 'Zapisz zmiany' : 'Dodaj'}
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
                <CardHeader className="flex-grow">
                  <CardTitle className="font-headline">{group.name}</CardTitle>
                </CardHeader>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleOpenEditDialog(group)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edytuj
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeleteGroup(group.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
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
