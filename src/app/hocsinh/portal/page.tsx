"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ClipboardCheck,
  Compass,
  Heart,
  Sparkles,
  ArrowRight,
  Award,
  Camera,
  ShieldCheck,
  BookOpen,
  ChevronRight,
  Activity,
  Target,
  Shield,
  Bell,
  GraduationCap
} from "lucide-react"
import { useCampusTheme } from "@/hooks/useCampusTheme"
import { UserWelcomeCard } from "@/components/UserWelcomeCard"
import { SkylineFlagMascot } from "@/components/reflection-pride/SkylineFlagMascot"

function parseGradeNumber(className: string): string {
  if (!className) return "10"
  const str = className.toUpperCase().trim()
  const match = str.match(/(?:KHỐI|LỚP|K)?\s*(\d{1,2})/)
  if (match && match[1]) {
    const num = parseInt(match[1], 10)
    if (num >= 1 && num <= 12) return String(num)
  }
  return "10"
}

export default function StudentPortalHomePage() {
  const [studentName, setStudentName] = useState("")
  const [className, setClassName] = useState("")
  const [studentCode, setStudentCode] = useState("")
  const [gradeNum, setGradeNum] = useState("10")
  const [campusName, setCampusName] = useState("")
  const [academicYearName, setAcademicYearName] = useState("")
  const [academicYearTheme, setAcademicYearTheme] = useState("")
  const [academicYearPillars, setAcademicYearPillars] = useState<any[]>([])
  const [activePillarDetail, setActivePillarDetail] = useState<any | null>(null)
  const [intlExamResults, setIntlExamResults] = useState<any[]>([])
  const [intlHighlights, setIntlHighlights] = useState<any[]>([])
  const [reflectionTaskInfo, setReflectionTaskInfo] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/reflection-pride/student", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(refData => {
        if (refData && refData.eligible) {
          setReflectionTaskInfo(refData)
        }
      })
      .catch(() => {})

    fetch("/api/hocsinh/me", { cache: "no-store" })
      .then(r => {
        if (!r.ok) {
          window.location.href = "/login"
          return null
        }
        return r.json()
      })
      .then(data => {
        if (data && data.studentCode) {
          setStudentName(data.studentName)
          setStudentCode(data.studentCode)
          setClassName(data.className || "Lớp Học Sinh")
          setCampusName(data.campusName || "Sky-Line")
          setGradeNum(
            data.grade
              ? String(data.grade).replace("K", "")
              : parseGradeNumber(data.className)
          )
          setAcademicYearName(data.academicYearName || "")
          setAcademicYearTheme(data.academicYearTheme || "")
          if (Array.isArray(data.intlExamResults)) {
            setIntlExamResults(data.intlExamResults)
          }
          if (Array.isArray(data.intlHighlights)) {
            setIntlHighlights(data.intlHighlights)
          }
          if (data.academicYearPillars) {
            try {
              const p =
                typeof data.academicYearPillars === "string"
                  ? JSON.parse(data.academicYearPillars)
                  : data.academicYearPillars
              if (Array.isArray(p)) setAcademicYearPillars(p)
            } catch (e) {}
          }
          localStorage.setItem("currentStudent", JSON.stringify(data))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const campusTheme = useCampusTheme(campusName || className || "CS1")

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-teal-900 font-extrabold text-sm animate-pulse space-y-3">
        <div className="w-10 h-10 border-4 border-[#003B3A] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="tracking-wide text-xs">Đang tải thông tin Cổng Học Sinh Sky-Line...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans text-slate-800 pb-16 pt-1 animate-in fade-in duration-500">
      {/* 1. HERO BANNER ĐỒNG BỘ NHẬN DIỆN TRƯỜNG HỌC SKY-LINE (CHUẨN PHHS) */}
      <UserWelcomeCard
        userName={studentName}
        greetingTitle={`Xin chào, ${studentName}!`}
        greetingSubtitle={`Chúc em một ngày học tập tràn đầy cảm hứng, chủ động thiết lập mục tiêu năm học Khối ${gradeNum} và mở khóa hành động bứt phá!`}
        campusName={campusTheme.name}
        campusCode={campusTheme.code}
        roleBadgeText="CỔNG HỌC SINH SKY-LINE"
        teacherCode={studentCode}
        codeLabel="Mã HS"
        academicYear={academicYearName || "2026-2027"}
        showAcademicYear={true}
        showPasswordChange={false}
        customMetaChips={
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/95 border border-slate-200/80 text-slate-700 shadow-2xs">
              <span>🏫 Lớp: {className}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 border border-amber-200/80 text-amber-800 shadow-2xs">
              <span>🎓 Khối {gradeNum}</span>
            </span>
            {academicYearTheme && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-50 border border-teal-200/80 text-teal-800 shadow-2xs">
                <Target className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                <span>Chủ đề: &ldquo;{academicYearTheme}&rdquo;</span>
              </span>
            )}
          </>
        }
        customActions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              5 Trụ cột:
            </span>
            {(academicYearPillars.length > 0
              ? academicYearPillars
              : [
                  {
                    id: "TRI_TUE",
                    name: "Trí tuệ",
                    focus:
                      "Phát triển tư duy độc lập, phản biện, sáng tạo khoa học và học tập xuất sắc"
                  },
                  {
                    id: "THE_CHAT",
                    name: "Thể chất",
                    focus:
                      "Rèn luyện thể lực bền bỉ, phát triển chiều cao và lối sống năng động lành mạnh"
                  },
                  {
                    id: "TAM_HON",
                    name: "Tâm hồn",
                    focus:
                      "Nuôi dưỡng lòng nhân ái, sự trung thực, bản sắc văn hóa Việt và lòng biết ơn"
                  },
                  {
                    id: "KY_NANG",
                    name: "Kỹ năng",
                    focus:
                      "Thành thạo kỹ năng tự lập, sinh tồn, giao tiếp, hợp tác và giải quyết vấn đề"
                  },
                  {
                    id: "HOI_NHAP",
                    name: "Hội nhập",
                    focus:
                      "Năng lực song ngữ quốc tế, tư duy công dân toàn cầu và làm chủ công nghệ số"
                  }
                ]
            ).map((p: any, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivePillarDetail(p)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white hover:bg-teal-50 text-slate-700 hover:text-[#00A19A] transition-all border border-slate-200/80 shadow-2xs cursor-pointer"
                title="Bấm để xem định hướng rèn luyện"
              >
                {p.name}
              </button>
            ))}
          </div>
        }
      />

      {/* 1B. NHIỆM VỤ MỚI: HÀNH TRÌNH TRƯỞNG THÀNH 5 PHẨM CHẤT & PRIDE NPS (CHỈ HIỂN THỊ CHO KHỐI 4-12) */}
      {(reflectionTaskInfo?.eligible ?? (Number(gradeNum) >= 4 && Number(gradeNum) <= 12)) && (
        reflectionTaskInfo?.hasOpenTask && reflectionTaskInfo?.activePeriod ? (
          <SkylineFlagMascot
            variant={reflectionTaskInfo?.reflection?.status === "SUBMITTED" ? "celebration" : "notification"}
            badgeText={`HÀNH TRÌNH TRƯỞNG THÀNH • KHỐI ${gradeNum} • KỲ ĐANG MỞ`}
            title={
              reflectionTaskInfo?.reflection?.status === "SUBMITTED"
                ? `Bạn đã hoàn thành Tự nhìn nhận 5 Phẩm chất (${reflectionTaskInfo.activePeriod.title})`
                : `Nhiệm vụ mới: ${reflectionTaskInfo.activePeriod.title}`
            }
            message={
              reflectionTaskInfo.activePeriod.guidelineMascotMsg ||
              "Cùng Linh vật Sky-Line cầm cờ nhìn lại kết quả học tập, tự đánh giá 5 phẩm chất theo 14 tiêu chí, đặt mục tiêu phát triển bản thân và phản hồi khảo sát Tự hào Sky-Line (Pride NPS) ẩn danh nhé!"
            }
            actionButton={
              <Link
                href="/hocsinh/portal/reflection"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-purple-950 shadow-md transition hover:bg-amber-300"
              >
                <span>
                  {reflectionTaskInfo?.reflection?.status === "SUBMITTED"
                    ? "Xem lại Hành trình trưởng thành & Phản hồi Pride NPS"
                    : "Bắt đầu Hành trình trưởng thành (7 bước)"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <SkylineFlagMascot
            variant="guideline"
            badgeText={`HÀNH TRÌNH TRƯỞNG THÀNH • KHỐI ${gradeNum} • ${
              reflectionTaskInfo?.periodState === "CLOSED" ? "ĐÃ ĐÓNG KỲ" : "CHƯA MỞ KỲ MỚI"
            }`}
            title="Hành trình Trưởng thành 5 Phẩm chất & Tự hào Sky-Line (Pride NPS)"
            message="Cùng Linh vật Sky-Line cầm cờ theo dõi kết quả học tập - rèn luyện, tự nhìn nhận 5 phẩm chất theo 14 tiêu chí (Trách nhiệm, Yêu thương, Tự lập, Hợp tác, Tự hào Sky-Line) và đặt mục tiêu phát triển bản thân khi Ban KT&ĐBCL mở kỳ khảo sát."
            actionButton={
              <Link
                href="/hocsinh/portal/reflection"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-purple-800"
              >
                <span>Mở Hành trình trưởng thành (7 bước)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        )
      )}

      {/* 2. HỒ SƠ CHỨNG CHỈ & KẾT QUẢ KHẢO THÍ QUỐC TẾ (NẾU CÓ) */}
      {(intlExamResults.length > 0 || intlHighlights.length > 0) && (
        <div className="bg-gradient-to-r from-[#003B3A] via-[#005250] to-[#007796] rounded-3xl p-6 text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center">
                <Award className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                  VINH DANH HỘI NHẬP QUỐC TẾ SKY-LINE
                </span>
                <h2 className="text-base sm:text-lg font-black mt-0.5">
                  Chứng Chỉ & Kết Quả Khảo Thí Quốc Tế Của Em ({intlExamResults.length})
                </h2>
              </div>
            </div>
            <Link
              href="/hocsinh/portal/nhat-ky-co-van"
              className="text-xs font-extrabold px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Xem Nhật ký Cố vấn & Lời chúc GVCN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {intlHighlights.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 text-xs space-y-1">
              <div className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Thông báo từ {intlHighlights[0].teacherName || "Ban KT&ĐBCL & GVCN"}:
                </span>
              </div>
              <p className="text-white/95 leading-relaxed whitespace-pre-line">
                {intlHighlights[0].comment}
              </p>
            </div>
          )}

          {intlExamResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {intlExamResults.map((r: any) => (
                <div
                  key={r.id}
                  className="bg-white/95 text-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                        {r.academicYearText} • {r.examType}
                      </span>
                      <div className="text-sm font-black text-slate-900 mt-1">
                        {r.yleTotalShields !== null && r.yleTotalShields !== undefined
                          ? `${r.yleTotalShields}/15 Khiên (${r.yleResultCode || ""})`
                          : r.camOverallScale
                          ? `Scale ${r.camOverallScale} • ${r.camOfficialGrade || ""} (${
                              r.camCefrLevel || ""
                            })`
                          : r.ieltsOverallBand
                          ? `IELTS Overall Band ${r.ieltsOverallBand}`
                          : "Đã hoàn thành kỳ thi"}
                      </div>
                    </div>
                    {r.certificate?.certificateStatus && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {r.certificate.certificateStatus === "ISSUED_TO_STUDENT"
                          ? "Đã nhận chứng chỉ"
                          : "Đã có kết quả/CC tại trường"}
                      </span>
                    )}
                  </div>

                  {r.skillResults && r.skillResults.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {r.skillResults.map((sk: any) => (
                        <span
                          key={sk.id}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold"
                        >
                          {sk.componentCode}: {sk.numericScore}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. KHỐI THẺ TÍNH NĂNG CHÍNH (ACTION HUB 4 CỘT — CHUẨN GIAO DIỆN PHHS) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Hệ Thống Học Tập, Rèn Luyện & Cố Vấn 3 Chiều</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Nền tảng liên thông trực tiếp giữa Học sinh, Giáo viên Chủ nhiệm / Cố vấn học tập và Gia đình Sky-Line.
            </p>
          </div>
          <span
            className="text-[11px] font-black px-3 py-1 rounded-full self-start sm:self-auto border"
            style={{
              backgroundColor: campusTheme.lightAccentBg,
              color: campusTheme.primaryColor,
              borderColor: campusTheme.borderSubtle
            }}
          >
            Học sinh: {studentName} ({className})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CARD 0: HÀNH TRÌNH TRƯỞNG THÀNH 5 PHẨM CHẤT & PRIDE NPS (KHỐI 4-12) */}
          {(reflectionTaskInfo?.eligible ?? (Number(gradeNum) >= 4 && Number(gradeNum) <= 12)) && (
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shadow-inner border border-purple-200 group-hover:scale-105 transition-transform">
                    <Award className="w-7 h-7" />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      reflectionTaskInfo?.hasOpenTask
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}
                  >
                    {reflectionTaskInfo?.hasOpenTask
                      ? reflectionTaskInfo?.reflection?.status === "SUBMITTED"
                        ? "Đã hoàn thành"
                        : "Kỳ đang mở"
                      : reflectionTaskInfo?.periodState === "CLOSED"
                      ? "Đã đóng kỳ"
                      : "Khối 4–12"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest block">
                    KPI IP2.1 • 5 PHẨM CHẤT & PRIDE NPS
                  </span>
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-purple-700 transition-colors mt-0.5">
                    Hành Trình Trưởng Thành
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Tự nhìn nhận <strong className="text-slate-700">5 phẩm chất theo 14 tiêu chí</strong>, bổ sung minh chứng, đặt mục tiêu bản thân và phản hồi <strong className="text-slate-700">Pride NPS ẩn danh</strong>.
                </p>
              </div>

              <Link
                href="/hocsinh/portal/reflection"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-purple-200 transition-all active:scale-95 text-center cursor-pointer"
              >
                <span>
                  {reflectionTaskInfo?.hasOpenTask
                    ? "Vào Hành trình trưởng thành"
                    : "Xem Hành trình trưởng thành"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* CARD 1: HỒ SƠ ĐÁNH GIÁ NĂNG LỰC (BIỂU ĐỒ RADAR) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-inner border group-hover:scale-105 transition-transform"
                style={{
                  backgroundColor: campusTheme.lightAccentBg,
                  borderColor: campusTheme.borderSubtle
                }}
              >
                <Activity className="w-7 h-7" style={{ color: campusTheme.primaryColor }} />
              </div>
              <div>
                <span
                  className="text-[10px] font-black uppercase tracking-widest block"
                  style={{ color: campusTheme.primaryColor }}
                >
                  TIỆN ÍCH NỔI BẬT
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-teal-700 transition-colors mt-0.5">
                  Radar Năng Lực
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Theo dõi trực quan các trục năng lực môn học qua biểu đồ mạng nhện đa chiều, điểm tích lũy và chuẩn đầu ra từng học kỳ.
              </p>
            </div>

            <Link
              href="/hocsinh/portal/danh-gia-nang-luc"
              className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${campusTheme.buttonGradient} text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center cursor-pointer`}
            >
              <span>Khám phá Radar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 2: HƯỚNG NGHIỆP • SKL_PSYCH (5 BỘ CÔNG CỤ CHUẨN HÓA) */}
          <div className="bg-white rounded-3xl p-6 border border-purple-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#5B2D8B] flex items-center justify-center font-bold shadow-inner border border-purple-100 group-hover:scale-105 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#5B2D8B] uppercase tracking-widest block">
                  HƯỚNG NGHIỆP • SKL_PSYCH
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#5B2D8B] transition-colors mt-0.5">
                  Khảo Sát Tâm Lý & Hướng Nghiệp
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Hệ thống <strong className="text-slate-700">5 bộ công cụ chuẩn mực (DISC, EPI, HOLLAND, EQ Lyusin, MBTI)</strong> giúp khám phá tính cách, sở thích nghề nghiệp và liên kết Sổ Mục tiêu.
              </p>
            </div>

            <Link
              href="/hocsinh/portal/khao-sat-holland"
              className="w-full py-3.5 rounded-2xl bg-[#5B2D8B] hover:bg-[#4A2273] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-purple-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Mở 5 Bộ Công Cụ SKL_PSYCH</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 3: SỔ MỤC TIÊU NĂM HỌC & SPRINT 7 NGÀY */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-inner border group-hover:scale-105 transition-transform"
                style={{
                  backgroundColor: campusTheme.lightBg,
                  borderColor: campusTheme.borderSubtle
                }}
              >
                <Compass className="w-7 h-7" style={{ color: campusTheme.darkColor }} />
              </div>
              <div>
                <span
                  className="text-[10px] font-black uppercase tracking-widest block"
                  style={{ color: campusTheme.primaryColor }}
                >
                  3 GIAI ĐOẠN • SPRINT 7N
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-slate-800 transition-colors mt-0.5">
                  Sổ Mục Tiêu SMART
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xây dựng 4 nhóm mục tiêu năm học, ký cam kết cá nhân và thực hiện quy trình mở khóa rào cản với <strong className="text-slate-700">Sprint hành động 7 ngày</strong>.
              </p>
            </div>

            <Link
              href="/hocsinh/portal/muc-tieu"
              className="w-full py-3.5 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 text-center cursor-pointer"
              style={{ backgroundColor: campusTheme.darkColor }}
            >
              <span>Mở Sổ Mục Tiêu</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 4: CỐ VẤN HỌC TẬP & NHẬT KÝ 1:1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shadow-inner border border-sky-100 group-hover:scale-105 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest block">
                  ĐỒNG HÀNH 3 CHIỀU
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-600 transition-colors mt-0.5">
                  Nhật Ký Cố Vấn 1:1
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Xem nhận xét từ Thầy Cô GVCN/CVHT, theo dõi lịch gặp cố vấn 1:1, thực hiện tự đánh giá định kỳ và viết nhật ký phản tư.
              </p>
            </div>

            <Link
              href="/hocsinh/portal/nhat-ky-co-van"
              className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-sky-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Mở Nhật Ký Cố Vấn</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 5: KHẢO SÁT ĐỊNH KỲ */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-inner border border-amber-100 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest block">
                  KHẢO SÁT TRẢI NGHIỆM
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors mt-0.5">
                  Khảo Sát Định Kỳ
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Đóng góp ý kiến về môi trường học đường, các môn học và hoạt động trải nghiệm thực tế dành cho Lớp {className}.
              </p>
            </div>

            <Link
              href="/hocsinh/hs-khaosat/danh-sach"
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Xem & Làm khảo sát</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 6: TRUNG TÂM THÔNG BÁO */}
          <div className="bg-white rounded-3xl p-6 border border-[#E9D8FD] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#F6F0FB] text-[#6E3D89] flex items-center justify-center font-bold shadow-inner border border-[#E9D8FD] group-hover:scale-105 transition-transform">
                <Bell className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#6E3D89] uppercase tracking-widest block">
                  KHẢO THÍ • GIÁO VIÊN • HỌC TẬP
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#6E3D89] transition-colors mt-0.5">
                  Trung Tâm Thông Báo
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Nhận thông báo chính thức về <strong className="text-slate-700">Lịch kiểm tra, Phòng thi, Kết quả khảo thí</strong> và dặn dò từ Thầy Cô GVCN / GVBM.
              </p>
            </div>

            <Link
              href="/hocsinh/portal/thong-bao"
              className="w-full py-3.5 rounded-2xl bg-[#6E3D89] hover:bg-[#5B3172] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-purple-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Mở Hộp Thư Thông Báo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 7: HỒ SƠ & ẢNH THẺ ĐIỆN TỬ */}
          <div className="bg-white rounded-3xl p-6 border border-teal-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold shadow-inner border border-teal-100 group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#00A19A] uppercase tracking-widest block">
                  HỒ SƠ HỌC SINH 360°
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-[#00A19A] transition-colors mt-0.5">
                  Ảnh Thẻ & Hồ Sơ Số
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Cập nhật ảnh chân dung cho <strong className="text-slate-700">thẻ học sinh điện tử</strong> và kiểm tra thông tin định danh cá nhân trên hệ thống Sky-Line.
              </p>
            </div>

            <Link
              href="/hocsinh/portal/upload-anh"
              className="w-full py-3.5 rounded-2xl bg-[#00A19A] hover:bg-[#008983] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-teal-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Cập nhật ảnh thẻ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CARD 8: EM CẦN HỖ TRỢ (SOS) */}
          <div className="bg-white rounded-3xl p-6 border border-rose-200/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group">
            <div className="space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-inner border border-rose-100 group-hover:scale-105 transition-transform">
                <Heart className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest block">
                  LẮNG NGHE & CHIA SẺ
                </span>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-rose-600 transition-colors mt-0.5">
                  Em Cần Hỗ Trợ (SOS)
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Khi gặp khó khăn về học tập, tâm lý hoặc quan hệ bạn bè, hãy gửi lời nhắn bảo mật tới Thầy Cô GVCN và Phòng Tâm lý học đường.
              </p>
            </div>

            <Link
              href="/hocsinh/portal/ho-tro"
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Gửi lời nhắn hỗ trợ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. BANNER DẶN DÒ & THÔNG ĐIỆP ĐỒNG HÀNH (CHUẨN PHHS) */}
      <div
        className="rounded-3xl p-5 sm:p-6 border transition-all flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          backgroundColor: campusTheme.lightAccentBg,
          borderColor: campusTheme.borderSubtle
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: campusTheme.primaryColor,
              color: "#FFFFFF"
            }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">
              Kênh Thông Tin & Đồng Hành Chính Thống Của Hệ Thống Giáo Dục Sky-Line
            </h4>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Mọi dữ liệu mục tiêu SMART, khảo sát Holland và nhật ký cố vấn của em được bảo mật và đồng bộ trực tiếp cùng Thầy Cô GVCN.
            </p>
          </div>
        </div>

        <Link
          href="/hocsinh/portal/nhat-ky-co-van"
          className="inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl bg-white text-slate-800 shadow-xs border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
        >
          <span>Xem lời dặn GVCN</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Modal Chi tiết Trụ Cột Phát Triển */}
      {activePillarDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-[#00A19A] flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider">
                    Trụ cột phát triển Sky-Line
                  </span>
                  <h3 className="text-base font-black text-slate-800">
                    {activePillarDetail.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActivePillarDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200/80 space-y-2">
              <span className="text-[11px] font-black text-[#003B3A] uppercase tracking-wide">
                🎯 Định hướng rèn luyện năm học {academicYearName}:
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {activePillarDetail.focus ||
                  "Phát triển toàn diện và nâng cao năng lực cá nhân theo chuẩn Sky-Line."}
              </p>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => setActivePillarDetail(null)}
                className="w-full py-2 text-xs font-bold text-white bg-[#00A19A] hover:bg-[#003B3A] rounded-xl transition-colors cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
