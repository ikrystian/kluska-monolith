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
import { Exercise, MuscleGroupName, MuscleGroup } from '@/lib/types';
import { Search, Loader2, Edit, Trash2, Filter, PlayCircle, PlusCircle, Dumbbell, Repeat, Timer, Check, Upload, Sparkles, Link, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useUpdateDoc, useDeleteDoc, useCreateDoc } from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { MultiSelect } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { UploadButton } from '@/lib/uploadthing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const exerciseSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana.'),
  mainMuscleGroups: z.array(z.string()).min(1, 'Przynajmniej jedna główna grupa mięśniowa jest wymagana.'),
  secondaryMuscleGroups: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  mediaUrl: z.string().url('Nieprawidłowy URL multimediów.').optional().or(z.literal('')),
  type: z.enum(['weight', 'duration', 'reps'], { required_error: "Typ ćwiczenia jest wymagany." }).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

type ExerciseFormValues = z.infer<typeof exerciseSchema>;

export default function AdminExercisesPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageSourceTab, setImageSourceTab] = useState<string>('upload');

  const { data: allExercises, isLoading: exercisesLoading, refetch: refetchExercises } = useCollection<Exercise>('exercises');
  const muscleGroupOptions = Object.values(MuscleGroupName).map(name => ({ label: name, value: name }));

  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();

  const isLoading = exercisesLoading;

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      mainMuscleGroups: [],
      secondaryMuscleGroups: [],
      mediaUrl: '',
      instructions: '',
      name: '',
      type: 'weight'
    }
  });

  const filteredExercises = allExercises?.filter(
    (exercise) => {
      const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.mainMuscleGroups.some(mg => mg.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter = muscleGroupFilter
        ? exercise.mainMuscleGroups.some(mg => mg.name === muscleGroupFilter) || exercise.muscleGroup === muscleGroupFilter
        : true;

      return matchesSearch && matchesFilter;
    }
  );

  const generateAiImage = async (prompt: string): Promise<string> => {
    setIsGeneratingImage(true);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        throw new Error('Failed to generate image');
      }
      const data = await res.json();
      return data.imageUrl;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateImage = async () => {
    const exerciseName = form.getValues('name');
    if (!exerciseName) {
      toast({
        title: "Błąd",
        description: "Wprowadź najpierw nazwę ćwiczenia.",
        variant: "destructive"
      });
      return;
    }
    try {
      const imageUrl = await generateAiImage(exerciseName);
      setUploadedImageUrl(imageUrl);
      form.setValue('mediaUrl', imageUrl);
      toast({ title: "Sukces!", description: "Obrazek został wygenerowany." });
    } catch (error) {
      toast({
        title: "Błąd",
        description: "Nie udało się wygenerować obrazka.",
        variant: "destructive"
      });
    }
  };

  const clearImage = () => {
    setUploadedImageUrl('');
    form.setValue('mediaUrl', '');
  };

  const handleFormSubmit = async (data: ExerciseFormValues) => {
    const mainMuscleGroups: MuscleGroup[] = data.mainMuscleGroups.map(name => ({ name: name as MuscleGroupName }));
    const secondaryMuscleGroups: MuscleGroup[] = (data.secondaryMuscleGroups || []).map(name => ({ name: name as MuscleGroupName }));

    // Use uploaded/generated image URL if available, otherwise use form mediaUrl
    const finalImageUrl = uploadedImageUrl || data.mediaUrl || data.image;

    try {
      if (selectedExercise) {
        // Update existing
        const updatedData: Partial<Exercise> = {
          name: data.name,
          mainMuscleGroups,
          secondaryMuscleGroups,
          instructions: data.instructions || data.description,
          mediaUrl: finalImageUrl,
          type: data.type,
          muscleGroup: data.mainMuscleGroups[0], // Legacy
          description: data.instructions || data.description, // Legacy
          image: finalImageUrl, // Legacy
          imageHint: data.name.toLowerCase(),
        };
        await updateDoc('exercises', selectedExercise.id, updatedData);
        toast({ title: "Sukces!", description: "Ćwiczenie zostało zaktualizowane." });
      } else {
        // Create new
        const newExerciseData = {
          name: data.name,
          mainMuscleGroups,
          secondaryMuscleGroups,
          instructions: data.instructions || data.description,
          mediaUrl: finalImageUrl,
          type: data.type,
          muscleGroup: data.mainMuscleGroups[0], // Legacy
          description: data.instructions || data.description, // Legacy
          image: finalImageUrl, // Legacy
          imageHint: data.name.toLowerCase(),
          ownerId: 'public', // Admin creates public exercises
        };
        await createDoc('exercises', newExerciseData);
        toast({ title: "Sukces!", description: "Nowe ćwiczenie zostało dodane." });
      }
      setEditDialogOpen(false);
      setSelectedExercise(null);
      setUploadedImageUrl('');
      setImageSourceTab('upload');
      refetchExercises();
    } catch (error) {
      console.error(error);
      toast({
        title: "Błąd",
        description: "Wystąpił błąd podczas zapisywania ćwiczenia.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    const existingImageUrl = exercise.mediaUrl || exercise.image || '';
    setUploadedImageUrl(existingImageUrl);
    setImageSourceTab(existingImageUrl ? 'url' : 'upload');
    form.reset({
      name: exercise.name,
      mainMuscleGroups: exercise.mainMuscleGroups?.map(mg => mg.name) || (exercise.muscleGroup ? [exercise.muscleGroup] : []),
      secondaryMuscleGroups: exercise.secondaryMuscleGroups?.map(mg => mg.name) || [],
      instructions: exercise.instructions || exercise.description || '',
      mediaUrl: existingImageUrl,
      type: exercise.type || 'weight',
      description: exercise.description || '',
      image: exercise.image || '',
    });
    setEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setSelectedExercise(null);
    setUploadedImageUrl('');
    setImageSourceTab('upload');
    form.reset({
      name: '',
      mainMuscleGroups: [],
      secondaryMuscleGroups: [],
      instructions: '',
      mediaUrl: '',
      type: 'weight',
      description: '',
      image: '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteExercise = async (exercise: Exercise) => {
    try {
      await deleteDoc('exercises', exercise.id);
      toast({ title: "Sukces!", description: "Ćwiczenie zostało usunięte.", variant: 'destructive' });
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
    if (ownerId === 'public' || !ownerId) {
      return <Badge variant="secondary">Publiczne</Badge>;
    }
    return <Badge variant="outline">Użytkownika</Badge>;
  }

  const isVideoUrl = (url: string | undefined) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('.mp4') || url.includes('.webm');
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Wszystkie Ćwiczenia</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Szukaj ćwiczeń..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={openAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Dodaj ćwiczenie
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={muscleGroupFilter ? "bg-secondary" : ""}>
                <Filter className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Filtruj</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-2">
                <div className="mb-2 text-xs font-medium text-muted-foreground px-2">Grupa mięśniowa</div>
                <Select
                  value={muscleGroupFilter || "all"}
                  onValueChange={(val) => setMuscleGroupFilter(val === "all" ? null : val)}
                >
                  <SelectTrigger className="w-full border-0 shadow-none focus:ring-0">
                    <SelectValue placeholder="Wszystkie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {muscleGroupOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
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
              <div className="relative h-48 w-full bg-muted flex items-center justify-center group">
                {(exercise.mediaUrl || exercise.image) ? (
                  isVideoUrl(exercise.mediaUrl || exercise.image) ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <PlayCircle className="h-12 w-12 text-white opacity-80" />
                      <span className="absolute bottom-2 right-2 text-xs text-white bg-black/50 px-1 rounded">Wideo</span>
                    </div>
                  ) : (
                    <Image
                      src={exercise.mediaUrl || exercise.image || ''}
                      alt={exercise.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  )
                ) : (
                  <span className="text-muted-foreground">Brak zdjęcia</span>
                )}
              </div>
              <CardHeader>
                <CardTitle className="font-headline line-clamp-1">{exercise.name}</CardTitle>
                <div className="flex flex-wrap gap-1 pt-1">
                  {exercise.mainMuscleGroups?.map((mg, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px]">{mg.name}</Badge>
                  ))}
                  {!exercise.mainMuscleGroups?.length && exercise.muscleGroup && (
                    <Badge variant="secondary" className="text-[10px]">{exercise.muscleGroup}</Badge>
                  )}
                  {/* Exercise type badge */}
                  {exercise.type && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      {exercise.type === 'weight' && <Dumbbell className="h-2.5 w-2.5" />}
                      {exercise.type === 'reps' && <Repeat className="h-2.5 w-2.5" />}
                      {exercise.type === 'duration' && <Timer className="h-2.5 w-2.5" />}
                      {exercise.type === 'weight' ? 'Ciężar' : exercise.type === 'reps' ? 'Powt.' : 'Czas'}
                    </Badge>
                  )}
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
            <p>Brak ćwiczeń spełniających kryteria.</p>
          </Card>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setEditDialogOpen(isOpen); if (!isOpen) setSelectedExercise(null); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline">{selectedExercise ? 'Edytuj Ćwiczenie' : 'Dodaj Nowe Ćwiczenie'}</DialogTitle>
            <DialogDescription>
              {selectedExercise ? 'Zaktualizuj szczegóły tego ćwiczenia.' : 'Wprowadź szczegóły nowego ćwiczenia.'}
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
                    <FormControl><Input {...field} disabled={isUpdating || isCreating} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mainMuscleGroups"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Główne grupy mięśniowe</FormLabel>
                    <FormControl>
                      <MultiSelect
                        selected={field.value}
                        options={muscleGroupOptions}
                        onChange={field.onChange}
                        placeholder="Wybierz grupy mięśniowe"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondaryMuscleGroups"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poboczne grupy mięśniowe</FormLabel>
                    <FormControl>
                      <MultiSelect
                        selected={field.value || []}
                        options={muscleGroupOptions}
                        onChange={field.onChange}
                        placeholder="Wybierz poboczne grupy"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Typ ćwiczenia</FormLabel>
                    <FormDescription className="text-xs">
                      Wybierz jak mierzone będą serie tego ćwiczenia
                    </FormDescription>
                    <FormControl>
                      <div className="grid grid-cols-1 gap-3">
                        {/* Weight option */}
                        <div
                          onClick={() => !isUpdating && !isCreating && field.onChange('weight')}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                            field.value === 'weight'
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                            field.value === 'weight' ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Dumbbell className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Na ciężar (kg)</span>
                              {field.value === 'weight' && <Check className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ćwiczenia z obciążeniem - np. wyciskanie sztangi, przysiady ze sztangą
                            </p>
                          </div>
                        </div>

                        {/* Reps option */}
                        <div
                          onClick={() => !isUpdating && !isCreating && field.onChange('reps')}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                            field.value === 'reps'
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                            field.value === 'reps' ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Repeat className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Na powtórzenia</span>
                              {field.value === 'reps' && <Check className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ćwiczenia z masą ciała - np. podciąganie, pompki, dipy
                            </p>
                          </div>
                        </div>

                        {/* Duration option */}
                        <div
                          onClick={() => !isUpdating && !isCreating && field.onChange('duration')}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                            field.value === 'duration'
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                            field.value === 'duration' ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Timer className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Na czas</span>
                              {field.value === 'duration' && <Check className="h-4 w-4 text-primary" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Ćwiczenia czasowe - np. plank, izometria, rozciąganie
                            </p>
                          </div>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrukcje</FormLabel>
                    <FormControl><Textarea {...field} disabled={isUpdating || isCreating} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Image Selection Section */}
              <FormItem>
                <FormLabel>Obrazek ćwiczenia</FormLabel>

                {/* Image Preview */}
                {uploadedImageUrl && (
                  <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={uploadedImageUrl}
                      alt="Podgląd obrazka"
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Tabs value={imageSourceTab} onValueChange={setImageSourceTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upload" className="text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      Prześlij
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generuj AI
                    </TabsTrigger>
                    <TabsTrigger value="url" className="text-xs">
                      <Link className="h-3 w-3 mr-1" />
                      URL
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-3">
                    <UploadButton
                      endpoint="imageUploader"
                      onClientUploadComplete={(files) => {
                        if (files && files.length > 0) {
                          setUploadedImageUrl(files[0].url);
                          form.setValue('mediaUrl', files[0].url);
                          toast({ title: "Sukces!", description: "Obrazek został przesłany." });
                        }
                      }}
                      onUploadError={(error) => {
                        toast({
                          title: "Błąd",
                          description: `Nie udało się przesłać obrazka: ${error.message}`,
                          variant: "destructive"
                        });
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="ai" className="mt-3">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Wygeneruj obrazek na podstawie nazwy ćwiczenia używając AI.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || isUpdating || isCreating}
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generowanie...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Wygeneruj obrazek
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="url" className="mt-3">
                    <FormField
                      control={form.control}
                      name="mediaUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://example.com/image.jpg"
                              disabled={isUpdating || isCreating}
                              onChange={(e) => {
                                field.onChange(e);
                                setUploadedImageUrl(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Wprowadź URL do zdjęcia lub wideo
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </FormItem>
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isUpdating}>Anuluj</Button>
                </DialogClose>
                <Button type="submit" disabled={isUpdating || isCreating}>
                  {(isUpdating || isCreating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedExercise ? 'Zapisz zmiany' : 'Dodaj ćwiczenie'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
