import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';
import MealForm from '@/components/trainer/MealForm';

export const dynamic = 'force-dynamic';

export default async function AdminEditMealPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        redirect('/login');
    }

    const { id } = await params;
    await connectToDatabase();
    const meal = await SavedMeal.findById(id).catch(() => null);
    if (!meal) {
        notFound();
    }

    return (
        <div className="container mx-auto p-6">
            <MealForm initialData={JSON.parse(JSON.stringify(meal))} apiBase="/api/admin/meals" redirectTo="/admin/meals" />
        </div>
    );
}
