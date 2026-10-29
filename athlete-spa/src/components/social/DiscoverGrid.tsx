import { useState } from 'react';
import { Heart, ImagePlus, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
import { useCollection, useDeleteDoc, useUpdateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { resolveMediaUrl } from '@/lib/api-client';
import { resolveStoredImageUrl } from '@/lib/upload';
import type { SocialPost } from '@/lib/types';
import { PostCard } from './PostCard';
import { CreatePostDialog } from './CreatePostDialog';
import { EditPostDialog } from './EditPostDialog';

const PAGE_SIZE = 24;

interface DiscoverGridProps {
  onProfileClick: (userId: string) => void;
}

/** Instagram-style photo grid of community posts; a tile opens the full post. */
export function DiscoverGrid({ onProfileClick }: DiscoverGridProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const { deleteDoc, isLoading: isDeleting } = useDeleteDoc();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const { data: posts, isLoading, error, refetch } = useCollection<SocialPost>('socialPosts', undefined, {
    sort: { createdAt: -1 },
    limit,
  });

  // Derived from the list so likes/edits show up in the open post after a refetch.
  const openPost = posts?.find(p => p.id === openPostId) ?? null;
  const hasMore = (posts?.length ?? 0) >= limit;

  const handleLike = async (postId: string) => {
    if (!user) return;
    await updateDoc('socialPosts', postId, { toggleLike: true, userId: user.uid });
    refetch();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPostId) return;
    try {
      await deleteDoc('socialPosts', deletingPostId);
      toast({ title: 'Post usunięty' });
      setOpenPostId(null);
      refetch();
    } catch (err) {
      console.error('Error deleting post:', err);
      toast({ title: 'Błąd', description: 'Nie udało się usunąć posta.', variant: 'destructive' });
    } finally {
      setDeletingPostId(null);
    }
  };

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="mb-3 text-sm text-muted-foreground">Nie udało się załadować postów.</p>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <h2 className="font-headline text-xl font-bold tracking-tight">Z życia społeczności</h2>
          <p className="text-sm text-muted-foreground">Zdjęcia z treningów wszystkich sportowców</p>
        </div>
        {user && (
          <Button size="sm" className="shrink-0 gap-1.5 rounded-full" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Post
          </Button>
        )}
      </div>

      {isLoading && !posts?.length ? (
        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[1.5rem]">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-none" />
          ))}
        </div>
      ) : !posts?.length ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-8 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
            <ImagePlus className="h-7 w-7" />
          </span>
          <p className="text-sm text-muted-foreground">Brak postów. Wrzuć pierwsze zdjęcie z treningu!</p>
          {user && (
            <Button size="sm" className="mt-4 rounded-full" onClick={() => setCreateOpen(true)}>
              Dodaj post
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-1 overflow-hidden rounded-[1.5rem]">
            {posts.map(post => {
              const liked = user ? post.likes?.includes(user.uid) : false;
              return (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => setOpenPostId(post.id)}
                    className="group relative block aspect-square w-full overflow-hidden bg-secondary"
                    aria-label={`Post @${post.authorNickname}${post.description ? `: ${post.description}` : ''}`}
                  >
                    <img
                      src={resolveMediaUrl(resolveStoredImageUrl(post.imageUrl))}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[11px] font-semibold text-white">
                      <span className="truncate">@{post.authorNickname}</span>
                      <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
                        <Heart className={liked ? 'h-3 w-3 fill-current text-primary' : 'h-3 w-3'} />
                        {post.likes?.length || 0}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <Button
              variant="outline"
              className="w-full rounded-full"
              disabled={isLoading}
              onClick={() => setLimit(l => l + PAGE_SIZE)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pokaż więcej
            </Button>
          )}
        </>
      )}

      <Dialog open={!!openPost} onOpenChange={open => !open && setOpenPostId(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[2rem] border-0 bg-transparent p-0 pt-12 shadow-none [&>button:last-child]:right-1 [&>button:last-child]:top-1 [&>button:last-child]:grid [&>button:last-child]:h-9 [&>button:last-child]:w-9 [&>button:last-child]:place-items-center [&>button:last-child]:rounded-full [&>button:last-child]:bg-card [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-soft">
          <DialogTitle className="sr-only">Post @{openPost?.authorNickname}</DialogTitle>
          {openPost && (
            <PostCard
              post={openPost}
              onLike={handleLike}
              onEdit={setEditingPost}
              onDelete={setDeletingPostId}
              onProfileClick={userId => {
                setOpenPostId(null);
                onProfileClick(userId);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => refetch()} />

      <EditPostDialog
        open={!!editingPost}
        onOpenChange={open => !open && setEditingPost(null)}
        post={editingPost}
        onSuccess={() => {
          refetch();
          setEditingPost(null);
        }}
      />

      <AlertDialog open={!!deletingPostId} onOpenChange={open => !open && setDeletingPostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć ten post?</AlertDialogTitle>
            <AlertDialogDescription>Ta operacja jest nieodwracalna.</AlertDialogDescription>
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
    </div>
  );
}
