// @ts-nocheck
"use client";
import React, { useState } from 'react';
import { X, Users, CheckCircle2, Clock, BarChart3, AlertCircle, ArrowRight, ExternalLink, Calendar, Mail, Send, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

export function ActivityProgressModal({ activity, isOpen, onClose }: { activity: any; isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const basePath = pathname.startsWith("/admin") ? "/admin/experiential-activities" : "/teacher/experiential-activities";
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingResend, setSendingResend] = useState(false);

  if (!isOpen || !activity) return null;

  const assignedClasses = activity.assignedClasses || [];
  const totalClasses = assignedClasses.length;
  const completedClasses = assignedClasses.filter((c: any) => c.status === 'COMPLETED').length;
  const incompletedClasses = assignedClasses.filter((c: any) => c.status !== 'COMPLETED');
  const progressPercent = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 0;

  const handleSendReminder = async () => {
    if (incompletedClasses.length === 0) {
      toast.success("Tất cả các lớp đã hoàn thành đánh giá!");
      return;
    }
    if (!confirm(`Gửi email nhắc nhở tiến độ đánh giá đến ${incompletedClasses.length} lớp chưa hoàn thành và CC Giám đốc cơ sở?`)) return;

    setSendingReminder(true);
    try {
      const res = await fetch(`/api/experiential-activities/${activity.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REMINDER',
          customMessage: 'Kính nhờ Quý Thầy/Cô GVCN khẩn trương hoàn thành đánh giá vai trò và năng lực của học sinh lớp mình phụ trách trước thời hạn quy định.'
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Đã gửi email nhắc nhở thành công!');
      } else {
        toast.error(data.error || 'Lỗi khi gửi email nhắc nhở');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleResendAll = async () => {
    if (!confirm(`Gửi lại toàn bộ thông báo kế hoạch hoạt động đến ${totalClasses} GVCN và CC Giám đốc cơ sở?`)) return;

    setSendingResend(true);
    try {
      const res = await fetch(`/api/experiential-activities/${activity.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INITIAL'
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Đã gửi lại email kế hoạch thành công!');
      } else {
        toast.error(data.error || 'Lỗi khi gửi email');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setSendingResend(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-black text-[#003B3A] bg-[#00A99D]/10 px-2.5 py-0.5 rounded-lg border border-[#00A99D]/20">
                {activity.code || 'HDTN'}
              </span>
              <span className="text-xs font-bold text-slate-500">{activity.activityTypeName || 'Hoạt động trải nghiệm'}</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 line-clamp-1">{activity.name}</h3>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overall Progress Bar */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-700">Tiến độ hoàn thành toàn bộ:</span>
            <span className={progressPercent === 100 ? 'text-emerald-600' : 'text-[#00A99D]'}>
              {completedClasses}/{totalClasses} lớp ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#003B3A] to-[#00A99D]' }`}
              style={{ width: progressPercent + '%' }}
            />
          </div>
        </div>

        {/* Class by Class List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {assignedClasses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-bold">
              Chưa có lớp nào được gán cho hoạt động này
            </div>
          ) : (
            assignedClasses.map((cls: any, idx: number) => {
              const isCompleted = cls.status === 'COMPLETED';
              const isInProgress = cls.status === 'IN_PROGRESS';
              const totalSt = cls.totalStudents || 30;
              const evalSt = cls.evaluatedStudents || 0;
              const pct = totalSt > 0 ? Math.round((evalSt / totalSt) * 100) : 0;

              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-[#00A99D]/40 transition-all flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                      isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isInProgress ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {cls.className}
                    </div>

                    <div>
                      <div className="text-xs font-black text-slate-800">
                        {cls.campusName || cls.campusCode} · Khối {cls.grade}
                      </div>
                      <div className="text-[11px] text-slate-400 font-bold">
                        GVCN: <span className="text-slate-700">{cls.homeroomTeacherName || 'Chưa gán'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-800">{evalSt}/{totalSt} HS</div>
                      <div className={`text-[11px] font-black ${
                        isCompleted ? 'text-emerald-600' : isInProgress ? 'text-sky-600' : 'text-slate-400'
                      }`}>
                        {pct}% ({isCompleted ? 'Đã nộp' : isInProgress ? 'Đang chấm' : 'Chưa đánh giá'})
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        onClose();
                        router.push(`${basePath}/${activity.id}?classId=${cls.classId}`);
                      }}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-gradient-to-r hover:from-[#003B3A] hover:to-[#00A99D] hover:text-white text-slate-600 transition-all"
                      title="Mở sổ đánh giá của lớp này"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Controls & Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {incompletedClasses.length > 0 && (
              <button
                type="button"
                disabled={sendingReminder}
                onClick={handleSendReminder}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                title="Gửi email nhắc nhở các lớp chưa hoàn thành đánh giá"
              >
                {sendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" /> : <Mail className="w-3.5 h-3.5 text-amber-700" />}
                <span>Nhắc nhở {incompletedClasses.length} lớp chưa nộp</span>
              </button>
            )}

            <button
              type="button"
              disabled={sendingResend}
              onClick={handleResendAll}
              className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-[#003B3A] text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
              title="Gửi lại email thông báo kế hoạch cho tất cả GVCN và CC GĐCS"
            >
              {sendingResend ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A99D]" /> : <RefreshCw className="w-3.5 h-3.5 text-[#00A99D]" />}
              <span>Gửi lại kế hoạch cho tất cả lớp</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
