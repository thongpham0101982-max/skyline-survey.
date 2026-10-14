"use client";
import React, { useState, useEffect } from "react";
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
  Info
} from "lucide-react";
import toast from "react-hot-toast";

export default function SpecialSubjectsCurriculumsPage() {
  const [loading, setLoading] = useState(true);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>("");
  const [activeGrade, setActiveGrade] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

  const fetchCurriculums = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/special-subjects/curriculums");
      const json = await res.json();
      if (res.ok) {
        const currs = json.curriculums || [];
        setCurriculums(currs);
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
  const gradeConfig = activeVersion?.gradeConfigs?.find((gc: any) => gc.grade === activeGrade);
  const allLessons = activeVersion?.lessons?.filter((l: any) => l.grade === activeGrade) || [];

  const filteredLessons = allLessons.filter((l: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.lessonName?.toLowerCase().includes(term) ||
      l.topic?.name?.toLowerCase().includes(term) ||
      l.objectives?.toLowerCase().includes(term) ||
      l.expectedProduct?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <SpecialSubjectNav 
        title="Quản lý Khung chương trình Môn đặc thù"
        subtitle="Chi tiết 75 tiết học, chủ đề, mục tiêu, yêu cầu cần đạt và sản phẩm kỳ vọng"
      />

      {/* Curriculum & Version selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Khung chương trình
            </label>
            <select
              value={selectedCurriculumId}
              onChange={(e) => setSelectedCurriculumId(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {curriculums.map(c => (
                <option key={c.id} value={c.id}>
                  {c.subject?.name} ({c.level === "PRIMARY" ? "Tiểu học" : c.level === "MIDDLE" ? "THCS" : "THPT"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Phiên bản chương trình
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-3 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
                {activeVersion?.versionCode || "v1.0"} (Niên khóa 2026-2027)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {activeVersion?.status || "PUBLISHED"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchCurriculums}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
          title="Làm mới"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Grade Selector Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {["1", "2", "3", "4", "5"].map((g) => {
          const isActive = activeGrade === g;
          return (
            <button
              key={g}
              onClick={() => {
                setActiveGrade(g);
                setSelectedLesson(null);
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                isActive
                  ? "bg-[#003B3A] text-white shadow-md shadow-[#003B3A]/20 scale-102"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <span>Khối {g}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                15 tiết
              </span>
            </button>
          );
        })}

        {/* Placeholder indicators for THCS / THPT */}
        <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
          <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-200/50 cursor-not-allowed">
            THCS (Khối 6-9) - Chờ khung
          </span>
          <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-200/50 cursor-not-allowed">
            THPT (Khối 10-12) - Chờ khung
          </span>
        </div>
      </div>

      {/* Grade Overview Summary Card */}
      {gradeConfig && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-teal-800 uppercase tracking-wider">
                Mục tiêu tổng thể Khối {activeGrade}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-teal-100/80 text-teal-800 rounded font-semibold">
                Thời lượng: 15 tiết × 35 phút
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-4xl">
              {gradeConfig.overallGoal}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Thang đánh giá</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">Định tính 3 mức (Tốt / Đạt / CCG)</div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm bài học, chủ đề, mục tiêu, sản phẩm..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Hiển thị: <span className="font-bold text-slate-800">{filteredLessons.length}</span>/15 tiết học
        </div>
      </div>

      {/* Lessons Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-16 text-center">Tiết</th>
                <th className="py-3 px-4 w-44">Chủ đề</th>
                <th className="py-3 px-4 w-56">Tên bài học</th>
                <th className="py-3 px-4">Yêu cầu cần đạt & Mục tiêu</th>
                <th className="py-3 px-4 w-52">Sản phẩm kỳ vọng</th>
                <th className="py-3 px-3 text-center w-24">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLessons.map((les: any) => {
                const isProject = les.isProject;
                return (
                  <tr
                    key={les.id}
                    className={`hover:bg-teal-50/40 transition-colors ${
                      isProject ? "bg-amber-50/20" : ""
                    }`}
                  >
                    <td className="py-3 px-3.5 text-center font-bold">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                        isProject 
                          ? "bg-amber-500 text-white font-extrabold shadow-xs" 
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {les.periodIndex}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-teal-800 bg-teal-50/80 px-2 py-0.5 rounded border border-teal-100/60 inline-block">
                        {les.topic?.name || "Chủ đề chung"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                        <span>{les.lessonName}</span>
                        {isProject && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-amber-500 text-white rounded uppercase tracking-wider">
                            Dự án
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 leading-relaxed">
                      <p className="line-clamp-2">{les.objectives || les.requirements}</p>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div className="flex items-start space-x-1.5">
                        <Package className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-[11px]">{les.expectedProduct || "—"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedLesson(les)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-teal-700 transition-colors"
                        title="Xem toàn bộ nội dung"
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

      {/* Modal / Slide-over detail of lesson */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 uppercase tracking-wider">
                  Tiết {selectedLesson.periodIndex} • Khối {selectedLesson.grade}
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
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <Target className="w-3.5 h-3.5 text-teal-600" />
                  <span>Mục tiêu bài học</span>
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedLesson.objectives || "Chưa có nội dung"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Yêu cầu cần đạt (YCCĐ)</span>
                </h4>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedLesson.requirements || "Chưa có nội dung"}
                </p>
              </div>

              {selectedLesson.mainActivities && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hoạt động chính</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedLesson.mainActivities}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                <h4 className="font-bold text-teal-900 text-[11px] uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-teal-700" />
                  <span>Sản phẩm kỳ vọng</span>
                </h4>
                <p className="text-teal-900 font-semibold leading-relaxed">
                  {selectedLesson.expectedProduct || "Chưa có mô tả sản phẩm"}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLesson(null)}
                className="px-4 py-2 rounded-xl bg-[#003B3A] text-white font-semibold hover:bg-[#002827]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
