"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  User,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  BookOpen,
  Award,
  BarChart3,
  Calendar,
  Building,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import * as XLSX from "xlsx";

const MILESTONES = [
  { key: "KSDV", label: "Khảo sát đầu vào", short: "KSDV" },
  { key: "KSDN", label: "Khảo sát đầu năm", short: "KSĐN" },
  { key: "GK1", label: "Giữa kỳ 1", short: "GK1" },
  { key: "CK1", label: "Cuối kỳ 1", short: "CK1" },
  { key: "GK2", label: "Giữa kỳ 2", short: "GK2" },
  { key: "CK2", label: "Cuối kỳ 2", short: "CK2" },
];

interface Campus {
  id: string;
  campusName: string;
}

interface ClassItem {
  id: string;
  className: string;
  grade: string | null;
  campusId: string;
}

interface StudentOption {
  id: string;
  studentId: string;
  fullName: string;
  className: string;
}

interface TrajectoryItem {
  period: string;
  label: string;
  average: number | null;
  count: number;
  delta: number | null;
}

interface SubjectItem {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  grades: Record<string, { score: number | null; teacherComment: string | null }>;
}

interface ClassMatrixRow {
  id: string;
  studentId: string;
  fullName: string;
  gender: string | null;
  scores: Record<string, number | null>;
}
export default function KetQuaClient() {
  const [viewMode, setViewMode] = useState<"individual" | "class">("individual");
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchStudentText, setSearchStudentText] = useState<string>("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Individual Student Data
  const [studentData, setStudentData] = useState<any>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingStudent, setLoadingStudent] = useState<boolean>(false);

  // Class Matrix Data
  const [classInfo, setClassInfo] = useState<any>(null);
  const [matrixRows, setMatrixRows] = useState<ClassMatrixRow[]>([]);
  const [loadingClass, setLoadingClass] = useState<boolean>(false);

  // Fetch filter options
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/admin/tra-cuu-hoc-sinh/filter-options");
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          setCampuses(d.campuses || []);
          setClasses(d.classes || []);
          if (d.classes && d.classes.length > 0) {
            setSelectedClass(d.classes[0].id);
          }
        }
      } catch (err) {
        console.error("Loi tai bo loc ket qua:", err);
      }
    }
    loadFilters();
  }, []);

  // Search students for autocomplete
  useEffect(() => {
    async function searchStudents() {
      try {
        const params = new URLSearchParams();
        if (selectedClass) params.append("classId", selectedClass);
        if (selectedCampus !== "all") params.append("campusId", selectedCampus);
        if (searchStudentText.trim()) params.append("q", searchStudentText.trim());
        params.append("pageSize", "10");

        const res = await fetch(`/api/admin/tra-cuu-hoc-sinh/profiles?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          const items = (json.students || []).map((s: any) => ({
            id: s.id,
            studentId: s.studentId,
            fullName: s.fullName,
            className: s.className,
          }));
          setStudentOptions(items);
          if (!selectedStudentId && items.length > 0) {
            setSelectedStudentId(items[0].id);
          }
        }
      } catch (err) {
        console.error("Loi tim kiem hoc sinh:", err);
      }
    }
    searchStudents();
  }, [selectedClass, selectedCampus, searchStudentText]);

  // Fetch individual student 6-period results
  useEffect(() => {
    if (!selectedStudentId) return;
    async function fetchStudentGrades() {
      setLoadingStudent(true);
      try {
        const res = await fetch(`/api/admin/tra-cuu-hoc-sinh/grades?studentId=${selectedStudentId}`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          setStudentData(d.student || null);
          setTrajectory(d.trajectory || []);
          setSubjects(d.subjects || []);
        }
      } catch (err) {
        console.error("Loi tai diem hoc sinh:", err);
      } finally {
        setLoadingStudent(false);
      }
    }
    fetchStudentGrades();
  }, [selectedStudentId]);

  // Fetch Class Matrix (6 periods)
  useEffect(() => {
    if (!selectedClass || selectedClass === "all") return;
    async function fetchClassMatrix() {
      setLoadingClass(true);
      try {
        const res = await fetch(`/api/admin/tra-cuu-hoc-sinh/grades?classId=${selectedClass}`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data || json;
          setClassInfo(d.classInfo || null);
          setMatrixRows(d.matrix || []);
        }
      } catch (err) {
        console.error("Loi tai ma tran lop:", err);
      } finally {
        setLoadingClass(false);
      }
    }
    fetchClassMatrix();
  }, [selectedClass]);

  const handleExportMatrixExcel = () => {
    if (matrixRows.length === 0) {
      alert("Không có dữ liệu lớp để xuất Excel");
      return;
    }
    const dataToExport = matrixRows.map((row, idx) => {
      const obj: any = {
        "STT": idx + 1,
        "Mã học sinh": row.studentId,
        "Họ và tên": row.fullName,
        "Giới tính": row.gender || "",
      };
      MILESTONES.forEach((m) => {
        obj[m.label] = row.scores[m.key] !== null ? row.scores[m.key] : "---";
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ma_tran_diem_6_ky");
    XLSX.writeFile(wb, `Bang_Diem_6_Ky_Lop_${classInfo?.className || "SkyLine"}.xlsx`);
  };
  return (
    <div className="space-y-6">
      {/* TOP VIEW MODE TOGGLE & SELECTORS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("individual")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                viewMode === "individual"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Theo dõi Cá nhân & Tăng trưởng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("class")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                viewMode === "class"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Bảng điểm Lớp học (Ma trận 6 kỳ)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "class" && (
              <button
                type="button"
                onClick={handleExportMatrixExcel}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Xuất bảng điểm Excel</span>
              </button>
            )}
            {viewMode === "individual" && (
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>In phiếu điểm A4</span>
              </button>
            )}
          </div>
        </div>

        {/* SELECTORS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Cơ sở trường
            </label>
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
            >
              <option value="all">Tất cả các cơ sở</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Lớp học
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
            >
              <option value="">-- Chọn lớp học --</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.className} {cls.grade ? `(K${cls.grade})` : ""}
                </option>
              ))}
            </select>
          </div>

          {viewMode === "individual" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Chọn học sinh
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 border border-[#00A19A] rounded-xl px-3 py-2 text-xs font-bold text-[#003B3A] focus:outline-hidden focus:ring-2 focus:ring-[#00A19A]"
              >
                {studentOptions.length === 0 ? (
                  <option value="">Không có học sinh trong lớp này</option>
                ) : (
                  studentOptions.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.studentId} - {stu.fullName}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: INDIVIDUAL STUDENT & 6-PERIOD GROWTH */}
      {viewMode === "individual" && (
        <div className="space-y-6">
          {loadingStudent ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#00A19A]" />
              Đang tải dữ liệu tiến trình học tập của học sinh...
            </div>
          ) : !studentData ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Vui lòng chọn học sinh để xem dữ liệu kết quả học tập qua 6 mốc đánh giá.
            </div>
          ) : (
            <>
              {/* Student Hero Header */}
              <div className="bg-gradient-to-r from-[#003B3A] to-[#005B58] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-extrabold text-teal-200">
                    {studentData.fullName?.split(" ").slice(-1)[0]?.charAt(0) || "S"}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight">{studentData.fullName}</h2>
                    <div className="text-xs text-teal-100 flex flex-wrap items-center gap-3 mt-1 font-medium">
                      <span>Mã HS: <strong className="font-mono text-white">{studentData.studentId}</strong></span>
                      <span>•</span>
                      <span>Lớp: <strong className="text-white">{studentData.className}</strong></span>
                      <span>•</span>
                      <span>Cơ sở: <strong className="text-white">{studentData.campusName}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-teal-400/20 border border-teal-300/30 text-xs font-bold text-teal-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-300" />
                    Theo dõi 6 mốc đánh giá
                  </span>
                </div>
              </div>

              {/* 6 Milestones Score Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {trajectory.map((point) => {
                  const hasScore = point.average !== null;
                  const delta = point.delta;
                  const isUp = delta !== null && delta > 0;
                  const isDown = delta !== null && delta < 0;

                  return (
                    <div
                      key={point.period}
                      className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-[#00A19A] transition flex flex-col justify-between"
                    >
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        {point.label}
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className={`text-2xl font-extrabold ${hasScore ? "text-[#003B3A]" : "text-slate-300"}`}>
                          {hasScore ? point.average?.toFixed(1) : "---"}
                        </span>
                        {delta !== null && (
                          <span
                            className={`text-xs font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                              isUp
                                ? "bg-emerald-50 text-emerald-700"
                                : isDown
                                ? "bg-rose-50 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isUp && <TrendingUp className="w-3 h-3" />}
                            {isDown && <TrendingDown className="w-3 h-3" />}
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-2 font-medium">
                        {point.count > 0 ? `${point.count} môn đánh giá` : "Chưa có điểm"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* GROWTH TRAJECTORY CHART (RECHARTS) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#00A19A]" />
                    Đường cong tăng trưởng học tập qua 6 mốc
                  </h3>
                  <div className="text-xs text-slate-500">
                    Thang điểm 10.0 (Chuẩn đánh giá Sky-Line)
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectory} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="short" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#003B3A",
                          borderRadius: "12px",
                          color: "#fff",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                      <ReferenceLine y={8.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Giỏi (8.0)", fill: "#10b981", fontSize: 10 }} />
                      <ReferenceLine y={5.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Đạt (5.0)", fill: "#f59e0b", fontSize: 10 }} />
                      <Line
                        type="monotone"
                        dataKey="average"
                        name="Điểm trung bình"
                        stroke="#00A19A"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#00A19A", stroke: "#ffffff", strokeWidth: 2 }}
                        activeDot={{ r: 7 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SUBJECT LEVEL DETAILS TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#00A19A]" />
                    Bảng điểm chi tiết từng môn học ({subjects.length} môn)
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">STT</th>
                        <th className="py-3.5 px-4 min-w-[160px]">Môn học</th>
                        {MILESTONES.map((m) => (
                          <th key={m.key} className="py-3.5 px-3 text-center">
                            {m.short}
                          </th>
                        ))}
                        <th className="py-3.5 px-4 min-w-[200px]">Nhận xét của giáo viên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjects.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500">
                            Chưa có dữ liệu điểm môn học cho học sinh này.
                          </td>
                        </tr>
                      ) : (
                        subjects.map((sub, idx) => {
                          const comments = Object.values(sub.grades)
                            .map((g) => g.teacherComment)
                            .filter(Boolean);
                          const lastComment = comments.length > 0 ? comments[comments.length - 1] : "---";

                          return (
                            <tr key={sub.subjectId} className="hover:bg-teal-50/30 transition-colors">
                              <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-800">
                                {sub.subjectName}
                                <span className="block text-[11px] font-mono text-slate-400 font-normal">
                                  {sub.subjectCode}
                                </span>
                              </td>
                              {MILESTONES.map((m) => {
                                const scoreObj = sub.grades[m.key];
                                const sc = scoreObj?.score;
                                return (
                                  <td key={m.key} className="py-3 px-3 text-center">
                                    {sc !== null && sc !== undefined ? (
                                      <span
                                        className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                                          sc >= 8.0
                                            ? "bg-emerald-50 text-emerald-700"
                                            : sc >= 6.5
                                            ? "bg-teal-50 text-[#00A19A]"
                                            : sc >= 5.0
                                            ? "bg-amber-50 text-amber-700"
                                            : "bg-rose-50 text-rose-700"
                                        }`}
                                      >
                                        {sc.toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">---</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-3 px-4 text-xs text-slate-600 italic">
                                {lastComment}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* VIEW MODE 2: CLASS GRADEBOOK MATRIX (6 PERIODS) */}
      {viewMode === "class" && (
        <div className="space-y-6">
          {loadingClass ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#00A19A]" />
              Đang tải ma trận điểm số 6 kỳ của lớp học...
            </div>
          ) : !classInfo ? (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Vui lòng chọn lớp học để xem bảng điểm ma trận 6 kỳ.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#003B3A] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#00A19A]" />
                    Bảng điểm tổng hợp 6 kỳ: Lớp {classInfo.className}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sĩ số: {classInfo.totalStudents} học sinh • Cơ sở: {classInfo.campusName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-[#00A19A] border border-teal-200">
                    Ma trận 6 mốc chuẩn
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">STT</th>
                      <th className="py-3.5 px-4">Mã HS</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Họ và tên</th>
                      <th className="py-3.5 px-3 text-center">Giới tính</th>
                      {MILESTONES.map((m) => (
                        <th key={m.key} className="py-3.5 px-3 text-center font-bold">
                          {m.short}
                        </th>
                      ))}
                      <th className="py-3.5 px-3 text-center">Xu hướng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-500">
                          Chưa có dữ liệu điểm cho các học sinh lớp này.
                        </td>
                      </tr>
                    ) : (
                      matrixRows.map((row, idx) => {
                        const firstScore = row.scores["KSDV"] ?? row.scores["KSDN"] ?? null;
                        const lastScore = row.scores["CK2"] ?? row.scores["GK2"] ?? row.scores["CK1"] ?? null;
                        let trendDelta: number | null = null;
                        if (firstScore !== null && lastScore !== null) {
                          trendDelta = Number((lastScore - firstScore).toFixed(1));
                        }

                        return (
                          <tr key={row.id} className="hover:bg-teal-50/30 transition-colors">
                            <td className="py-3 px-4 text-center text-xs text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-xs text-[#003B3A]">
                              {row.studentId}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              <span
                                className="cursor-pointer hover:text-[#00A19A] transition"
                                onClick={() => {
                                  setSelectedStudentId(row.id);
                                  setViewMode("individual");
                                }}
                              >
                                {row.fullName}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-xs text-slate-500">
                              {row.gender || "---"}
                            </td>
                            {MILESTONES.map((m) => {
                              const sc = row.scores[m.key];
                              return (
                                <td key={m.key} className="py-3 px-3 text-center">
                                  {sc !== null && sc !== undefined ? (
                                    <span
                                      className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                                        sc >= 8.0
                                          ? "bg-emerald-50 text-emerald-700 font-bold"
                                          : sc >= 6.5
                                          ? "bg-teal-50 text-[#00A19A]"
                                          : sc >= 5.0
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-rose-50 text-rose-700"
                                      }`}
                                    >
                                      {sc.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">---</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-3 px-3 text-center">
                              {trendDelta !== null ? (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${
                                    trendDelta > 0
                                      ? "bg-emerald-50 text-emerald-700"
                                      : trendDelta < 0
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {trendDelta > 0 ? (
                                    <>
                                      <TrendingUp className="w-3 h-3" />
                                      +{trendDelta}
                                    </>
                                  ) : trendDelta < 0 ? (
                                    <>
                                      <TrendingDown className="w-3 h-3" />
                                      {trendDelta}
                                    </>
                                  ) : (
                                    "0.0"
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-300">---</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
