"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SkylineBirdCharacter } from "@/components/skyline-journey/SkylineBirdCharacter";

export default function ParentSkylineJourneyPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const loadParentJourney = useCallback(async (stuId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = stuId ? `?studentId=${encodeURIComponent(stuId)}` : "";
      const res = await fetch(`/api/skyline-journey/parent${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Không thể tải dữ liệu Hành trình Sky-Line của con");
        return;
      }
      setData(json);
      if (json.selectedChild?.id && !stuId) {
        setSelectedStudentId(json.selectedChild.id);
      }
    } catch {
      setError("Lỗi kết nối máy chủ khi tải dữ liệu Hành trình của con");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParentJourney(selectedStudentId || undefined);
  }, [loadParentJourney, selectedStudentId]);

  if (loading && !data) {
    return (
      <div className="p-8 text-center">
        <SkylineBirdCharacter mood="EXPLORER" size="lg" />
        <p className="mt-3 font-bold text-slate-700">
          Đang tải dữ liệu Hành trình Sky-Line của con...
        </p>
      </div>
    );
  }

  const linkedChildren = data?.linkedChildren || [];
  const child = data?.selectedChild;
  const passport = data?.passport;
  const progress = data?.progressMetrics;
  const stages = data?.stages || [];

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-sky-700 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SkylineBirdCharacter mood="CELEBRATE" size="md" />
          <div>
            <span className="text-xs font-bold uppercase bg-white/20 px-3 py-1 rounded-full">
              👨‍👩‍👧 Cổng Phụ Huynh Đồng Hành • Hành Trình Sky-Line
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              Theo dõi Thành quả & Gợi ý Đồng hành cùng Con tại Nhà
            </h1>
            <p className="text-xs text-teal-100 mt-0.5">
              Bảo mật riêng tư: Chỉ hiển thị thành quả và gợi ý đồng hành của đúng con đã liên kết với tài khoản Phụ huynh.
            </p>
          </div>
        </div>
        <Link
          href="/parent"
          className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/25 self-start md:self-auto"
        >
          ← Về Trang chủ Phụ huynh
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Child Switcher if parent has multiple children */}
      {linkedChildren.length > 0 && (
        <div className="bg-white border-2 border-teal-200 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase text-slate-600">
              Chọn con đã liên kết:
            </span>
            {linkedChildren.map((c: any) => (
              <button
                key={c.studentId}
                type="button"
                onClick={() => setSelectedStudentId(c.studentId)}
                className={`px-4 py-2 rounded-2xl font-bold text-xs transition ${
                  child?.id === c.studentId
                    ? "bg-teal-700 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                👧 {c.fullName} (Lớp {c.className} • Khối {c.grade})
              </button>
            ))}
          </div>

          {passport && (
            <div className="flex items-center gap-3 text-xs font-extrabold">
              <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900">
                🪶 {passport.totalFeathers} Lông vũ
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                🚩 {passport.flagsPlantedCount}/15 Cờ đã cắm
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-teal-100 text-teal-900">
                🏅 {passport.badges?.length || 0} Huy hiệu
              </span>
            </div>
          )}
        </div>
      )}

      {child && stages.length > 0 ? (
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border-2 border-teal-100 rounded-3xl p-5 shadow-sm">
              <div className="text-xs font-bold text-slate-500">
                Tiến độ các bài đã được thầy/cô mở cho lớp {child.className}
              </div>
              <div className="text-2xl font-black text-teal-800 mt-1">
                {progress.completedAssignedCount}/{progress.assignedStagesCount} chặng ({progress.assignedProgressPercent}%)
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden mt-2">
                <div
                  className="h-full bg-teal-600 rounded-full"
                  style={{ width: `${progress.assignedProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-white border-2 border-amber-200 rounded-3xl p-5 shadow-sm">
              <div className="text-xs font-bold text-slate-500">
                Huy hiệu & Sản phẩm được chia sẻ trong Hộ chiếu của {child.fullName}
              </div>
              {passport?.badges?.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {passport.badges.map((b: any) => (
                    <span
                      key={b.id}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs"
                    >
                      🏅 {b.badgeName}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 mt-2">
                  Con đang tích lũy cờ và lông vũ qua từng chặng để mở khóa Huy hiệu Vùng đầu tiên!
                </p>
              )}
            </div>
          </div>

          {/* 15 Stages Companion Guide & Shared Achievements */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              🏡 Cẩm nang Ba Mẹ Đồng Hành Cùng Con (15 Chặng Giáo dục Tài chính 2S)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stages.map((st: any) => (
                <div
                  key={st.lessonCode}
                  className={`p-4 rounded-2xl border-2 space-y-2 ${
                    st.flagPlanted
                      ? "bg-emerald-50/60 border-emerald-300"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-teal-900 text-sm">
                      Chặng {st.periodIndex}: {st.lessonName}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        st.flagPlanted
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {st.flagPlanted ? "🚩 Đã cắm cờ" : "Đang trên hành trình"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                    <b>💡 Gợi ý ba mẹ đồng hành tại nhà:</b> {st.parentCompanionTip}
                  </div>

                  {st.studentSharedReflection && (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                      <b>✍️ Chia sẻ thực hành của con:</b> {st.studentSharedReflection}
                    </div>
                  )}

                  {st.teacherFeedback && (
                    <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                      <b>👩‍🏫 Nhận xét của Giáo viên:</b> {st.teacherFeedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-8 text-center text-sm text-slate-600">
          {child
            ? `Khối ${child.grade} của bé ${child.fullName} hiện đang ở trạng thái chờ cấu hình chương trình game chính thức.`
            : "Tài khoản Phụ huynh chưa có học sinh liên kết."}
        </div>
      )}
    </div>
  );
}
