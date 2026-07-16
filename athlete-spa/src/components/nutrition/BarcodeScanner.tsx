import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { CameraOff, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SCAN_FORMATS = [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.QR_CODE,
];

interface BarcodeScannerProps {
    /** Called once with the decoded text of the first detected code. */
    onDetected: (code: string) => void;
    /** Pauses detection (camera keeps running) while the parent resolves a code. */
    paused?: boolean;
}

/**
 * Live camera view that scans EAN/UPC barcodes and QR codes via html5-qrcode.
 * Works in the browser and in the Capacitor WebView (camera permission required).
 */
export function BarcodeScanner({ onDetected, paused = false }: BarcodeScannerProps) {
    const containerId = useRef(`barcode-scanner-${Math.random().toString(36).slice(2)}`);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const pausedRef = useRef(paused);
    const lastCodeRef = useRef<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    pausedRef.current = paused;

    useEffect(() => {
        let cancelled = false;
        const scanner = new Html5Qrcode(containerId.current, {
            formatsToSupport: SCAN_FORMATS,
            verbose: false,
        });
        scannerRef.current = scanner;

        scanner
            .start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 160 } },
                (decodedText) => {
                    if (pausedRef.current || cancelled) return;
                    // The same frame fires repeatedly — only report a code once
                    if (lastCodeRef.current === decodedText) return;
                    lastCodeRef.current = decodedText;
                    onDetected(decodedText);
                },
                () => {
                    // per-frame "no code found" noise — ignore
                }
            )
            .catch((err) => {
                if (cancelled) return;
                console.error('Camera start failed:', err);
                setError(
                    'Nie udało się uruchomić kamery. Sprawdź, czy aplikacja ma uprawnienia do aparatu.'
                );
            });

        return () => {
            cancelled = true;
            scannerRef.current = null;
            if (scanner.isScanning) {
                scanner.stop().then(() => scanner.clear()).catch(() => undefined);
            } else {
                scanner.clear();
            }
        };
        // onDetected is intentionally captured once per camera session
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryKey]);

    // Allow re-detecting the same product after the parent un-pauses
    useEffect(() => {
        if (!paused) lastCodeRef.current = null;
    }, [paused]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/30 px-4 py-10 text-center">
                <CameraOff className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setError(null);
                        setRetryKey((key) => key + 1);
                    }}
                >
                    Spróbuj ponownie
                </Button>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-xl bg-black">
            <div id={containerId.current} className="[&_video]:!w-full [&_video]:object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <ScanLine className="h-8 w-8 animate-pulse text-white/70" />
            </div>
        </div>
    );
}
