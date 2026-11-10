'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUser, useCollection } from '@/lib/db-hooks';
import { useFriends } from '@/lib/friends';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NicknameSetup } from '@/components/social/NicknameSetup';
import { FriendsFeed } from '@/components/social/FriendsFeed';
import { DiscoverGrid } from '@/components/social/DiscoverGrid';
import { PeopleTab } from '@/components/social/PeopleTab';

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
  const navigate = useNavigate();
  const openProfile = (userId: string) => navigate(`/athlete/social/profile/${userId}`);

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
      <div className="page">
        <NicknameSetup onComplete={handleProfileCreated} />
      </div>
    );
  }

  return (
    <div className="page">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-tour="social-tabs" className="grid w-full grid-cols-3">
          <TabsTrigger value="feed">Znajomi</TabsTrigger>
          <TabsTrigger value="discover">Odkrywaj</TabsTrigger>
          <TabsTrigger value="people" className="gap-1.5">
            Ludzie
            {incomingCount > 0 && (
              <span
                className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold tabular-nums text-primary-foreground"
                aria-label={`Nowe zaproszenia: ${incomingCount}`}
              >
                {incomingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          <FriendsFeed onProfileClick={openProfile} onOpenPeople={() => setActiveTab('people')} />
        </TabsContent>
        <TabsContent value="discover" className="mt-4">
          <DiscoverGrid onProfileClick={openProfile} />
        </TabsContent>
        <TabsContent value="people" className="mt-4">
          <PeopleTab onProfileClick={openProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
