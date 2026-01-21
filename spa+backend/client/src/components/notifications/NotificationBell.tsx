'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

export function NotificationBell() {
    const { data: session } = useSession();
    const { notifications, unreadCount, markAsRead, isLoading } = useNotifications();
    const [open, setOpen] = useState(false);

    // Don't show if not logged in
    if (!session?.user) return null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background" />
                    )}
                    <span className="sr-only">Powiadomienia</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold">Powiadomienia</h4>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {unreadCount} nieprzeczytanych
                        </span>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length > 0 ? (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification._id || notification.id}
                                    notification={notification}
                                    onRead={markAsRead}
                                    onClick={() => setOpen(false)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-50" />
                            <p>Brak nowych powiadomień</p>
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
