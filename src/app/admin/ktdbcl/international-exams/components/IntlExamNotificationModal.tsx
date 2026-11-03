'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Bell,
  Send,
  Users,
  UserCheck,
  GraduationCap,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
  Award,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  getIntlExamCommunicationPreviewAction,
  sendIntlExamNotificationsAction,
} from '../actions';
import {
  NotificationScenarioCode,
  RecipientPreviewItem,
  buildScenarioContent,
} from '@/lib/intl-exams/notificationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetResultIds?: string[];
  onSent?: () => void;
}

const SCENARIO_OPTIONS: {
  code: NotificationScenarioCode;
  label: string;
  desc: string;
  badge: string;
}[] = [
  {
    code: 'CONGRATS_RESULT',
    label: '1. Thông báo Chúc mừng Đạt Kết quả & Chứng chỉ Quốc tế',
    desc: 'Gửi kết quả tổng, điểm chi tiết từng kỹ năng/môn học và chuẩn CEFR tới GVCN lớp, Phụ huynh và Cổng Học sinh.',
    badge: 'Mặc định khi có KQ',
  },
  {
    code: 'CERT_READY_PICKUP',
    label: '2. Thông báo Đã có Bản gốc Chứng chỉ tại Trường (Mời nhận CC)',
    desc: 'Thông báo số hiệu chứng chỉ bản cứng đã về trường, nhờ GVCN phối hợp mời Phụ huynh/Học sinh nhận.',
    badge: 'Bàn giao Chứng chỉ',
  },
  {
    code: 'GVCN_CLASS_HONOR',
    label: '3. Đề xuất GVCN Vinh danh Học sinh trước Lớp & Hồ sơ 360°',
    desc: 'Đề nghị GVCN biểu dương học sinh trong giờ Sinh hoạt lớp và ghi nhận vào Sổ Vinh danh Học sinh 360°.',
    badge: 'Vinh danh Lớp',
  },
  {
    code: 'NEXT_LEVEL_ADVISORY',
    label: '4. Tư vấn Lộ trình Chinh phục Cấp độ Quốc tế Tiếp theo',
    desc: 'Khuyến nghị cấp độ thi tiếp theo (Starters → Movers → Flyers → KET → PET → IELTS) cho GVCN, Phụ huynh và Học sinh.',
    badge: 'Cố vấn Lộ trình',
  },
];

