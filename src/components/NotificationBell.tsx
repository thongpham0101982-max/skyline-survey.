"use client"
import { useState, useEffect, useRef } from "react"
import { Bell, CheckCircle2, MessageSquare, ExternalLink } from "lucide-react"
import { getUserNotificationsAction, markNotificationsAsReadAction } from "@/lib/notification_actions"
import Link from "next/link"

export function resolveNotificationLink(n: { title?: string; message?: string; link?: string | null }): string {
  const text = ((n.title || "") + " " + (n.message || "")).toLowerCase()

  if (n.link && n.link.trim() !== "") {
    // If link is already pointing to du-gio, route to proper tab
    if (n.link === "/teacher/du-gio" || n.link === "/teacher/du-gio?tab=dang-ky") {
      if (text.includes("đánh giá") || text.includes("hoàn tất nhập")) {
        return "/teacher/du-gio?tab=evaluations"
      }
      if (text.includes("đề xuất") || text.includes("xác nhận") || text.includes("hết hạn") || text.includes("nhắc lịch") || text.includes("đã đăng ký")) {
        return "/teacher/du-gio?tab=my_schedule"
      }
      if (text.includes("mở tiết") || text.includes("tổ chuyên môn") || text.includes("đăng ký")) {
        return "/teacher/du-gio?tab=register_request"
      }
    }
    return n.link
  }

  // Fallback if link was missing
  if (text.includes("dự giờ") || text.includes("tiết dạy") || text.includes("tiết học")) {
    if (text.includes("đánh giá") || text.includes("hoàn tất nhập")) {
      return "/teacher/du-gio?tab=evaluations"
    }
    if (text.includes("đề xuất") || text.includes("xác nhận") || text.includes("hết hạn") || text.includes("nhắc lịch") || text.includes("đã đăng ký")) {
      return "/teacher/du-gio?tab=my_schedule"
    }
    return "/teacher/du-gio?tab=register_request"
  }
  if (text.includes("khảo sát") || text.includes("nps") || text.includes("survey")) {
    return "/teacher/nps"
  }
  if (text.includes("cố vấn") || text.includes("check-in") || text.includes("mục tiêu") || text.includes("k12")) {
    return "/teacher/co-van-hoc-tap"
  }
  if (text.includes("hồ sơ") || text.includes("học sinh")) {
    return "/teacher/ho-so-hoc-sinh"
  }
  if (text.includes("công việc") || text.includes("nhiệm vụ") || text.includes("giao việc")) {
    return "/admin/tasks"
  }
  if (text.includes("xét duyệt") || text.includes("phê duyệt") || text.includes("học thử") || text.includes("tuyển sinh")) {
    return "/admin/xet-duyet-ket-qua"
  }
  if (text.includes("xếp lớp") || text.includes("chuyển lớp")) {
    return "/admin/student-transfers"
  }

  return "/teacher"
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifs = async () => {
    try {
      const res = await getUserNotificationsAction()
      if (Array.isArray(res)) {
        setNotifs(res)
        setUnread(res.filter(n => !n.isRead).length)
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    }
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [ref])

  const handleOpen = () => {
    const nextState = !open
    setOpen(nextState)
    if (nextState && unread > 0) {
      markNotificationsAsReadAction().then(() => setUnread(0))
    }
  }

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button 
        onClick={handleOpen}
        title="Thông báo hệ thống"
        className="relative p-2 rounded-xl text-slate-600 hover:text-[#48BFE3] hover:bg-slate-100/80 transition-all focus:outline-none"
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100/80 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#48BFE3]" />
              Thông báo hệ thống
            </h3>
            {unread > 0 && (
              <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {unread} tin mới
              </span>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {notifs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">
                <Bell className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                <p className="text-xs">Chưa có thông báo nào.</p>
              </div>
            ) : (
              notifs.map(n => {
                const targetLink = resolveNotificationLink(n)

                return (
                  <Link 
                    key={n.id} 
                    href={targetLink}
                    onClick={() => {
                      setOpen(false)
                      if (!n.isRead) {
                        markNotificationsAsReadAction()
                      }
                    }}
                    className={"block p-3.5 hover:bg-teal-50/60 transition-colors cursor-pointer group " + (!n.isRead ? "bg-teal-50/30" : "")}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 leading-snug group-hover:text-[#008B82] transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#48BFE3] shrink-0 group-hover:text-[#008B82]" />
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap shrink-0">
                        {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed pl-5 font-normal">{n.message}</p>
                    <div className="mt-1.5 pl-5 flex items-center text-[10px] text-[#48BFE3] group-hover:text-[#008B82] font-semibold gap-1">
                      Xem chi tiết <ExternalLink className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100">
            <button 
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors" 
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
