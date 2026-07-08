'use client';

import { apiFetch } from '@/lib/api-client';
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
import { useUser } from '@/lib/db-hooks';
import { useEffect, useCallback } from 'react';

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
    <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft">
        <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
            <Icon className="h-4 w-4 text-muted-foreground/50" />
        </div>
        {isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
        ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <p className="font-headline text-2xl font-bold leading-none tracking-tight tabular-nums">
                    {value}
                    {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
                </p>
                {trend !== undefined && trend !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${trend > 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'}`}>
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
    const [data, setData] = useState<ProgressData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
    const [selectedCircumferences, setSelectedCircumferences] = useState<string[]>(['biceps', 'chest', 'waist']);

    const fetchData = useCallback(async () => {
        if (!user?.uid) return;

        setIsLoading(true);
        try {
            const response = await apiFetch(`/api/athlete/progress?period=${period}`);
            if (response.ok) {
                const result = await response.json();
                setData(result);

                // Select first exercise if none selected
                if (!selectedExercise && result.estimatedOneRM) {
                    const exercises = Object.keys(result.estimatedOneRM);
                    if (exercises.length > 0) {
                        setSelectedExercise(exercises[0]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching progress data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.uid, period, selectedExercise]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
        <div className="flex h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card/50 p-4 text-center">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
                <BarChart3 className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">Dodaj więcej treningów, aby zobaczyć wykresy.</p>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">Analiza wyników</p>
                    <h1 className="mt-2 font-display text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
                        Twoje <span className="text-gradient-ember">postępy</span>
                    </h1>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-11 w-full rounded-full px-4 md:w-[180px]">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Wybierz okres" />
                    </SelectTrigger>
                    <SelectContent>
                        {periods.map(p => (
                            <SelectItem key={p.value} value={p.value}>
                                {p.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <StatCard
                    title="Objętość"
                    value={data?.summary?.totalVolume?.toLocaleString() || '0'}
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
                    value={data?.bodyWeight?.at(-1)?.weight?.toFixed(1) || '-'}
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
            <Tabs defaultValue="volume" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="volume" className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4" />
                        <span className="hidden sm:inline">Objętość</span>
                    </TabsTrigger>
                    <TabsTrigger value="strength" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="hidden sm:inline">Siła (1RM)</span>
                    </TabsTrigger>
                    <TabsTrigger value="weight" className="flex items-center gap-2">
                        <Weight className="h-4 w-4" />
                        <span className="hidden sm:inline">Waga</span>
                    </TabsTrigger>
                    <TabsTrigger value="circumferences" className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        <span className="hidden sm:inline">Obwody</span>
                    </TabsTrigger>
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
                                <ChartContainer config={volumeChartConfig} className="min-h-[300px] w-full">
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
                                                            <span>Objętość: {Number(value).toLocaleString()} kg</span>
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
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Szacowane 1RM w czasie</CardTitle>
                                <CardDescription>Postęp siły wg formuły Brzycki</CardDescription>
                            </div>
                            {exerciseOptions.length > 0 && (
                                <Select value={selectedExercise || ''} onValueChange={setSelectedExercise}>
                                    <SelectTrigger className="h-10 w-full rounded-full px-4 sm:w-[200px]">
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
                                <ChartContainer config={oneRMChartConfig} className="min-h-[300px] w-full">
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
                                <ChartContainer config={weightChartConfig} className="min-h-[300px] w-full">
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
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {selectedCircumferences.map(key => {
                                        const series = formattedCircumferencesData.filter(
                                            d => d[key as keyof CircumferencesEntry] != null
                                        );
                                        const latest = series.at(-1)?.[key as keyof CircumferencesEntry] as number | undefined;
                                        const first = series[0]?.[key as keyof CircumferencesEntry] as number | undefined;
                                        const delta = latest != null && first != null ? latest - first : null;

                                        return (
                                            <div key={key} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                                        {circumferenceLabels[key]}
                                                    </p>
                                                    {delta != null && delta !== 0 && (
                                                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold tabular-nums text-foreground">
                                                            {delta > 0 ? '+' : ''}{delta.toFixed(1)} cm
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 font-headline text-2xl font-bold tabular-nums">
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
                                                                            <div className="rounded-lg border border-border/60 bg-popover px-2.5 py-1.5 text-xs shadow-lifted">
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
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Najbardziej obciążające ćwiczenia</CardTitle>
                        <CardDescription>Top 5 ćwiczeń wg całkowitej objętości</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.summary.topExercises.map((exercise, index) => (
                                <div key={exercise.name} className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-secondary/30 p-3">
                                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary font-headline text-sm font-bold text-primary">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{exercise.name}</div>
                                        <div className="text-xs tabular-nums text-muted-foreground">
                                            {exercise.volume.toLocaleString()} kg objętości
                                        </div>
                                    </div>
                                    <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-secondary md:w-28">
                                        <div
                                            className="h-full rounded-full bg-[hsl(var(--chart-1))]"
                                            style={{
                                                width: `${(exercise.volume / data.summary.topExercises[0].volume) * 100}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
