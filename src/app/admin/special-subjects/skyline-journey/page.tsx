"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { SkylineBirdCharacter } from "@/components/skyline-journey/SkylineBirdCharacter";

export default function AdminSkylineJourneyPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [campusFilter, setCampusFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const loadAdminOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (campusFilter) params.set("campusId", campusFilter);
      if (gradeFilter) params.set("grade", gradeFilter);
      const res = await fetch(`/api/skyline-journey/admin?${params.toString()}`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [campusFilter, gradeFilter]);

  useEffect(() => {
    loadAdminOverview();
  }, [loadAdminOverview]);

  const handleToggleConfig = async (payload: {
    grade: string;
    campusId?: string | null;
    classId?: string | null;
    isEnabled: boolean;
    approvalStatus?: "APPROVED" | "DRAFT" | "UNCONFIGURED";
  }) => {
    const key = `${payload.grade}_${payload.campusId || "ALL"}_${payload.classId || "ALL"}`;
    setUpdatingKey(key);
    try {
      const res = await fetch("/api/skyline-journey/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: data?.academicYear?.id || "ay_2025_2026",
          ...payload
        })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Không thể cập nhật cấu hình");
        return;
      }
      await loadAdminOverview();
    } finally {
      setUpdatingKey(null);
    }
  };

  const gradeCatalogStatus = data?.gradeCatalogStatus || [];
  const stageAnalytics = data?.stageAnalytics || [];
  const recentStudentResults = data?.recentStudentResults || [];
  const classDrilldown = data?.classDrilldown || [];
  const campuses = data?.campuses || [];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <SpecialSubjectNav />

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-sky-900 rounded-3xl p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SkylineBirdCharacter mood="EXPLORER" size="md" />
          <div>
            <span className="text-xs font-bold uppercase bg-amber-400 text-slate-950 px-3 py-1 rounded-full">
              🛡️ Quản trị & Giám sát Hành trình Sky-Line (Khối 1–5)
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-1.5">
              Duyệt Phiên bản Nhiệm vụ, Theo dõi Kết quả Học sinh trực tiếp & Bật/Tắt theo Cơ sở – Khối – Lớp
            </h1>
            <p className="text-xs text-teal-100 mt-0.5">
              Năm học: {data?.academicYear?.name || "2025-2026"} • Đã kích hoạt đầy đủ 5 Khối Tiểu học: TC01S, TC02S, TC03S, TC04S, TC05S. Xong mỗi game, cả Admin và GVBM được phân công đều theo dõi ngay kết quả của Học sinh.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Duyệt nội dung, tiêu chí và phiên bản nhiệm vụ theo Khối/Hệ (Khối 1-5) */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            1. Trạng thái Phê duyệt Nội dung & Phiên bản Nhiệm vụ theo Khối (Khối 1–5)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Toàn bộ 5 khối Tiểu học (TC01S – TC05S) đều ánh xạ 1-1 với phân phối chương trình Giáo dục Tài chính trên SSM. Bấm vào từng khối để lọc nhanh hoặc bật/tắt toàn khối.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {gradeCatalogStatus.map((g: any) => {
            const isApproved = g.approvalStatus === "APPROVED";
            const key = `${g.grade}_ALL_ALL`;
            const isSelectedGrade = gradeFilter === String(g.grade);
            return (
              <div
                key={g.grade}
                className={`p-4 rounded-2xl border-2 flex flex-col justify-between transition ${
                  isSelectedGrade
                    ? "bg-teal-50 border-teal-600 ring-2 ring-teal-300 shadow-md"
                    : isApproved
                    ? "bg-emerald-50/70 border-emerald-400 shadow-sm"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setGradeFilter((prev) => (prev === String(g.grade) ? "" : String(g.grade)))
                      }
                      className="font-black text-slate-900 text-base hover:text-teal-700 cursor-pointer"
                    >
                      Khối {g.grade}
                    </button>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isApproved
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isApproved ? `ĐÃ DUYỆT (${g.curriculumCode})` : "CHƯA CẤU HÌNH"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-1.5">{g.label}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Phiên bản: <b>{g.versionCode}</b>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Số lớp phân công GDTC: <b>{g.assignedFinClasses}/{g.totalClasses} lớp</b>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-900">
                    {g.isEnabled ? "🟢 Đang bật" : "🔴 Tạm tắt"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setGradeFilter((prev) => (prev === String(g.grade) ? "" : String(g.grade)))
                      }
                      className="px-2.5 py-1 rounded-xl bg-white border border-teal-300 hover:bg-teal-50 text-teal-900 font-bold text-[11px]"
                    >
                      {isSelectedGrade ? "Bỏ lọc" : "Xem khối"}
                    </button>
                    <button
                      type="button"
                      disabled={updatingKey === key}
                      onClick={() =>
                        handleToggleConfig({
                          grade: String(g.grade),
                          isEnabled: !g.isEnabled,
                          approvalStatus: "APPROVED"
                        })
                      }
                      className="px-2.5 py-1 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-[11px]"
                    >
                      {g.isEnabled ? "Tạm tắt" : "Bật lại"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Bảng theo dõi trực tiếp Kết quả Game của Học sinh & GVBM phụ trách */}
      <div className="bg-white border-2 border-teal-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              2. Nhật ký Kết quả Game Học sinh vừa hoàn thành (Theo dõi đồng thời bởi Admin & GVBM được phân công)
            </h2>
            <p className="text-xs text-slate-500">
              Mỗi khi học sinh hoàn thành một chặng game ở bất kỳ khối nào (Khối 1–5), kết quả điểm số, số YCCĐ đạt được, lông vũ và GVBM phụ trách sẽ hiển thị ngay tại đây.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAdminOverview}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow"
          >
            🔄 Làm mới kết quả
          </button>
        </div>

        {recentStudentResults.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500 font-semibold">
            Chưa có lượt nộp chặng nào theo bộ lọc hiện tại. Khi học sinh chơi xong mỗi chặng game, kết quả sẽ xuất hiện tức thì tại bảng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-teal-50 text-teal-950 border-b border-teal-200">
                  <th className="p-3 font-extrabold">Học sinh</th>
                  <th className="p-3 font-extrabold">Lớp / Khối</th>
                  <th className="p-3 font-extrabold">GVBM được phân công</th>
                  <th className="p-3 font-extrabold">Chặng Game vừa chơi</th>
                  <th className="p-3 font-extrabold text-center">Điểm & YCCĐ</th>
                  <th className="p-3 font-extrabold text-center">Trạng thái</th>
                  <th className="p-3 font-extrabold">Chia sẻ / Nhận xét GVBM</th>
                  <th className="p-3 font-extrabold text-right">Chi tiết lớp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentStudentResults.map((res: any) => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{res.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{res.studentCode}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{res.className}</div>
                      <div className="text-[11px] text-slate-500">
                        Khối {res.grade} • {res.curriculumCode}
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-teal-800">
                      👩‍🏫 {res.assignedTeacherName}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">
                        Chặng {res.periodIndex}: {res.lessonName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{res.lessonCode}</div>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black">
                        {res.scorePercent}%
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {res.achievedCriteriaCount}/{res.totalCriteriaCount} YCCĐ • +{res.feathersEarned} 🪶
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          res.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : res.status === "WAITING_CONFIRMATION"
                            ? "bg-teal-50 text-teal-800"
                            : res.status === "NEEDS_REVISION"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {res.status === "COMPLETED"
                          ? "🚩 Hoàn thành"
                          : res.status === "WAITING_CONFIRMATION"
                          ? "⏳ Chờ GVBM duyệt"
                          : res.status === "NEEDS_REVISION"
                          ? "✍️ Cần bổ sung"
                          : "🧭 Đang chơi"}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs">
                      {res.studentReflection && (
                        <div className="text-[11px] text-slate-700 truncate" title={res.studentReflection}>
                          <b>HS:</b> {res.studentReflection}
                        </div>
                      )}
                      {res.teacherFeedback && (
                        <div className="text-[11px] text-teal-800 truncate" title={res.teacherFeedback}>
                          <b>GVBM:</b> {res.teacherFeedback}
                        </div>
                      )}
                      {!res.studentReflection && !res.teacherFeedback && (
                        <span className="text-[11px] text-slate-400">Chấm tự động</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Link
                        href={`/teacher/special-subjects/skyline-journey?classId=${encodeURIComponent(res.classId)}`}
                        className="inline-block px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px]"
                      >
                        Mở bảng lớp →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Theo dõi độ phủ các chặng (Khối 1–5) & Nội dung thường cần hỗ trợ */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              3. Độ phủ các Chặng Game ({gradeFilter ? `Khối ${gradeFilter} - TC0${gradeFilter}S` : "Toàn cấp Khối 1–5"}) & Nội dung Thường cần Hỗ trợ
            </h2>
            <p className="text-xs text-slate-500">
              Giúp Ban Giám hiệu và Tổ chuyên môn nhận diện chặng nào học sinh thường phải thử lại nhiều lần hoặc cần giáo viên hướng dẫn bổ sung.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {["", "1", "2", "3", "4", "5"].map((g) => (
              <button
                key={g || "ALL"}
                type="button"
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  gradeFilter === g
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {g ? `Khối ${g} (TC0${g}S)` : "Tất cả Khối 1–5"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="p-3 font-extrabold">Chặng</th>
                <th className="p-3 font-extrabold">Mã bài học</th>
                <th className="p-3 font-extrabold">Tên bài học</th>
                <th className="p-3 font-extrabold">Cơ chế game</th>
                <th className="p-3 font-extrabold text-center">Số HS đã chơi</th>
                <th className="p-3 font-extrabold text-center">Hoàn thành</th>
                <th className="p-3 font-extrabold text-center">Chờ GV xác nhận</th>
                <th className="p-3 font-extrabold text-center">Cần bổ sung / Thử lại ≥2 lần</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stageAnalytics.map((sa: any) => (
                <tr key={sa.lessonCode} className="hover:bg-slate-50">
                  <td className="p-3 font-black text-teal-800">Chặng {sa.periodIndex}</td>
                  <td className="p-3 font-mono font-bold">{sa.lessonCode}</td>
                  <td className="p-3 font-bold text-slate-900">{sa.lessonName}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-semibold">
                      {sa.mechanic}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold">{sa.totalPlayers}</td>
                  <td className="p-3 text-center font-bold text-emerald-700">{sa.completedCount}</td>
                  <td className="p-3 text-center font-bold text-teal-800">{sa.waitingCount}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold ${
                        sa.supportNeedScore > 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {sa.needsRevisionCount} cần bổ sung • {sa.multipleAttemptsCount} thử lại
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Bật/tắt chức năng theo Cơ sở, Khối, Lớp & Drill-down danh sách lớp */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              3. Quản lý theo Cơ sở – Khối – Lớp & Mở danh sách chi tiết (Drill-down)
            </h2>
            <p className="text-xs text-slate-500">
              Từ số liệu tổng hợp, bấm &ldquo;Mở danh sách HS&rdquo; để xem chi tiết từng học sinh của lớp tương ứng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            >
              <option value="">Tất cả cơ sở ({campuses.length})</option>
              {campuses.map((cp: any) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name}
                </option>
              ))}
            </select>

            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            >
              <option value="">Tất cả khối Tiểu học (1–5)</option>
              {["1", "2", "3", "4", "5"].map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500 font-bold">
            Đang tải danh sách lớp...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3 font-extrabold">Lớp</th>
                  <th className="p-3 font-extrabold">Khối / Hệ</th>
                  <th className="p-3 font-extrabold">Cơ sở</th>
                  <th className="p-3 font-extrabold">GV Giáo dục Tài chính</th>
                  <th className="p-3 font-extrabold text-center">Sĩ số</th>
                  <th className="p-3 font-extrabold text-center">HS đã tham gia</th>
                  <th className="p-3 font-extrabold text-center">Lượt chặng hoàn thành</th>
                  <th className="p-3 font-extrabold text-center">Trạng thái lớp</th>
                  <th className="p-3 font-extrabold text-right">Thao tác / Drill-down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classDrilldown.map((cls: any) => {
                  const rowKey = `${cls.grade}_${cls.campusId}_${cls.classId}`;
                  return (
                    <tr key={cls.classId} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-900">{cls.className}</td>
                      <td className="p-3">
                        Khối {cls.grade} ({cls.educationSystem || "HNS"})
                      </td>
                      <td className="p-3 text-slate-600">{cls.campusName}</td>
                      <td className="p-3 font-semibold text-teal-800">{cls.teacherName}</td>
                      <td className="p-3 text-center font-bold">{cls.studentCount}</td>
                      <td className="p-3 text-center font-bold text-sky-700">
                        {cls.activePlayersCount}/{cls.studentCount}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-700">
                        {cls.completedStageEntries}
                      </td>
                      <td className="p-3 text-center">
                        {cls.isTC02SApplicable ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold ${
                              cls.isEnabled
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {cls.isEnabled ? "Đang bật" : "Đã tắt"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Chưa cấu hình
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        {cls.isTC02SApplicable && (
                          <button
                            type="button"
                            disabled={updatingKey === rowKey}
                            onClick={() =>
                              handleToggleConfig({
                                grade: cls.grade,
                                campusId: cls.campusId,
                                classId: cls.classId,
                                isEnabled: !cls.isEnabled
                              })
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold"
                          >
                            {cls.isEnabled ? "Tắt lớp" : "Bật lớp"}
                          </button>
                        )}
                        <Link
                          href={`/teacher/special-subjects/skyline-journey?classId=${encodeURIComponent(cls.classId)}`}
                          className="inline-block px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold"
                        >
                          Mở danh sách HS →
                        </Link>
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
  );
}
