import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/useCollection';
import { SocialPost } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon } from 'lucide-react';

export default function SocialPage() {
  const { user } = useAuth();
  const [newPostContent, setNewPostContent] = useState('');

  const { data: posts, isLoading } = useCollection<SocialPost>(
    'socialPosts',
    { sort: { createdAt: -1 } }
  );

  const handleLike = (postId: string) => {
    console.log('Like post', postId);
    // TODO: Implement like mutation
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-headline text-3xl font-bold">Społeczność</h1>
        <p className="text-muted-foreground">Zobacz co słychać u innych klubowiczów.</p>
      </div>

      {/* Create Post Widget */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar>
              <AvatarFallback>{user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Input
                placeholder="Podziel się czymś..."
                className="bg-muted/50 border-none"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />
              <div className="flex justify-between items-center">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Dodaj zdjęcie
                </Button>
                <Button size="sm" disabled={!newPostContent.trim()}>Opublikuj</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      <div className="space-y-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-48 w-full rounded-md" />
              </CardContent>
            </Card>
          ))
        ) : posts && posts.length > 0 ? (
          posts.map(post => (
            <Card key={post.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={post.userPhotoURL} />
                    <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">{post.userName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: pl })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                  <div className="rounded-md overflow-hidden border">
                    <img src={post.imageUrl} alt="Post attachment" className="w-full object-cover max-h-[400px]" />
                  </div>
                )}

                {/* Workout attachment visualization could go here */}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-0">
                <Separator />
                <div className="flex justify-between w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 ${post.likes.includes(user?.id || '') ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'}`}
                    onClick={() => handleLike(post.id)}
                  >
                    <Heart className={`h-4 w-4 ${post.likes.includes(user?.id || '') ? 'fill-current' : ''}`} />
                    <span>{post.likes.length}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments.length}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                {/* Comments section would go here */}
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Brak postów. Bądź pierwszy!</p>
          </div>
        )}
      </div>
    </div>
  );
}
