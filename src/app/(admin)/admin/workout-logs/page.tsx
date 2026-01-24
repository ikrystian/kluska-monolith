'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Dumbbell, Calendar, User as UserIcon, Clock } from 'lucide-react';

interface AthleteProfile {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

interface WorkoutLog {
    _id: string;
    workoutName: string;
    startTime: string; // ISO date string
    endTime?: string;
    duration?: number;
    status: 'in-progress' | 'completed' | 'cancelled';
    athleteId: string;
    athlete?: AthleteProfile;
}

export default function AdminWorkoutLogsPage() {
    const [logs, setLogs] = useState<WorkoutLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch('/api/admin/workout-logs?limit=50');
                if (!response.ok) {
                    throw new Error('Failed to fetch workout logs');
                }
                const data = await response.json();
                setLogs(data.data);
            } catch (err) {
                console.error(err);
                setError('Nie udało się pobrać logów treningowych.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-600">Ukończony</Badge>;
            case 'in-progress':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800">W trakcie</Badge>;
            case 'cancelled':
                return <Badge variant="destructive">Anulowany</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return '-';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="mb-6 font-headline text-3xl font-bold">Logi Treningowe</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Historia Treningów</CardTitle>
                    <CardDescription>
                        Lista ostatnich treningów wykonanych przez sportowców.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sportowiec</TableHead>
                                <TableHead>Trening</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Czas trwania</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-red-500 py-8">
                                        {error}
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        Brak logów treningowych.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    {log.athlete?.avatarUrl && <AvatarImage src={log.athlete.avatarUrl} />}
                                                    <AvatarFallback>
                                                        {log.athlete?.name ? getInitials(log.athlete.name) : 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.athlete?.name || 'Nieznany'}</span>
                                                    <span className="text-xs text-muted-foreground">{log.athlete?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{log.workoutName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                                    {format(new Date(log.startTime), 'dd MMM yyyy', { locale: pl })}
                                                </span>
                                                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(log.startTime), 'HH:mm')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatDuration(log.duration)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(log.status)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
