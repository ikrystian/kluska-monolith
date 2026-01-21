import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  User,
  Play,
  Trophy,
  Footprints,
  BookOpen,
  Ruler,
  MessageSquare,
  Map,
  ClipboardList,
  Users2,
  Layers,
  TrendingUp,
  CheckSquare,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';

export const athleteNavItems = [
  { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Panel' },
  {
    label: 'Trening',
    icon: Dumbbell,
    items: [
      { href: '/athlete/log', label: 'Trenuj Teraz', icon: Play },
      { href: '/athlete/workouts', label: 'Szablony', icon: ClipboardList },
      { href: '/athlete/workout-plans', label: 'Mój Program', icon: Layers },
      { href: '/athlete/exercises', label: 'Ćwiczenia', icon: Dumbbell },
      { href: '/athlete/running', label: 'Bieganie', icon: Footprints },
      { href: '/athlete/history', label: 'Historia', icon: History },
    ],
  },
  {
    label: 'Postępy',
    icon: TrendingUp,
    items: [
      { href: '/athlete/measurements', label: 'Pomiary', icon: Ruler },
      { href: '/athlete/goals', label: 'Cele i Trofea', icon: Trophy },
      { href: '/athlete/habits', label: 'Nawyki', icon: CheckSquare },
      { href: '/athlete/calendar', label: 'Kalendarz', icon: CalendarDays },
    ],
  },
  {
    label: 'Społeczność',
    icon: Users2,
    items: [
      { href: '/athlete/chat', label: 'Czat', icon: MessageSquare },
      { href: '/athlete/social', label: 'Social', icon: Users2 },
    ],
  },
  { href: '/athlete/knowledge-zone', icon: BookOpen, label: 'Strefa Wiedzy' },
  { href: '/athlete/map', icon: Map, label: 'Mapa Siłowni' },
];

interface NavItemProps {
  item: (typeof athleteNavItems)[0];
  pathname: string;
  onClose?: () => void;
}

function NavItem({ item, pathname, onClose }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasItems = 'items' in item && item.items;

  if (hasItems) {
    const isActive = item.items?.some((subItem) => pathname.startsWith(subItem.href));
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
          <ChevronRight className={cn('ml-auto h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
        </button>
        {isOpen && (
          <div className="ml-4 space-y-1 border-l pl-4">
            {item.items?.map((subItem) => (
              <Link
                key={subItem.href}
                to={subItem.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === subItem.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {subItem.icon && <subItem.icon className="h-4 w-4" />}
                <span>{subItem.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!('href' in item)) return null;

  const isActive = pathname === item.href || (item.href !== '/athlete/dashboard' && pathname.startsWith(item.href));

  return (
    <Link
      to={item.href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

interface AppNavProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppNav({ isMobileOpen, onMobileClose }: AppNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { userProfile } = useUserProfile();
  const pathname = location.pathname;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50 border-r bg-background">
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/athlete/dashboard" className="flex items-center gap-2 font-bold text-primary">
            <span className="font-headline text-xl">Leniwa Kluska</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {athleteNavItems.map((item) => (
            <NavItem key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="border-t p-4 space-y-2">
          <Link
            to="/athlete/profile"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/athlete/profile'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <User className="h-4 w-4" />
            <span>Profil</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Wyloguj</span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {getInitials(userProfile?.name)}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{userProfile?.name || 'Użytkownik'}</span>
              <span className="text-xs text-muted-foreground capitalize">{userProfile?.role || '...'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-background shadow-lg">
            <div className="flex h-16 items-center border-b px-6">
              <Link to="/athlete/dashboard" className="flex items-center gap-2 font-bold text-primary">
                <span className="font-headline text-xl">Leniwa Kluska</span>
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {athleteNavItems.map((item) => (
                <NavItem key={item.label} item={item} pathname={pathname} onClose={onMobileClose} />
              ))}
            </nav>
            <div className="border-t p-4 space-y-2">
              <Link
                to="/athlete/profile"
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/athlete/profile'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <User className="h-4 w-4" />
                <span>Profil</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Wyloguj</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-6 w-6" />
      </Button>
      <Link to="/athlete/dashboard" className="flex items-center gap-2 font-bold text-primary">
        <span className="font-headline text-lg">Leniwa Kluska</span>
      </Link>
    </header>
  );
}
