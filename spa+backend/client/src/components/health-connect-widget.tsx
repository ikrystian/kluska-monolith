
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Footprints, Flame, RefreshCw } from 'lucide-react';
import { useHealthConnect } from '@/hooks/useHealthConnect';

export const HealthConnectWidget = () => {
    const {
        isAvailable,
        hasPermissions,
        data,
        loading,
        requestPermissions,
        fetchData
    } = useHealthConnect();

    if (!isAvailable) {
        // Optionally hide or show a message if Health Connect is not supported/installed
        // For now, let's show a card saying it's required (or just hide it)
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5" /> Health Connect
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Health Connect is not available on this device.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!hasPermissions) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5" /> Health Connect
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Connect to view your daily steps and calories.
                    </p>
                    <Button onClick={requestPermissions} className="w-full">
                        Connect
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" /> Health Data
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-2 bg-secondary/20 rounded-lg">
                    <Footprints className="h-6 w-6 mb-1 text-blue-500" />
                    <span className="text-xl font-bold">{data.steps}</span>
                    <span className="text-xs text-muted-foreground">Steps</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-secondary/20 rounded-lg">
                    <Flame className="h-6 w-6 mb-1 text-orange-500" />
                    <span className="text-xl font-bold">{Math.round(data.calories)}</span>
                    <span className="text-xs text-muted-foreground">Kcal</span>
                </div>
            </CardContent>
        </Card>
    );
};
