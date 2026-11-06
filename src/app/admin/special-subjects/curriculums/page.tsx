"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  BookOpen, 
  Layers, 
  Clock, 
  Target, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  ChevronRight, 
  Award, 
  RefreshCcw,
  FileText,
  Package,
  Eye,
  Info,
  Heart,
  Compass,
  Shield,
  Coins,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  X,
  Check,
  Zap
} from "lucide-react";
import toast from "react-hot-toast";

export default function SpecialSubjectsCurriculumsPage() {
  const [loading, setLoading] = useState(true);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [tc01sMapping, setTc01sMapping] = useState<any | null>(null);
  const [showSourceMappingTable, setShowSourceMappingTable] = useState(false);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>("");
  const [activeGrade, setActiveGrade] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [importVersionCode, setImportVersionCode] = useState("v1.0");
  const [importSelectedGrades, setImportSelectedGrades] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCurriculums = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/special-subjects/curriculums");
      const json = await res.json();
      if (res.ok) {
        const currs = json.curriculums || [];
        setCurriculums(currs);
        if (json.tc01sMapping) {
          setTc01sMapping(json.tc01sMapping);
        }
        if (currs.length > 0 && !selectedCurriculumId) {
          setSelectedCurriculumId(currs[0].id);
        }
      } else {
        toast.error(json.error || "Không thể tải khung chương trình");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculums();
  }, []);

  const activeCurriculum = curriculums.find(c => c.id === selectedCurriculumId) || curriculums[0];
  const activeVersion = activeCurriculum?.versions?.[0];

  // Dynamically extract available grades for this curriculum
  const availableGrades = useMemo(() => {
    if (!activeVersion?.lessons) return ["1"];
    const gradeSet = new Set<string>();
    activeVersion.lessons.forEach((l: any) => {
      if (l.grade) gradeSet.add(l.grade.toString());
    });
    activeVersion.gradeConfigs?.forEach((gc: any) => {
      if (gc.grade) gradeSet.add(gc.grade.toString());
    });
    const sorted = Array.from(gradeSet).sort((a, b) => parseInt(a) - parseInt(b));
    return sorted.length > 0 ? sorted : ["1"];
  }, [activeVersion]);

  // Auto-switch to first grade when curriculum changes if activeGrade not in availableGrades
  useEffect(() => {
    if (availableGrades.length > 0 && !availableGrades.includes(activeGrade)) {
      setActiveGrade(availableGrades[0]);
    }
  }, [availableGrades, activeGrade]);

  const gradeConfig = activeVersion?.gradeConfigs?.find((gc: any) => gc.grade === activeGrade);
  const allLessons = activeVersion?.lessons?.filter((l: any) => l.grade === activeGrade) || [];

  const filteredLessons = allLessons.filter((l: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.lessonName?.toLowerCase().includes(term) ||
      l.topic?.name?.toLowerCase().includes(term) ||
      l.objectives?.toLowerCase().includes(term) ||
      l.expectedProduct?.toLowerCase().includes(term) ||
      l.criteria?.some((c: any) => c.code?.toLowerCase().includes(term) || c.description?.toLowerCase().includes(term))
    );
  });

  const getSubjectIcon = (code: string) => {
    switch (code) {
      case "CXXH": return Heart;
      case "GDHN": return Compass;
      case "GDGT": return Shield;
      case "FIN_EDU": return Coins;
      default: return BookOpen;
    }
  };

  const SubjectIcon = getSubjectIcon(activeCurriculum?.subject?.code);

  // Import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportLoading(true);
    setPreviewData(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "PREVIEW");
      formData.append("curriculumCode", activeCurriculum?.code || "CURR_FIN_PRIMARY");

      const res = await fetch("/api/special-subjects/curriculums/import", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (res.ok) {
        setPreviewData(json);
        const grades = (json.sheets || []).map((s: any) => s.grade);
        setImportSelectedGrades(grades);
        toast.success(`Đã đọc xong ${json.sheets?.length || 0} khối lớp từ tệp Excel`);
      } else {
        toast.error(json.error || "Không thể phân tích tệp Excel");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi đọc file");
    } finally {
      setImportLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importFile) return;
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("action", "COMMIT");
      formData.append("curriculumCode", activeCurriculum?.code || "CURR_FIN_PRIMARY");
      formData.append("versionCode", importVersionCode.trim() || "v1.0");
      if (importSelectedGrades.length > 0) {
        formData.append("selectedGrades", importSelectedGrades.join(","));
      }

      const res = await fetch("/api/special-subjects/curriculums/import", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Nạp chương trình thành công!");
        setIsImportModalOpen(false);
        setImportFile(null);
        setPreviewData(null);
        fetchCurriculums();
      } else {
        toast.error(json.error || "Lỗi khi nạp chương trình");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi kết nối");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-4 w-full max-w-[1600px] mx-auto space-y-3.5">
      {/* Top Banner Navigation */}
      <SpecialSubjectNav 
        title="Quản lý Khung chương trình Môn đặc thù"
        subtitle="Chi tiết bài học chuẩn hóa, chủ đề, mục tiêu, tiêu chuẩn năng lực và sản phẩm kỳ vọng theo từng môn"
      />

      {/* Curriculum & Version selector - High Density & Compact */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-2xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Khung chương trình môn học
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={selectedCurriculumId}
                onChange={(e) => {
                  setSelectedCurriculumId(e.target.value);
                  setSelectedLesson(null);
                }}
                className="text-xs font-bold border border-teal-200 rounded-lg px-3 py-1.5 bg-teal-50/70 text-teal-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {curriculums.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.subject?.name} — {c.name} ({c.level === "PRIMARY" ? "Tiểu học" : c.level === "MIDDLE" ? "THCS" : "THPT"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Phiên bản áp dụng
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                {activeVersion?.versionCode || "v1.0"} (Niên khóa 2026-2027)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {activeVersion?.status || "PUBLISHED"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setPreviewData(null);
              setImportFile(null);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import PPCT Excel</span>
          </button>
          <button
            onClick={fetchCurriculums}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all text-xs"
            title="Làm mới"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Dynamic Grade Selector Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <span className="text-[11px] font-bold text-slate-400 px-2 shrink-0 uppercase tracking-wider">
          Khối lớp:
        </span>
        {availableGrades.map((g) => {
          const isActive = activeGrade === g;
          const lessonCountForGrade = activeVersion?.lessons?.filter((l: any) => l.grade === g)?.length || 0;

          return (
            <button
              key={g}
              onClick={() => {
                setActiveGrade(g);
                setSelectedLesson(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                isActive
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              <span>Khối {g}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
              }`}>
                {lessonCountForGrade > 0 ? `${lessonCountForGrade} bài` : "12 bài"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grade Overview Summary Card - Compact */}
      {gradeConfig && (
        <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-teal-800">
                Mục tiêu trọng tâm Khối {activeGrade} ({activeCurriculum?.subject?.name})
              </span>
              {activeCurriculum?.subject?.code === "FIN_EDU" && Number(activeGrade) >= 1 && Number(activeGrade) <= 5 && (
                <span className="text-[10px] px-2 py-0.5 bg-[#003B3A] text-white rounded font-semibold tabular-nums">
                  Mã chương trình: TC0{activeGrade}S • Sheet: KHỐI {activeGrade}S • Hệ đào tạo S
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 bg-teal-100/80 text-teal-800 rounded font-semibold tabular-nums">
                {allLessons.length} bài học • {gradeConfig.periodMinutes > 0 ? `${gradeConfig.periodMinutes} phút/tiết` : "Chưa cấu hình thời lượng / tuần / học kỳ"}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-4xl">
              {gradeConfig.overallGoal || `Chương trình môn ${activeCurriculum?.subject?.name} khối ${activeGrade} rèn luyện kiến thức, kỹ năng và thái độ theo chuẩn năng lực.`}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-right">
              <div className="text-[10px] font-bold text-slate-500">Thang đánh giá</div>
              <div className="text-xs font-bold text-slate-900">Định tính 3 mức (Tốt / Đạt / CCG)</div>
            </div>
          </div>
        </div>
      )}

      {/* TC01S Source Code Normalization & Anomaly Reconciliation Panel (Grade 1 FIN_EDU) */}
      {activeCurriculum?.subject?.code === "FIN_EDU" && activeGrade === "1" && tc01sMapping && (
        <div className="bg-white rounded-xl p-4 border-l-4 border-[#003B3A] border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Đối chiếu chuẩn hóa mã nguồn & Danh sách cần rà soát chuyên môn (Mã CT: {tc01sMapping.programCode} • Sheet: {tc01sMapping.sheetName})</span>
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
                Tổng cộng: <strong>{tc01sMapping.summary?.topicsCount} chủ đề</strong> • <strong>{tc01sMapping.summary?.lessonsCount} bài học</strong> • <strong>{tc01sMapping.summary?.criteriaCount} tiêu chuẩn</strong> (Hiểu: {tc01sMapping.summary?.competencyCounts?.["Hiểu"]}, Biết: {tc01sMapping.summary?.competencyCounts?.["Biết"]}, Vận dụng: {tc01sMapping.summary?.competencyCounts?.["Vận dụng"]}). {tc01sMapping.durationNote}
              </p>
            </div>
            <button
              onClick={() => setShowSourceMappingTable(prev => !prev)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all"
            >
              {showSourceMappingTable ? "Ẩn bảng ánh xạ 46 tiêu chuẩn nguồn" : "Xem bảng ánh xạ 46 tiêu chuẩn nguồn → ID hệ thống"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {(tc01sMapping.anomalyCategories || []).map((cat: any) => (
              <div
                key={cat.code}
                className={`p-3 rounded-lg border ${
                  cat.severity === "REVIEW_REQUIRED"
                    ? "bg-amber-50/70 border-amber-200"
                    : cat.severity === "WARNING"
                    ? "bg-slate-50 border-slate-200"
                    : "bg-slate-50/60 border-slate-200/80"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-slate-800">{cat.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    cat.severity === "REVIEW_REQUIRED"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-teal-50 text-teal-800 border border-teal-200"
                  }`}>
                    {cat.severity === "REVIEW_REQUIRED" ? "Cần rà soát" : "Đã chuẩn hóa"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mb-1">
                  Giá trị nguồn: {(cat.rawValues || []).join(" | ")}
                </p>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  {cat.resolution}
                </p>
              </div>
            ))}
          </div>

          {showSourceMappingTable && (
            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-xl mt-2">
              <table className="w-full text-left border-collapse text-[11px] tabular-nums">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2.5 w-14 text-center">Dòng Excel</th>
                    <th className="py-2 px-2.5">Chủ đề nguồn & Mã cột P</th>
                    <th className="py-2 px-2.5">Bài học nguồn & Mã cột Q</th>
                    <th className="py-2 px-2.5">Mã tiêu chuẩn nguồn</th>
                    <th className="py-2 px-2.5 text-center">Mức / Năng lực nguồn</th>
                    <th className="py-2 px-2.5">Ánh xạ ID hệ thống SSM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(tc01sMapping.records || []).map((rec: any) => (
                    <tr key={rec.excelRow} className={rec.hasLevelCompetencyMismatch ? "bg-amber-50/70" : "hover:bg-slate-50"}>
                      <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-600">{rec.excelRow}</td>
                      <td className="py-1.5 px-2.5">
                        <div className="font-semibold text-slate-800">{rec.rawTopicName}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          Cột P: <span className={rec.rawTopicCode?.startsWith("#") ? "text-rose-600 font-bold" : ""}>{rec.rawTopicCode}</span> → Chuẩn: <span className="text-teal-700 font-semibold">{rec.normalizedTopicCode}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <div className="font-semibold text-slate-800">{rec.rawLessonName}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          Cột Q: <span className={rec.rawLessonCode?.startsWith("#") ? "text-rose-600 font-bold" : ""}>{rec.rawLessonCode}</span> → Chuẩn: <span className="text-teal-700 font-semibold">{rec.normalizedLessonCode}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 font-mono font-bold text-teal-900">{rec.rawCriterionCode}</td>
                      <td className="py-1.5 px-2.5 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold mr-1">{rec.rawLevel}</span>
                        <span className={`px-1.5 py-0.5 rounded font-semibold ${
                          rec.hasLevelCompetencyMismatch ? "bg-amber-200 text-amber-900" : "bg-teal-50 text-teal-800"
                        }`}>
                          {rec.competencyGroup}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-600">
                        {rec.normalizedTopicId} → {rec.normalizedLessonId} → {rec.normalizedCriterionId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm bài học, chủ đề, mã tiêu chuẩn, yêu cầu cần đạt..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium tabular-nums">
          Hiển thị: <span className="font-bold text-slate-800">{filteredLessons.length}</span>/{allLessons.length} bài học Khối {activeGrade}
        </div>
      </div>

      {/* Lessons Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                <th className="py-2.5 px-3 w-14 text-center">{gradeConfig?.periodMinutes > 0 ? "Tiết" : "Bài"}</th>
                <th className="py-2.5 px-3.5 w-44">Chủ đề</th>
                <th className="py-2.5 px-3.5 w-52">Tên bài học</th>
                <th className="py-2.5 px-3.5 w-40 text-center">Tiêu chuẩn năng lực</th>
                <th className="py-2.5 px-3.5">Mục tiêu & Yêu cầu cần đạt</th>
                <th className="py-2.5 px-3 text-center w-20">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLessons.map((les: any) => {
                const isProject = les.isProject;
                const criteria = les.criteria || [];
                const hieuCount = criteria.filter((c: any) => (c.competencyGroup || "").toLowerCase().includes("hiểu") || (c.competencyGroup || "").toLowerCase().includes("hieu")).length;
                const bietCount = criteria.filter((c: any) => (c.competencyGroup || "").toLowerCase().includes("biết") || (c.competencyGroup || "").toLowerCase().includes("biet")).length;
                const vdCount = criteria.length - hieuCount - bietCount;

                return (
                  <tr
                    key={les.id}
                    className={`hover:bg-teal-50/40 transition-colors ${
                      isProject ? "bg-amber-50/20" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${
                        isProject 
                          ? "bg-amber-500 text-white font-extrabold shadow-2xs" 
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {les.periodIndex}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <span className="text-[11px] font-semibold text-teal-800 bg-teal-50/80 px-2 py-0.5 rounded border border-teal-100/60 inline-block line-clamp-1">
                        {les.topic?.name || "Chủ đề chung"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                        <span className="line-clamp-2">{les.lessonName}</span>
                        {isProject && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500 text-white rounded uppercase tracking-wider shrink-0">
                            Dự án
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          {criteria.length} tiêu chuẩn
                        </span>
                        {criteria.length > 0 && (
                          <div className="flex items-center gap-1 text-[9px] font-semibold">
                            {hieuCount > 0 && <span className="px-1 bg-blue-50 text-blue-700 border border-blue-200 rounded">H: {hieuCount}</span>}
                            {bietCount > 0 && <span className="px-1 bg-amber-50 text-amber-700 border border-amber-200 rounded">B: {bietCount}</span>}
                            {vdCount > 0 && <span className="px-1 bg-teal-50 text-teal-800 border border-teal-200 rounded">VD: {vdCount}</span>}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600 leading-relaxed">
                      <p className="line-clamp-2 text-[11px]">{les.objectives || les.requirements || "Chuẩn đầu ra theo khung chương trình"}</p>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSelectedLesson(les)}
                        className="p-1.5 rounded-lg hover:bg-teal-100 text-teal-700 transition-colors"
                        title="Xem toàn bộ tiêu chuẩn & nội dung"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detail of lesson with full criteria breakdown */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-100 space-y-3.5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase tracking-wider">
                  Tiết {selectedLesson.periodIndex} • Khối {selectedLesson.grade} • {activeCurriculum?.subject?.name}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedLesson.lessonName}
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Chủ đề: {selectedLesson.topic?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedLesson(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-teal-600" />
                  <span>Mục tiêu bài học</span>
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line text-[11px]">
                  {selectedLesson.objectives || "Chưa có nội dung"}
                </p>
              </div>

              {/* Full Criteria List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Danh sách {selectedLesson.criteria?.length || 0} Tiêu chuẩn năng lực đánh giá</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">Giữ nguyên chuẩn nguồn PPCT</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {(selectedLesson.criteria || []).map((crit: any, idx: number) => {
                    const comp = crit.competencyGroup || "Vận dụng";
                    const isHieu = comp.toLowerCase().includes("hiểu") || comp.toLowerCase().includes("hieu");
                    const isBiet = comp.toLowerCase().includes("biết") || comp.toLowerCase().includes("biet");
                    const badgeClass = isHieu 
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : isBiet
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-teal-50 text-teal-800 border-teal-200";

                    return (
                      <div key={crit.id || idx} className="p-3 hover:bg-slate-50/70 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-[11px] text-teal-900 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {crit.code}
                              </span>
                              {crit.programLevel && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {crit.programLevel}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeClass}`}>
                                {comp}
                              </span>
                            </div>
                            <p className="text-slate-700 text-xs leading-relaxed mt-1">
                              {crit.description}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0 text-[10px]">
                            <span className="text-slate-400">Rubric 3 mức:</span>
                            <div className="flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">Tốt</span>
                              <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-semibold">Đạt</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">CCG</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedLesson.criteria || selectedLesson.criteria.length === 0) && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      Chưa có tiêu chuẩn năng lực cho bài học này
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLesson(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#003B3A] text-white font-semibold hover:bg-[#002827] text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL (PREVIEW + VALIDATION + DEDUPLICATION + VERSIONING) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                  <span>Import Khung chương trình PPCT từ tệp Excel</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Tự động phân tích sheet KHỐI 4S, KHỐI 5S, kiểm tra tính hợp lệ và cập nhật phiên bản chính thức
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Upload File */}
            <div className="space-y-3">
              <div className="border-2 border-dashed border-teal-200 bg-teal-50/30 rounded-xl p-4 text-center hover:bg-teal-50/60 transition cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {importFile ? importFile.name : "Nhấp vào đây để chọn tệp PPCT Excel (.xlsx)"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Định dạng yêu cầu: Sheet KHỐI 4S, KHỐI 5S (có các cột: Chủ đề, Bài học, Mô tả, Mức, Mã tiêu chuẩn, Hiểu, Biết, Vận dụng)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Versioning and Target Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Phiên bản nạp (Versioning)
                  </label>
                  <input
                    type="text"
                    value={importVersionCode}
                    onChange={(e) => setImportVersionCode(e.target.value)}
                    placeholder="v1.0"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Mỗi khối chỉ duy trì 01 phiên bản chính thức trong năm học
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Khung chương trình đích
                  </label>
                  <div className="text-xs font-semibold text-teal-800 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300">
                    {activeCurriculum?.name || "Khung chương trình Giáo dục tài chính"}
                  </div>
                </div>
              </div>

              {/* Preview Table if file loaded */}
              {importLoading && (
                <div className="p-6 text-center text-slate-500">
                  <RefreshCcw className="w-5 h-5 animate-spin mx-auto text-teal-600 mb-2" />
                  <span>Đang phân tích và kiểm tra tính toàn vẹn dữ liệu...</span>
                </div>
              )}

              {previewData && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>Kết quả kiểm tra dữ liệu trước khi nạp (Preview & Validation)</span>
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      previewData.isValid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {previewData.isValid ? "Dữ liệu hợp lệ 100%" : "Có cảnh báo"}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="py-2 px-3">Chọn</th>
                          <th className="py-2 px-3">Sheet</th>
                          <th className="py-2 px-3 text-center">Khối</th>
                          <th className="py-2 px-3 text-center">Chủ đề</th>
                          <th className="py-2 px-3 text-center">Bài học</th>
                          <th className="py-2 px-3 text-center">Tiêu chuẩn</th>
                          <th className="py-2 px-3">Trạng thái kiểm tra</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(previewData.sheets || []).map((sheet: any) => {
                          const isSelected = importSelectedGrades.includes(sheet.grade);
                          return (
                            <tr key={sheet.sheetName} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setImportSelectedGrades([...importSelectedGrades, sheet.grade]);
                                    } else {
                                      setImportSelectedGrades(importSelectedGrades.filter(g => g !== sheet.grade));
                                    }
                                  }}
                                  className="rounded text-teal-600 focus:ring-teal-500"
                                />
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900">{sheet.sheetName}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                                  Khối {sheet.grade}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-semibold">{sheet.topicsCount}</td>
                              <td className="py-2 px-3 text-center font-semibold">{sheet.lessonsCount}</td>
                              <td className="py-2 px-3 text-center font-bold text-emerald-700">{sheet.criteriaCount}</td>
                              <td className="py-2 px-3">
                                {sheet.diffSummary?.isAdjustmentOnly ? (
                                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Điều chỉnh {sheet.diffSummary.changedCount}/{sheet.diffSummary.newTotal} năng lực</span>
                                  </span>
                                ) : sheet.hasErrors ? (
                                  <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>{sheet.errors[0]}</span>
                                  </span>
                                ) : sheet.warnings.length > 0 ? (
                                  <span className="text-[11px] font-semibold text-amber-600">
                                    {sheet.warnings.length} cảnh báo mã
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Đạt chuẩn PPCT</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Diff Detail Table for Classification Adjustment */}
                  {(previewData.sheets || []).map((sheet: any) => {
                    if (!sheet.diffSummary?.isAdjustmentOnly || sheet.diffSummary.changedCount === 0) return null;
                    return (
                      <div key={`diff-${sheet.sheetName}`} className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                                Đối chiếu phiên bản Khối {sheet.grade}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                Nhận diện {sheet.diffSummary.changedCount} tiêu chuẩn thay đổi phân loại năng lực
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Giữ nguyên mã môn, 3 chủ đề, 15 bài học và 55 tiêu chuẩn. Bảo toàn 100% dữ liệu đánh giá và liên kết bài học hiện có.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] shrink-0">
                            <div className="bg-white px-2 py-1 rounded-lg border border-amber-200 font-semibold text-slate-700">
                              Trước: <span className="text-blue-700">Biết ({sheet.diffSummary.oldDistribution?.Biết || 0})</span> • <span className="text-emerald-700">Hiểu ({sheet.diffSummary.oldDistribution?.Hiểu || 0})</span> • <span className="text-teal-800">Vận dụng ({sheet.diffSummary.oldDistribution?.["Vận dụng"] || 0})</span>
                            </div>
                            <span className="text-slate-400 font-bold">→</span>
                            <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-300 font-bold text-emerald-900">
                              Mới: <span className="text-blue-700">Biết ({sheet.diffSummary.newDistribution?.Biết || 0})</span> • <span className="text-emerald-700">Hiểu ({sheet.diffSummary.newDistribution?.Hiểu || 0})</span> • <span className="text-teal-800">Vận dụng ({sheet.diffSummary.newDistribution?.["Vận dụng"] || 0})</span>
                            </div>
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto border border-amber-200/90 rounded-lg bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-amber-100/90 backdrop-blur-xs text-[10px] font-bold text-amber-950 uppercase border-b border-amber-200">
                              <tr>
                                <th className="py-2 px-2.5 text-center w-10">STT</th>
                                <th className="py-2 px-3 w-36">Mã tiêu chuẩn</th>
                                <th className="py-2 px-2 text-center w-16">Mức</th>
                                <th className="py-2 px-3 w-28 text-center">Phân loại cũ</th>
                                <th className="py-2 px-1 text-center w-6"></th>
                                <th className="py-2 px-3 w-28 text-center">Phân loại mới</th>
                                <th className="py-2 px-3">Mô tả tiêu chuẩn</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px]">
                              {sheet.diffSummary.changedCriteria.map((item: any, idx: number) => {
                                const oldBadge = item.oldCompetency === "Hiểu" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : item.oldCompetency === "Biết" ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-teal-50 text-teal-800 border-teal-200";

                                const newBadge = item.newCompetency === "Hiểu" ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold"
                                  : item.newCompetency === "Biết" ? "bg-blue-100 text-blue-900 border-blue-300 font-bold"
                                  : "bg-teal-50 text-teal-800 border-teal-400 font-bold";

                                return (
                                  <tr key={item.code} className="hover:bg-amber-50/50">
                                    <td className="py-1.5 px-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{item.code}</td>
                                    <td className="py-1.5 px-2 text-center">
                                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                        {item.programLevel || "Mức 1"}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-3 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${oldBadge}`}>
                                        {item.oldCompetency}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-1 text-center font-bold text-amber-600">→</td>
                                    <td className="py-1.5 px-3 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${newBadge}`}>
                                        {item.newCompetency}
                                      </span>
                                    </td>
                                    <td className="py-1.5 px-3 text-slate-700 leading-tight">
                                      {item.description}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Tự động đồng bộ CSDL kép (Local SQLite & Turso Cloud) • Lưu nhật ký phiên bản & người duyệt
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={!previewData || importLoading || importSelectedGrades.length === 0}
                  onClick={() => handleCommitImport()}
                  className="px-4 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  {importLoading ? (
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {previewData?.sheets?.some((s: any) => s.diffSummary?.isAdjustmentOnly)
                      ? "Xác nhận Phê duyệt & Cập nhật phân loại (29 tiêu chuẩn)"
                      : "Xác nhận Nạp vào Hệ thống"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
