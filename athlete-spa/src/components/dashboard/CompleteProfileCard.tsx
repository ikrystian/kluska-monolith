import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, UserRoundPen } from 'lucide-react';
import { ONBOARDING_PENDING_KEY, ONBOARDING_SKIPPED_KEY } from '@/contexts/AuthContext';
import type { UserProfile } from '@/lib/types';

function readSkipped() {
  try {
    return localStorage.getItem(ONBOARDING_SKIPPED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Shown to athletes who skipped the onboarding wizard. Tapping it re-arms the
 * "pending" marker (the onboarding route requires it) and reopens the wizard.
 */
export function CompleteProfileCard({ profile }: { profile: UserProfile | null | undefined }) {
  const navigate = useNavigate();
  const [skipped] = useState(readSkipped);

  if (!skipped || !profile || profile.role !== 'athlete' || profile.onboardingCompleted) return null;

  const resume = () => {
    localStorage.setItem(ONBOARDING_PENDING_KEY, '1');
    navigate('/athlete/onboarding');
  };

  return (
    <button
      type="button"
      onClick={resume}
      className="row-tap flex w-full items-center gap-3 rounded-2xl bg-card px-3.5 py-3 text-left ring-1 ring-primary/40"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <UserRoundPen className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight">Uzupełnij swój profil</span>
        <span className="block truncate text-xs text-muted-foreground">Minuta, a kalorie i plany dopasujemy do Ciebie</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </button>
  );
}
