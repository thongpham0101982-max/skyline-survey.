"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { 
  Loader2, GraduationCap, User, Award, FileText, Compass, 
  ClipboardCheck, BookOpen, MessageSquare, Sparkles, Globe, 
  CheckCircle2, Printer, Image as ImageIcon, BookMarked, Download,
  FolderArchive, FolderDown, Sliders, X
} from "lucide-react"
import StudentProfileCoverA4 from "@/components/student/StudentProfileCoverA4"
import StudentProfileSectionConfigModal from "@/components/student/StudentProfileSectionConfigModal"
import { resolveStudentSectionVisibility, DEFAULT_PROFILE_SECTIONS } from "@/lib/studentProfileSectionConfig"

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
      @page {
        size: A4 portrait;
        margin: 0mm !important;
      }
      aside, header, footer, .no-print, [class*="Sidebar"], [class*="ChatBotWidget"], [class*="chatbot"], [class*="AdminMobileBottomNav"], [class*="PwaBottomNav"], #teacher-top-header-slot, div.fixed.bottom-0 {
        display: none !important;
      }
      body, html {
        margin: 0 !important;
        padding: 0 !important;
      }
      div.flex.min-h-screen {
        display: block !important;
      }
      main {
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      main > div {
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
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
  const [printOption, setPrintOption] = useState<"all" | "cover" | "content">(() => {
    const m = searchParams.get("mode")
    if (m === "cover") return "cover"
    if (m === "content") return "content"
    return "all"
  })
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isExportingZip, setIsExportingZip] = useState(false)
  const [zipProgress, setZipProgress] = useState<{
    current: number;
    total: number;
    studentName: string;
    percent: number;
    statusText: string;
    isDone?: boolean;
    downloadUrl?: string;
    zipFileName?: string;
  } | null>(null)
  const cancelExportRef = useRef(false)

  // Cấu hình hiển thị các mục Hồ sơ Học sinh theo Khối & Hệ học
  const [configMap, setConfigMap] = useState<Record<string, Record<string, boolean>>>({})
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  const loadConfigs = async () => {
    try {
      const url = academicYearId
        ? `/api/admin/student-profiles/section-config?academicYearId=${academicYearId}`
        : `/api/admin/student-profiles/section-config`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success && data.data) {
        setConfigMap(data.data)
      }
    } catch (e) {
      console.error("Load section config error in teacher print client:", e)
    }
  }

  // Helper tạo mã HTML độc lập kèm toàn bộ style chuẩn để render PDF
  const buildCleanStudentHtml = (studentId: string, title: string) => {
    const studentEl = document.getElementById(`student-print-wrapper-${studentId}`);
    if (!studentEl) return null;

    // Trích xuất toàn bộ CSS rules đã nạp trong trình duyệt để inline trực tiếp
    let inlinedStyles = "";
    try {
      Array.from(document.querySelectorAll("style")).forEach((el) => {
        if (el.textContent) inlinedStyles += el.textContent + "\n";
      });
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach((rule) => {
              inlinedStyles += rule.cssText + "\n";
            });
          }
        } catch (_) {}
      });
    } catch (_) {}

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <base href="${origin}">
  <style>
    ${inlinedStyles}
    @page {
      size: A4 portrait;
      margin: 0mm !important;
    }
    *, *:before, *:after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      background: #ffffff !important;
      color: #0f172a !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      font-family: Arial, "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 9.5pt !important;
      line-height: 1.35 !important;
      -webkit-font-smoothing: antialiased !important;
    }
    .no-print, .no-print-layout, .pdf-hide, button {
      display: none !important;
    }
    .student-print-wrapper {
      margin: 0 !important;
      padding: 0 !important;
    }
    .student-cover-a4 {
      width: 210mm !important;
      height: 296.8mm !important;
      max-width: 210mm !important;
      max-height: 296.8mm !important;
      page-break-after: always !important;
      break-after: page !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      overflow: hidden !important;
    }
    .student-document-container {
      page-break-after: always !important;
      break-after: page !important;
      padding: 12mm 14mm !important;
      margin: 0 auto !important;
      width: 210mm !important;
      max-width: 210mm !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
    }
    .student-document-container:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .section-heading, .print-section-avoid {
      break-after: avoid !important;
      page-break-after: avoid !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
    }
    tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    td, th {
      word-break: break-word !important;
    }
  </style>
