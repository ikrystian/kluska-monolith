
import * as React from "react"
import { ResponsiveContainer } from "recharts"

import { cn } from "@/lib/utils"

const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        config?: Record<string, any>
        children: React.ComponentProps<typeof ResponsiveContainer>["children"]
    }
>(({ className, children, config, ...props }, ref) => {
    return (
        <div ref={ref} className={cn("", className)} {...props}>
            <style dangerouslySetInnerHTML={{
                __html: `
            :root {
                ${Object.entries(config || {}).map(([key, value]) => {
                    return `--color-${key}: ${value.color};`
                }).join('\n')}
            }
        `}} />
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    )
})
ChartContainer.displayName = "Chart"

const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {label}
                        </span>
                        <span className="font-bold text-muted-foreground">
                            {payload[0].value}
                        </span>
                    </div>
                </div>
            </div>
        )
    }
    return null
}

const ChartTooltipContent = () => {
    // This is a placeholder for the more complex chart tooltip content from shadcn
    // For now we just return null or a simple implementation if needed, but Recharts handles it mostly.
    return null;
}


export { ChartContainer, ChartTooltip, ChartTooltipContent }
