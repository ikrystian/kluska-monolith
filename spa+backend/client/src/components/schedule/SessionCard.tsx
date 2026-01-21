'use client';

import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Clock, User, CheckCircle, Calendar as CalendarIcon, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TrainingSessionData } from './SessionDetailsDialog';

interface SessionCardProps {
    session: TrainingSessionData;
    onClick: () => void;
    showDate?: boolean;
    compact?: boolean;
}

const statusConfig = {
    scheduled: { label: 'Zaplanowana', bgClass: 'bg-blue-500/10 border-blue-500/30', textClass: 'text-blue-600 dark:text-blue-400' },
    confirmed: { label: 'Potwierdzona', bgClass: 'bg-green-500/10 border-green-500/30', textClass: 'text-green-600 dark:text-green-400' },
    completed: { label: 'Ukończona', bgClass: 'bg-gray-500/10 border-gray-500/30', textClass: 'text-gray-600 dark:text-gray-400' },
    cancelled: { label: 'Anulowana', bgClass: 'bg-red-500/10 border-red-500/30', textClass: 'text-red-600 dark:text-red-400' },
};

export function SessionCard({ session, onClick, showDate = false, compact = false }: SessionCardProps) {
    const sessionDate = new Date(session.date);
    const status = statusConfig[session.status];

    if (compact) {
        return (
            <button
                onClick={onClick}
                className={`w-full text-left p-2 rounded-md border transition-colors hover:bg-accent ${status.bgClass}`}
            >
                <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{session.title}</span>
                    <span className={`text-xs ${status.textClass}`}>
                        {format(sessionDate, 'HH:mm')}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {session.athleteName}
                </p>
            </button>
        );
    }

    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-md ${status.bgClass}`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{session.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{session.athleteName}</span>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={`shrink-0 ${status.textClass}`}
                    >
                        {session.status === 'confirmed' && <CheckCircle className="mr-1 h-3 w-3" />}
                        {session.status === 'cancelled' && <XCircle className="mr-1 h-3 w-3" />}
                        {status.label}
                    </Badge>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm">
                    {showDate && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>{format(sessionDate, 'd MMM', { locale: pl })}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                            {format(sessionDate, 'HH:mm')} - {format(new Date(sessionDate.getTime() + session.duration * 60000), 'HH:mm')}
                        </span>
                    </div>
                </div>

                {session.location && (
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                        📍 {session.location}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
