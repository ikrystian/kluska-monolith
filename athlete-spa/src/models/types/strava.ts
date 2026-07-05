// StravaActivity frontend type
export interface StravaActivity {
    id: string;
    ownerId: string;
    stravaActivityId: string;
    name: string;
    type: string;
    date: string;
    distance: number; // in meters
    movingTime: number; // in seconds
    elapsedTime: number; // in seconds
    totalElevationGain?: number; // in meters
    averageSpeed?: number; // in m/s
    maxSpeed?: number; // in m/s
    averageHeartrate?: number; // in bpm
    maxHeartrate?: number; // in bpm
    averageCadence?: number;
    kudosCount?: number;
    map?: {
        summaryPolyline?: string;
    };
}
