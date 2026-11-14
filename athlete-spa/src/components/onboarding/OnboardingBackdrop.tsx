import './onboarding.css';
import logoMark from '@/assets/logo-mark.png';

/** Where the ember glow sits for each step (welcome → summary), in % of its own size. */
const EMBER_PATH = [
  [0, 0],
  [-18, 10],
  [-46, 4],
  [-70, 16],
  [-52, 34],
  [-24, 26],
  [-6, 40],
  [-34, 14],
];

/**
 * Ambient layer behind the whole wizard. The ember glow travels a little with
 * every step and the lime one grows towards the finish, so progress is felt
 * even without looking at the bar.
 */
export function OnboardingBackdrop({ step, total }: { step: number; total: number }) {
  const [x, y] = EMBER_PATH[Math.min(step, EMBER_PATH.length - 1)];
  const progress = total > 1 ? step / (total - 1) : 0;

  return (
    <div className="onb-backdrop" aria-hidden>
      <div className="onb-grid" />
      <div className="onb-glow onb-glow--ember" style={{ transform: `translate3d(${x}%, ${y}%, 0)` }}>
        <span />
      </div>
      <div
        className="onb-glow onb-glow--lime"
        style={{
          transform: `translate3d(${progress * 30}%, ${progress * -22}%, 0) scale(${0.85 + progress * 0.5})`,
          opacity: 0.45 + progress * 0.55,
        }}
      >
        <span />
      </div>
    </div>
  );
}

/** Branded loader used while the profile is being checked. */
export function OnboardingLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background" role="status" aria-label="Ładowanie">
      <div className="relative grid h-20 w-20 place-items-center">
        <span className="onb-loader-ring absolute inset-0 rounded-full border-2 border-primary" aria-hidden />
        <img src={logoMark} alt="" className="relative w-12 animate-pulse" />
      </div>
    </div>
  );
}
