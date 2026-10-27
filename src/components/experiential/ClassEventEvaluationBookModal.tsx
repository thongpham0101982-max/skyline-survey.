"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X, Printer, Download, BookOpen, Calendar, MapPin, Users,
  CheckCircle2, AlertCircle, Sparkles, FileText, ChevronDown,
  Building2, GraduationCap, Award, Check, RefreshCw, Edit3, Eye,
  Save, Share2, Layers, Sliders, ShieldCheck, Clock, Tag
} from "lucide-react";
import toast from "react-hot-toast";
import { STANDARD_STUDENT_ROLES_6 } from "@/lib/experiential/constants";
import { getEducationalThemeInfo } from "@/lib/experiential/catalog-types";
import { formatTimeFrameAndSemester } from "@/lib/experiential/timeframe-helper";

export interface ClassEventEvaluationBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: any;
  currentClassId?: string;
  classes?: any[];
  students?: any[];
  onSavePlan?: (planData: any) => Promise<void>;
}

// 6 Vai trò chuẩn hóa
const ROLE_NAME_MAP: Record<string, string> = {
  TN: "Trưởng nhóm",
  PN: "Phó nhóm",
  TK: "Thư ký",
  TV_TC: "Thành viên tích cực",
  TV: "Thành viên tham gia",
  HT_KT: "Hỗ trợ / Kỹ thuật"
};

