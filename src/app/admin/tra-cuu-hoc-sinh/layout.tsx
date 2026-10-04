"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, Award, Trophy, Search, FileText } from "lucide-react";

interface SubNavTab {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
}

const NAV_TABS: SubNavTab[] = [
  {
    name: "Tra cứu Hồ sơ",
    href: "/admin/tra-cuu-hoc-sinh/ho-so",
    icon: UserCheck,
    description: "Hồ sơ cá nhân, lớp, cơ sở & liên hệ",
  },
  {
    name: "Kết quả học tập (6 kỳ)",
    href: "/admin/tra-cuu-hoc-sinh/ket-qua",
    icon: FileText,
    description: "KSDV, KSĐN, GK1, CK1, GK2, CK2",
    badge: "6 mốc",
  },
  {
    name: "Xếp loại học tập",
    href: "/admin/tra-cuu-hoc-sinh/xep-loai",
    icon: Award,
    description: "HK1, HK2, Cả năm & Tiêu chuẩn TT22/27",
  },
  {
    name: "Tra cứu Thành tích",
    href: "/admin/tra-cuu-hoc-sinh/thanh-tich",
    icon: Trophy,
    description: "Kỳ thi Olympic, KHKT, STEM & Năng khiếu",
    badge: "Vinh danh",
  },
];

export default function TraCuuHocSinhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A19A] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold tracking-wide backdrop-blur-md mb-3 border border-white/20">
            <Search className="w-3.5 h-3.5 text-teal-200" />
            <span>HỆ THỐNG TRA CỨU HỌC SINH TOÀN DIỆN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Tra cứu & Theo dõi Học sinh Sky-Line
          </h1>
          <p className="mt-2 text-sm sm:text-base text-teal-50/90 leading-relaxed">
            Tra cứu hồ sơ cá nhân 360°, theo dõi đường cong tăng trưởng kết quả học tập qua 6 mốc đánh giá (KSDV, KSĐN, GK1, CK1, GK2, CK2), bảng xếp loại TT22/TT27 và bảng vàng thành tích các cấp.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 bottom-0 -mb-10 w-48 h-48 rounded-full bg-teal-400/20 blur-2xl pointer-events-none" />
      </div>

      {/* Pill Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {NAV_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group relative p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isActive
                  ? "bg-white border-[#00A19A] shadow-md ring-2 ring-[#00A19A]/20"
                  : "bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-[#00A19A] text-white"
                        : "bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-[#00A19A]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {tab.badge && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-teal-100 text-[#003B3A]"
                          : "bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-[#00A19A]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <h3
                  className={`text-sm font-bold ${
                    isActive ? "text-[#003B3A]" : "text-slate-700 group-hover:text-slate-900"
                  }`}
                >
                  {tab.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {tab.description}
                </p>
              </div>

              {/* Bottom active indicator */}
              {isActive && (
                <div className="mt-3 h-1 w-full rounded-full bg-[#00A19A]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="min-h-[500px]">{children}</div>
    </div>
  );
}
