"use client";
// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  X, Download, FileSpreadsheet, Users, Search, Filter,
  Building2, GraduationCap, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, RefreshCw, BookOpen, Layers, Printer
} from "lucide-react";
import toast from "react-hot-toast";

interface GvcnTrackingExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYearId?: string;
  campusId?: string;
}

export default function GvcnTrackingExportModal({
  isOpen,
  onClose,
  academicYearId,
  campusId = "ALL"
}: GvcnTrackingExportModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [campusFilter, setCampusFilter] = useState(campusId || "ALL");
  const [expandedClassKey, setExpandedClassKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Mở tab xuất PDF theo GVCN (hoặc toàn bộ GV)
  const handlePrintPdf = (classId?: string, autoPrint = true) => {
    let url = `/api/admin/experiential-activities/export-gvcn-pdf?academicYear=${encodeURIComponent(data?.academicYearName || academicYearId || "")}`;
    if (classId) url += `&classId=${encodeURIComponent(classId)}`;
    if (campusFilter !== "ALL") url += `&campusId=${encodeURIComponent(campusFilter)}`;
    if (autoPrint) url += `&autoPrint=true`;
    const win = window.open(url, "_blank");
    if (!win) {
      toast.error("Trình duyệt đang chặn mở cửa sổ mới. Vui lòng cho phép pop-up để xem PDF!");
    }
  };

  // Fetch tracking JSON summary
  const loadData = () => {
    setLoading(true);
    let url = `/api/admin/experiential-activities/export-gvcn-tracking?format=json`;
    if (academicYearId) url += `&academicYearId=${academicYearId}`;
    if (campusFilter !== "ALL") url += `&campusId=${campusFilter}`;

    fetch(url)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải dữ liệu theo dõi GVCN:", err);
        toast.error("Không thể tải dữ liệu theo dõi GVCN");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, academicYearId, campusFilter]);

  // Direct Excel Download
  const handleDownloadExcel = () => {
    setIsExporting(true);
    let url = `/api/admin/experiential-activities/export-gvcn-tracking?format=xlsx`;
    if (academicYearId) url += `&academicYearId=${academicYearId}`;
    if (campusFilter !== "ALL") url += `&campusId=${campusFilter}`;

    toast.success("Đang tạo và tải file Excel theo dõi GVCN...");
    const win = window.open(url, "_blank");
    setTimeout(() => {
      setIsExporting(false);
    }, 1500);
  };

  // Filtered Summary List
  const filteredSummary = useMemo(() => {
    if (!data?.summary) return [];
    let list = data.summary;

    if (campusFilter !== "ALL") {
      list = list.filter((item: any) => item.campusName?.includes(campusFilter) || item.campusCode === campusFilter);
    }

    if (statusFilter !== "ALL") {
      if (statusFilter === "COMPLETED") list = list.filter((i: any) => i.status.includes("100%"));
      else if (statusFilter === "IN_PROGRESS") list = list.filter((i: any) => i.status.includes("Đang"));
      else if (statusFilter === "NOT_STARTED") list = list.filter((i: any) => i.status.includes("Chưa đánh giá"));
      else if (statusFilter === "NO_PLANS") list = list.filter((i: any) => i.assignedPlansCount === 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((i: any) =>
        i.homeroomTeacherName?.toLowerCase().includes(q) ||
        i.className?.toLowerCase().includes(q) ||
        i.teacherCode?.toLowerCase().includes(q) ||
        i.campusName?.toLowerCase().includes(q) ||
        i.grade?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data?.summary, search, statusFilter, campusFilter]);

  // Overall Statistics
  const overallStats = useMemo(() => {
    if (!data?.summary) {
      return {
        totalGVCN: 0,
        totalPlansAssigned: 0,
        totalEvaluated: 0,
        totalPending: 0,
        overallPercent: 0,
        completedGvcnCount: 0
      };
    }

    const list = data.summary;
    let plansSum = 0;
    let evalSum = 0;
    let pendSum = 0;
    let completedCount = 0;

    list.forEach((item: any) => {
      plansSum += (item.assignedPlansCount || 0);
      evalSum += (item.totalEvaluated || 0);
      pendSum += (item.totalPending || 0);
      if (item.status.includes("100%")) completedCount += 1;
    });

    const totalReq = evalSum + pendSum;
    const overallPercent = totalReq > 0 ? Math.round((evalSum / totalReq) * 100) : 0;

    return {
      totalGVCN: list.length,
      totalPlansAssigned: plansSum,
      totalEvaluated: evalSum,
      totalPending: pendSum,
      overallPercent,
      completedGvcnCount: completedCount
    };
  }, [data?.summary]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A19A] p-4 text-white flex items-center justify-between gap-3 shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md font-bold text-teal-200 shadow-2xs">
              <Users className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-teal-100">
                  Giám sát Sư phạm Sky-Line
                </span>
                <span className="text-xs text-teal-200 font-semibold">
                  Niên khóa: {data?.academicYearName || "2026-2027"}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white line-clamp-1 mt-0.5">
                Theo Dõi Kế Hoạch & Tiến Độ Đánh Giá Theo GVCN
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrintPdf()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="In hoặc xuất PDF phiếu theo dõi tất cả GVCN theo khổ A4 dọc"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Xuất PDF Toàn Bộ GV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Xuất trọn bộ 3 Sheet Excel: Tổng hợp GVCN, Chi tiết Kế hoạch và Danh sách HS chưa đánh giá"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-950" />
              <span>{isExporting ? "Đang xuất..." : "Xuất File Excel (3 Sheet)"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Summary KPIs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng GVCN / Lớp</div>
            <div className="text-xl font-black text-[#003B3A] mt-0.5">{overallStats.totalGVCN}</div>
            <div className="text-[11px] text-teal-600 font-semibold mt-0.5">
              {overallStats.completedGvcnCount} lớp hoàn tất 100%
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lượt kế hoạch gán</div>
            <div className="text-xl font-black text-indigo-700 mt-0.5">{overallStats.totalPlansAssigned}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Phân bổ toàn hệ thống</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiến độ đánh giá HS</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{overallStats.overallPercent}%</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              {overallStats.totalEvaluated} lượt HS đã ĐG
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">HS chưa đánh giá</div>
            <div className="text-xl font-black text-rose-600 mt-0.5">{overallStats.totalPending}</div>
            <div className="text-[11px] text-rose-700 font-semibold mt-0.5">Cần đôn đốc hoàn tất</div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên GVCN, lớp, mã GV..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#00A19A] focus:outline-hidden"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="ALL">Tất cả tình trạng</option>
              <option value="COMPLETED">Đã hoàn thành 100%</option>
              <option value="IN_PROGRESS">Đang đánh giá</option>
              <option value="NOT_STARTED">Chưa đánh giá (0%)</option>
              <option value="NO_PLANS">Chưa gán kế hoạch</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-slate-500 font-semibold">
            <span>Hiển thị: <strong className="text-slate-900">{filteredSummary.length}</strong> / {overallStats.totalGVCN} GVCN</span>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-[#00A19A] mb-2" />
              <span className="font-bold text-xs">Đang tổng hợp dữ liệu kế hoạch & học sinh theo GVCN...</span>
            </div>
          ) : filteredSummary.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-600">Không tìm thấy GVCN hoặc lớp phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng điều chỉnh lại bộ lọc tìm kiếm</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <th className="p-2.5 text-center w-12">STT</th>
                    <th className="p-2.5">Cơ sở / Khối</th>
                    <th className="p-2.5">Lớp chủ nhiệm</th>
                    <th className="p-2.5">Giáo viên Chủ nhiệm</th>
                    <th className="p-2.5 text-center">Số Kế hoạch</th>
                    <th className="p-2.5 text-center">Đã ĐG / Tổng lượt</th>
                    <th className="p-2.5 text-center w-36">Tiến độ (%)</th>
                    <th className="p-2.5 text-center">HS chưa ĐG</th>
                    <th className="p-2.5">Tình trạng</th>
                    <th className="p-2.5 text-center w-24">In / PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSummary.map((item: any, idx: number) => {
                    const isExpanded = expandedClassKey === item.className;
                    const percentNum = Number(item.progressPercent.replace('%', '')) || 0;
                    const classDetails = (data?.details || []).filter((d: any) => d.className === item.className);

                    return (
                      <React.Fragment key={idx}>
                        <tr 
                          onClick={() => setExpandedClassKey(isExpanded ? null : item.className)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-800">{item.campusName}</span>
                            <span className="text-[10px] block text-slate-400">{item.grade}</span>
                          </td>
                          <td className="p-2.5 font-bold text-[#003B3A]">{item.className}</td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{item.homeroomTeacherName}</div>
                            {item.teacherCode && item.teacherCode !== "—" && (
                              <div className="text-[10px] text-slate-400">Mã: {item.teacherCode}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-black text-slate-800">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                              {item.assignedPlansCount} KH
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-semibold text-slate-700">
                            {item.totalEvaluated} / {item.totalRequired}
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    percentNum === 100 ? "bg-emerald-500" : percentNum > 0 ? "bg-teal-500" : "bg-slate-300"
                                  }`}
                                  style={{ width: `${percentNum}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-black text-slate-800 w-9 text-right">
                                {item.progressPercent}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            {item.totalPending > 0 ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[11px]">
                                {item.totalPending} HS
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">—</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {item.assignedPlansCount === 0 ? (
                              <span className="text-slate-400 italic">Chưa gán KH</span>
                            ) : percentNum === 100 ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Hoàn tất</span>
                              </span>
                            ) : percentNum > 0 ? (
                              <span className="text-teal-700 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-teal-500" />
                                <span>Đang ĐG</span>
                              </span>
                            ) : (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span>Chưa ĐG</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handlePrintPdf(item.classId)}
                                className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition-colors border border-teal-200 cursor-pointer shadow-2xs"
                                title={`Xuất / In PDF phiếu theo dõi của GVCN ${item.homeroomTeacherName} (${item.className})`}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedClassKey(isExpanded ? null : item.className)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={10} className="p-3 pl-12">
                              <div className="bg-white rounded-xl p-3 border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-black text-[#003B3A] flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Chi tiết các kế hoạch gán cho lớp {item.className} ({classDetails.length} kế hoạch):</span>
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={() => handlePrintPdf(item.classId)}
                                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <Printer className="w-3 h-3 text-teal-700" />
                                    <span>Xuất Phiếu PDF A4 Lớp {item.className}</span>
                                  </button>
                                </div>

                                {classDetails.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">Chưa có kế hoạch hoạt động trải nghiệm nào được gán cho lớp này.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {classDetails.map((cd: any, cIdx: number) => (
                                      <div key={cIdx} className="flex flex-wrap items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                                        <div className="flex items-center gap-2">
                                          <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-bold text-[10px]">
                                            {cd.activityCode}
                                          </span>
                                          <span className="font-bold text-slate-800">{cd.activityName}</span>
                                          <span className="text-slate-400 text-[11px]">• {cd.timeRange}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-slate-600">
                                            Đã ĐG: <strong>{cd.evaluatedCount}/{cd.totalStudents}</strong>
                                          </span>
                                          <span className="font-black text-slate-800">{cd.progressPercent}</span>
                                          <span className="text-[11px] font-semibold text-rose-600">
                                            {cd.pendingCount > 0 ? `Còn ${cd.pendingCount} HS chưa ĐG` : "Đã xong"}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-medium">
            File Excel xuất ra gồm <strong>3 Sheet</strong> chuyên sâu: Tổng hợp GVCN, Chi tiết Kế hoạch, Danh sách HS chưa đánh giá.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExporting}
              className="px-5 py-2 bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-teal-200" />
              <span>{isExporting ? "Đang xuất file..." : "Tải Excel Theo Dõi GVCN"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
