'use client';

import { useState, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import Image from 'next/image';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Weight, Ruler, BarChart, Armchair, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { BodyMeasurement } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';


const measurementSchema = z.object({
  weight: z.coerce.number().positive('Waga musi być liczbą dodatnią.'),
  biceps: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  chest: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  waist: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  hips: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  thigh: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  sharedWithTrainer: z.boolean().default(false),
  photos: z.array(z.instanceof(File)).optional(),
});

type MeasurementFormValues = z.infer<typeof measurementSchema>;

const StatCard = ({ title, value, unit, icon: Icon, isLoading }: { title: string; value: string; unit: string; icon: React.ElementType; isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value} <span className="text-base font-normal text-muted-foreground">{unit}</span></div>}
    </CardContent>
  </Card>
);

const MeasurementChart = ({ data, dataKey, title, unit }: { data: any[], dataKey: string, title: string, unit: string }) => {

    const chartConfig = {
      value: {
        label: title,
        color: "hsl(var(--primary))",
      },
    } satisfies import('@/components/ui/chart').ChartConfig;

    if (data.length < 2) {
      return (
        <div className="text-center text-muted-foreground p-8 h-64 flex flex-col justify-center items-center">
            <BarChart className="h-8 w-8 mb-2" />
            <p>Za mało danych, aby narysować wykres dla: {title}.</p>
            <p className="text-sm">Dodaj co najmniej dwa pomiary.</p>
        </div>
      )
    }

    return (
        <div className="">
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="formattedDate"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 6)}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.toFixed(1)}
                        domain={['dataMin - 1', 'dataMax + 1']}
                    />
                    <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent
                            indicator="line"
                            labelKey="value"
                            formatter={(value, name, props) => (
                                <div className="flex flex-col">
                                    <span>{props.payload.formattedDateFull}</span>
                                    <span>{`${title}: ${Number(value).toFixed(1)} ${unit}`}</span>
                                </div>
                            )}
                        />}
                    />
                    <Line
                        dataKey={dataKey}
                        type="monotone"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        dot={true}
                    />
                </LineChart>
            </ChartContainer>
        </div>
    )
};


