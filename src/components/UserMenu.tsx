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
 <div className="relative flex items-center gap-4">
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
