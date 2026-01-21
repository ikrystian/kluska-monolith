'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AvatarUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUploadComplete: (url: string) => void;
    currentAvatarUrl?: string;
}

function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
): Crop {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight,
        ),
        mediaWidth,
        mediaHeight,
    );
}

export function AvatarUploadDialog({
    open,
    onOpenChange,
    onUploadComplete,
    currentAvatarUrl,
}: AvatarUploadDialogProps) {
    const { toast } = useToast();
    const [imgSrc, setImgSrc] = useState('');
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [isUploading, setIsUploading] = useState(false);

    const uploadFile = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.request<{ url: string }>('/upload', {
            method: 'POST',
            body: formData,
        });
        return response.url;
    };

    const handleClose = () => {
        setImgSrc('');
        setCrop(undefined);
        setCompletedCrop(undefined);
        setIsProcessing(false);
        onOpenChange(false);
    };

    const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImgSrc(reader.result?.toString() || '');
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1));
    }, []);

    const getCroppedImg = useCallback(async (): Promise<File | null> => {
        if (!imgRef.current || !completedCrop) return null;

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = completedCrop.width * pixelRatio;
        canvas.height = completedCrop.height * pixelRatio;

        ctx.scale(pixelRatio, pixelRatio);
        ctx.imageSmoothingQuality = 'high';

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            completedCrop.width,
            completedCrop.height,
        );

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(null);
                        return;
                    }
                    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                    resolve(file);
                },
                'image/jpeg',
                0.95,
            );
        });
    }, [completedCrop]);

    const handleUpload = async () => {
        setIsProcessing(true);
        setIsUploading(true);
        try {
            const croppedFile = await getCroppedImg();
            if (croppedFile) {
                const url = await uploadFile(croppedFile);
                onUploadComplete(url);
                handleClose();
                toast({
                    title: 'Sukces!',
                    description: 'Twój avatar został zaktualizowany.',
                });
            } else {
                toast({
                    title: 'Błąd',
                    description: 'Nie udało się przetworzyć obrazu.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Błąd przesyłania',
                description: error instanceof Error ? error.message : 'Wystąpił błąd',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setIsUploading(false);
        }
    };

    const isLoading = isUploading || isProcessing;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline">Zmień zdjęcie profilowe</DialogTitle>
                    <DialogDescription>
                        Wybierz i przytnij zdjęcie do odpowiedniego rozmiaru.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {!imgSrc ? (
                        <div className="flex flex-col items-center gap-4">
                            {currentAvatarUrl && (
                                <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-muted">
                                    <img
                                        src={currentAvatarUrl}
                                        alt="Aktualny avatar"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Wybierz zdjęcie
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={onSelectFile}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative max-h-[400px] overflow-auto">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={1}
                                    circularCrop
                                    className="max-w-full"
                                >
                                    <img
                                        ref={imgRef}
                                        alt="Zdjęcie do przycięcia"
                                        src={imgSrc}
                                        onLoad={onImageLoad}
                                        className="max-w-full"
                                    />
                                </ReactCrop>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setImgSrc('');
                                    setCrop(undefined);
                                    setCompletedCrop(undefined);
                                }}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Wybierz inne zdjęcie
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                        Anuluj
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!completedCrop || isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Camera className="mr-2 h-4 w-4" />
                        Zapisz avatar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
