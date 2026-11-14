'use client';

import {
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  Play,
  Library,
  Users,
  RectangleEllipsis,
  Trophy,
  Footprints,
  Salad,
  ChefHat,
  BookOpen,
  Ruler,
  Building2,
  MessageSquare,
  Map,
  ClipboardList,
  BookMarked,
  ArrowLeft,
  ChevronRight,
  Users2,
  Layers,
  TrendingUp,
  CheckSquare,
  Gauge,
  ClipboardCheck,
  Bell,
  IdCard,
  Inbox,
  Settings,
  Megaphone,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { useUser } from '@/lib/db-hooks';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { signOut, signIn } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/lib/db-hooks';
import { Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUnreadChatCount } from '@/components/chat/hooks/useConversations';

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
    ]
  },
  {
    label: 'Postępy',
    icon: TrendingUp,
    items: [
      { href: '/athlete/progress', label: 'Dashboard Postępów', icon: TrendingUp },
      { href: '/athlete/measurements', label: 'Pomiary', icon: Ruler },
      { href: '/athlete/goals', label: 'Cele i Trofea', icon: Trophy },
      { href: '/athlete/habits', label: 'Nawyki', icon: CheckSquare },
      { href: '/athlete/calendar', label: 'Kalendarz', icon: CalendarDays },
    ]
  },
  {
    label: 'Społeczność',
    icon: Users2,
    items: [
      { href: '/athlete/chat', label: 'Czat', icon: MessageSquare },
      { href: '/athlete/social', label: 'Social', icon: Users2 },
    ]
  },
  { href: '/athlete/check-in', icon: ClipboardCheck, label: 'Tygodniowy Check-in' },
  { href: '/athlete/knowledge-zone', icon: BookOpen, label: 'Strefa Wiedzy' },
  { href: '/athlete/map', icon: Map, label: 'Mapa Siłowni' },
];

const trainerNavItems = [
  { href: '/trainer/dashboard', icon: LayoutDashboard, label: 'Panel Trenera' },
  { href: '/trainer/my-athletes', icon: Users, label: 'Moi Sportowcy' },
  { href: '/trainer/surveys', icon: ClipboardList, label: 'Ankiety' },
  { href: '/trainer/schedule', icon: CalendarDays, label: 'Harmonogram' },
  { href: '/trainer/chat', icon: MessageSquare, label: 'Czat' },
  { href: '/trainer/social', icon: Users2, label: 'Social' },
  { href: '/trainer/inquiries', icon: Inbox, label: 'Zapytania' },
  { href: '/trainer/business-card', icon: IdCard, label: 'Wizytówka' },
  {
    label: 'Trening',
    icon: Dumbbell,
    items: [
      { href: '/trainer/workout-plans', label: 'Plany Treningowe' },
      { href: '/trainer/workouts', label: 'Treningi' },
      { href: '/trainer/exercises', label: 'Ćwiczenia' },
    ]
  },
  {
    label: 'Dieta',
    icon: Salad,
    items: [
      { href: '/trainer/diet/plans', label: 'Plany Dietetyczne' },
      { href: '/trainer/diet/plans/create', label: 'Utwórz Plan' },
      { href: '/trainer/diet/meals', label: 'Posiłki' },
      { href: '/trainer/diet/meals/create', label: 'Utwórz Posiłek' },
    ]
  },
  { href: '/trainer/knowledge-zone', icon: BookOpen, label: 'Strefa Wiedzy' },
  { href: '/trainer/map', icon: Map, label: 'Mapa Siłowni' },
]

