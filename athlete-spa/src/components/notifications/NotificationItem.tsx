'use client';

import { Notification } from '@/lib/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onClick?: () => void;
}

export function NotificationItem({ notification, onRead, onClick }: NotificationItemProps) {
    const Icon = {
        info: Info,
        success: CheckCircle,
        warning: AlertTriangle,
        error: XCircle,
    }[notification.type];

    const iconColor = {
        info: 'text-run',
        success: 'text-volt',
        warning: 'text-food',
        error: 'text-destructive',
    }[notification.type];

    const handleClick = () => {
        if (!notification.isRead) {
            onRead(notification._id || notification.id!);
        }
        onClick?.();
    };

    const content = (
        <div className="row-tap flex gap-3 px-5 py-3">
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconColor)} />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <p className={cn('truncate text-[15px]', notification.isRead ? 'font-medium' : 'font-semibold')}>
                        {notification.title}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: pl })}
                    </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
            </div>
            {!notification.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
    );

    if (notification.link) {
        return (
            <Link to={notification.link} onClick={handleClick} className="block">
                {content}
            </Link>
        );
    }

    return <div onClick={handleClick}>{content}</div>;
}
