'use client';

import {
  BarChart,
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  User,
  PlusSquare,
  Library,
  Users,
  Shield,
  RectangleEllipsis,
  Trophy,
  Footprints,
  Salad,
  Handshake,
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
import { useAuth, useDoc, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import type { Conversation } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
  { href: '/log', icon: PlusSquare, label: 'Zapisz Trening' },
  { href: '/calendar', icon: CalendarDays, label: 'Kalendarz' },
  { href: '/chat', icon: MessageSquare, label: 'Czat' },
  { href: '/templates', icon: Library, label: 'Plany Treningowe' },
  { href: '/exercises', icon: Dumbbell, label: 'Ćwiczenia' },
  { href: '/running', icon: Footprints, label: 'Bieganie' },
  { href: '/diet', icon: Salad, label: 'Dieta' },
  { href: '/measurements', icon: Ruler, label: 'Pomiary' },
  { href: '/history', icon: History, label: 'Historia' },
  { href: '/goals', icon: Trophy, label: 'Cele i Trofea' },
  { href: '/knowledge-zone', icon: BookOpen, label: 'Strefa Wiedzy' },
  { href: '/trainers', icon: Handshake, label: 'Trenerzy' },
  { href: '/map', icon: Map, label: 'Mapa' },
];

const trainerNavItems = [
    { href: '/my-athletes', icon: Users, label: 'Moi Sportowcy' },
]

const adminNavItems = [
    { href: '/admin/dashboard', icon: Shield, label: 'Użytkownicy' },
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
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const conversationsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, `users/${user.uid}/conversations`)) : null,
    [user, firestore]
  );
  const { data: conversations } = useCollection<Conversation>(conversationsQuery);
  
  const totalUnreadCount = conversations?.reduce((total, convo) => {
      const unread = convo.unreadCount?.[user?.uid ?? ''] ?? 0;
      return total + unread;
  }, 0) || 0;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const isTrainer = userProfile?.role === 'trainer';
  const isAdmin = userProfile?.role === 'admin';

  const itemsToRender = isAdmin ? adminNavItems : navItems;

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
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                tooltip={{ children: item.label }}
                onClick={() => setOpenMobile(false)}
              >
                <Link href={item.href} className="relative">
                  <item.icon />
                  <span>{item.label}</span>
                  {item.href === '/chat' && totalUnreadCount > 0 && (
                      <Badge className="absolute right-2 top-1/2 -translate-y-1/2 h-5 min-w-[1.25rem] justify-center px-1.5 group-data-[state=collapsed]:right-auto group-data-[state=collapsed]:left-1/2 group-data-[state=collapsed]:-top-1">
                          {totalUnreadCount}
                      </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {isTrainer && trainerNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.label }}
                onClick={() => setOpenMobile(false)}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="space-y-2">
         <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={{ children: 'Profil' }} isActive={pathname === '/profile'} onClick={() => setOpenMobile(false)}>
                 <Link href="/profile">
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
