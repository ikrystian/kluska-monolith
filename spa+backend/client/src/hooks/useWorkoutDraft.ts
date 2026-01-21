import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WorkoutDraft<T> {
    data: T;
    lastSaved: Date;
    autoSaved: boolean;
}

export function useWorkoutDraft<T>(key: string) {
    const [draft, setDraft] = useState<WorkoutDraft<T> | null>(null);
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
    const { toast } = useToast();

    // Load draft from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Restore Date object
                if (parsed.lastSaved) {
                    parsed.lastSaved = new Date(parsed.lastSaved);
                }
                setDraft(parsed);
            } catch (e) {
                console.error('Failed to parse draft:', e);
            }
        }
    }, [key]);

    // Auto-save to localStorage
    const saveToLocal = useCallback((data: T) => {
        const draftData: WorkoutDraft<T> = {
            data,
            lastSaved: new Date(),
            autoSaved: true,
        };
        localStorage.setItem(key, JSON.stringify(draftData));
        setLastAutoSave(new Date());
    }, [key]);

    // Clear draft
    const clearDraft = useCallback(() => {
        localStorage.removeItem(key);
        setDraft(null);
        setLastAutoSave(null);
    }, [key]);

    return {
        draft,
        lastAutoSave,
        saveToLocal,
        clearDraft,
    };
}
