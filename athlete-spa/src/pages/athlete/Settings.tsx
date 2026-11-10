import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SettingsTab } from '@/components/profile/SettingsTab';
import { useUser } from '@/lib/db-hooks';
import { useAuth } from '@/contexts/AuthContext';
import { haptic } from '@/lib/haptics';

export default function SettingsPage() {
  const { user } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogout = () => {
    haptic('impact');
    if (user?.isGuest) {
      setGuestLogoutOpen(true);
      return;
    }
    doLogout();
  };

  return (
    <div className="page space-y-5">
      <SettingsTab onLogout={handleLogout} />

      <AlertDialog open={guestLogoutOpen} onOpenChange={setGuestLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wylogować konto gościa?</AlertDialogTitle>
            <AlertDialogDescription>
              Twoje dane są przypisane do tego urządzenia. Po wylogowaniu stracisz do nich dostęp. Załóż konto, aby je zachować.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={doLogout} className={buttonVariants({ variant: 'destructive' })}>
              Rozumiem, wyloguj mnie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