export default function MeasurementsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const measurementsRef = useMemoFirebase(() =>
    user ? query(collection(firestore, `users/${user.uid}/bodyMeasurements`), orderBy('date', 'desc')) : null,
    [user, firestore]
  );

  const { data: measurements, isLoading } = useCollection<BodyMeasurement>(measurementsRef);

  const chartData = useMemo(() => {
    if (!measurements) return [];
    return measurements.slice().reverse().map(m => ({
        ...m,
        formattedDate: format(m.date.toDate(), 'dd MMM', { locale: pl }),
        formattedDateFull: format(m.date.toDate(), 'd MMMM yyyy', { locale: pl }),
    }));
  }, [measurements]);

  const latestMeasurement = useMemo(() => {
    if (!measurements || measurements.length === 0) {
      return null;
    }
    return measurements[0];
  }, [measurements]);

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      weight: 0,
      biceps: 0,
      chest: 0,
      waist: 0,
      hips: 0,
      thigh: 0,
      sharedWithTrainer: false,
      photos: [],
    },
  });

  const { fields: photoFields, append: appendPhoto, remove: removePhoto } = useFieldArray({
    control: form.control,
    name: "photos"
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
      files.forEach(file => appendPhoto(file as any));
    }
  };

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    if (!user) return [];
    const storage = getStorage();
    const uploadPromises = photos.map(photo => {
      const filePath = `measurement-photos/${user.uid}/${new Date().getTime()}-${photo.name}`;
      const fileRef = storageRef(storage, filePath);
      return uploadBytes(fileRef, photo).then(snapshot => getDownloadURL(snapshot.ref));
    });
    return Promise.all(uploadPromises);
  };

  const onSubmit = async (data: MeasurementFormValues) => {
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
            return;
        }
    }

    const newMeasurement = {
      date: Timestamp.now(),
      weight: data.weight,
      circumferences: {
        biceps: data.biceps || 0,
        chest: data.chest || 0,
        waist: data.waist || 0,
        hips: data.hips || 0,
        thigh: data.thigh || 0,
      },
      sharedWithTrainer: data.sharedWithTrainer,
      photoURLs,
      ownerId: user.uid,
    };

    const measurementCollection = collection(firestore, `users/${user.uid}/bodyMeasurements`);

    addDoc(measurementCollection, newMeasurement)
      .then(() => {
        toast({
          title: 'Pomiar Zapisany!',
          description: 'Twoje najnowsze pomiary zostały dodane do historii.',
        });
        form.reset();
        setPhotoPreviews([]);
        setDialogOpen(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: measurementCollection.path,
          operation: 'create',
          requestResourceData: newMeasurement,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const chartTabs = [
    { value: 'weight', label: 'Waga', unit: 'kg', dataKey: 'weight' },
    { value: 'biceps', label: 'Biceps', unit: 'cm', dataKey: 'biceps' },
    { value: 'chest', label: 'Klatka piersiowa', unit: 'cm', dataKey: 'chest' },
    { value: 'waist', label: 'Talia', unit: 'cm', dataKey: 'waist' },
    { value: 'hips', label: 'Biodra', unit: 'cm', dataKey: 'hips' },
    { value: 'thigh', label: 'Udo', unit: 'cm', dataKey: 'thigh' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Pomiary Ciała</h1>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Dodaj Nowy Pomiar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-headline">Zarejestruj Nowe Pomiary</DialogTitle>
              <DialogDescription>Wprowadź swoje aktualne wymiary.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Waga (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="np. 85.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="biceps" render={({ field }) => (<FormItem><FormLabel>Biceps (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="chest" render={({ field }) => (<FormItem><FormLabel>Klatka (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="waist" render={({ field }) => (<FormItem><FormLabel>Talia (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="hips" render={({ field }) => (<FormItem><FormLabel>Biodra (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="thigh" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Udo (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
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
                                                removePhoto(index);
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
                        {photoPreviews.length > 0 ? 'Dodaj więcej zdjęć' : 'Dodaj zdjęcia sylwetki'}
                    </Button>
                    <Input type="file" ref={photoInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" multiple />
                 </div>
                 <FormField
                  control={form.control}
                  name="sharedWithTrainer"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Udostępnij trenerowi</FormLabel>
                        <FormDescription>
                          Pozwól swojemu trenerowi zobaczyć te pomiary.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Anuluj</Button>
                  </DialogClose>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Zapisz Pomiar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

       <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Waga" value={latestMeasurement?.weight?.toFixed(1) || ' - '} unit="kg" icon={Weight} isLoading={isLoading} />
          <StatCard title="Talia" value={latestMeasurement?.circumferences?.waist?.toFixed(1) || ' - '} unit="cm" icon={Ruler} isLoading={isLoading} />
          <StatCard title="Postęp" value="+1.2" unit="kg" icon={BarChart} isLoading={isLoading} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Wykresy Postępów</CardTitle>
          <CardDescription>Wizualna historia Twoich pomiarów w czasie.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weight">
            <TabsList>
              {chartTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>

            {isLoading ? (
                <div className="h-64 flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : chartTabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  <MeasurementChart
                    data={tab.dataKey === 'weight' ? chartData : chartData.map(d => ({...d, [tab.dataKey]: d.circumferences[tab.dataKey as keyof typeof d.circumferences]}))}
                    dataKey={tab.dataKey}
                    title={tab.label}
                    unit={tab.unit}
                  />
                </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historia Pomiarów</CardTitle>
          <CardDescription>Zapis wszystkich Twoich pomiarów ciała.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Waga (kg)</TableHead>
                <TableHead>Biceps (cm)</TableHead>
                <TableHead>Klatka (cm)</TableHead>
                <TableHead>Talia (cm)</TableHead>
                <TableHead>Biodra (cm)</TableHead>
                <TableHead>Udo (cm)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : measurements && measurements.length > 0 ? (
                measurements.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{format(session.date.toDate(), 'd MMM yyyy', { locale: pl })}</TableCell>
                      <TableCell className="font-bold">{session.weight.toFixed(1)}</TableCell>
                      <TableCell>{session.circumferences.biceps?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{session.circumferences.chest?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{session.circumferences.waist?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{session.circumferences.hips?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{session.circumferences.thigh?.toFixed(1) || '-'}</TableCell>
                    </TableRow>
                  )
                )
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Armchair className="h-8 w-8" />
                        <span>Nie zarejestrowano jeszcze żadnych pomiarów.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
