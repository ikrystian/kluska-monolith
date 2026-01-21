import { SetType } from '@/types';
import { getSetTypeConfig } from '@/lib/set-type-config';
import { cn } from '@/lib/utils';

interface SetTypeBadgeProps {
    type: SetType;
    showLabel?: boolean;
}

export function SetTypeBadge({ type, showLabel = false }: SetTypeBadgeProps) {
    const config = getSetTypeConfig(type);
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                config.bgColorClass,
                config.colorClass,
                config.borderColorClass,
                'border'
            )}
        >
            <Icon className="h-3 w-3" />
            {showLabel && <span>{config.shortName}</span>}
        </div>
    );
}
