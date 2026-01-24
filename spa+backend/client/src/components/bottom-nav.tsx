import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Play, Dumbbell, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const { pathname } = useLocation();

    const items = [
        { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Panel' },
        { href: '/athlete/workouts', icon: Dumbbell, label: 'Treningi' },
        { href: '/athlete/log', icon: Play, label: 'Trenuj' },
        { href: '/athlete/history', icon: History, label: 'Historia' },
        { href: '/athlete/profile', icon: User, label: 'Profil' },
    ];

    return (
        <div id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 block border-t glass pb-[env(safe-area-inset-bottom)] md:hidden">
            <div className="flex h-16 items-center justify-around px-2">
                {items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/athlete/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[10px] font-medium transition-all duration-200 active:scale-95",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "rounded-full p-1 transition-colors",
                                isActive ? "bg-primary/10" : "bg-transparent"
                            )}>
                                <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                            </div>
                            <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-70")}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
