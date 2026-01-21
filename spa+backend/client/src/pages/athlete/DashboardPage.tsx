'use client';

import { useSession } from '@/lib/next-auth-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Target, Trophy, Dumbbell } from 'lucide-react';

export default function DashboardPage() {
    const { data: session } = useSession();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">
                    Witaj, {session?.user?.name || 'Sportowiec'}! 👋
                </h1>
                <p className="text-muted-foreground">
                    Oto podsumowanie Twoich postępów treningowych.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Treningi w tym tygodniu</CardTitle>
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground">+1 więcej niż zeszły tydzień</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aktywne cele</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">5</div>
                        <p className="text-xs text-muted-foreground">2 blisko ukończenia</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Odznaki</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">Ostatnia: Pierwszy trening</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aktywność</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">85%</div>
                        <p className="text-xs text-muted-foreground">Cel tygodniowy</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Kontynuuj migrację</CardTitle>
                    <CardDescription>
                        Ta strona jest pełnoprawnym podglądem dashboardu sportowca.
                        Wszystkie komponenty UI zostały pomyślnie przeniesione z aplikacji Next.js.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Backend działa na porcie 3001, frontend na porcie 5173.
                        Autoryzacja JWT jest aktywna.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
