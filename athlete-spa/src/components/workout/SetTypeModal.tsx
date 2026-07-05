'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SetType } from '@/lib/types';
import { SET_TYPE_CONFIG, getSetTypeConfig, getAllSetTypes } from '@/lib/set-type-config';
import { cn } from '@/lib/utils';

interface SetTypeModalProps {
  value: SetType;
  onChange: (value: SetType) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function SetTypeModal({ value, onChange, disabled, compact = false }: SetTypeModalProps) {
  const [open, setOpen] = useState(false);
  const currentConfig = getSetTypeConfig(value);
  const Icon = currentConfig.icon;

  const handleSelect = (type: SetType) => {
    onChange(type);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "sm"}
          disabled={disabled}
          className={cn(
            "h-8 transition-colors",
            compact ? "w-8 p-0" : "px-2 gap-1",
            currentConfig.bgColorClass,
            currentConfig.borderColorClass,
            currentConfig.colorClass
          )}
        >
          <Icon className={cn("h-4 w-4", compact ? "" : "mr-1")} />
          {!compact && <span className="text-xs truncate max-w-[60px]">{currentConfig.shortName}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wybierz typ serii</DialogTitle>
          <DialogDescription>
            Każdy typ serii ma inne przeznaczenie w treningu.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {getAllSetTypes().map((config) => {
            const TypeIcon = config.icon;
            const isSelected = config.type === value;

            return (
              <button
                key={config.type}
                type="button"
                onClick={() => handleSelect(config.type)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                  "hover:bg-secondary/50",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                  config.borderColorClass
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0",
                  config.bgColorClass
                )}>
                  <TypeIcon className={cn("h-5 w-5", config.colorClass)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-semibold", config.colorClass)}>
                      {config.name}
                    </span>
                    {isSelected && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        Wybrano
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {config.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact button version for inline use in tables/grids
interface SetTypeButtonProps {
  value: SetType;
  onChange: (value: SetType) => void;
  disabled?: boolean;
}

export function SetTypeButton({ value, onChange, disabled }: SetTypeButtonProps) {
  return <SetTypeModal value={value} onChange={onChange} disabled={disabled} compact />;
}

// Display-only badge for showing set type without interaction
interface SetTypeBadgeProps {
  type: SetType;
  showLabel?: boolean;
}

export function SetTypeBadge({ type, showLabel = false }: SetTypeBadgeProps) {
  const config = getSetTypeConfig(type);
  const Icon = config.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
      config.bgColorClass,
      config.colorClass,
      config.borderColorClass,
      "border"
    )}>
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.shortName}</span>}
    </div>
  );
}