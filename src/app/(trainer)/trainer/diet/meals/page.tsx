import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Globe, Lock, Pencil, Plus, Search, Utensils } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';
import { User } from '@/models/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DeleteButton from '@/components/trainer/DeleteButton';
import CopyMealButton from '@/components/trainer/CopyMealButton';
import {
    DISH_CATEGORIES,
    DISH_CATEGORY_LABELS,
    SYSTEM_MEAL_OWNER,
    diacriticInsensitivePattern,
    isDishCategory,
    type DishCategory,
} from '@/lib/meal-catalog';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Tab = 'mine' | 'catalog';

interface PageProps {
    searchParams: Promise<{ tab?: string; q?: string; category?: string }>;
}

async function getMeals(trainerId: string, tab: Tab, q: string, category: DishCategory | null) {
    await connectToDatabase();
    const filter: Record<string, unknown> =
        tab === 'mine' ? { trainerId } : { isPublic: true, trainerId: { $ne: trainerId } };
    if (q) filter.name = { $regex: diacriticInsensitivePattern(q), $options: 'i' };
    if (category) filter.dishCategory = category;

    const meals = await SavedMeal.find(filter)
        .sort(tab === 'mine' ? { createdAt: -1 } : { dishCategory: 1, name: 1 })
        .lean();

    // Author names for the catalogue ("System" for seeded meals)
    const authorIds = [...new Set(meals.map((m) => m.trainerId))].filter(
        (id) => id !== SYSTEM_MEAL_OWNER && /^[a-f\d]{24}$/i.test(id)
    );
    const authors = authorIds.length ? await User.find({ _id: { $in: authorIds } }, { name: 1 }).lean() : [];
    const authorNames = new Map(authors.map((a: any) => [a._id.toString(), a.name as string]));

    return JSON.parse(
        JSON.stringify(
            meals.map((m: any) => ({
                ...m,
                authorName: m.trainerId === SYSTEM_MEAL_OWNER ? 'Katalog Kluski' : authorNames.get(m.trainerId) ?? 'Trener',
            }))
        )
    );
}

function buildHref(params: { tab: Tab; q?: string; category?: string | null }) {
    const search = new URLSearchParams();
    if (params.tab !== 'mine') search.set('tab', params.tab);
    if (params.q) search.set('q', params.q);
    if (params.category) search.set('category', params.category);
    const qs = search.toString();
    return `/trainer/diet/meals${qs ? `?${qs}` : ''}`;
}

