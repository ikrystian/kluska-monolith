'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useUpdateDoc } from '@/lib/db-hooks';
import { SocialPost } from '@/lib/types';

const editPostSchema = z.object({
    description: z.string().max(500, 'Opis może mieć maksymalnie 500 znaków'),
});

type EditPostFormValues = z.infer<typeof editPostSchema>;

interface EditPostDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    post: SocialPost | null;
    onSuccess?: () => void;
}

export function EditPostDialog({ open, onOpenChange, post, onSuccess }: EditPostDialogProps) {
    const { toast } = useToast();
    const { updateDoc, isLoading } = useUpdateDoc();

    const form = useForm<EditPostFormValues>({
        resolver: zodResolver(editPostSchema),
        defaultValues: {
            description: '',
        },
    });

    // Update form when post changes
    useEffect(() => {
        if (post) {
            form.reset({
                description: post.description || '',
            });
        }
    }, [post, form]);

    const onSubmit = async (data: EditPostFormValues) => {
        if (!post) return;

        try {
            await updateDoc('socialPosts', post.id, {
                description: data.description,
            });

            toast({
                title: 'Sukces!',
                description: 'Twój post został zaktualizowany.',
            });

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Error updating post:', error);
            toast({
                title: 'Błąd',
                description: 'Nie udało się zaktualizować posta. Spróbuj ponownie.',
                variant: 'destructive',
            });
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && !isLoading) {
            form.reset();
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edytuj Post</DialogTitle>
                    <DialogDescription>
                        Zmień opis swojego posta.
                    </DialogDescription>
                </DialogHeader>

                {post && (
                    <div className="space-y-4">
                        {/* Current Image Preview */}
                        <div className="relative">
                            <img
                                src={`https://utfs.io/f/${post.imageUrl}`}
                                alt="Post image"
                                className="w-full h-48 object-cover rounded-lg"
                            />
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Napisz opis..."
                                                    className="resize-none"
                                                    rows={3}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <div className="text-xs text-muted-foreground text-right">
                                                {field.value?.length || 0}/500
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Submit Button */}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleOpenChange(false)}
                                        disabled={isLoading}
                                    >
                                        Anuluj
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                    >
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
