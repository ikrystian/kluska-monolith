'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { useUser } from '@/contexts/AuthContext';

export function NotificationBell() {
    const { user } = useUser();
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);

    // Don't show if not logged in
    if (!user) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={unreadCount > 0 ? `Powiadomienia: ${unreadCount} nowych` : 'Powiadomienia'}
                className="relative grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90 active:bg-secondary"
            >
                <Bell className="h-[22px] w-[22px]" />
                {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                        {unreadCount}
                    </span>
                )}
            </button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="bottom" className="flex h-[70dvh] flex-col px-0 pb-0">
                    <SheetHeader className="px-5">
                        <SheetTitle>Powiadomienia</SheetTitle>
                        <SheetDescription>
                            {unreadCount > 0 ? `${unreadCount} nieprzeczytanych` : 'Wszystko przeczytane'}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <NotificationItem
                                    key={notification._id || notification.id}
                                    notification={notification}
                                    onRead={markAsRead}
                                    onClick={() => setOpen(false)}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Bell className="mb-2 h-8 w-8 opacity-50" />
                                <p className="text-sm">Brak nowych powiadomień</p>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
