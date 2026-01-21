<<<<<<< HEAD
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/hooks/useMutation';
import { Goal } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
=======
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

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
import type { Goal, UserAchievement } from '@/types';
import { PlusCircle, Calendar as CalendarIcon, Loader2, Trophy, Upload, MoreVertical, Edit, Trash2, Medal, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
<<<<<<< HEAD
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { PlusCircle, Target, Loader2, Trophy, MoreVertical, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface GoalFormData {
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    title: '',
    target: 100,
    current: 0,
    unit: 'kg',
    deadline: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  });

  const { data: goals, isLoading, refetch } = useCollection<Goal>(
    user?.id ? 'goals' : null,
    { query: { ownerId: user?.id } }
  );

  const { mutate: createDoc, isPending: isCreating } = useCreateDoc<Goal>('goals');
  const { mutate: updateDoc, isPending: isUpdating } = useUpdateDoc<Goal>('goals');
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDoc('goals');

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      const targetVal = goal.target ?? goal.targetValue ?? 0;
      const currentVal = goal.current ?? goal.currentValue ?? 0;
      const deadlineVal = goal.deadline ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      setFormData({
        title: goal.title,
        target: targetVal,
        current: currentVal,
        unit: goal.unit,
        deadline: format(new Date(deadlineVal), 'yyyy-MM-dd'),
      });
    } else {
      setEditingGoal(null);
      setFormData({
        title: '',
        target: 100,
        current: 0,
        unit: 'kg',
        deadline: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGoal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const goalData = {
      title: formData.title,
      target: Number(formData.target),
      current: Number(formData.current),
      unit: formData.unit,
      deadline: new Date(formData.deadline).toISOString(),
      ownerId: user.id,
    };

    if (editingGoal) {
      updateDoc(
        { id: editingGoal.id, data: goalData },
        {
          onSuccess: () => {
            toast.success('Cel został zaktualizowany.');
            handleCloseDialog();
            refetch();
          },
          onError: () => {
            toast.error('Nie udało się zaktualizować celu.');
          }
        }
      );
    } else {
      createDoc(goalData, {
        onSuccess: () => {
          toast.success('Nowy cel został dodany.');
          handleCloseDialog();
          refetch();
        },
        onError: () => {
          toast.error('Nie udało się dodać celu.');
        }
      });
    }
  };

  const handleDelete = () => {
    if (!deleteGoal) return;

    deleteDoc(deleteGoal.id, {
      onSuccess: () => {
        toast.success('Cel został usunięty.');
        setDeleteGoal(null);
        refetch();
      },
      onError: () => {
        toast.error('Nie udało się usunąć celu.');
      }
    });
  };

  const isSaving = isCreating || isUpdating;

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Cele i Trofea</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ustaw Nowy Cel
        </Button>
      </div>

      {/* Active Goals Section */}
      <section className="mb-12">
        <h2 className="mb-4 font-headline text-2xl font-semibold">Aktywne Cele</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <Skeleton className="h-8 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </CardFooter>
              </Card>
            ))
          ) : goals?.length === 0 ? (
            <Card onClick={() => handleOpenDialog()} className="flex flex-col items-center justify-center border-dashed hover:border-primary hover:bg-secondary/30 transition-colors cursor-pointer min-h-[280px] col-span-full max-w-md mx-auto">
              <CardContent className="text-center p-6">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Brak aktywnych celów</h3>
=======
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
import { useAuth } from '@/contexts/AuthContext';
import { useCollection, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useAchievements, useGamificationProfile } from '@/hooks/useGamification';
import { AchievementsGrid, AchievementNotification, useAchievementNotifications } from '@/components/gamification';
import { toast } from 'sonner';

// --- SCHEMAS ---

const goalSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  target: z.number().positive('Cel musi być liczbą dodatnią.'),
  current: z.number().min(0, 'Aktualna wartość nie może być ujemna.'),
  unit: z.string().min(1, 'Jednostka jest wymagana (np. kg, km, powtórzenia).'),
  deadline: z.date({ message: 'Termin jest wymagany.' }),
});

const achievementSchema = z.object({
  title: z.string().min(1, 'Tytuł jest wymagany.'),
  description: z.string().optional(),
  date: z.date({ message: 'Data jest wymagana.' }),
});

