"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Mail,
  Send,
  Loader2,
  ClipboardCheck,
  UserCheck,
  ExternalLink,
  Clock,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  normalizeSubjectCanonicalKey,
  type StudentCompletenessResult,
} from "@/lib/entranceCompleteness";
import type { EmailRoutingConfigData } from "./EmailRoutingConfigModal";

interface CompletenessCheckModalProps {
  open: boolean;
  onClose: () => void;
  students: any[];
  completenessMap: Map<string, StudentCompletenessResult>;
  periodId: string;
  periodName: string;
  batchId: string;
  batchName: string;
  campuses: { id: string; campusCode: string; campusName: string }[];
  emailRoutingConfig: EmailRoutingConfigData;
  defaultGdcsEmailMap: Record<string, string>;
  resolveStudentCampusCode: (student: any) => string;
  onOpenStudent: (studentId: string) => void;
  onNotify: (msg: string, type?: "ok" | "err") => void;
  onGdcsSubmitted?: (studentIds: string[], sentAtIso: string) => void;
}

interface TeacherReminderGroup {
  key: string;
  teacherUserId?: string;
  teacherName: string;
  teacherEmail: string;
  subjects: string[];
  students: {
    id: string;
    studentCode?: string;
    fullName: string;
    grade?: string;
    campus?: string;
    missingSubjects: string[];
  }[];
}

