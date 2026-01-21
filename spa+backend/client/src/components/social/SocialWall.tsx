'use client';

import { useState, useEffect, useCallback } from 'react';
import Masonry from 'react-masonry-css';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollection, useUser, useUpdateDoc, useDeleteDoc } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { SocialPost } from '@/lib/types';
import { PostCard } from './PostCard';
import { CreatePostDialog } from './CreatePostDialog';
import { EditPostDialog } from './EditPostDialog';
import { PublicProfileDialog } from './PublicProfileDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const breakpointColumnsObj = {
  default: 2,
  1100: 2,
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
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
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

  const handleEdit = (post: SocialPost) => {
    setEditingPost(post);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    refetch();
    setEditingPost(null);
  };

  const handleDeleteClick = (postId: string) => {
    setDeletingPostId(postId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPostId) return;

    try {
      await deleteDoc('socialPosts', deletingPostId);
      toast({
        title: 'Post usunięty',
        description: 'Twój post został usunięty.',
      });
      refetch();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć posta. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingPostId(null);
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
            Nie udało się załadować postów. Spróbuj ponownie.
          </p>
          <Button onClick={() => refetch()}>
            Spróbuj ponownie
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
            {userId ? 'Posty użytkownika' : 'Tablica społecznościowa'}
          </h1>
          <p className="text-muted-foreground">
            {userId ? 'Posty tego użytkownika' : 'Podziel się swoją drogą fitness ze społecznością'}
          </p>
        </div>

        {!userId && user && (
          <Button title="Nowy post" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
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
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onProfileClick={handleProfileClick}
              />
            </div>
          ))}
        </Masonry>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {userId ? 'Ten użytkownik nie opublikował jeszcze żadnych postów.' : 'Brak postów. Bądź pierwszy!'}
          </div>
          {!userId && user && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Utwórz pierwszy post
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

      {/* Edit Post Dialog */}
      <EditPostDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        post={editingPost}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten post?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Post zostanie trwale usunięty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Public Profile Dialog */}
      <PublicProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={selectedUserId}
      />
    </div>
  );
}