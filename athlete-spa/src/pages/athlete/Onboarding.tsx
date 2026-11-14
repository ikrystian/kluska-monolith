'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { OnboardingLoader } from '@/components/onboarding/OnboardingBackdrop';

export default function OnboardingPage() {
  const { userProfile, isLoading } = useUserProfile();
  const navigate = useNavigate();

  // Redirect to dashboard if onboarding is already completed
  useEffect(() => {
    if (!isLoading && userProfile?.onboardingCompleted) {
      navigate('/athlete/dashboard');
    }
  }, [isLoading, userProfile?.onboardingCompleted, navigate]);

  // Show loading while checking onboarding status
  if (isLoading) {
    return <OnboardingLoader />;
  }

  // If onboarding is completed, don't render the wizard (redirect will happen)
  if (userProfile?.onboardingCompleted) {
    return null;
  }

  // Get the initial name from the user profile
  const initialName = userProfile?.name || '';

  return <OnboardingWizard initialName={initialName} />;
}