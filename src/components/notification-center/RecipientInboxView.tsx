"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  Filter,
  Calendar,
  GraduationCap,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Paperclip,
  ExternalLink,
  Send,
  ChevronRight,
  RefreshCw,
  UserCheck,
  MessageSquare,
  FileText,
  Sparkles,
  BookOpen,
  X,
  CheckCheck,
} from "lucide-react";

interface RecipientInboxViewProps {
  portalRole: "PARENT" | "STUDENT";
}

type InboxTabKey = "ALL" | "EXAM" | "TEACHER" | "ACADEMIC_RESULT" | "UNREAD";

const INBOX_TABS: Array<{ key: InboxTabKey; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "EXAM", label: "Khảo thí" },
  { key: "TEACHER", label: "Giáo viên" },
  { key: "ACADEMIC_RESULT", label: "Học tập" },
  { key: "UNREAD", label: "Chưa đọc" },
];

export function RecipientInboxView({ portalRole }: RecipientInboxViewProps) {
  const [activeTab, setActiveTab] = useState<InboxTabKey>("ALL");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selected Notification Detail State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailResponses, setDetailResponses] = useState<any[]>([]);
  const [ackNote, setAckNote] = useState<string>("");
  const [replyText, setReplyText] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        mode: "INBOX",
        tab: activeTab,
        page: String(page),
        pageSize: "20",
      });
      if (selectedStudentId) qs.set("studentId", selectedStudentId);
      if (searchQuery.trim()) qs.set("search", searchQuery.trim());

      const res = await fetch(`/api/notification-center?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Không thể tải danh sách thông báo.");
      }
      const data = await res.json();
      let list = Array.isArray(data.items) ? data.items : [];
      if (priorityFilter !== "ALL") {
        list = list.filter((it: any) => it.priority === priorityFilter);
      }
      setItems(list);
      setTotalCount(Number(data.totalCount || list.length));
      setUnreadCount(Number(data.unreadCount || 0));
      if (Array.isArray(data.children)) {
        setChildrenList(data.children);
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedStudentId, searchQuery, priorityFilter, page]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const openNotificationDetail = async (item: any) => {
    setSelectedItem(item);
    setDetailLoading(true);
    setDetailResponses([]);

    try {
      // Automatically mark as read when opened
      if (!item.isRead) {
        await fetch(`/api/notification-center/${item.notificationId}/interact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "MARK_READ",
            recipientId: item.recipientId,
            studentId: item.studentId,
          }),
        });
        setItems((prev) =>
          prev.map((x) =>
            x.recipientId === item.recipientId
              ? { ...x, isRead: true, readAt: new Date().toISOString() }
              : x
          )
        );
        setSelectedItem((prev: any) =>
          prev ? { ...prev, isRead: true, readAt: new Date().toISOString() } : prev
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      const qs = item.studentId ? `?studentId=${encodeURIComponent(item.studentId)}` : "";
      const res = await fetch(`/api/notification-center/${item.notificationId}${qs}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setDetailResponses(Array.isArray(data.responses) ? data.responses : []);
      }
    } catch (err) {
      console.error("Failed to load notification detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedItem) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/notification-center/${selectedItem.notificationId}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACKNOWLEDGE",
          recipientId: selectedItem.recipientId,
          studentId: selectedItem.studentId,
          acknowledgeNote: ackNote.trim() || "Đã xem và xác nhận thông tin",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xác nhận.");

      const nowIso = new Date().toISOString();
      setSelectedItem((prev: any) =>
        prev
          ? {
              ...prev,
              isRead: true,
              isAcknowledged: true,
              acknowledgedAt: nowIso,
              acknowledgeNote: ackNote.trim() || "Đã xem và xác nhận thông tin",
            }
          : prev
      );
      setItems((prev) =>
        prev.map((x) =>
          x.recipientId === selectedItem.recipientId
            ? {
                ...x,
                isRead: true,
                isAcknowledged: true,
                acknowledgedAt: nowIso,
              }
            : x
        )
      );
      setAckNote("");
      setFeedbackToast("Đã ghi nhận xác nhận thông báo thành công!");
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Lỗi xác nhận thông báo.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !replyText.trim()) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/notification-center/${selectedItem.notificationId}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REPLY",
          recipientId: selectedItem.recipientId,
          studentId: selectedItem.studentId,
          replyContent: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể gửi phản hồi.");

      if (data.response) {
        setDetailResponses((prev) => [...prev, data.response]);
      }
      setReplyText("");
      setFeedbackToast("Đã gửi phản hồi tới nhà trường / giáo viên!");
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err: any) {
      alert(err?.message || "Lỗi khi gửi phản hồi.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case "EXAM":
        return (
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#6D28D9] border border-teal-200 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        );
      case "TEACHER":
        return (
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-[#003B3A] border border-teal-200 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        );
      case "ACADEMIC_RESULT":
        return (
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-16 font-sans">
      {/* 1. SKY-LINE PURPLE & TEAL BRANDED HEADER */}
      <div className="bg-gradient-to-r from-[#4C1D95] via-[#003B3A] to-[#003B3A] rounded-3xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
              <Bell className="w-6 h-6 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/15 text-teal-700 border border-white/20">
                  SKY-LINE SSM
                </span>
                {unreadCount > 0 && (
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight mt-1">
                Thông báo &amp; Liên lạc Nhà trường
              </h1>
              <p className="text-xs text-teal-700/90 font-medium mt-0.5">
                Cập nhật lịch kiểm tra định kỳ, hướng dẫn ôn tập, kết quả học tập và thông tin từ Giáo viên
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchInbox}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Multi-Child Selector for Parents with multiple children */}
        {portalRole === "PARENT" && childrenList.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/15 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-teal-700 flex items-center gap-1.5 mr-1">
              <UserCheck className="w-4 h-4" />
              <span>Học sinh:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedStudentId("");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedStudentId === ""
                  ? "bg-white text-[#4C1D95] shadow-xs"
                  : "bg-white/10 text-white/85 hover:bg-white/20"
              }`}
            >
              Tất cả các con ({childrenList.length})
            </button>
            {childrenList.map((child: any) => (
              <button
                key={child.studentId}
                type="button"
                onClick={() => {
                  setSelectedStudentId(child.studentId);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedStudentId === child.studentId
                    ? "bg-white text-[#4C1D95] shadow-xs"
                    : "bg-white/10 text-white/85 hover:bg-white/20"
                }`}
              >
                <span>{child.studentName}</span>
                <span className="text-[10px] opacity-75">({child.className})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. SEARCH, FILTER & 5 STANDARD TABS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tiêu đề thông báo, môn kiểm tra, giáo viên gửi..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#6D28D9]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-[#6D28D9]"
            >
              <option value="ALL">Mọi mức độ ưu tiên</option>
              <option value="URGENT">Khẩn cấp</option>
              <option value="IMPORTANT">Quan trọng</option>
              <option value="NORMAL">Thông thường</option>
            </select>
          </div>
        </div>

        {/* 5 Tabs: Tất cả | Khảo thí | Giáo viên | Học tập | Chưa đọc */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {INBOX_TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-[#003B3A]"
                }`}
              >
                <span>{t.label}</span>
                {t.key === "UNREAD" && unreadCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      active ? "bg-white text-[#003B3A]" : "bg-rose-500 text-white"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {feedbackToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* 3. SPLIT VIEW ON DESKTOP / CLEAN CARD LIST ON MOBILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List Column */}
        <div className={`${selectedItem ? "lg:col-span-5" : "lg:col-span-12"} space-y-3`}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-xs font-bold text-rose-800">{error}</p>
              <button
                type="button"
                onClick={fetchInbox}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#6D28D9] flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7 opacity-75" />
              </div>
              <h3 className="text-sm font-black text-slate-800">Chưa có thông báo nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Khi Ban KT&amp;ĐBCL hoặc Giáo viên phát hành thông báo lịch kiểm tra, hướng dẫn học tập hoặc kết quả, thông tin sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedItem?.recipientId === item.recipientId;
              const isImportant = item.priority === "IMPORTANT" || item.priority === "URGENT";

              return (
                <div
                  key={item.recipientId}
                  onClick={() => openNotificationDetail(item)}
                  className={`rounded-2xl border p-4 transition-all cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-teal-50/70 border-[#6D28D9] shadow-sm ring-1 ring-[#6D28D9]/30"
                      : !item.isRead
                      ? "bg-white border-teal-200 shadow-xs hover:border-[#6D28D9]/60"
                      : "bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  {renderCategoryIcon(item.category)}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!item.isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#6D28D9] shrink-0" />
                        )}
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-teal-100/80 text-[#003B3A]">
                          {item.senderUnit || "Nhà trường"}
                        </span>
                        {item.studentName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                            HS: {item.studentName} ({item.className})
                          </span>
                        )}
                        {isImportant && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              item.priority === "URGENT"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {item.priority === "URGENT" ? "Khẩn cấp" : "Quan trọng"}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 font-semibold">
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <h3
                      className={`text-sm leading-snug ${
                        !item.isRead ? "font-black text-slate-900" : "font-bold text-slate-700"
                      }`}
                    >
                      {item.title}
                    </h3>

                    {item.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                        {item.summary}
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.isRead ? (
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đã đọc</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-extrabold text-[#6D28D9]">
                            Chưa đọc
                          </span>
                        )}

                        {item.requireAcknowledge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.isAcknowledged
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {item.isAcknowledged ? "✓ Đã xác nhận" : "Cần xác nhận"}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-extrabold text-[#6D28D9] inline-flex items-center gap-1">
                        <span>Xem chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-semibold">
                Trang {page} • Tổng {totalCount} thông báo
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={page * 20 >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold disabled:opacity-40"
                >
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Detail Panel / Modal */}
        {selectedItem && (
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden sticky top-20">
              {/* Detail Header */}
              <div className="bg-gradient-to-r from-[#003B3A] to-[#003B3A] p-5 text-white flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white/15 text-teal-700">
                      {selectedItem.code} • {selectedItem.senderUnit}
                    </span>
                    {selectedItem.studentName && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-100 border border-teal-300/30">
                        Học sinh: {selectedItem.studentName} ({selectedItem.className})
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-black leading-snug">
                    {selectedItem.title}
                  </h2>
                  <p className="text-[11px] text-teal-700/80 font-medium">
                    Người gửi: {selectedItem.senderName} • Phát hành:{" "}
                    {selectedItem.publishedAt
                      ? new Date(selectedItem.publishedAt).toLocaleString("vi-VN")
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Đóng chi tiết"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Linked Exam Schedule Card */}
                {selectedItem.examScheduleMeta && (
                  <div className="rounded-2xl bg-teal-50/90 border border-teal-200 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-[#003B3A] font-black text-xs uppercase">
                        <Calendar className="w-4 h-4" />
                        <span>Thông tin Lịch kiểm tra liên kết</span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#003B3A] text-white">
                        {selectedItem.examScheduleMeta.examFormatLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="bg-white rounded-xl p-2.5 border border-teal-200">
                        <span className="text-slate-400 block text-[10px] font-bold">Kỳ kiểm tra</span>
                        <span className="font-extrabold text-slate-800">
                          {selectedItem.examScheduleMeta.periodName}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-teal-200">
                        <span className="text-slate-400 block text-[10px] font-bold">Môn kiểm tra</span>
                        <span className="font-extrabold text-slate-800">
                          {selectedItem.examScheduleMeta.subjectName} (
                          {selectedItem.examScheduleMeta.durationMinutes} phút)
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-teal-200">
                        <span className="text-slate-400 block text-[10px] font-bold">Khung giờ &amp; Ngày thi</span>
                        <span className="font-extrabold text-slate-800">
                          {selectedItem.examScheduleMeta.startTime} -{" "}
                          {selectedItem.examScheduleMeta.endTime}
                          {selectedItem.examScheduleMeta.examDate
                            ? ` • ${new Date(
                                selectedItem.examScheduleMeta.examDate
                              ).toLocaleDateString("vi-VN")}`
                            : ""}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-2.5 border border-teal-200">
                        <span className="text-slate-400 block text-[10px] font-bold">Phòng kiểm tra</span>
                        <span className="font-extrabold text-slate-800">
                          {selectedItem.examScheduleMeta.roomName}
                        </span>
                      </div>
                    </div>

                    {selectedItem.beforeChange && selectedItem.afterChange && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                        <div className="font-extrabold text-rose-800">
                          Chi tiết điều chỉnh lịch kiểm tra:
                        </div>
                        <div className="text-slate-600">
                          • Trước điều chỉnh:{" "}
                          <span className="line-through">
                            {JSON.stringify(selectedItem.beforeChange)}
                          </span>
                        </div>
                        <div className="text-emerald-800 font-bold">
                          • Sau điều chỉnh: {JSON.stringify(selectedItem.afterChange)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Sanitized HTML Content */}
                <div
                  className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs sm:text-sm space-y-2"
                  dangerouslySetInnerHTML={{ __html: selectedItem.contentHtml }}
                />

                {/* Attachments */}
                {Array.isArray(selectedItem.attachments) && selectedItem.attachments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-[#6D28D9]" />
                      <span>Tài liệu đính kèm ({selectedItem.attachments.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedItem.attachments.map((att: any) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-[#6D28D9] bg-slate-50 flex items-center justify-between gap-2 text-xs font-bold text-slate-700"
                        >
                          <span className="truncate">{att.fileName}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#6D28D9] shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deep-link Action Button to SSM Screen */}
                {selectedItem.deepLink &&
                  selectedItem.deepLink !== "/parent/thong-bao" &&
                  selectedItem.deepLink !== "/hocsinh/portal/thong-bao" && (
                    <div className="pt-2">
                      <Link
                        href={selectedItem.deepLink}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-extrabold shadow-xs transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Chuyển đến màn hình chức năng tương ứng trên SSM</span>
                      </Link>
                    </div>
                  )}

                {/* Independent Acknowledge Section */}
                {selectedItem.requireAcknowledge && (
                  <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-5 h-5 ${
                            selectedItem.isAcknowledged ? "text-emerald-600" : "text-[#6D28D9]"
                          }`}
                        />
                        <span className="text-xs font-black text-slate-800">
                          {selectedItem.isAcknowledged
                            ? "Bạn đã xác nhận thông báo này"
                            : "Thông báo yêu cầu Phụ huynh / Học sinh xác nhận đã xem"}
                        </span>
                      </div>
                      {selectedItem.acknowledgedAt && (
                        <span className="text-[11px] font-bold text-emerald-700">
                          Lúc {new Date(selectedItem.acknowledgedAt).toLocaleString("vi-VN")}
                        </span>
                      )}
                    </div>

                    {!selectedItem.isAcknowledged && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={ackNote}
                          onChange={(e) => setAckNote(e.target.value)}
                          placeholder="Ghi chú xác nhận (tùy chọn)..."
                          className="flex-1 px-3 py-2 rounded-xl border border-teal-200 bg-white text-xs font-semibold focus:outline-none focus:border-[#6D28D9]"
                        />
                        <button
                          type="button"
                          disabled={submittingAction}
                          onClick={handleAcknowledge}
                          className="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#003B3A] text-white text-xs font-extrabold shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                          Xác nhận đã xem
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Reply / Q&A Thread Section */}
                {(selectedItem.allowReply || detailResponses.length > 0) && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-[#6D28D9]" />
                      <span>Phản hồi &amp; Trao đổi ({detailResponses.length})</span>
                    </h4>

                    {detailLoading ? (
                      <p className="text-xs text-slate-400">Đang tải lịch sử phản hồi...</p>
                    ) : detailResponses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Chưa có phản hồi nào. Bạn có thể gửi câu hỏi hoặc ý kiến bên dưới.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {detailResponses.map((resp: any) => (
                          <div
                            key={resp.id}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              resp.senderRole === "PARENT" || resp.senderRole === "STUDENT"
                                ? "bg-slate-50 border-slate-200"
                                : "bg-teal-50/70 border-teal-200"
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-slate-700">
                              <span>
                                {resp.senderName} ({resp.senderRole})
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(resp.createdAt).toLocaleString("vi-VN")}
                              </span>
                            </div>
                            <div
                              className="text-slate-700"
                              dangerouslySetInnerHTML={{ __html: resp.content }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedItem.allowReply && (
                      <form onSubmit={handleSendReply} className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Nhập câu hỏi hoặc phản hồi gửi Giáo viên / Ban KT&ĐBCL..."
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#6D28D9]"
                        />
                        <button
                          type="submit"
                          disabled={submittingAction || !replyText.trim()}
                          className="px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Gửi</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipientInboxView;
