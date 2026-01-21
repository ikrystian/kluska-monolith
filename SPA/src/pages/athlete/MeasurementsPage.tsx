import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { useCreateDoc } from '@/hooks/useMutation';
import { BodyMeasurement } from '@/types';
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
import { PlusCircle, Loader2, Weight, Ruler, BarChart, Armchair, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const measurementSchema = z.object({
  weight: z.coerce.number().positive('Waga musi być liczbą dodatnią.'),
  biceps: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  chest: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  waist: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  hips: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  thigh: z.coerce.number().min(0, 'Obwód musi być liczbą nieujemną.').optional(),
  sharedWithTrainer: z.boolean().default(false),
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

const MeasurementChart = ({ data, dataKey, title }: { data: any[], dataKey: string, title: string, unit?: string }) => {
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
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
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
            labelFormatter={(value) => value}
          />
          <Line
            dataKey={dataKey}
            type="monotone"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
};


export default function MeasurementsPage() {
  const { user } = useAuth();
  const { mutate: createMeasurement, isPending: isCreating } = useCreateDoc<BodyMeasurement>('bodyMeasurements');
  const [isDialogOpen, setDialogOpen] = useState(false);

  const { data: measurements, isLoading } = useCollection<BodyMeasurement>(
    'bodyMeasurements',
    {
      query: { userId: user?.id },
      sort: { date: -1 }
    }
  );

  const chartData = useMemo(() => {
    if (!measurements) return [];
    return measurements.slice().reverse().map(m => ({
      ...m,
      formattedDate: format(new Date(m.date), 'dd MMM', { locale: pl }),
      formattedDateFull: format(new Date(m.date), 'd MMMM yyyy', { locale: pl }),
    }));
  }, [measurements]);

  const latestMeasurement = measurements?.[0];

  const form = useForm<any>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      weight: 0,
      biceps: 0,
      chest: 0,
      waist: 0,
      hips: 0,
      thigh: 0,
      sharedWithTrainer: false,
    },
  });

  const onSubmit = (data: MeasurementFormValues) => {
    if (!user?.id) return;

    const newMeasurement: any = {
      date: new Date().toISOString(),
      userId: user.id,
      weight: data.weight,
      chest: data.chest,
      waist: data.waist,
      hips: data.hips,
      bicepRight: data.biceps,
      thighRight: data.thigh,
      createdAt: new Date().toISOString()
    };

    createMeasurement(newMeasurement, {
      onSuccess: () => {
        toast.success('Pomiar Zapisany!', {
          description: 'Twoje najnowsze pomiary zostały dodane do historii.',
        });
        form.reset();
        setDialogOpen(false);
      },
      onError: () => {
        toast.error("Błąd", { description: "Nie udało się zapisać pomiaru." });
      }
    });
  };

  const chartTabs = [
    { value: 'weight', label: 'Waga', unit: 'kg', dataKey: 'weight' },
    { value: 'biceps', label: 'Biceps', unit: 'cm', dataKey: 'bicepRight' },
    { value: 'chest', label: 'Klatka piersiowa', unit: 'cm', dataKey: 'chest' },
    { value: 'waist', label: 'Talia', unit: 'cm', dataKey: 'waist' },
    { value: 'hips', label: 'Biodra', unit: 'cm', dataKey: 'hips' },
    { value: 'thigh', label: 'Udo', unit: 'cm', dataKey: 'thighRight' },
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
                  control={form.control as any}
                  name="weight"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Waga (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="np. 85.5" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control as any} name="biceps" render={({ field }: { field: any }) => (<FormItem><FormLabel>Biceps (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control as any} name="chest" render={({ field }: { field: any }) => (<FormItem><FormLabel>Klatka (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control as any} name="waist" render={({ field }: { field: any }) => (<FormItem><FormLabel>Talia (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control as any} name="hips" render={({ field }: { field: any }) => (<FormItem><FormLabel>Biodra (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control as any} name="thigh" render={({ field }: { field: any }) => (<FormItem className="col-span-2"><FormLabel>Udo (cm)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="np. 60.5" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                {/* Mock Upload Section */}
                <div className="space-y-2 border rounded-md p-4 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Zdjęcia (niedostępne)</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Dodawanie zdjęć jest tymczasowo wyłączone w tej wersji.</p>
                </div>

                <FormField
                  control={form.control as any}
                  name="sharedWithTrainer"
                  render={({ field }: { field: any }) => (
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
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
        <StatCard title="Talia" value={latestMeasurement?.waist?.toFixed(1) || ' - '} unit="cm" icon={Ruler} isLoading={isLoading} />
        <StatCard title="Ostatni pomiar" value={latestMeasurement ? format(new Date(latestMeasurement.date), 'dd.MM', { locale: pl }) : '-'} unit="" icon={BarChart} isLoading={isLoading} />
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
                  data={chartData}
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
                    <TableCell className="font-medium">{format(new Date(session.date), 'd MMM yyyy', { locale: pl })}</TableCell>
                    <TableCell className="font-bold">{session.weight?.toFixed(1)}</TableCell>
                    <TableCell>{session.bicepRight?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.chest?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.waist?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.hips?.toFixed(1) || '-'}</TableCell>
                    <TableCell>{session.thighRight?.toFixed(1) || '-'}</TableCell>
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