// Grouped like the catalogue in lib/admin/resources. Resources without a dedicated
// screen open in the generic data view (/admin/data/<resource>).
const adminNavItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    label: 'Użytkownicy',
    icon: Users,
    items: [
      { href: '/admin/users', label: 'Konta' },
      { href: '/admin/data/trainerRequests', label: 'Prośby do trenerów' },
      { href: '/admin/data/conversations', label: 'Rozmowy' },
      { href: '/admin/data/weeklyCheckIns', label: 'Raporty tygodniowe' },
      { href: '/admin/data/trainingSessions', label: 'Sesje z trenerem' },
      { href: '/admin/notifications', label: 'Powiadomienia' },
    ],
  },
  {
    label: 'Trening',
    icon: Dumbbell,
    items: [
      { href: '/admin/exercises', label: 'Ćwiczenia' },
      { href: '/admin/data/muscleGroups', label: 'Grupy mięśniowe' },
      { href: '/admin/workouts', label: 'Treningi' },
      { href: '/admin/workout-plans', label: 'Plany treningowe' },
      { href: '/admin/workout-logs', label: 'Dziennik treningów' },
      { href: '/admin/data/personalRecords', label: 'Rekordy życiowe' },
      { href: '/admin/gyms', label: 'Siłownie' },
    ],
  },
  {
    label: 'Bieganie',
    icon: Footprints,
    items: [
      { href: '/admin/running-programs', label: 'Programy biegowe' },
      { href: '/admin/data/runningSessions', label: 'Biegi' },
      { href: '/admin/data/challenges', label: 'Wyzwania' },
    ],
  },
  {
    label: 'Żywienie',
    icon: Salad,
    items: [
      { href: '/admin/diet-plans', label: 'Plany dietetyczne' },
      { href: '/admin/meals', label: 'Gotowe posiłki' },
      { href: '/admin/data/customProducts', label: 'Produkty' },
      { href: '/admin/data/foodDiaryEntries', label: 'Dziennik jedzenia' },
      { href: '/admin/data/nutritionGoals', label: 'Cele żywieniowe' },
    ],
  },
  {
    label: 'Postępy',
    icon: TrendingUp,
    items: [
      { href: '/admin/data/goals', label: 'Cele' },
      { href: '/admin/data/habits', label: 'Nawyki' },
      { href: '/admin/data/bodyMeasurements', label: 'Pomiary ciała' },
      { href: '/admin/data/achievements', label: 'Osiągnięcia' },
    ],
  },
  {
    label: 'Treści',
    icon: BookMarked,
    items: [
      { href: '/admin/articles', label: 'Artykuły' },
      { href: '/admin/categories', label: 'Kategorie artykułów' },
      { href: '/admin/data/surveys', label: 'Ankiety' },
      { href: '/admin/data/socialPosts', label: 'Posty społeczności' },
      { href: '/admin/data/socialProfiles', label: 'Profile społecznościowe' },
    ],
  },
  {
    label: 'Grywalizacja',
    icon: Trophy,
    items: [
      { href: '/admin/badges', label: 'Odznaki' },
      { href: '/admin/data/rewards', label: 'Nagrody' },
      { href: '/admin/data/gamificationProfiles', label: 'Profile i punkty' },
      { href: '/admin/data/pets', label: 'Pupile' },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { href: '/admin/ads', label: 'Reklamy' },
      { href: '/admin/home-content', label: 'Ekran główny' },
    ],
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      { href: '/admin/data', label: 'Wszystkie dane' },
      { href: '/admin/data/auditLogs', label: 'Dziennik zmian' },
      { href: '/admin/settings', label: 'Ustawienia' },
    ],
  },
]

/** Where an impersonating admin's way back is kept: survives reloads, ends with the tab. */
const ADMIN_RESTORE_KEY = 'kluska:admin-restore';

interface AdminRestore {
  id: string;
  email: string;
  name: string;
  /** Signed by /api/auth/impersonate; signs the admin back in. */
  token: string;
}

function readAdminRestore(): AdminRestore | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(ADMIN_RESTORE_KEY) ?? 'null');
    return stored && typeof stored.token === 'string' ? stored : null;
  } catch {
    return null;
  }
}

