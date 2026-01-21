'use client';

import { Link, useLocation } from 'react-router-dom';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth, useSession } from '@/lib/next-auth-react';
import {
    Home,
    Dumbbell,
    Calendar,
    Target,
    Trophy,
    History,
    MessageSquare,
    User,
    Users,
    Database,
    Settings,
    LogOut,
    Map,
    BookOpen,
    Activity,
    Heart,
} from 'lucide-react';

type SidebarVariant = 'athlete' | 'trainer' | 'admin';

interface AppSidebarProps {
    variant: SidebarVariant;
}

const athleteNavItems = [
    { title: 'Dashboard', href: '/athlete/dashboard', icon: Home },
    { title: 'Moje Treningi', href: '/athlete/workouts', icon: Dumbbell },
    { title: 'Plany Treningowe', href: '/athlete/workout-plans', icon: BookOpen },
    { title: 'Loguj Trening', href: '/athlete/log', icon: Activity },
    { title: 'Historia', href: '/athlete/history', icon: History },
    { title: 'Kalendarz', href: '/athlete/calendar', icon: Calendar },
    { title: 'Cele', href: '/athlete/goals', icon: Target },
    { title: 'Nawyki', href: '/athlete/habits', icon: Heart },
    { title: 'Odznaki', href: '/athlete/gamification', icon: Trophy },
    { title: 'Pomiary', href: '/athlete/measurements', icon: User },
    { title: 'Bieganie', href: '/athlete/running', icon: Activity },
    { title: 'Społeczność', href: '/athlete/social', icon: Users },
    { title: 'Chat', href: '/athlete/chat', icon: MessageSquare },
    { title: 'Mapa', href: '/athlete/map', icon: Map },
    { title: 'Profil', href: '/athlete/profile', icon: User },
];

const trainerNavItems = [
    { title: 'Dashboard', href: '/trainer/dashboard', icon: Home },
    { title: 'Podopieczni', href: '/trainer/athletes', icon: Users },
    { title: 'Ćwiczenia', href: '/trainer/exercises', icon: Dumbbell },
    { title: 'Plany Treningowe', href: '/trainer/plans', icon: BookOpen },
    { title: 'Pojedyncze Treningi', href: '/trainer/workouts', icon: Activity },
    { title: 'Dieta', href: '/trainer/diet', icon: Heart },
    { title: 'Kalendarz', href: '/trainer/schedule', icon: Calendar },
    { title: 'Wiadomości', href: '/trainer/messages', icon: MessageSquare },
    { title: 'Profil', href: '/trainer/profile', icon: User },
];

const adminNavItems = [
    { title: 'Dashboard', href: '/admin/dashboard', icon: Home },
    { title: 'Użytkownicy', href: '/admin/users', icon: Users },
    { title: 'Ćwiczenia', href: '/admin/exercises', icon: Dumbbell },
    { title: 'Plany Treningowe', href: '/admin/plans', icon: BookOpen },
    { title: 'Pojedyncze Treningi', href: '/admin/workouts', icon: Activity },
    { title: 'Grupy Mięśniowe', href: '/admin/muscle-groups', icon: Activity },
    { title: 'Siłownie', href: '/admin/gyms', icon: Database },
    { title: 'Ustawienia', href: '/admin/settings', icon: Settings },
];

export function AppSidebar({ variant }: AppSidebarProps) {
    const location = useLocation();
    const { data: session } = useSession();
    const auth = useAuth();

    const navItems =
        variant === 'athlete'
            ? athleteNavItems
            : variant === 'trainer'
                ? trainerNavItems
                : adminNavItems;

    const title =
        variant === 'athlete'
            ? 'Panel Sportowca'
            : variant === 'trainer'
                ? 'Panel Trenera'
                : 'Panel Admina';

    return (
        <Sidebar>
            <SidebarHeader className="border-b p-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <Dumbbell className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg">GymProgress</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{title}</p>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Nawigacja</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild isActive={location.pathname === item.href}>
                                        <Link to={item.href}>
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-sm">
                        <p className="font-medium truncate">{session?.user?.name || 'Użytkownik'}</p>
                        <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                    </div>
                </div>
                <Button variant="ghost" className="w-full justify-start" onClick={() => auth.signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Wyloguj się
                </Button>
            </SidebarFooter>
        </Sidebar>
    );
}
