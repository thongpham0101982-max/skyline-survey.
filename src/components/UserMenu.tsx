
"use client";

import { useState, useEffect, useRef } from "react";
import { LogOut, KeyRound, ChevronDown, Bell, CheckCircle2, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { getUserNotificationsAction, markNotificationsAsReadAction } from "@/lib/notification_actions";
import Link from "next/link";

interface UserMenuProps {
  session: any;
}

export function UserMenu({ session }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserNotificationsAction().then(res => {
      if (Array.isArray(res)) {
        setNotifs(res);
        setUnread(res.filter((n: any) => !n.isRead).length);
      }
    }).catch(err => {
      console.error("Failed to load notifications:", err);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifRef]);

  const handleOpenNotifs = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNotifs(!showNotifs);
    setIsOpen(false);
    if (!showNotifs && unread > 0) {
      markNotificationsAsReadAction().then(() => setUnread(0));
    }
  };

  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <div className="relative flex items-center gap-4">
        {/* Bell Icon in Header */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleOpenNotifs}
            className="p-2.5 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none group relative text-xs font-semibold"
          >
            <Bell className="w-5 h-5 text-slate-700 group-hover:text-[#1E8B87] transition-colors" />
            {unread > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 translate-x-0.5 -translate-y-0.5 text-xs font-semibold"></span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 bg-gradient-to-r from-[#1E8B87] to-[#135E5B] flex justify-between items-center text-white">
                <h3 className="font-bold text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Thông báo hệ thống</h3>
                <button onClick={() => setShowNotifs(false)} className="p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="max-h-[350px] overflow-y-auto text-xs font-semibold">
                {notifs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-medium">
                    <Bell className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                    Bạn không có thông báo nào.
                  </div>
                ) : (
                  notifs.map(n => {
                    const content = (
                      <div className={"p-4 border-b border-slate-100 hover:bg-slate-100 transition-colors bg-white " + (!n.isRead ? 'bg-indigo-50/20' : '')}>
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-bold text-[#1E8B87] flex items-center text-sm"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 opacity-60"/> {n.title}</h4>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                            {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed">{n.message}</p>
                      </div>
                    );
                    return n.link ? (
                      <Link key={n.id} href={n.link} onClick={() => setShowNotifs(false)} className="block">
                        {content}
                      </Link>
                    ) : (
                      <div key={n.id}>{content}</div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="relative">
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#135E5B] to-[#1E8B87] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white group-hover:scale-105 transition-transform">
              {initial}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-hover:text-slate-600" />
          </div>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3.5 py-3 border-b border-slate-100/80 mb-1 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#135E5B] to-[#1E8B87] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initial}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">{session?.user?.name || "Người dùng"}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate mt-1">{session?.user?.email || ""}</p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:text-[#00A99D] hover:bg-[#00A99D]/5 transition-all text-left"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Đổi mật khẩu</span>
                  </button>
                  
                  <div className="border-t border-slate-100/60 my-1" />
                  
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50/50 hover:text-rose-700 transition-all text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
