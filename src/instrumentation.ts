/** Runs once when the Next.js server process starts. */
export async function register() {
  // Background jobs need Node (mongoose) and a serving process — not the edge
  // runtime and not `next build`.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { startWelcomeMessageScheduler } = await import('@/lib/welcome-message');
  startWelcomeMessageScheduler();
}
