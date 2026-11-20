"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, Lock } from "lucide-react"
import { StudentSupportTabPayload } from "@/lib/campus-quality/types"

interface StudentSupportTabProps {
  data: StudentSupportTabPayload
  supportFilterMode: "BELOW_5" | "BELOW_SKL" | "MULTI_SUBJECT" | "CONSECUTIVE_PERIODS"
  onChangeSupportFilterMode: (
    mode: "BELOW_5" | "BELOW_SKL" | "MULTI_SUBJECT" | "CONSECUTIVE_PERIODS"
  ) => void
  initialSubTab?: "ACADEMIC" | "COMMITMENT" | "PSYCHOLOGY"
  initialPsychGroupBy?: "CLASS" | "OWNER"
}

function renderCommitmentCell(cell: { display: string; arrow: "↑" | "↓" | null; score: number | null }) {
  if (cell.score === null) return <span className="text-slate-400">—</span>
  return (
    <span
      className={`font-semibold ${
        cell.arrow === "↑"
          ? "text-emerald-700"
          : cell.arrow === "↓"
            ? "text-rose-700"
            : "text-slate-800"
      }`}
    >
      {cell.display}
    </span>
  )
}

export function StudentSupportTab({
  data,
  supportFilterMode,
  onChangeSupportFilterMode,
  initialSubTab = "ACADEMIC",
  initialPsychGroupBy = "CLASS",
}: StudentSupportTabProps) {
  const [subTab, setSubTab] = useState<"ACADEMIC" | "COMMITMENT" | "PSYCHOLOGY">(initialSubTab)
  const [psychGroupBy, setPsychGroupBy] = useState<"CLASS" | "OWNER">(initialPsychGroupBy)

  const groupedPsych = useMemo(() => {
    const map = new Map<string, typeof data.psychologyTracking.items>()
    for (const item of data.psychologyTracking.items) {
      const key =
        psychGroupBy === "OWNER" ? item.primaryOwnerName : `Lớp ${item.className}`
      const list = map.get(key) || []
      list.push(item)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "vi"))
  }, [data.psychologyTracking.items, psychGroupBy])

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="inline-flex flex-wrap rounded-xl border border-[#E2E8F0] bg-white p-1 text-xs">
        <button
          type="button"
          onClick={() => setSubTab("ACADEMIC")}
          className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
            subTab === "ACADEMIC" ? "bg-[#003B3A] text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Hỗ trợ học tập ({data.academicSupport.uniqueStudentCount} HS)
        </button>
        <button
          type="button"
          onClick={() => setSubTab("COMMITMENT")}
          className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
            subTab === "COMMITMENT" ? "bg-[#003B3A] text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Cam kết đầu vào ({data.entranceCommitment.studentCount} HS)
        </button>
        <button
          type="button"
          onClick={() => setSubTab("PSYCHOLOGY")}
          className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
            subTab === "PSYCHOLOGY" ? "bg-[#003B3A] text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Theo dõi tâm lý ({data.psychologyTracking.canView ? data.psychologyTracking.activeCount : "Hạn chế"})
        </button>
      </div>

      {/* 1. HỖ TRỢ HỌC TẬP */}
      {subTab === "ACADEMIC" && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#003B3A]">
                Danh sách hỗ trợ học tập (học sinh × môn)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                {data.academicSupport.uniqueStudentCount} học sinh duy nhất · {data.academicSupport.totalRows} lượt môn cần theo dõi
              </p>
            </div>
            <div className="inline-flex flex-wrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-xs">
              {(
                [
                  ["BELOW_5", "Dưới 5,0"],
                  ["BELOW_SKL", "Dưới chuẩn Sky-Line"],
                  ["MULTI_SUBJECT", "Dưới chuẩn nhiều môn"],
                  ["CONSECUTIVE_PERIODS", "Nhiều kỳ liên tiếp"],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onChangeSupportFilterMode(code)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    supportFilterMode === code
                      ? "bg-[#003B3A] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Học sinh</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Lớp · Môn</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">Điểm / Ngưỡng</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">GV phụ trách</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Mốc rà soát · Kết quả gần nhất</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-white whitespace-nowrap">Liên kết SSM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.academicSupport.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Không có học sinh nào thuộc tiêu chí lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  data.academicSupport.items.map((item) => (
                    <tr key={item.rowKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{item.studentName}</div>
                        <div className="text-[11px] text-slate-500">{item.studentCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">
                          {item.className} · {item.subjectName}
                        </div>
                        <div className="text-[11px] text-rose-700">{item.triggerReason}</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-rose-700">
                          {item.score !== null ? item.score.toFixed(1) : "—"}
                        </div>
                        <div className="text-[11px] text-slate-500">{item.benchmarkLabel}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{item.teacherName}</td>
                      <td className="py-3 px-3">
                        <div className="text-slate-800">{item.nextReviewDate}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {item.latestResult}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={item.tutoringHref}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium ${
                              item.hasTutoringLink
                                ? "border-[#00A19A] text-[#00736E] bg-[#F0FDFA]"
                                : "border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            Phụ đạo <ExternalLink className="w-3 h-3" />
                          </Link>
                          <Link
                            href={item.advisoryHref}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium ${
                              item.hasAdvisoryLink
                                ? "border-[#003B3A] text-[#003B3A] bg-slate-50"
                                : "border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            CVHT <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. CAM KẾT ĐẦU VÀO */}
      {subTab === "COMMITMENT" && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#003B3A]">
                Theo dõi học sinh cam kết đầu vào (mỗi dòng là 1 học sinh × 1 môn cam kết)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dùng ↑ khi vượt chuẩn Sky-Line và ↓ khi dưới chuẩn · KSĐN là điểm khảo sát đầu năm
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#003B3A] border-b border-[#003B3A]">
                <tr>
                  <th className="py-2.5 px-3 text-center text-[11px] font-semibold text-teal-100 whitespace-nowrap">STT</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-white whitespace-nowrap">Họ tên</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Lớp</th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-teal-100 whitespace-nowrap">Môn cam kết</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">KSĐN</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">GK1</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">CK1</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">GK2</th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap">CK2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {data.entranceCommitment.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      Không có học sinh cam kết đầu vào trong phạm vi lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  data.entranceCommitment.rows.map((r, i) => (
                    <tr key={`${r.studentCode}_${r.committedSubject}_${i}`} className="hover:bg-[#F8FAFC] align-middle">
                      <td className="py-3 px-3 text-center text-slate-500">{r.stt}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{r.studentName}</div>
                        <div className="text-[11px] text-slate-500">{r.studentCode}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{r.className}</td>
                      <td className="py-3 px-3 font-medium text-[#003B3A]">{r.committedSubject}</td>
                      <td className="py-3 px-3 text-right">{renderCommitmentCell(r.ksdn)}</td>
                      <td className="py-3 px-3 text-right">{renderCommitmentCell(r.gk1)}</td>
                      <td className="py-3 px-3 text-right">{renderCommitmentCell(r.ck1)}</td>
                      <td className="py-3 px-3 text-right">{renderCommitmentCell(r.gk2)}</td>
                      <td className="py-3 px-3 text-right">{renderCommitmentCell(r.ck2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. THEO DÕI TÂM LÝ */}
      {subTab === "PSYCHOLOGY" && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#003B3A]">Hồ sơ theo dõi tâm lý học đường</h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Đang theo dõi: {data.psychologyTracking.activeCount} · Đến hạn rà soát: {data.psychologyTracking.dueForReviewCount} · Đạt mục tiêu: {data.psychologyTracking.achievedGoalCount}
              </p>
            </div>
            {data.psychologyTracking.canView && (
              <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPsychGroupBy("CLASS")}
                  className={`px-3 py-1 rounded-md font-medium ${
                    psychGroupBy === "CLASS" ? "bg-[#003B3A] text-white" : "text-slate-600"
                  }`}
                >
                  Xem theo lớp
                </button>
                <button
                  type="button"
                  onClick={() => setPsychGroupBy("OWNER")}
                  className={`px-3 py-1 rounded-md font-medium ${
                    psychGroupBy === "OWNER" ? "bg-[#003B3A] text-white" : "text-slate-600"
                  }`}
                >
                  Xem theo người phụ trách
                </button>
              </div>
            )}
          </div>

          {!data.psychologyTracking.canView ? (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
              <Lock className="w-6 h-6 text-slate-400" />
              <div className="text-sm font-medium text-slate-700">
                Hồ sơ tâm lý áp dụng quyền riêng của phân hệ
              </div>
              <p className="text-xs max-w-md">
                Vui lòng liên hệ Ban KT&ĐBCL hoặc Quản trị hệ thống để được cấp quyền truy cập phân hệ Hỗ trợ tâm lý học đường.
              </p>
            </div>
          ) : groupedPsych.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Không có hồ sơ theo dõi tâm lý trong phạm vi lọc.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {groupedPsych.map(([groupLabel, items]) => (
                <div key={groupLabel} className="p-4">
                  <div className="text-xs font-semibold text-[#003B3A] mb-2">
                    {groupLabel} ({items.length} hồ sơ)
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-[#003B3A]">
                        <tr>
                          <th className="py-2 px-3 text-left text-[11px] font-semibold text-white">Học sinh</th>
                          <th className="py-2 px-3 text-left text-[11px] font-semibold text-teal-100">GV / Chuyên viên phụ trách chính</th>
                          <th className="py-2 px-3 text-left text-[11px] font-semibold text-teal-100">GVCN phối hợp</th>
                          <th className="py-2 px-3 text-left text-[11px] font-semibold text-[#5EEAD4]">Trạng thái</th>
                          <th className="py-2 px-3 text-left text-[11px] font-semibold text-teal-100">Ngày rà soát</th>
                          <th className="py-2 px-3 text-left text-[11px] font-semibold text-[#5EEAD4]">Kết quả gần nhất</th>
                          <th className="py-2 px-3 text-right text-[11px] font-semibold text-white">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                        {items.map((p) => (
                          <tr key={p.id} className="hover:bg-[#F8FAFC] align-middle">
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900">{p.studentName}</div>
                              <div className="text-[11px] text-slate-500">
                                {p.studentCode} · Lớp {p.className}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">{p.primaryOwnerName}</td>
                            <td className="py-2.5 px-3 text-slate-600">{p.homeroomTeacherName}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                                  p.isDueInMonth
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {p.isDueInMonth ? "Đến hạn rà soát" : p.statusLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{p.reviewDate}</td>
                            <td className="py-2.5 px-3 font-medium text-[#003B3A]">
                              {p.latestOutcomeLabel}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Link
                                href={p.ssmHref}
                                className="inline-flex items-center gap-1 text-[#00736E] hover:text-[#003B3A] font-medium"
                              >
                                Hồ sơ <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
