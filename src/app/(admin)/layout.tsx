'use client';

import { AppNav } from '@/components/nav';
import { AppHeader } from '@/components/header';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    // This effect handles redirection after loading is complete
    if (!isLoading) {
      if (!user) {
        // If not logged in at all, go to login
        router.push('/login');
      } else if (userProfile?.role === 'athlete') {
        router.push('/athlete/dashboard');
      } else if (userProfile?.role === 'trainer') {
        router.push('/trainer/dashboard');
      } else if (userProfile?.role !== 'admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, userProfile, isLoading, router]);

  // Render loading state until we are certain about the user's auth state and role.
  // This prevents child components from rendering and attempting to fetch data prematurely.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Weryfikacja uprawnień...</p>
        </div>
      </div>
    );
  }

  // If after loading, the user is still not an admin, render nothing.
  // The useEffect will handle the redirect.
  if (userProfile?.role !== 'admin') {
    return null;
  }

  // At this point, user is loaded, logged in, and is confirmed to be an admin.
  // It is now safe to render the admin layout and its children.
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppNav />
        <main className="flex-1 flex-col overflow-y-auto bg-secondary/30">
          <AppHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
