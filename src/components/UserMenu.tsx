"use client";

import { useState, useEffect } from "react";
import { LogOut, KeyRound, ChevronDown, CheckCircle2, GraduationCap, LayoutDashboard, PenTool, Camera } from "lucide-react";
import { signOut } from "next-auth/react";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { AvatarUploadModal } from "./AvatarUploadModal";
import Link from "next/link";

interface UserMenuProps {
  session: any;
  permissionModules?: string[];
}

export function UserMenu({ session, permissionModules }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const initial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U";

  useEffect(() => {
    let active = true;
    if (session?.user?.id) {
      fetch("/api/user/avatar")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active && data?.avatarUrl !== undefined) {
            setAvatarUrl(data.avatarUrl || null);
          }
        })
        .catch(() => {});
    }

    const handleAvatarEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatarUrl: string | null }>;
      if (customEvent.detail !== undefined) {
        setAvatarUrl(customEvent.detail.avatarUrl || null);
      }
    };

    window.addEventListener("ssm:avatar-updated", handleAvatarEvent);
    return () => {
      active = false;
      window.removeEventListener("ssm:avatar-updated", handleAvatarEvent);
    };
  }, [session?.user?.id]);

  return (
    <>
      <div className="relative flex items-center gap-4">
        {/* User Avatar Menu */}
        <div className="relative">
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-[#003B3A] to-[#00A19A] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white group-hover:scale-105 transition-transform">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={session?.user?.name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-hover:text-slate-600" />
          </div>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3.5 py-3 border-b border-slate-100/80 mb-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsAvatarModalOpen(true);
                    }}
                    title="Nhấn để đổi ảnh đại diện"
                    className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-[#003B3A] to-[#00A19A] text-white flex items-center justify-center font-bold text-sm shrink-0 group/avatar cursor-pointer border border-slate-200"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={session?.user?.name || "Avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initial
                    )}
                    <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-4 h-4 text-white" />
                    </span>
                  </button>
                  <div className="flex flex-col min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">{session?.user?.name || "Người dùng"}</p>
                    <p className="text-[10px] font-bold text-slate-400 truncate mt-1 tabular-nums">{session?.user?.email || ""}</p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  {/* Link to Teacher workspace */}
                  {(() => {
                    const userRole = ((session?.user as any)?.role || "").toUpperCase();
                    const isTeach = ["TEACHER", "GV_MN", "GVNN", "GV", "GIAO_VIEN"].includes(userRole) || userRole === "ADMIN" || userRole === "SUPER_ADMIN";
                    if (!isTeach) return null;
                    return (
                      <>
                        <Link
                          href="/teacher"
                          onClick={() => setIsOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#1E8B87] bg-teal-50/70 hover:bg-teal-100/90 transition-all text-left mb-1"
                        >
                          <GraduationCap className="w-4 h-4 text-[#1E8B87] shrink-0" />
                          <span>Giao diện Giáo viên</span>
                        </Link>
                        <Link
                          href="/teacher/profile/chu-ky-so"
                          onClick={() => setIsOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-[#003B3A] hover:bg-slate-100/80 transition-all text-left mb-1"
                        >
                          <PenTool className="w-4 h-4 text-[#00A19A] shrink-0" />
                          <span>Chữ ký số của tôi</span>
                        </Link>
                      </>
                    );
                  })()}

                  {/* Link to Admin workspace if superadmin or has admin privileges */}
                  {(() => {
                    const userRole = ((session?.user as any)?.role || "").toUpperCase();
                    const isSuper = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
                    const hasAdminModules = permissionModules && permissionModules.length > 0 && !["TEACHER", "GV_MN"].includes(userRole);
                    if (!isSuper && !hasAdminModules) return null;
                    return (
                      <Link
                        href="/admin"
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 transition-all text-left mb-1"
                      >
                        <LayoutDashboard className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Giao diện Quản trị</span>
                      </Link>
                    );
                  })()}

                  {(() => {
                    const userRole = ((session?.user as any)?.role || "").toUpperCase();
                    const isSuper = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
                    const canAccess = isSuper || (permissionModules && permissionModules.some(m => ["XET_DUYET_KET_QUA", "INPUT_ASSESSMENTS_REPORTS", "XET_DUYET_MAM_NON"].includes(m)));
                    if (!canAccess) return null;
                    return (
                      <Link
                        href="/admin/xet-duyet-ket-qua"
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-[#1E8B87] hover:bg-teal-50/50 transition-all text-left mb-1"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#1E8B87] shrink-0" />
                        <span>Xét duyệt kết quả</span>
                      </Link>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsAvatarModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-[#003B3A] hover:bg-slate-100/80 transition-all text-left cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#00A19A] shrink-0" />
                    <span>Đổi ảnh đại diện</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-[#003B3A] hover:bg-slate-100/80 transition-all text-left cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Đổi mật khẩu</span>
                  </button>
                  
                  <div className="border-t border-slate-100/60 my-1" />
                  
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await signOut({ redirect: false })
                      } catch (e) {
                        console.error(e)
                      } finally {
                        window.location.href = "/login"
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50/50 hover:text-rose-700 transition-all text-left cursor-pointer"
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

      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        userName={session?.user?.name || "Giáo viên"}
        userEmail={session?.user?.email || ""}
        currentAvatarUrl={avatarUrl}
        onAvatarUpdated={(newUrl) => setAvatarUrl(newUrl)}
      />

      <ChangePasswordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
