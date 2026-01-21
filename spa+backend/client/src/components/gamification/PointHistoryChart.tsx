'use client';

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PointTransaction } from '@/hooks/useGamification';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

interface PointHistoryChartProps {
    history: PointTransaction[];
    isLoading: boolean;
}

export function PointHistoryChart({ history, isLoading }: PointHistoryChartProps) {
    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];

        // Create cumulative data
        // Sort by date ascending
        const sortedHistory = [...history].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        let runningTotal = 0;
        return sortedHistory.map(item => {
            // Only count earned points for the "Growth" chart
            if (item.type === 'earned' || item.type === 'bonus') {
                runningTotal += item.amount;
            }
            return {
                date: item.createdAt,
                total: runningTotal,
                amount: item.amount,
                description: item.description
            };
        });
    }, [history]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Historia Punktów</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
            </Card>
        );
    }

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Historia Punktów</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Brak danych do wyświetlenia
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Wzrost Punktów
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => format(parseISO(date), 'd MMM', { locale: pl })}
                                minTickGap={30}
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis style={{ fontSize: '12px' }} />
                            <Tooltip
                                labelFormatter={(date) => format(parseISO(date as string), 'd MMM yyyy, HH:mm', { locale: pl })}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#eab308"
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                                name="Suma Punktów"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
