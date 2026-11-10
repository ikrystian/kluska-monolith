import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check, Dumbbell, MapPin, Plus, Settings, Share2, UserPen, UserPlus, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSummary } from '@/components/dashboard/ProfileSummary';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useUser } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { SettingsGroup, SettingsLinkRow } from './profile-ui';

const COMPLETENESS_HIDDEN_KEY = 'athlete-spa:profile-completeness-hidden';

function readHidden(): boolean {
  try {
    return localStorage.getItem(COMPLETENESS_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

interface ProfileStep {
  key: string;
  label: string;
  icon: LucideIcon;
  done: boolean;
  onClick: () => void;
}

/**
 * Checklist of what makes a profile worth visiting — photo, city, a social
 * link, home gyms. It goes away once everything is filled in, or when the
 * athlete hides it.
 */
function ProfileCompleteness({ steps }: { steps: ProfileStep[] }) {
  const [hidden, setHidden] = useState(readHidden);
  const doneCount = steps.filter(s => s.done).length;
  if (hidden || doneCount === steps.length) return null;

  const hide = () => {
    haptic('tap');
    setHidden(true);
    try {
      localStorage.setItem(COMPLETENESS_HIDDEN_KEY, '1');
    } catch {
      // Storage unavailable — it comes back after a reload.
    }
  };

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Uzupełnij profil</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Znajomi łatwiej Cię rozpoznają i znajdą na siłowni.
          </p>
        </div>
        <button
          type="button"
          onClick={hide}
          aria-label="Ukryj"
          className="-mr-1.5 -mt-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <div className="flex h-1.5 flex-1 gap-1">
          {steps.map(s => (
            <span key={s.key} className={cn('flex-1 rounded-full', s.done ? 'bg-volt' : 'bg-foreground/10')} />
          ))}
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {steps.map(({ key, label, icon: Icon, done, onClick }) =>
          done ? (
            <span
              key={key}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground"
            >
              <Check className="h-3.5 w-3.5 text-volt" />
              {label}
            </span>
          ) : (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className="pressable inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <Plus className="h-3 w-3 text-muted-foreground" />
            </button>
          )
        )}
      </div>
    </section>
  );
}

/**
 * "Ty" → Profil: an invitation to finish the profile while it's sparse, the
 * summary of the chosen period (the former Podsumowanie screen), then the
 * rows that edit what other people see.
 */
export function ProfileTab({
  onEditProfile,
  onEditAvatar,
  onEditGyms,
}: {
  onEditProfile: () => void;
  onEditAvatar: () => void;
  onEditGyms: () => void;
}) {
  const { user } = useUser();
  const { userProfile, isLoading } = useUserProfile();
  const favoriteGymsCount = userProfile?.favoriteGymIds?.length ?? 0;
  const links = userProfile?.socialLinks;

  const steps: ProfileStep[] = [
    { key: 'avatar', label: 'Zdjęcie', icon: Camera, done: !!userProfile?.avatarUrl, onClick: onEditAvatar },
    { key: 'location', label: 'Miasto', icon: MapPin, done: !!userProfile?.location, onClick: onEditProfile },
    {
      key: 'social',
      label: 'Social media',
      icon: Share2,
      done: !!(links?.instagram || links?.facebook || links?.twitter),
      onClick: onEditProfile,
    },
    { key: 'gyms', label: 'Siłownie', icon: Dumbbell, done: favoriteGymsCount > 0, onClick: onEditGyms },
  ];

  return (
    <div className="space-y-5">
      {user?.isGuest ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-food/20 text-food">
              <UserPlus className="h-5 w-5" />
            </span>
            <div className="space-y-0.5">
              <p className="font-semibold">Konto gościa</p>
              <p className="text-sm text-muted-foreground">
                Załóż konto, aby zapisać zmiany na stałe — dotychczasowy progres zostanie przeniesiony.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 font-semibold">
            <Link to="/register">Załóż konto</Link>
          </Button>
        </div>
      ) : (
        userProfile && <ProfileCompleteness steps={steps} />
      )}

      <ProfileSummary />

      <div data-tour="you-profile">
        <SettingsGroup title="Twój profil">
          <SettingsLinkRow
            icon={UserPen}
            color="hsl(var(--primary))"
            title="Dane profilu"
            description={userProfile?.email || 'Imię, email, miasto, social media'}
            onClick={() => userProfile && onEditProfile()}
          />
          <SettingsLinkRow
            icon={Dumbbell}
            color="hsl(var(--volt))"
            title="Ulubione siłownie"
            description="Miejsca, w których trenujesz"
            value={isLoading && !userProfile ? undefined : favoriteGymsCount || 'Brak'}
            onClick={() => userProfile && onEditGyms()}
          />
          <SettingsLinkRow
            icon={Settings}
            color="hsl(var(--muted-foreground))"
            title="Ustawienia aplikacji"
            description="Motyw, powiadomienia, integracje"
            to="/athlete/settings"
          />
        </SettingsGroup>
      </div>
    </div>
  );
}
