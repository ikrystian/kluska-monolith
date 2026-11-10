import { lazy, Suspense, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Settings, UserRound } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buttonVariants } from '@/components/ui/button';
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
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTab } from '@/components/profile/ProfileTab';
import { SettingsTab } from '@/components/profile/SettingsTab';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { resolveMediaUrl } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { TourAnchor } from '@/components/tour/TourAnchor';

// Editors (react-image-crop, zod form, gyms list) only load when the athlete opens them.
const AvatarUploadDialog = lazy(() =>
  import('@/components/profile/AvatarUploadDialog').then(m => ({ default: m.AvatarUploadDialog }))
);
const ProfileEditSheet = lazy(() =>
  import('@/components/profile/ProfileEditSheet').then(m => ({ default: m.ProfileEditSheet }))
);
const FavoriteGymsSheet = lazy(() =>
  import('@/components/profile/FavoriteGymsSheet').then(m => ({ default: m.FavoriteGymsSheet }))
);

const YOU_TABS = ['profile', 'settings'] as const;
type YouTab = (typeof YOU_TABS)[number];
const DEFAULT_TAB: YouTab = 'profile';

function isYouTab(value: string | null): value is YouTab {
  return YOU_TABS.includes(value as YouTab);
}

/**
 * The "Ty" tab: who you are on top, then your profile and the app's settings,
 * one tap apart. The tab
 * lives in the URL (`?tab=settings`), so search hits and old profile links
 * land on the right one.
 */
export default function YouPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { updateDoc } = useUpdateDoc();
  const { userProfile, refetch } = useUserProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: YouTab = isYouTab(tabParam) ? tabParam : DEFAULT_TAB;

  const [openPanel, setOpenPanel] = useState<'avatar' | 'edit' | 'gyms' | null>(null);
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);
  const closePanel = (open: boolean) => !open && setOpenPanel(null);

  const setActiveTab = (tab: string) => {
    if (!isYouTab(tab)) return;
    haptic('tap');
    setSearchParams(tab === DEFAULT_TAB ? {} : { tab }, { replace: true });
  };

  const handleProfileSaved = () => {
    void refetch();
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user || !userProfile) return;
    try {
      await updateDoc('users', user.uid, { ...userProfile, avatarUrl: url });
      handleProfileSaved();
    } catch {
      toast({ title: 'Błąd!', description: 'Nie udało się zapisać avatara.', variant: 'destructive' });
    }
  };

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogout = () => {
    haptic('impact');
    if (user?.isGuest) {
      setGuestLogoutOpen(true);
      return;
    }
    doLogout();
  };

  return (
    <div className="page">
      <TourAnchor name="you-hero">
        <ProfileHero onEditProfile={() => setOpenPanel('edit')} onEditAvatar={() => setOpenPanel('avatar')} />
      </TourAnchor>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5">
        <TabsList data-tour="you-tabs" className="grid h-11 w-full grid-cols-2 rounded-full p-1">
          <TabsTrigger value="profile" className="h-full gap-1.5 rounded-full">
            <UserRound className="h-4 w-4" /> Profil
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-full gap-1.5 rounded-full">
            <Settings className="h-4 w-4" /> Ustawienia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <ProfileTab
            onEditProfile={() => setOpenPanel('edit')}
            onEditAvatar={() => setOpenPanel('avatar')}
            onEditGyms={() => setOpenPanel('gyms')}
          />
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <SettingsTab onLogout={handleLogout} />
        </TabsContent>
      </Tabs>

      <Suspense fallback={null}>
        {openPanel === 'avatar' && (
          <AvatarUploadDialog
            open
            onOpenChange={closePanel}
            onUploadComplete={handleAvatarUpload}
            currentAvatarUrl={resolveMediaUrl(userProfile?.avatarUrl)}
          />
        )}
        {openPanel === 'edit' && userProfile && (
          <ProfileEditSheet open onOpenChange={closePanel} userProfile={userProfile} onSaved={handleProfileSaved} />
        )}
        {openPanel === 'gyms' && userProfile && (
          <FavoriteGymsSheet open onOpenChange={closePanel} userProfile={userProfile} onSaved={handleProfileSaved} />
        )}
      </Suspense>

      <AlertDialog open={guestLogoutOpen} onOpenChange={setGuestLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wylogować konto gościa?</AlertDialogTitle>
            <AlertDialogDescription>
              Twoje dane są przypisane do tego urządzenia. Po wylogowaniu stracisz do nich dostęp. Załóż konto, aby je zachować.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={doLogout} className={buttonVariants({ variant: 'destructive' })}>
              Rozumiem, wyloguj mnie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
