'use client';

import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useUser, useDoc } from '@/lib/db-hooks';
import { UserProfile } from '@/lib/types';

export default function OnboardingPage() {
  const { user } = useUser();
  const { data: userProfile } = useDoc<UserProfile>(
    user ? 'users' : null,
    user?.uid || null
  );

  // Get the initial name from the user profile
  const initialName = userProfile?.name || '';

  return <OnboardingWizard initialName={initialName} />;
}