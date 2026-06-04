"use client";

import { useState } from "react";
import { LogOut, KeyRound, ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface UserMenuProps {
  session: any;
}

export function UserMenu({ session }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#135E5B] to-[#1E8B87] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white group-hover:scale-105 transition-transform">
            {initial}
          </div>
          <ChevronDown className={"w-4 h-4 text-slate-400 transition-transform "} />
        </div>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-50 mb-1">
                <p className="text-sm font-semibold text-slate-700 truncate">{session?.user?.name || "Người dùng"}</p>
                <p className="text-xs text-slate-400 truncate">{session?.user?.email || ""}</p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-[#1E8B87] hover:bg-slate-50 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                Đổi mật khẩu
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          </>
        )}
      </div>

      <ChangePasswordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
