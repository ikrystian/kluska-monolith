'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MuscleGroupName, MuscleGroup } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocalUploadButton } from '@/components/shared/LocalUploadButton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Dumbbell,
  Repeat,
  Timer,
  Check,
  Upload,
  Sparkles,
  Link,
  X,
} from 'lucide-react';
import { ExerciseFormData, ExerciseFormProps } from './types';
import { SETUP_GROUPS, SETUP_SUGGESTIONS, getSetupValue, isVideoFileUrl } from './setup';

const exerciseSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana.'),
  mainMuscleGroups: z.array(z.string()).min(1, 'Przynajmniej jedna główna grupa mięśniowa jest wymagana.'),
  secondaryMuscleGroups: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  bodyPart: z.string().optional(),
  equipment: z.string().optional(),
  category: z.string().optional(),
  mediaUrl: z
    .string()
    .refine(
      (value) => value === '' || /^(https?:\/\/|\/)/.test(value),
      'Nieprawidłowy URL multimediów.',
    )
    .optional(),
  animationUrl: z
    .string()
    .refine(
      (value) => value === '' || /^(https?:\/\/|\/)/.test(value),
      'Nieprawidłowy URL animacji.',
    )
    .optional(),
  type: z.enum(['weight', 'duration', 'reps'], { required_error: "Typ ćwiczenia jest wymagany." }).optional(),
  description: z.string().optional(),
});

interface ExerciseFormExercise {
  id: string;
  name: string;
  mainMuscleGroups?: { name: string }[];
  secondaryMuscleGroups?: { name: string }[];
  muscleGroup?: string;
  instructions?: string;
  description?: string;
  mediaUrl?: string;
  image?: string;
  setup?: { group: string; value: string }[];
  type?: 'weight' | 'duration' | 'reps';
}

function getDefaultValues(exercise: ExerciseFormExercise | null): ExerciseFormData {
  return {
    name: exercise?.name || '',
    mainMuscleGroups: exercise?.mainMuscleGroups?.map(mg => mg.name) ||
      (exercise?.muscleGroup ? [exercise.muscleGroup] : []),
    secondaryMuscleGroups: exercise?.secondaryMuscleGroups?.map(mg => mg.name) || [],
    description: exercise?.description || '',
    instructions: exercise?.instructions || '',
    bodyPart: getSetupValue(exercise?.setup, SETUP_GROUPS.bodyPart) || '',
    equipment: getSetupValue(exercise?.setup, SETUP_GROUPS.equipment) || '',
    category: getSetupValue(exercise?.setup, SETUP_GROUPS.category) || '',
    mediaUrl: exercise?.mediaUrl || exercise?.image || '',
    animationUrl: getSetupValue(exercise?.setup, SETUP_GROUPS.animation) || '',
    type: exercise?.type || 'weight',
  };
}

interface ExerciseFormDialogProps {
  exercise: ExerciseFormExercise | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExerciseFormData) => Promise<void>;
  isSubmitting: boolean;
  muscleGroupOptions: { label: string; value: string }[];
  showImageUpload?: boolean;
}

