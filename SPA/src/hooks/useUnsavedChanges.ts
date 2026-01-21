import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to warn user about unsaved changes before leaving the page.
 * Uses React Router v7's useBlocker for navigation blocking and window.onbeforeunload for browser refresh/close.
 * 
 * @param isDirty - Boolean indicating if the form or state has unsaved changes
 */
export function useUnsavedChanges(isDirty: boolean) {
    // Block navigation within the app
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    // Handle browser refresh or close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    return {
        state: blocker.state,
        proceed: blocker.state === "blocked" ? blocker.proceed : undefined,
        reset: blocker.state === "blocked" ? blocker.reset : undefined,
    };
}
