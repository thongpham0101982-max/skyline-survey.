"use client"

import React, { useRef, useState, useEffect } from "react"
import {
  X,
  Printer,
  Download,
  HeartHandshake,
  UserCheck,
  Users,
  Compass,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Award,
  ShieldCheck,
  RefreshCw,
  Calendar,
  Brain,
  Phone,
  MapPin,
  User,
  Clock,
  Mail,
  GraduationCap,
  FileText,
  HelpCircle,
  CheckSquare
} from "lucide-react"
import {
  ORIENTATION_RATING_OPTIONS,
  ORIENTATION_EVIDENCE_SOURCES,
  getGradeGroupKey,
  getOrientationGradeGroupConfig,
  RatingCode,
  EvidenceSource
} from "@/lib/orientation/criteria-config"

interface StudentOrientationReportModalProps {
  isOpen: boolean
  onClose: () => void
  student: any
  orientationData?: any
}

export function StudentOrientationReportModal({
  isOpen,
  onClose,
  student,
  orientationData: propOrientationData
}: StudentOrientationReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [orientationData, setOrientationData] = useState<any>(propOrientationData || null)
  const [studentInfo, setStudentInfo] = useState<any>(student)

  // Khởi tạo và fetch dữ liệu nhanh chóng, không làm đơ giao diện
  useEffect(() => {
    if (!isOpen || !student?.id) return
    setStudentInfo(student)

    const initialData = propOrientationData || student?.orientationRecord || student?.orientationData
    if (initialData) {
      setOrientationData(initialData)
      setLoading(false)
    } else {
      setLoading(true)
    }

    let isMounted = true
    const timer = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 1200)

    fetch(`/api/admin/orientation/records?studentId=${student.id}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (data.student) {
            setStudentInfo((prev: any) => ({ ...prev, ...data.student }))
          } else if (data.data?.student) {
            setStudentInfo((prev: any) => ({ ...prev, ...data.data.student }))
          }
          if (data.success && data.data) {
            setOrientationData(data.data)
          } else if (!orientationData && (student?.orientationRecord || initialData)) {
            setOrientationData(student.orientationRecord || initialData)
          }
        }
      })
      .catch(err => {
        console.error("Lỗi tải bản ghi định hướng:", err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [isOpen, student?.id, propOrientationData])

  if (!isOpen) return null

  // Xuất file PDF hoặc In A4 chuẩn đa trang (Multi-page) thông qua Isolated Print Frame
  const handlePrintOrExport = (isPdfDownload = false) => {
    try {
      if (isPdfDownload) setExportingPdf(true)
      const cleanName = (sData?.fullName || student?.fullName || "HocSinh")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "_")
      const studentCode = sData?.studentCode || student?.studentCode || "HS"
      const gradeStr = (sData?.grade || student?.grade) ? `Khoi_${sData?.grade || student?.grade}` : "DinhHuong"
      const pdfTitle = `BaoCao_DinhHuong_${gradeStr}_${studentCode}_${cleanName}`

      const printElement = printRef.current
      if (!printElement) {
        if (isPdfDownload) setExportingPdf(false)
        window.print()
        return
      }

      const existingFrame = document.getElementById("skyline-print-iframe")
      if (existingFrame) existingFrame.remove()

      const iframe = document.createElement("iframe")
      iframe.id = "skyline-print-iframe"
      iframe.style.position = "fixed"
      iframe.style.left = "-10000px"
      iframe.style.top = "0"
      iframe.style.width = "210mm"
      iframe.style.height = "297mm"
      iframe.style.border = "0"
      iframe.style.opacity = "0"
      iframe.style.pointerEvents = "none"
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument
      if (!iframeDoc) {
        if (isPdfDownload) setExportingPdf(false)
        window.print()
        return
      }

      // Chỉ lấy các stylesheet của hệ thống, loại bỏ các thẻ style global print ẩn body > *
      const styles = Array.from(
        document.querySelectorAll("link[rel='stylesheet'], style:not([data-ignore-iframe-print='true'])")
      )
        .map(node => node.outerHTML)
        .join("\n")

      iframeDoc.open()
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="vi">
          <head>
            <meta charset="utf-8">
            <title>${pdfTitle}</title>
            ${styles}
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm 8mm 8mm 8mm;
              }
              *, *:before, *:after {
                box-sizing: border-box !important;
                -webkit-box-sizing: border-box !important;
              }
              html, body {
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                overflow: visible !important;
                display: block !important;
                visibility: visible !important;
              }
              body > * {
                display: block !important;
                visibility: visible !important;
              }
              #print-direct-container, .print-container {
                display: block !important;
                visibility: visible !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                background: #ffffff !important;
              }
              /* Section không được ngắt trang (tiêu đề, thẻ nhỏ, chữ ký) */
              .print-section {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                margin-bottom: 10px !important;
              }
              /* Section cho phép phân trang mượt mà (bảng dài 10 câu hỏi) */
              .print-section-flow {
                break-inside: auto !important;
                page-break-inside: auto !important;
                margin-bottom: 10px !important;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
                max-width: 100% !important;
                table-layout: fixed !important;
              }
              thead {
                display: table-header-group !important;
              }
              tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              th, td {
                word-break: break-word !important;
                overflow-wrap: break-word !important;
                white-space: normal !important;
              }
              .no-print {
                display: none !important;
              }
            </style>
          </head>
          <body>
            <div id="print-direct-container" class="print-container">
              ${printElement.innerHTML}
            </div>
          </body>
        </html>
      `)
      iframeDoc.close()

      let hasPrinted = false
      const triggerPrint = () => {
        if (hasPrinted) return
        hasPrinted = true
        try {
          const originalTitle = document.title
          document.title = pdfTitle
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          setTimeout(() => {
            document.title = originalTitle
            if (isPdfDownload) setExportingPdf(false)
          }, 800)
        } catch (e) {
          console.error("Lỗi gọi in iframe:", e)
          if (isPdfDownload) setExportingPdf(false)
          window.print()
        }
      }

      // Chờ các link stylesheet trong iframe tải xong (tối đa 700ms) rồi mới mở hộp thoại Print/Save PDF
      const linkElements = Array.from(iframeDoc.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[]
      if (linkElements.length === 0) {
        setTimeout(triggerPrint, 250)
      } else {
        let loadedCount = 0
        const checkDone = () => {
          loadedCount++
          if (loadedCount >= linkElements.length) {
            setTimeout(triggerPrint, 150)
          }
        }
        linkElements.forEach(link => {
          if (link.sheet) {
            checkDone()
          } else {
            link.addEventListener("load", checkDone, { once: true })
            link.addEventListener("error", checkDone, { once: true })
          }
        })
        setTimeout(triggerPrint, 700)
      }
    } catch (err: any) {
      console.error("Lỗi khi mở lệnh in:", err)
      if (isPdfDownload) setExportingPdf(false)
      window.print()
    }
  }

  // Lấy cấu hình nhóm khối chuẩn hóa (1 trong 12 khối)
  const gradeConfig = getOrientationGradeGroupConfig(student?.grade)

  // Parse phỏng vấn chi tiết (Phần A, Phần B, Phần C, Thẩm định)
  let interviewList: any[] = []
  let parentItemsList: any[] = []
  let summary9Items: any = null
  let interviewVersion: string = "2026.3"
  let proposedPlacementRecommendation: string = ""
  let verificationInfo: any = null

  if (orientationData?.interviewData) {
    try {
      const parsed = typeof orientationData.interviewData === "string"
        ? JSON.parse(orientationData.interviewData)
        : orientationData.interviewData
      if (Array.isArray(parsed)) {
        interviewList = parsed
      } else if (parsed && typeof parsed === "object") {
        interviewList = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed.criteriaResults) ? parsed.criteriaResults : [])
        parentItemsList = Array.isArray(parsed.parentItems) ? parsed.parentItems : []
        summary9Items = parsed.summary9Items || null
        interviewVersion = parsed.version || "2026.3"
        proposedPlacementRecommendation = parsed.proposedPlacementRecommendation || ""
        verificationInfo = parsed.verification || null
      }
    } catch (e) {
      console.warn("Lỗi parse interviewData:", e)
    }
  }

  // Fallback nếu chưa có interviewList từ DB, tạo danh sách từ config
  if (interviewList.length === 0 && gradeConfig?.criteria) {
    interviewList = gradeConfig.criteria.map(c => ({
      questionId: c.id,
      criterionId: c.id,
      code: c.code,
      questionText: c.name,
      category: c.category,
      categoryLabel: c.categoryLabel,
      focus: c.focus,
      rating: "NORMAL",
      teacherComment: "",
      notes: ""
    }))
  }

  // Fallback 5 nhóm phụ huynh nếu chưa có
  if (parentItemsList.length === 0 && gradeConfig?.parentGroups) {
    parentItemsList = gradeConfig.parentGroups.map(p => ({
      groupId: p.id,
      code: p.code,
      category: p.category,
      categoryLabel: p.categoryLabel,
      title: p.title,
      focus: p.focus,
      answer: "",
      teacherNote: ""
    }))
  }

  // Fallback 9 mục tổng hợp nếu chưa có
  if (!summary9Items) {
    summary9Items = {
      strongPoints: orientationData?.studentStrengths || "",
      interestsMotivation: "",
      adaptabilityAutonomy: orientationData?.adaptationLevel === "CONFIDENT" ? "Thích nghi nhanh, tự tin và chủ động" : "Cần thêm thời gian làm quen",
      difficultiesNeeds: orientationData?.studentNeedsSupport || "",
      studentExpectations: "",
      parentExpectations: orientationData?.parentExpectations || "",
      alignmentDifferences: "",
      initialRecommendations: orientationData?.interviewerGeneralRemark || orientationData?.proposedPlacementRecommendation || "",
      verificationItems: ""
    }
  }

  if (!proposedPlacementRecommendation && orientationData?.proposedPlacementRecommendation) {
    proposedPlacementRecommendation = orientationData.proposedPlacementRecommendation
  }

  // Parse điểm môn học khảo sát thực tế tại Sky-Line
  const parseScores = () => {
    const res: Array<{ subject: string; score: string | number; remark?: string }> = []
    if (student?.scores && Array.isArray(student.scores)) {
      student.scores.forEach((sc: any) => {
        const subName = sc.subject?.name || sc.subjectName || "Môn khảo sát"
        const subCode = String(sc.subject?.code || "").toUpperCase()
        if (subCode === "TLY" || subCode.includes("TÂM LÝ") || subCode.includes("TAM LY")) return

        let scoreVal: any = sc.finalScore ?? sc.score ?? sc.scoreComposite ?? "-"
        if (sc.scores && typeof sc.scores === "string") {
          try {
            const arr = JSON.parse(sc.scores)
            if (Array.isArray(arr) && arr.length > 0) scoreVal = arr[arr.length - 1] ?? arr[0]
            else scoreVal = sc.scores
          } catch (e) {
            scoreVal = sc.scores
          }
        }
        res.push({
          subject: subName,
          score: scoreVal,
          remark: sc.remarks || sc.note || ""
        })
      })
    }

    const checkAndAdd = (name: string, val: any) => {
      if (val !== undefined && val !== null && val !== "") {
        const exists = res.some(r => r.subject.toLowerCase().includes(name.toLowerCase()))
        if (!exists) {
          res.push({
            subject: name,
            score: val,
            remark: "Nhập trực tiếp"
          })
        }
      }
    }

    checkAndAdd("Tiếng Anh (Viết)", orientationData?.writtenEnglishScore ?? student?.writtenEnglishScore)
    checkAndAdd("Tiếng Anh (Vấn đáp)", orientationData?.oralEnglishScore ?? student?.oralEnglishScore)
    checkAndAdd("Toán", orientationData?.mathScore ?? student?.mathScore)
    checkAndAdd("Ngữ văn", orientationData?.literatureScore ?? student?.literatureScore)

    return res
  }

  const subjectScores = parseScores()

  const ratingLabel = (rating: string) => {
    switch (rating) {
      case "CONFIDENT":
        return { label: "Thể hiện rõ", cls: "text-teal-900 bg-teal-50 border-teal-300 font-bold" }
      case "NORMAL":
        return { label: "Đang hình thành", cls: "text-blue-900 bg-blue-50 border-blue-300 font-semibold" }
      case "NEED_SUPPORT":
        return { label: "Cần tìm hiểu thêm", cls: "text-amber-900 bg-amber-50 border-amber-300 font-bold" }
      case "SPECIAL_ATTENTION":
        return { label: "Chưa đủ thông tin", cls: "text-teal-900 bg-teal-50 border-teal-300 font-bold" }
      default:
        return { label: "Đang hình thành", cls: "text-slate-800 bg-slate-50 border-slate-200 font-semibold" }
    }
  }

  const currentDateStr = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })

  // Parse dữ liệu quyết định và chỉ đạo của GĐCS
  const gdcsData = React.useMemo(() => {
    const raw = orientationData?.admissionConsultantNote
    if (!raw) return null
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      try {
        return JSON.parse(raw)
      } catch (e) {
        return { gdcsGeneralNote: raw }
      }
    }
    return { gdcsGeneralNote: raw }
  }, [orientationData?.admissionConsultantNote])

  const sData = studentInfo || student

  const isCuidLike = (val?: string | null) =>
    Boolean(val && /^(cm|cl)[a-z0-9]{15,}$/i.test(String(val).trim()))

  const resolveCampusDisplay = () => {
    const cCode = sData?.batch?.campus?.campusCode
    const cName = sData?.batch?.campus?.campusName
    if (cCode && !isCuidLike(cCode)) return cCode
    if (cName && !isCuidLike(cName)) return cName
    const adm = sData?.admissionCampus
    if (adm && !isCuidLike(adm)) return adm
    const reg = sData?.registeredCampus
    if (reg && !isCuidLike(reg)) return reg
    const bName = String(sData?.batch?.name || "")
    const m = bName.match(/\b(CS\d+)\b/i)
    if (m) return m[1].toUpperCase()
    return "Sky-Line"
  }

  let parsedKqHocTap: any = null
  const rawKq = sData?.kqHocTap
  if (typeof rawKq === "string" && rawKq.trim().startsWith("{")) {
    try {
      parsedKqHocTap = JSON.parse(rawKq)
    } catch (e) {}
  } else if (rawKq && typeof rawKq === "object") {
    parsedKqHocTap = rawKq
  }

  const findSubjectScore = (keywords: string[]) => {
    if (parsedKqHocTap?.scores && typeof parsedKqHocTap.scores === "object") {
      for (const [k, v] of Object.entries(parsedKqHocTap.scores)) {
        const normK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        if (keywords.some(kw => normK.includes(kw)) && v !== null && v !== undefined && String(v).trim() !== "") {
          return String(v)
        }
      }
    }
    const subjectArrays = [
      parsedKqHocTap?.moet?.subjects,
      parsedKqHocTap?.bilingual?.moetSubjects,
      parsedKqHocTap?.bilingual?.internationalSubjects,
      parsedKqHocTap?.foreign?.subjects,
      parsedKqHocTap?.homeschool?.subjects
    ]
    for (const arr of subjectArrays) {
      if (Array.isArray(arr)) {
        for (const sub of arr) {
          const sName = String(sub?.name || sub?.id || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
          if (keywords.some(kw => sName.includes(kw)) && sub?.score !== null && sub?.score !== undefined && String(sub.score).trim() !== "") {
            return String(sub.score)
          }
        }
      }
    }
    if (Array.isArray(sData?.scores)) {
      for (const item of sData.scores) {
        const sName = String(item?.subject?.name || item?.subjectName || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
        if (keywords.some(kw => sName.includes(kw))) {
          const val = item?.finalScore ?? item?.score ?? item?.rawScore ?? item?.gradeLevel
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            return String(val)
          }
        }
      }
    }
    return ""
  }

  const campusName = resolveCampusDisplay()
  const displayHocTap =
    parsedKqHocTap?.overallRating ||
    parsedKqHocTap?.moet?.overallRating ||
    parsedKqHocTap?.bilingual?.moetRating ||
    parsedKqHocTap?.hocTap ||
    parsedKqHocTap?.academicRating ||
    parsedKqHocTap?.nangLuc ||
    (typeof rawKq === "string" && !rawKq.trim().startsWith("{") ? rawKq : "") ||
    sData?.academicRating ||
    sData?.kqgdTieuHoc ||
    "Tốt"

  const displayRenLuyen =
    parsedKqHocTap?.moet?.conductRating ||
    parsedKqHocTap?.renLuyen ||
    parsedKqHocTap?.phamChat ||
    (typeof sData?.kqRenLuyen === "string" && !sData.kqRenLuyen.trim().startsWith("{") ? sData.kqRenLuyen : "") ||
    sData?.conductRating ||
    "Tốt"

  const displayMath =
    orientationData?.mathScore ||
    sData?.mathScore ||
    findSubjectScore(["toan", "math"]) ||
    "—"

  const displayLiterature =
    orientationData?.literatureScore ||
    sData?.literatureScore ||
    findSubjectScore(["ngu van", "tieng viet", "van", "literature"]) ||
    "—"

  const displayEnglish =
    orientationData?.writtenEnglishScore ||
    sData?.writtenEnglishScore ||
    orientationData?.oralEnglishScore ||
    sData?.oralEnglishScore ||
    findSubjectScore(["tieng anh", "ngoai ngu", "english"]) ||
    "—"

  return (
    <div id="orientation-report-modal-backdrop" className="no-print-backdrop fixed inset-0 z-[260] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      
      {/* GLOBAL PRINT STYLES FOR DIRECT WINDOW.PRINT() OR CTRL+P */}
      <style data-ignore-iframe-print="true" dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #orientation-report-printable,
          #orientation-report-printable * {
            visibility: visible !important;
          }
          #orientation-report-modal-backdrop {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            backdrop-filter: none !important;
            overflow: visible !important;
          }
          #orientation-report-main-container {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #orientation-report-printable {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          th, td {
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
          }
          .print-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 8px !important;
          }
          .print-section-flow {
            break-inside: auto !important;
            page-break-inside: auto !important;
            margin-bottom: 8px !important;
          }
        }
      `}} />

      {/* SCREEN CONTAINER (A4 Wrapper) */}
      <div id="orientation-report-main-container" className="relative bg-white w-full max-w-[900px] rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none overflow-hidden">
        
        {/* TOP BAR (HIDDEN IN PRINT) */}
        <div className="no-print px-6 py-4 bg-gradient-to-r from-[#083d39] via-[#0b524d] to-[#0f6b64] text-white flex items-center justify-between border-b border-teal-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Báo Cáo Phỏng Vấn Định Hướng Học Sinh & Trao Đổi PHHS (A4)</h3>
              <p className="text-[11px] text-teal-200 font-medium">Khổ giấy A4 chuẩn &bull; Bảng tự động co giãn vừa trang in &bull; Không bị tràn lề</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrintOrExport(true)}
              disabled={exportingPdf || loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {exportingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang chuẩn bị PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Xuất File PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handlePrintOrExport(false)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-800/80 hover:bg-teal-700 text-teal-100 rounded-xl text-xs font-bold border border-teal-600 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>In (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE REPORT CONTENT (MULTI-PAGE A4 CANVAS) */}
        <div
          id="orientation-report-printable"
          ref={printRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 text-slate-900 font-sans leading-relaxed print:overflow-visible print:p-0 print:m-0"
        >
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-700" />
              <p className="text-xs font-bold text-slate-500">Đang tổng hợp báo cáo nhận diện...</p>
            </div>
          ) : (
            <div className="space-y-3">

              {/* REPORT HEADER */}
              <div className="print-section border-b-2 border-teal-900 pb-2.5 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-black uppercase tracking-widest text-teal-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-700 inline-block"></span>
                    <span>HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Cơ sở: {campusName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Hội đồng Khảo sát &amp; Định hướng Đầu vào Tuyển sinh
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-teal-950 block">
                    Mã hồ sơ: {sData?.studentCode || "HS-KSDV"}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Phiên bản biểu mẫu: {interviewVersion}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Ngày lập: {currentDateStr}
                  </span>
                </div>
              </div>

              {/* REPORT TITLE */}
              <div className="print-section text-center space-y-0.5 py-0.5">
                <h1 className="text-sm sm:text-base font-black text-teal-950 uppercase tracking-tight">
                  PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH &amp; TRAO ĐỔI VỚI PHỤ HUYNH
                </h1>
                <p className="text-[11px] text-teal-800 font-bold">
                  {gradeConfig.label} &bull; Trọng tâm: {gradeConfig.focus}
                </p>
                <p className="text-[9.5px] text-slate-500 italic">
                  (Chuẩn hóa theo từng khối lớp &bull; Liên thông Hồ sơ tuyển sinh &amp; Hồ sơ học tập học sinh)
                </p>
              </div>

              {/* SECTION I: THÔNG TIN HỌC SINH (BẢNG 12 CỘT CHUẨN) */}
              <div className="print-section space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-700" />
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-950">
                      I. Thông Tin Học Sinh &amp; Kết Quả Đầu Vào
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-700">
                    <span>
                      GV phỏng vấn: <strong className="text-teal-950">{orientationData?.interviewerName || "Cán bộ phỏng vấn"}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Đại diện PHHS: <strong className="text-slate-900">{orientationData?.parentRepresentativeName || "Phụ huynh"}</strong>
                      {orientationData?.parentPhone ? ` (${orientationData.parentPhone})` : ""}
                    </span>
                  </div>
                </div>

                <div className="border border-teal-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse text-[9.5px]" style={{ tableLayout: "auto", width: "100%" }}>
                    <thead>
                      <tr className="bg-teal-100/80 text-[8.5px] font-black uppercase text-teal-950 border-b border-teal-200">
                        <th className="py-1 px-1.5 border-r border-teal-200/70">1. Mã HS</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70">2. Họ và tên</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70">3. Ngày sinh / Phái</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70">4. Khối đăng ký</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70">5. Hệ đào tạo</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70">6. Cơ sở</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70">7. Trường cũ</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70 text-center">8. Học tập</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70 text-center">9. Rèn luyện</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70 text-center">10. Toán</th>
                        <th className="py-1 px-1.5 border-r border-teal-200/70 text-center">11. Ngữ Văn</th>
                        <th className="py-1 px-1.5 text-center">12. Tiếng Anh</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-slate-900">
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 font-mono font-bold">
                          {sData?.studentCode || "—"}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 font-black text-teal-950">
                          {sData?.fullName || "—"}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70">
                          {sData?.dateOfBirth ? new Date(sData.dateOfBirth).toLocaleDateString("vi-VN") : "—"} ({sData?.gender || "Nam"})
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 font-bold text-teal-900">
                          {gradeConfig.label}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 font-bold">
                          {orientationData?.proposedEduSystem || sData?.surveyFormType || sData?.surveySystem || "HNS"}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 font-bold">
                          {campusName}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70">
                          {sData?.oldSchoolName || "—"}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 text-center font-bold text-emerald-900">
                          {displayHocTap}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 text-center font-bold text-sky-900">
                          {displayRenLuyen}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 text-center font-bold">
                          {displayMath}
                        </td>
                        <td className="py-1.5 px-1.5 border-r border-slate-200/70 text-center font-bold">
                          {displayLiterature}
                        </td>
                        <td className="py-1.5 px-1.5 text-center font-bold">
                          {displayEnglish}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KẾT QUẢ KHẢO SÁT CÁC MÔN HỌC (NẾU CÓ) */}
              {subjectScores.length > 0 && (
                <div className="print-section space-y-1">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    <h3 className="text-[10px] font-black uppercase text-slate-800">
                      Kết Quả Điểm Khảo Sát Năng Lực Học Thuật
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {subjectScores.map((sc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-950 font-bold text-[10px]">
                        {sc.subject}: <span className="text-teal-700">{sc.score}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION II: PHẦN A - PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH (10 NHÓM NỘI DUNG) */}
              {/* SỬ DỤNG print-section-flow ĐỂ CHO PHÉP BẢNG CHẢY TỰ NHIÊN GIỮA CÁC TRANG KHÔNG BỊ NHẢY TRANG VÔ LÝ */}
              <div className="print-section-flow space-y-1.5">
                <div className="flex items-center justify-between border-b border-teal-300 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-700" />
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-950">
                      A. Phỏng Vấn Định Hướng Học Sinh (10 Nhóm Nội Dung Chuẩn Hóa)
                    </h2>
                  </div>
                  <span className="text-[9.5px] font-bold text-teal-700">
                    Nguyên tắc: Không chấm điểm số &bull; Quan sát 4 mức mô tả
                  </span>
                </div>

                <div className="border border-teal-200 rounded-lg text-xs" style={{ width: "100%", maxWidth: "100%" }}>
                  <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed", width: "100%" }}>
                    <thead>
                      <tr className="bg-teal-100/80 text-[9.5px] font-black uppercase text-teal-950 border-b border-teal-200">
                        <th className="py-1.5 px-1 text-center" style={{ width: "5%" }}>STT</th>
                        <th className="py-1.5 px-2" style={{ width: "27%" }}>Nhóm nội dung tìm hiểu</th>
                        <th className="py-1.5 px-2" style={{ width: "27%" }}>Câu trả lời / Chia sẻ của HS</th>
                        <th className="py-1.5 px-1 text-center" style={{ width: "16%" }}>Mức quan sát</th>
                        <th className="py-1.5 px-2" style={{ width: "25%" }}>Nhận xét của Giáo viên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100 text-[10px]">
                      {interviewList.map((item, idx) => {
                        const r = ratingLabel(item.rating)
                        const studentNote = item.studentNotes || item.answer || item.notes || ""
                        const teacherCmt = item.teacherComment || (item.notes !== studentNote ? item.notes : "")
                        return (
                          <tr key={idx} className="hover:bg-teal-50/30">
                            <td className="py-1.5 px-1 text-center text-teal-900 font-bold align-top">{idx + 1}</td>
                            <td className="py-1.5 px-2 align-top">
                              <div className="font-bold text-slate-900 leading-snug">
                                {item.questionText || item.name}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-slate-800 leading-relaxed align-top">
                              {studentNote.trim() ? (
                                <span className="text-slate-900">{studentNote}</span>
                              ) : (
                                <span className="text-slate-400 italic">Chưa ghi nhận câu trả lời</span>
                              )}
                            </td>
                            <td className="py-1.5 px-1 text-center align-top">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] border inline-block leading-tight ${r.cls}`}>
                                {r.label}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-slate-800 leading-relaxed align-top">
                              {teacherCmt.trim() ? (
                                <span className="font-medium text-teal-950">{teacherCmt}</span>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION III: PHẦN B - TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH (5 NHÓM NỘI DUNG) */}
              <div className="print-section-flow space-y-1.5 pt-2">
                <div className="flex items-center justify-between border-b border-teal-300 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-700" />
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-950">
                      B. Trao Đổi Định Hướng Với Phụ Huynh Học Sinh (5 Nhóm Nội Dung)
                    </h2>
                  </div>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                    Lưu ý: Dữ liệu gia đình cung cấp là nguồn tham khảo, chưa kiểm chứng
                  </span>
                </div>

                <div className="border border-teal-200 rounded-lg text-xs" style={{ width: "100%", maxWidth: "100%" }}>
                  <table className="w-full text-left border-collapse" style={{ tableLayout: "fixed", width: "100%" }}>
                    <thead>
                      <tr className="bg-teal-100/80 text-[9.5px] font-black uppercase text-teal-950 border-b border-teal-200">
                        <th className="py-1.5 px-1 text-center" style={{ width: "5%" }}>STT</th>
                        <th className="py-1.5 px-2" style={{ width: "28%" }}>Nhóm nội dung trao đổi với PHHS</th>
                        <th className="py-1.5 px-2" style={{ width: "37%" }}>Nội dung Phụ huynh chia sẻ &amp; Kỳ vọng</th>
                        <th className="py-1.5 px-2" style={{ width: "30%" }}>Ghi nhận / Quan sát của Giáo viên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100 text-[10px]">
                      {parentItemsList.map((pItem, idx) => {
                        const pAns = pItem.answer || (
                          idx === 0 ? orientationData?.parentPersonalityNotes :
                          idx === 1 ? orientationData?.parentHealthNotes :
                          idx === 2 ? orientationData?.parentSpecialRequests :
                          idx === 3 ? orientationData?.cooperationCommitment :
                          orientationData?.parentExpectations
                        ) || ""
                        const pNote = pItem.teacherNote || ""
                        return (
                          <tr key={idx} className="hover:bg-teal-50/30">
                            <td className="py-1.5 px-1 text-center text-teal-900 font-bold align-top">{idx + 1}</td>
                            <td className="py-1.5 px-2 align-top">
                              <div className="font-bold text-slate-900 leading-snug">
                                {pItem.title}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-slate-800 leading-relaxed align-top">
                              {pAns.trim() ? (
                                <span className="text-slate-900">{pAns}</span>
                              ) : (
                                <span className="text-slate-400 italic">Chưa có thông tin ghi nhận</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-slate-800 leading-relaxed align-top">
                              {pNote.trim() ? (
                                <span className="font-medium text-teal-950">{pNote}</span>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION IV: PHẦN C - TỔNG HỢP NHẬN DIỆN VÀ ĐỊNH HƯỚNG BAN ĐẦU (9 MỤC NỘI DUNG) */}
              <div className="print-section space-y-1.5 pt-2">
                <div className="flex items-center justify-between border-b border-teal-300 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-700" />
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-teal-950">
                      C. Tổng Hợp Nhận Diện &amp; Định Hướng Ban Đầu (9 Nội Dung Chuẩn Hóa)
                    </h2>
                  </div>
                  <span className="text-[9.5px] text-teal-700 font-semibold">
                    Cơ sở xây dựng kế hoạch đồng hành sau nhập học
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* 1. Điểm mạnh nổi bật */}
                  <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <span className="text-[9.5px] font-black text-emerald-900 uppercase block mb-0.5">
                      1. Điểm mạnh nổi bật của học sinh:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.strongPoints?.trim() || orientationData?.studentStrengths?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 2. Sở thích & Động lực */}
                  <div className="p-2 bg-blue-50/70 rounded-xl border border-blue-200">
                    <span className="text-[9.5px] font-black text-blue-900 uppercase block mb-0.5">
                      2. Sở thích &amp; Động lực học tập:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.interestsMotivation?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 3. Thích nghi & Tự lập */}
                  <div className="p-2 bg-teal-50/70 rounded-xl border border-teal-200">
                    <span className="text-[9.5px] font-black text-teal-900 uppercase block mb-0.5">
                      3. Khả năng thích nghi &amp; Tự lập:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.adaptabilityAutonomy?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 4. Khó khăn, nhu cầu cần quan tâm */}
                  <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-200">
                    <span className="text-[9.5px] font-black text-amber-900 uppercase block mb-0.5">
                      4. Khó khăn, nhu cầu cần quan tâm:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.difficultiesNeeds?.trim() || orientationData?.studentNeedsSupport?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 5. Kỳ vọng của học sinh */}
                  <div className="p-2 bg-teal-50/70 rounded-xl border border-teal-200">
                    <span className="text-[9.5px] font-black text-teal-900 uppercase block mb-0.5">
                      5. Kỳ vọng của học sinh tại Sky-Line:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.studentExpectations?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 6. Kỳ vọng của phụ huynh */}
                  <div className="p-2 bg-teal-50/70 rounded-xl border border-teal-200">
                    <span className="text-[9.5px] font-black text-teal-900 uppercase block mb-0.5">
                      6. Kỳ vọng của phụ huynh đối với học sinh:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.parentExpectations?.trim() || orientationData?.parentExpectations?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 7. Điểm tương đồng / khác biệt */}
                  <div className="p-2 bg-rose-50/60 rounded-xl border border-rose-200">
                    <span className="text-[9.5px] font-black text-rose-900 uppercase block mb-0.5">
                      7. Tương đồng / Khác biệt giữa 2 nguồn:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.alignmentDifferences?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 8. Đề xuất hỗ trợ & Định hướng ban đầu */}
                  <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-200">
                    <span className="text-[9.5px] font-black text-emerald-900 uppercase block mb-0.5">
                      8. Đề xuất hỗ trợ &amp; Định hướng ban đầu:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.initialRecommendations?.trim() || proposedPlacementRecommendation?.trim() || orientationData?.interviewerGeneralRemark?.trim() || (
                        <span className="text-slate-400 italic">Chưa ghi nhận</span>
                      )}
                    </p>
                  </div>

                  {/* 9. Nội dung cần xác minh chuyên môn */}
                  <div className="p-2 bg-teal-50/70 rounded-xl border border-teal-200">
                    <span className="text-[9.5px] font-black text-teal-900 uppercase block mb-0.5">
                      9. Nội dung cần xác minh chuyên môn:
                    </span>
                    <p className="text-slate-800 text-[10px] leading-relaxed font-medium">
                      {summary9Items?.verificationItems?.trim() || (
                        <span className="text-slate-400 italic">Không có nội dung bất thường</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION IV-B: KẾT QUẢ KHẢO SÁT & ĐÁNH GIÁ TÂM LÝ HỌC ĐƯỜNG (NẾU CÓ) */}
              {(() => {
                const rawPsych = orientationData?.psychologyData
                let parsedPsych: any = null
                if (rawPsych) {
                  try {
                    parsedPsych = typeof rawPsych === "string" ? JSON.parse(rawPsych) : rawPsych
                  } catch (e) {}
                }
                const hasPsych = parsedPsych || (orientationData?.psychologyReferralStatus && orientationData.psychologyReferralStatus !== "NONE")
                if (!hasPsych) return null

                const secLabels = [
                  { label: "Mục I: Cảm xúc", max: 16 },
                  { label: "Mục II: Hành vi", max: 12 },
                  { label: "Mục III: Giao tiếp", max: 12 },
                  { label: "Mục IV: Chú ý & Học tập", max: 16 },
                  { label: "Mục V: Tư duy", max: 12 },
                  { label: "Mục VI: Động lực", max: 12 }
                ]

                return (
                  <div className="print-section p-2.5 bg-teal-50/40 rounded-xl border border-teal-200 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-700" />
                        <h3 className="text-[10.5px] font-black uppercase text-teal-950 tracking-wider">
                          Khảo Sát &amp; Kết Quả Đánh Giá Tâm Lý Học Đường (Theo Form Tâm Lý)
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-[9.5px]">
                        <span className="font-bold text-teal-900">
                          GV Tâm lý phụ trách: {orientationData?.psychologyTeacherName || parsedPsych?.assessedBy || "Tổ Tâm lý Học đường"}
                        </span>
                        {parsedPsych?.totalScore !== undefined && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-800 text-white font-black">
                            Tổng điểm: {parsedPsych.totalScore}/80đ ({parsedPsych?.evaluation?.level || "Đã đánh giá"})
                          </span>
                        )}
                      </div>
                    </div>

                    {Array.isArray(parsedPsych?.sectionScores) && parsedPsych.sectionScores.length > 0 && (
                      <div className="grid grid-cols-6 gap-1.5 text-center">
                        {secLabels.map((sec, idx) => (
                          <div key={idx} className="p-1.5 bg-white rounded-lg border border-teal-200/80">
                            <span className="text-[8.5px] font-bold text-slate-500 block">{sec.label}</span>
                            <span className="text-[10.5px] font-black text-teal-950">
                              {parsedPsych.sectionScores[idx] ?? 0}/{sec.max}đ
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-white rounded-lg border border-amber-200">
                        <span className="font-black uppercase text-amber-900 text-[9px] block">Kết luận sơ bộ (Form Tâm lý):</span>
                        <p className="text-slate-800 mt-0.5">
                          {parsedPsych?.conclusion || orientationData?.psychologyReferralReason || "Đã ghi nhận khảo sát tâm lý học đường."}
                        </p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-200">
                        <span className="font-black uppercase text-emerald-900 text-[9px] block">Khuyến nghị hỗ trợ tâm lý:</span>
                        <p className="text-slate-800 mt-0.5">
                          {parsedPsych?.recommendation || parsedPsych?.evaluation?.suggestion || "Phối hợp GVCN và Gia đình đồng hành hỗ trợ học sinh."}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* SECTION V: THẨM ĐỊNH QLCM & CHỈ ĐẠO CỦA GIÁM ĐỐC CƠ SỞ (GĐCS) */}
              <div className="print-section p-2.5 bg-teal-50/50 rounded-xl border border-teal-200 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-700" />
                    <h3 className="text-[10.5px] font-black uppercase text-teal-950 tracking-wider">
                      D. Thẩm Định QLCM &amp; Kết Luận Tiếp Nhận Tuyển Sinh GĐCS
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {verificationInfo && (
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] border ${
                        verificationInfo.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : verificationInfo.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {verificationInfo.status === "VERIFIED" ? "✓ QLCM Đã Thẩm Định" : verificationInfo.status === "REJECTED" ? "✕ Yêu Cầu Bổ Sung" : "⏳ Chờ Thẩm Định"}
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-950 border border-teal-300 font-black text-[9.5px]">
                      {student?.admissionResult === "Đạt" ? "TIẾP NHẬN CHUẨN" : (student?.admissionResult || "TIẾP NHẬN CHUẨN")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 text-[10.5px]">
                  <div>
                    <span className="text-slate-500 text-[9.5px] block font-semibold uppercase">GV phụ trách định hướng &amp; Ý kiến Thẩm định QLCM:</span>
                    <p className="text-slate-900 font-medium mt-0.5">
                      {verificationInfo?.notes || "Hồ sơ phỏng vấn định hướng đầy đủ, đúng quy trình."}
                    </p>
                    {(verificationInfo?.verifiedBy || verificationInfo?.verifierName || orientationData?.interviewerName) && (
                      <span className="text-[9.5px] text-teal-800 italic block mt-0.5">
                        GV phụ trách định hướng: {verificationInfo?.verifiedBy || verificationInfo?.verifierName || orientationData?.interviewerName}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 text-[9.5px] block font-semibold uppercase">Chỉ đạo &amp; Kết luận của Giám Đốc Cơ Sở:</span>
                    <p className="text-slate-900 font-medium mt-0.5">
                      {gdcsData?.gdcsGeneralNote || "Đồng ý tiếp nhận học sinh theo đúng quy chế tuyển sinh của Hệ thống Sky-Line."}
                    </p>
                  </div>
                </div>
              </div>

              {/* REPORT FOOTER SIGNATURES */}
              <div className="print-section pt-2 border-t border-slate-300 text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="space-y-10">
                    <span className="text-[9.5px] font-black uppercase text-slate-600 block">
                      GIÁO VIÊN PHỤ TRÁCH ĐỊNH HƯỚNG
                    </span>
                    <div>
                      <strong className="text-slate-900 text-[11px] block font-bold">
                        {orientationData?.interviewerName || verificationInfo?.verifiedBy || "Giáo viên thực hiện"}
                      </strong>
                      <span className="text-[9px] text-slate-400 italic block">Đã hoàn thành phiếu</span>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <span className="text-[9.5px] font-black uppercase text-slate-600 block">
                      QUẢN LÝ CHUYÊN MÔN
                    </span>
                    <div>
                      <strong className="text-slate-900 text-[11px] block font-bold">
                        {verificationInfo?.verifiedBy || verificationInfo?.verifierName || orientationData?.interviewerName || "Ban Chuyên môn Cơ sở"}
                      </strong>
                      <span className="text-[9px] text-slate-400 italic block">
                        {verificationInfo?.status === "VERIFIED" ? "Đã thẩm định chuyên môn" : "Xác nhận hồ sơ"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <span className="text-[9.5px] font-black uppercase text-slate-600 block">
                      GIÁM ĐỐC CƠ SỞ
                    </span>
                    <div>
                      <strong className="text-slate-900 text-[11px] block font-bold">
                        {campusName && campusName !== "Sky-Line" ? `GĐCS ${campusName}` : "Ban Giám Đốc Cơ Sở"}
                      </strong>
                      <span className="text-[9px] text-slate-400 italic block">Phê duyệt tiếp nhận</span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[8.5px] text-slate-400 italic pt-3 border-t border-slate-100 mt-2">
                  Biểu mẫu phỏng vấn định hướng chuẩn hóa Hệ thống Giáo dục Sky-Line &bull; Phân hóa theo 12 khối lớp &bull; Mã hồ sơ: {student?.studentCode || student?.id?.substring(0, 12)}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  )
}
