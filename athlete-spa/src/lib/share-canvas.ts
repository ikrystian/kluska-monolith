/**
 * Building blocks shared by the cards the app renders for Instagram (goals,
 * workouts): sizes, the dark "Sztanga" palette as plain colours (a canvas can't
 * read CSS variables), font loading and text fitting.
 *
 * Stories are 9:16 and Instagram covers the top and bottom of the frame with
 * its own UI, so story content stays inside a safe area. Feed posts use 4:5,
 * the tallest portrait ratio the feed shows without cropping.
 */

export type ShareFormat = 'story' | 'post';

export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
};

// Dark "Sztanga" theme tokens (see globals.css).
export const COLORS = {
  background: '#0E0F11',
  text: '#F4F1E9',
  muted: '#A0A6AE',
  ember: '#FF5B26',
  amber: '#F6C344',
  volt: '#C2F03A',
};

export const FONT_DISPLAY = '"Barlow Condensed", "Figtree Variable", sans-serif';
export const FONT_HEADLINE = '"Figtree Variable", sans-serif';
export const FONT_BODY = '"Figtree Variable", sans-serif';

type SpacedContext = CanvasRenderingContext2D & { letterSpacing?: string };

export function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // Not available in older WebViews; the text is then just set tighter.
  if ('letterSpacing' in ctx) (ctx as SpacedContext).letterSpacing = `${px}px`;
}

export async function ensureFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('800 64px "Barlow Condensed"'),
      document.fonts.load('700 40px "Figtree Variable"'),
    ]);
  } catch {
    // Offline or blocked: the fallback fonts in the stacks above are used.
  }
}

/** Shortens `text` with an ellipsis until it fits `maxWidth` in the current font. */
export function fitEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end).trimEnd()}…`).width > maxWidth) end--;
  return `${text.slice(0, end).trimEnd()}…`;
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const kept = lines.slice(0, maxLines);
  // Anything cut off, or a single word wider than the card, ends in an ellipsis.
  if (lines.length > maxLines) kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
  return kept.map(l => fitEllipsis(ctx, l, maxWidth));
}

/** Sets a font and shrinks it until `text` fits `maxWidth`. */
export function setFittedFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  family: string,
  maxWidth: number,
  startSize: number,
  minSize: number
) {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size >= minSize);
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))), 'image/png');
  });
}

/** Raw base64 (no data-URL prefix), the form the native share plugin takes. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}
