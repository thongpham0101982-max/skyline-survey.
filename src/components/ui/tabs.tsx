"use client"

import * as React from "react";
import { createContext, useContext, useState } from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (val: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (val: string) => void
  className?: string
  children: React.ReactNode
}

function Tabs({ value, defaultValue = "", onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const activeValue = value !== undefined ? value : internalValue

  const handleValueChange = (val: string) => {
    if (value === undefined) setInternalValue(val)
    onValueChange?.(val)
  }

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 text-slate-600",
        className
      )}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  className,
  children,
  icon,
}: {
  value: string
  className?: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("TabsTrigger must be used inside Tabs")

  const isActive = ctx.value === value

  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer select-none",
        isActive
          ? "bg-white text-[#003B3A] shadow-xs"
          : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function TabsContent({
  value,
  className,
  children,
}: {
  value: string
  className?: string
  children: React.ReactNode
}) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error("TabsContent must be used inside Tabs")

  if (ctx.value !== value) return null

  return (
    <div className={cn("animate-in fade-in-50 duration-200 outline-none", className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
