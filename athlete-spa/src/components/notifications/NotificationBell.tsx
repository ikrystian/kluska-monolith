'use client';

import { useMemo, useState } from 'react';
import { Bell, BellOff, CheckCheck, Loader2, Settings2, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications, type Notification } from '@/lib/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { useUser } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'unread';

/** 1 nowe · 2–4 nowe · 5+ nowych (12–14 też „nowych”). */
function unreadLabel(count: number): string {
    const lastTwo = count % 100;
    const last = count % 10;
    const few = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
    return `${count} ${count === 1 || few ? 'nowe' : 'nowych'}`;
}

const GROUPS = ['Dziś', 'Wczoraj', 'Ostatnie 7 dni', 'Wcześniej'] as const;

function groupByDay(notifications: Notification[]) {
    const now = new Date();
    const buckets = GROUPS.map((label) => ({ label, items: [] as Notification[] }));
    for (const notification of notifications) {
        const days = differenceInCalendarDays(now, new Date(notification.createdAt));
        buckets[days <= 0 ? 0 : days === 1 ? 1 : days < 7 ? 2 : 3].items.push(notification);
    }
    return buckets.filter((bucket) => bucket.items.length > 0);
}

function EmptyState({
    icon: Icon,
    title,
    hint,
    action,
}: {
    icon: typeof Bell;
    title: string;
    hint: string;
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div className="flex flex-col items-center px-8 pb-6 pt-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
                <Icon className="h-6 w-6" />
            </span>
            <p className="mt-4 text-base font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="pressable-sm mt-5 h-10 rounded-full bg-secondary px-4 text-sm font-semibold"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

export function NotificationBell() {
    const { user } = useUser();
    const {
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasError,
        hasMore,
        markAsRead,
        markAllAsRead,
        loadMore,
        refetch,
    } = useNotifications();
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');

    const visible = useMemo(
        () => (filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications),
        [notifications, filter],
    );
    const groups = useMemo(() => groupByDay(visible), [visible]);

    // Don't show if not logged in
    if (!user) return null;

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) refetch();
        else setFilter('all');
    };

    const badge = unreadCount > 99 ? '99+' : unreadCount;

    return (
        <>
            <button
                type="button"
                onClick={() => handleOpenChange(true)}
                aria-label={unreadCount > 0 ? `Powiadomienia: ${unreadLabel(unreadCount)}` : 'Powiadomienia'}
                className="relative grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90 active:bg-secondary"
            >
                <Bell className="h-[22px] w-[22px]" />
                {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                        {badge}
                    </span>
                )}
            </button>

            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent side="bottom" className="flex h-[82dvh] flex-col gap-0 overflow-hidden px-0 pb-0">
                    <SheetHeader className="px-5">
                        <SheetTitle>Powiadomienia</SheetTitle>
                        <SheetDescription>
                            {unreadCount > 0 ? unreadLabel(unreadCount) : 'Wszystko przeczytane'}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-4 flex items-center justify-between gap-3 border-b border-border px-5 pb-3">
                        <div role="tablist" aria-label="Filtr powiadomień" className="flex rounded-full bg-secondary p-1">
                            {(
                                [
                                    ['all', 'Wszystkie'],
                                    ['unread', 'Nowe'],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="tab"
                                    aria-selected={filter === value}
                                    onClick={() => setFilter(value)}
                                    className={cn(
                                        'flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                                        filter === value ? 'bg-foreground text-background' : 'text-muted-foreground',
                                    )}
                                >
                                    {label}
                                    {value === 'unread' && unreadCount > 0 && (
                                        <span
                                            className={cn(
                                                'grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-bold leading-none tabular-nums',
                                                filter === value
                                                    ? 'bg-background/20 text-background'
                                                    : 'bg-primary text-primary-foreground',
                                            )}
                                        >
                                            {badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="pressable-sm -mr-2 flex h-10 items-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-primary"
                            >
                                <CheckCheck className="h-4 w-4" />
                                Oznacz wszystkie
                            </button>
                        )}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        {isLoading && notifications.length === 0 ? (
                            <div aria-busy="true" aria-label="Ładowanie powiadomień" className="pt-2">
                                {[0, 1, 2, 3, 4].map((row) => (
                                    <div key={row} className="flex gap-3 px-5 py-3">
                                        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                                        <div className="flex-1 space-y-2 pt-0.5">
                                            <Skeleton className="h-4 w-2/3" />
                                            <Skeleton className="h-3.5 w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : hasError && notifications.length === 0 ? (
                            <EmptyState
                                icon={WifiOff}
                                title="Nie udało się pobrać powiadomień"
                                hint="Sprawdź połączenie i spróbuj jeszcze raz."
                                action={{ label: 'Spróbuj ponownie', onClick: refetch }}
                            />
                        ) : notifications.length === 0 ? (
                            <EmptyState
                                icon={BellOff}
                                title="Brak powiadomień"
                                hint="Damy znać, gdy wydarzy się coś, co warto zobaczyć."
                            />
                        ) : visible.length === 0 ? (
                            <EmptyState
                                icon={CheckCheck}
                                title="Wszystko przeczytane"
                                hint="Nie masz żadnych nowych powiadomień."
                                action={{ label: 'Pokaż wszystkie', onClick: () => setFilter('all') }}
                            />
                        ) : (
                            <>
                                {groups.map((group) => (
                                    <section key={group.label} aria-label={group.label}>
                                        <h3 className="eyebrow sticky top-0 z-10 bg-popover px-5 pb-1.5 pt-4">
                                            {group.label}
                                        </h3>
                                        <ul>
                                            {group.items.map((notification) => (
                                                <li key={notification._id || notification.id}>
                                                    <NotificationItem
                                                        notification={notification}
                                                        onRead={markAsRead}
                                                        onClick={notification.link ? () => setOpen(false) : undefined}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}

                                {hasMore && (
                                    <div className="px-5 pt-3">
                                        <button
                                            type="button"
                                            onClick={loadMore}
                                            disabled={isLoadingMore}
                                            className="pressable-sm flex h-11 w-full items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold disabled:opacity-60"
                                        >
                                            {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                                            Pokaż starsze
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {!isLoading && (
                            <Link
                                to="/athlete/settings"
                                onClick={() => setOpen(false)}
                                className="mx-auto mt-4 flex h-10 w-fit items-center gap-1.5 px-3 text-[13px] font-medium text-muted-foreground"
                            >
                                <Settings2 className="h-4 w-4" />
                                Ustawienia powiadomień
                            </Link>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
