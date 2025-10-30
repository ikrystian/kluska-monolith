'use client';

import { useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Goal, Achievement } from '@/lib/types';
import { PlusCircle, Target, Calendar as CalendarIcon, Loader2, Trophy, Upload, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, collection, addDoc, Timestamp, deleteDoc, doc, query, orderBy, updateDoc, getStorage, ref as storageRef, uploadBytes, getDownloadURL } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

// --- SCHEMAS ---

const goalSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  target: z.coerce.number().positive('Cel musi być liczbą dodatnią.'),
  current: z.coerce.number().min(0, 'Aktualna wartość nie może być ujemna.'),
  unit: z.string().min(1, 'Jednostka jest wymagana (np. kg, km, powtórzenia).'),
  deadline: z.date({
    required_error: 'Termin jest wymagany.',
  }),
});

const achievementSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  description: z.string().optional(),
  date: z.date({
    required_error: 'Data jest wymagana.',
  }),
  photos: z.array(z.instanceof(File)).optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;
type AchievementFormValues = z.infer<typeof achievementSchema>;


// --- GOAL FORM ---
function GoalForm({ onFormSubmit, goal, onDialogClose }: { onFormSubmit: (data: GoalFormValues) => Promise<void>, goal?: Goal | null, onDialogClose: () => void }) {
  const isEditMode = !!goal;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: isEditMode ? {
        title: goal.title,
        target: goal.target,
        current: goal.current,
        unit: goal.unit,
        deadline: goal.deadline.toDate(),
    } : {
      title: '',
      target: 100,
      current: 0,
      unit: 'kg',
      deadline: undefined,
    },
  });

  const handleSubmit = async (data: GoalFormValues) => {
    await onFormSubmit(data);
    if (!form.formState.isSubmitting) {
        form.reset();
        onDialogClose();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? "Edytuj Cel" : "Ustaw Nowy Cel"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Zaktualizuj szczegóły swojego celu." : "Zdefiniuj swój następny cel i pozostań zmotywowany."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tytuł Celu</FormLabel>
                <FormControl>
                  <Input placeholder="np. Wyciskanie na ławce 100kg" {...field} disabled={form.formState.isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="current"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aktualnie</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={form.formState.isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cel</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={form.formState.isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jednostka</FormLabel>
                  <FormControl>
                    <Input placeholder="kg, km, powt." {...field} disabled={form.formState.isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Termin</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={form.formState.isSubmitting}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: pl })
                        ) : (
                          <span>Wybierz datę</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      locale={pl}
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date() || form.formState.isSubmitting}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>
              Anuluj
            </Button>
          </DialogClose>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Zapisz Zmiany" : "Zapisz Cel"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// --- ADD ACHIEVEMENT FORM ---
function AddAchievementForm({ onAchievementAdded }: { onAchievementAdded: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      photos: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "photos"
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
      files.forEach(file => append(file));
    }
  };

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    if (!user) return [];
    const storage = getStorage();
    const uploadPromises = photos.map(photo => {
      const filePath = `achievement-photos/${user.uid}/${new Date().getTime()}-${photo.name}`;
      const fileRef = storageRef(storage, filePath);
      return uploadBytes(fileRef, photo).then(snapshot => getDownloadURL(snapshot.ref));
    });
    return Promise.all(uploadPromises);
  };

  async function onSubmit(data: AchievementFormValues) {
    if (!user || !firestore) return;

    let photoURLs: string[] = [];
    if (data.photos && data.photos.length > 0) {
        try {
            photoURLs = await uploadPhotos(data.photos);
        } catch (error) {
            console.error("Error uploading photos: ", error);
            toast({
                title: 'Błąd przesyłania zdjęć',
                description: 'Nie udało się przesłać wszystkich zdjęć. Spróbuj ponownie.',
                variant: 'destructive',
            });
            return; // Stop submission if photo upload fails
        }
    } else {
        photoURLs.push(`https://picsum.photos/seed/${data.title}/400/300`);
    }

    const achievementsCollection = collection(firestore, `users/${user.uid}/achievements`);
    const newAchievementData = {
      title: data.title,
      description: data.description || '',
      date: Timestamp.fromDate(data.date),
      photoURLs,
      ownerId: user.uid,
    };

    try {
      await addDoc(achievementsCollection, newAchievementData);
      toast({
        title: 'Trofeum Dodane!',
        description: `Twoje osiągnięcie "${data.title}" zostało dodane do galerii.`,
      });
      form.reset();
      setPhotoPreviews([]);
      onAchievementAdded();
    } catch (serverError) {
      console.error("Error adding achievement:", serverError);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: achievementsCollection.path,
        operation: 'create',
        requestResourceData: newAchievementData,
      }));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle className="font-headline">Dodaj Nowe Trofeum</DialogTitle>
          <DialogDescription>
            Udokumentuj swoje osiągnięcie, aby zapamiętać ten moment.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tytuł Osiągnięcia</FormLabel>
                <FormControl>
                  <Input placeholder="np. Ukończony maraton" {...field} disabled={form.formState.isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Osiągnięcia</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        disabled={form.formState.isSubmitting}
                      >
                        {field.value ? format(field.value, 'PPP', { locale: pl }) : <span>Wybierz datę</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar locale={pl} mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opis (opcjonalnie)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Opisz swoje osiągnięcie..." {...field} disabled={form.formState.isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormLabel>Zdjęcia (opcjonalnie)</FormLabel>
            {photoPreviews.length > 0 && (
                 <Carousel className="w-full max-w-xs mx-auto">
                    <CarouselContent>
                        {photoPreviews.map((src, index) => (
                        <CarouselItem key={index}>
                            <div className="p-1">
                            <div className="relative aspect-video w-full">
                                <Image src={src} alt={`Podgląd zdjęcia ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={() => {
                                        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
                                        remove(index);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            </div>
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {photoPreviews.length > 0 ? 'Dodaj więcej zdjęć' : 'Dodaj pamiątkowe zdjęcia'}
            </Button>
            <Input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" multiple />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Anuluj</Button>
          </DialogClose>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz Trofeum
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


// --- CONVERT GOAL TO ACHIEVEMENT FORM ---

function ConvertGoalToAchievementForm({ goal, onConverted }: { goal: Goal, onConverted: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
        title: goal.title,
        description: `Osiągnięto cel: ${goal.target} ${goal.unit}`,
        date: new Date(),
        photos: [],
    }
  });

   const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "photos"
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
      files.forEach(file => append(file));
    }
  };

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    if (!user) return [];
    const storage = getStorage();
    const uploadPromises = photos.map(photo => {
      const filePath = `achievement-photos/${user.uid}/${new Date().getTime()}-${photo.name}`;
      const fileRef = storageRef(storage, filePath);
      return uploadBytes(fileRef, photo).then(snapshot => getDownloadURL(snapshot.ref));
    });
    return Promise.all(uploadPromises);
  };

  async function onSubmit(data: AchievementFormValues) {
    if (!user || !firestore) return;
    form.formState.isSubmitting;

    let photoURLs: string[] = [];
    if (data.photos && data.photos.length > 0) {
        try {
            photoURLs = await uploadPhotos(data.photos);
        } catch (error) {
            console.error("Error uploading photos: ", error);
            toast({
                title: 'Błąd przesyłania zdjęć',
                description: 'Nie udało się przesłać wszystkich zdjęć. Spróbuj ponownie.',
                variant: 'destructive',
            });
            return;
        }
    } else {
         photoURLs.push(`https://picsum.photos/seed/${data.title}/400/300`);
    }

    const achievementsCollection = collection(firestore, `users/${user.uid}/achievements`);
    const newAchievementData = {
      title: data.title,
      description: data.description || '',
      date: Timestamp.fromDate(data.date),
      photoURLs,
      ownerId: user.uid,
    };

    try {
      await addDoc(achievementsCollection, newAchievementData);
      const goalDocRef = doc(firestore, `users/${user.uid}/goals`, goal.id);
      await deleteDoc(goalDocRef);

      toast({
        title: 'Cel Osiągnięty!',
        description: 'Gratulacje! Twój cel został przeniesiony do trofeów.',
      });
      form.reset();
      setPhotoPreviews([]);
      onConverted();
    } catch (serverError) {
      console.error("Error converting goal:", serverError);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: achievementsCollection.path,
        operation: 'create',
        requestResourceData: newAchievementData,
      }));
    } finally {
        form.formState.isSubmitting = false;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle className="font-headline">Gratulacje! Zamień cel w trofeum.</DialogTitle>
          <DialogDescription>
            Dodaj szczegóły i zdjęcie, aby upamiętnić swój sukces.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tytuł Osiągnięcia</FormLabel>
                <FormControl>
                  <Input {...field} disabled={form.formState.isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data Osiągnięcia</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        disabled={form.formState.isSubmitting}
                      >
                        {field.value ? format(field.value, 'PPP', { locale: pl }) : <span>Wybierz datę</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar locale={pl} mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opis (opcjonalnie)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Opisz swoje osiągnięcie..." {...field} disabled={form.formState.isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormLabel>Zdjęcia (opcjonalnie)</FormLabel>
            {photoPreviews.length > 0 && (
                 <Carousel className="w-full max-w-xs mx-auto">
                    <CarouselContent>
                        {photoPreviews.map((src, index) => (
                        <CarouselItem key={index}>
                            <div className="p-1">
                            <div className="relative aspect-video w-full">
                                <Image src={src} alt={`Podgląd zdjęcia ${index + 1}`} layout="fill" objectFit="cover" className="rounded-md" />
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6"
                                    onClick={() => {
                                        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
                                        remove(index);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            </div>
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={() => photoInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {photoPreviews.length > 0 ? 'Dodaj więcej zdjęć' : 'Dodaj pamiątkowe zdjęcia'}
            </Button>
            <Input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" multiple />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Anuluj</Button>
          </DialogClose>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz Trofeum
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


// --- MAIN PAGE COMPONENT ---

export default function GoalsAndAchievementsPage() {
  const [isGoalDialogOpen, setGoalDialogOpen] = useState(false);
  const [isAchievementDialogOpen, setAchievementDialogOpen] = useState(false);
  const [goalToConvert, setGoalToConvert] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Fetch Goals
  const goalsRef = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/goals`) : null,
    [user, firestore]
  );
  const { data: goals, isLoading: goalsLoading } = useCollection<Goal>(goalsRef);

  // Fetch Achievements
  const achievementsRef = useMemoFirebase(() =>
    user ? query(collection(firestore, `users/${user.uid}/achievements`), orderBy('date', 'desc')) : null,
    [user, firestore]
  );
  const { data: achievements, isLoading: achievementsLoading } = useCollection<Achievement>(achievementsRef);

  const isLoading = goalsLoading || achievementsLoading;

  const handleGoalDialogClose = () => {
    setEditingGoal(null);
    setGoalDialogOpen(false);
  };

  const handleGoalFormSubmit = async (data: GoalFormValues) => {
    if (!user || !firestore) return;

    if (editingGoal) {
      // Update
      const goalDocRef = doc(firestore, `users/${user.uid}/goals`, editingGoal.id);
      const updatedGoalData = {
        ...data,
        deadline: Timestamp.fromDate(data.deadline),
      };
      await updateDoc(goalDocRef, updatedGoalData)
        .then(() => {
          toast({ title: 'Cel Zaktualizowany!', description: `Twój cel "${data.title}" został zmieniony.` });
        })
        .catch((serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: goalDocRef.path,
            operation: 'update',
            requestResourceData: updatedGoalData,
          }));
        });
    } else {
      // Create
      const goalsCollection = collection(firestore, `users/${user.uid}/goals`);
      const newGoalData = {
        ...data,
        deadline: Timestamp.fromDate(data.deadline),
        ownerId: user.uid,
      };
      await addDoc(goalsCollection, newGoalData)
        .then(() => {
          toast({ title: 'Cel Ustawiony!', description: `Twój nowy cel "${data.title}" został dodany.` });
        })
        .catch((serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: goalsCollection.path,
            operation: 'create',
            requestResourceData: newGoalData,
          }));
        });
    }
  };

  const handleAchievementAdded = () => {
    setAchievementDialogOpen(false);
  }

  const handleGoalConverted = () => {
    setGoalToConvert(null);
  }

  const handleDeleteGoal = async () => {
    if (!goalToDelete || !user || !firestore) return;
    const goalDocRef = doc(firestore, `users/${user.uid}/goals`, goalToDelete.id);
    await deleteDoc(goalDocRef)
      .then(() => {
        toast({ title: "Cel usunięty", variant: "destructive" });
        setGoalToDelete(null);
      })
      .catch((serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: goalDocRef.path,
          operation: 'delete',
        }));
      });
  };

  return (
    <AlertDialog>
    <div className="container mx-auto p-4 md:p-8">
      {/* --- Header --- */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Cele i Trofea</h1>
        <Button onClick={() => { setEditingGoal(null); setGoalDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ustaw Nowy Cel
        </Button>
      </div>

      {/* --- Active Goals Section --- */}
      <section className="mb-12">
          <h2 className="mb-4 font-headline text-2xl font-semibold">Aktywne Cele</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
              Array.from({length: 3}).map((_, i) => (
                  <Card key={i} className="flex flex-col">
                  <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-2" /></CardHeader>
                  <CardContent className="flex-grow space-y-2"><Skeleton className="h-8 w-1/2 mx-auto" /><Skeleton className="h-4 w-full" /></CardContent>
                  <CardFooter><Skeleton className="h-4 w-1/3 mx-auto" /></CardFooter>
                  </Card>
              ))
              ) : goals?.map((goal) => {
              const progress = Math.min((goal.current / goal.target) * 100, 100);
              const isCompleted = progress >= 100;
              return (
                  <Card key={goal.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="font-headline">{goal.title}</CardTitle>
                                <CardDescription>Termin: {format(goal.deadline.toDate(), 'd MMM yyyy', { locale: pl })}</CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setEditingGoal(goal); setGoalDialogOpen(true); }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edytuj</span>
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setGoalToDelete(goal)}>
                                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                        <span className="text-destructive">Usuń</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="mb-2 flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold">{goal.current.toLocaleString()}</span>
                      <span className="text-muted-foreground">/ {goal.target.toLocaleString()} {goal.unit}</span>
                      </div>
                      <Progress value={progress} aria-label={`${goal.title} postęp`} className={isCompleted ? '[&>div]:bg-green-500' : ''} />
                      <p className="text-center text-sm text-muted-foreground mt-2">{progress.toFixed(0)}% ukończono</p>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        {isCompleted ? (
                            <Button onClick={() => setGoalToConvert(goal)} className="w-full bg-green-600 hover:bg-green-700">
                                <Trophy className="mr-2 h-4 w-4" /> Zamień w Trofeum
                            </Button>
                        ) : (
                            <p className="text-xs text-muted-foreground w-full text-center">
                                Pozostało {formatDistanceToNow(goal.deadline.toDate(), { locale: pl, addSuffix: true })}
                            </p>
                        )}
                    </CardFooter>
                  </Card>
              );
              })}

              <Card onClick={() => { setEditingGoal(null); setGoalDialogOpen(true); }} className="flex flex-col items-center justify-center border-dashed hover:border-primary hover:bg-secondary/30 transition-colors cursor-pointer min-h-[280px]">
                  <CardContent className="text-center p-6">
                      <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-headline text-xl font-semibold mb-2">Stwórz Nowy Cel</h3>
                      <p className="text-muted-foreground mb-4">Zdefiniuj swój następny cel i pozostań zmotywowany.</p>
                      <Button variant="outline">Ustaw Nowy Cel</Button>
                  </CardContent>
              </Card>
          </div>
      </section>

      {/* --- Achievements Section --- */}
      <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-2xl font-semibold">Zdobyte Trofea</h2>
            <Button variant="outline" onClick={() => setAchievementDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Dodaj Trofeum
            </Button>
          </div>
           {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
              </div>
          ) : achievements?.length === 0 ? (
              <Card className="flex flex-col items-center justify-center border-dashed py-20">
              <CardContent className="text-center">
                  <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-headline text-xl font-semibold mb-2">Brak Trofeów</h3>
                  <p className="text-muted-foreground">Osiągnij swoje cele lub dodaj osiągnięcie ręcznie, aby zapełnić tę galerię chwały!</p>
              </CardContent>
              </Card>
          ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements?.map((achievement) => (
                      <Card key={achievement.id} className="overflow-hidden flex flex-col">
                          <Carousel className="w-full">
                            <CarouselContent>
                                {achievement.photoURLs?.map((url, index) => (
                                <CarouselItem key={index}>
                                    <div className="relative w-full aspect-4/3">
                                        <Image src={url} alt={`${achievement.title} ${index + 1}`} layout="fill" objectFit="cover" />
                                    </div>
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                            {achievement.photoURLs && achievement.photoURLs.length > 1 && (
                                <>
                                <CarouselPrevious className="left-4" />
                                <CarouselNext className="right-4" />
                                </>
                            )}
                         </Carousel>
                          <CardHeader>
                              <CardTitle className="font-headline">{achievement.title}</CardTitle>
                              <CardDescription>{format(achievement.date.toDate(), 'd MMMM yyyy', { locale: pl })}</CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow">
                              <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          </CardContent>
                      </Card>
                  ))}
              </div>
          )}
      </section>

      {/* --- Dialogs --- */}
      <Dialog open={isGoalDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleGoalDialogClose(); else setGoalDialogOpen(true); }}>
        <DialogContent>
            <GoalForm onFormSubmit={handleGoalFormSubmit} goal={editingGoal} onDialogClose={handleGoalDialogClose} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAchievementDialogOpen} onOpenChange={setAchievementDialogOpen}>
          <DialogContent>
              <AddAchievementForm onAchievementAdded={handleAchievementAdded} />
          </DialogContent>
      </Dialog>

      <Dialog open={!!goalToConvert} onOpenChange={() => setGoalToConvert(null)}>
          <DialogContent>
              {goalToConvert && <ConvertGoalToAchievementForm goal={goalToConvert} onConverted={handleGoalConverted} />}
          </DialogContent>
      </Dialog>

        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten cel?</AlertDialogTitle>
            <AlertDialogDescription>
                Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie celu "{goalToDelete?.title}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGoalToDelete(null)}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive hover:bg-destructive/90">Usuń</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </div>
    </AlertDialog>
  );
}

