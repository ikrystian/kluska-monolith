import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { pluralForm } from '@/lib/plural';
import {
  COLORS,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_HEADLINE,
  SHARE_SIZES,
  canvasToPngBlob,
  ensureFonts,
  fitEllipsis,
  setLetterSpacing,
  wrapLines,
} from '@/lib/share-canvas';

/**
 * Renders a finished workout as an Instagram Story: the workout photo fills a
 * 9:16 frame edged in the app's ember → amber → lime gradient, with the
 * headline numbers on a dark fade over the lower part of the photo.
 *
 * Instagram draws its own UI over the top and bottom of a story, so the brand
 * and the stats stay inside the safe area; only the photo and the frame run
 * to the edges.
 */

export interface WorkoutShareStats {
  /** Σ weight × reps over weight exercises, in kg. */
  totalVolume: number;
  totalReps: number;
  totalSets: number;
  exerciseCount: number;
  durationMinutes?: number;
}

export interface WorkoutShareData {
  workoutName: string;
  completedAt: Date | null;
  gymName?: string;
  /** Personal records broken in this workout. */
  recordsCount: number;
  stats: WorkoutShareStats;
}

const { width: WIDTH, height: HEIGHT } = SHARE_SIZES.story;

// Frame: a graphite margin, the gradient ring, then the photo.
const FRAME_INSET = 46;
const FRAME_STROKE = 12;
const FRAME_RADIUS = 52;
const PHOTO_INSET = FRAME_INSET + FRAME_STROKE / 2;
const PHOTO_RADIUS = FRAME_RADIUS - FRAME_STROKE / 2;

const CONTENT_X = 104;
const CONTENT_WIDTH = WIDTH - CONTENT_X * 2;

// Baselines, bottom-up from the lower safe-area limit (~1640 of 1920).
const BRAND_Y = 300;
const STATS_LABEL_Y = 1612;
const STATS_VALUE_Y = 1534;
const DIVIDER_Y = 1424;
const META_Y = 1366;
const TITLE_LAST_Y = 1290;
const TITLE_SIZE = 124;
const TITLE_LINE_HEIGHT = 116;
const TITLE_MAX_LINES = 2;
const MIN_TILE_GAP = 56;
const TEXT_SHADOW = 'rgba(0, 0, 0, 0.6)';

interface StatTile {
  value: string;
  label: string;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** "1h 15m" / "45 min": short enough to set in the big display face. */
function compactDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function buildTiles({ totalVolume, totalReps, totalSets, exerciseCount, durationMinutes }: WorkoutShareStats): StatTile[] {
  const tiles: StatTile[] = [];
  if (totalVolume > 0) tiles.push({ value: Math.round(totalVolume).toLocaleString('pl-PL'), label: 'TONAŻ (KG)' });
  else if (totalReps > 0) tiles.push({ value: totalReps.toLocaleString('pl-PL'), label: 'POWTÓRZENIA' });
  if (durationMinutes && durationMinutes > 0) tiles.push({ value: compactDuration(durationMinutes), label: 'CZAS' });
  if (totalSets > 0) tiles.push({ value: String(totalSets), label: 'SERIE' });
  if (exerciseCount > 0) tiles.push({ value: String(exerciseCount), label: 'ĆWICZENIA' });
  return tiles;
}

function recordsLabel(count: number): string {
  return pluralForm(count, 'NOWY REKORD', `${count} NOWE REKORDY`, `${count} NOWYCH REKORDÓW`);
}

/** Shorter wording for when the full one would run past the content margin. */
function compactRecordsLabel(count: number): string {
  return `${count} ${pluralForm(count, 'REKORD', 'REKORDY', 'REKORDÓW')}`;
}

/**
 * Fetches the photo rather than pointing an <img> at it: the canvas must stay
 * untainted to export, and a plain <img> load may have cached the response
 * without CORS headers (the backend only adds them to requests with an Origin).
 */
async function loadPhoto(url: string): Promise<ImageBitmap> {
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) throw new Error(`Photo request failed (${response.status})`);
  return createImageBitmap(await response.blob());
}

