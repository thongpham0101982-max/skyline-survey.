"use client"
import { Menu } from "lucide-react"

export function MobileMenuTrigger() {
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent("toggleSidebar"))
  }

  return (
    <button
      onClick={handleToggle}
      className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all focus:outline-none"
      aria-label="Toggle Menu"
    >
      <Menu className="w-6 h-6 text-[#48BFE3]" />
    </button>
  )
}
