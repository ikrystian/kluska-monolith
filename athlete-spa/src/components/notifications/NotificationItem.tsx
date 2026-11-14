'use client';

import { Notification } from '@/lib/hooks/useNotifications';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Dumbbell,
    Footprints,
    MessageCircle,
    Target,
    Trophy,
    Users,
    Utensils,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInMinutes, format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onClick?: () => void;
}

type Look = { icon: LucideIcon; color: string };

/** Where the notification leads says more than its severity, so the link picks the icon first. */
const LINK_LOOKS: [RegExp, Look][] = [
    [/social|friend/, { icon: Users, color: '--social' }],
    [/challenge|achievement|gamification/, { icon: Trophy, color: '--food' }],
    [/chat|message/, { icon: MessageCircle, color: '--social' }],
    [/check-?in/, { icon: ClipboardCheck, color: '--volt' }],
    [/run/, { icon: Footprints, color: '--run' }],
    [/workout|training|plan|exercise/, { icon: Dumbbell, color: '--primary' }],
    [/diet|nutrition|meal|recipe/, { icon: Utensils, color: '--food' }],
    [/goal/, { icon: Target, color: '--volt' }],
];

const TYPE_LOOKS: Record<Notification['type'], Look> = {
    info: { icon: Bell, color: '--run' },
    success: { icon: CheckCircle2, color: '--volt' },
    warning: { icon: AlertTriangle, color: '--food' },
    error: { icon: XCircle, color: '--destructive' },
};

function lookFor(notification: Notification): Look {
    // Problems keep their warning look wherever they lead.
    if (notification.type === 'warning' || notification.type === 'error') return TYPE_LOOKS[notification.type];
    const link = notification.link?.toLowerCase();
    const match = link && LINK_LOOKS.find(([pattern]) => pattern.test(link));
    return match ? match[1] : TYPE_LOOKS[notification.type] ?? TYPE_LOOKS.info;
}

/** Short timestamp: relative for today, clock for yesterday, then weekday, then date. */
function timeLabel(date: Date, now = new Date()): string {
    if (isToday(date)) {
        const minutes = differenceInMinutes(now, date);
        if (minutes < 1) return 'teraz';
        if (minutes < 60) return `${minutes} min`;
        return `${Math.floor(minutes / 60)} godz.`;
    }
    if (isYesterday(date)) return format(date, 'HH:mm');
    if (now.getTime() - date.getTime() < 7 * 86_400_000) return format(date, 'EEE', { locale: pl });
    return format(date, date.getFullYear() === now.getFullYear() ? 'd MMM' : 'd MMM yyyy', { locale: pl });
}

export function NotificationItem({ notification, onRead, onClick }: NotificationItemProps) {
    const { icon: Icon, color } = lookFor(notification);
    const unread = !notification.isRead;
    const createdAt = new Date(notification.createdAt);

    const handleClick = () => {
        if (unread) onRead(notification._id || notification.id!);
        onClick?.();
    };

    const content = (
        <>
            <span
                aria-hidden
                className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', !unread && 'opacity-60')}
                style={{ backgroundColor: `hsl(var(${color}) / 0.14)`, color: `hsl(var(${color}))` }}
            >
                <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                    <span
                        className={cn(
                            'line-clamp-2 text-[15px] leading-snug',
                            unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
                        )}
                    >
                        {notification.title}
                    </span>
                    <time
                        dateTime={createdAt.toISOString()}
                        className={cn(
                            'shrink-0 text-xs tabular-nums',
                            unread ? 'font-semibold text-primary' : 'text-muted-foreground',
                        )}
                    >
                        {timeLabel(createdAt)}
                    </time>
                </span>
                <span className="mt-0.5 flex items-start gap-3">
                    <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
                        {notification.message}
                    </span>
                    {unread ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary">
                            <span className="sr-only">Nieprzeczytane</span>
                        </span>
                    ) : (
                        notification.link && (
                            <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                        )
                    )}
                </span>
            </span>
        </>
    );

    const rowClass = cn('row-tap flex w-full gap-3 px-5 py-3 text-left', unread && 'bg-primary/[0.06]');

    if (notification.link) {
        return (
            <Link to={notification.link} onClick={handleClick} className={rowClass}>
                {content}
            </Link>
        );
    }

    // Nothing to open: tapping only marks it read, so a read one is plain text.
    if (!unread) return <div className={rowClass}>{content}</div>;

    return (
        <button type="button" onClick={handleClick} className={rowClass}>
            {content}
        </button>
    );
}