export function CompletenessCheckModal({
  open,
  onClose,
  students,
  completenessMap,
  periodId,
  periodName,
  batchId,
  batchName,
  campuses,
  emailRoutingConfig,
  defaultGdcsEmailMap,
  resolveStudentCampusCode,
  onOpenStudent,
  onNotify,
  onGdcsSubmitted,
}: CompletenessCheckModalProps) {
  const [activeTab, setActiveTab] = useState<"ready" | "missing" | "approved">("ready");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Teacher reminder selection & sending state
  const [selectedTeacherKeys, setSelectedTeacherKeys] = useState<string[]>([]);
  const [deadlineNote, setDeadlineNote] = useState("Vui lòng hoàn thành nhập điểm & nhận xét trong ngày hôm nay để Giáo vụ kịp tổng hợp trình GĐCS xét duyệt.");
  const [sendingReminders, setSendingReminders] = useState(false);

  // Submit ready students to GDCS state
  const [selectedReadyIds, setSelectedReadyIds] = useState<string[]>([]);
  const [sendingGdcs, setSendingGdcs] = useState(false);

  const activeStudents = useMemo(
    () => (students || []).filter((s) => !s.isAbsent),
    [students]
  );

  const readyPendingStudents = useMemo(
    () =>
      activeStudents.filter((s) => {
        if (s.admissionResult) return false;
        const c = completenessMap.get(s.id);
        return c?.status === "READY";
      }),
    [activeStudents, completenessMap]
  );

  const missingPendingStudents = useMemo(
    () =>
      activeStudents.filter((s) => {
        if (s.admissionResult) return false;
        const c = completenessMap.get(s.id);
        return c?.status === "INCOMPLETE" || c?.status === "NO_SCORES";
      }),
    [activeStudents, completenessMap]
  );

  const approvedStudents = useMemo(
    () => activeStudents.filter((s) => Boolean(s.admissionResult)),
    [activeStudents]
  );

  // Sync default selections when modal opens
  useEffect(() => {
    if (!open) return;
    setSelectedReadyIds(readyPendingStudents.map((s) => s.id));
    if (readyPendingStudents.length === 0 && missingPendingStudents.length > 0) {
      setActiveTab("missing");
    } else {
      setActiveTab("ready");
    }
  }, [open, readyPendingStudents.length, missingPendingStudents.length]);

  // Load teacher assignments for current period to map missing subjects -> assigned teachers
  useEffect(() => {
    if (!open || !periodId) return;
    let cancelled = false;
    setLoadingAssignments(true);
    fetch(`/api/input-assessment-assignments?periodId=${encodeURIComponent(periodId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) {
          setAssignments(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) setAssignments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, periodId]);

  const resolveGdcsEmailForCampus = (csCode: string): string => {
    const clean = String(csCode || "").toUpperCase();
    const routed = emailRoutingConfig?.campusEmails?.[clean]?.gdcs;
    if (routed && routed.trim()) {
      return routed.split(/[,;]/)[0].trim();
    }
    return defaultGdcsEmailMap[clean] || defaultGdcsEmailMap.CS1 || "ktdbcl@skylineschool.edu.vn";
  };

  // Map missing subjects of missingPendingStudents -> assigned teachers
  const { teacherGroups, unassignedMissing } = useMemo(() => {
    const groupMap = new Map<string, TeacherReminderGroup>();
    const unassigned: { student: any; missingSubjects: string[] }[] = [];

    for (const st of missingPendingStudents) {
      const comp = completenessMap.get(st.id);
      const missingList = comp?.missingSubjects || [];
      if (missingList.length === 0) continue;

      const stGradeNum = String(st.grade || "").replace(/\D/g, "");
      const stCampus = resolveStudentCampusCode(st);
      const stUnassignedSubjects: string[] = [];

      for (const subjName of missingList) {
        const subjKey = normalizeSubjectCanonicalKey(subjName);

        // Find matching assignment(s) for this student's missing subject
        const matched = assignments.filter((a: any) => {
          const aSubjKey = normalizeSubjectCanonicalKey(a?.subject?.name || a?.subjectName || "");
          if (aSubjKey !== subjKey) return false;
          if (a.batchId && st.batchId && a.batchId !== st.batchId) return false;
          if (a.grade && stGradeNum) {
            const aGradeClean = String(a.grade).replace(/\D/g, "");
            if (aGradeClean && aGradeClean !== stGradeNum && !String(a.grade).toLowerCase().includes("tất cả")) {
              return false;
            }
          }
          return true;
        });

        if (matched.length === 0) {
          stUnassignedSubjects.push(subjName);
          continue;
        }

        for (const a of matched) {
          const targetUser = a.delegatedUser || a.user;
          const email = String(targetUser?.email || "").trim().toLowerCase();
          const name = targetUser?.fullName || "Giáo viên khảo sát";
          const tKey = email || a.userId || name;

          if (!groupMap.has(tKey)) {
            groupMap.set(tKey, {
              key: tKey,
              teacherUserId: targetUser?.id || a.userId,
              teacherName: name,
              teacherEmail: email,
              subjects: [],
              students: [],
            });
          }
          const grp = groupMap.get(tKey)!;
          if (!grp.subjects.includes(subjName)) grp.subjects.push(subjName);
          let stEntry = grp.students.find((x) => x.id === st.id);
          if (!stEntry) {
            stEntry = {
              id: st.id,
              studentCode: st.studentCode,
              fullName: st.fullName,
              grade: st.grade,
              campus: stCampus,
              missingSubjects: [],
            };
            grp.students.push(stEntry);
          }
          if (!stEntry.missingSubjects.includes(subjName)) {
            stEntry.missingSubjects.push(subjName);
          }
        }
      }

      if (stUnassignedSubjects.length > 0) {
        unassigned.push({ student: st, missingSubjects: stUnassignedSubjects });
      }
    }

    const groups = Array.from(groupMap.values()).sort((a, b) => b.students.length - a.students.length);
    return { teacherGroups: groups, unassignedMissing: unassigned };
  }, [missingPendingStudents, completenessMap, assignments, resolveStudentCampusCode]);

  useEffect(() => {
    setSelectedTeacherKeys(teacherGroups.filter((g) => g.teacherEmail).map((g) => g.key));
  }, [teacherGroups.length]);

  const handleSendTeacherReminders = async () => {
    const selectedGroups = teacherGroups.filter(
      (g) => selectedTeacherKeys.includes(g.key) && g.teacherEmail
    );
    if (selectedGroups.length === 0) {
      onNotify("Vui lòng chọn ít nhất 1 giáo viên có địa chỉ email hợp lệ để gửi nhắc nhở.", "err");
      return;
    }

    setSendingReminders(true);
    try {
      const res = await fetch("/api/admin/xet-duyet-ket-qua/remind-teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodName,
          batchName,
          deadlineNote: deadlineNote.trim(),
          reminders: selectedGroups.map((g) => ({
            teacherUserId: g.teacherUserId,
            teacherName: g.teacherName,
            teacherEmail: g.teacherEmail,
            subjects: g.subjects,
            students: g.students,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onNotify(
          `Đã gửi email yêu cầu hoàn thành nhập điểm tới ${data.sentCount}/${selectedGroups.length} giáo viên thành công!`,
          "ok"
        );
      } else {
        onNotify(data.error || "Không thể gửi email nhắc giáo viên.", "err");
      }
    } catch (e: any) {
      onNotify("Lỗi kết nối khi gửi email nhắc giáo viên: " + (e?.message || ""), "err");
    } finally {
      setSendingReminders(false);
    }
  };

  const handleSubmitReadyToGdcs = async () => {
    const chosenStudents = readyPendingStudents.filter((s) => selectedReadyIds.includes(s.id));
    if (chosenStudents.length === 0) {
      onNotify("Vui lòng chọn ít nhất 1 học sinh đã đủ điểm để trình GĐCS xét duyệt.", "err");
      return;
    }

    // Group selected ready students by resolved GDCS email
    const byGdcs = new Map<string, { campusLabel: string; students: any[] }>();
    for (const s of chosenStudents) {
      const csCode = resolveStudentCampusCode(s);
      const gdcsEmail = resolveGdcsEmailForCampus(csCode);
      if (!byGdcs.has(gdcsEmail)) {
        const cObj = campuses.find((c) => c.campusCode === csCode);
        byGdcs.set(gdcsEmail, {
          campusLabel: cObj?.campusName || csCode || "Cơ sở",
          students: [],
        });
      }
      byGdcs.get(gdcsEmail)!.students.push(s);
    }

    const summaryLines = Array.from(byGdcs.entries())
      .map(([email, info]) => `• ${info.campusLabel}: ${info.students.length} HS → ${email}`)
      .join("\n");

    if (
      !window.confirm(
        `Gửi email trình GĐCS xét duyệt cho ${chosenStudents.length} học sinh đã ĐỦ ĐIỂM các nội dung khảo sát?\n\n${summaryLines}`
      )
    ) {
      return;
    }

    setSendingGdcs(true);
    try {
      let totalSentEmails = 0;
      const errors: string[] = [];

      for (const [gdcsEmail, info] of byGdcs.entries()) {
        const res = await fetch("/api/admin/send-batch-approval-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodId,
            batchId: batchId && batchId !== "none" ? batchId : "all",
            gdcsEmail,
            isPreschool: false,
            studentIds: info.students.map((st) => st.id),
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          totalSentEmails++;
        } else {
          errors.push(`${gdcsEmail}: ${data.error || "Lỗi gửi mail"}`);
        }
      }

      if (totalSentEmails > 0) {
        onGdcsSubmitted?.(
          chosenStudents.map((st) => String(st.id)),
          new Date().toISOString()
        );
        onNotify(
          `Đã gửi email trình GĐCS xét duyệt cho ${chosenStudents.length} học sinh đủ điểm (${totalSentEmails} cơ sở)!`,
          "ok"
        );
        if (errors.length === 0) onClose();
      } else {
        onNotify(`Không thể gửi email trình GĐCS: ${errors.join("; ")}`, "err");
      }
    } catch (e: any) {
      onNotify("Lỗi khi gửi email trình GĐCS: " + (e?.message || ""), "err");
    } finally {
      setSendingGdcs(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-3 sm:p-5">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-[#5EEAD4]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold truncate">
                Kiểm tra đủ nội dung khảo sát, nhắc GV &amp; trình GĐCS xét duyệt
              </h3>
              <p className="text-xs text-teal-100/90 truncate">
                {periodName || "Kỳ khảo sát"} • {batchName || "Tất cả các đợt"} • {activeStudents.length} học sinh (không tính vắng)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Segmented Tabs */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 tabular-nums">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab("ready")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeTab === "ready"
                  ? "bg-[#003B3A] text-white border-[#003B3A]"
                  : "bg-white text-slate-700 border-[#E2E8F0] hover:border-[#008B85]"
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === "ready" ? "text-[#5EEAD4]" : "text-[#059669]"}`} />
              <span>Đủ điểm chờ trình GĐCS</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${activeTab === "ready" ? "bg-white/15 text-white" : "bg-emerald-50 text-[#059669]"}`}>
                {readyPendingStudents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("missing")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeTab === "missing"
                  ? "bg-[#D97706] text-white border-[#D97706]"
                  : "bg-white text-slate-700 border-[#E2E8F0] hover:border-[#D97706]"
              }`}
            >
              <AlertCircle className={`w-3.5 h-3.5 ${activeTab === "missing" ? "text-white" : "text-[#D97706]"}`} />
              <span>Thiếu điểm cần nhắc GV</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${activeTab === "missing" ? "bg-white/20 text-white" : "bg-amber-50 text-[#D97706]"}`}>
                {missingPendingStudents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("approved")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                activeTab === "approved"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-[#E2E8F0] hover:border-slate-400"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Đã phê duyệt</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${activeTab === "approved" ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>
                {approvedStudents.length}
              </span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "ready" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1]">
                <div className="text-xs text-[#003B3A] space-y-0.5">
                  <div className="font-bold">
                    Học sinh đã hoàn tất đầy đủ các môn khảo sát theo Quy chế tuyển sinh
                  </div>
                  <div className="text-slate-600">
                    Chọn danh sách học sinh bên dưới để gửi email trình Giám đốc Cơ sở xét duyệt (email GĐCS lấy theo cấu hình từng cơ sở).
                  </div>
                </div>
                <button
                  type="button"
                  disabled={sendingGdcs || selectedReadyIds.length === 0}
                  onClick={handleSubmitReadyToGdcs}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {sendingGdcs ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  )}
                  <span>Gửi mail trình GĐCS xét duyệt ({selectedReadyIds.length} HS)</span>
                </button>
              </div>

              {readyPendingStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                  Hiện chưa có học sinh nào ở trạng thái đủ điểm chờ trình GĐCS.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                          <th className="py-2.5 px-3 text-center text-white w-10">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedReadyIds.length === readyPendingStudents.length) {
                                  setSelectedReadyIds([]);
                                } else {
                                  setSelectedReadyIds(readyPendingStudents.map((s) => s.id));
                                }
                              }}
                              className="text-white cursor-pointer"
                            >
                              {selectedReadyIds.length === readyPendingStudents.length ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </th>
                          <th className="py-2.5 px-3 text-white">Học sinh</th>
                          <th className="py-2.5 px-3 text-teal-100 text-center">Khối / Hệ</th>
                          <th className="py-2.5 px-3 text-teal-100 text-center">Cơ sở</th>
                          <th className="py-2.5 px-3 text-[#5EEAD4]">Tiến độ môn khảo sát</th>
                          <th className="py-2.5 px-3 text-teal-100">Email GĐCS nhận</th>
                          <th className="py-2.5 px-3 text-white text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                        {readyPendingStudents.map((st) => {
                          const comp = completenessMap.get(st.id);
                          const csCode = resolveStudentCampusCode(st);
                          const gdcsEmail = resolveGdcsEmailForCampus(csCode);
                          const checked = selectedReadyIds.includes(st.id);
                          return (
                            <tr
                              key={st.id}
                              className={`transition-colors align-middle ${
                                checked ? "bg-[#F0FDFA]/60 hover:bg-[#F0FDFA]" : "hover:bg-[#F8FAFC]"
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setSelectedReadyIds((prev) =>
                                      prev.includes(st.id)
                                        ? prev.filter((id) => id !== st.id)
                                        : [...prev, st.id]
                                    )
                                  }
                                  className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A] cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-[#003B3A]">{st.fullName}</div>
                                <div className="text-[11px] text-slate-500">{st.studentCode || "—"}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-700">
                                Khối {String(st.grade || "").replace(/^Khối\s*/i, "")} • {st.surveyFormType || st.surveySystem || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                {csCode || "—"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {comp && comp.requiredCount > 0
                                    ? `Đủ ${comp.completedCount}/${comp.requiredCount} môn`
                                    : comp?.regulationBadgeLabel || "Đủ điều kiện xét duyệt"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-600">{gdcsEmail}</td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onOpenStudent(st.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#008B85] text-[#003B3A] text-[11px] font-semibold cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Mở hồ sơ</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "missing" && (
            <div className="space-y-4">
              {/* Action bar for reminding teachers */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-amber-950">
                    <div className="font-bold">Gửi email yêu cầu giáo viên hoàn thành nhập điểm còn thiếu</div>
                    <div className="text-amber-800/90 mt-0.5">
                      Hệ thống tự động đối chiếu danh sách phân công giảng dạy của kỳ để xác định đúng giáo viên phụ trách từng môn còn thiếu.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={sendingReminders || selectedTeacherKeys.length === 0}
                    onClick={handleSendTeacherReminders}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#003B3A] hover:bg-[#005250] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {sendingReminders ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    )}
                    <span>Yêu cầu GV hoàn thành ({selectedTeacherKeys.length} GV)</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Lời nhắn / Thời hạn hoàn thành gửi kèm trong email:
                  </label>
                  <input
                    type="text"
                    value={deadlineNote}
                    onChange={(e) => setDeadlineNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs text-slate-800 outline-none focus:border-[#008B85]"
                  />
                </div>
              </div>

              {/* Grouped by assigned teachers */}
              {loadingAssignments ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#008B85]" />
                  <span>Đang tải danh sách phân công giáo viên...</span>
                </div>
              ) : teacherGroups.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#003B3A]">
                    Giáo viên cần nhắc hoàn thành điểm ({teacherGroups.length} giáo viên)
                  </h4>
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                            <th className="py-2.5 px-3 text-center text-white w-10">Chọn</th>
                            <th className="py-2.5 px-3 text-white">Giáo viên phụ trách</th>
                            <th className="py-2.5 px-3 text-teal-100">Môn còn thiếu</th>
                            <th className="py-2.5 px-3 text-[#5EEAD4] text-center">Số HS thiếu</th>
                            <th className="py-2.5 px-3 text-teal-100">Danh sách học sinh</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                          {teacherGroups.map((grp) => {
                            const checked = selectedTeacherKeys.includes(grp.key);
                            return (
                              <tr key={grp.key} className="hover:bg-[#F8FAFC] align-middle">
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    disabled={!grp.teacherEmail}
                                    checked={checked}
                                    onChange={() =>
                                      setSelectedTeacherKeys((prev) =>
                                        prev.includes(grp.key)
                                          ? prev.filter((k) => k !== grp.key)
                                          : [...prev, grp.key]
                                      )
                                    }
                                    className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A] cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-[#003B3A]">{grp.teacherName}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {grp.teacherEmail || "Chưa có email"}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {grp.subjects.map((sub) => (
                                      <span
                                        key={sub}
                                        className="px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold"
                                      >
                                        {sub}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-bold text-[#D97706]">
                                  {grp.students.length} HS
                                </td>
                                <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs">
                                  {grp.students
                                    .slice(0, 4)
                                    .map((st) => `${st.fullName} (K${String(st.grade || "").replace(/\D/g, "")})`)
                                    .join(", ")}
                                  {grp.students.length > 4 && ` +${grp.students.length - 4} HS khác`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Detailed list of missing students */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#003B3A]">
                  Chi tiết học sinh còn thiếu nội dung khảo sát ({missingPendingStudents.length} học sinh)
                </h4>
                {missingPendingStudents.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                    Tất cả học sinh chờ duyệt đều đã đủ điểm các môn khảo sát bắt buộc.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                            <th className="py-2.5 px-3 text-white">Học sinh</th>
                            <th className="py-2.5 px-3 text-teal-100 text-center">Khối / Hệ</th>
                            <th className="py-2.5 px-3 text-teal-100 text-center">Tiến độ</th>
                            <th className="py-2.5 px-3 text-[#5EEAD4]">Môn còn thiếu</th>
                            <th className="py-2.5 px-3 text-white text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                          {missingPendingStudents.map((st) => {
                            const comp = completenessMap.get(st.id);
                            const hasUnassigned = unassignedMissing.some((u) => u.student.id === st.id);
                            return (
                              <tr key={st.id} className="hover:bg-[#F8FAFC] align-middle">
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-[#003B3A]">{st.fullName}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {st.studentCode || "—"} • {resolveStudentCampusCode(st)}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center text-slate-700">
                                  Khối {String(st.grade || "").replace(/^Khối\s*/i, "")} • {st.surveyFormType || st.surveySystem || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    {comp?.completedCount ?? 0}/{comp?.requiredCount ?? 0} môn
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(comp?.missingSubjects || []).map((m) => (
                                      <span
                                        key={m}
                                        className="px-2 py-0.5 rounded-md bg-rose-50 text-[#E11D48] border border-rose-200 text-[11px] font-semibold"
                                      >
                                        Thiếu: {m}
                                      </span>
                                    ))}
                                    {hasUnassigned && (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10.5px]">
                                        Chưa có phân công GV
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onOpenStudent(st.id);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#008B85] text-[#003B3A] text-[11px] font-semibold cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Chi tiết</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "approved" && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              {approvedStudents.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Chưa có học sinh nào được phê duyệt trong phạm vi lọc hiện tại.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#003B3A] border-b border-[#003B3A] text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-2.5 px-3 text-white">Học sinh</th>
                        <th className="py-2.5 px-3 text-teal-100 text-center">Khối / Cơ sở</th>
                        <th className="py-2.5 px-3 text-[#5EEAD4] text-center">Kết quả xét duyệt</th>
                        <th className="py-2.5 px-3 text-teal-100">Người phê duyệt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                      {approvedStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-[#F8FAFC] align-middle">
                          <td className="py-2.5 px-3 font-semibold text-[#003B3A]">
                            {st.fullName}{" "}
                            <span className="font-normal text-slate-500">({st.studentCode || "—"})</span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-700">
                            Khối {String(st.grade || "").replace(/^Khối\s*/i, "")} • {resolveStudentCampusCode(st)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-[#059669]">
                            {st.admissionResult}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{st.signatureName || "—"}</td>
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
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-slate-500">
          <span>
            Quy tắc Sky-Line: Chỉ trình GĐCS các hồ sơ đã hoàn thành đủ nội dung khảo sát theo Quy chế tuyển sinh.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-slate-400 text-slate-700 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
