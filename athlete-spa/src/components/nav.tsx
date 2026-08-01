import { ChevronRight, Dumbbell, LogOut, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { useLocation, useNavigate, Link } from 'react-router-dom';
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
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { athleteNavItems, isNavGroup } from '@/lib/athlete-nav';

export function AppNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');
  const { setOpenMobile } = useSidebar();
  const { userProfile } = useUserProfile();
  const { user, logout } = useAuth();
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);

  // Conversations/unread counts aren't wired up yet (matches the web app).
  const totalUnreadCount = 0;

  const handleLogout = () => {
    if (user?.isGuest) {
      setGuestLogoutOpen(true);
      return;
    }
    logout();
    navigate('/login');
  };

  const confirmGuestLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          to="/athlete/dashboard"
          className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent/60 group-data-[state=collapsed]:justify-center"
        >
          <span className="hero-ember flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-glow">
            <Dumbbell className="h-5 w-5 text-white" />
          </span>
          <span className="font-display text-[11px] font-bold uppercase leading-[1.3] tracking-[0.22em] group-data-[state=collapsed]:hidden">
            Leniwa<br />Kluska
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {athleteNavItems.map((item) => (
            isNavGroup(item) ? (
              <Collapsible key={item.label} asChild defaultOpen={item.items.some((subItem) => pathname.startsWith(subItem.href))} className="group/collapsible">
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
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.href}>
                          <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                            <Link to={subItem.href} onClick={() => setOpenMobile(false)}>
                              <subItem.icon />
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
                  isActive={pathname.startsWith(item.href) && (item.href !== '/athlete/dashboard' || pathname === item.href)}
                  tooltip={{ children: item.label }}
                  onClick={() => setOpenMobile(false)}
                >
                  <Link to={item.href} className="relative">
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
      <SidebarFooter>
        <div className="flex items-center gap-1 group-data-[state=collapsed]:flex-col">
          <Link
            to="/athlete/profile"
            onClick={() => setOpenMobile(false)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 transition-all duration-100 ease-out active:scale-[0.97] hover:bg-accent/60 group-data-[state=collapsed]:flex-none group-data-[state=collapsed]:p-1"
          >
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              {userProfile?.avatarUrl ? (
                <AvatarImage src={resolveMediaUrl(userProfile.avatarUrl)} alt="Awatar użytkownika" />
              ) : avatarImage ? (
                <AvatarImage src={avatarImage.imageUrl} alt="Awatar użytkownika" />
              ) : null}
              <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col group-data-[state=collapsed]:hidden">
              <span className="truncate text-sm font-semibold">{userProfile?.name || 'Użytkownik'}</span>
              <span className="text-xs text-muted-foreground">Zobacz profil</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title="Wyloguj"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-all duration-100 ease-out active:scale-90 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Wyloguj</span>
          </button>
        </div>
      </SidebarFooter>

      <AlertDialog open={guestLogoutOpen} onOpenChange={setGuestLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive" />
              Utrata danych lokalnych
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1">
              <span className="block">
                Korzystasz z aplikacji jako <strong>gość</strong> — Twoje dane są przechowywane
                wyłącznie lokalnie na tym urządzeniu.
              </span>
              <span className="block">
                Po wylogowaniu <strong>wszystkie Twoje dane zostaną trwale usunięte</strong> i nie
                będzie możliwości ich przywrócenia.
              </span>
              <span className="block">
                Aby zachować swoje postępy, załóż konto przed wylogowaniem.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmGuestLogout}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Rozumiem, wyloguj mnie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
