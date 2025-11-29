'use client';

import { useState, useEffect, useCallback } from 'react';
import Masonry from 'react-masonry-css';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollection, useUser, useUpdateDoc } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { SocialPost } from '@/lib/types';
import { PostCard } from './PostCard';
import { CreatePostDialog } from './CreatePostDialog';
import { PublicProfileDialog } from './PublicProfileDialog';

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1
};

interface SocialWallProps {
  userId?: string; // Optional: show posts from specific user
}

export function SocialWall({ userId }: SocialWallProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Build query for posts
  const query = userId ? { authorId: userId } : {};
  const options = {
    sort: { createdAt: -1 as const },
    limit: 20
  };

  const { data: posts, isLoading, error, refetch } = useCollection<SocialPost>(
    'socialPosts',
    Object.keys(query).length > 0 ? query : undefined,
    options
  );

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      await updateDoc('socialPosts', postId, {
        toggleLike: true,
        userId: user.uid
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  };

  const handleProfileClick = (userId: string) => {
    setSelectedUserId(userId);
    setProfileDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Failed to load posts. Please try again.
          </p>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold">
            {userId ? 'User Posts' : 'Social Wall'}
          </h1>
          <p className="text-muted-foreground">
            {userId ? 'Posts from this user' : 'Share your fitness journey with the community'}
          </p>
        </div>

        {!userId && user && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        )}
      </div>

      {/* Posts Grid */}
      {isLoading && posts?.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts && posts.length > 0 ? (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {posts.map((post) => (
            <div key={post.id} className="mb-4">
              <PostCard
                post={post}
                onLike={handleLike}
                onProfileClick={handleProfileClick}
              />
            </div>
          ))}
        </Masonry>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {userId ? 'This user hasn\'t posted anything yet.' : 'No posts yet. Be the first to share!'}
          </div>
          {!userId && user && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Post
            </Button>
          )}
        </div>
      )}

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Public Profile Dialog */}
      <PublicProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={selectedUserId}
      />
    </div>
  );
}