'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const { userProfile, isLoading } = useUserProfile();
  const router = useRouter();

  // Redirect to dashboard if onboarding is already completed
  useEffect(() => {
    if (!isLoading && userProfile?.onboardingCompleted) {
      router.push('/athlete/dashboard');
    }
  }, [isLoading, userProfile?.onboardingCompleted, router]);

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // If onboarding is completed, don't render the wizard (redirect will happen)
  if (userProfile?.onboardingCompleted) {
    return null;
  }

  // Get the initial name from the user profile
  const initialName = userProfile?.name || '';

  return <OnboardingWizard initialName={initialName} />;
}