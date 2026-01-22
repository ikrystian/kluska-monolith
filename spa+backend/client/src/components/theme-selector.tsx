"use client"

import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

export function ThemeSelector() {
    const { theme, setTheme } = useTheme()

    return (
        <RadioGroup
            defaultValue={theme}
            onValueChange={(value) => setTheme(value)}
            className="grid grid-cols-3 gap-4"
        >
            <div>
                <RadioGroupItem
                    value="light"
                    id="theme-light"
                    className="peer sr-only"
                />
                <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                    <Sun className="mb-3 h-6 w-6" />
                    Jasny
                </Label>
            </div>
            <div>
                <RadioGroupItem
                    value="dark"
                    id="theme-dark"
                    className="peer sr-only"
                />
                <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                    <Moon className="mb-3 h-6 w-6" />
                    Ciemny
                </Label>
            </div>
            <div>
                <RadioGroupItem
                    value="system"
                    id="theme-system"
                    className="peer sr-only"
                />
                <Label
                    htmlFor="theme-system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                    <Monitor className="mb-3 h-6 w-6" />
                    System
                </Label>
            </div>
        </RadioGroup>
    )
}
