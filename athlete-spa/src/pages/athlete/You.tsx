import { lazy, Suspense, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { ProfileTab } from '@/components/profile/ProfileTab';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useUpdateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { resolveMediaUrl } from '@/lib/api-client';
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

/**
 * The "Ty" view: who you are on top, lifetime totals, and your profile details.
 * Settings are in their own dedicated view at `/athlete/settings`.
 */
export default function YouPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const { updateDoc } = useUpdateDoc();
  const { userProfile, refetch } = useUserProfile();
  const [searchParams] = useSearchParams();

  // Backward-compatibility: if an old link hits `?tab=settings`, redirect to the dedicated view.
  if (searchParams.get('tab') === 'settings') {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('tab');
    const searchString = nextParams.toString();
    return <Navigate to={{ pathname: '/athlete/settings', search: searchString ? `?${searchString}` : '' }} replace />;
  }

  const [openPanel, setOpenPanel] = useState<'avatar' | 'edit' | 'gyms' | null>(null);
  const closePanel = (open: boolean) => !open && setOpenPanel(null);

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

  return (
    <div className="page space-y-5">
      <TourAnchor name="you-hero">
        <ProfileHero onEditProfile={() => setOpenPanel('edit')} onEditAvatar={() => setOpenPanel('avatar')} />
      </TourAnchor>

      <ProfileTab
        onEditProfile={() => setOpenPanel('edit')}
        onEditAvatar={() => setOpenPanel('avatar')}
        onEditGyms={() => setOpenPanel('gyms')}
      />

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
    </div>
  );
}
