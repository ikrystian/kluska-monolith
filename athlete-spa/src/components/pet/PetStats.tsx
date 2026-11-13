import { Drumstick, Heart, Zap, type LucideIcon } from 'lucide-react';
import type { PetView } from '@/models/types/pet';

function Bar({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: number; color: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
          <span className="truncate">{label}</span>
        </span>
        <span className="text-xs font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

/** Trzy wskaźniki: sytość i radość to opieka, forma to treningi właściciela. */
export function PetStats({ pet }: { pet: PetView }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-card p-4">
      <Bar icon={Drumstick} label="Sytość" value={pet.hunger} color="hsl(var(--food))" />
      <Bar icon={Heart} label="Radość" value={pet.joy} color="hsl(var(--primary))" />
      <Bar icon={Zap} label="Forma" value={pet.form} color="hsl(var(--volt))" />
    </div>
  );
}
