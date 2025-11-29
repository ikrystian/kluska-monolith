'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Trophy, Heart, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicProfileData, SocialPost } from '@/lib/types';
import { placeholderImages } from '@/lib/placeholder-images';

interface PublicProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export function PublicProfileDialog({ open, onOpenChange, userId }: PublicProfileDialogProps) {
  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch profile data when dialog opens
  useEffect(() => {
    if (open && userId) {
      fetchProfileData();
    }
  }, [open, userId]);

  const fetchProfileData = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/social/profile/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setIsLoading(false);
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

  const formatRecordValue = (record: any) => {
    switch (record.type) {
      case 'max_weight':
        return `${record.value}kg${record.reps ? ` (${record.reps} powtórzeń)` : ''}`;
      case 'max_reps':
        return `${record.value} powtórzeń`;
      case 'max_duration':
        return `${record.value}s`;
      default:
        return record.value;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil użytkownika</DialogTitle>
          <DialogDescription>
            Zobacz statystyki i osiągnięcia tego użytkownika
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        ) : profileData ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileData.profile.avatarUrl} />
                <AvatarFallback>{getInitials(profileData.profile.nickname)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">@{profileData.profile.nickname}</h3>
                {profileData.profile.bio && (
                  <p className="text-muted-foreground">{profileData.profile.bio}</p>
                )}
                <p className="text-sm text-muted-foreground flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Dołączył {formatTimeAgo(profileData.profile.createdAt)}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <ImageIcon className="h-5 w-5 text-primary mr-2" />
                  <span className="text-2xl font-bold">{profileData.stats.postsCount}</span>
                </div>
                <p className="text-sm text-muted-foreground">Postów</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-2xl font-bold">{profileData.stats.totalLikes}</span>
                </div>
                <p className="text-sm text-muted-foreground">Polubień</p>
              </div>
            </div>

            {/* Personal Records */}
            {profileData.records && profileData.records.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                  Rekordy Osobiste
                </h4>
                <div className="space-y-2">
                  {profileData.records.slice(0, 5).map((record, index) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{record.exerciseName}</p>
                          <p className="text-sm text-muted-foreground">{formatRecordValue(record)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatTimeAgo(record.achievedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Posts */}
            {profileData.recentPosts && profileData.recentPosts.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Ostatnie Posty
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {profileData.recentPosts.slice(0, 6).map((post) => (
                    <div key={post.id} className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={`/api/images/${post.imageUrl}`}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nie udało się załadować profilu.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}