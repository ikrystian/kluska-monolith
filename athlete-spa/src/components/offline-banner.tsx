import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, UploadCloud } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePendingMutations } from '@/hooks/usePendingMutations';

/** Polish needs the count to agree with the noun. */
function pendingLabel(count: number): string {
  if (count === 1) return '1 zmiana czeka na wysłanie';
  const lastTwo = count % 100;
  const last = count % 10;
  const usesFewForm = last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return `${count} ${usesFewForm ? 'zmiany czekają' : 'zmian czeka'} na wysłanie`;
}

/**
 * Strip under the header reporting connectivity and unsent work.
 *
 * Without it a failed fetch is indistinguishable from "you have no data": the
 * screens render their empty states and the athlete has no way to tell that
 * what they are looking at is a cached snapshot rather than the truth — nor
 * that the set they just logged is still sitting in a queue.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const pending = usePendingMutations();

  // Once back online with nothing queued there is nothing left to report.
  const visible = !isOnline || pending > 0;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={
            isOnline
              ? 'app-column fixed inset-x-0 top-[var(--app-top)] z-20 overflow-hidden bg-primary text-primary-foreground'
              : 'app-column fixed inset-x-0 top-[var(--app-top)] z-20 overflow-hidden bg-food text-black'
          }
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-center">
            {isOnline ? (
              <UploadCloud className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            ) : (
              <CloudOff className="h-3.5 w-3.5 shrink-0" />
            )}
            <p className="text-xs font-semibold leading-tight">
              {isOnline
                ? `Synchronizacja — ${pendingLabel(pending)}`
                : pending > 0
                  ? `Brak połączenia — ${pendingLabel(pending)}`
                  : 'Brak połączenia — widzisz ostatnio zapisane dane'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
