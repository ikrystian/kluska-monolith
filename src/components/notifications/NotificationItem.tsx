'use client';

import { Notification } from '@/lib/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Info, CheckCircle, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
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
        info: 'text-blue-500',
        success: 'text-green-500',
        warning: 'text-yellow-500',
        error: 'text-red-500',
    }[notification.type];

    const handleClick = () => {
        if (!notification.isRead) {
            onRead(notification._id || notification.id!);
        }
        onClick?.();
    };

    const content = (
        <div className={cn(
            "flex gap-3 p-3 transition-colors hover:bg-muted/50 cursor-pointer",
            !notification.isRead && "bg-muted/30"
        )}>
            <div className={cn("mt-1", iconColor)}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex justify-between gap-2">
                    <p className={cn("text-sm font-medium leading-none", !notification.isRead && "font-semibold")}>
                        {notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: pl })}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                </p>
            </div>
            {!notification.isRead && (
                <div className="flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
            )}
        </div>
    );

    if (notification.link) {
        return (
            <Link href={notification.link} onClick={handleClick} className="block">
                {content}
            </Link>
        );
    }

    return (
        <div onClick={handleClick}>
            {content}
        </div>
    );
}
