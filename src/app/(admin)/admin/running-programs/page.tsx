'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useCollection, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { Button } from '@/components/ui/button';
import {
  Edit,
  Loader2,
  PlusCircle,
  Trash2,
  Footprints,
  Music,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocalUploadButton } from '@/components/shared/LocalUploadButton';
import type { RunningProgram } from '@/lib/types';

const cueSchema = z.object({
  triggerType: z.enum(['time', 'distance']),
  minutes: z.coerce.number().min(0, 'Min. 0').max(600, 'Zbyt duża wartość.'),
  seconds: z.coerce.number().min(0, 'Min. 0').max(59, 'Maks. 59.'),
  meters: z.coerce.number().min(0, 'Min. 0'),
  audioUrl: z.string().min(1, 'Wgraj plik dźwiękowy.'),
  label: z.string().optional(),
});

const programSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana.'),
  targetDistanceKm: z.coerce.number().positive('Dystans musi być liczbą dodatnią.'),
  description: z.string().optional(),
  isActive: z.boolean(),
  cues: z.array(cueSchema),
});

type ProgramFormValues = z.infer<typeof programSchema>;

function secondsToParts(totalSeconds: number) {
  return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };
}

const emptyDefaults: ProgramFormValues = {
  name: '',
  targetDistanceKm: undefined as unknown as number,
  description: '',
  isActive: true,
  cues: [],
};

