import * as React from "react"
<<<<<<< HEAD
import * as SwitchPrimitive from "@radix-ui/react-switch"
=======
import * as SwitchPrimitives from "@radix-ui/react-switch"
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
<<<<<<< HEAD
    React.ElementRef<typeof SwitchPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
        className={cn(
            "peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
=======
    React.ElementRef<typeof SwitchPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
    <SwitchPrimitives.Root
        className={cn(
            "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
            className
        )}
        {...props}
        ref={ref}
    >
<<<<<<< HEAD
        <SwitchPrimitive.Thumb
=======
        <SwitchPrimitives.Thumb
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)
            className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
            )}
        />
<<<<<<< HEAD
    </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName
=======
    </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName
>>>>>>> 47f4578 (feat: Revamp workout detail page with copy/schedule/start actions, introduce exercise progress tracking, gamification, and new UI components.)

export { Switch }
