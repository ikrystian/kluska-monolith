import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface UseRestTimerProps {
    defaultDuration?: number;
    onComplete?: () => void;
    autoStart?: boolean;
}

export function useRestTimer({ defaultDuration = 60, onComplete, autoStart = false }: UseRestTimerProps = {}) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [duration, setDuration] = useState(defaultDuration);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const start = (newDuration?: number) => {
        const d = newDuration ?? duration;
        setDuration(d);
        setTimeLeft(d);
        setIsRunning(true);
    };

    const pause = () => {
        setIsRunning(false);
    };

    const resume = () => {
        if (timeLeft > 0) {
            setIsRunning(true);
        }
    };

    const stop = () => {
        setIsRunning(false);
        setTimeLeft(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const addTime = (seconds: number) => {
        setTimeLeft(prev => prev + seconds);
    };

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current!);
                        setIsRunning(false);
                        if (onComplete) onComplete();
                        else {
                            toast.info("Koniec przerwy!", {
                                description: "Czas wrócić do ćwiczeń.",
                                duration: 5000,
                            });
                            // Play sound if we were to implement audio
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (!isRunning && intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft, onComplete]);

    // AutoStart effect
    useEffect(() => {
        if (autoStart) {
            start();
        }
    }, []); // Run once on mount if autoStart is true

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        timeLeft,
        isRunning,
        duration,
        start,
        pause,
        resume,
        stop,
        addTime,
        formatTime,
        progress: duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0
    };
}
