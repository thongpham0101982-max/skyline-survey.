"use client"

import React from "react"
import Link from "next/link"
import {
  Award,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  ExternalLink,
  MessageSquareHeart,
  Trophy,
  X,
} from "lucide-react"
import type {
  RecognitionRecordItem,
  TeacherDevelopmentPlanItem,
  TeacherNpsPeriodRow,
  TeacherOverviewRow,
} from "@/lib/teacher-quality/types"
import { coachingStatusLabelVi } from "@/lib/teacher-quality/recognitionEngine"

interface TeacherProfileDrawerProps {
  open: boolean
  teacher: TeacherOverviewRow | null
  academicYearName: string
  recognitions: RecognitionRecordItem[]
  npsRows: TeacherNpsPeriodRow[]
  coachingPlans: TeacherDevelopmentPlanItem[]
  onClose: () => void
  onOpenMonthlyObs: (teacherId: string) => void
  onOpenEditCoaching: (plan: TeacherDevelopmentPlanItem) => void
}

export function TeacherProfileDrawer({
  open,
  teacher,
  academicYearName,
  recognitions,
  npsRows,
  coachingPlans,
  onClose,
  onOpenMonthlyObs,
  onOpenEditCoaching,
}: TeacherProfileDrawerProps) {
  if (!open || !teacher) return null

  const tRecs = recognitions.filter((r) => r.teacherId === teacher.teacherId)
  const tNps = npsRows.filter((n) => n.teacherId === teacher.teacherId)
  const tCoaching = coachingPlans.filter((c) => c.teacherId === teacher.teacherId)

  const deptAwards = tRecs.filter((r) => r.groupType === "DEPT_AWARD")
  const sysAwards = tRecs.filter((r) => r.groupType === "SYSTEM_AWARD")
  const competitions = tRecs.filter((r) => r.groupType === "STUDENT_COMPETITION")
  const aiTechs = tRecs.filter((r) => r.groupType === "AI_TECH")

  return (
    <div className="fixed inset-0 z-[65] flex justify-end bg-slate-900/45 backdrop-blur-[1px]">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col">
        {/* Masthead */}
        <div className="bg-[#003B3A] text-white px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-[#5EEAD4] font-medium">
              Hồ sơ giáo viên theo năm học · {academicYearName}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <h3 className="text-base font-bold text-white">{teacher.teacherName}</h3>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-medium text-[#5EEAD4] tabular-nums">
                Thâm niên Sky-Line: {teacher.seniorityLabel}
              </span>
            </div>
            <p className="text-xs text-teal-100 mt-1 tabular-nums">
              {teacher.teacherCode} · {teacher.positions.join(", ")} · {teacher.campusName} · {teacher.departmentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-teal-100 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Đóng hồ sơ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F8FAFC] text-xs">
          {/* 1. Vinh danh & Ghi nhận (5 nhóm) */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
              <h4 className="font-semibold text-[#003B3A] flex items-center gap-1.5 text-sm">
                <Award className="h-4 w-4 text-[#00A19A]" />
                1. Vinh danh & Ghi nhận (5 nhóm)
              </h4>
              <span className="text-[11px] text-slate-500 tabular-nums">
                {tRecs.length} ghi nhận · {tNps.length} đợt NPS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Khen thưởng Sở, ngành */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="font-semibold text-slate-800 mb-1.5">
                  Khen thưởng Sở, ngành ({deptAwards.length})
                </div>
                {deptAwards.length === 0 ? (
                  <p className="text-slate-400">Chưa có ghi nhận</p>
                ) : (
                  <ul className="space-y-1.5">
                    {deptAwards.map((a) => (
                      <li key={a.id} className="text-slate-700">
                        <div className="font-medium text-slate-900">{a.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {[a.issuingAuthority, a.recordedDate].filter(Boolean).join(" · ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Khen thưởng hệ thống */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="font-semibold text-slate-800 mb-1.5">
                  Khen thưởng hệ thống ({sysAwards.length})
                </div>
                {sysAwards.length === 0 ? (
                  <p className="text-slate-400">Chưa có ghi nhận</p>
                ) : (
                  <ul className="space-y-1.5">
                    {sysAwards.map((a) => (
                      <li key={a.id} className="text-slate-700">
                        <div className="font-medium text-slate-900">{a.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {[a.eventBatch, a.awardScope, a.recordedDate].filter(Boolean).join(" · ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Bồi dưỡng HS các kỳ thi */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                <div className="font-semibold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-600" />
                  Bồi dưỡng HS các kỳ thi ({competitions.length})
                </div>
                {competitions.length === 0 ? (
                  <p className="text-slate-400">Chưa có ghi nhận</p>
                ) : (
                  <ul className="space-y-1.5">
                    {competitions.map((c) => (
                      <li key={c.id} className="text-slate-700">
                        <div className="font-medium text-slate-900">{c.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {[c.teacherRole, c.eventBatch, c.resultSummary].filter(Boolean).join(" · ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* NPS PHHS */}
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 tabular-nums">
                <div className="font-semibold text-slate-800 mb-1.5 flex items-center gap-1">
                  <MessageSquareHeart className="h-3.5 w-3.5 text-[#008B85]" />
                  NPS PHHS ({tNps.length} đợt)
                </div>
                {tNps.length === 0 ? (
                  <p className="text-slate-400">Chưa có dữ liệu khảo sát NPS</p>
                ) : (
                  <ul className="space-y-1.5">
                    {tNps.map((n) => (
                      <li key={n.id} className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-slate-900">{n.periodTitle}</span>{" "}
                          <span className="rounded bg-white border border-[#E2E8F0] px-1.5 py-0.5 text-[10px] font-semibold text-[#00736E]">
                            {n.roleLabel}
                          </span>
                        </div>
                        <div className="font-semibold text-[#003B3A]">
                          NPS {n.npsScore > 0 ? `+${n.npsScore}` : n.npsScore}{" "}
                          <span className="text-[11px] font-normal text-slate-500">
                            ({n.validResponses} PH)
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Ứng dụng AI & công nghệ */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="font-semibold text-slate-800 mb-1.5 flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-[#008B85]" />
                Ứng dụng AI và công nghệ ({aiTechs.length})
              </div>
              {aiTechs.length === 0 ? (
                <p className="text-slate-400">Chưa có ghi nhận ứng dụng AI / công nghệ</p>
              ) : (
                <ul className="space-y-2">
                  {aiTechs.map((ai) => (
                    <li key={ai.id} className="border-l-2 border-[#00A19A] pl-2.5">
                      <div className="font-medium text-slate-900">{ai.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {[ai.issuingAuthority, ai.awardScope, ai.recordedDate]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      {ai.resultSummary && (
                        <div className="text-slate-700 mt-0.5">{ai.resultSummary}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 2. Lịch sử dự giờ theo tháng trong năm học */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
              <h4 className="font-semibold text-[#003B3A] flex items-center gap-1.5 text-sm">
                <ClipboardCheck className="h-4 w-4 text-[#00A19A]" />
                2. Lịch sử dự giờ theo tháng
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenMonthlyObs(teacher.teacherId)
                }}
                className="text-xs font-medium text-[#008B85] hover:text-[#003B3A] hover:underline"
              >
                Mở bảng Dự giờ theo tháng →
              </button>
            </div>

            {teacher.monthlyHistory.length === 0 ? (
              <p className="text-slate-400">Chưa có dữ liệu dự giờ trong năm học.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full border-collapse text-left tabular-nums">
                  <thead className="bg-[#003B3A] text-white">
                    <tr>
                      <th className="py-2 px-3 text-[11px] font-semibold">Tháng</th>
                      <th className="py-2 px-3 text-[11px] font-semibold text-teal-100 text-center">
                        Dạy được dự
                      </th>
                      <th className="py-2 px-3 text-[11px] font-semibold text-teal-100 text-center">
                        Đi dự
                      </th>
                      <th className="py-2 px-3 text-[11px] font-semibold text-[#5EEAD4]">
                        Tình trạng đi dự
                      </th>
                      <th className="py-2 px-3 text-[11px] font-semibold text-[#5EEAD4]">
                        Dạy học theo quy định
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] bg-white">
                    {teacher.monthlyHistory.map((h) => (
                      <tr key={h.monthKey} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-medium text-slate-800">{h.monthLabel}</td>
                        <td className="py-2 px-3 text-center font-semibold text-[#003B3A]">
                          {h.taughtObserved} tiết
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-[#003B3A]">
                          {h.observedQuota > 0 ? `${h.observed}/${h.observedQuota} tiết` : `${h.observed} tiết`}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{h.observingStatusLabel}</td>
                        <td className="py-2 px-3 text-slate-700">{h.teachingStatusLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 3. Bồi dưỡng & Phát triển chuyên môn */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
              <h4 className="font-semibold text-[#003B3A] flex items-center gap-1.5 text-sm">
                <BookOpenCheck className="h-4 w-4 text-[#00A19A]" />
                3. Bồi dưỡng & Kết quả áp dụng ({tCoaching.length})
              </h4>
            </div>

            {tCoaching.length === 0 ? (
              <p className="text-slate-400">Chưa có nội dung bồi dưỡng trong năm học này.</p>
            ) : (
              <div className="space-y-2.5">
                {tCoaching.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            c.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : c.status === "IN_PROGRESS"
                                ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {c.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                          {coachingStatusLabelVi(c.status)}
                        </span>
                        {c.activityType && (
                          <span className="text-[11px] font-medium text-slate-600">
                            · {c.activityType}
                          </span>
                        )}
                        {c.isOverdue && (
                          <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            Quá hạn
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenEditCoaching(c)}
                        className="text-[11px] font-medium text-[#008B85] hover:underline"
                      >
                        Cập nhật tiến độ
                      </button>
                    </div>

                    <div className="text-slate-800">
                      <span className="font-semibold">Nhu cầu: </span>
                      {c.improvementNeeds}
                    </div>
                    <div className="text-slate-800">
                      <span className="font-semibold">Hoạt động: </span>
                      {c.developmentActivity}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 tabular-nums">
                      <span>Người hỗ trợ: {c.mentorName || "Chưa gán"}</span>
                      {c.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Hạn: {new Date(c.dueDate).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                    {c.applicationNotes && (
                      <div className="rounded-lg bg-white border border-[#E2E8F0] px-2.5 py-1.5 text-slate-700">
                        <span className="font-semibold text-emerald-700">Áp dụng vào dạy học: </span>
                        {c.applicationNotes}
                      </div>
                    )}
                    {c.nextSupportNeeds && (
                      <div className="text-[11px] text-amber-800">
                        <span className="font-semibold">Cần hỗ trợ tiếp: </span>
                        {c.nextSupportNeeds}
                      </div>
                    )}
                    {c.followUpObservation && (
                      <div className="text-[11px] text-[#00736E] flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3" />
                        <span>
                          Phiếu dự giờ tiếp theo: {c.followUpObservation.actualDateVi} ·{" "}
                          {c.followUpObservation.subjectName} ({c.followUpObservation.overallRating || "Đã dự"})
                        </span>
                        <Link
                          href={c.followUpObservation.sourceRoute}
                          target="_blank"
                          className="underline font-medium"
                        >
                          Mở phiếu
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
