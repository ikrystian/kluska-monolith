
import { BadgesManager } from '@/components/admin/badges/BadgesManager';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin - Achievement Badges',
    description: 'Manage gamification badges',
};

export default function AdminBadgesPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <BadgesManager />
        </div>
    );
}
