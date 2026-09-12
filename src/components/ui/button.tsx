"use client"

import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-bold tracking-tight select-none whitespace-nowrap transition-all duration-200 outline-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#48BFE3] text-white hover:bg-[#38A8CB] focus-visible:ring-[#48BFE3] shadow-xs",
        skyline: "bg-[#003B3A] text-white hover:bg-[#002B2A] focus-visible:ring-[#003B3A] shadow-xs",
        accent: "bg-[#D97706] text-white hover:bg-[#B45309] focus-visible:ring-[#D97706] shadow-xs",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200/80 focus-visible:ring-slate-300",
        outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-slate-200 shadow-2xs",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-200",
        destructive: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-xs",
        link: "text-[#48BFE3] underline-offset-4 hover:underline p-0 h-auto font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs rounded-xl gap-2",
        xs: "h-7 px-2.5 text-[11px] rounded-lg gap-1.5",
        sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
        lg: "h-11 px-6 text-sm rounded-xl gap-2.5",
        icon: "h-9 w-9 p-0 rounded-xl",
        "icon-sm": "h-7 w-7 p-0 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
