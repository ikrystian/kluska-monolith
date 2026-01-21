'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PointTransaction } from '@/hooks/useGamification';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { History } from 'lucide-react';

interface PointHistoryTableProps {
    history: PointTransaction[];
    isLoading: boolean;
}

export function PointHistoryTable({ history, isLoading }: PointHistoryTableProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Ostatnia Aktywność</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 bg-muted rounded w-full animate-pulse"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (history.length === 0) {
        return null;
    }

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'earned':
                return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Zdobyto</Badge>;
            case 'spent':
                return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Wydano</Badge>;
            case 'bonus':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Bonus</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Ostatnia Aktywność
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Opis</TableHead>
                            <TableHead>Typ</TableHead>
                            <TableHead className="text-right">Punkty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.slice(0, 10).map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="whitespace-nowrap">
                                    {format(parseISO(item.createdAt), 'd MMM, HH:mm', { locale: pl })}
                                </TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>{getTypeBadge(item.type)}</TableCell>
                                <TableCell className={`text-right font-medium ${item.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.amount > 0 ? '+' : ''}{item.amount}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
