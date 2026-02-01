
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// Define types locally if import from model is problematic, 
// but we will try to mimic the structure.
export type AchievementCategory = 'consistency' | 'performance' | 'social' | 'milestone';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

const badgeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().min(1, 'Description is required'),
    iconUrl: z.string().optional(),
    category: z.enum(['consistency', 'performance', 'social', 'milestone']),
    rarity: z.enum(['common', 'rare', 'epic', 'legendary']),
    pointsReward: z.coerce.number().min(0),
    isActive: z.boolean().default(true),
    requirement: z.object({
        type: z.enum(['streak', 'goal_count', 'workout_count', 'points_earned', 'level_reached', 'custom']),
        value: z.coerce.number().min(1),
        comparison: z.enum(['gte', 'lte', 'eq']).default('gte'),
        customField: z.string().optional(),
    }),
});

export type BadgeFormValues = z.infer<typeof badgeSchema>;

interface BadgeFormProps {
    initialData?: BadgeFormValues & { _id?: string };
    onSubmit: (data: BadgeFormValues) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export function BadgeForm({ initialData, onSubmit, onCancel, isLoading }: BadgeFormProps) {
    const form = useForm<BadgeFormValues>({
        resolver: zodResolver(badgeSchema),
        defaultValues: initialData || {
            name: '',
            description: '',
            iconUrl: '',
            category: 'consistency',
            rarity: 'common',
            pointsReward: 10,
            isActive: true,
            requirement: {
                type: 'workout_count',
                value: 1,
                comparison: 'gte',
            },
        },
    });

    const handleSubmit = async (data: BadgeFormValues) => {
        try {
            await onSubmit(data);
        } catch (error) {
            console.error('Form submission error:', error);
            toast.error('Failed to save badge');
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 bg-card p-6 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Early Bird" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="iconUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Icon URL (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://example.com/icon.png" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Awarded for logging 5 workouts in a week" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="consistency">Consistency</SelectItem>
                                        <SelectItem value="performance">Performance</SelectItem>
                                        <SelectItem value="social">Social</SelectItem>
                                        <SelectItem value="milestone">Milestone</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="rarity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rarity</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select rarity" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="common">Common</SelectItem>
                                        <SelectItem value="rare">Rare</SelectItem>
                                        <SelectItem value="epic">Epic</SelectItem>
                                        <SelectItem value="legendary">Legendary</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="pointsReward"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Points Reward</FormLabel>
                                <FormControl>
                                    <Input type="number" min={0} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 border p-4 rounded-md">
                    <h3 className="font-medium">Requirement</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="requirement.type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="streak">Streak</SelectItem>
                                            <SelectItem value="workout_count">Workout Count</SelectItem>
                                            <SelectItem value="goal_count">Goal Count</SelectItem>
                                            <SelectItem value="points_earned">Points Earned</SelectItem>
                                            <SelectItem value="level_reached">Level Reached</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="requirement.comparison"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Comparison</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select comparison" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="gte">Greater or Equal (&ge;)</SelectItem>
                                            <SelectItem value="lte">Less or Equal (&le;)</SelectItem>
                                            <SelectItem value="eq">Equal (=)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="requirement.value"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Value</FormLabel>
                                    <FormControl>
                                        <Input type="number" min={1} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="requirement.customField"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Custom Field (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. specific_exercise_id" {...field} />
                                </FormControl>
                                <FormDescription>Only used if type is 'Custom'</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Active
                                </FormLabel>
                                <FormDescription>
                                    This badge will be available to users.
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Badge
                    </Button>
                </div>
            </form>
        </Form>
    );
}
