'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Trash2, Library, Save, Users, Loader2, GripVertical, Edit, Timer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import type { WorkoutPlan, Exercise, UserProfile } from '@/lib/types';
import { useUser, useCollection, useDoc, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';


const setSchema = z.object({
  reps: z.coerce.number().min(1, "Powtórzenia muszą być dodatnie."),
  weight: z.coerce.number().min(0, "Ciężar nie może być ujemny.").optional(),
});

const exerciseSchema = z.object({
  exerciseId: z.string().min(1, "Proszę wybrać ćwiczenie."),
  sets: z.array(setSchema).optional(),
  duration: z.coerce.number().min(0, "Czas trwania musi być dodatni.").optional(),
});

const workoutDaySchema = z.object({
  dayName: z.string().min(1, "Nazwa dnia jest wymagana."),
  exercises: z.array(exerciseSchema).min(1, "Dodaj co najmniej jedno ćwiczenie do dnia."),
});

const templateSchema = z.object({
  name: z.string().min(1, "Nazwa planu jest wymagana."),
  description: z.string().optional(),
  workoutDays: z.array(workoutDaySchema).min(1, "Dodaj co najmniej jeden dzień treningowy."),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

function TemplateForm({
  onSave,
  allExercises,
  editingPlan
}: {
  onSave: () => void,
  allExercises: Exercise[] | null,
  editingPlan: WorkoutPlan | null
}) {
  const { toast } = useToast();
  const { user } = useUser();
  const { createDoc } = useCreateDoc();
  const { updateDoc } = useUpdateDoc();
  const isEditMode = !!editingPlan;
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftPlanId, setDraftPlanId] = useState<string | null>(editingPlan?.id || null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: isEditMode && editingPlan ? {
      name: editingPlan.name,
      description: editingPlan.description,
      workoutDays: editingPlan.workoutDays.map(day => ({
        ...day,
        exercises: day.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets || [],
          duration: ex.duration || 0,
        }))
      })),
    } : {
      name: '',
      description: '',
      workoutDays: [],
    },
  });

  useEffect(() => {
    if (isEditMode && editingPlan) {
      form.reset({
        name: editingPlan.name,
        description: editingPlan.description,
        workoutDays: editingPlan.workoutDays.map(day => ({
          ...day,
          exercises: day.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets || [],
            duration: ex.duration || 0,
          }))
        })),
      });
    } else {
      form.reset({
        name: '',
        description: '',
        workoutDays: [],
      });
    }
  }, [editingPlan, isEditMode, form]);

  const { fields: dayFields, append: appendDayBase, remove: removeDay } = useFieldArray({
    control: form.control,
    name: 'workoutDays',
  });

  // Wrapper around appendDay to save draft after adding a day
  const appendDay = (day: any) => {
    appendDayBase(day);
    // Save draft after adding day
    setTimeout(() => saveDraft(), 100);
  };

  // Function to save plan as draft without full validation
  const saveDraft = async () => {
    if (!user) return;

    try {
      const currentData = form.getValues();

      // Only save if we have at least a name and one day
      if (!currentData.name || currentData.workoutDays.length === 0) {
        return;
      }

      setIsSavingDraft(true);

      if (draftPlanId) {
        // Update existing draft
        await updateDoc('workoutPlans', draftPlanId, {
          name: currentData.name,
          description: currentData.description || '',
          workoutDays: currentData.workoutDays,
          isDraft: true,
        });
      } else {
        // Create new draft
        const newPlan = {
          name: currentData.name,
          description: currentData.description || '',
          trainerId: user.uid,
          assignedAthleteIds: [],
          workoutDays: currentData.workoutDays,
          isDraft: true,
        };

        const createdPlan = await createDoc('workoutPlans', newPlan);
        setDraftPlanId(createdPlan.id);
      }
    } catch (error) {
      // Silently fail for draft saves - don't show error toast
      console.error('Draft save failed:', error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  async function onSubmit(data: TemplateFormValues) {
    if (!user) return;

    try {
      if (draftPlanId) {
        // Update existing draft to finalize it
        const updatedPlanData = {
          name: data.name,
          description: data.description || '',
          workoutDays: data.workoutDays,
          isDraft: false,
        };
        await updateDoc('workoutPlans', draftPlanId, updatedPlanData);
        toast({ title: 'Plan Zapisany!', description: `Plan '${data.name}' został zapisany.` });
        onSave();
      } else if (isEditMode && editingPlan) {
        const updatedPlanData = {
          name: data.name,
          description: data.description || '',
          workoutDays: data.workoutDays,
          isDraft: false,
        };
        await updateDoc('workoutPlans', editingPlan.id, updatedPlanData);
        toast({ title: 'Plan Zaktualizowany!', description: `Plan '${data.name}' został zmieniony.` });
        onSave();
      } else {
        const newPlan = {
          name: data.name,
          description: data.description || '',
          trainerId: user.uid,
          assignedAthleteIds: [],
          workoutDays: data.workoutDays,
          isDraft: false,
        };
        await createDoc('workoutPlans', newPlan);
        toast({
          title: 'Plan Zapisany!',
          description: `Plan '${data.name}' został utworzony.`,
        });
        form.reset();
        onSave();
      }
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać planu.',
        variant: 'destructive',
      });
    }
  }

  return (
    <FormProvider {...form}>
      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="font-headline">{isEditMode ? 'Edytuj Plan Treningowy' : 'Stwórz Nowy Plan Treningowy'}</CardTitle>
            <CardDescription>
              {isEditMode ? `Edytujesz plan "${editingPlan.name}".` : 'Zbuduj plan treningowy do wielokrotnego użytku, który możesz przypisywać sportowcom.'}
              {draftPlanId && !isEditMode && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  💾 Plan jest automatycznie zapisywany jako szkic po dodaniu każdego dnia.
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa Planu</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Budowanie siły - 4 dni" {...field} />
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
                  <FormLabel>Opis (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Input placeholder="Krótki opis celu tego planu." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dni Treningowe</h3>
              <Accordion type="multiple" className="w-full space-y-4">
                {dayFields.map((dayField, dayIndex) => (
                  <AccordionItem value={`day-${dayIndex}`} key={dayField.id} className="border rounded-md px-4 bg-secondary/30">
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full">
                        <FormField
                          control={form.control}
                          name={`workoutDays.${dayIndex}.dayName`}
                          render={({ field }) => (
                            <FormItem onClick={(e) => e.stopPropagation()}>
                              <FormControl><Input placeholder={`Dzień ${dayIndex + 1}: np. Trening A: Push`} {...field} className="text-base font-semibold border-0 bg-transparent" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <DayFormContent dayIndex={dayIndex} allExercises={allExercises} />
                      <Button type="button" variant="destructive" size="sm" className="mt-4" onClick={() => removeDay(dayIndex)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Usuń Dzień Treningowy
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => appendDay({ dayName: `Dzień ${dayFields.length + 1}`, exercises: [] })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Dodaj Dzień Treningowy
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditMode ? 'Zapisz Zmiany' : 'Zapisz Plan'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </FormProvider>
  );
}

function DayFormContent({ dayIndex, allExercises }: { dayIndex: number; allExercises: Exercise[] | null; }) {
  const { control, watch } = useFormContext<TemplateFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `workoutDays.${dayIndex}.exercises`,
  });

  const getExerciseType = (exerciseId: string) => {
    return allExercises?.find(ex => ex.id === exerciseId)?.type || 'weight';
  }

  return (
    <div className="space-y-4 pl-2 border-l-2 border-primary/20">
      {fields.map((field, exIndex) => {
        const exerciseId = watch(`workoutDays.${dayIndex}.exercises.${exIndex}.exerciseId`);
        const exerciseType = getExerciseType(exerciseId);

        return (
          <Card key={field.id} className="p-4 bg-background">
            <div className="flex items-end gap-4 mb-4">
              <FormField
                control={control}
                name={`workoutDays.${dayIndex}.exercises.${exIndex}.exerciseId`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Ćwiczenie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Wybierz ćwiczenie" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allExercises?.map((ex) => (<SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(exIndex)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {exerciseType === 'weight' && (
              <ExerciseSets fieldNamePrefix={`workoutDays.${dayIndex}.exercises.${exIndex}`} showWeight={true} />
            )}
            {exerciseType === 'reps' && (
              <ExerciseSets fieldNamePrefix={`workoutDays.${dayIndex}.exercises.${exIndex}`} showWeight={false} />
            )}
            {exerciseType === 'duration' && (
              <FormField
                control={control}
                name={`workoutDays.${dayIndex}.exercises.${exIndex}.duration`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Czas trwania (sekundy)</FormLabel>
                    <FormControl><Input type="number" placeholder="np. 60" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </Card>
        )
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => append({ exerciseId: '', sets: [{ reps: 8, weight: 0 }], duration: 0 })}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Dodaj Ćwiczenie do tego dnia
      </Button>
    </div>
  )
}

const ExerciseSets = ({ fieldNamePrefix, showWeight }: { fieldNamePrefix: `workoutDays.${number}.exercises.${number}`; showWeight: boolean; }) => {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${fieldNamePrefix}.sets`,
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-2 items-center">
        <Label className="col-span-1 text-sm text-muted-foreground"></Label>
        <Label className="col-span-5 text-sm text-muted-foreground">Powtórzenia</Label>
        {showWeight && <Label className="col-span-5 text-sm text-muted-foreground">Ciężar (kg)</Label>}
      </div>
      {fields.map((setField, setIndex) => (
        <div key={setField.id} className="grid grid-cols-12 gap-2 items-center">
          <p className="font-medium text-sm text-center col-span-1">{setIndex + 1}</p>
          <FormField
            control={control}
            name={`${fieldNamePrefix}.sets.${setIndex}.reps`}
            render={({ field }) => (
              <FormItem className="col-span-5">
                <FormControl><Input type="number" placeholder="Powt." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {showWeight && (
            <FormField
              control={control}
              name={`${fieldNamePrefix}.sets.${setIndex}.weight`}
              render={({ field }) => (
                <FormItem className="col-span-5">
                  <FormControl><Input type="number" placeholder="Ciężar" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(setIndex)} className="col-span-1">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => append({ reps: 8, weight: 0 })}
      >
        <PlusCircle className="mr-2 h-4 w-4" /> Dodaj Serię
      </Button>
    </div>
  );
};

function AssignPlanDialog({ plan }: { plan: WorkoutPlan }) {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();

  const [open, setOpen] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>(plan.assignedAthleteIds || []);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch athletes managed by this user (trainerId = user.uid)
  const { data: athletes, isLoading } = useCollection<UserProfile>(
    user?.uid ? 'users' : null,
    user?.uid ? { trainerId: user.uid, role: 'athlete' } : undefined
  );

  const handleAssign = async () => {
    if (!user) return;
    setIsAssigning(true);

    try {
      await updateDoc('workoutPlans', plan.id, { assignedAthleteIds: selectedAthletes });
      toast({
        title: "Plan Przypisany!",
        description: `Pomyślnie zaktualizowano przypisania dla planu "${plan.name}".`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się przypisać planu.',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCheckboxChange = (athleteId: string, checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedAthletes(prev => [...prev, athleteId]);
    } else {
      setSelectedAthletes(prev => prev.filter(id => id !== athleteId));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Users className="mr-2 h-4 w-4" /> Przypisz</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Przypisz "{plan.name}" do sportowców</DialogTitle>
          <DialogDescription>
            Wybierz sportowców, którym chcesz przypisać ten plan treningowy.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-3 overflow-y-auto p-1">
          {isLoading && <p>Ładowanie sportowców...</p>}
          {athletes && athletes.map((athlete) => (
            <div key={athlete.id} className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox
                id={`athlete-${athlete.id}`}
                checked={selectedAthletes.includes(athlete.id)}
                onCheckedChange={(checked) => handleCheckboxChange(athlete.id, checked)}
              />
              <Label htmlFor={`athlete-${athlete.id}`} className="font-medium">
                {athlete.name}
              </Label>
            </div>
          ))}
          {athletes?.length === 0 && <p className="text-center text-sm text-muted-foreground">Nie masz jeszcze przypisanych żadnych sportowców.</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isAssigning}>Anuluj</Button>
          </DialogClose>
          <Button onClick={handleAssign} disabled={isAssigning}>
            {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Zapisz Przypisania
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function TemplatesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { deleteDoc } = useDeleteDoc();

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

  // Fetch assigned workout plans (plans where user is in assignedAthleteIds)
  const { data: assignedPlans, isLoading: assignedPlansLoading } = useCollection<WorkoutPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { assignedAthleteIds: { $in: [user.uid] } } : undefined
  );

  // Fetch user's own workout plans (plans where user is trainerId)
  const { data: myPlans, isLoading: myPlansLoading } = useCollection<WorkoutPlan>(
    user?.uid ? 'workoutPlans' : null,
    user?.uid ? { trainerId: user.uid } : undefined
  );

  const workoutPlans = useMemo(() => {
    const plansMap = new Map<string, WorkoutPlan>();
    assignedPlans?.forEach(plan => plansMap.set(plan.id, plan));
    myPlans?.forEach(plan => plansMap.set(plan.id, plan));
    return Array.from(plansMap.values());
  }, [assignedPlans, myPlans]);

  // Fetch all exercises (we'll filter them in useMemo)
  const { data: fetchedExercises, isLoading: exercisesLoading } = useCollection<Exercise>('exercises');

  // Filter exercises: public exercises + exercises from assigned workout plans
  const allExercises = useMemo(() => {
    if (!fetchedExercises) return null;

    const exercisesMap = new Map<string, Exercise>();

    // Collect exercise IDs from assigned workout plans
    const exerciseIdsFromPlans = new Set<string>();
    assignedPlans?.forEach(plan => {
      plan.workoutDays?.forEach(day => {
        day.exercises?.forEach(ex => {
          if (ex.exerciseId) {
            exerciseIdsFromPlans.add(ex.exerciseId);
          }
        });
      });
    });

    // Add exercises that are either public or used in assigned plans
    fetchedExercises.forEach(ex => {
      if (ex.ownerId === 'public' || exerciseIdsFromPlans.has(ex.id)) {
        exercisesMap.set(ex.id, ex);
      }
    });

    return Array.from(exercisesMap.values());
  }, [fetchedExercises, assignedPlans]);

  const isLoading = assignedPlansLoading || myPlansLoading || exercisesLoading;

  const handleBackToList = () => {
    setEditingPlan(null);
    setView('list');
  };

  const handleEditClick = (plan: WorkoutPlan) => {
    setEditingPlan(plan);
    setView('form');
  };

  const handleCreateClick = () => {
    setEditingPlan(null);
    setView('form');
  }

  const handleDelete = async (planId: string) => {
    if (!user) return;

    try {
      await deleteDoc('workoutPlans', planId);
      toast({
        title: "Plan Usunięty",
        description: "Plan treningowy został pomyślnie usunięty.",
        variant: "destructive",
      })
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się usunąć planu.',
        variant: 'destructive',
      });
    }
  }

  if (view === 'form') {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Button variant="outline" onClick={handleBackToList} className="mb-6">
          &larr; Wróć do planów
        </Button>
        <TemplateForm onSave={handleBackToList} allExercises={allExercises} editingPlan={editingPlan} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">
          Plany Treningowe
        </h1>
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Stwórz Nowy Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">
            Twoje Plany
          </CardTitle>
          <CardDescription>
            Oto Twoje zapisane plany treningowe. Możesz ich użyć do szybkiego zapisywania treningu lub przypisać je swoim sportowcom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Ładowanie planów...</p>}
          {!isLoading && workoutPlans && workoutPlans.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {workoutPlans.map((plan) => {
                const isMyPlan = plan.trainerId === user?.uid;
                const isTrainer = user?.role === 'trainer';
                return (
                  <AccordionItem value={plan.id} key={plan.id}>
                    <div className="flex w-full items-center">
                      <AccordionTrigger className="flex-grow p-4 hover:no-underline">
                        <div className="flex flex-col items-start gap-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{plan.name}</span>
                            {!isMyPlan && <span className="text-xs text-white px-2 py-0.5 rounded-full bg-primary/80">Od trenera</span>}
                            {isMyPlan && <span className="text-xs text-white px-2 py-0.5 rounded-full bg-accent-foreground/60">Własny</span>}
                          </div>
                          <span className="text-sm text-muted-foreground">{plan.workoutDays.length} dni treningowych</span>
                        </div>
                      </AccordionTrigger>
                      {isMyPlan && (
                        <div className="flex items-center gap-2 pr-4">
                          {isTrainer && (
                            <AssignPlanDialog plan={plan} />
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(plan)}>
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button size="sm" variant="destructive" onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(plan.id);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <AccordionContent>
                      <div className="p-4 bg-secondary/30 rounded-md m-4 mt-0 space-y-4">
                        {plan.workoutDays.map((day, dayIndex) => (
                          <div key={dayIndex}>
                            <h4 className="font-bold mb-2">{day.dayName}</h4>
                            <ul className="space-y-3 pl-4 border-l-2">
                              {day.exercises.map((ex, exIndex) => {
                                const details = allExercises?.find(e => e.id === ex.exerciseId);
                                return (
                                  <li key={exIndex} className="rounded-md bg-background p-3 shadow-sm">
                                    <p className="font-semibold">{details?.name || 'Nieznane Ćwiczenie'}</p>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {(details?.type === 'weight' || details?.type === 'reps') && ex.sets?.map((s, i) => (
                                        <span key={i} className="mr-4">Seria {i + 1}: {s.reps} {details?.type === 'weight' ? `x ${s.weight || 0}kg` : 'powt.'}</span>
                                      ))}
                                      {details?.type === 'duration' && (
                                        <span><Timer className="inline h-4 w-4 mr-1" />{ex.duration} sekund</span>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          ) : (
            !isLoading && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Library className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-headline text-xl font-semibold mb-2">Brak Planów</h3>
                <p className="text-muted-foreground mb-4">
                  Nie masz jeszcze żadnych planów treningowych.
                </p>
                <Button variant="outline" onClick={handleCreateClick}>Stwórz pierwszy plan</Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
