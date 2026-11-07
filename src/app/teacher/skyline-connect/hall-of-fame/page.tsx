"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Award,
  Trophy,
  Bot,
  Lightbulb,
  Info,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { SkylineConnectSubNav } from "@/components/skyline-connect/SkylineConnectSubNav";

function HallOfFameContent() {
  const searchParams = useSearchParams();
  const [periodId, setPeriodId] = useState(searchParams?.get("periodId") || "");
  const [categoryTab, setCategoryTab] = useState<"PRODUCT" | "IDEA">("PRODUCT");
  const [campusId, setCampusId] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [showFormula, setShowFormula] = useState(false);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const loadHallOfFame = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ action: "hallOfFame" });
      if (periodId) qs.set("periodId", periodId);
      if (campusId) qs.set("campusId", campusId);
      if (subjectCode) qs.set("subjectCode", subjectCode);
      if (gradeLevel) qs.set("gradeLevel", gradeLevel);

      const res = await fetch(`/api/skyline-connect?${qs.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!periodId && json.period?.id) {
          setPeriodId(json.period.id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [periodId, campusId, subjectCode, gradeLevel]);

  useEffect(() => {
    loadHallOfFame();
  }, [loadHallOfFame]);

  const period = data?.period;
  const periods = data?.periods || [];
  const catalogs = data?.catalogs || {};
  const standings =
    categoryTab === "PRODUCT" ? data?.productStandings || [] : data?.ideaStandings || [];

  const getPeriodStatusLabel = (status?: string) => {
    if (status === "FINALIZED") {
      return {
        label: "Đã chốt chính thức",
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    }
    if (status === "DATA_LOCKED" || status === "REVIEWING") {
      return {
        label: "Đang rà soát chuyên môn",
        bg: "bg-amber-50 text-amber-800 border-amber-200",
      };
    }
    return {
      label: "Tạm tính (Đang mở nhận dữ liệu)",
      bg: "bg-sky-50 text-sky-800 border-sky-200",
    };
  };

  const statusMeta = getPeriodStatusLabel(period?.status);

  return (
    <div className="min-h-screen bg-[#F5F8FA] -m-4 sm:-m-6 p-4 sm:p-6 space-y-5 text-slate-800">
      <SkylineConnectSubNav
        showAdminLink={Boolean(
          data?.currentUser?.permissions?.isAdmin ||
            data?.currentUser?.permissions?.isAwardFinalizer
        )}
      />

      {/* Masthead */}
      <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#123E4A] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#123E4A] to-[#159EAA] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-6 h-6 text-[#D6A74A]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#123E4A]">
                  Bảng vàng sáng tạo Sky-Line
                </h1>
                {period && (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusMeta.bg}`}
                  >
                    {statusMeta.label}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Vinh danh Ý tưởng tiềm năng và Sản phẩm AI hữu ích theo tháng và năm học (Múi giờ Asia/Ho_Chi_Minh UTC+7)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              aria-label="Chọn kỳ Bảng vàng"
              className="rounded-xl border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-xs font-bold text-[#123E4A]"
            >
              {periods.length === 0 ? (
                <option value="">Tháng 11 • Năm học 2026–2027 (Mặc định)</option>
              ) : (
                periods.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.periodType === "YEARLY" ? "Năm học" : "Tháng"})
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={() => setShowFormula((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-[#123E4A] cursor-pointer"
            >
              <Info className="w-4 h-4 text-[#159EAA]" />
              <span>{showFormula ? "Ẩn công thức & quy chế" : "Công thức & Quy chế"}</span>
            </button>
          </div>
        </div>

        {/* Formula & Rule Set Disclosure */}
        {showFormula && (
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs space-y-2.5 leading-relaxed">
            <div className="font-bold text-[#123E4A] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#159EAA]" />
              <span>Quy chế & Công thức tính điểm Bảng vàng (Minh bạch 100%)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <div className="font-bold text-slate-800">1. Điểm cộng đồng (C)</div>
                <p className="text-slate-600 mt-1 tabular-nums">
                  C = 20 × ((n × R + 5 × 3.5) / (n + 5)), quy đổi thang 0–100. Loại trừ tự đánh giá và đánh giá của đồng tác giả.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <div className="font-bold text-slate-800">2. Điểm chuyên môn (E)</div>
                <p className="text-slate-600 mt-1 tabular-nums">
                  E = 20 × trung bình 3 tiêu chí (1–5) từ tối thiểu 2 người chấm chuyên môn độc lập. Nếu chưa đủ người chấm: trạng thái &quot;Chưa đủ điều kiện&quot; (không tính E = 0).
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                <div className="font-bold text-slate-800">3. Điểm áp dụng thực tế (U)</div>
                <p className="text-slate-600 mt-1 tabular-nums">
                  U = 100 × min(a / cap, 1), với a là số GV khác nhau có minh chứng áp dụng đã được xác nhận (cap = 10 theo tháng, cap = 20 theo năm học).
                </p>
              </div>
            </div>
            <div className="text-slate-600 pt-1 tabular-nums">
              • <strong>Điểm Ý tưởng tiềm năng</strong> = 0.60 × C + 0.40 × E (Ngưỡng tối thiểu: n &ge; 5 theo tháng, n &ge; 10 theo năm học).{" "}
              • <strong>Điểm Sản phẩm AI hữu ích</strong> = 0.50 × C + 0.20 × E + 0.30 × U (Ngưỡng tối thiểu: n &ge; 5, a &ge; 3 theo tháng; n &ge; 10, a &ge; 5 theo năm học).{" "}
              • <strong>Xử lý hòa điểm:</strong> So sánh tổng điểm chưa làm tròn &rarr; điểm E cao hơn &rarr; số lượt n cao hơn &rarr; đồng hạng kiểu 1, 1, 3.
            </div>
          </div>
        )}

        {/* Category Switch & Filters (Preserving Original General Rank) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCategoryTab("PRODUCT")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                categoryTab === "PRODUCT"
                  ? "bg-[#123E4A] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Bot className="w-4 h-4 text-[#5EEAD4]" />
              <span>Bảng vàng Sản phẩm AI</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryTab("IDEA")}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                categoryTab === "IDEA"
                  ? "bg-[#123E4A] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Lightbulb className="w-4 h-4 text-[#D6A74A]" />
              <span>Bảng vàng Ý tưởng tiềm năng</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Lọc (giữ nguyên hạng gốc):</span>
            </span>
            <select
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
            >
              <option value="">Tất cả cơ sở</option>
              {(catalogs.campuses || []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
            >
              <option value="">Tất cả môn học</option>
              {(catalogs.subjects || []).map((s: any) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5"
            >
              <option value="">Tất cả khối lớp</option>
              {(catalogs.grades || []).map((g: any) => (
                <option key={g.code} value={g.code}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Standings Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Đang tổng hợp dữ liệu Bảng vàng sáng tạo...
          </div>
        ) : standings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3.5 px-4">Thứ hạng gốc</th>
                  <th className="py-3.5 px-4">
                    {categoryTab === "PRODUCT" ? "Sản phẩm AI" : "Ý tưởng dạy học"}
                  </th>
                  <th className="py-3.5 px-4">Tác giả & Cơ sở</th>
                  <th className="py-3.5 px-4 text-right">Đánh giá (n, R)</th>
                  <th className="py-3.5 px-4 text-right">Điểm C</th>
                  <th className="py-3.5 px-4 text-right">Điểm E (Chuyên môn)</th>
                  {categoryTab === "PRODUCT" && (
                    <th className="py-3.5 px-4 text-right">Điểm U (Áp dụng a)</th>
                  )}
                  <th className="py-3.5 px-4 text-right">Tổng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {standings.map((row: any) => {
                  const c = row.candidate;
                  return (
                    <tr
                      key={`${c.targetType}:${c.targetId}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold">
                        {row.rank !== null ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-extrabold ${
                              row.rank === 1
                                ? "bg-[#D6A74A] text-white shadow-2xs"
                                : row.rank === 2
                                ? "bg-slate-200 text-slate-800"
                                : row.rank === 3
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.rank}
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            Chưa đủ ĐK
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#123E4A]">
                          {c.postId ? (
                            <Link
                              href={`/teacher/skyline-connect/posts/${c.postId}`}
                              className="hover:text-[#159EAA] hover:underline"
                            >
                              {c.targetTitle}
                            </Link>
                          ) : (
                            c.targetTitle
                          )}
                        </div>
                        {!c.isEligible && c.ineligibleReasons?.length > 0 && (
                          <div className="text-[11px] text-amber-700 mt-0.5">
                            • {c.ineligibleReasons[0]}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{c.authorName}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.campusName || "Hệ thống Sky-Line"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-800">
                          {c.avgRatingR.toFixed(2)} ★
                        </span>{" "}
                        <span className="text-slate-500">({c.validRatingCountN} GV)</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        {c.scoreC.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {c.scoreE !== null ? (
                          <span className="font-semibold text-slate-700">
                            {c.scoreE.toFixed(2)} ({c.expertCount} GK)
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            Chưa đủ GK ({c.expertCount}/2)
                          </span>
                        )}
                      </td>
                      {categoryTab === "PRODUCT" && (
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-semibold text-slate-700">
                            {c.scoreU !== null ? c.scoreU.toFixed(2) : "0.00"} ({c.verifiedAppsCountA}{" "}
                            MC)
                          </span>
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right">
                        {c.isEligible && c.totalScoreRaw !== null ? (
                          <span className="text-sm font-extrabold text-[#123E4A]">
                            {c.totalScoreRaw.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center space-y-2">
            <Award className="w-8 h-8 text-[#D6A74A] mx-auto" />
            <h3 className="text-sm font-bold text-[#123E4A]">
              Chưa có hồ sơ xếp hạng trong kỳ này
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Các ý tưởng và sản phẩm AI được chia sẻ trong kỳ sẽ tự động hiển thị điểm tạm tính khi có lượt đánh giá và minh chứng áp dụng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SkylineConnectHallOfFamePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải Bảng vàng sáng tạo...</div>}>
      <HallOfFameContent />
    </Suspense>
  );
}
