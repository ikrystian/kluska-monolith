import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function useUnsavedChanges(hasChanges: boolean, message?: string) {
    const defaultMessage = 'Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?';
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault();
                e.returnValue = message || defaultMessage;
                return message || defaultMessage;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasChanges, message]);

    // Note: Intercepting internal navigation in Next.js App Router is limited.
    // This handles browser back/forward buttons.
    useEffect(() => {
        const handlePopState = () => {
            if (hasChanges) {
                const confirmed = window.confirm(message || defaultMessage);
                if (!confirmed) {
                    // Push state back to prevent navigation
                    window.history.pushState(null, '', pathname);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [hasChanges, pathname, message]);
}
