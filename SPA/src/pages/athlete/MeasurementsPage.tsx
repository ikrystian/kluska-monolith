import { useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  PlusCircle,
  Loader2,
  Weight,
  Ruler,
  BarChart,
  Armchair,
  Upload,
  Trash2,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc } from '@/hooks/useMutation';
import { useAuth } from '@/contexts/AuthContext';
import type { BodyMeasurement, MeasurementCircumferences } from '@/types';

const measurementSchema = z.object({
  weight: z.number().positive('Waga musi być liczbą dodatnią.'),
  biceps: z.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  chest: z.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  waist: z.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  hips: z.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  thigh: z.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  sharedWithTrainer: z.boolean().default(false),
});

type MeasurementFormValues = z.infer<typeof measurementSchema>;

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  isLoading: boolean;
}

const StatCard = ({ title, value, unit, icon: Icon, isLoading }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="text-2xl font-bold">
          {value} <span className="text-base font-normal text-muted-foreground">{unit}</span>
        </div>
      )}
    </CardContent>
  </Card>
);

interface MeasurementChartProps {
  data: Array<{
    formattedDate: string;
    formattedDateFull: string;
    [key: string]: unknown;
  }>;
  dataKey: string;
  title: string;
  unit: string;
}

const MeasurementChart = ({ data, dataKey, title, unit }: MeasurementChartProps) => {
  const chartConfig = {
    value: {
      label: title,
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  if (data.length < 2) {
    return (
      <div className="text-center text-muted-foreground p-8 h-64 flex flex-col justify-center items-center">
        <BarChart className="h-8 w-8 mb-2" />
        <p>Za mało danych, aby narysować wykres dla: {title}.</p>
        <p className="text-sm">Dodaj co najmniej dwa pomiary.</p>
      </div>
    );
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
            content={
              <ChartTooltipContent
                indicator="line"
                labelKey="value"
                formatter={(value, _name, props) => (
                  <div className="flex flex-col">
                    <span>{(props.payload as Record<string, unknown>)?.formattedDateFull as string}</span>
                    <span>{`${title}: ${Number(value).toFixed(1)} ${unit}`}</span>
                  </div>
                )}
              />
            }
          />
          <Line dataKey={dataKey} type="monotone" stroke="var(--color-value)" strokeWidth={2} dot={true} />
        </LineChart>
      </ChartContainer>
    </div>
  );
};

export default function MeasurementsPage() {
  const { user } = useAuth();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photosToUpload, setPhotosToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const createMeasurement = useCreateDoc<BodyMeasurement>('bodyMeasurements');

  const {
    data: measurements,
    isLoading: measurementsLoading,
    refetch,
  } = useCollection<BodyMeasurement>(user?.id ? 'bodyMeasurements' : null, {
    query: { ownerId: user?.id },
    sort: { date: -1 },
  });

  const chartData = useMemo(() => {
    if (!measurements) return [];
    return measurements
      .slice()
      .reverse()
      .map((m) => ({
        ...m,
        formattedDate: format(new Date(m.date), 'dd MMM', { locale: pl }),
        formattedDateFull: format(new Date(m.date), 'd MMMM yyyy', { locale: pl }),
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
      weight: undefined,
      biceps: undefined,
      chest: undefined,
      waist: undefined,
      hips: undefined,
      thigh: undefined,
      sharedWithTrainer: false,
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
      setPhotosToUpload((prev) => [...prev, ...files]);
    }
  };

  const onSubmit = async (data: MeasurementFormValues) => {
    if (!user) return;

    let photoURLs: string[] = [];
    if (photosToUpload.length > 0) {
      setIsUploading(true);
      try {
        // TODO: Implement file upload via API
        // For now, we'll skip photo upload
        toast.info('Upload zdjęć nie jest jeszcze zaimplementowany');
      } catch (error) {
        console.error('Error uploading photos: ', error);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const newMeasurement = {
      date: new Date().toISOString(),
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
      ownerId: user.id,
    };

    try {
      await createMeasurement.mutateAsync(newMeasurement as BodyMeasurement);
      toast.success('Pomiar Zapisany!', {
        description: 'Twoje najnowsze pomiary zostały dodane do historii.',
      });
      form.reset();
      setPhotoPreviews([]);
      setPhotosToUpload([]);
      setDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving measurement:', error);
      toast.error('Błąd', {
        description: 'Nie udało się zapisać pomiaru.',
      });
    }
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
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="np. 85.5"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="biceps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biceps (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="chest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Klatka (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="waist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Talia (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hips"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biodra (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="thigh"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Udo (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="np. 60.5"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                                <img
                                  src={src}
                                  alt={`Podgląd zdjęcia ${index + 1}`}
                                  className="w-full h-full object-cover rounded-md"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6"
                                  onClick={() => {
                                    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
                                    setPhotosToUpload((prev) => prev.filter((_, i) => i !== index));
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
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {photoPreviews.length > 0 ? 'Dodaj więcej zdjęć' : 'Dodaj zdjęcia sylwetki'}
                  </Button>
                  <Input
                    type="file"
                    ref={photoInputRef}
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    multiple
                  />
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
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>
                      Anuluj
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMeasurement.isPending || isUploading}>
                    {(createMeasurement.isPending || isUploading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Zapisz Pomiar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Waga"
          value={latestMeasurement?.weight?.toFixed(1) || ' - '}
          unit="kg"
          icon={Weight}
          isLoading={measurementsLoading}
        />
        <StatCard
          title="Talia"
          value={latestMeasurement?.circumferences?.waist?.toFixed(1) || ' - '}
          unit="cm"
          icon={Ruler}
          isLoading={measurementsLoading}
        />
        <StatCard
          title="Postęp"
          value="+1.2"
          unit="kg"
          icon={BarChart}
          isLoading={measurementsLoading}
        />
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
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {measurementsLoading ? (
              <div className="h-64 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              chartTabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  <MeasurementChart
                    data={
                      tab.dataKey === 'weight'
                        ? chartData
                        : chartData.map((d) => ({
                          ...d,
                          [tab.dataKey]:
                            d.circumferences[tab.dataKey as keyof MeasurementCircumferences],
                        }))
                    }
                    dataKey={tab.dataKey}
                    title={tab.label}
                    unit={tab.unit}
                  />
                </TabsContent>
              ))
            )}
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
                <TableHead>Zdjęcia</TableHead>
                <TableHead>Waga (kg)</TableHead>
                <TableHead>Biceps (cm)</TableHead>
                <TableHead>Klatka (cm)</TableHead>
                <TableHead>Talia (cm)</TableHead>
                <TableHead>Biodra (cm)</TableHead>
                <TableHead>Udo (cm)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurementsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : measurements && measurements.length > 0 ? (
                measurements.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {format(new Date(session.date), 'd MMM yyyy', { locale: pl })}
                    </TableCell>
                    <TableCell>
                      {session.photoURLs && session.photoURLs.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          {session.photoURLs.slice(0, 3).map((url, i) => (
                            <div
                              key={i}
                              className="relative h-8 w-8 rounded-full border-2 border-background"
                            >
                              <img
                                src={url}
                                alt="Miniaturka"
                                className="w-full h-full object-cover rounded-full"
                              />
                            </div>
                          ))}
                          {session.photoURLs.length > 3 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                              +{session.photoURLs.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-8 w-8 flex items-center justify-center text-muted-foreground/30">
                          <Camera className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-bold">{session.weight.toFixed(1)}</TableCell>
                    <TableCell>{session.circumferences.biceps?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.circumferences.chest?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.circumferences.waist?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.circumferences.hips?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.circumferences.thigh?.toFixed(1) || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
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
