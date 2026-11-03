"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  QrCode,
  ClipboardCheck,
  Compass,
  BarChart3,
  Settings,
  GraduationCap
} from "lucide-react";

const ALUMNI_TABS = [
  { href: "/admin/alumni", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/alumni/danh-sach", label: "Danh sách cựu học sinh", icon: Users },
  { href: "/admin/alumni/ma-qr", label: "Quản lý mã QR", icon: QrCode },
  { href: "/admin/alumni/tiep-nhan", label: "Tiếp nhận cập nhật", icon: ClipboardCheck },
  { href: "/admin/alumni/hanh-trinh", label: "Hành trình nghề nghiệp", icon: Compass },
  { href: "/admin/alumni/bao-cao", label: "Báo cáo & Phân tích", icon: BarChart3 },
  { href: "/admin/alumni/cau-hinh", label: "Cấu hình danh mục", icon: Settings },
];

export function AlumniNavTabs() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-gray-200 shadow-xs mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 border-b border-gray-100 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#005856] to-[#00A19A] flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Sky-Line Alumni Network
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Phân hệ Cựu học sinh
                </span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Quản lý kết nối, hành trình đại học, nghề nghiệp và hồ sơ cựu học sinh Hệ thống Giáo dục Sky-Line
              </p>
            </div>
          </div>
        </div>

        {/* Tab Links */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-2.5" aria-label="Tabs">
          {ALUMNI_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-[#005856] text-white shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-gray-400"}`} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
