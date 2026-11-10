'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
    TrendingUp,
    TrendingDown,
    Dumbbell,
    Weight,
    Ruler,
    BarChart3,
    Activity,
    Loader2,
    Calendar,
} from 'lucide-react';
import { useUser, jsonFetcher } from '@/lib/db-hooks';
import { TourAnchor } from '@/components/tour/TourAnchor';
import { SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface VolumeTrend {
    date: string;
    volume: number;
    workoutCount: number;
}

interface OneRMTrend {
    date: string;
    exerciseName: string;
    weight: number;
    reps: number;
    estimated1RM: number;
}

interface BodyWeightEntry {
    date: string;
    weight: number;
}

interface CircumferencesEntry {
    date: string;
    biceps?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
    calf?: number;
    neck?: number;
}

interface ProgressData {
    volumeTrends: VolumeTrend[];
    estimatedOneRM: Record<string, OneRMTrend[]>;
    bodyWeight: BodyWeightEntry[];
    circumferences: CircumferencesEntry[];
    summary: {
        totalVolume: number;
        volumeChange: number;
        workoutCount: number;
        topExercises: Array<{ name: string; volume: number }>;
    };
}

const StatCard = ({
    title,
    value,
    unit,
    icon: Icon,
    trend,
    isLoading,
}: {
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ElementType;
    trend?: number;
    isLoading: boolean;
}) => (
    <div className="rounded-2xl bg-card p-4">
        <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">{title}</p>
            <Icon className="h-4 w-4 text-muted-foreground/50" />
        </div>
        {isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
        ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <p className={cn('font-display font-bold leading-none tabular-nums', String(value).length > 9 ? 'line-clamp-2 text-2xl' : 'text-[2rem]')}>
                    {value}
                    {unit && <span className="ml-1 font-body text-sm font-semibold text-muted-foreground">{unit}</span>}
                </p>
                {trend !== undefined && trend !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${trend > 0 ? 'text-volt' : 'text-destructive'}`}>
                        {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
        )}
    </div>
);

const periods = [
    { value: '7d', label: '7 dni' },
    { value: '30d', label: '30 dni' },
    { value: '90d', label: '3 miesiące' },
    { value: '1y', label: 'Rok' },
    { value: 'all', label: 'Wszystko' },
];

const circumferenceLabels: Record<string, string> = {
    biceps: 'Biceps',
    chest: 'Klatka',
    waist: 'Talia',
    hips: 'Biodra',
    thigh: 'Udo',
    calf: 'Łydka',
    neck: 'Szyja',
};

export default function ProgressPage() {
    const { user, isUserLoading } = useUser();
    const [period, setPeriod] = useState('30d');
    const { data: swrData, isLoading } = useSWR<ProgressData>(
        user?.uid ? `/api/athlete/progress?period=${period}` : null,
        jsonFetcher
    );
    const data = swrData ?? null;
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
    const [selectedCircumferences, setSelectedCircumferences] = useState<string[]>(['biceps', 'chest', 'waist']);

    // Select the first exercise once data is available and nothing is chosen.
    useEffect(() => {
        if (selectedExercise || !data?.estimatedOneRM) return;
        const exercises = Object.keys(data.estimatedOneRM);
        if (exercises.length > 0) setSelectedExercise(exercises[0]);
    }, [data, selectedExercise]);

    const volumeChartConfig = {
        volume: {
            label: 'Objętość (kg)',
            color: 'hsl(var(--chart-1))',
        },
    };

    const oneRMChartConfig = {
        estimated1RM: {
            label: 'Szacowane 1RM',
            color: 'hsl(var(--chart-1))',
        },
    };

    const weightChartConfig = {
        weight: {
            label: 'Waga (kg)',
            color: 'hsl(var(--chart-1))',
        },
    };

    const formattedVolumeData = useMemo(() => {
        if (!data?.volumeTrends) return [];
        return data.volumeTrends.map(v => ({
            ...v,
            formattedDate: format(new Date(v.date), 'd MMM', { locale: pl }),
            formattedDateFull: format(new Date(v.date), 'd MMMM yyyy', { locale: pl }),
        }));
    }, [data?.volumeTrends]);

    const formattedOneRMData = useMemo(() => {
        if (!data?.estimatedOneRM || !selectedExercise) return [];
        const exerciseData = data.estimatedOneRM[selectedExercise] || [];
        return exerciseData.map(e => ({
            ...e,
            formattedDate: format(new Date(e.date), 'd MMM', { locale: pl }),
            formattedDateFull: format(new Date(e.date), 'd MMMM yyyy', { locale: pl }),
        }));
    }, [data?.estimatedOneRM, selectedExercise]);

    const formattedWeightData = useMemo(() => {
        if (!data?.bodyWeight) return [];
        return data.bodyWeight.map(w => ({
            ...w,
            formattedDate: format(new Date(w.date), 'd MMM', { locale: pl }),
            formattedDateFull: format(new Date(w.date), 'd MMMM yyyy', { locale: pl }),
        }));
    }, [data?.bodyWeight]);

    const formattedCircumferencesData = useMemo(() => {
        if (!data?.circumferences) return [];
        return data.circumferences.map(c => ({
            ...c,
            formattedDate: format(new Date(c.date), 'd MMM', { locale: pl }),
            formattedDateFull: format(new Date(c.date), 'd MMMM yyyy', { locale: pl }),
        }));
    }, [data?.circumferences]);

    const exerciseOptions = useMemo(() => {
        if (!data?.estimatedOneRM) return [];
        return Object.entries(data.estimatedOneRM)
            .filter(([, trends]) => trends.length > 0)
            .map(([id, trends]) => ({
                id,
                name: trends[0].exerciseName,
                dataPoints: trends.length,
            }));
    }, [data?.estimatedOneRM]);

    const combinedLoading = isUserLoading || isLoading;

    const NoDataMessage = ({ message }: { message: string }) => (
        <div className="flex h-56 flex-col items-center justify-center text-center">
            <BarChart3 className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">{message}</p>
            <p className="text-xs text-muted-foreground">Dodaj więcej treningów, aby zobaczyć wykresy.</p>
        </div>
    );

    return (
        <div className="page space-y-4">
            <TourAnchor name="progress-period">
                <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="tablist" aria-label="Okres">
                    {periods.map(p => (
                        <button
                            key={p.value}
                            type="button"
                            role="tab"
                            aria-selected={period === p.value}
                            onClick={() => setPeriod(p.value)}
                            className={cn(
                                'h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors',
                                period === p.value ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </TourAnchor>

            {/* Summary Cards */}
            <div data-tour="progress-summary" className="grid grid-cols-2 gap-2.5">
                <StatCard
                    title="Objętość"
                    value={data?.summary?.totalVolume?.toLocaleString('pl-PL') || '0'}
                    unit="kg"
                    icon={Dumbbell}
                    trend={data?.summary?.volumeChange}
                    isLoading={combinedLoading}
                />
                <StatCard
                    title="Treningi"
                    value={data?.summary?.workoutCount || 0}
                    icon={Activity}
                    isLoading={combinedLoading}
                />
                <StatCard
                    title="Obecna waga"
                    value={data?.bodyWeight?.at(-1)?.weight?.toLocaleString('pl-PL', { minimumFractionDigits: 1 }) || '-'}
                    unit="kg"
                    icon={Weight}
                    isLoading={combinedLoading}
                />
                <StatCard
                    title="Top ćwiczenie"
                    value={data?.summary?.topExercises?.[0]?.name || '-'}
                    icon={TrendingUp}
                    isLoading={combinedLoading}
                />
            </div>

            {/* Charts */}
            <Tabs defaultValue="volume">
                <TabsList data-tour="progress-charts" className="grid w-full grid-cols-4">
                    <TabsTrigger value="volume">Objętość</TabsTrigger>
                    <TabsTrigger value="strength">Siła</TabsTrigger>
                    <TabsTrigger value="weight">Waga</TabsTrigger>
                    <TabsTrigger value="circumferences">Obwody</TabsTrigger>
                </TabsList>

                {/* Volume Tab */}
                <TabsContent value="volume">
                    <Card>
                        <CardHeader>
                            <CardTitle>Trendy objętości treningowej</CardTitle>
                            <CardDescription>Całkowity tonaż (kg) w poszczególnych dniach</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {combinedLoading ? (
                                <div className="h-64 flex justify-center items-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : formattedVolumeData.length < 2 ? (
                                <NoDataMessage message="Za mało danych do wyświetlenia wykresu objętości." />
                            ) : (
                                <ChartContainer config={volumeChartConfig} className="min-h-[240px] w-full">
                                    <AreaChart data={formattedVolumeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                                        <XAxis
                                            dataKey="formattedDate"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(value, name, props) => (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{props.payload.formattedDateFull}</span>
                                                            <span>Objętość: {Number(value).toLocaleString('pl-PL')} kg</span>
                                                            <span className="text-muted-foreground text-sm">
                                                                Treningi: {props.payload.workoutCount}
                                                            </span>
                                                        </div>
                                                    )}
                                                />
                                            }
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="volume"
                                            stroke="hsl(var(--chart-1))"
                                            strokeWidth={2}
                                            fill="url(#volumeGradient)"
                                        />
                                    </AreaChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Strength (1RM) Tab */}
                <TabsContent value="strength">
                    <Card>
                        <CardHeader className="flex flex-col gap-3">
                            <div>
                                <CardTitle>Szacowane 1RM w czasie</CardTitle>
                                <CardDescription>Postęp siły wg formuły Brzycki</CardDescription>
                            </div>
                            {exerciseOptions.length > 0 && (
                                <Select value={selectedExercise || ''} onValueChange={setSelectedExercise}>
                                    <SelectTrigger className="h-10 w-full rounded-full px-4">
                                        <SelectValue placeholder="Wybierz ćwiczenie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {exerciseOptions.map(ex => (
                                            <SelectItem key={ex.id} value={ex.id}>
                                                {ex.name} ({ex.dataPoints})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardHeader>
                        <CardContent>
                            {combinedLoading ? (
                                <div className="h-64 flex justify-center items-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : formattedOneRMData.length < 2 ? (
                                <NoDataMessage message="Za mało danych do wyświetlenia wykresu 1RM." />
                            ) : (
                                <ChartContainer config={oneRMChartConfig} className="min-h-[240px] w-full">
                                    <LineChart data={formattedOneRMData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                                        <XAxis
                                            dataKey="formattedDate"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            domain={['dataMin - 5', 'dataMax + 5']}
                                        />
                                        <Tooltip
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(value, name, props) => (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{props.payload.formattedDateFull}</span>
                                                            <span>Szacowane 1RM: {Number(value).toFixed(1)} kg</span>
                                                            <span className="text-muted-foreground text-sm">
                                                                Wykonane: {props.payload.weight}kg × {props.payload.reps} powt.
                                                            </span>
                                                        </div>
                                                    )}
                                                />
                                            }
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="estimated1RM"
                                            stroke="hsl(var(--chart-1))"
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: 'hsl(var(--chart-1))', strokeWidth: 0 }}
                                            activeDot={{ r: 6, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Weight Tab */}
                <TabsContent value="weight">
                    <Card>
                        <CardHeader>
                            <CardTitle>Waga ciała w czasie</CardTitle>
                            <CardDescription>Historia pomiarów wagi</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {combinedLoading ? (
                                <div className="h-64 flex justify-center items-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : formattedWeightData.length < 2 ? (
                                <NoDataMessage message="Za mało danych do wyświetlenia wykresu wagi." />
                            ) : (
                                <ChartContainer config={weightChartConfig} className="min-h-[240px] w-full">
                                    <LineChart data={formattedWeightData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                                        <XAxis
                                            dataKey="formattedDate"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            domain={['dataMin - 2', 'dataMax + 2']}
                                            tickFormatter={(value) => value.toFixed(1)}
                                        />
                                        <Tooltip
                                            content={
                                                <ChartTooltipContent
                                                    formatter={(value, name, props) => (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{props.payload.formattedDateFull}</span>
                                                            <span>Waga: {Number(value).toFixed(1)} kg</span>
                                                        </div>
                                                    )}
                                                />
                                            }
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="weight"
                                            stroke="hsl(var(--chart-1))"
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: 'hsl(var(--chart-1))', strokeWidth: 0 }}
                                            activeDot={{ r: 6, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Circumferences Tab — small multiples, one panel per body part */}
                <TabsContent value="circumferences">
                    <Card>
                        <CardHeader>
                            <CardTitle>Obwody ciała w czasie</CardTitle>
                            <CardDescription>Każda partia na osobnym mini-wykresie</CardDescription>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {Object.entries(circumferenceLabels).map(([key, label]) => (
                                    <Button
                                        key={key}
                                        variant={selectedCircumferences.includes(key) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => {
                                            setSelectedCircumferences(prev =>
                                                prev.includes(key)
                                                    ? prev.filter(c => c !== key)
                                                    : [...prev, key]
                                            );
                                        }}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {combinedLoading ? (
                                <div className="h-64 flex justify-center items-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : formattedCircumferencesData.length < 2 ? (
                                <NoDataMessage message="Za mało danych do wyświetlenia wykresu obwodów." />
                            ) : selectedCircumferences.length === 0 ? (
                                <p className="py-10 text-center text-sm text-muted-foreground">Wybierz partie ciała powyżej.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {selectedCircumferences.map(key => {
                                        const series = formattedCircumferencesData.filter(
                                            d => d[key as keyof CircumferencesEntry] != null
                                        );
                                        const latest = series.at(-1)?.[key as keyof CircumferencesEntry] as number | undefined;
                                        const first = series[0]?.[key as keyof CircumferencesEntry] as number | undefined;
                                        const delta = latest != null && first != null ? latest - first : null;

                                        return (
                                            <div key={key} className="rounded-2xl bg-card p-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold text-muted-foreground">
                                                        {circumferenceLabels[key]}
                                                    </p>
                                                    {delta != null && delta !== 0 && (
                                                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold tabular-nums text-foreground">
                                                            {delta > 0 ? '+' : ''}{delta.toFixed(1)} cm
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                                                    {latest != null ? latest.toFixed(1) : '–'}
                                                    <span className="ml-1 text-sm font-semibold text-muted-foreground">cm</span>
                                                </p>
                                                {series.length >= 2 ? (
                                                    <div className="mt-2 h-14">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                                                <defs>
                                                                    <linearGradient id={`spark-${key}`} x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                                                                <Tooltip
                                                                    cursor={{ stroke: 'hsl(var(--border))' }}
                                                                    content={({ active, payload }) =>
                                                                        active && payload?.length ? (
                                                                            <div className="rounded-lg border border-border/60 bg-popover px-2.5 py-1.5 text-xs">
                                                                                <p className="font-medium">{(payload[0].payload as any).formattedDateFull}</p>
                                                                                <p className="tabular-nums text-muted-foreground">{Number(payload[0].value).toFixed(1)} cm</p>
                                                                            </div>
                                                                        ) : null
                                                                    }
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey={key}
                                                                    stroke="hsl(var(--chart-1))"
                                                                    strokeWidth={2}
                                                                    fill={`url(#spark-${key})`}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-xs text-muted-foreground">Za mało pomiarów</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Top Exercises */}
            {data?.summary?.topExercises && data.summary.topExercises.length > 0 && (
                <section>
                    <SectionHeader title="Najwięcej objętości" />
                    <div className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
                        {data.summary.topExercises.map((exercise, index) => (
                            <div key={exercise.name} className="flex items-center gap-3 px-3.5 py-2.5">
                                <span className="w-4 shrink-0 text-center font-display text-xl font-bold tabular-nums text-muted-foreground">{index + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{exercise.name}</p>
                                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${(exercise.volume / data.summary.topExercises[0].volume) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{exercise.volume.toLocaleString('pl-PL')} kg</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
