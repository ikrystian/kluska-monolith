"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { useThemeColor } from "@/contexts/ThemeColorContext"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip"

const availableColors = [
    { name: "Zinc", value: "zinc", color: "bg-zinc-950" },
    { name: "Red", value: "red", color: "bg-red-600" },
    { name: "Rose", value: "rose", color: "bg-rose-600" },
    { name: "Orange", value: "orange", color: "bg-orange-500" },
    { name: "Green", value: "green", color: "bg-green-600" },
    { name: "Blue", value: "blue", color: "bg-blue-600" },
    { name: "Yellow", value: "yellow", color: "bg-yellow-500" },
    { name: "Violet", value: "violet", color: "bg-violet-600" },
] as const

export function ThemeColorSelector() {
    const { themeColor, setThemeColor } = useThemeColor()

    return (
        <div className="grid grid-cols-4 gap-2">
            <TooltipProvider>
                {availableColors.map((item) => (
                    <Tooltip key={item.value}>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "h-9 w-full justify-start px-2",
                                    themeColor === item.value && "border-2 border-primary"
                                )}
                                onClick={() => setThemeColor(item.value)}
                            >
                                <div
                                    className={cn(
                                        "mr-2 h-4 w-4 rounded-full",
                                        item.color
                                    )}
                                />
                                <span className="text-xs capitalize">{item.name}</span>
                                {themeColor === item.value && (
                                    <Check className="ml-auto h-4 w-4 opacity-100" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {item.name}
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    )
}
