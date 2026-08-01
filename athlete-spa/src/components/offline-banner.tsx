import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Strip under the header shown while the backend is unreachable.
 *
 * Without it a failed fetch is indistinguishable from "you have no data": the
 * screens render their empty states and the athlete has no way to tell that
 * what they are looking at is a cached snapshot rather than the truth.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence initial={false}>
      {!isOnline && (
        <motion.div
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-20 shrink-0 overflow-hidden border-b border-amber-500/30 bg-amber-500/10"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-center">
            <CloudOff className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-[11px] font-semibold leading-tight text-amber-600 dark:text-amber-400">
              Brak połączenia — widzisz ostatnio zapisane dane
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