export default function IntlExamNotificationModal({
  isOpen,
  onClose,
  targetResultIds,
  onSent,
}: Props) {
  const [activeTab, setActiveTab] = useState<'COMPOSE' | 'HISTORY'>('COMPOSE');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [recipients, setRecipients] = useState<RecipientPreviewItem[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [scenario, setScenario] = useState<NotificationScenarioCode>('CONGRATS_RESULT');
  const [sendToGVCN, setSendToGVCN] = useState(true);
  const [sendToParent, setSendToParent] = useState(true);
  const [sendToStudentPortal, setSendToStudentPortal] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [sendResultBanner, setSendResultBanner] = useState<string | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await getIntlExamCommunicationPreviewAction(targetResultIds);
      setRecipients(res.recipients || []);
      setRecentNotifications(res.recentNotifications || []);
      setSelectedIds((res.recipients || []).map((r) => r.resultId));
    } catch (e) {
      console.error('Error loading communication preview:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSendResultBanner(null);
      loadPreview();
    }
  }, [isOpen, targetResultIds]);

  const selectedItems = useMemo(
    () => recipients.filter((r) => selectedIds.includes(r.resultId)),
    [recipients, selectedIds]
  );

  const sampleItem = selectedItems[0] || recipients[0] || null;
  const samplePreview = useMemo(() => {
    if (!sampleItem) return null;
    return buildScenarioContent(sampleItem, scenario, customNote);
  }, [sampleItem, scenario, customNote]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === recipients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recipients.map((r) => r.resultId));
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 học sinh để gửi thông báo.');
      return;
    }
    if (!sendToGVCN && !sendToParent && !sendToStudentPortal) {
      alert('Vui lòng chọn ít nhất 1 kênh nhận thông báo (GVCN, Phụ huynh hoặc Học sinh).');
      return;
    }

    setSending(true);
    setSendResultBanner(null);
    try {
      const res = await sendIntlExamNotificationsAction({
        resultIds: selectedIds,
        scenario,
        sendToGVCN,
        sendToParent,
        sendToStudentPortal,
        customMessageNote: customNote,
      });
      setSendResultBanner(
        `Đã gửi thành công cho ${res.studentsProcessed} học sinh: ${res.gvcnNotificationsSent} thông báo tới Tài khoản GVCN • ${res.parentNotificationsSent} thông báo tới Tài khoản Phụ huynh • ${res.studentPortalHighlightsCreated} thư vinh danh lên Cổng Học sinh & Hồ sơ 360°!`
      );
      await loadPreview();
      onSent?.();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi gửi thông báo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#003B3A] via-[#005250] to-[#007796] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15">
              <Bell className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-teal-100">
                Liên thông Tự động 3 Chiều: GVCN Lớp • Phụ huynh • Học sinh
              </span>
              <h2 className="text-base sm:text-lg font-black mt-0.5">
                Trung tâm Thông báo & Liên lạc Chứng chỉ Quốc tế Sky-Line
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('COMPOSE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'COMPOSE'
                    ? 'bg-white text-[#003B3A] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Soạn & Gửi Thông báo ({recipients.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'HISTORY'
                    ? 'bg-white text-[#003B3A] shadow-2xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Lịch sử Đã gửi ({recentNotifications.length})
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {sendResultBanner && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{sendResultBanner}</span>
            </div>
          )}

          {activeTab === 'COMPOSE' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 5 cols: Scenario & 3-Channel Selector */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>1. Chọn Kịch bản Thông báo & Liên lạc</span>
                  </div>

                  <div className="space-y-2">
                    {SCENARIO_OPTIONS.map((opt) => {
                      const active = scenario === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setScenario(opt.code)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            active
                              ? 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-500/20'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-900">
                              {opt.label}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 shrink-0">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Target Channels */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>2. Kênh Nhận Thông báo Tự động</span>
                  </div>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToGVCN}
                      onChange={(e) => setSendToGVCN(e.target.checked)}
                      className="mt-0.5 rounded text-teal-600"
                    />
                    <div className="text-xs">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>Tài khoản GVCN Lớp</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Hiển thị trên Chuông Thông báo GVCN & liên kết trực tiếp tới Hồ sơ Học sinh 360° của lớp.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToParent}
                      onChange={(e) => setSendToParent(e.target.checked)}
                      className="mt-0.5 rounded text-teal-600"
                    />
                    <div className="text-xs">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Giao diện & Tài khoản Phụ huynh (PHHS)</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Gửi thông báo chúc mừng/mời nhận chứng chỉ tới tài khoản Phụ huynh và đồng bộ bảng điểm tại Cổng Phụ huynh.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToStudentPortal}
                      onChange={(e) => setSendToStudentPortal(e.target.checked)}
                      className="mt-0.5 rounded text-teal-600"
                    />
                    <div className="text-xs">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Giao diện Cổng Học sinh & Nhật ký Cố vấn</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Hiển thị Huy hiệu Vinh danh Chứng chỉ Quốc tế trên Cổng Học sinh (`/hocsinh/portal`) & Sổ Cố vấn 360°.
                      </div>
                    </div>
                  </label>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Lời nhắn bổ sung từ Ban KT&ĐBCL / Nhà trường (Tùy chọn)
                    </label>
                    <textarea
                      rows={2}
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="VD: Thời gian nhận chứng chỉ bản gốc từ thứ Hai đến thứ Sáu tại Văn phòng Cơ sở..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Right 7 cols: Live Message Preview & Recipient Mapping Table */}
              <div className="lg:col-span-7 space-y-4">
                {/* Preview of 3 messages */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-teal-600" />
                    <span>3. Xem trước Nội dung Gửi tới 3 Đối tượng</span>
                  </div>

                  {samplePreview ? (
                    <div className="space-y-2.5">
                      {sendToGVCN && (
                        <div className="p-3 rounded-xl bg-white border border-teal-200 space-y-1">
                          <div className="text-[10px] font-black uppercase text-teal-700">
                            [1] Gửi tới Tài khoản GVCN Lớp ({sampleItem?.className})
                          </div>
                          <div className="text-xs font-extrabold text-slate-900">
                            {samplePreview.gvcnTitle}
                          </div>
                          <div className="text-[11px] text-slate-600 whitespace-pre-line">
                            {samplePreview.gvcnMessage}
                          </div>
                        </div>
                      )}

                      {sendToParent && (
                        <div className="p-3 rounded-xl bg-white border border-blue-200 space-y-1">
                          <div className="text-[10px] font-black uppercase text-blue-700">
                            [2] Gửi tới Giao diện Phụ huynh Học sinh
                          </div>
                          <div className="text-xs font-extrabold text-slate-900">
                            {samplePreview.parentTitle}
                          </div>
                          <div className="text-[11px] text-slate-600 whitespace-pre-line">
                            {samplePreview.parentMessage}
                          </div>
                        </div>
                      )}

                      {sendToStudentPortal && (
                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                          <div className="text-[10px] font-black uppercase text-amber-800">
                            [3] Hiển thị trên Cổng Học sinh (`/hocsinh/portal`) & Nhật ký Cố vấn
                          </div>
                          <div className="text-[11px] font-semibold text-slate-800 whitespace-pre-line">
                            {samplePreview.studentHighlight}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-slate-200">
                      Khi có học sinh đạt kết quả/chứng chỉ trong danh sách, bản xem trước nội dung thông báo cá nhân hóa sẽ hiển thị tại đây.
                    </div>
                  )}
                </div>

                {/* Recipient Directory Table */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      4. Danh sách Học sinh & Định tuyến GVCN / Phụ huynh ({selectedIds.length}/{recipients.length})
                    </div>
                    {recipients.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-xs font-bold text-teal-700 hover:underline"
                      >
                        {selectedIds.length === recipients.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    )}
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      <span>Đang tra cứu danh bạ GVCN Lớp, Phụ huynh và Học sinh từ SSM...</span>
                    </div>
                  ) : recipients.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Chưa có bản ghi kết quả thi nào. Khi bạn nhập kết quả/chứng chỉ mới, hệ thống sẽ tự động định tuyến tới GVCN lớp, Phụ huynh và Học sinh tại đây.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 text-left sticky top-0">
                          <tr>
                            <th className="p-2.5 w-8"></th>
                            <th className="p-2.5 font-bold">Học sinh & Lớp</th>
                            <th className="p-2.5 font-bold">Kỳ thi & Kết quả</th>
                            <th className="p-2.5 font-bold">GVCN Lớp nhận TB</th>
                            <th className="p-2.5 font-bold">Phụ huynh nhận TB</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recipients.map((item) => {
                            const checked = selectedIds.includes(item.resultId);
                            return (
                              <tr key={item.resultId} className="hover:bg-slate-50">
                                <td className="p-2.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleOne(item.resultId)}
                                    className="rounded text-teal-600"
                                  />
                                </td>
                                <td className="p-2.5">
                                  <div className="font-extrabold text-slate-900">
                                    {item.studentName}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Mã HS: {item.studentCode} • Lớp {item.className} ({item.campusCode})
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-teal-800">{item.examLabel}</div>
                                  <div className="text-[11px] text-slate-600">
                                    {item.summaryScoreLabel}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  {item.homeroomTeachers.length > 0 ? (
                                    item.homeroomTeachers.map((gv) => (
                                      <div key={gv.userId} className="space-y-0.5">
                                        <div className="font-bold text-slate-800">
                                          {gv.teacherName}
                                        </div>
                                        {gv.phone && (
                                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Phone className="w-2.5 h-2.5" />
                                            <span>{gv.phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[11px] text-amber-600">
                                      Chưa gán GVCN lớp
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {item.parents.length > 0 ? (
                                    item.parents.map((pr) => (
                                      <div key={pr.userId} className="space-y-0.5">
                                        <div className="font-bold text-slate-800">
                                          {pr.parentName}
                                        </div>
                                        {pr.phone && (
                                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Phone className="w-2.5 h-2.5" />
                                            <span>{pr.phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[11px] text-amber-600">
                                      Chưa liên kết TK PH
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* HISTORY TAB */
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-slate-800">
                Nhật ký Thông báo Chứng chỉ Quốc tế đã gửi tới GVCN & Phụ huynh ({recentNotifications.length})
              </div>
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-200">
                  Chưa có lịch sử thông báo chứng chỉ quốc tế nào.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-left">
                      <tr>
                        <th className="p-3 font-bold">Thời gian</th>
                        <th className="p-3 font-bold">Người nhận</th>
                        <th className="p-3 font-bold">Vai trò</th>
                        <th className="p-3 font-bold">Tiêu đề & Nội dung</th>
                        <th className="p-3 font-bold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentNotifications.map((n) => (
                        <tr key={n.id} className="hover:bg-slate-50">
                          <td className="p-3 whitespace-nowrap text-slate-500">
                            {new Date(n.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{n.recipientName}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                n.recipientRole === 'TEACHER'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {n.recipientRole === 'TEACHER' ? 'GVCN Lớp' : 'Phụ huynh'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-extrabold text-slate-900">{n.title}</div>
                            <div className="text-[11px] text-slate-600 line-clamp-2">
                              {n.message}
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {n.isRead ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã xem
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                                <Clock className="w-3.5 h-3.5" />
                                Chưa đọc
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Mẹo: Khi lưu kết quả thi mới ở biểu mẫu nhập liệu, hệ thống cũng <strong>tự động gửi thông báo 3 chiều</strong> tới GVCN, Phụ huynh và Cổng Học sinh.
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
            >
              Đóng
            </button>
            {activeTab === 'COMPOSE' && (
              <button
                type="button"
                disabled={sending || selectedIds.length === 0}
                onClick={handleSend}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 shadow-sm transition"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi thông báo 3 chiều...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi Thông báo tới GVCN • PH • Học sinh ({selectedIds.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
