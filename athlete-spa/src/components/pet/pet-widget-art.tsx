import { renderToStaticMarkup } from 'react-dom/server';
import type { PetWidgetLook } from '@/lib/pet-widget';
import type { PetMood } from '@/models/types/pet';
import { PetAvatar } from './PetAvatar';
import petCss from './pet.css?inline';

/**
 * Draws the pet for the home-screen widget: the same PetAvatar as in the app,
 * rasterised to one PNG per face. The widget can't run the avatar's CSS
 * animations, so each face is a still.
 */

const MOODS: PetMood[] = ['energetic', 'happy', 'hungry', 'sad', 'lazy', 'sleepy'];
const SIZE = 288;

/**
 * A still has no animation to bring in what only shows mid-loop (the tear,
 * the Zzz, the drool) or to hold a pose, so those are pinned here to a
 * telling frame of their keyframes in pet.css.
 */
const STILL_CSS = `
.pet * { animation: none !important; transition: none !important; }
.pet[data-mood='energetic'][data-action='idle'] .pet-jump { transform: translateY(-5px) scale(0.99, 1.02); }
.pet[data-mood='energetic'][data-action='idle'] .pet-arm { transform: rotate(40deg); }
.pet[data-mood='hungry'][data-action='idle'] .pet-drool { opacity: 0.95; }
.pet[data-mood='hungry'][data-action='idle'] .pet-rumble { opacity: 0.9; }
.pet[data-mood='sad'][data-action='idle'] .pet-tear { opacity: 0.95; transform: translateY(6px); }
.pet[data-mood='lazy'][data-action='idle'] .pet-pose { transform: rotate(4deg) translateY(1.5px); }
.pet[data-mood='sleepy'][data-action='idle'] .pet-pose { transform: rotate(9deg) translateY(3px); }
.pet[data-mood='sleepy'][data-action='idle'] .pet-zzz { opacity: 0.9; }
.pet[data-action='pet'] .pet-pose { transform: rotate(-5deg) translateY(1px); }
`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The pet drawing did not load'));
    image.src = src;
  });
}

async function rasterise(svg: string): Promise<string> {
  // As a standalone image the SVG sees none of the page's CSS: carry it inside.
  // CDATA, because the stylesheet may hold `<` and the image is parsed as XML.
  const style = `<style><![CDATA[${petCss}${STILL_CSS}]]></style>`;
  const standalone = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/(<svg[^>]*>)/, match => match + style);
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(standalone)}`);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No 2D canvas');
  context.drawImage(image, 0, 0, SIZE, SIZE);
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

/** Base64 PNGs keyed by face: the six moods, and `pet` for the moment it is being stroked. */
export async function renderPetWidgetArt(look: PetWidgetLook): Promise<Record<string, string>> {
  const art: Record<string, string> = {};
  for (const mood of MOODS) {
    art[mood] = await rasterise(renderToStaticMarkup(<PetAvatar {...look} mood={mood} size={SIZE} />));
  }
  art.pet = await rasterise(renderToStaticMarkup(<PetAvatar {...look} mood="happy" action="pet" size={SIZE} />));
  return art;
}
