import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Search, Sparkles, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/chat/types';
import { LEAD_TRAINER_ID } from '@/lib/chat/constants';
import { TrainerAvatar } from '@/components/trainers/TrainerAvatar';
import { haptic } from '@/lib/haptics';

interface NewConversationDialogProps {
  potentialContacts: UserProfile[];
  isLoading: boolean;
  onStartConversation: (userId: string) => Promise<void>;
  trigger?: React.ReactNode;
}

export function NewConversationDialog({
  potentialContacts,
  isLoading,
  onStartConversation,
  trigger,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (potentialContacts ?? []).filter(
      c => !q || (c.name || '').toLowerCase().includes(q)
    );
  }, [potentialContacts, search]);

  const handleSelect = async (userId: string) => {
    haptic('tap');
    setSubmittingId(userId);
    try {
      await onStartConversation(userId);
      setOpen(false);
      setSearch('');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="h-9 gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Nowa rozmowa</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl p-5 sm:p-6">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="font-display text-2xl font-bold uppercase tracking-tight">
            Nowa wiadomość
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Wybierz trenera, z którym chcesz rozpocząć bezpośrednią rozmowę.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        {potentialContacts.length > 3 && (
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj trenera po nazwisku…"
              className="h-10 rounded-xl pl-9 text-xs"
            />
          </div>
        )}

        {/* List of Contacts */}
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {isLoading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(contact => {
              const isLead = contact.id === LEAD_TRAINER_ID;
              const isSubmitting = submittingId === contact.id;

              return (
                <button
                  key={contact.id}
                  type="button"
                  disabled={submittingId !== null}
                  onClick={() => handleSelect(contact.id)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98]',
                    isLead
                      ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                      : 'border-border/60 bg-card hover:bg-secondary/70'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <TrainerAvatar trainer={contact} className="h-11 w-11 text-base ring-2 ring-background" />
                      {isLead && (
                        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[8px] font-black text-primary-foreground">
                          ★
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-foreground">{contact.name}</p>
                        {isLead && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                            <Sparkles className="h-2.5 w-2.5" /> Polecany
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.role === 'trainer' ? 'Trener personalny' : 'Sportowiec'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <span className="text-xs font-semibold text-primary">Rozpocznij</span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nie znaleziono kontaktów do rozpoczęcia rozmowy.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
