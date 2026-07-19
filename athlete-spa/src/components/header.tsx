import { Link } from 'react-router-dom';
import { SidebarTrigger } from './ui/sidebar';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { NotificationBell } from './notifications/NotificationBell';
import { QuickChatWidget } from './chat/QuickChatWidget';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { placeholderImages } from '@/lib/placeholder-images';

function getInitials(name: string | null | undefined) {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function AppHeader() {
  const { userProfile } = useUserProfile();
  const avatarImage = placeholderImages.find(img => img.id === 'avatar-male');
  const firstName = userProfile?.name?.split(' ')[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/50 bg-background/70 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-2xl md:h-14 md:px-6">
      {/* Mobile: avatar goes to the profile, greeting anchors the screen */}
      <Link
        to="/athlete/profile"
        aria-label="Przejdź do profilu"
        className="pressable flex min-w-0 items-center gap-3 text-left transition-opacity active:opacity-70 md:hidden"
      >
        <span className="relative shrink-0">
          <Avatar className="h-10 w-10 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
            {userProfile?.avatarUrl ? (
              <AvatarImage src={userProfile.avatarUrl} alt="Awatar użytkownika" />
            ) : avatarImage ? (
              <AvatarImage src={avatarImage.imageUrl} alt="Awatar użytkownika" />
            ) : null}
            <AvatarFallback>{getInitials(userProfile?.name)}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-volt ring-2 ring-background" />
        </span>
        <span className="flex min-w-0 flex-col">
          #leniwakluska
        </span>
      </Link>

      {/* Desktop: classic sidebar trigger */}
      <SidebarTrigger className="hidden text-muted-foreground hover:text-foreground md:flex" />

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <QuickChatWidget />
      </div>
    </header>
  );
}
