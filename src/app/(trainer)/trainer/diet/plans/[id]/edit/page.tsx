import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { DietPlan } from '@/models/DietPlan';
import DietPlanForm from '@/components/trainer/DietPlanForm';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getDietPlan(id: string, trainerId: string) {
    await connectToDatabase();
    try {
        const plan = await DietPlan.findOne({ _id: id, trainerId });
        if (!plan) return null;
        return JSON.parse(JSON.stringify(plan));
    } catch (error) {
        return null;
    }
}

export default async function EditDietPlanPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'trainer') {
        redirect('/auth/signin');
    }

    const plan = await getDietPlan(params.id, session.user.id);

    if (!plan) {
        notFound();
    }

    return (
        <div className="container mx-auto p-6">
            <DietPlanForm initialData={plan} />
        </div>
    );
}