/** Draws `image` scaled to cover the rect, cropping the overflow around the centre. */
function drawCover(ctx: CanvasRenderingContext2D, image: ImageBitmap, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.width, h / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight);
}

function drawScrims(ctx: CanvasRenderingContext2D) {
  // The photo is the user's own and can be anything, up to a bright, busy screenshot-like image, so
  // the text must not depend on it: both fades reach a dark base before the text they carry.
  // Top: the brand sits at y≈300, well below the frame.
  const top = ctx.createLinearGradient(0, PHOTO_INSET, 0, 640);
  top.addColorStop(0, 'rgba(14, 15, 17, 0.85)');
  top.addColorStop(0.45, 'rgba(14, 15, 17, 0.68)');
  top.addColorStop(1, 'rgba(14, 15, 17, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Bottom: label, title and stats live between y≈1030 and 1620.
  const bottom = ctx.createLinearGradient(0, 700, 0, HEIGHT - PHOTO_INSET);
  bottom.addColorStop(0, 'rgba(14, 15, 17, 0)');
  bottom.addColorStop(0.14, 'rgba(14, 15, 17, 0.3)');
  bottom.addColorStop(0.28, 'rgba(14, 15, 17, 0.7)');
  bottom.addColorStop(0.45, 'rgba(14, 15, 17, 0.88)');
  bottom.addColorStop(1, 'rgba(14, 15, 17, 0.97)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawFrame(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, COLORS.ember);
  gradient.addColorStop(0.5, COLORS.amber);
  gradient.addColorStop(1, COLORS.volt);

  ctx.lineWidth = FRAME_STROKE;
  ctx.strokeStyle = gradient;
  roundedRectPath(ctx, FRAME_INSET, FRAME_INSET, WIDTH - FRAME_INSET * 2, HEIGHT - FRAME_INSET * 2, FRAME_RADIUS);
  ctx.stroke();
}

export async function renderWorkoutShareImage(photoUrl: string, workout: WorkoutShareData): Promise<Blob> {
  const [photo] = await Promise.all([loadPhoto(photoUrl), ensureFonts()]);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Photo and fades, clipped to the frame's inner edge.
    ctx.save();
    roundedRectPath(ctx, PHOTO_INSET, PHOTO_INSET, WIDTH - PHOTO_INSET * 2, HEIGHT - PHOTO_INSET * 2, PHOTO_RADIUS);
    ctx.clip();
    drawCover(ctx, photo, PHOTO_INSET, PHOTO_INSET, WIDTH - PHOTO_INSET * 2, HEIGHT - PHOTO_INSET * 2);
    drawScrims(ctx);
    ctx.restore();

    drawFrame(ctx);

    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = TEXT_SHADOW;
    ctx.shadowBlur = 28;

    // Brand
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = `700 34px ${FONT_HEADLINE}`;
    setLetterSpacing(ctx, 6);
    ctx.fillText('LENIWAKLUSKA', WIDTH / 2, BRAND_Y);

    ctx.textAlign = 'left';

    // Title, bottom-anchored so a one-line name sits just above the meta line.
    ctx.fillStyle = COLORS.text;
    ctx.font = `800 ${TITLE_SIZE}px ${FONT_DISPLAY}`;
    setLetterSpacing(ctx, 0);
    const titleLines = wrapLines(ctx, workout.workoutName.toUpperCase(), CONTENT_WIDTH, TITLE_MAX_LINES);
    const firstTitleY = TITLE_LAST_Y - (titleLines.length - 1) * TITLE_LINE_HEIGHT;
    titleLines.forEach((line, i) => ctx.fillText(line, CONTENT_X, firstTitleY + i * TITLE_LINE_HEIGHT));

    // Label above the title, with the records badge when this workout set some.
    const labelY = firstTitleY - TITLE_SIZE * 0.72 - 40;
    ctx.fillStyle = COLORS.volt;
    ctx.font = `700 30px ${FONT_HEADLINE}`;
    setLetterSpacing(ctx, 8);
    const label = 'TRENING UKOŃCZONY';
    ctx.fillText(label, CONTENT_X, labelY);

    if (workout.recordsCount > 0) {
      const labelWidth = ctx.measureText(label).width;
      ctx.shadowColor = 'transparent';
      ctx.font = `800 26px ${FONT_HEADLINE}`;
      setLetterSpacing(ctx, 3);
      const badgeX = CONTENT_X + labelWidth + 28;
      const badgePadding = 44;
      let badge = recordsLabel(workout.recordsCount);
      if (badgeX + ctx.measureText(badge).width + badgePadding > CONTENT_X + CONTENT_WIDTH) {
        badge = compactRecordsLabel(workout.recordsCount);
      }
      const badgeWidth = ctx.measureText(badge).width + badgePadding;
      ctx.fillStyle = COLORS.volt;
      roundedRectPath(ctx, badgeX, labelY - 33, badgeWidth, 48, 24);
      ctx.fill();
      ctx.fillStyle = COLORS.background;
      ctx.fillText(badge, badgeX + 22, labelY + 1);
      ctx.shadowColor = TEXT_SHADOW;
    }

    // Date and gym
    const meta = [
      workout.completedAt ? format(workout.completedAt, 'd MMMM yyyy', { locale: pl }) : null,
      workout.gymName || null,
    ]
      .filter(Boolean)
      .join('  ·  ');
    if (meta) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = `600 38px ${FONT_BODY}`;
      setLetterSpacing(ctx, 0);
      ctx.fillText(fitEllipsis(ctx, meta, CONTENT_WIDTH), CONTENT_X, META_Y);
    }

    // Stats row
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(244, 241, 233, 0.22)';
    ctx.fillRect(CONTENT_X, DIVIDER_Y, CONTENT_WIDTH, 2);

    const tiles = buildTiles(workout.stats);
    if (tiles.length > 0) {
      const labelFont = `700 24px ${FONT_HEADLINE}`;
      ctx.font = labelFont;
      setLetterSpacing(ctx, 3);
      const labelWidths = tiles.map(tile => ctx.measureText(tile.label).width);

      // One size for every number, so the row reads as a set: the largest at which the tiles
      // (each as wide as its number or its label) still fit with a minimum gap between them.
      let valueSize = 112;
      let tileWidths: number[] = [];
      setLetterSpacing(ctx, 0);
      for (; valueSize > 56; valueSize -= 2) {
        ctx.font = `800 ${valueSize}px ${FONT_DISPLAY}`;
        tileWidths = tiles.map((tile, i) => Math.max(ctx.measureText(tile.value).width, labelWidths[i]));
        const total = tileWidths.reduce((sum, w) => sum + w, 0);
        if (total + MIN_TILE_GAP * (tiles.length - 1) <= CONTENT_WIDTH) break;
      }

      // Space-between: first tile on the left edge, last on the right, equal gaps in between.
      const spare = CONTENT_WIDTH - tileWidths.reduce((sum, w) => sum + w, 0);
      const gap = tiles.length > 1 ? spare / (tiles.length - 1) : 0;

      let x = CONTENT_X;
      tiles.forEach((tile, i) => {
        ctx.fillStyle = COLORS.text;
        ctx.font = `800 ${valueSize}px ${FONT_DISPLAY}`;
        setLetterSpacing(ctx, 0);
        ctx.fillText(tile.value, x, STATS_VALUE_Y);

        ctx.fillStyle = COLORS.muted;
        ctx.font = labelFont;
        setLetterSpacing(ctx, 3);
        ctx.fillText(tile.label, x, STATS_LABEL_Y);

        x += tileWidths[i] + gap;
      });
    }

    return await canvasToPngBlob(canvas);
  } finally {
    photo.close();
  }
}
