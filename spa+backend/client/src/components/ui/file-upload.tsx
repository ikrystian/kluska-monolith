
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, File as FileIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
    onUploadComplete: (url: string) => void;
    onUploadError?: (error: Error) => void;
    accept?: string;
    className?: string;
}

export function FileUpload({ onUploadComplete, onUploadError, accept = "image/*", className }: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Uses proper content-type handling in api client
            const response = await api.request<{ url: string }>('/upload', {
                method: 'POST',
                body: formData,
            });

            onUploadComplete(response.url);
        } catch (error) {
            console.error('Upload error:', error);
            const err = error instanceof Error ? error : new Error('Upload failed');
            onUploadError?.(err);
            toast({
                title: "Błąd wysyłania",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={className}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={accept}
                onChange={handleFileChange}
            />
            <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploading ? 'Wysyłanie...' : 'Wybierz plik'}
            </Button>
        </div>
    );
}
