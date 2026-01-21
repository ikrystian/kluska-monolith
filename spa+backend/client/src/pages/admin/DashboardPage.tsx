'use client';

import { useSession } from '@/lib/next-auth-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Database, Settings, Shield } from 'lucide-react';

export default function DashboardPage() {
    const { data: session } = useSession();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">
                    Panel Administratora, {session?.user?.name || 'Admin'}! 🛡️
                </h1>
                <p className="text-muted-foreground">
                    Zarządzaj systemem, użytkownikami i danymi.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Użytkownicy</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">156</div>
                        <p className="text-xs text-muted-foreground">Zarejestrowani</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ćwiczenia</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">248</div>
                        <p className="text-xs text-muted-foreground">W bazie danych</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Konfiguracja</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">OK</div>
                        <p className="text-xs text-muted-foreground">System zdrowy</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bezpieczeństwo</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Aktywne</div>
                        <p className="text-xs text-muted-foreground">JWT Auth</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Panel administratora</CardTitle>
                    <CardDescription>
                        Funkcjonalność panelu administratora została przeniesiona z aplikacji Next.js.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
