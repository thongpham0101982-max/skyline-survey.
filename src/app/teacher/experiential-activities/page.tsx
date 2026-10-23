"use client";
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Calendar, Users, ChevronRight, Activity, Trash2, Edit3,
  Tag, CheckCircle2, Clock, List, LayoutGrid, Sparkles, Filter, FileCheck,
  Layers, ArrowUpRight, CheckCircle, BarChart3, RefreshCw, X, Eye,
  Building2, GraduationCap, Shield, Leaf, User, BookOpen, Send, MapPin,
  Award, AlertCircle, Compass, Check, ChevronDown, Flame, FileText,
  Sliders, Info, HelpCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { SKYLINE_ACTIVITY_TYPES, STANDARD_STUDENT_ROLES_6 } from "@/lib/experiential/constants";
import { DEFAULT_EDUCATIONAL_THEMES, getEducationalThemeInfo } from "@/lib/experiential/catalog-types";
import { formatTimeFrameAndSemester } from "@/lib/experiential/timeframe-helper";

// Gợi ý hoạt động tiêu biểu bám sát 6 trụ cột cốt lõi
const SAMPLE_PRESETS = [
  {
    name: "Tham quan & Trải nghiệm Làng nghề truyền thống",
    themeName: "Văn hóa – Truyền thống",
    educationalContent: "Tìm hiểu phong tục tập quán, quy trình làm gốm thủ công, bảo tồn giá trị di sản văn hóa dân tộc và viết bài thu hoạch trải nghiệm.",
    integratedSubjects: "Lịch sử & Địa lí, Mỹ thuật, Tiếng Việt",
    location: "Làng gốm Thanh Hà, Hội An",
    leadTeacherName: "TCM Khoa học Xã hội",
    activityTypeId: "THAM_QUAN",
    evalMode: "ROLE_BASED"
  },
  {
    name: "Dự án STEM: Tái chế rác thải & Năng lượng xanh",
    themeName: "Khoa học – STEM",
    educationalContent: "Nghiên cứu nguyên lý tái chế rác thải, thiết kế mô hình năng lượng sạch và thuyết trình sản phẩm bảo vệ môi trường trường học.",
    integratedSubjects: "Khoa học Tự nhiên, Tin học, Công nghệ",
    location: "Phòng Lab STEM / Sân trường",
    leadTeacherName: "TCM Khoa học Tự nhiên",
    activityTypeId: "STEM",
    evalMode: "CRITERIA"
  },
  {
    name: "Sinh hoạt lớp chủ điểm: Xây dựng tình bạn đẹp - Nói không với bạo lực học đường",
    themeName: "Kỹ năng sống – Xã hội",
    educationalContent: "Rèn luyện kỹ năng giao tiếp, quản lý cảm xúc, văn hóa ứng xử học đường và phòng chống bạo lực.",
    integratedSubjects: "GDCD / GD Kinh tế & Pháp luật, Ngữ văn",
    location: "Tại lớp học",
    leadTeacherName: "GVCN & TCM Xã hội",
    activityTypeId: "KY_NANG",
    evalMode: "ROLE_BASED"
  },
  {
    name: "Hoạt động thiện nguyện: Trao yêu thương - Sẻ chia nụ cười",
    themeName: "Phẩm chất – Giá trị sống",
    educationalContent: "Nuôi dưỡng lòng trắc ẩn, sự đồng cảm và tinh thần tương thân tương ái, trách nhiệm với cộng đồng.",
    integratedSubjects: "GDCD, Âm nhạc, Mỹ thuật",
    location: "Trung tâm bảo trợ xã hội",
    leadTeacherName: "Ban CTHS & GVCN",
    activityTypeId: "THIEN_QUYEN",
    evalMode: "ROLE_BASED"
  },
  {
    name: "Hội chợ Hướng nghiệp & Trải nghiệm một ngày làm nghề",
    themeName: "Hướng nghiệp – Tài chính",
    educationalContent: "Nhận biết năng khiếu bản thân, khám phá các nhóm nghề và lập kế hoạch rèn luyện định hướng tương lai.",
    integratedSubjects: "Kinh tế & Pháp luật, Công nghệ, Tiếng Anh",
    location: "Hội trường trường",
    leadTeacherName: "TCM Ngoại ngữ & Xã hội",
    activityTypeId: "HUONG_NGHIEP_TYPE",
    evalMode: "ROLE_BASED"
  },
  {
    name: "Hội trại Rèn luyện Kỹ năng sống & Tự lập",
    themeName: "Sức khỏe – Thể chất",
    educationalContent: "Kỹ năng sinh tồn, làm việc nhóm, dựng lều trại, rèn luyện thể lực và tác phong kỷ luật cá nhân.",
    integratedSubjects: "Giáo dục Thể chất, GDQP-AN",
    location: "Khu dã ngoại / Sân vận động",
    leadTeacherName: "TCM Thể chất - GDQP",
    activityTypeId: "KY_NANG",
    evalMode: "ROLE_BASED"
  }
];