export default async function MealsPage({ searchParams }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'trainer') {
        redirect('/auth/signin');
    }

    const params = await searchParams;
    const tab: Tab = params.tab === 'catalog' ? 'catalog' : 'mine';
    const q = params.q?.trim() ?? '';
    const category = isDishCategory(params.category) ? params.category : null;

    await connectToDatabase();
    const [meals, mineCount, catalogCount] = await Promise.all([
        getMeals(session.user.id, tab, q, category),
        SavedMeal.countDocuments({ trainerId: session.user.id }),
        SavedMeal.countDocuments({ isPublic: true, trainerId: { $ne: session.user.id } }),
    ]);

    const tabs: { value: Tab; label: string; count: number }[] = [
        { value: 'mine', label: 'Moje posiłki', count: mineCount },
        { value: 'catalog', label: 'Katalog dań', count: catalogCount },
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Posiłki</h1>
                    <p className="text-muted-foreground">
                        Twoje posiłki oraz publiczny katalog dań, z którego możesz korzystać w planach dietetycznych.
                    </p>
                </div>
                <Link href="/trainer/diet/meals/create">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Utwórz Nowy Posiłek
                    </Button>
                </Link>
            </div>

            <div className="inline-flex rounded-lg bg-muted p-1">
                {tabs.map((t) => (
                    <Link
                        key={t.value}
                        href={buildHref({ tab: t.value })}
                        className={cn(
                            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                            tab === t.value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {t.label}
                        <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
                    </Link>
                ))}
            </div>

            <div className="space-y-3">
                <form action="/trainer/diet/meals" className="flex max-w-md gap-2">
                    {tab !== 'mine' && <input type="hidden" name="tab" value={tab} />}
                    {category && <input type="hidden" name="category" value={category} />}
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input name="q" defaultValue={q} placeholder="Szukaj po nazwie..." className="pl-8" />
                    </div>
                    <Button type="submit" variant="secondary">Szukaj</Button>
                </form>
                <div className="flex flex-wrap gap-2">
                    <Link href={buildHref({ tab, q })}>
                        <Badge variant={category ? 'outline' : 'default'} className="cursor-pointer px-3 py-1">Wszystkie</Badge>
                    </Link>
                    {DISH_CATEGORIES.map((value) => (
                        <Link key={value} href={buildHref({ tab, q, category: value })}>
                            <Badge variant={category === value ? 'default' : 'outline'} className="cursor-pointer px-3 py-1">
                                {DISH_CATEGORY_LABELS[value]}
                            </Badge>
                        </Link>
                    ))}
                </div>
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
                            <h3 className="text-xl font-semibold">
                                {q || category ? 'Brak wyników' : tab === 'mine' ? 'Brak zapisanych posiłków' : 'Katalog jest pusty'}
                            </h3>
                            <p className="text-muted-foreground">
                                {q || category
                                    ? 'Zmień wyszukiwaną frazę lub kategorię.'
                                    : tab === 'mine'
                                      ? 'Utwórz posiłek od zera albo skopiuj gotowe danie z katalogu.'
                                      : 'Nikt jeszcze nie udostępnił publicznych dań.'}
                            </p>
                        </div>
                        {tab === 'mine' && !q && !category && (
                            <div className="flex justify-center gap-2">
                                <Link href="/trainer/diet/meals/create">
                                    <Button variant="outline">Utwórz Posiłek</Button>
                                </Link>
                                <Link href={buildHref({ tab: 'catalog' })}>
                                    <Button variant="ghost">Przeglądaj katalog</Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meals.map((meal: any) => (
                        <Card key={meal._id} className="flex flex-col hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between items-start gap-2 text-lg">
                                    <span className="line-clamp-2" title={meal.name}>{meal.name}</span>
                                    {tab === 'mine' && (
                                        <div className="flex shrink-0 gap-1">
                                            <Link href={`/trainer/diet/meals/${meal._id}/edit`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <DeleteButton id={meal._id} resource="meals" resourceName="Posiłek" />
                                        </div>
                                    )}
                                </CardTitle>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <Badge variant="outline">
                                        {DISH_CATEGORY_LABELS[(meal.dishCategory ?? 'other') as DishCategory] ?? 'Inne'}
                                    </Badge>
                                    {tab === 'mine' ? (
                                        <Badge variant={meal.isPublic ? 'default' : 'secondary'} className="gap-1">
                                            {meal.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                            {meal.isPublic ? 'Publiczny' : 'Prywatny'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">{meal.authorName}</Badge>
                                    )}
                                </div>
                                {meal.description && (
                                    <p className="pt-1 text-sm text-muted-foreground line-clamp-2">{meal.description}</p>
                                )}
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-between gap-4">
                                <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-3 text-center text-sm">
                                    <div>
                                        <p className="font-semibold">{Math.round(meal.totalCalories)}</p>
                                        <p className="text-xs text-muted-foreground">kcal</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold">{meal.totalProtein.toFixed(1)}</p>
                                        <p className="text-xs text-muted-foreground">B (g)</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold">{meal.totalCarbs.toFixed(1)}</p>
                                        <p className="text-xs text-muted-foreground">W (g)</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold">{meal.totalFat.toFixed(1)}</p>
                                        <p className="text-xs text-muted-foreground">T (g)</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Składniki: {meal.ingredients.length}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {meal.ingredients.slice(0, 4).map((ing: any, idx: number) => (
                                            <span key={idx} className="text-[10px] bg-secondary px-2 py-1 rounded-full truncate max-w-[120px]">
                                                {ing.name}
                                            </span>
                                        ))}
                                        {meal.ingredients.length > 4 && (
                                            <span className="text-[10px] bg-secondary px-2 py-1 rounded-full">+{meal.ingredients.length - 4}</span>
                                        )}
                                    </div>
                                </div>

                                {tab === 'catalog' && (
                                    <div className="flex justify-end border-t pt-3">
                                        <CopyMealButton id={meal._id} name={meal.name} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
