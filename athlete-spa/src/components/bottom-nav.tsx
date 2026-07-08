import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Play, CalendarDays, MessageSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const { pathname } = useLocation();

    const items = [
        { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Panel' },
        { href: '/athlete/calendar', icon: CalendarDays, label: 'Kalendarz' },
        { href: '/athlete/log', icon: Play, label: 'Trenuj', primary: true },
        { href: '/athlete/chat', icon: MessageSquare, label: 'Czat' },
        { href: '/athlete/profile', icon: User, label: 'Profil' },
    ];

    return (
        <nav
            id="bottom-nav"
            className="fixed inset-x-4 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto block max-w-md rounded-[2rem] border border-foreground/10 bg-background/75 shadow-lifted backdrop-blur-2xl md:hidden"
        >
            <div className="flex h-[4.25rem] items-center justify-around px-2">
                {items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/athlete/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    if (item.primary) {
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                aria-label={item.label}
                                className="pressable-sm group relative -top-6 flex flex-col items-center"
                            >
                                <span
                                    aria-hidden
                                    className="animate-pulse-subtle absolute top-1 h-14 w-14 rounded-full bg-primary/50 blur-xl transition-opacity group-active:opacity-40"
                                />
                                <span
                                    className={cn(
                                        "relative flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full hero-ember text-white shadow-glow ring-4 ring-background transition-transform duration-200 group-active:scale-90",
                                        isActive && "ring-primary/40"
                                    )}
                                >
                                    <Icon className="h-6 w-6 fill-current drop-shadow-sm" />
                                </span>
                                <span className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            aria-label={item.label}
                            className="pressable relative flex h-full min-w-[3.5rem] flex-col items-center justify-center gap-1"
                        >
                            <span
                                className={cn(
                                    "relative flex h-8 w-[3.25rem] items-center justify-center rounded-full transition-colors duration-300",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground active:scale-90"
                                )}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="bottom-nav-pill"
                                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                        className="absolute inset-0 rounded-full bg-secondary shadow-soft"
                                    />
                                )}
                                <Icon className={cn("relative z-10 h-5 w-5 transition-transform duration-300", isActive && "-translate-y-px scale-110")} strokeWidth={isActive ? 2.4 : 2} />
                            </span>
                            <span
                                className={cn(
                                    "text-[9px] uppercase tracking-[0.14em] leading-none transition-colors duration-300",
                                    isActive ? "font-bold text-foreground" : "font-semibold text-muted-foreground/80"
                                )}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