export default function TeacherExperientialActivitiesPage() {
  const router = useRouter();

  // Data States
  const [activities, setActivities] = useState<any[]>([]);
  const [rawActivities, setRawActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [educationalThemes, setEducationalThemes] = useState(DEFAULT_EDUCATIONAL_THEMES);

  // Filter States
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("ALL");
  const [semesterFilter, setSemesterFilter] = useState<'ALL' | '1' | '2'>('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'NEED_INPUT' | 'COMPLETED' | 'MY_CREATED'>('ALL');
  const [selectedTheme, setSelectedTheme] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSource, setCreateSource] = useState<'CATALOG' | 'CUSTOM'>('CATALOG');
  const [catalogActivities, setCatalogActivities] = useState<any[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [catalogMonthFilter, setCatalogMonthFilter] = useState<string>('ALL');

  const [createForm, setCreateForm] = useState({
    name: "",
    catalogId: "",
    classId: "",
    themeName: "Văn hóa – Truyền thống",
    educationalContent: "",
    integratedSubjects: "",
    location: "Theo kế hoạch của lớp",
    leadTeacherName: "",
    evalMode: "ROLE_BASED",
    activityTypeId: "THAM_QUAN",
    semester: 1,
    timeRange: "Học kỳ 1",
    description: "",
    objectives: "",
    criteria: []
  });

  const loadCatalogsForTeacher = useCallback(async () => {
    try {
      setLoadingCatalogs(true);
      const res = await fetch('/api/admin/experiential-activities/catalogs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCatalogActivities(data);
        }
      }
    } catch (e) {
      console.error('Error fetching catalogs for teacher:', e);
    } finally {
      setLoadingCatalogs(false);
    }
  }, []);

  // 1. Initial Load: Academic Years, Teacher Classes & Educational Themes
  useEffect(() => {
    Promise.all([
      fetch("/api/academic-years").then(r => r.json()).catch(() => []),
      fetch("/api/classes?scope=my_teaching_classes").then(r => r.json()).catch(() => []),
      fetch("/api/admin/experiential-activities/catalogs/themes").then(r => r.json()).catch(() => [])
    ]).then(([years, classesData, themesData]) => {
      if (Array.isArray(years) && years.length > 0) {
        setAcademicYears(years);
        const active = years.find((y: any) => y.status === "ACTIVE" && !y.isOff) || years[0];
        setSelectedYearId(active?.id || "");
      }

      if (Array.isArray(classesData) && classesData.length > 0) {
        setMyClasses(classesData);
        // Default to first homeroom class if available
        const firstHomeroom = classesData.find((c: any) => c.isHomeroom || c.roleInClass === "GVCN");
        if (firstHomeroom) {
          setSelectedClassId(firstHomeroom.id);
          setCreateForm(prev => ({ ...prev, classId: firstHomeroom.id }));
        } else {
          setSelectedClassId(classesData[0].id);
          setCreateForm(prev => ({ ...prev, classId: classesData[0].id }));
        }
      }

      if (Array.isArray(themesData) && themesData.length > 0) {
        setEducationalThemes(themesData);
      }
    });
  }, []);

  // 2. Load Activities Strictly for Teacher
  const loadActivities = useCallback(async () => {
    if (!selectedYearId) return;
    setLoading(true);

    try {
      const url = new URL("/api/experiential-activities", window.location.origin);
      url.searchParams.set("forTeacher", "true");
      url.searchParams.set("academicYearId", selectedYearId);
      if (selectedClassId && selectedClassId !== "ALL") {
        url.searchParams.set("classId", selectedClassId);
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRawActivities(list);
    } catch (err) {
      console.error("Lỗi khi tải hoạt động trải nghiệm:", err);
      toast.error("Không thể tải danh sách hoạt động");
      setRawActivities([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, selectedClassId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // 3. Client Filter & Search
  useEffect(() => {
    let filtered = [...rawActivities];

    // Filter by Semester
    if (semesterFilter !== 'ALL') {
      filtered = filtered.filter(a => String(a.semester) === String(semesterFilter));
    }

    // Filter by Educational Theme (Chủ đề giáo dục)
    if (selectedTheme !== 'ALL') {
      filtered = filtered.filter(a => a.themeName === selectedTheme);
    }

    // Filter by Status Tab
    if (statusTab === 'NEED_INPUT') {
      filtered = filtered.filter(a => {
        const pct = a.myClassProgress?.percent ?? 0;
        return pct < 100 && a.status !== 'COMPLETED';
      });
    } else if (statusTab === 'COMPLETED') {
      filtered = filtered.filter(a => {
        const pct = a.myClassProgress?.percent ?? 0;
        return pct === 100 || a.status === 'COMPLETED';
      });
    } else if (statusTab === 'MY_CREATED') {
      filtered = filtered.filter(a => a.isMyCreated);
    }

    // Search by Name / Code / Theme / Location / Coop subjects / Teacher
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(a =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.code && a.code.toLowerCase().includes(q)) ||
        (a.activityTypeName && a.activityTypeName.toLowerCase().includes(q)) ||
        (a.themeName && a.themeName.toLowerCase().includes(q)) ||
        (a.location && a.location.toLowerCase().includes(q)) ||
        (a.coopSubjectNames && a.coopSubjectNames.toLowerCase().includes(q)) ||
        (a.leadTeacherName && a.leadTeacherName.toLowerCase().includes(q)) ||
        (a.educationalContent && a.educationalContent.toLowerCase().includes(q))
      );
    }

    setActivities(filtered);
  }, [rawActivities, semesterFilter, selectedTheme, statusTab, search]);

  // 4. KPI Calculations for Teacher
  const stats = useMemo(() => {
    const total = rawActivities.length;
    let needInput = 0;
    let completed = 0;
    let myCreated = 0;
    let totalEvaluatedStudents = 0;
    let totalClassStudents = 0;

    rawActivities.forEach(a => {
      const p = a.myClassProgress;
      const pct = p?.percent ?? 0;
      if (pct === 100 || a.status === 'COMPLETED') {
        completed += 1;
      } else {
        needInput += 1;
      }
      if (a.isMyCreated) myCreated += 1;
      totalEvaluatedStudents += (p?.evaluatedStudents || 0);
      totalClassStudents += (p?.totalStudents || 0);
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      needInput,
      completed,
      myCreated,
      totalEvaluatedStudents,
      totalClassStudents,
      completionRate
    };
  }, [rawActivities]);

  // 5. Create Activity Handler for Homeroom Teacher
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Vui lòng nhập tên hoạt động trải nghiệm");
      return;
    }

    const targetClass = myClasses.find(c => c.id === createForm.classId) || myClasses[0];
    if (!targetClass) {
      toast.error("Vui lòng chọn lớp phụ trách");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        catalogId: createForm.catalogId || undefined,
        academicYearId: selectedYearId,
        educationLevel: targetClass.level || "PHO_THONG",
        grades: [targetClass.grade || "7"],
        themeName: createForm.themeName,
        educationalContent: createForm.educationalContent || createForm.description || "Nội dung giáo dục hoạt động trải nghiệm",
        description: createForm.educationalContent || createForm.description || `Hoạt động trải nghiệm của lớp ${targetClass.className}`,
        integratedSubjects: createForm.integratedSubjects,
        location: createForm.location || "Theo kế hoạch của lớp",
        leadTeacherName: createForm.leadTeacherName,
        evalMode: createForm.evalMode || "ROLE_BASED",
        criteria: createForm.criteria || [],
        activityTypeId: createForm.activityTypeId,
        activityTypeName: SKYLINE_ACTIVITY_TYPES.find(t => t.id === createForm.activityTypeId)?.name || "Hoạt động trải nghiệm",
        scale: "LOP",
        semester: Number(createForm.semester) || 1,
        timeRange: createForm.timeRange || `Học kỳ ${createForm.semester}`,
        objectives: createForm.objectives || createForm.educationalContent || "Rèn luyện phẩm chất và năng lực học sinh qua hoạt động thực tế",
        status: "ASSIGNED",
        assignedClasses: [
          {
            classId: targetClass.id,
            className: targetClass.className,
            grade: targetClass.grade,
            level: targetClass.level,
            campusId: targetClass.campusId,
            campusCode: targetClass.campus?.campusCode || "CS",
            subjectTeacherName: createForm.leadTeacherName,
            status: "DRAFT",
            totalStudents: targetClass._count?.students || 0,
            evaluatedStudents: 0
          }
        ]
      };

      const res = await fetch("/api/experiential-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Lỗi khi tạo hoạt động");
      }

      const created = await res.json();
      toast.success("Đã thêm hoạt động cho lớp thành công! Đang chuyển đến bảng đánh giá vai trò học sinh...");
      setShowCreateModal(false);
      
      // Reset form
      setCreateForm(prev => ({
        ...prev,
        name: "",
        catalogId: "",
        themeName: "Văn hóa – Truyền thống",
        educationalContent: "",
        integratedSubjects: "",
        location: "Theo kế hoạch của lớp",
        leadTeacherName: "",
        evalMode: "ROLE_BASED",
        description: "",
        objectives: "",
        criteria: []
      }));
      setSelectedCatalogId("");

      // Reload list and redirect teacher to result input page
      await loadActivities();

      if (created?.id) {
        router.push(`/teacher/experiential-activities/${created.id}?classId=${targetClass.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể tạo hoạt động");
    } finally {
      setCreating(false);
    }
  };

  // 6. Delete My Activity Handler
  const handleDeleteActivity = async (e: React.MouseEvent, act: any) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc muốn xóa hoạt động "${act.name}"?`)) return;

    try {
      const res = await fetch(`/api/experiential-activities/${act.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Đã xóa hoạt động thành công");
        loadActivities();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Không thể xóa hoạt động này");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa");
    }
  };

  // Helper Theme & Eval Mode Badges
  const getThemeBadge = (themeName?: string) => {
    const info = getEducationalThemeInfo(themeName);
    if (info) {
      return {
        name: info.name,
        badgeCls: info.badgeCls,
        borderCls: info.borderCls,
        tagColor: info.tagColor
      };
    }
    return {
      name: themeName || "Chủ đề giáo dục",
      badgeCls: "bg-teal-50 text-teal-800 border-teal-200/80",
      borderCls: "border-teal-400",
      tagColor: "#00A19A"
    };
  };

  const getEvalModeBadge = (mode?: string) => {
    if (mode === "CRITERIA") return { label: "Rubric 4 mức", cls: "bg-blue-50 text-blue-700 border-blue-200" };
    if (mode === "ROLE_BASED") return { label: "Theo vai trò", cls: "bg-purple-50 text-purple-700 border-purple-200" };
    if (mode === "PARTICIPATION_ONLY") return { label: "Điểm danh", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    return { label: "Theo vai trò", cls: "bg-teal-50 text-teal-700 border-teal-200" };
  };

  const getStrandInfo = (strandId: string) => {
    return {
      name: "Trải nghiệm",
      badgeColor: "bg-teal-50 text-[#00A19A] border-teal-200",
      dotColor: "bg-[#00A19A]"
    };
  };

  const getTargetClassLabel = (act: any) => {
    if (act.myClassProgress?.className) return act.myClassProgress.className;
    if (act.myAssignedClass?.className) return act.myAssignedClass.className;
    if (act.assignedClasses && act.assignedClasses.length > 0) {
      return act.assignedClasses.map((c: any) => c.className).join(", ");
    }
    return "Lớp phụ trách";
  };

  const getTargetClassId = (act: any) => {
    return act.myClassProgress?.classId || act.myAssignedClass?.classId || act.assignedClasses?.[0]?.classId || "";
  };

  const currentClassObj = myClasses.find(c => c.id === selectedClassId);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans px-4 sm:px-6">

      {/* =========================================================================
          HEADER SECTION - GIAO DIỆN HIỆN ĐẠI CHO GIÁO VIÊN
      ========================================================================= */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4B] to-[#00A19A] rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden border border-teal-800/40">
        {/* Background glow decoration */}
        <div className="absolute -right-16 -top-20 w-80 h-80 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-60 h-60 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/15 text-teal-100 border border-white/20 backdrop-blur-md">
                🎓 Không gian Giáo viên
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                Sổ Đánh Giá Hoạt Động Trải Nghiệm
              </span>
              {currentClassObj && (
                <span className="px-3 py-1 rounded-full text-[11px] font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-xs">
                  {currentClassObj.isHomeroom ? "⭐ Lớp Chủ Nhiệm: " : "Lớp Giảng Dạy: "} {currentClassObj.className}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Compass className="w-8 h-8 text-teal-300" />
              Hoạt Động Trải Nghiệm Của Lớp
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/90 font-medium max-w-3xl leading-relaxed">
              Chỉ hiển thị các hoạt động được gán với lớp của Thầy/Cô. Giáo viên chủ nhiệm thực hiện điểm danh, chấm vai trò học sinh và có quyền khởi tạo thêm các hoạt động trải nghiệm riêng cho lớp.
            </p>
          </div>

          {/* Action Button: Create Class Activity */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={loadActivities}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md transition-all cursor-pointer shadow-sm"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-300' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedClassId && selectedClassId !== "ALL") {
                  setCreateForm(prev => ({ ...prev, classId: selectedClassId }));
                }
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-black text-[#003B3A] bg-white hover:bg-teal-50 shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Plus className="w-5 h-5 text-[#00A19A]" strokeWidth={3} />
              <span>Thêm Hoạt Động Cho Lớp</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4 KPI CARDS FOR HOMEROOM / SUBJECT TEACHER
      ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng HĐ của lớp */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Hoạt Động Của Lớp</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">{stats.total}</span>
            <span className="text-xs font-bold text-slate-400">hoạt động</span>
          </div>
          <p className="text-xs text-teal-700 font-semibold mt-1.5 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Đã gán vào kế hoạch lớp
          </p>
        </div>

        {/* Card 2: Cần nhập kết quả */}
        <div className={`p-4.5 rounded-2xl border transition-shadow shadow-2xs hover:shadow-md ${
          stats.needInput > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200/90'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">Cần Nhập Kết Quả</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">{stats.needInput}</span>
            <span className="text-xs font-bold text-amber-600">chưa hoàn tất</span>
          </div>
          <p className="text-xs text-amber-800 font-semibold mt-1.5 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            GVCN cần chấm điểm / vai trò
          </p>
        </div>

        {/* Card 3: Đã hoàn tất đánh giá */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">Đã Hoàn Thành</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{stats.completed}</span>
            <span className="text-xs font-bold text-slate-400">/{stats.total} HĐ</span>
          </div>
          <p className="text-xs text-emerald-800 font-semibold mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tỷ lệ hoàn thành: {stats.completionRate}%
          </p>
        </div>

        {/* Card 4: Học sinh được ghi nhận */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#00A19A]">Hồ Sơ Năng Lực HS</span>
            <div className="w-8 h-8 rounded-xl bg-[#00A19A]/10 text-[#00A19A] flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#003B3A]">{stats.totalEvaluatedStudents}</span>
            <span className="text-xs font-bold text-slate-400">lượt đánh giá</span>
          </div>
          <p className="text-xs text-teal-800 font-semibold mt-1.5 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#00A19A]" />
            Cập nhật học bạ cuối năm
          </p>
        </div>
      </div>

      {/* =========================================================================
          TOOLBAR: CHỌN LỚP, HỌC KỲ, TABS VÀ TÌM KIẾM
      ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* LEFT GROUP: Lớp & Năm học */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Chọn Lớp làm việc (Trọng tâm) */}
            <div className="flex items-center gap-2 bg-teal-50/70 border border-teal-200 rounded-xl px-3 py-2">
              <GraduationCap className="w-4 h-4 text-[#00A19A]" />
              <span className="text-xs font-black text-[#003B3A]">Lớp của tôi:</span>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="text-xs font-black text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Tất cả lớp của tôi ({myClasses.length})</option>
                {myClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className} {cls.isHomeroom ? "⭐ (GVCN)" : "(GVBM)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn Năm học */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">Năm học:</span>
              <select
                value={selectedYearId}
                onChange={e => setSelectedYearId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                {academicYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            {/* Chọn Chủ đề giáo dục */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs font-bold text-slate-500">Chủ đề:</span>
              <select
                value={selectedTheme}
                onChange={e => setSelectedTheme(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer max-w-[180px]"
              >
                <option value="ALL">Tất cả chủ đề giáo dục ({educationalThemes.length})</option>
                {educationalThemes.map(t => (
                  <option key={t.id || t.code} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Chọn Học kỳ */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSemesterFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  semesterFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cả năm
              </button>
              <button
                type="button"
                onClick={() => setSemesterFilter('1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  semesterFilter === '1' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                HK 1
              </button>
              <button
                type="button"
                onClick={() => setSemesterFilter('2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  semesterFilter === '2' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                HK 2
              </button>
            </div>
          </div>

          {/* RIGHT GROUP: Search & View Mode */}
          <div className="flex items-center gap-2.5 ml-auto flex-wrap">
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên hoạt động, mã HĐ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-8.5 pr-7 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00A19A] bg-slate-50/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl items-center border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-[#003B3A] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng thẻ lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-[#003B3A] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Dạng danh sách bảng"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* STATUS TABS PILL */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusTab === 'ALL'
                ? 'bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tất cả hoạt động</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusTab === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('NEED_INPUT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusTab === 'NEED_INPUT'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cần nhập kết quả</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusTab === 'NEED_INPUT' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-950'
            }`}>
              {stats.needInput}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusTab === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Đã hoàn thành</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusTab === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-950'
            }`}>
              {stats.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusTab('MY_CREATED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusTab === 'MY_CREATED'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-900 border border-purple-200/80 hover:bg-purple-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hoạt động do tôi tạo</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              statusTab === 'MY_CREATED' ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-950'
            }`}>
              {stats.myCreated}
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN ACTIVITIES CONTENT: GRID OR LIST
      ========================================================================= */}
      {loading ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <div className="w-12 h-12 rounded-full border-4 border-teal-200 border-t-[#00A19A] animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-700">Đang tải danh sách hoạt động của lớp...</p>
          <p className="text-xs text-slate-400 mt-1">Hệ thống đang kết nối và tổng hợp tiến độ đánh giá</p>
        </div>
      ) : activities.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-dashed border-slate-300 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#00A19A] flex items-center justify-center mx-auto mb-4 border border-teal-100">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">
            Không tìm thấy hoạt động trải nghiệm nào
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            {selectedClassId !== 'ALL'
              ? `Lớp ${currentClassObj?.className || ''} chưa có hoạt động nào được phân bổ hoặc tạo mới trong học kỳ này.`
              : 'Chưa có hoạt động trải nghiệm nào được gán với lớp của Thầy/Cô hoặc theo điều kiện lọc.'}
          </p>

          <button
            type="button"
            onClick={() => {
              if (selectedClassId && selectedClassId !== "ALL") {
                setCreateForm(prev => ({ ...prev, classId: selectedClassId }));
              }
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-teal-700/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            <span>Tạo Hoạt Động Mới Cho Lớp</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Thẻ Trực Quan Đẹp Mắt) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {activities.map((act) => {
            const themeBadge = getThemeBadge(act.themeName);
            const evalBadge = getEvalModeBadge(act.evalMode);
            const classLabel = getTargetClassLabel(act);
            const targetCId = getTargetClassId(act);
            const progress = act.myClassProgress || {
              evaluatedStudents: 0,
              totalStudents: 0,
              percent: 0,
              status: 'DRAFT'
            };
            const isCompleted = progress.percent === 100 || act.status === 'COMPLETED';
            const hasStarted = progress.evaluatedStudents > 0;

            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:border-[#00A19A]/40"
              >
                {/* Card Top: Badges */}
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${themeBadge.badgeCls}`}>
                      <Sparkles className="w-3.5 h-3.5" style={{ color: themeBadge.tagColor }} />
                      {themeBadge.name}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {act.isMyCreated && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                          ✨ Tôi tự tạo
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-extrabold text-slate-500 bg-slate-100">
                        {act.code || "HDTN"}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-black text-slate-800 group-hover:text-[#003B3A] transition-colors line-clamp-2 leading-snug mb-3">
                    {act.name}
                  </h3>

                  {/* Meta Specs: 6 Trụ Cột Cốt Lõi */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                        Lớp áp dụng:
                      </span>
                      <span className="font-extrabold text-[#003B3A] bg-teal-100/60 px-2 py-0.2 rounded-md">
                        {classLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Thời gian & HK:
                      </span>
                      <span className="font-bold text-amber-800">
                        {act.timeRange || "Trong năm"} (HK {act.semester || 1})
                      </span>
                    </div>

                    {/* Môn phối hợp */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        Môn phối hợp:
                      </span>
                      <span className="font-bold text-slate-700 truncate max-w-[170px]" title={act.coopSubjectNames || act.integratedSubjects || "Tích hợp liên môn"}>
                        {act.coopSubjectNames || act.integratedSubjects || "Tích hợp liên môn"}
                      </span>
                    </div>

                    {/* Địa điểm */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        Địa điểm:
                      </span>
                      <span className="font-medium text-slate-700 truncate max-w-[170px]" title={act.location || "Theo kế hoạch lớp"}>
                        {act.location || "Theo kế hoạch lớp"}
                      </span>
                    </div>

                    {/* GVBM Phụ trách / TCM */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        GVBM (TCM):
                      </span>
                      <span className="font-medium text-teal-800 truncate max-w-[170px]" title={act.leadTeacherName || act.subjectTeacherName || act.tcmOrSubjectLabel || "GVCN"}>
                        {act.leadTeacherName || act.subjectTeacherName || act.tcmOrSubjectLabel || "GVCN"}
                      </span>
                    </div>

                    {/* Hình thức đánh giá */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-500" />
                        Hình thức ĐG:
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-black border ${evalBadge.cls}`}>
                        {evalBadge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Progress & CTA */}
                <div className="p-5 pt-3 border-t border-slate-100 space-y-3 bg-white">
                  
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Tiến độ lớp:
                      </span>
                      <span className={isCompleted ? 'text-emerald-700 font-black' : hasStarted ? 'text-sky-700 font-bold' : 'text-amber-700 font-bold'}>
                        {progress.evaluatedStudents}/{progress.totalStudents || 0} HS ({progress.percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : hasStarted
                            ? 'bg-gradient-to-r from-[#003B3A] to-[#00A19A]'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.max(progress.percent, 3)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-1">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã hoàn thành
                        </span>
                      ) : hasStarted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                          <Clock className="w-3.5 h-3.5 text-sky-600" />
                          Đang đánh giá
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Chưa đánh giá
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {act.isMyCreated && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteActivity(e, act)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                          title="Xóa hoạt động này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const url = targetCId
                            ? `/teacher/experiential-activities/${act.id}?classId=${targetCId}`
                            : `/teacher/experiential-activities/${act.id}`;
                          router.push(url);
                        }}
                        className={`px-4 py-2 text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition-all hover:brightness-105 cursor-pointer ${
                          isCompleted
                            ? 'bg-slate-800 hover:bg-slate-900 text-white'
                            : 'bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white shadow-teal-800/20'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isCompleted ? "Xem & Sửa" : "Nhập kết quả"}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Dạng Bảng Tổng Hợp) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-3 w-10 text-center">#</th>
                  <th className="py-3.5 px-3 min-w-[240px]">Tên Hoạt Động & Chủ Đề</th>
                  <th className="py-3.5 px-3">Lớp & HK</th>
                  <th className="py-3.5 px-3 min-w-[130px]">Môn Phối Hợp</th>
                  <th className="py-3.5 px-3 min-w-[120px]">Địa Điểm</th>
                  <th className="py-3.5 px-3 min-w-[120px]">GVBM (TCM)</th>
                  <th className="py-3.5 px-3 text-center">Hình Thức ĐG</th>
                  <th className="py-3.5 px-3 min-w-[140px]">Tiến Độ Đánh Giá</th>
                  <th className="py-3.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((act, idx) => {
                  const themeBadge = getThemeBadge(act.themeName);
                  const evalBadge = getEvalModeBadge(act.evalMode);
                  const classLabel = getTargetClassLabel(act);
                  const targetCId = getTargetClassId(act);
                  const progress = act.myClassProgress || { evaluatedStudents: 0, totalStudents: 0, percent: 0 };
                  const isCompleted = progress.percent === 100 || act.status === 'COMPLETED';

                  return (
                    <tr key={act.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="py-3.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-black text-slate-800 text-sm mb-1 hover:text-[#003B3A]">
                          {act.name}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${themeBadge.badgeCls}`}>
                            <Sparkles className="w-2.5 h-2.5" style={{ color: themeBadge.tagColor }} />
                            {themeBadge.name}
                          </span>
                          <span className="text-[10.5px] font-extrabold text-slate-400">
                            {act.code || "HDTN"}
                          </span>
                          {act.isMyCreated && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-purple-50 text-purple-700">
                              ✨ Tôi tạo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-[#003B3A] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg inline-block text-[11px] mb-0.5">
                          {classLabel}
                        </div>
                        <div className="text-[10.5px] font-bold text-amber-800">
                          {act.timeRange || "Trong năm"} (HK {act.semester || 1})
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]" title={act.coopSubjectNames || act.integratedSubjects || "Tích hợp liên môn"}>
                            {act.coopSubjectNames || act.integratedSubjects || "Liên môn"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]" title={act.location || "Theo kế hoạch"}>
                            {act.location || "Theo kế hoạch"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 font-semibold text-teal-800">
                          <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate max-w-[120px]" title={act.leadTeacherName || act.subjectTeacherName || act.tcmOrSubjectLabel || "GVCN"}>
                            {act.leadTeacherName || act.subjectTeacherName || act.tcmOrSubjectLabel || "GVCN"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${evalBadge.cls}`}>
                          {evalBadge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-black">
                            <span className="text-slate-600">{progress.evaluatedStudents}/{progress.totalStudents || 0} HS</span>
                            <span className={isCompleted ? 'text-emerald-700' : 'text-[#00A19A]'}>
                              {progress.percent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-[#00A19A]'}`}
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đã hoàn thành
                          </span>
                        ) : progress.evaluatedStudents > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                            Đang đánh giá
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                            Chưa đánh giá
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {act.isMyCreated && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteActivity(e, act)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Xóa hoạt động"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const url = targetCId
                                ? `/teacher/experiential-activities/${act.id}?classId=${targetCId}`
                                : `/teacher/experiential-activities/${act.id}`;
                              router.push(url);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white text-xs font-bold rounded-xl shadow-2xs hover:brightness-105 cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isCompleted ? "Xem & Sửa" : "Nhập điểm"}</span>
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
      )}

      {/* =========================================================================
          MODAL TẠO HOẠT ĐỘNG TRẢI NGHIỆM CHO LỚP (DÀNH CHO GVCN & GV PHỤ TRÁCH)
      ========================================================================= */}
      {showCreateModal && (() => {
        const targetClass = myClasses.find(c => c.id === createForm.classId) || myClasses[0];
        const targetGrade = targetClass?.grade ? String(targetClass.grade).trim() : '';

        // Filter catalogs matching grade, month or search
        const filteredCatalogs = catalogActivities.filter(cat => {
          const meta = cat.meta || {};
          const grades = Array.isArray(meta.grades) ? meta.grades.map(String) : [];
          const matchesGrade = targetGrade ? (grades.length === 0 || grades.includes(targetGrade)) : true;
          if (!matchesGrade && !catalogSearch.trim()) return false;

          if (catalogMonthFilter !== 'ALL') {
            const timeInfo = formatTimeFrameAndSemester(meta.timeFrame, '2026-2027', meta.semester);
            if (catalogMonthFilter === 'OTHER') {
              if (timeInfo.month !== null) return false;
            } else if (timeInfo.month !== parseInt(catalogMonthFilter, 10)) {
              return false;
            }
          }

          if (catalogSearch.trim()) {
            const q = catalogSearch.toLowerCase().trim();
            const matchesText = 
              cat.name.toLowerCase().includes(q) ||
              (cat.code && cat.code.toLowerCase().includes(q)) ||
              (meta.themeName && meta.themeName.toLowerCase().includes(q)) ||
              (meta.primarySubjectName && meta.primarySubjectName.toLowerCase().includes(q)) ||
              (meta.integratedSubjects && meta.integratedSubjects.toLowerCase().includes(q));
            return matchesText;
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A19A] p-5 text-white flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md font-bold text-teal-200 shadow-2xs">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>Thêm Hoạt Động Cho Lớp & Đánh Giá Vai Trò Học Sinh</span>
                    </h2>
                    <p className="text-xs text-teal-100 font-medium">
                      Chọn hoạt động từ Danh mục chuẩn của Trường hoặc tự tạo hoạt động riêng cho lớp
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Source Mode Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateSource('CATALOG')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-2xl font-black text-xs transition-all cursor-pointer border-t border-x ${
                    createSource === 'CATALOG'
                      ? 'bg-white text-[#003B3A] border-slate-200 -mb-px shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${createSource === 'CATALOG' ? 'text-[#00A19A]' : 'text-slate-400'}`} />
                  <span>1. Chọn Từ Danh Mục Khung Của Trường (Khuyên dùng)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-100 text-[#003B3A] font-bold">
                    {catalogActivities.length} HĐ
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateSource('CUSTOM')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-2xl font-black text-xs transition-all cursor-pointer border-t border-x ${
                    createSource === 'CUSTOM'
                      ? 'bg-white text-[#003B3A] border-slate-200 -mb-px shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <Edit3 className={`w-3.5 h-3.5 ${createSource === 'CUSTOM' ? 'text-[#00A19A]' : 'text-slate-400'}`} />
                  <span>2. Tự Nhập Hoạt Động Riêng Của Lớp</span>
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleCreateActivity} className="p-6 overflow-y-auto space-y-4 text-xs font-sans flex-1">
                
                {/* Chọn Lớp Áp Dụng Đầu Tiên */}
                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#00A19A]" />
                    <div>
                      <label className="block text-xs font-black text-[#003B3A]">
                        Lớp tiếp nhận hoạt động:
                      </label>
                      <p className="text-[11px] text-teal-800">
                        {targetClass ? `Khối ${targetClass.grade || '—'} • Cấp ${targetClass.level || 'Phổ thông'} • ${targetClass.campus?.campusName || ''}` : 'Chọn lớp'}
                      </p>
                    </div>
                  </div>
                  <select
                    value={createForm.classId}
                    onChange={e => setCreateForm({ ...createForm, classId: e.target.value })}
                    className="text-xs px-3.5 py-2 rounded-xl border border-teal-300 focus:border-[#00A19A] focus:outline-hidden font-bold bg-white text-slate-800 shadow-2xs cursor-pointer min-w-[180px]"
                  >
                    {myClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.className} {c.isHomeroom ? "⭐ (GVCN)" : "(GVBM)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TAB 1: CHỌN TỪ DANH MỤC */}
                {createSource === 'CATALOG' && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#00A19A]" />
                        Danh sách Hoạt động trải nghiệm từ Danh mục hệ thống:
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Dropdown Lọc Tháng */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            value={catalogMonthFilter}
                            onChange={e => setCatalogMonthFilter(e.target.value)}
                            className="text-xs font-bold text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
                          >
                            <option value="ALL">Tất cả tháng</option>
                            <optgroup label="Học kỳ 1">
                              <option value="8">Tháng 8</option>
                              <option value="9">Tháng 9</option>
                              <option value="10">Tháng 10</option>
                              <option value="11">Tháng 11</option>
                              <option value="12">Tháng 12</option>
                              <option value="1">Tháng 1</option>
                            </optgroup>
                            <optgroup label="Học kỳ 2">
                              <option value="2">Tháng 2</option>
                              <option value="3">Tháng 3</option>
                              <option value="4">Tháng 4</option>
                              <option value="5">Tháng 5</option>
                              <option value="6">Tháng 6</option>
                              <option value="7">Tháng 7</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[200px] flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={catalogSearch}
                            onChange={e => setCatalogSearch(e.target.value)}
                            placeholder="Tìm theo tên HĐ, môn, chủ đề..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#00A19A] bg-slate-50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Catalog Items Carousel / List */}
                    {loadingCatalogs ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#00A19A]" />
                        <span>Đang tải danh mục hoạt động...</span>
                      </div>
                    ) : filteredCatalogs.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                        <p className="font-semibold text-xs text-slate-700">Chưa có hoạt động phù hợp trong Danh mục cho khối lớp này</p>
                        <p className="text-[11px] text-slate-400 mt-1">Thầy/Cô có thể chuyển sang tab <strong>"2. Tự Nhập Hoạt Động"</strong> để tạo trực tiếp.</p>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                        {filteredCatalogs.map(cat => {
                          const meta = cat.meta || {};
                          const isSelected = createForm.catalogId === cat.id || selectedCatalogId === cat.id;
                          return (
                            <div
                              key={cat.id}
                              onClick={() => {
                                setSelectedCatalogId(cat.id);
                                setCreateForm(prev => ({
                                  ...prev,
                                  name: cat.name,
                                  catalogId: cat.id,
                                  themeName: meta.themeName || cat.theme?.name || "Văn hóa – Truyền thống",
                                  educationalContent: meta.educationalContent || meta.learningOutcomes || "",
                                  integratedSubjects: meta.coopSubjectNames || meta.integratedSubjects || "",
                                  location: meta.expectedLocation || "Theo kế hoạch của lớp",
                                  leadTeacherName: meta.subjectTeacherName || meta.cthsTeacherName || "",
                                  activityTypeId: meta.activityTypeId || "THAM_QUAN",
                                  evalMode: meta.evalConfig?.mode || "ROLE_BASED",
                                  criteria: meta.evalConfig?.criteria || [],
                                  semester: Number(meta.semester) || 1,
                                  timeRange: meta.timeFrame || "Trong năm học",
                                  objectives: meta.learningOutcomes || meta.educationalContent || ""
                                }));
                                toast.success(`Đã chọn: ${cat.name}`);
                              }}
                              className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-teal-50 border-2 border-[#00A19A] shadow-xs'
                                  : 'bg-white hover:bg-slate-100/80 border border-slate-200'
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {cat.code && (
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                      {cat.code}
                                    </span>
                                  )}
                                  <span className="font-black text-xs text-slate-900 truncate">
                                    {cat.name}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
                                  {meta.themeName && (
                                    <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.2 rounded-full border border-teal-200">
                                      {meta.themeName}
                                    </span>
                                  )}
                                  {meta.primarySubjectName && (
                                    <span>Môn: <strong className="text-indigo-700">{meta.primarySubjectName}</strong></span>
                                  )}
                                  {meta.timeFrame && (
                                    <span>• {meta.timeFrame}</span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#00A19A] text-white shadow-2xs'
                                    : 'bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-[#003B3A]'
                                }`}
                              >
                                {isSelected ? '✓ Đã chọn' : 'Chọn HĐ'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2 HOẶC THÔNG TIN CHI TIẾT ĐÃ CHỌN */}
                {createSource === 'CUSTOM' && (
                  <div className="bg-teal-50/60 p-3 rounded-2xl border border-teal-200/80">
                    <span className="text-[11px] font-black uppercase text-[#003B3A] tracking-wider flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
                      Gợi ý chủ điểm nhanh (Click để điền mẫu):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SAMPLE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCreateForm(prev => ({
                              ...prev,
                              name: preset.name,
                              catalogId: "",
                              themeName: preset.themeName,
                              educationalContent: preset.educationalContent,
                              integratedSubjects: preset.integratedSubjects,
                              location: preset.location,
                              leadTeacherName: preset.leadTeacherName,
                              activityTypeId: preset.activityTypeId,
                              evalMode: preset.evalMode
                            }));
                            toast.success(`Đã chọn: ${preset.name}`);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-teal-100 border border-teal-200 text-teal-900 rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tên hoạt động & Chủ đề */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      Tên hoạt động trải nghiệm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Tham quan trải nghiệm Làng gốm Thanh Hà, Dự án STEM..."
                      value={createForm.name}
                      onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Chủ đề giáo dục
                    </label>
                    <select
                      value={createForm.themeName}
                      onChange={e => setCreateForm({ ...createForm, themeName: e.target.value })}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-bold bg-white cursor-pointer"
                    >
                      {educationalThemes.map(t => (
                        <option key={t.id || t.code} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nội dung giáo dục */}
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    Nội dung giáo dục & Yêu cầu cần đạt
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ghi rõ nội dung trọng tâm của hoạt động: kỹ năng rèn luyện hoặc sản phẩm dự kiến..."
                    value={createForm.educationalContent}
                    onChange={e => setCreateForm({ ...createForm, educationalContent: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden resize-none font-medium"
                  />
                </div>

                {/* Môn phối hợp & GVBM Phụ trách */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      Môn phối hợp / Tích hợp
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Lịch sử & Địa lí, Mỹ thuật, Tin học..."
                      value={createForm.integratedSubjects}
                      onChange={e => setCreateForm({ ...createForm, integratedSubjects: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      GVBM Phụ trách (TCM)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: TCM Khoa học Xã hội, Thầy/Cô GVBM..."
                      value={createForm.leadTeacherName}
                      onChange={e => setCreateForm({ ...createForm, leadTeacherName: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-medium"
                    />
                  </div>
                </div>

                {/* HÌNH THỨC ĐÁNH GIÁ VAI TRÒ HỌC SINH (TRỌNG TÂM CỦA GVCN) */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      Hình thức đánh giá học sinh trong lớp:
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      Bổ sung Hồ sơ học sinh cuối năm
                    </span>
                  </div>

                  <select
                    value={createForm.evalMode}
                    onChange={e => setCreateForm({ ...createForm, evalMode: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-amber-300 focus:border-[#00A19A] focus:outline-hidden font-black text-slate-900 bg-white cursor-pointer"
                  >
                    <option value="ROLE_BASED">👥 Đánh giá theo 6 Vai trò Học sinh (Khuyên dùng cho GVCN)</option>
                    <option value="CRITERIA">📊 Theo Rubric Tiêu chí Năng lực (4 Mức chuẩn)</option>
                    <option value="PARTICIPATION_ONLY">✅ Điểm danh Tham gia (Đạt / Chưa đạt)</option>
                  </select>

                  {/* 6 vai trò học sinh preview */}
                  {createForm.evalMode === 'ROLE_BASED' && (
                    <div className="pt-1 space-y-1.5">
                      <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                        <span>Danh mục 6 Vai trò Học sinh sẽ được dùng để đánh giá:</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {STANDARD_STUDENT_ROLES_6.map(r => (
                          <div key={r.name} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white border border-amber-200 text-[11px]">
                            <span>{r.icon}</span>
                            <span className="font-bold text-slate-800">{r.name}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10.5px] text-amber-800 italic pt-0.5">
                        💡 Ngay sau khi bấm tạo, hệ thống sẽ tự động khởi tạo danh sách học sinh của lớp và đưa Thầy/Cô đến ngay bảng phân công & đánh giá vai trò học sinh.
                      </p>
                    </div>
                  )}
                </div>

                {/* Học kỳ & Thời gian */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">Học kỳ</label>
                    <select
                      value={createForm.semester}
                      onChange={e => setCreateForm({ ...createForm, semester: Number(e.target.value) })}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden font-semibold bg-white cursor-pointer"
                    >
                      <option value={1}>Học kỳ 1</option>
                      <option value={2}>Học kỳ 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">Thời gian dự kiến</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tháng 10/2026, Tuần 8"
                      value={createForm.timeRange}
                      onChange={e => setCreateForm({ ...createForm, timeRange: e.target.value })}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">Địa điểm</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Tại lớp, Phòng Lab STEM, Hội trường..."
                      value={createForm.location}
                      onChange={e => setCreateForm({ ...createForm, location: e.target.value })}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:border-[#00A19A] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="text-[11px] text-slate-500">
                    Lớp áp dụng: <strong className="text-slate-800">{targetClass?.className || 'Chưa chọn'}</strong>
                    {createForm.catalogId && (
                      <span className="ml-2 text-teal-700 font-bold">
                        • Liên kết Danh mục khung
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>

                    <button
                      type="submit"
                      disabled={creating}
                      className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#003B3A] to-[#00A19A] hover:brightness-105 shadow-md shadow-teal-700/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {creating ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang khởi tạo...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" strokeWidth={3} />
                          <span>Thêm Hoạt Động & Đánh Giá Vai Trò Học Sinh Ngay &rarr;</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
