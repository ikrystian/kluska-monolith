'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Heart, MoreVertical, Edit, Trash2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { SocialPost } from '@/lib/types';
import { placeholderImages } from '@/lib/placeholder-images';

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
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onProfileClick(post.authorId)}
          >
            <Avatar className="h-8 w-8">
              {post.authorAvatarUrl ? (
                <AvatarImage src={post.authorAvatarUrl} alt={post.authorNickname} />
              ) : (
                <AvatarImage src={placeholderImages.find(img => img.id === 'avatar-male')?.imageUrl} />
              )}
              <AvatarFallback>{getInitials(post.authorNickname)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">@{post.authorNickname}</p>
              <p className="text-xs text-muted-foreground">{formatTimeAgo(post.createdAt as any)}</p>
            </div>
          </div>

          {/* Menu for author/admin */}
          {(isAuthor || isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Image */}
        <div className="relative">
          <img
            src={post.imageUrl.startsWith('/') || post.imageUrl.startsWith('http') ? post.imageUrl : `https://utfs.io/f/${post.imageUrl}`}
            alt="Post image"
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>

        {/* Content */}
        <div className="p-4 pt-3">
          {/* Like button */}
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={`p-0 h-8 ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
            >
              <Heart className={`h-5 w-5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{post.likes?.length || 0}</span>
            </Button>
          </div>

          {/* Description */}
          {post.description && (
            <div className="text-sm">
              <span className="font-medium mr-2">@{post.authorNickname}</span>
              <span>{post.description}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}