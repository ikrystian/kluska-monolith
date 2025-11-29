'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useUser, useCollection } from '@/lib/db-hooks';
import { SocialWall } from '@/components/social/SocialWall';
import { NicknameSetup } from '@/components/social/NicknameSetup';

interface SocialProfile {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function TrainerSocialPage() {
  const { user, isUserLoading } = useUser();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

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

  // Show social wall
  return (
    <div className="container mx-auto p-4 md:p-8">
      <SocialWall />
    </div>
  );
}