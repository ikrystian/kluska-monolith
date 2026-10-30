import { Dumbbell, LogOut, Play, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { placeholderImages } from '@/lib/placeholder-images';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { resolveMediaUrl } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { isNavGroup, isNavLeafActive, navItemsForRole, type NavLeaf } from '@/lib/athlete-nav';

/** The "start workout" CTA sits above the menu, so the list doesn't repeat it. */
const CTA_HREF = '/athlete/log';

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export function AppNav() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');
  const { setOpenMobile } = useSidebar();
  const { userProfile } = useUserProfile();
  const { user, logout } = useAuth();
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);

  const navItems = useMemo(() => navItemsForRole(userProfile?.role), [userProfile?.role]);
  const topLevelLeaves = navItems.filter((entry): entry is NavLeaf => !isNavGroup(entry));
  const groups = navItems.filter(isNavGroup);

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
      <SidebarHeader className="gap-3">
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

        <SidebarMenu className="p-0 group-data-[state=collapsed]:p-0">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={pathname === CTA_HREF}
              tooltip="Trenuj teraz"
              onClick={() => setOpenMobile(false)}
              className="hero-ember rounded-xl font-bold text-white shadow-glow hover:bg-transparent hover:brightness-110 data-[active=true]:bg-transparent data-[active=true]:text-white"
            >
              <Link to={CTA_HREF}>
                <Play className="fill-current" />
                <span>Trenuj teraz</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="pb-0">
          <SidebarMenu className="gap-0.5 p-0 group-data-[state=collapsed]:p-0">
            {topLevelLeaves.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  onClick={() => setOpenMobile(false)}
                  className="h-9"
                >
                  <Link to={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarSeparator className="mb-1 hidden group-data-[state=collapsed]:block" />
            <SidebarGroupLabel className="gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5 p-0 group-data-[state=collapsed]:p-0">
              {group.items
                .filter((leaf) => leaf.href !== CTA_HREF)
                .map((leaf) => {
                  const isActive = isNavLeafActive(leaf.href, pathname, search);
                  return (
                    <SidebarMenuItem key={leaf.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={leaf.description ? `${leaf.label} — ${leaf.description}` : leaf.label}
                        onClick={() => setOpenMobile(false)}
                        className="relative h-9 data-[active=true]:font-semibold data-[active=true]:text-foreground"
                        style={isActive ? { backgroundColor: tint(group.color, 14) } : undefined}
                      >
                        <Link to={leaf.href} aria-current={isActive ? 'page' : undefined}>
                          {isActive && (
                            <i
                              aria-hidden
                              className="absolute inset-y-1.5 left-0 w-1 rounded-full group-data-[state=collapsed]:hidden"
                              style={{ backgroundColor: group.color }}
                            />
                          )}
                          <leaf.icon style={{ color: group.color }} />
                          <span>{leaf.label}</span>
                          {leaf.href.endsWith('/chat') && totalUnreadCount > 0 && (
                            <Badge className="ml-auto h-5 min-w-[1.25rem] justify-center px-1.5">{totalUnreadCount}</Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
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