type GoalFormValues = z.infer<typeof goalSchema>;
type AchievementFormValues = z.infer<typeof achievementSchema>;


// --- GOAL FORM ---
function GoalForm({ onFormSubmit, goal, onDialogClose }: { onFormSubmit: (data: GoalFormValues) => Promise<void>, goal?: Goal | null, onDialogClose: () => void }) {
  const isEditMode = !!goal;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: isEditMode && goal ? {
      title: goal.title,
      target: goal.target,
      current: goal.current,
      unit: goal.unit,
      deadline: goal.deadline ? new Date(goal.deadline) : undefined,
    } : {
      title: '',
      target: 100,
      current: 0,
      unit: 'kg',
      deadline: undefined,
    },
  });

  const handleSubmit = async (data: GoalFormValues) => {
    try {
      await onFormSubmit(data);
      form.reset();
      onDialogClose();
    } catch (error) {
      console.error('Error submitting goal:', error);
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
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      disabled={form.formState.isSubmitting}
                    />
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
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      disabled={form.formState.isSubmitting}
                    />
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
  const { user } = useAuth();
  const { mutateAsync: createDoc, isPending: isLoading } = useCreateDoc<UserAchievement>('achievements');
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
    }
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  async function onSubmit(data: AchievementFormValues) {
    if (!user) return;

    const photoURLs = photoPreviews.length > 0
      ? photoPreviews
      : [`https://picsum.photos/seed/${data.title}/400/300`];

    const newAchievementData: Partial<UserAchievement> = {
      title: data.title,
      description: data.description || '',
      date: data.date.toISOString(),
      photoURLs,
      ownerId: user.id,
    };

    try {
      await createDoc(newAchievementData);
      toast.success('Trofeum Dodane!', {
        description: `Twoje osiągnięcie "${data.title}" zostało dodane do galerii.`,
      });
      form.reset();
      setPhotoPreviews([]);
      onAchievementAdded();
    } catch (error) {
      console.error("Error adding achievement:", error);
      toast.error("Błąd", { description: "Nie udało się dodać trofeum." });
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
                    <Calendar locale={pl} mode="single" selected={field.value} onSelect={field.onChange} />
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
                          <img src={src} alt={`Podgląd zdjęcia ${index + 1}`} className="rounded-md object-cover w-full h-full" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => {
                              setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
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
            <Button type="button" variant="secondary" disabled={isLoading}>Anuluj</Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz Trofeum
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


// --- CONVERT GOAL TO ACHIEVEMENT FORM ---

function ConvertGoalToAchievementForm({ goal, onConverted }: { goal: Goal, onConverted: () => void }) {
  const { user } = useAuth();
  const { mutateAsync: createDoc, isPending: isCreating } = useCreateDoc<UserAchievement>('achievements');
  const { mutateAsync: deleteDoc, isPending: isDeleting } = useDeleteDoc('goals');
  const isLoading = isCreating || isDeleting;

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: {
      title: goal.title,
      description: `Osiągnięto cel: ${goal.target} ${goal.unit}`,
      date: new Date(),
    }
  });

  async function onSubmit(data: AchievementFormValues) {
    if (!user) return;

    const photoURLs = [`https://picsum.photos/seed/${encodeURIComponent(data.title)}/400/300`];

    const newAchievementData: Partial<UserAchievement> = {
      title: data.title,
      description: data.description || '',
      date: data.date.toISOString(),
      photoURLs,
      ownerId: user.id,
    };

    try {
      await createDoc(newAchievementData);
      await deleteDoc(goal.id);

      toast.success('Cel Osiągnięty!', {
        description: 'Gratulacje! Twój cel został przeniesiony do trofeów.',
      });
      form.reset();
      onConverted();
    } catch (error) {
      console.error("Error converting goal:", error);
      toast.error("Błąd", { description: "Nie udało się przenieść celu." });
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
                    <Calendar locale={pl} mode="single" selected={field.value} onSelect={field.onChange} />
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
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isLoading}>Anuluj</Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
  const { user } = useAuth();
  const { mutateAsync: createDoc } = useCreateDoc<Goal>('goals');
  const { mutateAsync: updateDoc } = useUpdateDoc<Goal>('goals');
  const { mutateAsync: deleteDoc } = useDeleteDoc('goals');

  // Fetch Goals
  const { data: goals, isLoading: goalsLoading, refetch: refetchGoals } = useCollection<Goal>(
    user ? 'goals' : null,
    { query: { ownerId: user?.id } }
  );

  // Fetch Achievements (user trophies)
  const { data: achievements, isLoading: achievementsLoading, refetch: refetchAchievements } = useCollection<UserAchievement>(
    user ? 'achievements' : null,
    { query: { ownerId: user?.id }, sort: { date: -1 } }
  );

  // Gamification hooks
  const { stats: gamificationStats, refreshProfile } = useGamificationProfile();
  const { achievements: badges, isLoading: badgesLoading, checkAchievements, refreshAchievements: refetchBadges } = useAchievements();
  const { currentNotification, addNotifications, dismissCurrent } = useAchievementNotifications();

  const isLoading = goalsLoading || achievementsLoading;

  const handleGoalDialogClose = () => {
    setEditingGoal(null);
    setGoalDialogOpen(false);
  };

  const handleGoalFormSubmit = async (data: GoalFormValues) => {
    if (!user) return;

    try {
      if (editingGoal) {
        const updatedGoalData = { ...data, deadline: data.deadline.toISOString() };
        await updateDoc({ id: editingGoal.id, data: updatedGoalData });
        toast.success('Cel Zaktualizowany!', { description: `Twój cel "${data.title}" został zmieniony.` });
      } else {
        const newGoalData: Partial<Goal> = {
          ...data,
          deadline: data.deadline.toISOString(),
          ownerId: user.id
        };
        await createDoc(newGoalData);
        toast.success('Cel Ustawiony!', { description: `Twój nowy cel "${data.title}" został dodany.` });
      }
      refetchGoals();
    } catch (error) {
      toast.error("Błąd", { description: "Nie udało się zapisać celu." });
      throw error;
    }
  };

  const handleAchievementAdded = () => {
    setAchievementDialogOpen(false);
    refetchAchievements();
  }

  const handleGoalConverted = async () => {
    setGoalToConvert(null);
    refetchGoals();
    refetchAchievements();
    // Sprawdź nowe odznaki gamifikacji
    try {
      const result = await checkAchievements();
      if (result?.newAchievements?.length > 0) {
        addNotifications(result.newAchievements);
        toast.success('Nowe odznaki!', {
          description: `Odblokowałeś ${result.newAchievements.length} nowych odznak!`,
        });
      }
      refreshProfile();
      refetchBadges();
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete || !user) return;
    try {
      await deleteDoc(goalToDelete.id);
      toast.success("Cel usunięty");
      setGoalToDelete(null);
      refetchGoals();
    } catch (error) {
      toast.error("Błąd", { description: "Nie udało się usunąć celu." });
    }
  };

  return (
    <AlertDialog>
      {/* Achievement unlock notification */}
      <AchievementNotification
        achievement={currentNotification}
        onClose={dismissCurrent}
      />
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
              Array.from({ length: 3 }).map((_, i) => (
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
                        <CardDescription>Termin: {format(new Date(goal.deadline), 'd MMM yyyy', { locale: pl })}</CardDescription>
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
                        Pozostało {formatDistanceToNow(new Date(goal.deadline), { locale: pl, addSuffix: true })}
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
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
                <p className="text-muted-foreground mb-4">Zdefiniuj swój następny cel i pozostań zmotywowany.</p>
                <Button variant="outline">Ustaw Nowy Cel</Button>
              </CardContent>
            </Card>
<<<<<<< HEAD
          ) : goals?.map((goal) => {
            const targetVal = goal.target ?? goal.targetValue ?? 0;
            const currentVal = goal.current ?? goal.currentValue ?? 0;
            const progress = targetVal > 0 ? Math.min((currentVal / targetVal) * 100, 100) : 0;
            const isCompleted = progress >= 100;
            const deadlineVal = goal.deadline ?? goal.createdAt;

            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-headline">{goal.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <CalendarIcon className="h-3 w-3" />
                        Termin: {deadlineVal ? format(new Date(deadlineVal), 'd MMM yyyy', { locale: pl }) : 'Brak terminu'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(goal)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edytuj</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteGoal(goal)}>
                          <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                          <span className="text-destructive">Usuń</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="mb-2 flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold">{currentVal.toLocaleString()}</span>
                    <span className="text-muted-foreground">/ {targetVal.toLocaleString()} {goal.unit}</span>
                  </div>
                  <Progress
                    value={progress}
                    className={isCompleted ? '[&>div]:bg-green-500' : ''}
                  />
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    {progress.toFixed(0)}% ukończono
                  </p>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  {isCompleted ? (
                    <div className="w-full text-center">
                      <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                        <Trophy className="h-5 w-5" />
                        Cel osiągnięty!
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground w-full text-center">
                      {deadlineVal ? `Pozostało ${formatDistanceToNow(new Date(deadlineVal), { locale: pl, addSuffix: true })}` : 'Brak terminu'}
                    </p>
                  )}
                </CardFooter>
              </Card>
            );
          })}

          {goals && goals.length > 0 && (
            <Card onClick={() => handleOpenDialog()} className="flex flex-col items-center justify-center border-dashed hover:border-primary hover:bg-secondary/30 transition-colors cursor-pointer min-h-[280px]">
              <CardContent className="text-center p-6">
                <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Stwórz Nowy Cel</h3>
                <p className="text-muted-foreground mb-4">Zdefiniuj swój następny cel.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Goal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="font-headline">
                {editingGoal ? 'Edytuj Cel' : 'Ustaw Nowy Cel'}
              </DialogTitle>
              <DialogDescription>
                {editingGoal ? 'Zaktualizuj szczegóły swojego celu.' : 'Zdefiniuj swój następny cel i pozostań zmotywowany.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł Celu</Label>
                <Input
                  id="title"
                  placeholder="np. Wyciskanie na ławce 100kg"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current">Aktualnie</Label>
                  <Input
                    id="current"
                    type="number"
                    value={formData.current}
                    onChange={(e) => setFormData(prev => ({ ...prev, current: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Cel</Label>
                  <Input
                    id="target"
                    type="number"
                    value={formData.target}
                    onChange={(e) => setFormData(prev => ({ ...prev, target: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Jednostka</Label>
                  <Input
                    id="unit"
                    placeholder="kg, km, powt."
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Termin</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog} disabled={isSaving}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingGoal ? 'Zapisz Zmiany' : 'Zapisz Cel'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteGoal} onOpenChange={() => setDeleteGoal(null)}>
=======
          </div>
        </section>

        {/* --- Gamification Badges Section --- */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-2xl font-semibold flex items-center gap-2">
              <Medal className="h-6 w-6 text-yellow-500" />
              Odznaki Gamifikacji
            </h2>
            {gamificationStats && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Poziom {gamificationStats.level}</span>
                <span>•</span>
                <span>{gamificationStats.currentFitCoins} FitCoins</span>
              </div>
            )}
          </div>

          {/* Mini stats card */}
          {gamificationStats && (
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{gamificationStats.level}</p>
                  <p className="text-xs text-muted-foreground">Poziom</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{gamificationStats.currentFitCoins}</p>
                  <p className="text-xs text-muted-foreground">FitCoins</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{gamificationStats.streaks.goals}</p>
                  <p className="text-xs text-muted-foreground">Seria celów</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{gamificationStats.achievementCount}</p>
                  <p className="text-xs text-muted-foreground">Odznaki</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Badges Grid */}
          {badgesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><div className="h-6 bg-muted rounded w-3/4"></div></CardHeader>
                  <CardContent><div className="h-4 bg-muted rounded w-full mb-2"></div><div className="h-3 bg-muted rounded w-full"></div></CardContent>
                </Card>
              ))}
            </div>
          ) : badges.length === 0 ? (
            <Card className="flex flex-col items-center justify-center border-dashed py-12">
              <CardContent className="text-center">
                <Medal className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Brak dostępnych odznak</h3>
                <p className="text-muted-foreground">Zdobywaj odznaki kończąc cele i treningi!</p>
              </CardContent>
            </Card>
          ) : (
            <AchievementsGrid achievements={badges} />
          )}
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
                            <img src={url} alt={`${achievement.title} ${index + 1}`} className="object-cover w-full h-full" />
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
                    <CardDescription>{format(new Date(achievement.date), 'd MMMM yyyy', { locale: pl })}</CardDescription>
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

>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten cel?</AlertDialogTitle>
            <AlertDialogDescription>
<<<<<<< HEAD
              Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie celu "{deleteGoal?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
=======
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
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
  );
}
