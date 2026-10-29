'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUser, useCollection } from '@/lib/db-hooks';
import { useFriends } from '@/lib/friends';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NicknameSetup } from '@/components/social/NicknameSetup';
import { FriendsFeed } from '@/components/social/FriendsFeed';
import { DiscoverGrid } from '@/components/social/DiscoverGrid';
import { PeopleTab } from '@/components/social/PeopleTab';
import { PublicProfileDialog } from '@/components/social/PublicProfileDialog';

const SOCIAL_TABS = ['feed', 'discover', 'people'] as const;
type SocialTab = (typeof SOCIAL_TABS)[number];
const DEFAULT_TAB: SocialTab = 'feed';

/** Tab ids from before the redesign, still found in bookmarks and push links. */
const LEGACY_TABS: Record<string, SocialTab> = { wall: 'discover', friends: 'feed', nearby: 'people' };

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
  const legacyTab = tabParam ? LEGACY_TABS[tabParam] : undefined;
  const activeTab: SocialTab = isSocialTab(tabParam) ? tabParam : legacyTab ?? DEFAULT_TAB;
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { data: friendsData } = useFriends(Boolean(user?.uid));
  const incomingCount = friendsData?.incoming.length ?? 0;

  const setActiveTab = (tab: string) => {
    if (!isSocialTab(tab)) return;
    setSearchParams(tab === DEFAULT_TAB ? {} : { tab }, { replace: true });
  };

  useEffect(() => {
    if (legacyTab) setSearchParams(legacyTab === DEFAULT_TAB ? {} : { tab: legacyTab }, { replace: true });
  }, [legacyTab, setSearchParams]);

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

  if (!hasProfile) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pb-5 pt-20 md:px-6 md:pt-8">
        <NicknameSetup onComplete={handleProfileCreated} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-5 pt-20 md:px-6 md:pt-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="sticky top-[calc(env(safe-area-inset-top))] z-20 md:top-16 grid h-auto w-full grid-cols-3 gap-1 rounded-full border border-border/60 bg-background/80 p-1 shadow-soft backdrop-blur-md">
          <TabsTrigger value="feed" className="h-9 rounded-full text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-soft">
            Znajomi
          </TabsTrigger>
          <TabsTrigger value="discover" className="h-9 rounded-full text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-soft">
            Odkrywaj
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-1.5 h-9 rounded-full text-sm font-semibold data-[state=active]:bg-card data-[state=active]:shadow-soft">
            Ludzie
            {incomingCount > 0 && (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground"
                aria-label={`Nowe zaproszenia: ${incomingCount}`}
              >
                {incomingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-5">
          <FriendsFeed onProfileClick={setProfileUserId} onOpenPeople={() => setActiveTab('people')} />
        </TabsContent>
        <TabsContent value="discover" className="mt-5">
          <DiscoverGrid onProfileClick={setProfileUserId} />
        </TabsContent>
        <TabsContent value="people" className="mt-5">
          <PeopleTab onProfileClick={setProfileUserId} />
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
