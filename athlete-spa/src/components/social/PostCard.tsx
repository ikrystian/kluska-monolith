'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Heart, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { SocialPost } from '@/lib/types';
import { placeholderImages } from '@/lib/placeholder-images';
import { resolveMediaUrl } from '@/lib/api-client';
import { resolveStoredImageUrl } from '@/lib/upload';

interface PostCardProps {
  post: SocialPost;
  onLike: (postId: string) => void;
  onEdit?: (post: SocialPost) => void;
  onDelete?: (postId: string) => void;
  onProfileClick: (userId: string) => void;
}

export function PostCard({ post, onLike, onEdit, onDelete, onProfileClick }: PostCardProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isLiking, setIsLiking] = useState(false);

  const isLiked = user ? post.likes.includes(user.uid) : false;
  const isAuthor = user?.uid === post.authorId;
  const isAdmin = user?.role === 'admin';

  const handleLike = async () => {
    if (!user) {
      toast({
        title: 'Wymagane logowanie',
        description: 'Zaloguj się, aby polubić post.',
        variant: 'destructive',
      });
      return;
    }

    setIsLiking(true);
    try {
      await onLike(post.id);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się polubić posta.',
        variant: 'destructive',
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(post);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
    }
  };

  const getInitials = (nickname: string) => {
    return nickname.charAt(0).toUpperCase();
  };

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: pl
      });
    } catch {
      return 'niedawno';
    }
  };

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-soft">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity hover:opacity-80"
          onClick={() => onProfileClick(post.authorId)}
        >
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            {post.authorAvatarUrl ? (
              <AvatarImage src={post.authorAvatarUrl} alt={post.authorNickname} className="object-cover" />
            ) : (
              <AvatarImage src={placeholderImages.find(img => img.id === 'avatar-male')?.imageUrl} />
            )}
            <AvatarFallback className="bg-secondary font-semibold text-primary">
              {getInitials(post.authorNickname)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">@{post.authorNickname}</p>
            <p className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt)}</p>
          </div>
        </button>

        {(isAuthor || isAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label="Opcje posta">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edytuj
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Description */}
      {post.description && (
        <p className="whitespace-pre-wrap break-words px-4 pb-3 text-[15px] leading-relaxed">{post.description}</p>
      )}

      {/* Image */}
      <div className="px-3">
        <div className="overflow-hidden rounded-[1.25rem] bg-secondary">
          <img
            src={resolveMediaUrl(resolveStoredImageUrl(post.imageUrl))}
            alt={post.description ? `Zdjęcie: ${post.description}` : 'Zdjęcie z treningu'}
            className="block max-h-[32rem] w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-2">
        <button
          type="button"
          onClick={handleLike}
          disabled={isLiking}
          aria-pressed={isLiked}
          aria-label={isLiked ? 'Cofnij polubienie' : 'Polub'}
          className={cn(
            'flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-all active:scale-90 disabled:opacity-60',
            isLiked ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          )}
        >
          <Heart className={cn('h-5 w-5 transition-transform', isLiked && 'fill-current')} />
          <span className="tabular-nums">{post.likes?.length || 0}</span>
        </button>
      </div>
    </article>
  );
}