export default function ClassEventEvaluationBookModal({
  isOpen,
  onClose,
  activity,
  currentClassId,
  classes = [],
  students = [],
  onSavePlan
}: ClassEventEvaluationBookModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"PREVIEW" | "EDIT_PLAN">("PREVIEW");
  const [printScope, setPrintScope] = useState<"FULL" | "PLAN_ONLY" | "EVAL_ONLY">("FULL");
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClassId || "");
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Danh sách các lớp có sẵn trong hoạt động
  const availableClasses = useMemo(() => {
    if (classes && classes.length > 0) return classes;
    if (activity?.assignedClasses && activity.assignedClasses.length > 0) {
      return activity.assignedClasses;
    }
    // Fallback từ danh sách học sinh
    const map = new Map<string, any>();
    (students || []).forEach(st => {
      if (st.classId && !map.has(st.classId)) {
        map.set(st.classId, {
          id: st.classId,
          classId: st.classId,
          className: st.className || "Lớp của bạn",
          grade: st.grade || "",
          campusName: st.campusName || ""
        });
      }
    });
    return Array.from(map.values());
  }, [classes, activity, students]);

  // Cập nhật selectedClassId ban đầu
  useEffect(() => {
    if (currentClassId) {
      setSelectedClassId(currentClassId);
    } else if (availableClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(availableClasses[0].id || availableClasses[0].classId);
    }
  }, [currentClassId, availableClasses, selectedClassId]);

  // Thông tin lớp đang chọn
  const activeClass = useMemo(() => {
    return availableClasses.find(c => (c.id || c.classId) === selectedClassId) || availableClasses[0] || null;
  }, [availableClasses, selectedClassId]);

  // Lọc học sinh theo lớp đang chọn
  const classStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    if (!selectedClassId || selectedClassId === "ALL") return students;
    return students.filter(st => st.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Dữ liệu Kế hoạch chi tiết của lớp (State có thể chỉnh sửa)
  const [planData, setPlanData] = useState<any>({
    title: "",
    theme: "",
    location: "",
    timeRange: "",
    leadTeacher: "",
    coopTeachers: "",
    integratedSubjects: "",
    targetAudience: "",
    totalEstimatedStudents: 0,
    objectives: {
      qualities: "",
      competencies: ""
    },
    deliverables: "",
    phase1_Preparation: "",
    phase2_Implementation: "",
    phase3_Reflection: "",
    safetyAndLogistics: "",
    generalTeacherRemark: ""
  });

  // Khởi tạo kế hoạch mặc định dựa trên dữ liệu Activity & Lớp
  const resetPlanToDefault = () => {
    if (!activity) return;
    const actName = activity.name || "Hoạt động trải nghiệm";
    const className = activeClass?.className || "Lớp";
    const campusName = activeClass?.campusName || activity.campusName || "Sky-Line School";
    const leadName = activeClass?.homeroomTeacherName || activity.leadTeacherName || activity.creatorName || "Giáo viên chủ nhiệm";
    const coopName = activity.subjectTeacherName || activity.coopSubjectNames || "";
    const subjects = activity.integratedSubjects || activity.coopSubjectNames || activity.subjectName || "GDCD, Ngữ văn, KHTN, Lịch sử & Địa lí";
    const location = activity.location || activity.expectedLocation || "Tại cơ sở & Địa điểm trải nghiệm";
    const timeRange = activity.timeRange || activity.timeFrame || "Theo kế hoạch năm học";
    const theme = activity.themeName || "Văn hóa – Truyền thống";

    setPlanData({
      title: `KẾ HOẠCH CHI TIẾT TỔ CHỨC HOẠT ĐỘNG: ${actName.toUpperCase()}`,
      theme,
      location,
      timeRange,
      leadTeacher: leadName,
      coopTeachers: coopName || "Giáo viên bộ môn phối hợp & Ban CTHS",
      integratedSubjects: subjects,
      targetAudience: `Toàn thể học sinh lớp ${className} (${classStudents.length || activeClass?.totalStudents || 30} học sinh)`,
      totalEstimatedStudents: classStudents.length || activeClass?.totalStudents || 30,
      objectives: {
        qualities: activity.objectives || activity.educationalContent ||
          "Hình thành và phát triển phẩm chất Nhân ái, Trách nhiệm, Trung thực, Tự giác; bồi dưỡng tình yêu quê hương, ý thức giữ gìn nét đẹp văn hóa và bảo vệ môi trường sống.",
        competencies: activity.learningOutcomes ||
          "Rèn luyện và nâng cao năng lực Tự chủ & Tự học, Năng lực Giao tiếp & Hợp tác làm việc nhóm, Năng lực Giải quyết vấn đề sáng tạo, năng lực tổ chức và báo cáo sản phẩm trải nghiệm."
      },
      deliverables: activity.deliverables || "Bài thu hoạch trải nghiệm cá nhân/nhóm, Nhật ký hoạt động, Video/Hình ảnh ghi lại quá trình, Sản phẩm thực tế sáng tạo của nhóm.",
      phase1_Preparation:
        `1. Phổ biến mục đích, nội dung và nội quy an toàn của hoạt động đến toàn thể học sinh và phụ huynh lớp ${className}.\n` +
        `2. Chia lớp thành các nhóm trải nghiệm (4-6 học sinh/nhóm); phân công cụ thể 6 vai trò học sinh: Trưởng nhóm, Phó nhóm, Thư ký, Thành viên tích cực, Thành viên tham gia, Kỹ thuật/Hỗ trợ.\n` +
        `3. Hướng dẫn học sinh chuẩn bị dụng cụ học tập, sổ tay ghi chép, câu hỏi phỏng vấn/tìm hiểu thực tế, trang phục đồng phục chuẩn Sky-Line.`,
      phase2_Implementation:
        `1. Tập trung đúng giờ tại điểm hẹn, GVCN và ban cán sự tiến hành điểm danh quân số, quán triệt nguyên tắc an toàn, kỷ luật và ứng xử văn minh.\n` +
        `2. Các nhóm học sinh di chuyển và tham gia theo đúng lộ trình kế hoạch; thực hiện các nhiệm vụ quan sát, phỏng vấn, thu thập tư liệu và trải nghiệm thực tế dưới sự điều phối của Trưởng nhóm và hỗ trợ của GVCN.\n` +
        `3. Thư ký và các thành viên ghi chép nhật ký, lưu giữ hình ảnh/minh chứng phục vụ cho báo cáo thu hoạch.`,
      phase3_Reflection:
        `1. Các nhóm tiến hành tổng hợp tư liệu, thảo luận và hoàn thiện sản phẩm học tập/bài thu hoạch sau chuyến đi.\n` +
        `2. Tổ chức tiết sinh hoạt lớp để các nhóm thuyết trình, chia sẻ cảm xúc, tự đánh giá và đánh giá chéo giữa các thành viên.\n` +
        `3. GVCN nhận xét, tổng kết, hoàn tất bảng đánh giá vai trò và ghi nhận kết quả rèn luyện của từng học sinh vào hồ sơ cuối năm.`,
      safetyAndLogistics:
        `Đảm bảo 100% học sinh tuân thủ nội quy an toàn; chuẩn bị túi sơ cấp cứu y tế học đường; giữ liên lạc thông suốt giữa GVCN, BGH và Phụ huynh học sinh.`,
      generalTeacherRemark:
        `Học sinh lớp ${className} tham gia với tinh thần hào hứng, nghiêm túc, phát huy tốt vai trò trách nhiệm của từng cá nhân và tinh thần đoàn kết tập thể.`
    });
  };

  useEffect(() => {
    resetPlanToDefault();
  }, [activity, activeClass, classStudents.length]);

  // Thống kê kết quả đánh giá của lớp
  const stats = useMemo(() => {
    const total = classStudents.length;
    let present = 0;
    let absent = 0;
    let completed = 0;
    let outstanding = 0; // Xuất sắc / Tốt
    let pass = 0;        // Đạt
    let needSupport = 0; // Cần hỗ trợ

    const roleCounts: Record<string, number> = {
      TN: 0,
      PN: 0,
      TK: 0,
      TV_TC: 0,
      TV: 0,
      HT_KT: 0
    };

    classStudents.forEach(st => {
      // Điểm danh
      if (st.attendance === "PRESENT" || !st.attendance) present++;
      else absent++;

      // Đánh giá hoàn thành
      if (st.isCompleted) completed++;

      // Xếp loại
      const r = (st.finalResult || "").toUpperCase();
      if (r === "XUAT_SAC" || r === "TOT" || (st.calculatedPercent >= 80)) outstanding++;
      else if (r === "DAT" || (st.calculatedPercent >= 50)) pass++;
      else if (r === "CAN_HO_TRO" || r === "CAN_CO_GANG" || (st.calculatedPercent !== null && st.calculatedPercent < 50)) needSupport++;

      // Vai trò
      const rId = st.roleId || (Array.isArray(st.roles) ? st.roles[0] : "");
      if (rId && roleCounts[rId] !== undefined) {
        roleCounts[rId]++;
      } else {
        // Match by text
        const txt = String(st.roles || "").toLowerCase();
        if (txt.includes("trưởng nhóm")) roleCounts.TN++;
        else if (txt.includes("phó nhóm")) roleCounts.PN++;
        else if (txt.includes("thư ký")) roleCounts.TK++;
        else if (txt.includes("tích cực")) roleCounts.TV_TC++;
        else if (txt.includes("kỹ thuật") || txt.includes("hỗ trợ")) roleCounts.HT_KT++;
        else roleCounts.TV++;
      }
    });

    return {
      total,
      present,
      absent,
      completed,
      outstanding,
      pass,
      needSupport,
      roleCounts,
      participationRate: total > 0 ? Math.round((present / total) * 100) : 0,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [classStudents]);

  if (!isOpen || !activity) return null;

  // Xử lý Lưu Kế Hoạch
  const handleSavePlan = async () => {
    setIsSavingPlan(true);
    try {
      if (onSavePlan) {
        await onSavePlan(planData);
      }
      toast.success("Đã lưu kế hoạch chi tiết thành công!");
      setActiveTab("PREVIEW");
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi lưu kế hoạch");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Xử lý In trực tiếp (Browser Print)
  const handlePrint = () => {
    window.print();
  };

  // Xử lý Tải file PDF bằng html2pdf.js chuẩn khổ A4 dọc
  const handleDownloadPDF = async () => {
    const element = document.getElementById("class-evaluation-book-pdf-content");
    if (!element) {
      toast.error("Không tìm thấy nội dung để xuất PDF");
      return;
    }

    setIsExportingPDF(true);
    const toastId = toast.loading("Đang kết xuất Sổ Kế hoạch & Đánh giá PDF khổ A4 dọc...");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const safeClassName = (activeClass?.className || "Lop").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeActName = (activity?.name || "HoatDong").replace(/[^a-zA-Z0-9_\u00C0-\u024F]/g, "_").substring(0, 30);
      const filename = `So_Danh_Gia_Su_Kien_${safeClassName}_${safeActName}_A4_Doc.pdf`;

      // Cấu hình A4 portrait chuẩn xác: Lề 12mm x 10mm, khổ 210mm x 297mm
      const opt: any = {
        margin: [12, 10, 12, 10], // mm [trên, trái, dưới, phải]
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          windowWidth: 794, // 210mm tại 96 DPI
          width: 718        // 190mm tại 96 DPI
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          before: ".a4-page-break-before",
          avoid: ["tr", ".a4-avoid-break", ".a4-signature-section"]
        }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success(`Đã tải xuống file PDF A4 dọc: ${filename}`, { id: toastId });
    } catch (err: any) {
      console.error("Lỗi xuất PDF, chuyển sang Print:", err);
      toast.error("Không thể kết xuất PDF trực tiếp. Đang mở hộp thoại In để lưu PDF A4...", { id: toastId });
      setTimeout(() => {
        window.print();
      }, 500);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* =========================================================================
            HEADER MODAL (Ẩn khi In window.print)
        ========================================================================= */}
        <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#00A19A] p-4 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md font-bold text-teal-200 shadow-2xs">
              <Printer className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-teal-100">
                  Hồ sơ sư phạm Sky-Line
                </span>
                <span className="text-xs text-teal-200 font-semibold">
                  Mã HĐ: {activity.code || "HDTN"}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white line-clamp-1 mt-0.5">
                Xuất Sổ PDF Đánh Giá Sự Kiện Theo Lớp & Kế Hoạch Chi Tiết
              </h2>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-black/20 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("PREVIEW")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "PREVIEW"
                    ? "bg-white text-[#003B3A] shadow-xs"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem Trước & Xuất Sổ</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("EDIT_PLAN")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "EDIT_PLAN"
                    ? "bg-white text-[#003B3A] shadow-xs"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Lập Kế Hoạch Chi Tiết</span>
              </button>
            </div>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="In trực tiếp ra máy in hoặc Lưu dưới dạng PDF"
            >
              <Printer className="w-3.5 h-3.5 text-teal-200" />
              <span className="hidden sm:inline">In Sổ</span>
            </button>

            {/* Download PDF button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 text-amber-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Tải trực tiếp file PDF về máy tính"
            >
              <Download className={`w-3.5 h-3.5 ${isExportingPDF ? "animate-bounce" : ""}`} />
              <span>{isExportingPDF ? "Đang xuất..." : "Tải PDF"}</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            SUB-TOOLBAR (Chọn Lớp, Chế độ in & Thống kê) - Ẩn khi In
        ========================================================================= */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          
          {/* Chọn Lớp xuất sổ */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <GraduationCap className="w-4 h-4 text-[#00A19A]" />
              <span>Lớp được chọn:</span>
            </span>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-800 shadow-2xs focus:border-[#00A19A] focus:outline-hidden cursor-pointer min-w-[160px]"
            >
              {availableClasses.map(c => {
                const cId = c.id || c.classId;
                return (
                  <option key={cId} value={cId}>
                    Lớp {c.className} {c.campusName ? `(${c.campusName})` : ""}
                  </option>
                );
              })}
            </select>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-semibold">
              Quân số: <strong className="text-slate-900">{classStudents.length}</strong> học sinh
            </span>
          </div>

          {/* Chọn Phạm vi In (Scope) */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Nội dung in:</span>
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setPrintScope("FULL")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  printScope === "FULL"
                    ? "bg-white text-[#003B3A] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Toàn bộ Sổ (Kế hoạch + Đánh giá)
              </button>
              <button
                type="button"
                onClick={() => setPrintScope("PLAN_ONLY")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  printScope === "PLAN_ONLY"
                    ? "bg-white text-[#003B3A] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Chỉ Kế Hoạch Chi Tiết
              </button>
              <button
                type="button"
                onClick={() => setPrintScope("EVAL_ONLY")}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  printScope === "EVAL_ONLY"
                    ? "bg-white text-[#003B3A] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Chỉ Bảng Đánh Giá Lớp
              </button>
            </div>
          </div>

          {/* Badge Khổ A4 Dọc */}
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Định dạng: A4 Khổ Dọc (Portrait 210 × 297 mm)</span>
          </div>
        </div>

        {/* =========================================================================
            BODY CONTENT (2 TABS: EDIT_PLAN & PREVIEW)
        ========================================================================= */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-slate-100/70 print:bg-white print:p-0 print:overflow-visible">
          
          {/* TAB 1: FORM LẬP KẾ HOẠCH CHI TIẾT */}
          {activeTab === "EDIT_PLAN" && (
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5 print:hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      Lập & Tinh Chỉnh Kế Hoạch Chi Tiết Cho Lớp {activeClass?.className}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Nội dung này sẽ được in trang trọng tại Phần I của Sổ Đánh Giá Hoạt Động Trải Nghiệm
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetPlanToDefault}
                  className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  title="Khôi phục lại gợi ý tự động từ hoạt động khung"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Điền Tự Động Kế Hoạch</span>
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                <div className="md:col-span-2 space-y-1">
                  <label className="block font-black text-slate-700">Tiêu đề kế hoạch hoạt động của lớp:</label>
                  <input
                    type="text"
                    value={planData.title}
                    onChange={e => setPlanData({ ...planData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Chủ đề giáo dục:</label>
                  <input
                    type="text"
                    value={planData.theme}
                    onChange={e => setPlanData({ ...planData, theme: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Thời gian thực hiện:</label>
                  <input
                    type="text"
                    value={planData.timeRange}
                    onChange={e => setPlanData({ ...planData, timeRange: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Địa điểm tổ chức:</label>
                  <input
                    type="text"
                    value={planData.location}
                    onChange={e => setPlanData({ ...planData, location: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Môn học tích hợp / liên môn:</label>
                  <input
                    type="text"
                    value={planData.integratedSubjects}
                    onChange={e => setPlanData({ ...planData, integratedSubjects: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Giáo viên chủ trì / GVCN:</label>
                  <input
                    type="text"
                    value={planData.leadTeacher}
                    onChange={e => setPlanData({ ...planData, leadTeacher: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Giáo viên bộ môn phối hợp / Phụ trách:</label>
                  <input
                    type="text"
                    value={planData.coopTeachers}
                    onChange={e => setPlanData({ ...planData, coopTeachers: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                {/* Objectives */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block font-black text-slate-700">1. Mục tiêu giáo dục về Phẩm chất:</label>
                  <textarea
                    rows={2}
                    value={planData.objectives.qualities}
                    onChange={e => setPlanData({
                      ...planData,
                      objectives: { ...planData.objectives, qualities: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block font-black text-slate-700">2. Mục tiêu giáo dục về Năng lực:</label>
                  <textarea
                    rows={2}
                    value={planData.objectives.competencies}
                    onChange={e => setPlanData({
                      ...planData,
                      objectives: { ...planData.objectives, competencies: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                {/* 3 Phases of Plan */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block font-black text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md">
                    Giai đoạn 1: Chuẩn bị & Phổ biến (Trước sự kiện)
                  </label>
                  <textarea
                    rows={3}
                    value={planData.phase1_Preparation}
                    onChange={e => setPlanData({ ...planData, phase1_Preparation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden font-mono text-[11px]"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block font-black text-teal-900 bg-teal-50 px-2 py-1 rounded-md">
                    Giai đoạn 2: Triển khai thực hiện tại thực địa (Trong sự kiện)
                  </label>
                  <textarea
                    rows={3}
                    value={planData.phase2_Implementation}
                    onChange={e => setPlanData({ ...planData, phase2_Implementation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden font-mono text-[11px]"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block font-black text-amber-900 bg-amber-50 px-2 py-1 rounded-md">
                    Giai đoạn 3: Báo cáo, Đánh giá & Rút kinh nghiệm (Sau sự kiện)
                  </label>
                  <textarea
                    rows={3}
                    value={planData.phase3_Reflection}
                    onChange={e => setPlanData({ ...planData, phase3_Reflection: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden font-mono text-[11px]"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">Yêu cầu Sản phẩm thu hoạch của học sinh:</label>
                  <input
                    type="text"
                    value={planData.deliverables}
                    onChange={e => setPlanData({ ...planData, deliverables: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">Biện pháp đảm bảo an toàn & Hậu cần:</label>
                  <input
                    type="text"
                    value={planData.safetyAndLogistics}
                    onChange={e => setPlanData({ ...planData, safetyAndLogistics: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block font-bold text-slate-700">Đánh giá chung của GVCN về kết quả thực hiện:</label>
                  <textarea
                    rows={2}
                    value={planData.generalTeacherRemark}
                    onChange={e => setPlanData({ ...planData, generalTeacherRemark: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#00A19A] focus:outline-hidden"
                  />
                </div>

              </div>

              {/* Footer of Form */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("PREVIEW")}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Quay lại xem trước
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSavePlan}
                    disabled={isSavingPlan}
                    className="px-5 py-2 bg-[#003B3A] hover:bg-[#002827] text-white font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingPlan ? "Đang lưu..." : "Lưu Kế Hoạch & Xem Sổ"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: XEM TRƯỚC SỔ A4 CHUẨN IN ẤN VĂN BẢN SƯ PHẠM */}
          {activeTab === "PREVIEW" && (
            <div className="w-full flex justify-center py-4 sm:py-6 overflow-x-auto bg-slate-200/70 print:bg-white print:p-0 print:overflow-visible">
              {/* Khung mô phỏng tờ giấy A4 khổ dọc ngoài đời thực (210mm x 297mm) */}
              <div
                className="bg-white shadow-2xl border border-slate-300 print:border-none print:shadow-none print:p-0 shrink-0"
                style={{
                  width: "210mm",
                  minWidth: "210mm",
                  minHeight: "297mm",
                  padding: "12mm 10mm",
                  boxSizing: "border-box"
                }}
              >
                {/* Vùng nội dung 190mm chuẩn A4 dọc xuất PDF & in ấn */}
                <div
                  id="class-evaluation-book-pdf-content"
                  ref={printRef}
                  className="text-slate-900 font-serif text-[12px] leading-normal print:w-full"
                  style={{
                    fontFamily: "'Times New Roman', Times, serif",
                    width: "190mm",
                    maxWidth: "190mm",
                    boxSizing: "border-box"
                  }}
                >
              
              {/* QUỐC HIỆU - TIÊU NGỮ & ĐƠN VỊ CHỦ QUẢN */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b-2 border-slate-800">
                <div className="text-center">
                  <p className="font-bold uppercase tracking-wider text-[11px] text-slate-700">
                    HỆ THỐNG GIÁO DỤC SKY-LINE
                  </p>
                  <p className="font-extrabold uppercase text-[12px] text-slate-900 mt-0.5">
                    {activeClass?.campusName ? `TRƯỜNG SKY-LINE (${activeClass.campusName.toUpperCase()})` : "TRƯỜNG TIỂU HỌC, THCS & THPT SKY-LINE"}
                  </p>
                  <div className="w-16 h-0.5 bg-slate-400 mx-auto mt-1" />
                </div>

                <div className="text-center">
                  <p className="font-bold uppercase tracking-wider text-[11px] text-slate-700">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="font-bold text-[12px] text-slate-900 mt-0.5 italic">
                    Độc lập – Tự do – Hạnh phúc
                  </p>
                  <div className="w-20 h-0.5 bg-slate-400 mx-auto mt-1" />
                </div>
              </div>

              {/* TIÊU ĐỀ SỔ */}
              <div className="text-center my-6">
                <h1 className="text-lg sm:text-xl font-extrabold uppercase text-slate-950 tracking-wide">
                  SỔ KẾ HOẠCH & ĐÁNH GIÁ HOẠT ĐỘNG TRẢI NGHIỆM
                </h1>
                <h2 className="text-base font-bold uppercase text-[#003B3A] mt-1">
                  SỰ KIỆN: {activity.name || "HOẠT ĐỘNG TRẢI NGHIỆM"}
                </h2>
                <p className="text-[12px] italic text-slate-600 mt-1">
                  Lớp: <strong className="text-slate-900 font-bold font-sans">{activeClass?.className || "—"}</strong> • 
                  Khối: <strong className="text-slate-900 font-bold font-sans">{activeClass?.grade || activity.grades?.[0] || "—"}</strong> • 
                  Năm học: <strong className="text-slate-900 font-bold font-sans">{activity.academicYear?.name || "2026-2027"}</strong> • 
                  Học kỳ: <strong className="text-slate-900 font-bold font-sans">{activity.semester ? `Học kỳ ${activity.semester}` : "Học kỳ 1"}</strong>
                </p>
              </div>

              {/* =========================================================================
                  PHẦN I: KẾ HOẠCH TỔ CHỨC CHI TIẾT (ACTION PLAN)
              ========================================================================= */}
              {(printScope === "FULL" || printScope === "PLAN_ONLY") && (
                <div className="mb-8 page-break-inside-avoid">
                  <div className="flex items-center gap-2 mb-3 bg-slate-100 p-2 rounded border-l-4 border-[#003B3A]">
                    <span className="font-extrabold text-sm uppercase text-[#003B3A]">
                      PHẦN I. KẾ HOẠCH TỔ CHỨC CHI TIẾT
                    </span>
                  </div>

                  {/* Bảng tóm tắt thông tin tổ chức */}
                  <table className="w-full border-collapse border border-slate-400 mb-4 text-[12px]">
                    <tbody>
                      <tr>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold w-1/4">1. Tên hoạt động / Dự án:</td>
                        <td className="border border-slate-400 p-2 font-bold text-slate-900" colSpan={3}>
                          {activity.name} {activity.code ? `(${activity.code})` : ""}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold">2. Trụ cột / Chủ đề GD:</td>
                        <td className="border border-slate-400 p-2">{planData.theme || "Văn hóa – Truyền thống"}</td>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold w-1/5">3. Môn học tích hợp:</td>
                        <td className="border border-slate-400 p-2">{planData.integratedSubjects || "Liên môn"}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold">4. Thời gian thực hiện:</td>
                        <td className="border border-slate-400 p-2">{planData.timeRange}</td>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold">5. Địa điểm tổ chức:</td>
                        <td className="border border-slate-400 p-2">{planData.location}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold">6. Giáo viên chủ trì (GVCN):</td>
                        <td className="border border-slate-400 p-2">{planData.leadTeacher}</td>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold">7. GV phối hợp / Phụ trách:</td>
                        <td className="border border-slate-400 p-2">{planData.coopTeachers}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 p-2 bg-slate-50 font-bold">8. Đối tượng tham gia:</td>
                        <td className="border border-slate-400 p-2" colSpan={3}>{planData.targetAudience}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Mục tiêu giáo dục */}
                  <div className="space-y-2 mb-4 text-[12.5px]">
                    <div>
                      <strong className="text-slate-900">I. Mục tiêu giáo dục:</strong>
                      <div className="pl-4 mt-1 space-y-1">
                        <p>
                          <span className="font-semibold underline">1. Về phẩm chất:</span> {planData.objectives.qualities}
                        </p>
                        <p>
                          <span className="font-semibold underline">2. Về năng lực:</span> {planData.objectives.competencies}
                        </p>
                      </div>
                    </div>

                    <div>
                      <strong className="text-slate-900">II. Yêu cầu sản phẩm thu hoạch:</strong>
                      <p className="pl-4 mt-0.5 italic">{planData.deliverables}</p>
                    </div>
                  </div>

                  {/* Tiến trình 3 giai đoạn */}
                  <div className="space-y-2.5 text-[12.5px]">
                    <strong className="text-slate-900">III. Tiến trình thực hiện chi tiết (3 Giai đoạn):</strong>
                    
                    <div className="pl-3 border-l-2 border-slate-300 space-y-2">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          1. Giai đoạn 1: Chuẩn bị & Phân công nhiệm vụ (Trước sự kiện)
                        </span>
                        <p className="whitespace-pre-line text-slate-800 pl-2 mt-0.5">
                          {planData.phase1_Preparation}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-900 block">
                          2. Giai đoạn 2: Triển khai thực hiện tại thực địa (Trong sự kiện)
                        </span>
                        <p className="whitespace-pre-line text-slate-800 pl-2 mt-0.5">
                          {planData.phase2_Implementation}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-900 block">
                          3. Giai đoạn 3: Báo cáo, Đánh giá & Rút kinh nghiệm (Sau sự kiện)
                        </span>
                        <p className="whitespace-pre-line text-slate-800 pl-2 mt-0.5">
                          {planData.phase3_Reflection}
                        </p>
                      </div>
                    </div>

                    {planData.safetyAndLogistics && (
                      <div className="mt-2">
                        <strong className="text-slate-900">IV. Công tác an toàn & Hậu cần:</strong>
                        <p className="pl-4 mt-0.5 italic">{planData.safetyAndLogistics}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ngắt trang giữa Kế hoạch và Bảng đánh giá nếu in toàn bộ */}
              {printScope === "FULL" && (
                <div
                  className="a4-page-break-before"
                  style={{ pageBreakBefore: "always", breakBefore: "page", height: 0, margin: 0, padding: 0 }}
                />
              )}

              {/* =========================================================================
                  PHẦN II: BẢNG TỔNG HỢP ĐÁNH GIÁ HỌC SINH THEO LỚP
              ========================================================================= */}
              {(printScope === "FULL" || printScope === "EVAL_ONLY") && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 bg-slate-100 p-2 rounded border-l-4 border-[#003B3A]">
                    <span className="font-extrabold text-sm uppercase text-[#003B3A]">
                      PHẦN II. BẢNG TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ HỌC SINH
                    </span>
                    <span className="text-xs italic text-slate-600">
                      Sĩ số lớp: {classStudents.length} học sinh • Tham gia: {stats.present} • Vắng: {stats.absent}
                    </span>
                  </div>

                  {/* Bảng Danh sách Học sinh - Cố định 190mm chuẩn A4 dọc */}
                  <table className="w-full table-fixed border-collapse border border-slate-500 text-[10.5px] leading-tight">
                    <thead>
                      <tr className="bg-slate-200/90 text-center font-bold text-slate-900">
                        <th className="border border-slate-400 p-1 text-center" style={{ width: "8mm" }}>STT</th>
                        <th className="border border-slate-400 p-1 text-center" style={{ width: "18mm" }}>Mã HS</th>
                        <th className="border border-slate-400 p-1 text-left pl-2" style={{ width: "40mm" }}>Họ và tên học sinh</th>
                        <th className="border border-slate-400 p-1 text-center" style={{ width: "16mm" }}>Tham gia</th>
                        <th className="border border-slate-400 p-1 text-left pl-1.5" style={{ width: "28mm" }}>Vai trò (6 Vai trò)</th>
                        <th className="border border-slate-400 p-1 text-center" style={{ width: "18mm" }}>Xếp loại</th>
                        <th className="border border-slate-400 p-1 text-center" style={{ width: "12mm" }}>% Điểm</th>
                        <th className="border border-slate-400 p-1 text-left pl-2" style={{ width: "50mm" }}>Nhận xét chi tiết của GVCN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="border border-slate-400 p-4 text-center text-slate-500 italic">
                            Chưa có dữ liệu học sinh được gán cho lớp này trong hệ thống.
                          </td>
                        </tr>
                      ) : (
                        classStudents.map((st, idx) => {
                          const isPresent = st.attendance === "PRESENT" || !st.attendance;
                          const roleKey = st.roleId || (Array.isArray(st.roles) ? st.roles[0] : "");
                          const roleName = ROLE_NAME_MAP[roleKey] || (Array.isArray(st.roles) ? st.roles.join(", ") : (st.roles || "Thành viên"));

                          // Format xếp loại
                          let ratingText = "—";
                          const r = (st.finalResult || "").toUpperCase();
                          if (r === "XUAT_SAC") ratingText = "Xuất sắc";
                          else if (r === "TOT") ratingText = "Tốt";
                          else if (r === "DAT") ratingText = "Đạt";
                          else if (r === "CAN_HO_TRO" || r === "CAN_CO_GANG") ratingText = "Cần cố gắng";
                          else if (st.calculatedPercent !== null && st.calculatedPercent !== undefined) {
                            if (st.calculatedPercent >= 85) ratingText = "Xuất sắc";
                            else if (st.calculatedPercent >= 70) ratingText = "Tốt";
                            else if (st.calculatedPercent >= 50) ratingText = "Đạt";
                            else ratingText = "Cần hỗ trợ";
                          }

                          return (
                            <tr
                              key={st.id || idx}
                              className={`a4-avoid-break ${idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}`}
                              style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
                            >
                              <td className="border border-slate-400 p-1 text-center font-sans">{idx + 1}</td>
                              <td className="border border-slate-400 p-1 text-center font-sans font-medium text-slate-600 truncate">
                                {st.studentCode || "—"}
                              </td>
                              <td className="border border-slate-400 p-1 font-bold text-slate-900 pl-2">
                                {st.studentName}
                              </td>
                              <td className="border border-slate-400 p-1 text-center">
                                {isPresent ? (
                                  <span className="text-emerald-700 font-bold">Có mặt</span>
                                ) : (
                                  <span className="text-rose-600 font-semibold italic">Vắng</span>
                                )}
                              </td>
                              <td className="border border-slate-400 p-1 font-semibold text-slate-800 pl-1.5">
                                <span className={`px-1 py-0.5 rounded text-[9.5px] inline-block ${
                                  roleKey === "TN" ? "bg-amber-100 text-amber-900 font-bold" :
                                  roleKey === "PN" ? "bg-blue-100 text-blue-900 font-bold" :
                                  roleKey === "TK" ? "bg-purple-100 text-purple-900 font-bold" :
                                  roleKey === "TV_TC" ? "bg-emerald-100 text-emerald-900 font-bold" :
                                  "bg-slate-100 text-slate-700"
                                }`}>
                                  {roleName}
                                </span>
                              </td>
                              <td className="border border-slate-400 p-1 text-center font-bold">
                                {isPresent ? ratingText : "—"}
                              </td>
                              <td className="border border-slate-400 p-1 text-center font-sans font-semibold">
                                {isPresent && st.calculatedPercent !== null && st.calculatedPercent !== undefined ? `${st.calculatedPercent}%` : "—"}
                              </td>
                              <td className="border border-slate-400 p-1 text-slate-700 italic pl-2 text-[10px]">
                                {st.teacherRemark || st.notes || (isPresent ? "Tham gia tích cực, hoàn thành tốt nhiệm vụ." : "Vắng mặt có lý do.")}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Thống kê tổng hợp số liệu lớp */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded text-[12px] space-y-1 page-break-inside-avoid">
                    <p className="font-bold text-slate-900">
                      * Thống kê kết quả đánh giá lớp {activeClass?.className}:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-sans text-[11.5px]">
                      <div>
                        • Sĩ số: <strong>{stats.total}</strong> HS
                      </div>
                      <div>
                        • Tham gia: <strong>{stats.present}/{stats.total}</strong> ({stats.participationRate}%)
                      </div>
                      <div>
                        • Xếp loại Tốt/Xuất sắc: <strong>{stats.outstanding}</strong> HS
                      </div>
                      <div>
                        • Xếp loại Đạt: <strong>{stats.pass}</strong> HS
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 mt-1">
                      Phân bổ vai trò trong lớp: {stats.roleCounts.TN} Trưởng nhóm • {stats.roleCounts.PN} Phó nhóm • {stats.roleCounts.TK} Thư ký • {stats.roleCounts.TV_TC} Thành viên tích cực • {stats.roleCounts.HT_KT} Kỹ thuật/Hỗ trợ.
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  PHẦN III: NHẬN XÉT CHUNG CỦA GVCN & KÝ PHÊ DUYỆT BÁO CÁO
              ========================================================================= */}
              {(printScope === "FULL" || printScope === "EVAL_ONLY") && (
                <div
                  className="mt-6 a4-signature-section a4-avoid-break"
                  style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
                >
                  {planData.generalTeacherRemark && (
                    <div className="mb-4 text-[12px]">
                      <strong className="text-slate-900">Đánh giá chung của Giáo viên chủ nhiệm:</strong>
                      <p className="italic text-slate-800 pl-4 mt-0.5">
                        {planData.generalTeacherRemark}
                      </p>
                    </div>
                  )}

                  {/* Khung Chữ ký 3 Bên */}
                  <div className="pt-2">
                    <div className="text-right italic text-[11.5px] text-slate-600 mb-2">
                      Ngày ...... tháng ...... năm 20......
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11.5px]">
                      <div>
                        <p className="font-bold uppercase text-slate-900">GIÁO VIÊN CHỦ NHIỆM</p>
                        <p className="italic text-[10.5px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                        <div className="h-16" />
                        <p className="font-bold text-slate-900">{planData.leadTeacher}</p>
                      </div>

                      <div>
                        <p className="font-bold uppercase text-slate-900">TỔ TRƯỞNG CHUYÊN MÔN / CTHS</p>
                        <p className="italic text-[10.5px] text-slate-500">(Ký và ghi rõ họ tên)</p>
                        <div className="h-16" />
                        <p className="font-bold text-slate-900">
                          {activity.cthsTeacherName || "Tổ CTHS / BP HĐNGLL"}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase text-slate-900">BAN GIÁM HIỆU PHÊ DUYỆT</p>
                        <p className="italic text-[10.5px] text-slate-500">(Ký tên và đóng dấu)</p>
                        <div className="h-16" />
                        <p className="font-bold text-slate-900">
                          {activeClass?.campusName ? `BGH Cơ sở ${activeClass.campusName}` : "Ban Giám hiệu"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                </div>
              </div>
            </div>
          )}

        </div>

        {/* =========================================================================
            FOOTER MODAL (Ẩn khi In window.print)
        ========================================================================= */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-medium">
              Khổ in chuẩn: <strong>A4 Portrait (210 × 297 mm)</strong> • Thể thức sư phạm GD Sky-Line
            </span>
          </div>

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
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-[#003B3A] font-bold rounded-xl border border-teal-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#00A19A]" />
              <span>In Ngay (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-5 py-2 bg-[#003B3A] hover:bg-[#002b2a] text-white font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span>{isExportingPDF ? "Đang xuất PDF A4..." : "Tải File PDF A4"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Embedded Style ép buộc định dạng A4 Portrait khi in ấn */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait !important;
          margin: 12mm 10mm 12mm 10mm !important;
        }
        @media print {
          html, body {
            width: 210mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #class-evaluation-book-pdf-content,
          #class-evaluation-book-pdf-content * {
            visibility: visible !important;
          }
          #class-evaluation-book-pdf-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 190mm !important;
            max-width: 190mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .a4-page-break-before {
            page-break-before: always !important;
            break-before: page !important;
            display: block !important;
            height: 0 !important;
          }
          .a4-avoid-break,
          .a4-signature-section,
          tr, table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        }
      ` }} />
    </div>
  );
}
