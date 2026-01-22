
import { useState, useCallback, useEffect } from 'react';
import {
    HealthConnect,
    HealthConnectAvailability,
    HealthConnectRecordType
} from '@capacitor-community/health-connect';

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
            const status = await HealthConnect.checkAvailability();
            setIsAvailable(status === 'Installed' || status === 'NotInstalled'); // Logic allows to prompt install

            if (status === 'Installed') {
                const permissionsStatus = await HealthConnect.checkPermissions({
                    read: ['Steps', 'TotalCaloriesBurned']
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
                // Theoretically should open store if not installed, but let's assume installed for now or handle gracefully
                await HealthConnect.openHealthConnectSetting(); // Fallback or distinct check?
                // Actually, the plugin has requestPermissions
            }

            const result = await HealthConnect.requestPermissions({
                read: ['Steps', 'TotalCaloriesBurned']
            });

            // Re-check permissions
            const permissionsStatus = await HealthConnect.checkPermissions({
                read: ['Steps', 'TotalCaloriesBurned']
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

            // In a real app we might want to query specific intervals or aggregate
            // The plugin might return raw records or aggregates depending on call
            // Let's assume we want aggregate daily total

            // Note: @capacitor-community/health-connect might have specific specific aggregate functions or we iterate records
            // Let's check documentation pattern via standard usage if I can't browse. 
            // Usually it's `getRecord` with time range.

            // Wait, standard Health Connect implementation in Capacitor often involves separate calls for specific types
            // For now I'll implement a basic structure that tries to fetch steps.

            const { records: stepRecords } = await HealthConnect.getRecords({
                type: 'Steps',
                startTime: startOfDay.toISOString(),
                endTime: now.toISOString()
            });

            const totalSteps = stepRecords.reduce((sum: number, record: any) => sum + record.count, 0);

            const { records: caloriesRecords } = await HealthConnect.getRecords({
                type: 'TotalCaloriesBurned',
                startTime: startOfDay.toISOString(),
                endTime: now.toISOString()
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
