"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Bell,
  AtSign,
  MessageSquare,
  CheckCheck,
} from "lucide-react";

export interface SlcNotificationItem {
  id: string;
  notificationDbId?: string;
  eventType: string;
  title: string;
  message: string;
  deepLink: string;
  isRead: boolean;
  createdAt: string;
}

interface SubNavProps {
  showAdminLink?: boolean;
  onOpenComposer?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  initialNotifications?: SlcNotificationItem[];
  initialUnreadCount?: number;
}

export function SkylineConnectSubNav({
  showAdminLink = false,
  onOpenComposer,
  searchValue,
  onSearchChange,
  initialNotifications,
  initialUnreadCount,
}: SubNavProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const router = useRouter();

  const [bellOpen, setBellOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"ALL" | "MENTION" | "UNREAD">("ALL");
  const [notifications, setNotifications] = useState<SlcNotificationItem[]>(
    initialNotifications || []
  );
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount ?? 0);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialNotifications) {
      setNotifications(initialNotifications);
    }
    if (typeof initialUnreadCount === "number") {
      setUnreadCount(initialUnreadCount);
    }
  }, [initialNotifications, initialUnreadCount]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/skyline-connect?action=notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(Number(data.unreadCount || 0));
      }
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (notificationId: string | "ALL") => {
    try {
      const res = await fetch("/api/skyline-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "markNotificationRead",
          notificationId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(Number(data.unreadCount || 0));
      }
    } catch {
      // ignore
    }
  };

  const handleClickNotification = async (notif: SlcNotificationItem) => {
    if (!notif.isRead) {
      await handleMarkRead(notif.notificationDbId || notif.id);
    }
    setBellOpen(false);
    if (notif.deepLink) {
      router.push(notif.deepLink);
    }
  };

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return "Vừa xong";
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  const filteredNotifs = notifications.filter((n) => {
    if (notifFilter === "MENTION") return n.eventType === "MENTION";
    if (notifFilter === "UNREAD") return !n.isRead;
    return true;
  });

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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] px-3 sm:px-4 shadow-2xs sticky top-0 z-30">
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
            <div className="relative flex-1 sm:w-56 md:w-64">
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

        {/* Right: Notification Bell + Admin Link + Composer CTA */}
        <div className="flex items-center gap-2 shrink-0 order-2 lg:order-3">
          {/* Facebook-Style Notification Bell with Unread Badge & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setBellOpen((o) => !o);
                if (!bellOpen) fetchNotifications();
              }}
              className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                bellOpen
                  ? "bg-[#E6F4F5] text-[#159EAA]"
                  : "bg-[#F0F2F5] hover:bg-[#E4E6EB] text-slate-700"
              }`}
              aria-label="Thông báo Sky-Line Connect"
              title="Thông báo & Nhắc tên (@Tag)"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs tabular-nums">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-11 z-50 w-[340px] sm:w-[380px] rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
                {/* Dropdown Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Thông báo</h3>
                    <p className="text-[11px] text-slate-500">
                      Nhắc tên (@Tag), bình luận & hoạt động cộng đồng
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead("ALL")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#159EAA] hover:underline cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Đọc tất cả</span>
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-slate-100 flex items-center gap-1.5">
                  {[
                    { id: "ALL" as const, label: "Tất cả" },
                    { id: "MENTION" as const, label: "@ Nhắc đến bạn" },
                    { id: "UNREAD" as const, label: `Chưa đọc (${unreadCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNotifFilter(f.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        notifFilter === f.id
                          ? "bg-[#123E4A] text-white"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Notification List */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  {filteredNotifs.length > 0 ? (
                    filteredNotifs.map((notif) => {
                      const isMention = notif.eventType === "MENTION";
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => handleClickNotification(notif)}
                          className={`w-full text-left px-3.5 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                            !notif.isRead
                              ? "bg-[#F0FDFA]/70 hover:bg-[#CCFBF1]/50"
                              : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              isMention
                                ? "bg-gradient-to-br from-[#123E4A] to-[#159EAA] text-white"
                                : "bg-[#F0F2F5] text-[#123E4A]"
                            }`}
                          >
                            {isMention ? (
                              <AtSign className="w-4 h-4 text-[#5EEAD4]" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-[#159EAA]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isMention && (
                                <span className="px-1.5 py-0.5 rounded bg-[#159EAA]/15 text-[#00736E] text-[10px] font-extrabold">
                                  @Tag nhắc tên
                                </span>
                              )}
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {notif.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-snug mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <span
                              className={`text-[11px] mt-1 block tabular-nums ${
                                !notif.isRead
                                  ? "text-[#159EAA] font-bold"
                                  : "text-slate-400"
                              }`}
                            >
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          {!notif.isRead && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-[#159EAA] shrink-0 mt-2"
                              title="Chưa đọc"
                            />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center space-y-1.5">
                      <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                      <div className="text-xs font-bold text-slate-700">
                        {notifFilter === "MENTION"
                          ? "Chưa có thông báo nhắc tên (@Tag) nào"
                          : "Chưa có thông báo mới"}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Khi đồng nghiệp gõ @Tên Thầy/Cô trong bài viết hoặc bình luận, thông báo sẽ hiện ngay tại đây.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Link to My Space / System Notifications */}
                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href="/teacher/skyline-connect/my-space"
                    onClick={() => setBellOpen(false)}
                    className="font-bold text-[#123E4A] hover:underline"
                  >
                    Cài đặt thông báo
                  </Link>
                  <Link
                    href="/teacher/notifications"
                    onClick={() => setBellOpen(false)}
                    className="font-bold text-[#159EAA] hover:underline"
                  >
                    Trung tâm thông báo SSM →
                  </Link>
                </div>
              </div>
            )}
          </div>

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
