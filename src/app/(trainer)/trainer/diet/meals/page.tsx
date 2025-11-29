import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Plus, Utensils, Pencil } from 'lucide-react';
import { redirect } from 'next/navigation';
import DeleteButton from '@/components/trainer/DeleteButton';

export const dynamic = 'force-dynamic';

async function getMeals(trainerId: string) {
    await connectToDatabase();
    const meals = await SavedMeal.find({ trainerId }).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(meals));
}

export default async function MealsPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'trainer') {
        redirect('/auth/signin');
    }

    const meals = await getMeals(session.user.id);

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Moje Posiłki</h1>
                <Link href="/trainer/diet/meals/create">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Utwórz Nowy Posiłek
                    </Button>
                </Link>
            </div>

            {meals.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent className="space-y-4">
                        <div className="flex justify-center">
                            <div className="p-4 bg-muted rounded-full">
                                <Utensils className="w-8 h-8 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Brak zapisanych posiłków</h3>
                            <p className="text-muted-foreground">
                                Nie masz jeszcze żadnych zapisanych posiłków. Utwórz swój pierwszy posiłek, aby zacząć.
                            </p>
                        </div>
                        <Link href="/trainer/diet/meals/create">
                            <Button variant="outline">Utwórz Posiłek</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meals.map((meal: any) => (
                        <Card key={meal._id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between items-start">
                                    <span className="truncate" title={meal.name}>{meal.name}</span>
                                    <div className="flex gap-1">
                                        <Link href={`/trainer/diet/meals/${meal._id}/edit`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                        <DeleteButton id={meal._id} resource="meals" resourceName="Posiłek" />
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Kalorie</p>
                                            <p className="font-semibold">{meal.totalCalories.toFixed(0)} kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Białko</p>
                                            <p className="font-semibold">{meal.totalProtein.toFixed(1)} g</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Węglowodany</p>
                                            <p className="font-semibold">{meal.totalCarbs.toFixed(1)} g</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Tłuszcz</p>
                                            <p className="font-semibold">{meal.totalFat.toFixed(1)} g</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <p className="text-xs text-muted-foreground mb-2">Składniki: {meal.ingredients.length}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {meal.ingredients.slice(0, 3).map((ing: any, idx: number) => (
                                                <span key={idx} className="text-[10px] bg-secondary px-2 py-1 rounded-full truncate max-w-[100px]">
                                                    {ing.name}
                                                </span>
                                            ))}
                                            {meal.ingredients.length > 3 && (
                                                <span className="text-[10px] bg-secondary px-2 py-1 rounded-full">
                                                    +{meal.ingredients.length - 3}
                                                </span>
                                            )}
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
