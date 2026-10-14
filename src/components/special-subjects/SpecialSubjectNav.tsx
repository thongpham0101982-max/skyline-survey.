"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sparkles, 
  BarChart3, 
  BookOpen, 
  Layers, 
  Users, 
  ClipboardList, 
  ShieldCheck 
} from "lucide-react";

interface SpecialSubjectNavProps {
  title?: string;
  subtitle?: string;
}

export function SpecialSubjectNav({
  title = "Môn học đặc thù Sky-Line",
  subtitle = "Hệ thống quản lý chương trình, phân công & sổ đánh giá năng lực đặc thù"
}: SpecialSubjectNavProps) {
  const pathname = usePathname() || "";

  const navItems = [
    {
      name: "Dashboard & Báo cáo",
      href: "/admin/special-subjects",
      icon: BarChart3,
      exact: true
    },
    {
      name: "Danh mục Môn",
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
      name: "Sổ đánh giá (Admin)",
      href: "/admin/special-subjects/gradebook",
      icon: ClipboardList
    }
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Sky-Line Deep Pine Brand Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00736E] text-white p-6 shadow-xl border border-teal-800/40">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
        <div className="absolute right-24 bottom-0 -mb-10 w-48 h-48 rounded-full bg-[#00A19A]/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner text-teal-300">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-400/30">
                  Sky-Line Curricula
                </span>
                <span className="text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90">
                  Niên khóa 2026-2027
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold mt-1 text-white tracking-tight">
                {title}
              </h1>
              <p className="text-xs md:text-sm text-teal-100/80 font-normal mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/teacher/special-subjects/gradebook"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center space-x-1.5 shadow-sm backdrop-blur-sm"
            >
              <ShieldCheck className="w-4 h-4 text-teal-300" />
              <span>Chế độ Giáo viên</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-teal-300" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
