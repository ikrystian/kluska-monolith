'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Loader2 } from 'lucide-react';
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
import { useCreateDoc, useUser } from '@/lib/db-hooks';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useUploadThing } from '@/lib/uploadthing';

const createPostSchema = z.object({
  description: z.string().max(500, 'Description must be at most 500 characters'),
});

type CreatePostFormValues = z.infer<typeof createPostSchema>;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreatePostDialog({ open, onOpenChange, onSuccess }: CreatePostDialogProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const { userProfile } = useUserProfile();
  const { createDoc } = useCreateDoc();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing('imageUploader', {
    onClientUploadComplete: (res) => {
      console.log('Upload completed:', res);
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      description: '',
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (4MB limit)
      if (file.size > 4 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 4MB.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const onSubmit = async (data: CreatePostFormValues) => {
    if (!selectedFile || !user) return;

    setIsUploading(true);

    try {
      // Upload image first
      const uploadResult = await startUpload([selectedFile]);

      if (!uploadResult || uploadResult.length === 0) {
        throw new Error('Upload failed');
      }

      const imageUrl = uploadResult[0].url; // Use full URL or ID? SPA usually needs URL.
      // Next.js code had: const imageUrl = uploadResult[0].url.split('/').pop();
      // If we store just ID, we need to know how to construct URL.
      // Let's stick to Next.js logic: uploadResult[0].url.split('/').pop() if that's what backend expects?
      // But SPA might render generic URL.
      // Let's use the full URL if we can, OR match Next.js logic.
      // Next.js logic: const imageUrl = uploadResult[0].url.split('/').pop();
      // Meaning it stores the KEY/ID.
      // I will follow Next.js logic exactly.

      const imageId = uploadResult[0].url.split('/').pop();

      // Create post
      await createDoc('socialPosts', {
        authorId: user.uid,
        authorNickname: user.name || 'Anonymous', // This should be replaced with actual nickname
        authorAvatarUrl: userProfile?.avatarUrl || undefined,
        imageUrl: imageId,
        description: data.description,
        likes: [],
        likesCount: 0,
      });

      toast({
        title: 'Success!',
        description: 'Your post has been created.',
      });

      // Reset form
      form.reset();
      removeImage();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isUploading) {
      form.reset();
      removeImage();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            Share your fitness moment with the community.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              {!previewUrl ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload an image
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 4MB
                    </p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Write a caption..."
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
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedFile || isUploading}
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}