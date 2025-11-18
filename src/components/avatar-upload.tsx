'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';

interface AvatarUploadProps {
  currentPhotoURL?: string;
  userName?: string;
  onUploadSuccess: (photoURL: string) => void;
  onDeleteSuccess?: () => void;
}

export function AvatarUpload({
  currentPhotoURL,
  userName,
  onUploadSuccess,
  onDeleteSuccess,
}: AvatarUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarPlaceholder = placeholderImages.find((img) => img.id === 'avatar-male');

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Błąd',
        description: 'Nieprawidłowy format pliku. Dozwolone są tylko JPG, PNG i WebP.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Błąd',
        description: 'Plik jest za duży. Maksymalny rozmiar to 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar');
      }

      toast({
        title: 'Sukces!',
        description: 'Zdjęcie zostało przesłane.',
      });

      onUploadSuccess(data.photoURL);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się przesłać zdjęcia.',
        variant: 'destructive',
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch('/api/upload/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete avatar');
      }

      toast({
        title: 'Sukces!',
        description: 'Zdjęcie zostało usunięte.',
      });

      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się usunąć zdjęcia.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const displayUrl = previewUrl || currentPhotoURL;

  return (
    <div className="flex flex-col items-center">
      <Avatar className="mb-4 h-24 w-24 border-2 border-primary">
        {displayUrl ? (
          <AvatarImage src={displayUrl} alt="Awatar użytkownika" />
        ) : (
          avatarPlaceholder && <AvatarImage src={avatarPlaceholder.imageUrl} alt="Awatar użytkownika" />
        )}
        <AvatarFallback>{getInitials(userName)}</AvatarFallback>
      </Avatar>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isDeleting}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Przesyłanie...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {currentPhotoURL ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
            </>
          )}
        </Button>

        {currentPhotoURL && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Usuwanie...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
