"use client"

import * as React from "react"

import { useUserProfile } from "@/contexts/UserProfileContext"

type ThemeColor = "zinc" | "red" | "rose" | "orange" | "green" | "blue" | "yellow" | "violet"

type ThemeColorProviderProps = {
    children: React.ReactNode
    defaultThemeColor?: ThemeColor
    storageKey?: string
}

type ThemeColorProviderState = {
    themeColor: ThemeColor
    setThemeColor: (theme: ThemeColor) => void
}

const initialState: ThemeColorProviderState = {
    themeColor: "zinc",
    setThemeColor: () => null,
}

const ThemeColorProviderContext = React.createContext<ThemeColorProviderState>(initialState)

export function ThemeColorProvider({
    children,
    defaultThemeColor = "zinc",
    storageKey = "vite-ui-theme-color",
    ...props
}: ThemeColorProviderProps) {
    const [themeColor, setThemeColor] = React.useState<ThemeColor>(
        () => (localStorage.getItem(storageKey) as ThemeColor) || defaultThemeColor
    )

    React.useEffect(() => {
        const root = window.document.body
        root.classList.remove("theme-zinc", "theme-red", "theme-rose", "theme-orange", "theme-green", "theme-blue", "theme-yellow", "theme-violet")
        root.classList.add(`theme-${themeColor}`)
    }, [themeColor])

    const value = {
        themeColor,
        setThemeColor: (color: ThemeColor) => {
            localStorage.setItem(storageKey, color)
            setThemeColor(color)
        },
    }

    return (
        <ThemeColorProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeColorProviderContext.Provider>
    )
}

export const useThemeColor = () => {
    const context = React.useContext(ThemeColorProviderContext)

    if (context === undefined) {
        throw new Error("useThemeColor must be used within a ThemeColorProvider")
    }

    return context
}
