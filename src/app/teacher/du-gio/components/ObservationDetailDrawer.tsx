"use client"

import React, { useMemo } from "react"
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  BookOpen,
  Award,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Clock3,
  AlertCircle,
  FileText,
  Printer,
  Edit,
  Zap,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Layers,
  Building2,
  ChevronRight,
  Info
} from "lucide-react"
import { DetailDrawer } from "@/components/ui/drawer"
import { StatusBadge, Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ObservationDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: any
  currentTeacher?: any
  userRole?: string
  onEvaluate?: (slot: any, registration: any) => void
  onPrint?: (slot: any, registration: any) => void
  onRegister?: (slot: any) => void
  onCancelRegister?: (slot: any, registration: any) => void
}

const maxScoresK12 = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
const k12CriteriaGroups = [
  {
    groupName: "1. Kế hoạch và Chuẩn bị (3.0đ)",
    items: [
      { id: 0, label: "Y1: Chuẩn bị giáo án, bám sát kiến thức kỹ năng", max: 1.5 },
      { id: 1, label: "Y2: Sử dụng đồ dùng, thiết bị dạy học phù hợp", max: 1.5 }
    ]
  },
  {
    groupName: "2. Nội dung Bài dạy (5.0đ)",
    items: [
      { id: 2, label: "Y3: Nội dung bài giảng chính xác, khoa học", max: 2.0 },
      { id: 3, label: "Y4: Đảm bảo tính hệ thống, trọng tâm bài dạy", max: 2.0 },
      { id: 4, label: "Y5: Liên hệ thực tế đời sống, tính giáo dục", max: 1.0 }
    ]
  },
  {
    groupName: "3. Phương pháp & Hoạt động (9.0đ)",
    items: [
      { id: 5, label: "Y6: Không đọc chép, hỗ trợ kịp thời học sinh", max: 2.0 },
      { id: 6, label: "Y7: Tổ chức học tập chủ động, hợp tác nhóm", max: 3.0 },
      { id: 7, label: "Y8: Linh hoạt các khâu, phân phối thời gian hợp lý", max: 2.0 },
      { id: 8, label: "Y9: Kết hợp các phương pháp, khuyến khích tư duy", max: 2.0 }
    ]
  },
  {
    groupName: "4. Kết quả & Đánh giá (3.0đ)",
    items: [
      { id: 9, label: "Y10: Đánh giá quá trình học, học sinh nắm vững bài", max: 2.0 },
      { id: 10, label: "Y11: Tiết dạy nhuần nhuyễn, sinh động, sáng tạo", max: 1.0 }
    ]
  }
];

