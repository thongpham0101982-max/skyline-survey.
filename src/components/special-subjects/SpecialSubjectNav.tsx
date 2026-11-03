"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  Sparkles, 
  BarChart3, 
  BookOpen, 
  Layers, 
  Users, 
  ClipboardList, 
  ShieldCheck,
  Heart,
  Compass,
  Shield,
  Coins
} from "lucide-react";

interface SpecialSubjectNavProps {
  title?: string;
  subtitle?: string;
}

function SpecialSubjectNavInner({
  title = "Môn học đặc thù Sky-Line",
  subtitle = "Hệ thống quản lý chương trình, phân công & sổ đánh giá năng lực đặc thù"
}: SpecialSubjectNavProps) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const subjectParam = searchParams?.get("subject");

  const navItems = [
    {
      name: "Dashboard & Báo cáo",
      href: "/admin/special-subjects",
      icon: BarChart3,
      exact: true
    },
    {
      name: "Danh mục Môn (4)",
      href: "/admin/special-subjects/catalogs",
      icon: Layers
    },
    {
      name: "Khung chương trình",
      href: "/admin/special-subjects/curriculums",
      icon: BookOpen
    },
    {
      name: "Phân công giảng dạy",
      href: "/admin/special-subjects/assignments",
      icon: Users
    },
    {
      name: "Giám sát Cảm xúc (1–9)",
      href: "/admin/special-subjects/monitor?subject=CXXH",
      icon: Heart
    },
    {
      name: "Giám sát Giới tính (6–9)",
      href: "/admin/special-subjects/monitor?subject=GDGT",
      icon: Shield
    },
    {
      name: "Giám sát Tài chính (2–9)",
      href: "/admin/special-subjects/monitor?subject=FIN_EDU",
      icon: Coins
    },
    {
      name: "Giám sát Hướng nghiệp (6–12)",
      href: "/admin/special-subjects/monitor?subject=GDHN",
      icon: Compass
    }
  ];

  return (
    <div className="mb-3 space-y-2">
      {/* Sky-Line Deep Pine Brand Banner - Compact & Standard */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] text-white px-4 py-3 shadow-sm border border-teal-800/40">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] tracking-wider uppercase font-bold px-1.5 py-0.2 rounded bg-teal-400/20 text-teal-200 border border-teal-400/30">
                  Sky-Line Curricula
                </span>
                <span className="text-[9px] tracking-wider uppercase font-semibold text-white/80">
                  Niên khóa 2026-2027
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                {title}
              </h1>
              <p className="text-[11px] text-teal-100/80 font-normal leading-none mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
            <Link
              href="/teacher/special-subjects/eval"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center space-x-1.5 shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
              <span>Chế độ Giáo viên</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs - Sleek, Compact, No Cutoff */}
      <div className="bg-white rounded-xl p-1 shadow-xs border border-slate-200/80 flex items-center space-x-1 overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isMonitorTab = item.href.includes("?subject=");
          const isActive = isMonitorTab
            ? (pathname.includes("/admin/special-subjects/monitor") && subjectParam === item.href.split("?subject=")[1])
            : item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-300" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SpecialSubjectNav(props: SpecialSubjectNavProps) {
  return (
    <Suspense fallback={<div className="h-16 bg-slate-100/50 rounded-xl animate-pulse mb-3" />}>
      <SpecialSubjectNavInner {...props} />
    </Suspense>
  );
}
