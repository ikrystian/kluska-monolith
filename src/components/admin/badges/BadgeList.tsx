
'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BadgeFormValues } from './BadgeForm';

// Reusing the type structure roughly, extending with _id
export interface AchievementBadgeDoc extends BadgeFormValues {
    _id: string;
}

interface BadgeListProps {
    badges: AchievementBadgeDoc[];
    onEdit: (badge: AchievementBadgeDoc) => void;
    onDelete: (id: string) => void;
}

export function BadgeList({ badges, onEdit, onDelete }: BadgeListProps) {
    if (badges.length === 0) {
        return (
            <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground">No badges found. Create your first one!</p>
            </div>
        );
    }

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'bg-slate-500 hover:bg-slate-600';
            case 'rare': return 'bg-blue-500 hover:bg-blue-600';
            case 'epic': return 'bg-purple-500 hover:bg-purple-600';
            case 'legendary': return 'bg-orange-500 hover:bg-orange-600';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Rarity</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Requirement</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {badges.map((badge) => (
                        <TableRow key={badge._id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    {/* Placeholder for icon if standard icon component isn't available for URL */}
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs overflow-hidden">
                                        {badge.iconUrl ? <img src={badge.iconUrl} alt={badge.name} className="w-full h-full object-cover" /> : badge.name[0]}
                                    </div>
                                    <div className="flex flex-col">
                                        <span>{badge.name}</span>
                                        <span className="text-xs text-muted-foreground line-clamp-1">{badge.description}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="capitalize">{badge.category}</TableCell>
                            <TableCell>
                                <Badge className={getRarityColor(badge.rarity)}>
                                    {badge.rarity}
                                </Badge>
                            </TableCell>
                            <TableCell>{badge.pointsReward}</TableCell>
                            <TableCell className="text-sm">
                                {badge.requirement.type} {badge.requirement.comparison === 'gte' ? '≥' : badge.requirement.comparison === 'lte' ? '≤' : '='} {badge.requirement.value}
                            </TableCell>
                            <TableCell>
                                <Badge variant={badge.isActive ? 'default' : 'secondary'}>
                                    {badge.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(badge)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => onDelete(badge._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
