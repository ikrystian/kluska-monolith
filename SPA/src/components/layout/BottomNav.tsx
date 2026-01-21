import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Play, CalendarDays, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const items = [
    { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Panel' },
    { href: '/athlete/calendar', icon: CalendarDays, label: 'Kalendarz' },
    { href: '/athlete/log', icon: Play, label: 'Trenuj' },
    { href: '/athlete/chat', icon: MessageSquare, label: 'Czat' },
    { href: '/athlete/profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 block border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/athlete/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'fill-current')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
