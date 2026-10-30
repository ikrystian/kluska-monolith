'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExerciseQrCodeProps {
  exerciseId: string;
  exerciseName: string;
  /** Strona publiczna działa tylko dla ćwiczeń z biblioteki publicznej. */
  isPublic: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Kod QR prowadzący do publicznej strony ćwiczenia (naklejka na maszynę). */
export function ExerciseQrCode({ exerciseId, exerciseName, isPublic }: ExerciseQrCodeProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const origin = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = `${origin}/exercises/${exerciseId}`;

  const getDataUrl = () => canvasWrapperRef.current?.querySelector('canvas')?.toDataURL('image/png') ?? '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Brak dostępu do schowka: link jest widoczny na ekranie, można go skopiować ręcznie.
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getDataUrl();
    link.download = `qr-${exerciseId}.png`;
    link.click();
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const name = escapeHtml(exerciseName);
    win.document.write(`<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>${name}</title>
<style>
  body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
  img { width: 60mm; height: 60mm; }
  h1 { font-size: 18pt; margin: 12px 0 4px; }
  p { font-size: 11pt; color: #444; margin: 0; }
</style>
</head>
<body>
  <img src="${getDataUrl()}" alt="">
  <h1>${name}</h1>
  <p>Zeskanuj, aby dodać do treningu</p>
</body>
</html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <QrCode className="h-4 w-4" />
        Kod QR do maszyny
      </h3>

      {isPublic ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div ref={canvasWrapperRef} className="rounded-lg bg-white p-3">
            <QRCodeCanvas value={url} size={512} level="M" marginSize={0} style={{ width: 160, height: 160 }} />
          </div>
          <div className="w-full min-w-0 space-y-3 text-sm">
            <p className="break-all text-muted-foreground">{url}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Skopiowano' : 'Kopiuj link'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Pobierz PNG
              </Button>
              <Button size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Drukuj naklejkę
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Strona publiczna jest dostępna tylko dla ćwiczeń z biblioteki publicznej. Ćwiczenie prywatne nie ma kodu QR.
        </p>
      )}
    </section>
  );
}
