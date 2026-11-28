"use client"
import { Menu } from "lucide-react"

export function MobileMenuTrigger() {
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent("toggleSidebar"))
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="md:hidden w-10 h-10 -ml-1.5 flex items-center justify-center text-[#003B3A] hover:bg-[#F0FDFA] active:bg-[#CCFBF1]/60 rounded-xl transition-colors focus:outline-none cursor-pointer"
      aria-label="Mở danh mục chức năng"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}
