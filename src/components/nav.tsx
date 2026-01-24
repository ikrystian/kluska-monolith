'use client';

import {
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  User,
  Play,
  Library,
  Users,
  RectangleEllipsis,
  Trophy,
  Footprints,
  Salad,
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
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
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
  { href: '/trainer/command-center', icon: Gauge, label: 'Centrum Dowodzenia' },
  { href: '/trainer/my-athletes', icon: Users, label: 'Moi Sportowcy' },
  { href: '/trainer/surveys', icon: ClipboardList, label: 'Ankiety' },
  { href: '/trainer/schedule', icon: CalendarDays, label: 'Harmonogram' },
  { href: '/trainer/chat', icon: MessageSquare, label: 'Czat' },
  { href: '/trainer/social', icon: Users2, label: 'Social' },
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

const adminNavItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Użytkownicy' },
  { href: '/admin/exercises', icon: Dumbbell, label: 'Wszystkie Ćwiczenia' },
  { href: '/admin/workout-plans', icon: ClipboardList, label: 'Wszystkie Plany' },
  { href: '/admin/workouts', icon: Dumbbell, label: 'Wszystkie Treningi' },
  { href: '/admin/articles', icon: BookMarked, label: 'Wszystkie Artykuły' },
  { href: '/admin/gyms', icon: Building2, label: 'Siłownie' },
]

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
  const [adminSession, setAdminSession] = useState<{ id: string; email: string; name: string } | null>(null);

  // Use user profile from context (shared with layout)
  const { userProfile } = useUserProfile();

  // Fetch all users for impersonation
  const { data: allUsers } = useCollection<any>(
    userProfile?.role === 'admin' ? 'users' : null
  );

  // For now, conversations are not implemented in MongoDB
  // This will need to be updated when conversations are migrated
  const totalUnreadCount = 0;

  const handleLogout = async () => {
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

      // Store current admin session
      if (userProfile && user) {
        setAdminSession({
          id: user.uid,
          email: userProfile.email,
          name: userProfile.name,
        });
      }

      // Call impersonation API to verify permissions
      const response = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!response.ok) {
        throw new Error('Impersonation failed');
      }

      // Use NextAuth signIn with impersonateUserId
      const signInResult = await signIn('credentials', {
        impersonateUserId: targetUserId,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
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

      if (!adminSession?.id) {
        throw new Error('No admin session to restore');
      }

      // Use NextAuth signIn to restore admin session
      const signInResult = await signIn('credentials', {
        impersonateUserId: adminSession.id,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error(signInResult.error);
      }

      toast({
        title: 'Sukces!',
        description: 'Powrócono do konta administratora.',
      });

      setAdminSession(null);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się powrócić do konta administratora.',
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
                          <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
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
            <SidebarMenuButton asChild tooltip={{ children: 'Profil' }} isActive={pathname === profileHref} onClick={() => setOpenMobile(false)}>
              <Link href={profileHref}>
                <User />
                <span>Profil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: 'Wyloguj' }} onClick={handleLogout}>
              <button>
                <LogOut />
                <span>Wyloguj</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Link href={'/profile/' + userProfile?.id} className="flex items-center gap-3 p-2">
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
