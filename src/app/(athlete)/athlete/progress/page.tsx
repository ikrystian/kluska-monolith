'use client';

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
    Legend,
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
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">
                        {value} <span className="text-base font-normal text-muted-foreground">{unit}</span>
                    </div>
                    {trend !== undefined && trend !== 0 && (
                        <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {trend > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
            )}
        </CardContent>
    </Card>
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

const circumferenceColors: Record<string, string> = {
    biceps: 'hsl(210, 100%, 50%)',
    chest: 'hsl(150, 100%, 40%)',
    waist: 'hsl(30, 100%, 50%)',
    hips: 'hsl(280, 100%, 50%)',
    thigh: 'hsl(0, 100%, 50%)',
    calf: 'hsl(60, 100%, 40%)',
    neck: 'hsl(180, 100%, 40%)',
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
            const response = await fetch(`/api/athlete/progress?period=${period}`);
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
            color: 'hsl(var(--primary))',
        },
    };

    const oneRMChartConfig = {
        estimated1RM: {
            label: 'Szacowane 1RM',
            color: 'hsl(var(--primary))',
        },
    };

    const weightChartConfig = {
        weight: {
            label: 'Waga (kg)',
            color: 'hsl(var(--primary))',
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
        <div className="h-64 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed rounded-lg">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Dodaj więcej treningów, aby zobaczyć wykresy.</p>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="font-headline text-3xl font-bold">Dashboard Postępów</h1>
                    <p className="text-muted-foreground mt-1">Śledź swoje postępy w czasie</p>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px]">
                        <Calendar className="h-4 w-4 mr-2" />
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
            <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Całkowita Objętość"
                    value={data?.summary?.totalVolume?.toLocaleString() || '0'}
                    unit="kg"
                    icon={Dumbbell}
                    trend={data?.summary?.volumeChange}
                    isLoading={combinedLoading}
                />
                <StatCard
                    title="Liczba Treningów"
                    value={data?.summary?.workoutCount || 0}
                    unit=""
                    icon={Activity}
                    isLoading={combinedLoading}
                />
                <StatCard
                    title="Obecna Waga"
                    value={data?.bodyWeight?.at(-1)?.weight?.toFixed(1) || '-'}
                    unit="kg"
                    icon={Weight}
                    isLoading={combinedLoading}
                />
                <StatCard
                    title="Top Ćwiczenie"
                    value={data?.summary?.topExercises?.[0]?.name || '-'}
                    unit=""
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
                            <CardTitle>Trendy Objętości Treningowej</CardTitle>
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
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} />
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
                                            stroke="hsl(var(--primary))"
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
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Szacowane 1RM w Czasie</CardTitle>
                                <CardDescription>Postęp siły wg formuły Brzycki</CardDescription>
                            </div>
                            {exerciseOptions.length > 0 && (
                                <Select value={selectedExercise || ''} onValueChange={setSelectedExercise}>
                                    <SelectTrigger className="w-[200px]">
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
                                        <CartesianGrid vertical={false} />
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
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                                            activeDot={{ r: 6 }}
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
                            <CardTitle>Waga Ciała w Czasie</CardTitle>
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
                                        <CartesianGrid vertical={false} />
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
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Circumferences Tab */}
                <TabsContent value="circumferences">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                            <div>
                                <CardTitle>Obwody Ciała w Czasie</CardTitle>
                                <CardDescription>Porównaj zmiany różnych partii ciała</CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
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
                            ) : (
                                <div className="min-h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={formattedCircumferencesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend />
                                            {selectedCircumferences.map(key => (
                                                <Line
                                                    key={key}
                                                    type="monotone"
                                                    dataKey={key}
                                                    name={circumferenceLabels[key]}
                                                    stroke={circumferenceColors[key]}
                                                    strokeWidth={2}
                                                    dot={{ r: 3 }}
                                                    activeDot={{ r: 5 }}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
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
                        <CardTitle>Najbardziej Obciążające Ćwiczenia</CardTitle>
                        <CardDescription>Top 5 ćwiczeń wg całkowitej objętości</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.summary.topExercises.map((exercise, index) => (
                                <div key={exercise.name} className="flex items-center gap-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{exercise.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {exercise.volume.toLocaleString()} kg objętości
                                        </div>
                                    </div>
                                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
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
