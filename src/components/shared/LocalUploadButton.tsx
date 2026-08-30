'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadClientFiles, type UploadedFile } from '@/lib/upload';

interface LocalUploadButtonProps {
  /** Accept attribute for the hidden file input. Defaults to any image. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  onComplete: (files: UploadedFile[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Minimal drop-in for the old UploadThing `<UploadButton>`: renders a button
 * that opens a file picker and uploads the selection to `/api/upload`.
 */
export function LocalUploadButton({
  accept = 'image/*',
  multiple = false,
  disabled = false,
  label = 'Wybierz plik',
  onComplete,
  onError,
}: LocalUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setBusy(true);
    try {
      onComplete(await uploadClientFiles(files));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Nie udało się przesłać pliku.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {busy ? 'Przesyłanie...' : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
