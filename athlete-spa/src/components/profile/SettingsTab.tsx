import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { IntegrationsSection } from './IntegrationsSection';
import { AppSettingsSections } from './AppSettingsSections';
import { OfflineDataSection } from './OfflineDataSection';

/** "Ty" → Ustawienia: how the app behaves on this device, its integrations, and the way out. */
export function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const { userProfile, isLoading, refetch } = useUserProfile();

  return (
    <div className="space-y-5">
      <IntegrationsSection
        isStravaConnected={!!userProfile?.stravaConnected}
        isProfileLoading={isLoading}
        onStravaChanged={() => void refetch()}
      />

      <AppSettingsSections />

      <OfflineDataSection />

      <Button
        type="button"
        variant="outline"
        onClick={onLogout}
        className="w-full border-destructive/30 text-destructive active:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Wyloguj się
      </Button>
    </div>
  );
}
