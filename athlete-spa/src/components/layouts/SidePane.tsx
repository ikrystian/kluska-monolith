import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RouteFallback } from '@/components/route-fallback';
import { ScreenErrorBoundary } from '@/components/error-boundary';
import { RequireFullAccount } from '@/components/guest-gate';
import { getScreenTitle } from '@/lib/athlete-nav';

// Same modules as the routes in App.tsx, so each is still one shared chunk.
const MenuPage = lazy(() => import('@/pages/athlete/Menu'));
const WorkoutsPage = lazy(() => import('@/pages/athlete/Workouts'));
const HistoryPage = lazy(() => import('@/pages/athlete/History'));
const RunningPage = lazy(() => import('@/pages/athlete/Running'));
const TrainersPage = lazy(() => import('@/pages/athlete/Trainers'));
const ChallengesPage = lazy(() => import('@/pages/athlete/Challenges'));
const KnowledgeZonePage = lazy(() => import('@/pages/athlete/KnowledgeZone'));
const ExercisesPage = lazy(() => import('@/pages/athlete/Exercises'));
const SocialPage = lazy(() => import('@/pages/athlete/Social'));

export const MENU_PATH = '/athlete/menu';

/** Detail screens and the list they were opened from. */
const LIST_OF_DETAIL: { match: RegExp; list: string }[] = [
  { match: /^\/athlete\/workouts\/(?!create$)[^/]+$/, list: '/athlete/workouts' },
  { match: /^\/athlete\/history\/[^/]+$/, list: '/athlete/history' },
  { match: /^\/athlete\/running\/(?!record$)(strava\/)?[^/]+$/, list: '/athlete/running' },
  { match: /^\/athlete\/trainers\/[^/]+$/, list: '/athlete/trainers' },
  { match: /^\/athlete\/challenges\/[^/]+$/, list: '/athlete/challenges' },
  { match: /^\/athlete\/knowledge-zone\/(?!manage$)[^/]+$/, list: '/athlete/knowledge-zone' },
  { match: /^\/athlete\/exercise\/[^/]+$/, list: '/athlete/exercises' },
  { match: /^\/athlete\/social\/profile\/[^/]+$/, list: '/athlete/social' },
];

/**
 * What the left pane shows next to `pathname`: the list a detail screen came
 * from (so the next item is one tap away), and the menu everywhere else.
 */
export function getSidePanePath(pathname: string): string {
  return LIST_OF_DETAIL.find(rule => rule.match.test(pathname))?.list ?? MENU_PATH;
}

/**
 * Left half of the tablet layout. It renders a regular screen under a location
 * of its own, so that screen reads its own path while links inside it still
 * navigate the app — the result opens in the right pane.
 */
export function SidePane({ path }: { path: string }) {
  const title = getScreenTitle(path);

  return (
    <aside className="flex h-dvh min-w-0 flex-col overflow-hidden border-r border-border/70 bg-background">
      <header className="h-[var(--app-top)] shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex h-[var(--header-h)] items-center px-4">
          <h2 className="truncate font-display text-[1.75rem] font-bold uppercase leading-none">
            <span className="text-volt">#</span>
            {title}
          </h2>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Keyed by path: switching between the menu and a list starts the
            new screen from the top instead of inheriting the scroll offset. */}
        <div key={path} className="h-full animate-fade-in">
          <ScreenErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              {/* Descendant routes: paths are relative to the /athlete route this layout renders under. */}
              <Routes location={path}>
                <Route path="menu" element={<MenuPage />} />
                <Route path="workouts" element={<WorkoutsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="running" element={<RunningPage />} />
                <Route path="trainers" element={<TrainersPage />} />
                <Route path="knowledge-zone" element={<KnowledgeZonePage />} />
                <Route path="exercises" element={<ExercisesPage />} />
                <Route element={<RequireFullAccount />}>
                  <Route path="challenges" element={<ChallengesPage />} />
                  <Route path="social" element={<SocialPage />} />
                </Route>
              </Routes>
            </Suspense>
          </ScreenErrorBoundary>
        </div>
      </div>
    </aside>
  );
}
