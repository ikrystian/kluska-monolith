import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Goal } from '@/lib/types';

/**
 * Renders a goal as a shareable card for Instagram.
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

type ShareableGoal = Pick<Goal, 'title' | 'current' | 'target' | 'unit' | 'deadline'>;

// Dark "Sztanga" theme tokens (see globals.css) as plain colours, since the
// canvas can't read CSS variables.
const COLORS = {
  background: '#0E0F11',
  text: '#F4F1E9',
  muted: '#A0A6AE',
  ember: '#FF5B26',
  amber: '#F6C344',
  volt: '#C2F03A',
};

const FONT_DISPLAY = '"Barlow Condensed", "Figtree Variable", sans-serif';
const FONT_HEADLINE = '"Figtree Variable", sans-serif';
const FONT_BODY = '"Figtree Variable", sans-serif';

interface Layout {
  brandY: number;
  labelY: number;
  titleY: number;
  titleSize: number;
  titleLineHeight: number;
  titleMaxLines: number;
  ringY: number;
  ringRadius: number;
  ringStroke: number;
  statsY: number;
  deadlineY: number;
  statusY: number;
}

const LAYOUTS: Record<ShareFormat, Layout> = {
  story: {
    brandY: 300,
    labelY: 400,
    titleY: 450,
    titleSize: 96,
    titleLineHeight: 100,
    titleMaxLines: 3,
    ringY: 1030,
    ringRadius: 250,
    ringStroke: 44,
    statsY: 1400,
    deadlineY: 1480,
    statusY: 1560,
  },
  post: {
    brandY: 110,
    labelY: 190,
    titleY: 235,
    titleSize: 80,
    titleLineHeight: 84,
    titleMaxLines: 3,
    ringY: 770,
    ringRadius: 190,
    ringStroke: 36,
    statsY: 1060,
    deadlineY: 1125,
    statusY: 1195,
  },
};

type SpacedContext = CanvasRenderingContext2D & { letterSpacing?: string };

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // Not available in older WebViews; the text is then just set tighter.
  if ('letterSpacing' in ctx) (ctx as SpacedContext).letterSpacing = `${px}px`;
}

async function ensureFonts() {
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
function fitEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end).trimEnd()}…`).width > maxWidth) end--;
  return `${text.slice(0, end).trimEnd()}…`;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
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
function setFittedFont(
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

function daysLabel(days: number): string {
  return days === 1 ? '1 dzień' : `${days} dni`;
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  stroke: number,
  progress: number,
  completed: boolean
) {
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (progress <= 0) return;

  ctx.strokeStyle = completed ? COLORS.volt : COLORS.ember;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
}

export async function renderGoalShareImage(goal: ShareableGoal, shareFormat: ShareFormat): Promise<Blob> {
  await ensureFonts();

  const { width, height } = SHARE_SIZES[shareFormat];
  const layout = LAYOUTS[shareFormat];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const contentWidth = width - 200;
  const cx = width / 2;
  const progress = goal.target > 0 ? Math.min(goal.current / goal.target, 1) : 0;
  const completed = progress >= 1;
  const deadline = new Date(goal.deadline);

  drawBackground(ctx, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Brand
  ctx.fillStyle = COLORS.text;
  ctx.font = `700 34px ${FONT_HEADLINE}`;
  setLetterSpacing(ctx, 6);
  ctx.fillText('LENIWAKLUSKA', cx, layout.brandY);

  // Label
  ctx.fillStyle = completed ? COLORS.volt : COLORS.ember;
  ctx.font = `700 30px ${FONT_HEADLINE}`;
  setLetterSpacing(ctx, 10);
  ctx.fillText(completed ? 'CEL OSIĄGNIĘTY' : 'MÓJ CEL', cx, layout.labelY);

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = `800 ${layout.titleSize}px ${FONT_DISPLAY}`;
  setLetterSpacing(ctx, 0);
  const titleLines = wrapLines(ctx, goal.title.toUpperCase(), contentWidth, layout.titleMaxLines);
  titleLines.forEach((line, i) => ctx.fillText(line, cx, layout.titleY + layout.titleSize + i * layout.titleLineHeight));

  // Progress ring with the percentage inside
  drawRing(ctx, cx, layout.ringY, layout.ringRadius, layout.ringStroke, progress, completed);

  const percentText = `${Math.round(progress * 100)}%`;
  ctx.fillStyle = COLORS.text;
  setFittedFont(ctx, percentText, 800, FONT_DISPLAY, layout.ringRadius * 1.3, Math.round(layout.ringRadius * 0.86), 40);
  ctx.fillText(percentText, cx, layout.ringY + layout.ringRadius * 0.2);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 ${Math.round(layout.ringRadius * 0.11)}px ${FONT_BODY}`;
  setLetterSpacing(ctx, 6);
  ctx.fillText('UKOŃCZONO', cx, layout.ringY + layout.ringRadius * 0.52);

  // Numbers
  const stats = `${goal.current.toLocaleString('pl-PL')} / ${goal.target.toLocaleString('pl-PL')} ${goal.unit}`;
  ctx.fillStyle = COLORS.text;
  setLetterSpacing(ctx, 0);
  setFittedFont(ctx, stats, 700, FONT_HEADLINE, contentWidth, 64, 36);
  ctx.fillText(stats, cx, layout.statsY);

  if (!Number.isNaN(deadline.getTime())) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `600 36px ${FONT_BODY}`;
    ctx.fillText(`Termin: ${format(deadline, 'd MMMM yyyy', { locale: pl })}`, cx, layout.deadlineY);

    const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
    if (!completed) {
      ctx.fillStyle = daysLeft >= 0 ? COLORS.amber : COLORS.muted;
      ctx.font = `700 36px ${FONT_HEADLINE}`;
      ctx.fillText(daysLeft >= 0 ? `Zostało ${daysLabel(daysLeft)}` : 'Termin minął', cx, layout.statusY);
    }
  }

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
