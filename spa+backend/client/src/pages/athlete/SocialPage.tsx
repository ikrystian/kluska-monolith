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

export default function SocialPage() {
    const { user, isUserLoading } = useUser();
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    // Fetch user's social profile
    const { data: profiles, isLoading: isProfileLoading, refetch } = useCollection<SocialProfile>(
        user?.uid ? 'socialProfiles' : null,
        user?.uid ? { userId: user.uid } : undefined
    );

    // Track when initial load completes
    useEffect(() => {
        // Only set complete when we have a user AND profiles has been fetched (even if empty)
        if (user?.uid && !isProfileLoading && profiles !== null) {
            setInitialLoadComplete(true);
        }
    }, [user?.uid, isProfileLoading, profiles]);

    const hasProfile = profiles !== null && profiles.length > 0;

    const handleProfileCreated = () => {
        refetch();
    };

    // Loading state - wait for user AND initial profile fetch
    if (isUserLoading || !user?.uid || !initialLoadComplete) {
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