export function ObservationDetailDrawer({
  open,
  onOpenChange,
  slot,
  currentTeacher,
  userRole,
  onEvaluate,
  onPrint,
  onRegister,
  onCancelRegister
}: ObservationDetailDrawerProps) {
  if (!slot) return null;

  const registrations = Array.isArray(slot.registrations) ? slot.registrations : [];
  const currentTeacherId = currentTeacher?.id;
  const isOwnerTeacher = slot.teacherId === currentTeacherId;
  const myReg = registrations.find((r: any) => r.teacherId === currentTeacherId);
  const isRegistered = !!myReg;
  const canRegisterMore = registrations.length < 4;
  const isExpired = slot.status === "EXPIRED" || (slot.date && new Date(slot.date) < new Date(new Date().setHours(0, 0, 0, 0)));
  const isSurprise = slot.requestOrigin === "SURPRISE" || (typeof slot.description === "string" && slot.description.includes("[SURPRISE]"));

  // Check evaluations
  const evaluations = registrations
    .filter((r: any) => r.evaluation)
    .map((r: any) => ({
      registration: r,
      evaluation: r.evaluation,
      observerName: r.teacher?.teacherName || "Người dự"
    }));

  const formatDateVi = (d: string | Date | undefined) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return String(d);
    }
  };

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Tiết ${slot.period || "-"} • ${slot.subjectName || "Môn học"}`}
      description={`${slot.className || "Lớp"} • ${formatDateVi(slot.date)}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-medium">
            Số người dự: <strong className={canRegisterMore ? "text-emerald-700" : "text-amber-700"}>{registrations.length}/4 người</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            {!isOwnerTeacher && !isRegistered && canRegisterMore && !isExpired && onRegister && (
              <Button variant="primary" size="sm" onClick={() => onRegister(slot)} leftIcon={<Users className="w-3.5 h-3.5" />}>
                Đăng ký dự giờ
              </Button>
            )}
            {isRegistered && myReg?.evaluation && onPrint && (
              <Button variant="secondary" size="sm" onClick={() => onPrint(slot, myReg)} leftIcon={<Printer className="w-3.5 h-3.5" />}>
                In phiếu A4
              </Button>
            )}
            {isRegistered && !myReg?.evaluation && !isExpired && onEvaluate && (
              <Button variant="primary" size="sm" onClick={() => onEvaluate(slot, myReg)} leftIcon={<ClipboardList className="w-3.5 h-3.5" />}>
                Chấm điểm phiếu
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* 1. STATUS & QUICK METRICS HEADER */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={slot.status || "Chờ thực hiện"} />
              {isSurprise && (
                <Badge variant="destructive" className="gap-1">
                  <Zap className="size-3 text-amber-300" />
                  <span>Dự giờ đột xuất</span>
                </Badge>
              )}
              {slot.level && (
                <Badge variant="secondary">{slot.level}</Badge>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-500">Mã: #{slot.id?.slice(-6) || "SLOT"}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60 text-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Ngày dạy</span>
              <span className="font-bold flex items-center gap-1 mt-0.5">
                <Calendar className="size-3.5 text-slate-400" /> {formatDateVi(slot.date)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Tiết học</span>
              <span className="font-bold flex items-center gap-1 mt-0.5">
                <Clock className="size-3.5 text-slate-400" /> Tiết {slot.period || "-"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Lớp / Khối</span>
              <span className="font-bold flex items-center gap-1 mt-0.5">
                <Building2 className="size-3.5 text-slate-400" /> {slot.className || "-"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Số người dự</span>
              <span className="font-bold flex items-center gap-1 mt-0.5">
                <Users className="size-3.5 text-slate-400" /> {registrations.length}/4
              </span>
            </div>
          </div>
        </div>

        {/* 2. TOPIC & CONTENT */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chủ đề & Nội dung bài dạy</h4>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <p className="font-bold text-sm text-slate-900 leading-snug">
              {slot.topic || "Chưa có tên bài học"}
            </p>
            {slot.description && (
              <p className="text-slate-600 leading-relaxed text-xs">
                {slot.description}
              </p>
            )}
          </div>
        </div>

        {/* 3. TEACHER (NGƯỜI DẠY) */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên giảng dạy</h4>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-[#003B3A]/10 text-[#003B3A] font-bold flex items-center justify-center text-sm border border-[#003B3A]/20">
                {(slot.teacher?.teacherName || "T").charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  {slot.teacher?.teacherName || "Chưa rõ giáo viên"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Mã: {slot.teacher?.teacherCode || "-"} • Tổ: {slot.teacher?.departmentRel?.name || slot.departmentName || "Chuyên môn"}
                </p>
              </div>
            </div>
            {isOwnerTeacher && (
              <Badge variant="primary">Tiết của tôi</Badge>
            )}
          </div>
        </div>

        {/* 4. WORKFLOW TIMELINE */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiến trình quy trình chuyên môn</h4>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 relative">
              <div className="flex flex-col items-center z-10">
                <span className="size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] mb-1">✓</span>
                <span>Mở tiết</span>
              </div>
              <div className="flex flex-col items-center z-10">
                <span className={cn("size-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1", registrations.length > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600")}>
                  {registrations.length > 0 ? "✓" : "2"}
                </span>
                <span>Đăng ký ({registrations.length}/4)</span>
              </div>
              <div className="flex flex-col items-center z-10">
                <span className={cn("size-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1", evaluations.length > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600")}>
                  {evaluations.length > 0 ? "✓" : "3"}
                </span>
                <span>Đánh giá ({evaluations.length})</span>
              </div>
              <div className="flex flex-col items-center z-10">
                <span className={cn("size-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1", slot.status === "COMPLETED" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600")}>
                  {slot.status === "COMPLETED" ? "✓" : "4"}
                </span>
                <span>Hoàn tất</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. OBSERVERS (NGƯỜI DỰ GIỜ) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Danh sách Người dự giờ</h4>
            <span className="text-[11px] font-semibold text-slate-500">{registrations.length}/4 người</span>
          </div>

          {registrations.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 text-xs">
              Chưa có giáo viên nào đăng ký dự tiết này.
              {!isOwnerTeacher && canRegisterMore && !isExpired && onRegister && (
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => onRegister(slot)}>
                    Đăng ký tham gia dự
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {registrations.map((reg: any, idx: number) => {
                const isMe = reg.teacherId === currentTeacherId;
                const hasEval = !!reg.evaluation;

                return (
                  <div key={reg.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          {reg.teacher?.teacherName || "Giáo viên dự"}
                          {isMe && <Badge variant="pine" className="text-[10px] px-1.5 py-0">Bạn</Badge>}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Đăng ký: {formatDateVi(reg.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasEval ? (
                        <div className="text-right">
                          <Badge variant="success" className="text-[10px]">Đã đánh giá</Badge>
                          {reg.evaluation?.overallRating && (
                            <span className="block font-bold text-emerald-800 text-[11px] mt-0.5">
                              {reg.evaluation.overallRating}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">Chờ đánh giá</Badge>
                      )}

                      {isMe && !hasEval && !isExpired && onEvaluate && (
                        <Button variant="primary" size="xs" onClick={() => onEvaluate(slot, reg)}>
                          Chấm điểm
                        </Button>
                      )}
                      {hasEval && onPrint && (
                        <Button variant="ghost" size="icon-sm" onClick={() => onPrint(slot, reg)} title="In phiếu">
                          <Printer className="size-3.5 text-slate-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. EVALUATION DETAILS (IF ANY EVALUATION EXISTS) */}
        {evaluations.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="size-3.5 text-[#003B3A]" /> Kết quả Đánh giá Tiết dạy
            </h4>

            {evaluations.map((item: any, eIdx: number) => {
              const ev = item.evaluation;
              let parsedGeneral: any = null;
              try {
                if (ev.generalComment && ev.generalComment.startsWith("{")) {
                  parsedGeneral = JSON.parse(ev.generalComment);
                }
              } catch {}

              const scores: number[] = parsedGeneral?.scores || [
                ev.criterion1 || 0,
                ev.criterion2 || 0,
                ev.criterion3 || 0,
                ev.criterion4 || 0,
                ev.criterion5 || 0
              ];

              const totalScore = ev.totalScore || scores.reduce((a: number, b: number) => a + b, 0);

              return (
                <div key={item.registration.id || eIdx} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Người chấm</span>
                      <strong className="text-slate-900 text-xs">{item.observerName}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-[#003B3A]">{Number(totalScore).toFixed(1)} / 20.0đ</span>
                      <Badge variant="success" className="ml-2 font-bold">{ev.overallRating || "Đạt"}</Badge>
                    </div>
                  </div>

                  {/* Criteria score pills */}
                  {scores.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {scores.slice(0, 11).map((sc: number, idx: number) => (
                        <div key={idx} className="p-1.5 bg-white rounded-lg border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-400 block font-mono">Y{idx + 1}</span>
                          <span className="font-bold text-slate-800 text-xs">{Number(sc).toFixed(1)}đ</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Qualitative comments */}
                  <div className="space-y-1.5 text-xs">
                    {ev.effectivePoints && (
                      <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <span className="font-bold text-emerald-900 block text-[11px]">Ưu điểm bài dạy:</span>
                        <p className="text-emerald-800 mt-0.5">{ev.effectivePoints}</p>
                      </div>
                    )}
                    {ev.ineffectivePoints && (
                      <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                        <span className="font-bold text-amber-900 block text-[11px]">Góp ý hoàn thiện:</span>
                        <p className="text-amber-800 mt-0.5">{ev.ineffectivePoints}</p>
                      </div>
                    )}
                  </div>

                  {/* AI Support section */}
                  {ev.aiAnalysis && (
                    <div className="p-3 bg-violet-50/60 rounded-xl border border-violet-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-violet-900 font-bold text-[11px]">
                        <Sparkles className="size-3.5 text-violet-600" />
                        <span>AI Hỗ trợ Phân tích Chuyên môn</span>
                      </div>
                      <p className="text-violet-800 text-xs leading-relaxed">{ev.aiAnalysis}</p>
                      <p className="text-[10px] text-violet-600/80 italic pt-1">
                        * Ghi chú: Nội dung AI chỉ mang tính tham khảo hỗ trợ; kết quả chính thức được ký duyệt bởi người có thẩm quyền.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DetailDrawer>
  );
}
