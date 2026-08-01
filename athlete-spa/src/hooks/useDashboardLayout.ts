import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/lib/db-hooks';

/**
 * Dashboard layout customization.
 *
 * Every rearrangeable/hideable section on the athlete dashboard is identified
 * by a stable id. The user's preferred order + visibility is persisted in
 * localStorage, scoped per user id, so each account on the device keeps its
 * own layout (guests included).
 */

export const DASHBOARD_SECTION_IDS = [
  'bento',
  'challenges',
  'recent-goals',
  'trainer-sessions',
  'plans',
  'habits',
  'planned',
  'quick-actions',
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export interface DashboardSectionState {
  id: DashboardSectionId;
  visible: boolean;
}

const DEFAULT_LAYOUT: DashboardSectionState[] = DASHBOARD_SECTION_IDS.map(id => ({
  id,
  visible: true,
}));

/**
 * Reconciles a stored layout with the sections the app currently knows about:
 * drops ids that no longer exist, appends newly added sections at the end
 * (visible by default) and guards against malformed entries.
 */
function normalizeStoredLayout(stored: unknown): DashboardSectionState[] {
  if (!Array.isArray(stored)) return DEFAULT_LAYOUT.map(s => ({ ...s }));

  const known = new Set<string>(DASHBOARD_SECTION_IDS);
  const result: DashboardSectionState[] = [];

  for (const entry of stored) {
    const id = (entry as { id?: unknown } | null)?.id;
    if (typeof id === 'string' && known.has(id) && !result.some(s => s.id === id)) {
      result.push({
        id: id as DashboardSectionId,
        visible: (entry as { visible?: unknown }).visible !== false,
      });
    }
  }

  for (const def of DEFAULT_LAYOUT) {
    if (!result.some(s => s.id === def.id)) result.push({ ...def });
  }

  return result;
}

export function useDashboardLayout() {
  const { user } = useUser();
  const storageKey = user?.uid ? `athlete-spa:dashboard-layout:${user.uid}` : null;

  const [layout, setLayout] = useState<DashboardSectionState[]>(DEFAULT_LAYOUT);
  const [isEditing, setIsEditing] = useState(false);

  // (Re)load the stored layout whenever the active user changes.
  useEffect(() => {
    setIsEditing(false);
    if (!storageKey) {
      setLayout(DEFAULT_LAYOUT);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setLayout(raw ? normalizeStoredLayout(JSON.parse(raw)) : DEFAULT_LAYOUT);
    } catch {
      setLayout(DEFAULT_LAYOUT);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: DashboardSectionState[]) => {
      setLayout(next);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // Storage full/blocked — keep the in-memory layout for this session.
        }
      }
    },
    [storageKey]
  );

  const toggleSection = useCallback(
    (id: DashboardSectionId) => {
      persist(layout.map(s => (s.id === id ? { ...s, visible: !s.visible } : s)));
    },
    [layout, persist]
  );

  /** Applies a new section order (called by the drag & drop list). */
  const reorderSections = useCallback(
    (ids: DashboardSectionId[]) => {
      const byId = new Map(layout.map(s => [s.id, s]));
      const next = ids.map(id => byId.get(id)).filter((s): s is DashboardSectionState => !!s);
      if (next.length === layout.length) persist(next);
    },
    [layout, persist]
  );

  const resetLayout = useCallback(() => {
    persist(DEFAULT_LAYOUT.map(s => ({ ...s })));
  }, [persist]);

  return {
    layout,
    isEditing,
    setIsEditing,
    toggleSection,
    reorderSections,
    resetLayout,
  };
}
