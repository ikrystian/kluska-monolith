'use client';

import {
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  User,
  PlusSquare,
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
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { useDoc, useUser, signOut } from '@/firebase';
import { Badge } from '@/components/ui/badge';

const athleteNavItems = [
  { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Panel Sportowca' },
  { href: '/athlete/log', icon: PlusSquare, label: 'Zapisz Trening' },
  { href: '/athlete/calendar', icon: CalendarDays, label: 'Kalendarz' },
  { href: '/athlete/chat', icon: MessageSquare, label: 'Czat' },
  { href: '/athlete/templates', icon: Library, label: 'Plany Treningowe' },
  { href: '/athlete/exercises', icon: Dumbbell, label: 'Ćwiczenia' },
  { href: '/athlete/running', icon: Footprints, label: 'Bieganie' },
  { href: '/athlete/diet', icon: Salad, label: 'Dieta' },
  { href: '/athlete/measurements', icon: Ruler, label: 'Pomiary' },
  { href: '/athlete/history', icon: History, label: 'Historia' },
  { href: '/athlete/goals', icon: Trophy, label: 'Cele i Trofea' },
  { href: '/athlete/knowledge-zone', icon: BookOpen, label: 'Strefa Wiedzy' },
  { href: '/athlete/map', icon: Map, label: 'Mapa' },
];

const trainerNavItems = [
    { href: '/trainer/dashboard', icon: LayoutDashboard, label: 'Panel Trenera' },
    { href: '/trainer/my-athletes', icon: Users, label: 'Moi Sportowcy' },
    { href: '/trainer/chat', icon: MessageSquare, label: 'Czat' },
    { href: '/trainer/templates', icon: Library, label: 'Plany Treningowe' },
    { href: '/trainer/exercises', icon: Dumbbell, label: 'Ćwiczenia' },
    { href: '/trainer/diet', icon: Salad, label: 'Diety' },
    { href: '/trainer/knowledge-zone', icon: BookOpen, label: 'Strefa Wiedzy' },
    { href: '/trainer/map', icon: Map, label: 'Mapa Siłowni' },
]

const adminNavItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/users', icon: Users, label: 'Użytkownicy' },
    { href: '/admin/exercises', icon: Dumbbell, label: 'Wszystkie Ćwiczenia' },
    { href: '/admin/workout-plans', icon: ClipboardList, label: 'Wszystkie Plany' },
    { href: '/admin/articles', icon: BookMarked, label: 'Wszystkie Artykuły' },
    { href: '/admin/muscle-groups', icon: RectangleEllipsis, label: 'Grupy Mięśniowe' },
    { href: '/admin/gyms', icon: Building2, label: 'Siłownie' },
]

export function AppNav() {
  const pathname = usePathname();
  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');
  const { user } = useUser();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  // Fetch user profile using MongoDB hooks
  const { data: userProfile } = useDoc(
    user ? 'users' : null,
    user?.uid || null
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

  const isTrainer = userProfile?.role === 'trainer';
  const isAdmin = userProfile?.role === 'admin';

  const itemsToRender = isAdmin ? adminNavItems : isTrainer ? trainerNavItems : athleteNavItems;

  const profileHref = isAdmin ? '/admin/profile' : isTrainer ? '/trainer/profile' : '/athlete/profile';

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <Dumbbell className="h-6 w-6" />
          <span className="font-headline text-xl">GymProgress</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {itemsToRender.map((item) => (
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
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="space-y-2">
         <SidebarMenu>
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
         <div className="flex items-center gap-3 p-2">
            <Avatar className="h-10 w-10">
              {avatarImage && <AvatarImage src={avatarImage.imageUrl} alt="Awatar użytkownika" />}
              <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="font-semibold text-sm">{userProfile?.name || 'Użytkownik'}</span>
                <span className="text-xs text-muted-foreground capitalize">{userProfile?.role || '...'}</span>
            </div>
         </div>
      </SidebarFooter>
    </Sidebar>
  );
}
