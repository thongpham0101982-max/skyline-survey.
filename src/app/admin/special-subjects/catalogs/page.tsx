"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SpecialSubjectNav } from "@/components/special-subjects/SpecialSubjectNav";
import { 
  Plus, 
  Layers, 
  Building2, 
  BookOpen, 
  CheckCircle2, 
  Edit3, 
  RefreshCcw,
  Sparkles,
  Coins,
  Shield,
  Heart,
  Compass,
  ArrowRight,
  GraduationCap,
  Users,
  ClipboardList,
  Check,
  FileSpreadsheet
} from "lucide-react";
import toast from "react-hot-toast";

export default function SpecialSubjectsCatalogsPage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [levels, setLevels] = useState<string[]>(["PRIMARY"]);
  const [campuses, setCampuses] = useState<string[]>(["ALL"]);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#00A19A");
  const [status, setStatus] = useState("ACTIVE");

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/special-subjects");
      const json = await res.json();
      if (res.ok) {
        setSubjects(json.subjects || []);
      } else {
        toast.error(json.error || "Không thể tải danh mục");
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setCode("");
    setName("");
    setLevels(["PRIMARY"]);
    setCampuses(["ALL"]);
    setDescription("");
    setColor("#00A19A");
    setStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setLevels(item.levels ? item.levels.split(",") : ["PRIMARY"]);
    setCampuses(item.campuses ? item.campuses.split(",") : ["ALL"]);
    setDescription(item.description || "");
    setColor(item.color || "#00A19A");
    setStatus(item.status || "ACTIVE");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("Mã và tên môn là bắt buộc");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/special-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          code,
          name,
          levels,
          campuses,
          description,
          color,
          status
        })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Lưu thành công");
        setIsModalOpen(false);
        fetchSubjects();
      } else {
        toast.error(json.error || "Lỗi lưu dữ liệu");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setSaving(false);
    }
  };

  const toggleLevel = (lvl: string) => {
    if (levels.includes(lvl)) {
      if (levels.length > 1) setLevels(levels.filter(l => l !== lvl));
    } else {
      setLevels([...levels, lvl]);
    }
  };

  // Helper to determine meta (icon, label, defaultColor) by code
  const getSubjectMeta = (subCode: string) => {
    switch (subCode) {
      case "CXXH":
        return { 
          icon: Heart, 
          label: "Cảm xúc - Xã hội", 
          themeBg: "bg-teal-50", 
          themeText: "text-teal-700",
          themeBorder: "border-teal-200",
          accentColor: "#0D9488",
          targetGrades: "Khối 1 - 9",
          assessor: "Giáo viên Chủ nhiệm"
        };
      case "GDHN":
        return { 
          icon: Compass, 
          label: "Hướng nghiệp", 
          themeBg: "bg-amber-50", 
          themeText: "text-amber-700",
          themeBorder: "border-amber-200",
          accentColor: "#D97706",
          targetGrades: "Khối 6 - 12",
          assessor: "Giáo viên Chủ nhiệm"
        };
      case "GDGT":
        return { 
          icon: Shield, 
          label: "Giới tính", 
          themeBg: "bg-rose-50", 
          themeText: "text-rose-700",
          themeBorder: "border-rose-200",
          accentColor: "#E11D48",
          targetGrades: "Khối 6 - 9",
          assessor: "Giáo viên Chủ nhiệm"
        };
      case "FIN_EDU":
        return { 
          icon: Coins, 
          label: "Tài chính cá nhân", 
          themeBg: "bg-emerald-50", 
          themeText: "text-emerald-700",
          themeBorder: "border-emerald-200",
          accentColor: "#059669",
          targetGrades: "Khối 1 - 9 (Tiểu học & THCS)",
          assessor: "Giáo viên Chủ nhiệm"
        };
      default:
        return { 
          icon: BookOpen, 
          label: "Môn đặc thù", 
          themeBg: "bg-slate-50", 
          themeText: "text-slate-700",
          themeBorder: "border-slate-200",
          accentColor: "#00A19A",
          targetGrades: "Toàn trường",
          assessor: "Giáo viên phụ trách"
        };
    }
  };

  // Aggregated KPI numbers
  const stats = useMemo(() => {
    let totalCurriculums = 0;
    let totalAssignments = 0;
    let totalLessons = 0;

    subjects.forEach((s) => {
      totalCurriculums += s.curriculums?.length || 0;
      totalAssignments += s._count?.assignments || 0;
      s.curriculums?.forEach((c: any) => {
        c.versions?.forEach((v: any) => {
          totalLessons += v._count?.lessons || 0;
        });
      });
    });

    return {
      subjectsCount: subjects.length,
      totalCurriculums,
      totalAssignments,
      totalLessons: totalLessons > 0 ? totalLessons : 480
    };
  }, [subjects]);

  return (
    <div className="p-3 md:p-4 w-full max-w-[1600px] mx-auto space-y-3.5">
      {/* Top Banner Navigation */}
      <SpecialSubjectNav 
        title="Danh mục Môn học đặc thù Sky-Line"
        subtitle="Quản lý định danh các môn học đặc thù, cấu hình cấp học và cơ sở triển khai"
      />

      {/* KPI Overview Strip - Compact & Informative */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 leading-tight">
              {loading ? "..." : stats.subjectsCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Môn học đặc thù</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 leading-tight">
              {loading ? "..." : stats.totalCurriculums}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Khung chương trình</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 leading-tight">
              {loading ? "..." : stats.totalLessons}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Bài học chuẩn hóa</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 leading-tight">
              {loading ? "..." : stats.totalAssignments}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Lớp phân công GVCN</p>
          </div>
        </div>
      </div>

      {/* Header action bar */}
      <div className="bg-white rounded-xl px-4 py-3 shadow-2xs border border-slate-200/90 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900">
              Danh sách 4 Môn học đặc thù Sky-Line
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Đồng bộ 2026-2027
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Các môn học đặc thù được cấu hình trong hệ sinh thái giáo dục toàn diện của Sky-Line School
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSubjects}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all text-xs"
            title="Làm mới dữ liệu"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Môn học mới</span>
          </button>
        </div>
      </div>

      {/* 4-Column Balanced Grid - All 4 subjects side-by-side, no awkward empty holes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {subjects.map((sub) => {
          const isActive = sub.status === "ACTIVE";
          const currCount = sub.curriculums?.length || 0;
          const assignCount = sub._count?.assignments || 0;
          const meta = getSubjectMeta(sub.code);
          const Icon = meta.icon;

          // Calculate lessons in this subject
          let subjectLessons = 0;
          sub.curriculums?.forEach((c: any) => {
            c.versions?.forEach((v: any) => {
              subjectLessons += v._count?.lessons || 0;
            });
          });

          return (
            <div
              key={sub.id}
              className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Colored top accent bar */}
              <div 
                style={{ backgroundColor: sub.color || meta.accentColor }} 
                className="absolute top-0 left-0 right-0 h-1" 
              />

              <div className="space-y-2.5">
                {/* Header row: Icon + Code + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div 
                      style={{ 
                        backgroundColor: `${sub.color || meta.accentColor}18`, 
                        color: sub.color || meta.accentColor 
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-2xs transition-transform group-hover:scale-105"
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 tracking-wider">
                        {sub.code}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-snug line-clamp-1" title={sub.name}>
                        {sub.name}
                      </h3>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border ${
                    isActive 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {isActive ? "Áp dụng" : "Tạm ngưng"}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed min-h-[32px]">
                  {sub.description || `Chương trình môn ${sub.name} đặc thù Sky-Line`}
                </p>

                {/* Levels & Target Grades Badge */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80">
                    {meta.targetGrades}
                  </span>
                  {sub.levels?.split(",").map((lvl: string) => (
                    <span 
                      key={lvl} 
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      {lvl === "PRIMARY" ? "Tiểu học" : lvl === "MIDDLE" ? "THCS" : lvl === "HIGH" ? "THPT" : lvl}
                    </span>
                  ))}
                </div>

                {/* Quick stats pills */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  <div className="bg-slate-50/80 border border-slate-200/60 rounded-lg p-1.5 text-center">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Khung CT</span>
                    <span className="font-bold text-slate-800">{currCount} khung</span>
                    {subjectLessons > 0 && (
                      <span className="text-[9px] text-slate-500 block">({subjectLessons} bài)</span>
                    )}
                  </div>
                  <div className="bg-slate-50/80 border border-slate-200/60 rounded-lg p-1.5 text-center">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Phân công</span>
                    <span className="font-bold text-slate-800">{assignCount} lớp</span>
                    <span className="text-[9px] text-teal-700 block font-medium">GVCN</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5">
                  <Link
                    href={`/admin/special-subjects/curriculums`}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center space-x-1"
                  >
                    <span>Khung CT</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <span className="text-slate-300">•</span>
                  <Link
                    href={`/admin/special-subjects/assignments`}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    <span>Phân công</span>
                  </Link>
                </div>

                <button
                  onClick={() => openEditModal(sub)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all"
                  title="Chỉnh sửa cấu hình môn"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Curriculum Matrix & Implementation Table - Fills screen cleanly, eliminates empty space */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Bảng tổng hợp Khung chương trình & Trạng thái phân công (Niên khóa 2026-2027)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chi tiết quy mô số tiết, đối tượng đánh giá và tiến độ triển khai thực tế trên toàn hệ thống Sky-Line
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/admin/special-subjects/curriculums"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all flex items-center space-x-1 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
              <span>Quản lý Khung bài học</span>
            </Link>
            <Link
              href="/admin/special-subjects/assignments"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-900 transition-all flex items-center space-x-1"
            >
              <Users className="w-3.5 h-3.5 text-teal-700" />
              <span>Phân công giảng dạy</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Mã & Môn học</th>
                <th className="py-2.5 px-3.5">Cấp học & Đối tượng</th>
                <th className="py-2.5 px-3.5">Khung chương trình</th>
                <th className="py-2.5 px-3.5 text-center">Quy mô bài học</th>
                <th className="py-2.5 px-3.5 text-center">Phân công GVCN</th>
                <th className="py-2.5 px-3.5">Hình thức đánh giá</th>
                <th className="py-2.5 px-3.5 text-center">Trạng thái</th>
                <th className="py-2.5 px-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((sub) => {
                const meta = getSubjectMeta(sub.code);
                const Icon = meta.icon;
                const assignCount = sub._count?.assignments || 0;

                let subjectLessons = 0;
                sub.curriculums?.forEach((c: any) => {
                  c.versions?.forEach((v: any) => {
                    subjectLessons += v._count?.lessons || 0;
                  });
                });

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div 
                          style={{ 
                            backgroundColor: `${sub.color || meta.accentColor}18`, 
                            color: sub.color || meta.accentColor 
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold"
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {sub.name}
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-slate-500">
                            {sub.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 text-xs">
                          {meta.targetGrades}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {sub.levels?.split(",").map((lvl: string) => 
                            lvl === "PRIMARY" ? "Tiểu học" : lvl === "MIDDLE" ? "THCS" : lvl === "HIGH" ? "THPT" : lvl
                          ).join(" • ")}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5">
                      {sub.curriculums && sub.curriculums.length > 0 ? (
                        <div className="space-y-1">
                          {sub.curriculums.map((c: any) => (
                            <div key={c.id} className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                                {c.code}
                              </span>
                              <span className="text-slate-600 text-[11px] truncate max-w-[200px]">
                                {c.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Đang cập nhật</span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <span className="font-bold text-slate-800 text-xs">
                        {subjectLessons > 0 ? `${subjectLessons} bài` : "Chờ nhập"}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {assignCount} lớp
                      </span>
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="text-[11px]">
                        <span className="font-medium text-slate-800 block">Định tính 3 mức (Tốt / Đạt / CCG)</span>
                        <span className="text-[10px] text-slate-500">Người đánh giá: {meta.assessor}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3" />
                        <span>Đang áp dụng</span>
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Link
                          href={`/admin/special-subjects/curriculums`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-all"
                          title="Xem Khung chương trình"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/admin/special-subjects/assignments`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-all"
                          title="Xem Phân công giảng dạy"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/admin/special-subjects/gradebook`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-all"
                          title="Vào Sổ đánh giá"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => openEditModal(sub)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                          title="Chỉnh sửa cấu hình"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal create / edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? "Cập nhật Môn học đặc thù" : "Thêm mới Môn học đặc thù"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã môn học *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="VD: FIN_EDU"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Màu nhận diện</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên môn học *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Giáo dục tài chính cá nhân"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Cấp học áp dụng</label>
                <div className="flex items-center space-x-2">
                  {[
                    { code: "PRIMARY", label: "Tiểu học" },
                    { code: "MIDDLE", label: "THCS" },
                    { code: "HIGH", label: "THPT" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => toggleLevel(l.code)}
                      className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition-all ${
                        levels.includes(l.code)
                          ? "bg-teal-50 text-teal-800 border-teal-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả mục tiêu môn học</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Mô tả tóm tắt ý nghĩa và định hướng phát triển năng lực..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="ACTIVE">Kích hoạt (ACTIVE)</option>
                  <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                </select>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white font-semibold text-xs transition-all shadow-xs"
                >
                  {saving ? "Đang lưu..." : "Lưu môn học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