</head>
<body class="bg-white">
  ${studentEl.outerHTML}
</body>
</html>`;
  };

  const handleExportPDF = async () => {
    if (!students || students.length === 0) return;

    if (students.length === 1) {
      const s = students[0];
      const sClass = String(s.className || s.class?.className || "Lop").trim().replace(/[\\/:*?"<>|]/g, "_");
      const sCode = String(s.studentCode || s.code || "HS").trim().replace(/[\\/:*?"<>|]/g, "_");
      const sName = String(s.studentName || s.fullName || "").trim().replace(/[\\/:*?"<>|]/g, "_");
      const filename = `${sClass}_${sCode}_${sName}.pdf`;

      setIsExportingPDF(true);
      try {
        const studentHtml = buildCleanStudentHtml(s.id, filename);
        if (!studentHtml) throw new Error("Không tìm thấy nội dung học sinh để xuất");

        const res = await fetch("/api/admin/student-profiles/render-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: studentHtml, fileName: filename }),
        });

        if (!res.ok) {
          throw new Error("Máy chủ render PDF không phản hồi thành công");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn("Lỗi kết xuất PDF server, mở hộp thoại in trình duyệt:", err);
        window.print();
      } finally {
        setIsExportingPDF(false);
      }
      return;
    }

    window.print();
  };

  // Xuất theo lớp: Tạo thư mục theo Lớp và từng file PDF theo từng Học sinh (Lớp_MaHS_Hovaten.pdf)
  const handleExportZip = async () => {
    if (!students || students.length === 0) return;
    setIsExportingZip(true);
    cancelExportRef.current = false;

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Xác định tên lớp chính để đặt tên tệp ZIP và thư mục gốc
      const firstStudentClass = students[0]?.className || (classId ? `Lop_${classId}` : "Lop_SkyLine");
      const cleanClassName = String(firstStudentClass).trim().replace(/[\\/:*?"<>|]/g, "_");
      const baseFolderName = cleanClassName.startsWith("Lop_") ? cleanClassName : `Lop_${cleanClassName}`;
      const zipFileName = `${baseFolderName}.zip`;

      setZipProgress({
        current: 0,
        total: students.length,
        studentName: "",
        percent: 0,
        statusText: `Khởi tạo tiến trình xuất ${students.length} học sinh theo lớp...`,
      });

      for (let i = 0; i < students.length; i++) {
        if (cancelExportRef.current) {
          setZipProgress(null);
          setIsExportingZip(false);
          return;
        }

        const student = students[i];
        const sClass = String(student.className || cleanClassName).trim().replace(/[\\/:*?"<>|]/g, "_");
        const sCode = String(student.studentCode || `HS${i + 1}`).trim().replace(/[\\/:*?"<>|]/g, "_");
        const sName = String(student.studentName || `HocSinh_${i + 1}`).trim().replace(/[\\/:*?"<>|]/g, "_");
        const studentFileName = `${sClass}_${sCode}_${sName}.pdf`;

        setZipProgress({
          current: i + 1,
          total: students.length,
          studentName: student.studentName || `Học sinh ${i + 1}`,
          percent: Math.round(((i) / students.length) * 100),
          statusText: `Đang kết xuất PDF vector (${i + 1}/${students.length}): ${student.studentName}`,
        });

        await new Promise((resolve) => setTimeout(resolve, 30));

        const studentHtml = buildCleanStudentHtml(student.id, studentFileName);
        if (!studentHtml) {
          console.warn(`Không tìm thấy thẻ DOM cho học sinh ${student.id}`);
          continue;
        }

        let pdfBlob: Blob | null = null;
        let lastErrorMsg = "";

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const res = await fetch("/api/admin/student-profiles/render-pdf", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ html: studentHtml, fileName: studentFileName }),
            });

            if (res.ok) {
              pdfBlob = await res.blob();
              break;
            } else {
              const errData = await res.json().catch(() => ({}));
              lastErrorMsg = errData.error || `HTTP ${res.status}`;
            }
          } catch (netErr: any) {
            lastErrorMsg = netErr?.message || "Lỗi kết nối";
          }

          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 600));
          }
        }

        if (!pdfBlob) {
          console.error(`Không thể kết xuất PDF cho học sinh ${student.studentName}:`, lastErrorMsg);
          continue;
        }

        const classFolderForStudent = sClass.startsWith("Lop_") ? sClass : `Lop_${sClass}`;
        const folder = zip.folder(classFolderForStudent);
        if (folder) {
          folder.file(studentFileName, pdfBlob);
        } else {
          zip.file(`${classFolderForStudent}/${studentFileName}`, pdfBlob);
        }
      }

      if (cancelExportRef.current) {
        setZipProgress(null);
        setIsExportingZip(false);
        return;
      }

      setZipProgress({
        current: students.length,
        total: students.length,
        studentName: "",
        percent: 99,
        statusText: `Đang nén thư mục và tạo tệp ZIP [${zipFileName}]...`,
      });

      const zipBlob = await zip.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        (metadata) => {
          setZipProgress((prev) =>
            prev
              ? {
                  ...prev,
                  percent: Math.min(99, Math.round(metadata.percent)),
                  statusText: `Đang nén dữ liệu ZIP: ${Math.round(metadata.percent)}%`,
                }
              : null
          );
        }
      );

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setZipProgress({
        current: students.length,
        total: students.length,
        studentName: "",
        percent: 100,
        statusText: `Hoàn tất! Đã xuất ${students.length} hồ sơ học sinh vào tệp ${zipFileName}`,
        isDone: true,
        downloadUrl,
        zipFileName,
      });

    } catch (err: any) {
      console.error("Lỗi khi xuất tệp ZIP theo lớp:", err);
      alert("Đã xảy ra lỗi khi tạo tệp ZIP theo lớp: " + (err?.message || err));
      setZipProgress(null);
    } finally {
      setIsExportingZip(false);
    }
  };

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

          if (data.length === 1) {
            const s = data[0];
            const sClass = String(s.className || s.class?.className || "Lop").trim().replace(/[\\/:*?"<>|]/g, "_");
            const sCode = String(s.studentCode || s.code || "").trim().replace(/[\\/:*?"<>|]/g, "_");
            const sName = String(s.studentName || s.fullName || "").trim().replace(/[\\/:*?"<>|]/g, "_");
            document.title = `${sClass}_${sCode}_${sName}`;
          } else if (classId) {
            document.title = `Lop_${classId}_HoSoNangLuc`;
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
    loadConfigs()
  }, [type, academicYearId, classId, studentId])

  // Autoprint when autoprint query param is present (and not autoexportzip)
  useEffect(() => {
    if (!loading && students.length > 0 && searchParams.get("autoprint") === "1" && searchParams.get("autoexportzip") !== "1") {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, students, searchParams])

  // Auto export zip when autoexportzip query param is present
  useEffect(() => {
    if (!loading && students.length > 0 && searchParams.get("autoexportzip") === "1") {
      const timer = setTimeout(() => {
        handleExportZip()
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [loading, students, searchParams])

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
          margin: 0;
        }
        @media print {
          *, *:before, *:after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          html, body, #__next, main, main > div, div.flex.min-h-screen, .student-print-wrapper, #printable-documents-area {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            overflow: visible !important;
            max-width: 100% !important;
            width: 100% !important;
            display: block !important;
            font-family: Arial, "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 9.5pt !important;
            line-height: 1.35 !important;
            -webkit-font-smoothing: antialiased !important;
            orphans: 3 !important;
            widows: 3 !important;
          }
          .no-print-layout {
            display: none !important;
          }
          .student-cover-a4 {
            width: 210mm !important;
            height: 296mm !important;
            max-width: 210mm !important;
            max-height: 296mm !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }
          .print-cv-page {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            padding: 12mm 14mm 12mm 14mm !important;
            width: 210mm !important;
            max-width: 210mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            position: relative !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .student-print-wrapper:last-child .print-cv-page,
          .print-cv-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .section-heading, .print-section-avoid {
            break-after: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          td, th {
            word-break: break-word !important;
          }
          div, table, thead, tbody, tr, td, th {
            overflow: visible !important;
          }
        }
      ` }} />

      {/* Control bar (hidden in print mode) */}
      <div className="no-print-layout max-w-4xl mx-auto mb-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-[#00A19A]" />
          <span>Bản in Hồ sơ Học sinh: </span>
          <span className="text-[#00A19A] font-black text-sm">{students.length} học sinh</span>
        </div>

        {/* Chế độ in: Toàn bộ / Chỉ Bìa / Chỉ Hồ sơ */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPrintOption("all")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              printOption === "all" ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Trọn bộ (Bìa + Hồ sơ)</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintOption("cover")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              printOption === "cover" ? "bg-[#00A19A] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Chỉ in Bìa A4</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintOption("content")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              printOption === "content" ? "bg-[#003B3A] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Chỉ in Ruột hồ sơ</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {students.length > 1 && (
            <button
              onClick={handleExportZip}
              disabled={isExportingZip || isExportingPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-700 via-indigo-600 to-teal-600 hover:from-purple-800 hover:to-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer font-extrabold"
              title="Xuất file nén ZIP: Thư mục theo Lớp, trong lớp là từng file PDF theo Học sinh (Lớp_MaHS_Hovaten.pdf)"
            >
              {isExportingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tạo ZIP ({zipProgress?.percent || 0}%)...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4" />
                  <span>Xuất ZIP Theo Lớp (Từng file HS)</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || isExportingZip}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-xs transition-all cursor-pointer font-extrabold"
            title={students.length > 1 ? "Xuất 1 file PDF gộp toàn bộ học sinh" : "Xuất file PDF trực tiếp từ nội dung văn bản"}
          >
            {isExportingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{students.length > 1 ? "Xuất PDF Gộp Cả Lớp" : "Xuất file PDF (.pdf)"}</span>
              </>
            )}
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs transition-all cursor-pointer font-bold text-xs"
            title="Cấu hình các mục sẽ hiển thị trên Hồ sơ theo Khối và Hệ học"
          >
            <Sliders className="w-4 h-4 text-[#00A19A]" />
            <span>Cấu hình Hồ sơ</span>
          </button>
          <button
            onClick={() => {
              if (students.length === 1) {
                const s = students[0];
                const sClass = String(s.className || s.class?.className || "Lop").trim().replace(/[\\/:*?"<>|]/g, "_");
                const sCode = String(s.studentCode || s.code || "").trim().replace(/[\\/:*?"<>|]/g, "_");
                const sName = String(s.studentName || s.fullName || "").trim().replace(/[\\/:*?"<>|]/g, "_");
                document.title = `${sClass}_${sCode}_${sName}`;
              }
              window.print();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00A19A] hover:bg-[#005B55] text-white rounded-xl shadow-xs transition-all cursor-pointer font-bold"
            title="In qua hộp thoại in của trình duyệt (Ctrl + P)"
          >
            <Printer className="w-4 h-4" />
            <span>In Trình Duyệt</span>
          </button>
          <button
            onClick={() => window.close()}
            className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 text-slate-600 transition-all cursor-pointer font-bold"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Hướng dẫn khi in qua trình duyệt để không bị dính ngày giờ/URL */}
      <div className="no-print-layout max-w-4xl mx-auto mb-4 bg-teal-50 border border-teal-200 text-teal-900 px-4 py-3 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-medium shadow-xs">
        <div>
          <span className="font-extrabold text-[#003B3A]">💡 Hướng dẫn in &amp; xuất chuẩn A4 đẹp:</span>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px] text-slate-700">
            <li><strong>Tích chọn "Đồ họa nền" (Background graphics)</strong>: Để hiển thị đầy đủ hình ảnh, bảng biểu và thanh màu Sky-Line.</li>
            <li><strong>Bỏ chọn "Tiêu đề và chân trang" (Headers and footers)</strong>: Để loại bỏ ngày giờ và đường dẫn URL trên bản in.</li>
            <li><strong>Lề (Margins)</strong>: Chọn <strong>"Không" (None)</strong> hoặc <strong>"Tối thiểu" (Minimum)</strong>.</li>
          </ul>
        </div>
        <div className="flex items-center gap-2">
          {students.length > 1 && (
            <button
              onClick={handleExportZip}
              disabled={isExportingZip || isExportingPDF}
              className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Xuất ZIP Theo Lớp</span>
            </button>
          )}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || isExportingZip}
            className="shrink-0 px-3 py-1.5 bg-[#00A19A] hover:bg-[#003B3A] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Xuất PDF tự động
          </button>
        </div>
      </div>

      {/* Render list of Student CVs */}
      <div id="printable-documents-area" className="space-y-6 print:space-y-0 print:m-0 print:p-0 max-w-4xl mx-auto">
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

          const sectionVisibility = resolveStudentSectionVisibility(student, configMap);

          return (
            <div key={student.id} id={`student-print-wrapper-${student.id}`} className="student-print-wrapper space-y-6 print:space-y-0">
              {/* Trang bìa A4: Tự động gán Tên, Mã HS & Mã QR */}
              {(printOption === "all" || printOption === "cover") && (
                <StudentProfileCoverA4
                  student={{
                    studentName: student.studentName,
                    studentCode: student.studentCode,
                    vneduCode: student.vneduCode,
                    className: student.className,
                    campusName: student.campusName,
                    yearName: student.yearName || "2026-2027",
                    yearTheme: student.yearTheme || student.academicYear?.theme || null,
                  }}
                  mode="print"
                  showExtraMeta={true}
                />
              )}

              {/* Trang ruột Hồ sơ Năng lực */}
              {(printOption === "all" || printOption === "content") && (
                <div
                  className="print-cv-page bg-white border border-slate-300 shadow-md rounded-2xl p-8 print:border-none print:shadow-none print:rounded-none font-sans relative space-y-5 text-slate-800"
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
                  {student.yearTheme && (
                    <div className="text-[10px] text-teal-800 font-bold max-w-[280px] truncate" title={student.yearTheme}>
                      Chủ đề: <span className="italic text-teal-900 font-black">"{student.yearTheme}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION I: THÔNG TIN HỌC SINH */}
              <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/90 space-y-3 print-section-avoid">
                <h3 className="section-heading text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
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
              {sectionVisibility.advisoryGoals && (() => {
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

              const advisoryRows: any[] = [];
              categories.forEach(cat => {
                const matchedGoals = goals.filter((g: any) => {
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
                  matchedGoals.forEach((g: any, idx: number) => {
                    const tracking = trackings.find((t: any) =>
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

              const renderProgressBadge = (status: any) => {
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
                    <h3 className="section-heading text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <Compass className="w-4 h-4 text-indigo-500" />
                      <span>II. CỐ VẤN HỌC TẬP &amp; NHẬT KÝ THEO DÕI MỤC TIÊU</span>
                    </h3>
                    <span className="text-[9px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Phiếu Đánh Giá Kỳ Cố Vấn Học Tập
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-x-auto print:overflow-visible print:border-slate-300">
                    <table className="w-full text-left text-xs border-collapse table-fixed">
                      <thead className="bg-slate-100 text-[9px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2 border-r border-slate-200 w-[24%]">Nhóm mục tiêu (Trọng số)</th>
                          <th className="py-2 px-2 border-r border-slate-200 w-[32%]">Mục tiêu cụ thể</th>
                          <th className="py-2 px-1.5 text-center border-r border-slate-200 w-[16%]">Kết quả theo dõi</th>
                          <th className="py-2 px-1 text-center border-r border-slate-200 w-[9%]">Hoàn thành MT (1-5)</th>
                          <th className="py-2 px-1 text-center border-r border-slate-200 w-[9%]">Chủ động (1-5)</th>
                          <th className="py-2 px-1 text-center w-[10%]">Thái độ (1-5)</th>
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
              {(sectionVisibility.moetPeriodicGrades || sectionVisibility.moetTermGrades) && (
                <div className="space-y-3 print-section-avoid">
                  <h3 className="section-heading text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00A19A]" />
                      <ClipboardCheck className="w-4 h-4 text-[#00A19A]" />
                      <span>I. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET)</span>
                    </div>
                    <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Chương trình Bộ GD&amp;ĐT
                    </span>
                  </h3>

                  {/* Bảng 1: Kết quả kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2) */}
                  {sectionVisibility.moetPeriodicGrades && (
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
                  )}

                  {/* Bảng 2: Bảng điểm Học tập tổng kết (CK1, CK2, Cả năm) */}
                  {sectionVisibility.moetTermGrades && (
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
                  )}
                </div>
              )}

              {/* MÔN HỌC ĐẶC THÙ SKY-LINE (SKL) */}
              {sectionVisibility.specialSubjects && (
                <div className="space-y-2 print-section-avoid">
                  <h3 className="section-heading text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>MÔN HỌC ĐẶC THÙ SKY-LINE (SKL)</span>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Chương trình Bản sắc Sky-Line
                    </span>
                  </h3>
                  {(!student.specialGradeEntries || student.specialGradeEntries.length === 0) ? (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-center text-xs text-slate-400 italic">
                      Chưa ghi nhận đánh giá môn đặc thù Sky-Line (Chào Xuân/Xuân Hội, Giáo dục Tài chính, v.v.).
                    </div>
                  ) : (
                    <div className="border border-indigo-100 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-indigo-50/70 text-[9px] font-black text-indigo-950 uppercase tracking-wider border-b border-indigo-200">
                          <tr>
                            <th className="py-1.5 px-2.5 text-center w-8">STT</th>
                            <th className="py-1.5 px-2.5 w-1/4">Môn học / Chuyên đề</th>
                            <th className="py-1.5 px-2 text-center w-28">Đánh giá</th>
                            <th className="py-1.5 px-2.5">Nhận xét &amp; Ghi nhận của Giáo viên</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-50 font-semibold text-slate-700">
                          {student.specialGradeEntries.map((spec: any, idx: number) => {
                            const evalText = spec.resultScore !== undefined && spec.resultScore !== null
                              ? String(spec.resultScore)
                              : spec.resultText || "Đạt";
                            return (
                              <tr key={idx}>
                                <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                                <td className="py-1.5 px-2.5">
                                  <div className="font-bold text-slate-900">{spec.subjectName || spec.subjectCode || "Môn đặc thù"}</div>
                                  {spec.evalPeriod && (
                                    <div className="text-[9px] text-slate-400 font-normal">Đợt: {spec.evalPeriod}</div>
                                  )}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded">
                                    {evalText}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2.5 text-[11px] text-slate-600 font-normal italic">
                                  {spec.teacherFeedback || "Học sinh tham gia tích cực, nắm vững kiến thức thực hành kỹ năng."}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION IV: KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ */}
              {sectionVisibility.bilingualGrades && (
                <div className="space-y-2 print-section-avoid">
                  <h3 className="section-heading text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1.5">
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
                          {(bilingualTermRows.length > 0 ? (bilingualTermRows as any[]) : (bilingualPeriodicRows as any[])).map((r: any, idx: number) => {
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
              )}

              {/* SECTION VI: THÀNH TÍCH & BẢNG VÀNG KHEN THƯỞNG */}
              {sectionVisibility.achievements && (
                <div className="space-y-2 print-section-avoid">
                  <h3 className="section-heading text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>VI. THÀNH TÍCH &amp; BẢNG VÀNG KHEN THƯỞNG</span>
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
              )}

              {/* SECTION: HOẠT ĐỘNG TRẢI NGHIỆM */}
              {sectionVisibility.experientialActivities && (
                <div className="space-y-2 print-section-avoid">
                  <h3 className="section-heading text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <BookOpen className="w-4 h-4 text-sky-500" />
                    <span>HOẠT ĐỘNG TRẢI NGHIỆM</span>
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
                            <th className="py-1.5 px-2.5">Nội dung giáo dục</th>
                            <th className="py-1.5 px-2.5 text-center">Vai trò</th>
                            <th className="py-1.5 px-2.5 text-center">Kết quả</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {student.experientialActivities.slice(0, 4).map((act: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-extrabold text-[#003B3A]">{act.activityName}</td>
                              <td className="py-1.5 px-2.5 text-slate-600">{act.themeName || act.groupName || '—'}</td>
                              <td className="py-1.5 px-2.5 text-slate-600 text-[9px] leading-tight">{act.educationalContent || act.deliverables || act.themeAxisName || '—'}</td>
                              <td className="py-1.5 px-2.5 text-center">
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
              )}

              {/* SECTION VIII: NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM */}
              {sectionVisibility.homeroomTeacherComment && (
                <div className="space-y-2 print-section-avoid">
                  <h3 className="section-heading text-xs font-black text-[#003B3A] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-1.5">
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
              )}

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
                <div className="mt-6 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Hệ thống Giáo dục Sky-Line</span>
                  <span>Hồ sơ Năng lực Học sinh</span>
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

                <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Hệ thống Giáo dục Sky-Line</span>
                  <span>Phụ lục Hồ sơ Năng lực</span>
                </div>
              </div>
              </div>

            </div>
          )}
        </div>
      )
    })}
      </div>

      {/* MODAL TIẾN TRÌNH XUẤT ZIP THEO LỚP */}
      {zipProgress && (
        <div className="no-print fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#00A19A]">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm">Xuất Hồ Sơ Theo Lớp (.ZIP)</h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Thư mục theo Lớp &bull; Từng file PDF theo Học sinh</p>
                </div>
              </div>
              {zipProgress.isDone && (
                <button
                  onClick={() => setZipProgress(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Progress status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">{zipProgress.statusText}</span>
                <span className="text-[#00A19A] font-black">{zipProgress.percent}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-gradient-to-r from-[#003B3A] via-[#00A19A] to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${zipProgress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>Tiến độ: {zipProgress.current} / {zipProgress.total} học sinh</span>
                {zipProgress.studentName && (
                  <span className="text-slate-600 truncate max-w-[220px] font-bold">{zipProgress.studentName}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              {zipProgress.isDone ? (
                <>
                  {zipProgress.downloadUrl && (
                    <a
                      href={zipProgress.downloadUrl}
                      download={zipProgress.zipFileName || "HoSoHocSinh_TheoLop.zip"}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải lại file ZIP</span>
                    </a>
                  )}
                  <button
                    onClick={() => setZipProgress(null)}
                    className="px-4 py-2 bg-[#00A19A] hover:bg-[#003B3A] text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    cancelExportRef.current = true;
                    setZipProgress(null);
                    setIsExportingZip(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  Hủy tiến trình
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL CẤU HÌNH HỒ SƠ THEO KHỐI & HỆ */}
      <StudentProfileSectionConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaved={loadConfigs}
      />
    </div>
  )
}