export default function RunningProgramsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<RunningProgram | null>(null);

  const { data: programs, isLoading, refetch } = useCollection<RunningProgram>('runningPrograms');
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const { deleteDoc } = useDeleteDoc();

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: emptyDefaults,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'cues' });

  const handleOpenDialog = (program: RunningProgram | null) => {
    setEditingProgram(program);
    form.reset(
      program
        ? {
            name: program.name,
            targetDistanceKm: program.targetDistanceKm,
            description: program.description ?? '',
            isActive: program.isActive,
            cues: program.cues.map((cue) => ({
              triggerType: cue.triggerType,
              ...(cue.triggerType === 'time' ? secondsToParts(cue.value) : { minutes: 0, seconds: 0 }),
              meters: cue.triggerType === 'distance' ? cue.value : 0,
              audioUrl: cue.audioUrl,
              label: cue.label ?? '',
            })),
          }
        : emptyDefaults
    );
    setDialogOpen(true);
  };

  const handleFormSubmit = async (data: ProgramFormValues) => {
    const payload = {
      name: data.name,
      targetDistanceKm: data.targetDistanceKm,
      description: data.description?.trim() || undefined,
      isActive: data.isActive,
      cues: data.cues.map((cue) => ({
        triggerType: cue.triggerType,
        value: cue.triggerType === 'time' ? cue.minutes * 60 + cue.seconds : cue.meters,
        audioUrl: cue.audioUrl,
        label: cue.label?.trim() || undefined,
      })),
    };

    try {
      if (editingProgram) {
        await updateDoc('runningPrograms', editingProgram.id, payload);
        toast({ title: 'Sukces!', description: 'Trening biegowy został zaktualizowany.' });
      } else {
        await createDoc('runningPrograms', payload);
        toast({ title: 'Sukces!', description: 'Nowy trening biegowy został dodany.' });
      }
      setDialogOpen(false);
      setEditingProgram(null);
      form.reset(emptyDefaults);
      refetch();
    } catch (e) {
      console.error(e);
      toast({ title: 'Błąd!', description: 'Wystąpił błąd podczas zapisywania treningu.', variant: 'destructive' });
    }
  };

  const handleDelete = async (programId: string) => {
    try {
      await deleteDoc('runningPrograms', programId);
      toast({ title: 'Usunięto!', description: 'Trening biegowy został usunięty.', variant: 'destructive' });
      refetch();
    } catch (e) {
      toast({ title: 'Błąd!', description: 'Nie udało się usunąć treningu.', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Treningi Biegowe</h1>
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj Trening
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista Treningów</CardTitle>
          <CardDescription>
            Treningi widoczne w aplikacji mobilnej przy nagrywaniu biegu, wraz z sygnałami dźwiękowymi
            odtwarzanymi po określonym czasie lub po przebiegnięciu danego dystansu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Dystans</TableHead>
                <TableHead>Sygnały</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : programs?.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium">
                    {program.name}
                    {program.description && (
                      <p className="text-xs text-muted-foreground">{program.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{program.targetDistanceKm} km</TableCell>
                  <TableCell>{program.cues.length}</TableCell>
                  <TableCell>
                    <Badge variant={program.isActive ? 'default' : 'secondary'}>
                      {program.isActive ? 'Aktywny' : 'Nieaktywny'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(program)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edytuj
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(program.id)}>
                      <Trash2 className="mr-2 h-3 w-3" />
                      Usuń
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && programs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <Footprints className="h-12 w-12 mx-auto mb-4" />
                    <p>Brak treningów biegowych. Dodaj pierwszy, aby zacząć.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingProgram ? 'Edytuj Trening' : 'Dodaj Nowy Trening'}</DialogTitle>
            <DialogDescription>
              Zdefiniuj dystans docelowy oraz sygnały dźwiękowe, które odtworzą się biegaczowi po
              upływie wskazanego czasu lub po przebiegnięciu wskazanego dystansu.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nazwa</FormLabel>
                      <FormControl><Input placeholder="np. 10 km - interwały" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetDistanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dystans docelowy (km)</FormLabel>
                      <FormControl><Input type="number" step="0.1" min="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <FormLabel className="mb-0">Widoczny w aplikacji</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis (opcjonalnie)</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-semibold">Sygnały dźwiękowe</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ triggerType: 'time', minutes: 0, seconds: 0, meters: 0, audioUrl: '', label: '' })
                    }
                  >
                    <PlusCircle className="mr-2 h-3 w-3" />
                    Dodaj sygnał
                  </Button>
                </div>

                {fields.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Brak sygnałów — biegacz zobaczy sam licznik czasu i dystansu bez dźwięków.
                  </p>
                )}

                {fields.map((cueField, index) => {
                  const audioUrl = form.watch(`cues.${index}.audioUrl`);
                  const triggerType = form.watch(`cues.${index}.triggerType`);
                  return (
                    <div key={cueField.id} className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <div className="flex items-start gap-2">
                        <FormField
                          control={form.control}
                          name={`cues.${index}.triggerType`}
                          render={({ field }) => (
                            <FormItem className="w-28">
                              <FormLabel className="text-xs">Wyzwalacz</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="time">Po czasie</SelectItem>
                                  <SelectItem value="distance">Po dystansie</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        {triggerType === 'distance' ? (
                          <FormField
                            control={form.control}
                            name={`cues.${index}.meters`}
                            render={({ field }) => (
                              <FormItem className="w-24">
                                <FormLabel className="text-xs">Metry</FormLabel>
                                <FormControl><Input type="number" min="0" step="50" {...field} /></FormControl>
                              </FormItem>
                            )}
                          />
                        ) : (
                          <>
                            <FormField
                              control={form.control}
                              name={`cues.${index}.minutes`}
                              render={({ field }) => (
                                <FormItem className="w-16">
                                  <FormLabel className="text-xs">Min</FormLabel>
                                  <FormControl><Input type="number" min="0" {...field} /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`cues.${index}.seconds`}
                              render={({ field }) => (
                                <FormItem className="w-16">
                                  <FormLabel className="text-xs">Sek</FormLabel>
                                  <FormControl><Input type="number" min="0" max="59" {...field} /></FormControl>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                        <FormField
                          control={form.control}
                          name={`cues.${index}.label`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Etykieta (opcjonalnie)</FormLabel>
                              <FormControl><Input placeholder="np. Przyspiesz!" {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-5 shrink-0"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name={`cues.${index}.audioUrl`}
                        render={() => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <LocalUploadButton
                                accept="audio/*"
                                label={audioUrl ? 'Podmień plik' : 'Wybierz plik dźwiękowy'}
                                onComplete={(files) =>
                                  form.setValue(`cues.${index}.audioUrl`, files[0]?.url ?? '', {
                                    shouldValidate: true,
                                  })
                                }
                                onError={(error) =>
                                  toast({ title: 'Błąd!', description: error.message, variant: 'destructive' })
                                }
                              />
                              {audioUrl && (
                                <div className="flex min-w-0 flex-1 items-center gap-1 text-xs text-muted-foreground">
                                  <Music className="h-3 w-3 shrink-0" />
                                  <audio controls src={audioUrl} className="h-8 w-full" />
                                </div>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                })}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={isCreating || isUpdating}>
                    Anuluj
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
