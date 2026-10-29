'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadClientFiles, type UploadedFile } from '@/lib/upload';
import { cn } from '@/lib/utils';

interface LocalUploadButtonProps {
  /** Accept attribute for the hidden file input. Defaults to any image. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  onComplete?: (files: UploadedFile[]) => void;
  /** Gdy podane, przekazuje wybrane pliki zamiast je od razu wysyłać. */
  onSelect?: (files: File[]) => void;
  onError?: (error: Error) => void;
  /** Pokazuje obszar, na który można przeciągnąć plik (drag and drop). */
  dropzone?: boolean;
}

/** Sprawdza plik względem atrybutu `accept` (np. `image/*,.gif`). */
function matchesAccept(file: File, accept: string): boolean {
  const rules = accept.split(',').map((rule) => rule.trim()).filter(Boolean);
  if (rules.length === 0) return true;
  return rules.some((rule) => {
    if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule.toLowerCase());
    if (rule.endsWith('/*')) return file.type.startsWith(rule.slice(0, -1));
    return file.type === rule;
  });
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
  onSelect,
  onError,
  dropzone = false,
}: LocalUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    if (onSelect) {
      onSelect(files);
      return;
    }

    setBusy(true);
    try {
      onComplete?.(await uploadClientFiles(files));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Nie udało się przesłać pliku.'));
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void processFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    // Bez tego przeglądarka otworzy upuszczony plik zamiast go przyjąć.
    event.preventDefault();
    setDragging(false);
    if (disabled || busy) return;

    const accepted = Array.from(event.dataTransfer.files).filter((file) => matchesAccept(file, accept));
    if (accepted.length === 0) {
      onError?.(new Error('Ten typ pliku nie jest obsługiwany.'));
      return;
    }
    void processFiles(multiple ? accepted : accepted.slice(0, 1));
  };

  const picker = (
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

  if (!dropzone) return picker;

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled && !busy) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
        (disabled || busy) && 'opacity-60',
      )}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        {dragging ? 'Upuść plik tutaj' : 'Przeciągnij plik tutaj lub'}
      </p>
      {picker}
    </div>
  );
}
