"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  Loader2, GraduationCap, User, Award, FileText, Compass, 
  ClipboardCheck, BookOpen, MessageSquare, Sparkles, Globe, 
  CheckCircle2, Printer
} from "lucide-react"

const getCategoryLabel = (cat: string) => {
  if (!cat) return "Lĩnh vực khác";
  const str = String(cat).toUpperCase();
  if (str === "OLYMPIC") return "Olympic";
  if (str === "KHKT") return "Khoa học kỹ thuật";
  if (str === "THE_THAO") return "Thể dục thể thao";
  if (str === "VAN_NGHE") return "Văn nghệ - Nghệ thuật";
  if (str === "HOC_THUAT") return "Học thuật";
  if (str === "STEM") return "STEM / Robotics";
  return cat;
};

const getLevelLabel = (lvl: string) => {
  if (!lvl) return "Cấp Trường";
  const str = String(lvl).toUpperCase();
  if (str === "VANG" || str === "NHAT") return "Giải Vàng / Hạng Nhất";
  if (str === "BAC" || str === "NHI") return "Giải Bạc / Hạng Nhì";
  if (str === "DONG" || str === "BA") return "Giải Đồng / Hạng Ba";
  if (str === "KHUYEN_KHICH") return "Giải Khuyến Khích";
  if (str === "CAP_QUOC_TE" || str === "5") return "Cấp Quốc tế";
  if (str === "CAP_QUOC_GIA" || str === "4") return "Cấp Quốc gia";
  if (str === "CAP_THANH_PHO" || str === "CAP_TINH" || str === "3") return "Cấp Thành phố / Tỉnh";
  if (str === "CAP_QUAN" || str === "CAP_HUYEN" || str === "2") return "Cấp Quận / Huyện";
  if (str === "CAP_TRUONG" || str === "1") return "Cấp Trường";
  return lvl.startsWith("Cấp") || lvl.startsWith("Giải") ? lvl : `Giải/Cấp: ${lvl}`;
};

