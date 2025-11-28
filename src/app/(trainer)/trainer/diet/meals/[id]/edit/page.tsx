import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';
import MealForm from '@/components/trainer/MealForm';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getMeal(id: string, trainerId: string) {
    await connectToDatabase();
    try {
        const meal = await SavedMeal.findOne({ _id: id, trainerId });
        if (!meal) return null;
        return JSON.parse(JSON.stringify(meal));
    } catch (error) {
        return null;
    }
}

export default async function EditMealPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'trainer') {
        redirect('/auth/signin');
    }

    const meal = await getMeal(params.id, session.user.id);

    if (!meal) {
        notFound();
    }

    return (
        <div className="container mx-auto p-6">
            <MealForm initialData={meal} />
        </div>
    );
}
