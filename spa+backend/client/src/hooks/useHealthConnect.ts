
import { useState, useCallback, useEffect } from 'react';
import {
    HealthConnect,
} from 'capacitor-health-connect';

export interface HealthData {
    steps: number;
    calories: number;
    // heartRate: number; // Heart rate logic is more complex (series), keeping it simple for now
}

export const useHealthConnect = () => {
    const [isAvailable, setIsAvailable] = useState<boolean>(false);
    const [hasPermissions, setHasPermissions] = useState<boolean>(false);
    const [data, setData] = useState<HealthData>({ steps: 0, calories: 0 });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const checkAvailability = useCallback(async () => {
        try {
            const { availability } = await HealthConnect.checkAvailability();
            // Note: checkAvailability returns object or string? 
            // Docs say `checkAvailability() => any`. 
            // Usage example: `const healthConnectAvailability = await HealthConnect.checkAvailability();`
            // Let's assume it returns the string directly based on usage example showing assignment to variable named after type.
            // BUT wait, usage example: `const healthConnectAvailability = ...`. It might be an object wrapping it?
            // Actually, usually Capacitor plugins return an object like `{ value: ... }` or similar.
            // BUT the README says "Returns: any".
            // Let's assume it returns a string for now as per usage example implication.
            // Wait, looking at other capacitor plugins, they often return { value: ... }. 
            // However, `checkAvailability` in `capacitor-health-connect` usually returns `{ availability: 'Available' }` or plain string?
            // I'll wrap in a safe check.

            // Actually, let's look at the result. If it is an object, I'll log it.
            // Safest: check result, or result.availability.

            const result = await HealthConnect.checkAvailability();
            const status = (typeof result === 'string') ? result : result?.availability || 'NotInstalled';

            setIsAvailable(status === 'Available');

            if (status === 'Available') {
                const permissionsStatus = await HealthConnect.checkHealthPermissions({
                    read: ['Steps', 'ActiveCaloriesBurned'],
                    write: []
                });
                setHasPermissions(permissionsStatus.granted.includes('Steps'));
            }
        } catch (e: any) {
            console.error('Health Connect availability check failed', e);
            setError(e.message);
        }
    }, []);

    const requestPermissions = useCallback(async () => {
        try {
            if (!isAvailable) {
                await HealthConnect.openHealthConnectSetting();
            }

            const result = await HealthConnect.requestHealthPermissions({
                read: ['Steps', 'ActiveCaloriesBurned'],
                write: []
            });

            // Re-check permissions
            const permissionsStatus = await HealthConnect.checkHealthPermissions({
                read: ['Steps', 'ActiveCaloriesBurned'],
                write: []
            });
            setHasPermissions(permissionsStatus.granted.includes('Steps'));
            if (permissionsStatus.granted.includes('Steps')) {
                fetchData();
            }

        } catch (e: any) {
            console.error('Health Connect permission request failed', e);
            setError(e.message);
        }
    }, [isAvailable]);

    const fetchData = useCallback(async () => {
        if (!hasPermissions) return;
        setLoading(true);
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const { records: stepRecords } = await HealthConnect.readRecords({
                type: 'Steps',
                timeRangeFilter: {
                    type: 'between',
                    startTime: startOfDay.toISOString(),
                    endTime: now.toISOString()
                }
            });

            const totalSteps = stepRecords.reduce((sum: number, record: any) => sum + record.count, 0);

            const { records: caloriesRecords } = await HealthConnect.readRecords({
                type: 'ActiveCaloriesBurned',
                timeRangeFilter: {
                    type: 'between',
                    startTime: startOfDay.toISOString(),
                    endTime: now.toISOString()
                }
            });

            const totalCalories = caloriesRecords.reduce((sum: number, record: any) => sum + record.energy.kilocalories, 0);

            setData({ steps: totalSteps, calories: totalCalories });

        } catch (e: any) {
            console.error('Health Connect fetch failed', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [hasPermissions]);

    useEffect(() => {
        checkAvailability();
    }, [checkAvailability]);

    return {
        isAvailable,
        hasPermissions,
        data,
        loading,
        error,
        requestPermissions,
        fetchData
    };
};
