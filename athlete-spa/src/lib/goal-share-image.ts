import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { Goal } from '@/lib/types';
import {
  COLORS,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_HEADLINE,
  SHARE_SIZES,
  canvasToPngBlob,
  ensureFonts,
  setFittedFont,
  setLetterSpacing,
  wrapLines,
  type ShareFormat,
} from '@/lib/share-canvas';

/** Renders a goal as a shareable card for Instagram (sizes and safe areas: see share-canvas). */

type ShareableGoal = Pick<Goal, 'title' | 'current' | 'target' | 'unit' | 'deadline'>;

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

  return canvasToPngBlob(canvas);
}
