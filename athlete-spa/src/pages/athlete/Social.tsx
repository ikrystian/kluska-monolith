'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUser, useCollection } from '@/lib/db-hooks';
import { useFriends } from '@/lib/friends';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialWall } from '@/components/social/SocialWall';
import { NicknameSetup } from '@/components/social/NicknameSetup';
import { FriendsWall } from '@/components/social/FriendsWall';
import { NearbyAthletes } from '@/components/social/NearbyAthletes';
import { PublicProfileDialog } from '@/components/social/PublicProfileDialog';

const SOCIAL_TABS = ['wall', 'friends', 'nearby'] as const;
type SocialTab = (typeof SOCIAL_TABS)[number];

function isSocialTab(value: string | null): value is SocialTab {
  return SOCIAL_TABS.includes(value as SocialTab);
}

interface SocialProfile {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function AthleteSocialPage() {
  const { user, isUserLoading } = useUser();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: SocialTab = isSocialTab(tabParam) ? tabParam : 'wall';
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { data: friendsData } = useFriends(Boolean(user?.uid));
  const incomingCount = friendsData?.incoming.length ?? 0;

  const setActiveTab = (tab: string) => {
    if (!isSocialTab(tab)) return;
    setSearchParams(tab === 'wall' ? {} : { tab }, { replace: true });
  };

  // Fetch user's social profile
  const { data: profiles, isLoading: isProfileLoading, refetch } = useCollection<SocialProfile>(
    user?.uid ? 'socialProfiles' : null,
    user?.uid ? { userId: user.uid } : undefined
  );

  useEffect(() => {
    if (!isProfileLoading && profiles !== null) {
      setHasProfile(profiles.length > 0);
    }
  }, [profiles, isProfileLoading]);

  const handleProfileCreated = () => {
    setHasProfile(true);
    refetch();
  };

  // Loading state
  if (isUserLoading || isProfileLoading || hasProfile === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Show nickname setup if user doesn't have a profile
  if (!hasProfile) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <NicknameSetup onComplete={handleProfileCreated} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 grid w-full grid-cols-3 md:w-auto md:min-w-[26rem]">
          <TabsTrigger value="wall">Tablica</TabsTrigger>
          <TabsTrigger value="friends" className="gap-1.5">
            Znajomi
            {incomingCount > 0 && (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground"
                aria-label={`Nowe zaproszenia: ${incomingCount}`}
              >
                {incomingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="nearby">W okolicy</TabsTrigger>
        </TabsList>

        <TabsContent value="wall">
          <SocialWall />
        </TabsContent>
        <TabsContent value="friends">
          <FriendsWall onProfileClick={setProfileUserId} onFindFriends={() => setActiveTab('nearby')} />
        </TabsContent>
        <TabsContent value="nearby">
          <NearbyAthletes onProfileClick={setProfileUserId} />
        </TabsContent>
      </Tabs>

      <PublicProfileDialog
        open={profileUserId !== null}
        onOpenChange={open => !open && setProfileUserId(null)}
        userId={profileUserId}
      />
    </div>
  );
}