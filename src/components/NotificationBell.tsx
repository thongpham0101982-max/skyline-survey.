"use client"
import { useState, useEffect, useRef } from "react"
import { Bell, CheckCircle2 } from "lucide-react"
import { getUserNotificationsAction, markNotificationsAsReadAction } from "@/lib/notification_actions"

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getUserNotificationsAction().then(res => {
      setNotifs(res)
      setUnread(res.filter(n => !n.isRead).length)
    })
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
    setOpen(!open)
    if (!open && unread > 0) {
      markNotificationsAsReadAction().then(() => setUnread(0))
    }
  }

  return (
    <div className="fixed top-6 right-8 z-50 drop-shadow-xl" ref={ref}>
      <button 
        onClick={handleOpen}
        className="relative p-3.5 bg-white rounded-full border border-slate-200 shadow-md hover:bg-slate-50 transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6 text-slate-700" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-rose-500 border-2 border-white rounded-full translate-x-1 -translate-y-1 animate-bounce shadow-sm">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-lg">Thông báo hệ thống</h3>
            {unread > 0 && <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-full font-bold">{unread} mới</span>}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium pb-10">
                <Bell className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                Bạn không có thông báo nào.
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id} className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}>
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-bold text-indigo-800 flex items-center text-sm"><CheckCircle2 className="w-4 h-4 mr-1.5 opacity-50"/> {n.title}</h4>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                      {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest" onClick={() => setOpen(false)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}