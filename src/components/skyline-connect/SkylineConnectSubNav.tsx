"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Compass, Users, Award, BookOpen, Shield } from "lucide-react";

interface SubNavProps {
  showAdminLink?: boolean;
  onOpenComposer?: () => void;
}

export function SkylineConnectSubNav({ showAdminLink = false, onOpenComposer }: SubNavProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";

  const navItems = [
    {
      href: "/teacher/skyline-connect",
      label: "Bức tường ý tưởng AI",
      icon: Sparkles,
      exact: true,
    },
    {
      href: "/teacher/skyline-connect/explore",
      label: "Khám phá sáng tạo",
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
      label: "Bảng vàng sáng tạo",
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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] px-3 py-2 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
      <nav aria-label="Điều hướng Sky-Line Connect" className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#123E4A] text-white shadow-2xs"
                  : "text-slate-600 hover:text-[#123E4A] hover:bg-slate-100/80"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#5EEAD4]" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {showAdminLink && (
          <Link
            href="/admin/skyline-connect"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#123E4A] bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 border border-[#99F6E4] transition-all whitespace-nowrap ml-1"
          >
            <Shield className="w-3.5 h-3.5 text-[#159EAA]" />
            <span>Điều phối & Quản trị</span>
          </Link>
        )}
      </nav>

      {onOpenComposer && (
        <button
          type="button"
          onClick={onOpenComposer}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#159EAA] hover:bg-[#11828C] text-white shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <span>+ Gắn ý tưởng lên tường</span>
        </button>
      )}
    </div>
  );
}
