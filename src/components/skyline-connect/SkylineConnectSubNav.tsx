"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Compass,
  Users,
  Award,
  BookOpen,
  Shield,
  Search,
  Plus,
  Lightbulb,
} from "lucide-react";

interface SubNavProps {
  showAdminLink?: boolean;
  onOpenComposer?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

export function SkylineConnectSubNav({
  showAdminLink = false,
  onOpenComposer,
  searchValue,
  onSearchChange,
}: SubNavProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";

  const navItems = [
    {
      href: "/teacher/skyline-connect",
      label: "Bức tường ý tưởng",
      icon: Sparkles,
      exact: true,
    },
    {
      href: "/teacher/skyline-connect/explore",
      label: "Khám phá",
      icon: Compass,
      exact: false,
    },
    {
      href: "/teacher/skyline-connect/groups-projects",
      label: "Nhóm & Dự án",
      icon: Users,
      exact: false,
    },
    {
      href: "/teacher/skyline-connect/hall-of-fame",
      label: "Bảng vàng",
      icon: Award,
      exact: false,
    },
    {
      href: "/teacher/skyline-connect/my-space",
      label: "Không gian của tôi",
      icon: BookOpen,
      exact: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] px-3 sm:px-4 shadow-2xs sticky top-0 z-20">
      <div className="flex items-center justify-between gap-3 min-h-[56px] flex-wrap lg:flex-nowrap">
        {/* Left: Brand Identity + Facebook-style Pill Search */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:flex-initial">
          <Link
            href="/teacher/skyline-connect"
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#123E4A] to-[#159EAA] text-white flex items-center justify-center shadow-xs">
              <Lightbulb className="w-5 h-5 text-[#D6A74A] fill-[#D6A74A]/30" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-extrabold text-[#123E4A] leading-tight">
                Sky-Line Connect
              </div>
              <div className="text-[11px] text-slate-500 leading-none">
                Cộng đồng sáng tạo AI
              </div>
            </div>
          </Link>

          {typeof onSearchChange === "function" && (
            <div className="relative flex-1 sm:w-60 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm trên Sky-Line Connect..."
                aria-label="Tìm kiếm trên Bức tường ý tưởng AI"
                className="w-full rounded-full bg-[#F0F2F5] hover:bg-[#E4E6EB]/70 focus:bg-white border border-transparent focus:border-[#159EAA] pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-500 focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* Center: Facebook-style Tab Bar with Active Bottom Indicator */}
        <nav
          aria-label="Điều hướng Sky-Line Connect"
          className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar order-3 lg:order-2 w-full lg:w-auto border-t lg:border-t-0 border-slate-100 pt-1 lg:pt-0"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold transition-colors whitespace-nowrap rounded-xl hover:bg-[#F0F2F5] ${
                  isActive ? "text-[#159EAA]" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-[#159EAA]" : "text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full bg-[#159EAA]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 order-2 lg:order-3">
          {showAdminLink && (
            <Link
              href="/admin/skyline-connect"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-[#123E4A] bg-[#F0F2F5] hover:bg-[#E4E6EB] transition-colors whitespace-nowrap"
              title="Điều phối & Quản trị Sky-Line Connect"
            >
              <Shield className="w-3.5 h-3.5 text-[#159EAA]" />
              <span className="hidden md:inline">Điều phối</span>
            </Link>
          )}

          {onOpenComposer && (
            <button
              type="button"
              onClick={onOpenComposer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-[#159EAA] hover:bg-[#11828C] text-white shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Gắn ý tưởng lên tường</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
