import { ProfileSummary } from '@/components/dashboard/ProfileSummary';

/** Standalone "profile card" summary, reached from the menu and the profile page. */
export default function AthleteSummaryPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 pb-10 pt-20 md:px-8 md:pt-8">
      <ProfileSummary />
    </div>
  );
}
