import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { DietPlan } from '@/models/DietPlan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Plus, Calendar, Pencil } from 'lucide-react';
import { redirect } from 'next/navigation';
import DeleteButton from '@/components/trainer/DeleteButton';

export const dynamic = 'force-dynamic';

async function getDietPlans(trainerId: string) {
    await connectToDatabase();
    const plans = await DietPlan.find({ trainerId }).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(plans));
}

export default async function DietPlansPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'trainer') {
        redirect('/auth/signin');
    }

    const plans = await getDietPlans(session.user.id);

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Moje Plany Dietetyczne</h1>
                <Link href="/trainer/diet/plans/create">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Utwórz Nowy Plan
                    </Button>
                </Link>
            </div>

            {plans.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent className="space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 bg-muted rounded-full">
                                <Calendar className="w-8 h-8 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Brak zapisanych planów</h3>
                            <p className="text-muted-foreground">
                                Nie masz jeszcze żadnych zapisanych planów dietetycznych. Utwórz swój pierwszy plan, aby zacząć.
                            </p>
                        </div>
                        <Link href="/trainer/diet/plans/create">
                            <Button variant="outline">Utwórz Plan</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan: any) => (
                        <Card key={plan._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between items-start">
                                    <span className="truncate" title={plan.name}>{plan.name}</span>
                                    <div className="flex gap-1">
                                        <Link href={`/trainer/diet/plans/${plan._id}/edit`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <DeleteButton id={plan._id} resource="diets" resourceName="Plan" />
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                        {plan.description || 'Brak opisu'}
                                    </p>

                                    <div className="pt-4 border-t flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>{plan.days.length} {plan.days.length === 1 ? 'Dzień' : 'Dni'}</span>
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                            {new Date(plan.createdAt).toLocaleDateString('pl-PL')}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