export default function TeacherStudentProfilesPrintPage() {
  useEffect(() => {
    const style = document.createElement("style")
    style.id = "hide-portal-layout"
    style.innerHTML = `
      aside, header, footer, .no-print, [class*="Sidebar"], [class*="ChatBotWidget"], [class*="chatbot"] {
        display: none !important;
      }
      main {
        margin-left: 0 !important;
        padding: 0 !important;
      }
      div.p-4, div.p-6, div.p-8, div.p-10, div.p-12, div.px-6 {
        padding: 0 !important;
      }
      div.flex.min-h-screen {
        display: block !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById("hide-portal-layout")
      if (el) el.remove()
    }
  }, [])

  const searchParams = useSearchParams()
  const type = searchParams.get("type") || "class"
  const academicYearId = searchParams.get("academicYearId")
  const classId = searchParams.get("classId")
  const studentId = searchParams.get("studentId")

  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadPrintData() {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        params.set("action", "getProfiles")
        
        if (studentId) params.set("studentId", studentId)
        if (academicYearId) params.set("academicYearId", academicYearId)
        if (classId && classId !== "all") params.set("classId", classId)

        const res = await fetch(`/api/teacher-student-records?${params.toString()}`)
        if (res.ok) {
          const result = await res.json()
          const data = result.data || []

          setStudents(data)

          if (data.length === 0) {
            setError("Không tìm thấy học sinh nào trong phạm vi đã chọn.")
          } else {
            setTimeout(() => {
              window.print()
            }, 1000)
          }
        } else {
          setError("Lỗi khi tải dữ liệu từ máy chủ.")
        }
      } catch (err) {
        console.error("Error loading print profiles:", err)
        setError("Lỗi kết nối mạng.")
      } finally {
        setLoading(false)
      }
    }

    loadPrintData()
  }, [type, academicYearId, classId, studentId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
        <Loader2 className="w-12 h-12 text-[#00A19A] animate-spin" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Đang khởi tạo bản in hồ sơ A4...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-md shadow-sm">
          <h3 className="font-extrabold text-base mb-2">Lỗi in ấn</h3>
          <p className="text-xs font-semibold">{error}</p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:py-0 print:bg-white font-sans text-slate-800">
      {/* Dynamic Page Break Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        @media print {
          *, *:before, *:after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 10pt !important;
            line-height: 1.35 !important;
            -webkit-font-smoothing: antialiased !important;
          }
          .no-print-layout {
            display: none !important;
          }
          .print-cv-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto 20px auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            min-height: 100vh !important;
            page-break-after: always !important;
            break-after: page !important;
            position: relative !important;
          }
          .print-cv-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .print-section-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table, thead, tbody, tr, td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
        }
      ` }} />

      {/* Control bar (hidden in print mode) */}
      <div className="no-print-layout max-w-4xl mx-auto mb-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between text-xs font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#00A19A]" />
          <span>Bản in Hồ sơ Học sinh A4 Chuẩn: </span>
          <span className="text-[#00A19A] font-black text-sm">{students.length} học sinh</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00A19A] hover:bg-[#005B55] text-white rounded-xl shadow-xs transition-all cursor-pointer font-extrabold"
          >
            <Printer className="w-4 h-4" />
            <span>Lưu file PDF / In Ngay</span>
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-600 transition-all cursor-pointer font-bold"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Render list of Student CVs */}
      <div className="space-y-6 print:space-y-0 max-w-4xl mx-auto">
        {students.map((student) => {
          const gradeEntries = student.subjectGradeEntries || [];
          const termScores = student.termScores || [];
          const termSummaries = student.termSummaries || [];
          const compSummaries = student.competencySummaries || [];

          // Helper phân loại môn Song ngữ vs MOET
          const isBilingualSub = (subName: string, subCode: string) => {
            const s = `${subName || ""} ${subCode || ""}`.toLowerCase();
            return (
              s.includes("esl") ||
              s.includes("english") ||
              s.includes("tiếng anh tăng cường") ||
              s.includes("tav") ||
              s.includes("song ngữ") ||
              s.includes("bilingual") ||
              s.includes("maths") ||
              s.includes("science") ||
              s.includes("robotics")
            );
          };

          // 1. Map Điểm kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2)
          const periodicMap = new Map<string, { name: string; code: string; ksdn: any; gk1: any; ck1: any; gk2: any; ck2: any }>();
          gradeEntries.forEach((entry: any) => {
            const sName = entry.subject?.subjectName || "Môn học";
            const sCode = entry.subject?.subjectCode || "";
            const key = (entry.subjectId || sName).trim();
            if (!periodicMap.has(key)) {
              periodicMap.set(key, { name: sName, code: sCode, ksdn: null, gk1: null, ck1: null, gk2: null, ck2: null });
            }
            const item = periodicMap.get(key)!;
            const period = String(entry.evaluationPeriod || "").toUpperCase().trim();
            const scoreVal = entry.compositeScore !== null && entry.compositeScore !== undefined ? Number(entry.compositeScore).toFixed(1) : null;
            if (period === "KSĐN" || period === "KSDN" || period.includes("ĐẦU NĂM")) item.ksdn = scoreVal;
            else if (period === "GK1" || period.includes("GIỮA KỲ 1") || period.includes("GIỮA KÌ 1")) item.gk1 = scoreVal;
            else if (period === "CK1" || period.includes("CUỐI KỲ 1") || period.includes("CUỐI KÌ 1")) item.ck1 = scoreVal;
            else if (period === "GK2" || period.includes("GIỮA KỲ 2") || period.includes("GIỮA KÌ 2")) item.gk2 = scoreVal;
            else if (period === "CK2" || period.includes("CUỐI KỲ 2") || period.includes("CUỐI KÌ 2")) item.ck2 = scoreVal;
          });

          // 2. Map Điểm tổng kết học tập (CK1, CK2, CN)
          const termMap = new Map<string, { name: string; code: string; hk1: any; hk2: any; cn: any }>();
          termScores.forEach((ts: any) => {
            const sName = ts.subject?.subjectName || "Môn học";
            const sCode = ts.subject?.subjectCode || "";
            const key = (ts.subjectId || sName).trim();
            if (!termMap.has(key)) {
              termMap.set(key, { name: sName, code: sCode, hk1: null, hk2: null, cn: null });
            }
            const item = termMap.get(key)!;
            const sem = String(ts.semester || "").toUpperCase().trim();
            const val = ts.score !== null && ts.score !== undefined ? Number(ts.score).toFixed(1) : (ts.evaluationGrade || null);
            if (sem === "HK1" || sem === "HKI" || sem.includes("HỌC KỲ 1") || sem === "1") item.hk1 = val;
            else if (sem === "HK2" || sem === "HKII" || sem.includes("HỌC KỲ 2") || sem === "2") item.hk2 = val;
            else if (sem === "CN" || sem.includes("CẢ NĂM")) item.cn = val;
          });

          // Phân chia danh sách
          const moetPeriodicRows = Array.from(periodicMap.values()).filter(r => !isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));
          const bilingualPeriodicRows = Array.from(periodicMap.values()).filter(r => isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));

          const moetTermRows = Array.from(termMap.values()).filter(r => !isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));
          const bilingualTermRows = Array.from(termMap.values()).filter(r => isBilingualSub(r.name, r.code)).sort((a, b) => a.name.localeCompare(b.name, "vi"));

          // Xếp loại tổng kết
          const sumHK1 = termSummaries.find((s: any) => String(s.semester).toUpperCase().includes("1") || String(s.semester).toUpperCase() === "HK1");
          const sumHK2 = termSummaries.find((s: any) => String(s.semester).toUpperCase().includes("2") || String(s.semester).toUpperCase() === "HK2");
          const sumCN = termSummaries.find((s: any) => String(s.semester).toUpperCase().includes("CN") || String(s.semester).toUpperCase().includes("NĂM"));

          return (
            <div
              key={student.id}
              className="print-cv-page bg-white border border-slate-300 shadow-md rounded-2xl p-8 font-sans relative overflow-hidden space-y-5 text-slate-800"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#003B3A] via-[#00A19A] to-[#48BFE3]" />

              {/* CV Header */}
              <div className="border-b-2 border-slate-200 pb-4 pt-1 flex justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Sky-Line" className="h-10 w-auto object-contain" />
                  <div className="space-y-0.5">
                    <span className="font-black text-xs tracking-wider text-[#00A19A] block uppercase">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Hồ sơ Năng lực Học sinh</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Comprehensive Profile &amp; Portfolio</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <div>Năm học: <span className="text-[#00A19A] font-black">{student.yearName || "2025-2026"}</span></div>
                  <div>Cơ sở: <span className="text-slate-800 font-bold">{student.campusName || "Sky-Line"}</span></div>
                </div>
              </div>

              {/* SECTION I: THÔNG TIN HỌC SINH */}
              <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/90 space-y-3 print-section-avoid">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00A19A]" />
                  <User className="w-4 h-4 text-[#00A19A]" />
                  I. THÔNG TIN HỌC SINH
                </h3>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-teal-300 shadow-xs flex items-center justify-center bg-teal-50 flex-shrink-0">
                    <img
                      src={`/api/student-photos/${student.id}?code=${encodeURIComponent(student.studentCode || "")}`}
                      alt={student.studentName || "Avatar"}
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div style={{ display: 'none' }} className="flex flex-col items-center justify-center text-teal-700 w-full h-full">
                      <User className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 flex-1 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Họ và tên học sinh</div>
                      <div className="font-black text-slate-900 text-sm">{student.studentName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Lớp học</div>
                      <div className="font-black text-[#00A19A] text-sm">{student.className || "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Mã học sinh</div>
                      <div className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                        {student.studentCode}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Ngày sinh</div>
                      <div className="font-bold text-slate-800">{student.dob || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Giới tính</div>
                      <div className="font-bold text-slate-800">{student.gender || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Giáo viên chủ nhiệm</div>
                      <div className="font-black text-[#00A19A] text-xs">
                        {student.homeroomTeacherName || "Giáo viên Chủ nhiệm"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION II: CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU */}
            {(() => {
              const goals = (student?.goals || []);
              const trackings = (student?.goalTrackings || []);
              const evaluations = (student?.termEvaluations || []);
              const evalItem = evaluations[0] || null;

              const gradeLevel = String(student?.className || student?.grade || "").toUpperCase();
              const isSecondaryOrHigh = !gradeLevel.match(/^(?:LỚP\s*)?[1-5][A-Z\.]/i) && !gradeLevel.includes("KHỐI 1") && !gradeLevel.includes("KHỐI 2") && !gradeLevel.includes("KHỐI 3") && !gradeLevel.includes("KHỐI 4") && !gradeLevel.includes("KHỐI 5");

              const categories = isSecondaryOrHigh ? [
                { key: "HOC_TAP", label: "1. Mục tiêu học tập", weight: 50 },
                { key: "THOI_QUEN", label: "2. Mục tiêu thói quen", weight: 15 },
                { key: "KY_NANG_CAM_XUC", label: "3. Mục tiêu kỹ năng & Cảm xúc", weight: 15 },
                { key: "DINH_HUONG", label: "4. Mục tiêu định hướng & Hướng nghiệp", weight: 20 }
              ] : [
                { key: "HOC_TAP", label: "1. Mục tiêu học tập", weight: 50 },
                { key: "SUC_KHOE", label: "2. Mục tiêu sức khỏe & Thói quen", weight: 20 },
                { key: "SO_THICH", label: "3. Mục tiêu sở thích & Năng khiếu", weight: 15 },
                { key: "PHAM_CHAT", label: "4. Mục tiêu phẩm chất & Đạo đức", weight: 15 }
              ];

              const advisoryRows = [];
              categories.forEach(cat => {
                const matchedGoals = goals.filter((g) => {
                  const gc = String(g.category || "").toUpperCase();
                  if (cat.key === "HOC_TAP" && (gc.includes("HOC_TAP") || gc.includes("HỌC TẬP"))) return true;
                  if (cat.key === "THOI_QUEN" && (gc.includes("THOI_QUEN") || gc.includes("THÓI QUEN") || gc.includes("SUC_KHOE"))) return true;
                  if (cat.key === "KY_NANG_CAM_XUC" && (gc.includes("KY_NANG") || gc.includes("KỸ NĂNG") || gc.includes("CAM_XUC") || gc.includes("CẢM XÚC") || gc.includes("SO_THICH"))) return true;
                  if (cat.key === "DINH_HUONG" && (gc.includes("DINH_HUONG") || gc.includes("ĐỊNH HƯỚNG") || gc.includes("HUONG_NGHIEP") || gc.includes("PHAM_CHAT"))) return true;
                  return false;
                });

                if (matchedGoals.length === 0) {
                  advisoryRows.push({
                    catKey: cat.key,
                    catLabel: cat.label,
                    weight: cat.weight,
                    isFirstInCat: true,
                    totalInCat: 1,
                    subIndex: 1,
                    targetText: "Em chưa điền nội dung mục tiêu nhóm này",
                    actionText: "",
                    progressStatus: "CHUA_DANH_GIA",
                    goalCompletionLevel: evalItem?.goalCompletionLevel || null,
                    initiativeLevel: evalItem?.initiativeLevel || null,
                    participationAttitude: evalItem?.participationAttitude || null,
                    recommendations: evalItem?.recommendations || ""
                  });
                } else {
                  matchedGoals.forEach((g, idx) => {
                    const tracking = trackings.find((t) =>
                      (t.goalId && t.goalId === g.id) ||
                      (t.targetText && g.targetText && t.targetText.trim() === g.targetText.trim()) ||
                      (t.category && String(t.category).includes(cat.label))
                    );
                    const actionText = g.actions?.[0]?.actionText || "";
                    advisoryRows.push({
                      catKey: cat.key,
                      catLabel: cat.label,
                      weight: cat.weight,
                      isFirstInCat: idx === 0,
                      totalInCat: matchedGoals.length,
                      subIndex: idx + 1,
                      targetText: g.targetText,
                      actionText,
                      progressStatus: tracking?.progressStatus || "TIEN_TRIEN",
                      teacherNotes: tracking?.teacherNotes || "",
                      goalCompletionLevel: evalItem?.goalCompletionLevel || null,
                      initiativeLevel: evalItem?.initiativeLevel || null,
                      participationAttitude: evalItem?.participationAttitude || null,
                      recommendations: tracking?.teacherNotes || evalItem?.recommendations || ""
                    });
                  });
                }
              });

              const renderProgressBadge = (status) => {
                const s = String(status || "").toUpperCase();
                if (s === "DAT" || s === "HOAN_THANH") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Đạt (100%)</span>
                    </span>
                  );
                }
                if (s === "TIEN_TRIEN") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>Tiến triển (50%)</span>
                    </span>
                  );
                }
                if (s === "CAN_CO_GANG") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      <span>Cần cố gắng (25%)</span>
                    </span>
                  );
                }
                if (s === "CHUA_DAT") {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      <span>Chưa đạt</span>
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    <span>Chưa đánh giá</span>
                  </span>
                );
              };

              return (
                <div className="space-y-3 print-section-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <Compass className="w-4 h-4 text-indigo-500" />
                      <span>II. CỐ VẤN HỌC TẬP &amp; NHẬT KÝ THEO DÕI MỤC TIÊU</span>
                    </h3>
                    <span className="text-[9px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Phiếu Đánh Giá Kỳ Cố Vấn Học Tập
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-[9px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5 border-r border-slate-200 w-[180px]">Nhóm mục tiêu (Trọng số)</th>
                          <th className="py-2 px-2.5 border-r border-slate-200 min-w-[220px]">Mục tiêu cụ thể</th>
                          <th className="py-2 px-2 text-center border-r border-slate-200 w-[115px]">Kết quả theo dõi</th>
                          <th className="py-2 px-1.5 text-center border-r border-slate-200 w-[90px]">Mức hoàn thành MT (1-5)</th>
                          <th className="py-2 px-1.5 text-center border-r border-slate-200 w-[90px]">Mức độ chủ động (1-5)</th>
                          <th className="py-2 px-2 text-center w-[110px]">Thái độ tham gia (1-5)</th>
                          
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700 text-xs">
                        {advisoryRows.map((r, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50">
                            {r.isFirstInCat && (
                              <td
                                rowSpan={r.totalInCat}
                                className="py-2.5 px-2.5 border-r border-slate-200 align-top bg-slate-50/60"
                              >
                                <div className="space-y-1.5">
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-black bg-teal-100 text-teal-900 border border-teal-200 leading-tight">
                                    {r.catLabel}
                                  </span>
                                  <div>
                                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-black border border-amber-300">
                                      Trọng số: {r.weight}%
                                    </span>
                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                      ({r.totalInCat} mục tiêu nhỏ)
                                    </p>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="py-2 px-2.5 border-r border-slate-200 align-top">
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-[#003B3A] text-white text-[9px] font-black">
                                  #{r.subIndex} MỤC TIÊU CỤ THỂ #{r.subIndex}
                                </span>
                                <p className="text-[11px] font-bold text-slate-900 leading-snug p-2 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-wrap">
                                  {r.targetText || "Em chưa điền nội dung mục tiêu nhóm này"}
                                </p>
                                {r.actionText ? (
                                  <p className="text-[10px] font-semibold text-amber-900 bg-amber-50/70 p-1.5 rounded border border-amber-200 whitespace-pre-wrap">
                                    ⚡ Việc làm: {r.actionText}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-2 px-2 border-r border-slate-200 align-top text-center">
                              {renderProgressBadge(r.progressStatus)}
                            </td>
                            <td className="py-2 px-1.5 border-r border-slate-200 align-top text-center font-bold text-xs">
                              {r.goalCompletionLevel ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-black">
                                  Mức {r.goalCompletionLevel}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>
                            <td className="py-2 px-1.5 border-r border-slate-200 align-top text-center font-bold text-xs">
                              {r.initiativeLevel ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-black">
                                  Mức {r.initiativeLevel}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 align-top text-center font-bold text-xs">
                              {r.participationAttitude ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-black">
                                  Mức {r.participationAttitude}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

                                    {/* SECTION III: KẾT QUẢ HỌC TẬP VĂN HÓA (MOET) */}
              <div className="space-y-3 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00A19A]" />
                    <ClipboardCheck className="w-4 h-4 text-[#00A19A]" />
                    <span>III. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET)</span>
                  </div>
                  <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Chương trình Bộ GD&amp;ĐT
                  </span>
                </h3>

                {/* Bảng 1: Kết quả kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-800 uppercase">
                    <span>1. Điểm kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2)</span>
                    <span className="text-[9px] font-normal text-slate-400">Thang điểm 10</span>
                  </div>
                  {moetPeriodicRows.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center text-xs text-slate-400 italic">
                      Chưa có dữ liệu bài kiểm tra định kỳ MOET.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-[9px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-1.5 px-2.5 text-center w-8">STT</th>
                            <th className="py-1.5 px-2.5">Môn học</th>
                            <th className="py-1.5 px-2 text-center bg-teal-50/50 text-[#00A19A]">KSĐN</th>
                            <th className="py-1.5 px-2 text-center">Giữa kỳ 1</th>
                            <th className="py-1.5 px-2 text-center">Cuối kỳ 1</th>
                            <th className="py-1.5 px-2 text-center">Giữa kỳ 2</th>
                            <th className="py-1.5 px-2 text-center">Cuối kỳ 2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {moetPeriodicRows.map((r, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-900">{r.name}</td>
                              <td className="py-1.5 px-2 text-center font-black text-[#00A19A] bg-teal-50/20">{r.ksdn || "—"}</td>
                              <td className="py-1.5 px-2 text-center font-black text-slate-800">{r.gk1 || "—"}</td>
                              <td className="py-1.5 px-2 text-center font-black text-slate-800">{r.ck1 || "—"}</td>
                              <td className="py-1.5 px-2 text-center font-black text-slate-800">{r.gk2 || "—"}</td>
                              <td className="py-1.5 px-2 text-center font-black text-slate-800">{r.ck2 || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Bảng 2: Bảng điểm Học tập tổng kết (CK1, CK2, Cả năm) */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-800 uppercase">
                    <span>2. Bảng điểm Học tập tổng kết (CK1, CK2, Cả năm)</span>
                    <span className="text-[9px] font-normal text-slate-400">Kết quả Học bạ</span>
                  </div>
                  {moetTermRows.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center text-xs text-slate-400 italic">
                      Chưa có bảng điểm học tập tổng kết MOET.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 text-[9px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-1.5 px-2.5 text-center w-8">STT</th>
                            <th className="py-1.5 px-2.5">Môn học</th>
                            <th className="py-1.5 px-2.5 text-center">Học kỳ 1 (CK1)</th>
                            <th className="py-1.5 px-2.5 text-center">Học kỳ 2 (CK2)</th>
                            <th className="py-1.5 px-2.5 text-center bg-teal-50/60 text-[#00A19A]">Cả năm (CN)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {moetTermRows.map((r, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-900">{r.name}</td>
                              <td className="py-1.5 px-2.5 text-center font-black text-slate-800">{r.hk1 || "—"}</td>
                              <td className="py-1.5 px-2.5 text-center font-black text-slate-800">{r.hk2 || "—"}</td>
                              <td className="py-1.5 px-2.5 text-center font-black text-[#00A19A] bg-teal-50/30">{r.cn || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Thẻ Đánh giá & Xếp loại Học tập Tổng thể */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <div className="bg-teal-50/50 border border-teal-150 p-2 rounded-lg text-center">
                      <div className="text-[9px] text-teal-800 font-black uppercase">Điểm TB (GPA)</div>
                      <div className="text-sm font-black text-slate-900 mt-0.5">
                        {sumCN?.gpa ? Number(sumCN.gpa).toFixed(1) : sumHK1?.gpa ? Number(sumHK1.gpa).toFixed(1) : "—"}
                      </div>
                      <div className="text-[8px] text-slate-400 font-semibold">Cả năm</div>
                    </div>
                    <div className="bg-teal-50/50 border border-teal-150 p-2 rounded-lg text-center">
                      <div className="text-[9px] text-teal-800 font-black uppercase">Học lực (KQHT)</div>
                      <div className="text-sm font-black text-teal-700 mt-0.5">
                        {sumCN?.academicRating || sumHK1?.academicRating || "—"}
                      </div>
                      <div className="text-[8px] text-slate-400 font-semibold">Theo quy định BGD</div>
                    </div>
                    <div className="bg-teal-50/50 border border-teal-150 p-2 rounded-lg text-center">
                      <div className="text-[9px] text-teal-800 font-black uppercase">Rèn luyện (Hạnh kiểm)</div>
                      <div className="text-sm font-black text-emerald-700 mt-0.5">
                        {sumCN?.conductRating || sumHK1?.conductRating || "—"}
                      </div>
                      <div className="text-[8px] text-slate-400 font-semibold">Đánh giá GVCN</div>
                    </div>
                    <div className="bg-teal-50/50 border border-teal-150 p-2 rounded-lg text-center">
                      <div className="text-[9px] text-amber-700 font-black uppercase">Khen thưởng</div>
                      <div className="text-sm font-black text-amber-800 mt-0.5 truncate" title={sumCN?.reward || sumHK1?.reward || "—"}>
                        {sumCN?.reward || sumHK1?.reward || "—"}
                      </div>
                      <div className="text-[8px] text-slate-400 font-semibold">Danh hiệu Sky-Line</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION IV: KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ */}
              <div className="space-y-2 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>IV. KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ</span>
                  </div>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Hệ Song ngữ Sky-Line
                  </span>
                </h3>

                {bilingualTermRows.length === 0 && bilingualPeriodicRows.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center text-xs text-slate-400 italic">
                    Học sinh học chương trình Chất lượng cao / Đang cập nhật môn song ngữ.
                  </div>
                ) : (
                  <div className="border border-blue-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-blue-50/70 text-[9px] font-black text-blue-900 uppercase tracking-wider border-b border-blue-200">
                        <tr>
                          <th className="py-1.5 px-2.5 text-center w-8">STT</th>
                          <th className="py-1.5 px-2.5">Môn Song ngữ</th>
                          <th className="py-1.5 px-2 text-center">KSĐN / GK</th>
                          <th className="py-1.5 px-2.5 text-center">Học kỳ 1</th>
                          <th className="py-1.5 px-2.5 text-center">Học kỳ 2</th>
                          <th className="py-1.5 px-2.5 text-center bg-blue-100/60 text-blue-900">Cả năm (CN)</th>
                          <th className="py-1.5 px-2.5 text-center">Đánh giá Năng lực</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-50 font-semibold text-slate-700">
                        {(bilingualTermRows.length > 0 ? bilingualTermRows : bilingualPeriodicRows).map((r, idx) => {
                          const pItem = bilingualPeriodicRows.find(p => p.name === r.name);
                          const ksdnVal = pItem ? (pItem.ksdn || pItem.gk1) : "—";
                          return (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-900">{r.name}</td>
                              <td className="py-1.5 px-2 text-center font-black text-blue-700">{ksdnVal || "—"}</td>
                              <td className="py-1.5 px-2.5 text-center font-black text-slate-800">{r.hk1 || "—"}</td>
                              <td className="py-1.5 px-2.5 text-center font-black text-slate-800">{r.hk2 || "—"}</td>
                              <td className="py-1.5 px-2.5 text-center font-black text-blue-900 bg-blue-50/40">{r.cn || "—"}</td>
                              <td className="py-1.5 px-2.5 text-center">
                                <span className="text-[9px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                                  Hoàn thành Tốt
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION V: THÀNH TÍCH & KHEN THƯỞNG CỦA HỌC SINH */}
              <div className="space-y-2 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>V. THÀNH TÍCH &amp; KHEN THƯỞNG CỦA HỌC SINH</span>
                </h3>
                {(!student.achievements || student.achievements.length === 0) ? (
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center text-xs text-slate-400 italic">
                    Chưa ghi nhận giải thưởng hoặc khen thưởng trong năm học.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-2.5 text-center w-8">STT</th>
                          <th className="py-1.5 px-2.5">Tên Giải thưởng</th>
                          <th className="py-1.5 px-2.5">Lĩnh vực</th>
                          <th className="py-1.5 px-2.5 text-center">Hạng / Cấp giải</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {student.achievements.slice(0, 4).map((item: any, idx: number) => {
                          const ach = item.achievement || item;
                          return (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-800">{ach.name || "Giải thưởng"}</td>
                              <td className="py-1.5 px-2.5 text-[9px] font-black text-[#00A19A] uppercase">{getCategoryLabel(ach.category || ach.examCategoryName)}</td>
                              <td className="py-1.5 px-2.5 text-center">
                                <span className="text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                                  {getLevelLabel(ach.level)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION VI: HOẠT ĐỘNG TRẢI NGHIỆM */}
              <div className="space-y-2 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  <span>VI. HOẠT ĐỘNG TRẢI NGHIỆM</span>
                </h3>
                {(!student.experientialActivities || student.experientialActivities.length === 0) ? (
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center text-xs text-slate-400 italic">
                    Học sinh chưa tham gia dự án trải nghiệm ngoại khóa nào.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[9px] uppercase tracking-wider">
                        <tr>
                          <th className="py-1.5 px-2.5 text-center w-8">STT</th>
                          <th className="py-1.5 px-2.5">Tên hoạt động</th>
                          <th className="py-1.5 px-2.5">Chủ đề GD</th>
                          <th className="py-1.5 px-2.5">Vai trò</th>
                          <th className="py-1.5 px-2.5 text-center">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {student.experientialActivities.slice(0, 4).map((act: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-1.5 px-2.5 font-extrabold text-[#003B3A]">{act.activityName}</td>
                            <td className="py-1.5 px-2.5 text-slate-600">{act.themeName || act.groupName || '—'}</td>
                            <td className="py-1.5 px-2.5">
                              <span className="bg-[#00A19A]/10 text-[#003B3A] border border-[#00A19A]/20 px-1.5 py-0.2 rounded text-[9px] font-black uppercase">
                                {act.role || 'Thành viên'}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-center">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-full text-[9px] font-black uppercase">
                                {act.evalLevel || 'Đạt'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION VII: ĐỊNH HƯỚNG NGHỀ NGHIỆP & HƯỚNG NGHIỆP */}
              <div className="space-y-2 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <Compass className="w-4 h-4 text-sky-600" />
                  <span>VII. ĐỊNH HƯỚNG NGHỀ NGHIỆP &amp; HƯỚNG NGHIỆP</span>
                </h3>
                <div className="bg-sky-50/40 border border-sky-100 p-3 rounded-xl space-y-1 text-xs">
                  <div className="text-[9px] text-sky-700 font-black uppercase">Nhóm ngành quan tâm &amp; Kế hoạch phát triển cá nhân</div>
                  <div className="font-black text-slate-800">
                    {student.orientation?.result || student.careerOrientations?.[0]?.result || student.orientation || "Công nghệ thông tin - Quản trị kinh doanh / Kế hoạch tài chính & học tập cá nhân."}
                  </div>
                  {student.orientation?.notes && (
                    <p className="text-slate-600 italic text-[10px] pt-0.5">
                      "{student.orientation.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION VIII: NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM */}
              <div className="space-y-2 print-section-avoid">
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>VIII. NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM</span>
                </h3>
                <div className="bg-emerald-50/30 border border-emerald-100 p-3 rounded-xl space-y-1 text-xs font-medium text-slate-700">
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 border-b border-emerald-100 pb-1">
                    <span>Ghi nhận từ GVCN ({student.homeroomTeacherName || "Giáo viên chủ nhiệm"}):</span>
                    <span className="font-mono text-emerald-700 text-[9px]">Năm học {student.yearName || "2025-2026"}</span>
                  </div>
                  <p className="italic leading-relaxed text-slate-700 pt-0.5">
                    "{student.highlightComments?.[0]?.comment || student.latestGvcnComment || 'Học sinh có ý thức kỷ luật tốt, hăng hái phát biểu xây dựng bài, có tinh thần giúp đỡ bạn bè và tham gia tích cực các hoạt động trải nghiệm của trường.'}"
                  </p>
                </div>
              </div>

              {/* SECTION IX: KHUNG KÝ XÁC THỰC 3 BÊN */}
              <div className="pt-4 border-t-2 border-slate-200 print-section-avoid">
                <div className="text-right text-[10px] font-medium text-slate-500 italic mb-3">
                  Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="space-y-12">
                    <div>
                      <div className="font-bold text-[10px] uppercase text-slate-600 tracking-wider">HỌC SINH CAM KẾT</div>
                      <div className="text-[9px] text-slate-400 italic">(Ký &amp; ghi rõ họ tên)</div>
                    </div>
                    <div className="font-black text-xs text-slate-900">
                      {student.studentName || "Học sinh"}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <div className="font-bold text-[10px] uppercase text-slate-600 tracking-wider">CỐ VẤN / GVCN</div>
                      <div className="text-[9px] text-slate-400 italic">(Ký &amp; ghi rõ họ tên)</div>
                    </div>
                    <div className="font-black text-xs text-[#00A19A]">
                      {student.homeroomTeacherName || "Thầy/Cô Chủ nhiệm"}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <div className="font-bold text-[10px] uppercase text-slate-600 tracking-wider">BAN GIÁM HIỆU PHÊ DUYỆT</div>
                      <div className="text-[9px] text-slate-400 italic">(Ký &amp; đóng dấu)</div>
                    </div>
                    <div className="font-black text-xs text-slate-900 uppercase">
                      HIỆU TRƯỞNG / GĐCS SKY-LINE
                    </div>
                  </div>
                </div>

                {/* OFFICIAL FOOTER */}
                <div className="mt-6 pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>HỆ THỐNG GIÁO DỤC SKY-LINE • HỒ SƠ NĂNG LỰC HỌC SINH 360°</span>
                  <span>Trang A4 Chuẩn • Bản chính thức</span>
                </div>
              {/* PHỤ LỤC: KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC TOÀN DIỆN (RADAR 360°) */}
              <div style={{ pageBreakBefore: "always", breakBefore: "page" }} className="pt-6 border-t-2 border-slate-300 print:break-before-page print:page-break-before-always space-y-4">
                <div className="border-b-2 border-slate-200 pb-3 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="font-black text-[10px] tracking-wider text-[#00A19A] block uppercase">PHỤ LỤC HỒ SƠ HỌC SINH</span>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>PHỤ LỤC: KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC TOÀN DIỆN (RADAR 360°)</span>
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Khung 5 Phẩm chất - 10 Năng lực cốt lõi theo CT GDPT 2018</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 font-semibold space-y-0.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                    <div>Học sinh: <span className="text-[#00A19A] font-black">{student.studentName}</span></div>
                    <div>Mã HS: <span className="font-mono font-bold text-slate-800">{student.studentCode}</span></div>
                  </div>
                </div>

                {compSummaries.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center text-xs text-slate-400 italic">
                    Chưa có dữ liệu đánh giá năng lực chi tiết.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {compSummaries.map((cs: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{cs.subject?.subjectName || cs.subjectName || "Môn học"}</span>
                            <span className="font-black text-[#00A19A] text-xs">{cs.subjectScore ? `${cs.subjectScore}%` : "Đạt"}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-teal-700 h-full rounded-full"
                              style={{ width: `${Math.min(100, cs.subjectScore || 85)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>HỆ THỐNG GIÁO DỤC SKY-LINE • PHỤ LỤC ĐÁNH GIÁ NĂNG LỰC TOÀN DIỆN</span>
                  <span>Trang Phụ Lục A4</span>
                </div>
              </div>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