function writeAdminRestore(value: AdminRestore | null) {
  try {
    if (value) sessionStorage.setItem(ADMIN_RESTORE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(ADMIN_RESTORE_KEY);
  } catch {
    // Storage unavailable: the way back lasts until the page is reloaded.
  }
}

export function AppNav() {
  const pathname = usePathname();
  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');
  const { user } = useUser();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { toast } = useToast();
  const [isImpersonationDialogOpen, setIsImpersonationDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [adminSession, setAdminSession] = useState<AdminRestore | null>(null);

  // Read after mount (sessionStorage does not exist during server rendering).
  useEffect(() => {
    setAdminSession(readAdminRestore());
  }, []);

  // Use user profile from context (shared with layout)
  const { userProfile } = useUserProfile();

  // Fetch all users for impersonation
  const { data: allUsers } = useCollection<any>(
    userProfile?.role === 'admin' ? 'users' : null
  );

  const totalUnreadCount = useUnreadChatCount();

  // Unanswered collaboration inquiries from athletes (trainers only).
  const { data: pendingInquiries } = useCollection<{ id: string }>(
    userProfile?.role === 'trainer' && user ? 'trainerRequests' : null,
    { trainerId: user?.uid, status: 'pending' }
  );
  const pendingInquiryCount = pendingInquiries?.length ?? 0;

  const handleLogout = async () => {
    writeAdminRestore(null);
    await signOut();
    router.push('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const handleImpersonate = async (targetUserId: string) => {
    try {
      setIsImpersonating(true);

      // The server checks that the caller is an admin and answers with signed tokens.
      const response = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!response.ok) {
        throw new Error('Impersonation failed');
      }
      const grant: { token: string; restoreToken: string } = await response.json();

      const signInResult = await signIn('credentials', {
        impersonationToken: grant.token,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      // Remember the way back only once the switch has actually happened.
      if (userProfile && user) {
        const restore = { id: user.uid, email: userProfile.email, name: userProfile.name, token: grant.restoreToken };
        writeAdminRestore(restore);
        setAdminSession(restore);
      }

      toast({
        title: 'Sukces!',
        description: 'Zalogowano jako wybrany użytkownik.',
      });

      setIsImpersonationDialogOpen(false);
      setSearchQuery('');

      // Refresh the page to update the session
      router.refresh();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zalogować jako wybrany użytkownik.',
        variant: 'destructive',
      });
    } finally {
      setIsImpersonating(false);
    }
  };

  const handleRestoreAdmin = async () => {
    try {
      setIsImpersonating(true);

      if (!adminSession?.token) {
        throw new Error('No admin session to restore');
      }

      const signInResult = await signIn('credentials', {
        impersonationToken: adminSession.token,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      toast({
        title: 'Sukces!',
        description: 'Powrócono do konta administratora.',
      });

      writeAdminRestore(null);
      setAdminSession(null);
      router.refresh();
    } catch (error) {
      // An expired way back cannot be retried: drop it so the button does not linger.
      writeAdminRestore(null);
      setAdminSession(null);
      toast({
        title: 'Błąd',
        description: 'Nie udało się powrócić do konta administratora. Zaloguj się ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsImpersonating(false);
    }
  };

  const filteredUsers = allUsers?.filter((u: any) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const isTrainer = userProfile?.role === 'trainer';
  const isAdmin = userProfile?.role === 'admin';

  const itemsToRender = isAdmin ? adminNavItems : isTrainer ? trainerNavItems : athleteNavItems;

  const profileHref = isAdmin ? '/admin/profile' : isTrainer ? '/trainer/profile' : '/athlete/profile';

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <span className="font-headline text-xl">Leniwa Kluska</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {itemsToRender.map((item: any) => (
            item.items ? (
              <Collapsible key={item.label} asChild defaultOpen={item.items.some((subItem: any) => pathname.startsWith(subItem.href))} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.label}>
                      <item.icon />
                      <span>{item.label}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem: any) => (
                        <SidebarMenuSubItem key={subItem.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === subItem.href || (subItem.href !== '/admin/data' && pathname.startsWith(`${subItem.href}/`))}>
                            <Link href={subItem.href}>
                              <span>{subItem.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href) && (item.href !== '/athlete/dashboard' && item.href !== '/trainer/dashboard' && item.href !== '/admin/dashboard' || pathname === item.href)}
                  tooltip={{ children: item.label }}
                  onClick={() => setOpenMobile(false)}
                >
                  <Link href={item.href} className="relative">
                    <item.icon />
                    <span>{item.label}</span>
                    {item.href.endsWith('/chat') && totalUnreadCount > 0 && (
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-[1.25rem] justify-center px-1.5 group-data-[state=collapsed]:right-auto group-data-[state=collapsed]:left-1/2 group-data-[state=collapsed]:-top-1">
                        {totalUnreadCount}
                      </Badge>
                    )}
                    {item.href === '/trainer/inquiries' && pendingInquiryCount > 0 && (
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-[1.25rem] justify-center px-1.5 group-data-[state=collapsed]:right-auto group-data-[state=collapsed]:left-1/2 group-data-[state=collapsed]:-top-1">
                        {pendingInquiryCount}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="space-y-2">
        <SidebarMenu>
          {adminSession && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{ children: 'Powrót do konta admina' }} onClick={handleRestoreAdmin} disabled={isImpersonating}>
                <ArrowLeft />
                <span>Powrót do admina</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {isAdmin && !adminSession && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip={{ children: 'Zaloguj się jako inny użytkownik' }} onClick={() => setIsImpersonationDialogOpen(true)}>
                <Users />
                <span>Zaloguj się jako...</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: 'Wyloguj' }} onClick={handleLogout}>
              <button>
                <LogOut />
                <span>Wyloguj</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Link href={profileHref} className="flex items-center gap-3 p-2 transition-all duration-100 ease-out active:scale-[0.97] rounded-lg">
          <Avatar className="h-10 w-10">
            {userProfile?.avatarUrl ? (
              <AvatarImage src={userProfile.avatarUrl} alt="Awatar użytkownika" />
            ) : avatarImage ? (
              <AvatarImage src={avatarImage.imageUrl} alt="Awatar użytkownika" />
            ) : null}
            <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{userProfile?.name || 'Użytkownik'}</span>
            <span className="text-xs text-muted-foreground capitalize">{userProfile?.role || '...'}</span>
          </div>
        </Link>
      </SidebarFooter>

      <Dialog open={isImpersonationDialogOpen} onOpenChange={setIsImpersonationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zaloguj się jako użytkownik</DialogTitle>
            <DialogDescription>
              Wyszukaj i wybierz użytkownika, na którego konto chcesz się zalogować.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Wyszukaj po nazwie lub emailu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isImpersonating}
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u: any) => (
                  <Button
                    key={u.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleImpersonate(u.id)}
                    disabled={isImpersonating || u.id === user?.uid}
                  >
                    {isImpersonating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </Button>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Brak użytkowników spełniających kryteria wyszukiwania.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