export function ExerciseFormDialog({
  exercise,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  muscleGroupOptions,
  showImageUpload = true,
}: ExerciseFormDialogProps) {
  const { toast } = useToast();
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>(
    exercise?.mediaUrl || exercise?.image || ''
  );
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageSourceTab, setImageSourceTab] = useState<string>(
    uploadedImageUrl ? 'url' : 'upload'
  );
  const [animationSourceTab, setAnimationSourceTab] = useState<string>('upload');

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: getDefaultValues(exercise),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(getDefaultValues(exercise));
      setUploadedImageUrl(exercise?.mediaUrl || exercise?.image || '');
    }
  }, [exercise, isOpen, form]);

  const handleFormSubmit = async (data: ExerciseFormData) => {
    // Include the uploaded image URL
    const finalData = {
      ...data,
      mediaUrl: uploadedImageUrl || data.mediaUrl,
    };
    await onSubmit(finalData);
  };

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

  const animationUrl = form.watch('animationUrl');

  const clearAnimation = () => {
    form.setValue('animationUrl', '', { shouldDirty: true });
  };

  const isEditMode = !!exercise;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">
            {isEditMode ? 'Edytuj Ćwiczenie' : 'Dodaj Nowe Ćwiczenie'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Zaktualizuj szczegóły tego ćwiczenia.' : 'Wprowadź szczegóły nowego ćwiczenia.'}
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
                  <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
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
                        onClick={() => !isSubmitting && field.onChange('weight')}
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
                        onClick={() => !isSubmitting && field.onChange('reps')}
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
                        onClick={() => !isSubmitting && field.onChange('duration')}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[120px]" disabled={isSubmitting} />
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
                  <FormControl>
                    <Textarea {...field} className="min-h-[120px]" disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Setup details (zapisywane w `setup`) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([
                { name: 'bodyPart', label: SETUP_GROUPS.bodyPart, placeholder: 'np. uda', suggestions: SETUP_SUGGESTIONS.bodyPart },
                { name: 'equipment', label: SETUP_GROUPS.equipment, placeholder: 'np. hantle', suggestions: SETUP_SUGGESTIONS.equipment },
                { name: 'category', label: SETUP_GROUPS.category, placeholder: 'np. siłowe', suggestions: SETUP_SUGGESTIONS.category },
              ] as const).map(({ name, label, placeholder, suggestions }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          list={`exercise-${name}-options`}
                          placeholder={placeholder}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <datalist id={`exercise-${name}-options`}>
                        {suggestions.map((value) => <option key={value} value={value} />)}
                      </datalist>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {/* Image Selection Section */}
            {showImageUpload && (
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
                    <LocalUploadButton
                      accept="image/*,image/gif"
                      label="Prześlij obrazek lub GIF"
                      disabled={isSubmitting}
                      onComplete={(files) => {
                        if (files.length > 0) {
                          setUploadedImageUrl(files[0].url);
                          form.setValue('mediaUrl', files[0].url);
                          toast({ title: "Sukces!", description: "Obrazek został przesłany." });
                        }
                      }}
                      onError={(error) => {
                        toast({
                          title: "Błąd",
                          description: `Nie udało się przesłać obrazka: ${error.message}`,
                          variant: "destructive"
                        });
                      }}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Obrazek lub GIF, maks. 128 MB.
                    </p>
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
                        disabled={isGeneratingImage || isSubmitting}
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
                              disabled={isSubmitting}
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
            )}

            {/* Animation Section */}
            {showImageUpload && (
              <FormItem>
                <FormLabel>Animacja ćwiczenia</FormLabel>
                <FormDescription className="text-xs">
                  Wyświetlana w szczegółach ćwiczenia zamiast obrazka.
                </FormDescription>

                {/* Animation Preview */}
                {animationUrl && (
                  <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden bg-muted">
                    {isVideoFileUrl(animationUrl) ? (
                      <video
                        key={animationUrl}
                        src={animationUrl}
                        className="w-full h-full object-contain"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <Image
                        src={animationUrl}
                        alt="Podgląd animacji"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearAnimation}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Tabs value={animationSourceTab} onValueChange={setAnimationSourceTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="text-xs">
                      <Upload className="h-3 w-3 mr-1" />
                      Prześlij
                    </TabsTrigger>
                    <TabsTrigger value="url" className="text-xs">
                      <Link className="h-3 w-3 mr-1" />
                      URL
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-3">
                    <LocalUploadButton
                      accept="video/mp4,video/webm,image/gif"
                      label={animationUrl ? 'Zmień plik animacji' : 'Prześlij plik animacji'}
                      disabled={isSubmitting}
                      onComplete={(files) => {
                        if (files.length > 0) {
                          form.setValue('animationUrl', files[0].url, { shouldDirty: true });
                          toast({ title: "Sukces!", description: "Animacja została przesłana." });
                        }
                      }}
                      onError={(error) => {
                        toast({
                          title: "Błąd",
                          description: `Nie udało się przesłać animacji: ${error.message}`,
                          variant: "destructive"
                        });
                      }}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      MP4, WebM lub GIF, maks. 128 MB.
                    </p>
                  </TabsContent>

                  <TabsContent value="url" className="mt-3">
                    <FormField
                      control={form.control}
                      name="animationUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              placeholder="https://example.com/animation.mp4"
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Wprowadź URL do pliku MP4, WebM lub GIF
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </FormItem>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isSubmitting}>Anuluj</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Zapisz zmiany' : 'Dodaj ćwiczenie'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}