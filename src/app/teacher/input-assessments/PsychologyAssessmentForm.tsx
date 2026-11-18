"use client"
// @ts-nocheck

import React, { useState, useEffect } from "react"
import {
    ClipboardCheck,
    Sparkles,
    Save,
    Info,
    User,
    MessageSquare,
    AlertCircle,
    ChevronRight,
    CheckCircle2,
    Mail,
    Send,
    Building2,
    Check,
    X,
    ShieldAlert,
    ShieldCheck,
    Award,
    Printer,
    Calendar,
    Users,
    UserCheck
} from "lucide-react"

import {
    questionsData,
    defaultQuestions,
    scaleOptions,
    Question,
    Section,
    QuestionsData,
    grade1Questions,
    grades2to5Questions,
    grades6to9Questions,
    grades10to12Questions
} from "@/lib/orientation/psychologyQuestions"

export { questionsData, defaultQuestions }

const DEFAULT_GIAOVU_MAP: Record<string, string> = {
    CS1: "phuongvt@skylineschool.edu.vn, thuda@skylineschool.edu.vn",
    CS2: "thuda@skylineschool.edu.vn, dunglp@skylineschool.edu.vn",
    CS3: "thuda@skylineschool.edu.vn",
    CS4: "bichtramtt@skylineschool.edu.vn",
    CS5: "dunglp@skylineschool.edu.vn"
}

const DEFAULT_TUYENSINH_MAP: Record<string, string> = {
    CS1: "thuongttn@skylineschool.edu.vn",
    CS2: "hoaipt@skylineschool.edu.vn, dinhnth@skylineschool.edu.vn, doanhtt@skylineschool.edu.vn, huyennt@skylineschool.edu.vn",
    CS3: "thungatt@skylineschool.edu.vn, hapvy@skylineschool.edu.vn",
    CS4: "senttt@skylineschool.edu.vn, anhntm@skylineschool.edu.vn",
    CS5: "linhnmh@skylineschool.edu.vn, quyenttx@skylineschool.edu.vn"
}

function isLegacyAliasEmail(emailStr: string): boolean {
    return /^(giaovu|tuyensinh|tuvan)\.cs\d+@skylineschool\.edu\.vn$/i.test(String(emailStr || "").trim())
}

function cleanStaffEmails(rawEmail: string, fallback: string): string {
    const cleaned = String(rawEmail || "")
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@") && !isLegacyAliasEmail(e))
        .join(", ")
    return cleaned || fallback
}

export default function PsychologyAssessmentForm({ student, user, onSave, isLocked, onPrintPsychologyPdf }: any) {
    const rawGrade = String(student?.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim()
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default"

    const sections = questionsData[currentGrade] || defaultQuestions
    const isGrades1to5 = ["1", "2", "3", "4", "5"].includes(currentGrade)
    const isGrades6to12 = ["6", "7", "8", "9", "10", "11", "12"].includes(currentGrade)
    const isScoredForm = isGrades1to5 || isGrades6to12 || sections.length === 6

    const [scores, setScores] = useState<number[]>(Array(20).fill(-1))
    const [notes, setNotes] = useState<string[]>(Array(20).fill(""))
    const [conclusion, setConclusion] = useState("")
    const [recommendation, setRecommendation] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [activeSection, setActiveSection] = useState(0)

    // Đánh dấu thủ công học sinh có dấu hiệu tâm lý (trường hợp điểm <= 15 nhưng GV quan sát thấy biểu hiện đặc biệt)
    const [manualPsychSignsFlag, setManualPsychSignsFlag] = useState(false)

    // Lược sử đánh giá
    const [historyList, setHistoryList] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

    // Trạng thái Báo Cáo & Gửi Email cho GĐCS (CC Giáo vụ cơ sở, Tư vấn cơ sở)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [gdcsList, setGdcsList] = useState<any[]>([])
    const [selectedGdcsEmail, setSelectedGdcsEmail] = useState("")
    const [selectedGdcsName, setSelectedGdcsName] = useState("")
    const [selectedCampusCode, setSelectedCampusCode] = useState("CS1")
    const [ccGiaovuEmail, setCcGiaovuEmail] = useState(DEFAULT_GIAOVU_MAP.CS1)
    const [ccTuyensinhEmail, setCcTuyensinhEmail] = useState(DEFAULT_TUYENSINH_MAP.CS1)
    const [giaovuStaffList, setGiaovuStaffList] = useState<any[]>([])
    const [tuvanStaffList, setTuvanStaffList] = useState<any[]>([])
    const [proposedAction, setProposedAction] = useState<"DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER">("DIRECT_PARENT_MEETING")
    const [messageToGdcs, setMessageToGdcs] = useState("")
    const [sendingReport, setSendingReport] = useState(false)
    const [reportSentInfo, setReportSentInfo] = useState<any>(null)
    const [digitalSignature, setDigitalSignature] = useState<any>(null)

    // Trạng thái GĐCS xác nhận nội dung làm việc liên quan
    const [gdcsResponse, setGdcsResponse] = useState<any>(null)
    const [campusTeachers, setCampusTeachers] = useState<any[]>([])
    const [directiveResponseType, setDirectiveResponseType] = useState<"DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER">("DIRECT_PARENT_MEETING")
    const [directiveMeetingTime, setDirectiveMeetingTime] = useState("")
    const [directiveMeetingLocation, setDirectiveMeetingLocation] = useState("Phòng Giám đốc Cơ sở")
    const [directiveParentContent, setDirectiveParentContent] = useState("")
    const [directiveParticipants, setDirectiveParticipants] = useState("GĐCS, Giáo vụ cơ sở, Tư vấn cơ sở, GV Tâm lý, GVCN")
    const [directiveAgenda, setDirectiveAgenda] = useState("")
    const [directiveDelegatedTeacherId, setDirectiveDelegatedTeacherId] = useState("")
    const [directiveDelegatedTeacherName, setDirectiveDelegatedTeacherName] = useState("")
    const [directiveDelegatedTeacherEmail, setDirectiveDelegatedTeacherEmail] = useState("")
    const [directiveDelegationDuration, setDirectiveDelegationDuration] = useState("4 tuần đầu năm học")
    const [directiveDelegationNote, setDirectiveDelegationNote] = useState("")
    const [directiveGeneralNote, setDirectiveGeneralNote] = useState("")
    const [confirmingDirective, setConfirmingDirective] = useState(false)
    const [oneTouchConfirmMode, setOneTouchConfirmMode] = useState(true)
    const [showAdvancedDirectiveFields, setShowAdvancedDirectiveFields] = useState(false)

    // Tải danh sách GĐCS, Giáo vụ CS, Tư vấn CS và kiểm tra lịch sử đã gửi email GĐCS
    useEffect(() => {
        const fetchGdcsInfo = async () => {
            try {
                const sId = student?.id || ""
                const url = sId
                    ? `/api/admin/orientation/psychology-referral?studentId=${sId}`
                    : `/api/admin/orientation/psychology-referral?action=getGdcsList`

                const res = await fetch(url)
                if (res.ok) {
                    const data = await res.json()
                    const list = data.gdcsList || []
                    setGdcsList(list)
                    if (Array.isArray(data.campusTeachers)) {
                        setCampusTeachers(data.campusTeachers)
                    }

                    if (Array.isArray(data.giaovuStaff)) {
                        setGiaovuStaffList(data.giaovuStaff)
                    }
                    if (Array.isArray(data.tuvanStaff)) {
                        setTuvanStaffList(data.tuvanStaff)
                    }

                    if (data.psychologyData?.hasPsychologySigns) {
                        setManualPsychSignsFlag(true)
                    }

                    if (data.psychologyData?.reportedToGdcs) {
                        const rep = data.psychologyData.reportedToGdcs
                        setReportSentInfo(rep)
                        if (rep.messageToGdcs) setMessageToGdcs(rep.messageToGdcs)
                        if (rep.proposedAction) setProposedAction(rep.proposedAction)
                        if (Array.isArray(rep.giaovuStaff) && rep.giaovuStaff.length > 0) setGiaovuStaffList(rep.giaovuStaff)
                        if (Array.isArray(rep.tuvanStaff) && rep.tuvanStaff.length > 0) setTuvanStaffList(rep.tuvanStaff)
                    }

                    if (data.psychologyData?.gdcsDirectiveRequest?.proposedAction) {
                        setProposedAction(data.psychologyData.gdcsDirectiveRequest.proposedAction)
                        setDirectiveResponseType(data.psychologyData.gdcsDirectiveRequest.proposedAction)
                    }

                    if (data.psychologyData?.gdcsResponse) {
                        const resp = data.psychologyData.gdcsResponse
                        setGdcsResponse(resp)
                        if (resp.responseType) setDirectiveResponseType(resp.responseType)
                        if (resp.generalDirectiveNote) setDirectiveGeneralNote(resp.generalDirectiveNote)
                        if (Array.isArray(resp.giaovuStaff) && resp.giaovuStaff.length > 0) setGiaovuStaffList(resp.giaovuStaff)
                        if (Array.isArray(resp.tuvanStaff) && resp.tuvanStaff.length > 0) setTuvanStaffList(resp.tuvanStaff)
                        if (resp.details) {
                            if (resp.details.meetingTime) setDirectiveMeetingTime(resp.details.meetingTime)
                            if (resp.details.meetingLocation) setDirectiveMeetingLocation(resp.details.meetingLocation)
                            if (resp.details.parentMeetingContent) setDirectiveParentContent(resp.details.parentMeetingContent)
                            if (resp.details.meetingParticipants) setDirectiveParticipants(resp.details.meetingParticipants)
                            if (resp.details.meetingAgenda) setDirectiveAgenda(resp.details.meetingAgenda)
                            if (resp.details.delegatedTeacherId) setDirectiveDelegatedTeacherId(resp.details.delegatedTeacherId)
                            if (resp.details.delegatedTeacherName) setDirectiveDelegatedTeacherName(resp.details.delegatedTeacherName)
                            if (resp.details.delegatedTeacherEmail) setDirectiveDelegatedTeacherEmail(resp.details.delegatedTeacherEmail)
                            if (resp.details.delegationDuration) setDirectiveDelegationDuration(resp.details.delegationDuration)
                            if (resp.details.delegationNote) setDirectiveDelegationNote(resp.details.delegationNote)
                        }
                    }

                    if (data.psychologyData?.digitalSignature) {
                        setDigitalSignature(data.psychologyData.digitalSignature)
                    } else if (student?.signatureName) {
                        setDigitalSignature({
                            isSigned: true,
                            signedBy: student.signatureName,
                            signerRole: "Giáo viên Tâm lý học đường",
                            signedAtFormatted: student.updatedAt ? new Date(student.updatedAt).toLocaleString("vi-VN") : "",
                            signatureHash: `SQMS-SIGN-TLY-${student.studentCode || String(student.id || "").slice(0, 8)}`,
                            status: "VERIFIED"
                        })
                    }

                    // Tự động chọn GĐCS tương ứng với cơ sở của học sinh
                    const stCampus = String(
                        data.effectiveCampusCode ||
                        student?.admissionCampus ||
                        student?.campusCode ||
                        student?.registeredCampus ||
                        ""
                    ).toUpperCase()

                    let matched = list.find((g: any) => {
                        const cCode = String(g.campusCode || "").toUpperCase()
                        return (
                            stCampus.includes(cCode) ||
                            (cCode === "CS5" && (stCampus.includes("HỘI AN") || stCampus.includes("HILL"))) ||
                            (cCode === "CS1" && stCampus.includes("RIVERSIDE")) ||
                            (cCode === "CS2" && stCampus.includes("CENTRAL")) ||
                            (cCode === "CS3" && stCampus.includes("INTERNATIONAL")) ||
                            (cCode === "CS4" && stCampus.includes("BEACH"))
                        )
                    })
                    if (!matched && list.length > 0) matched = list[0]

                    if (matched) {
                        const cCode = matched.campusCode || "CS1"
                        setSelectedCampusCode(cCode)
                        setSelectedGdcsName(matched.managerName || matched.gdcsName || "")
                        setSelectedGdcsEmail(matched.managerEmail || matched.gdcsEmail || "")
                        if (Array.isArray(matched.giaovuStaff) && matched.giaovuStaff.length > 0) {
                            setGiaovuStaffList(matched.giaovuStaff)
                        }
                        if (Array.isArray(matched.tuvanStaff) && matched.tuvanStaff.length > 0) {
                            setTuvanStaffList(matched.tuvanStaff)
                        }
                        const defaultGv = matched.giaovuEmail || data.defaultGiaovuEmail || DEFAULT_GIAOVU_MAP[cCode] || DEFAULT_GIAOVU_MAP.CS1
                        const defaultTv = matched.tuyensinhEmail || data.defaultTuyensinhEmail || DEFAULT_TUYENSINH_MAP[cCode] || DEFAULT_TUYENSINH_MAP.CS1
                        setCcGiaovuEmail(cleanStaffEmails(data.psychologyData?.reportedToGdcs?.giaovuEmail || "", defaultGv))
                        setCcTuyensinhEmail(cleanStaffEmails(data.psychologyData?.reportedToGdcs?.tuyensinhEmail || "", defaultTv))
                    }
                }
            } catch (err) {
                console.error("Lỗi khi tải danh sách GĐCS:", err)
            }
        }

        fetchGdcsInfo()
    }, [student])

    useEffect(() => {
        if (!student?.studentCode) return
        setLoadingHistory(true)
        fetch(`/api/teacher-assessments?action=getRetestHistory&studentCode=${encodeURIComponent(student.studentCode)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setHistoryList(data)
                }
                setLoadingHistory(false)
            })
            .catch(err => {
                console.error("Error fetching student history:", err)
                setLoadingHistory(false)
            })
    }, [student])

    useEffect(() => {
        const scoreData = student?.scores?.find((sc: any) => sc.subject?.code === "TLY") || student?.scores?.[0]
        if (scoreData) {
            try {
                const parsedScores = JSON.parse(scoreData.scores || "[]")
                if (parsedScores.length >= 27) {
                    setScores(parsedScores.slice(7, 27).map(Number))
                } else if (parsedScores.length === 20) {
                    setScores(parsedScores.map(Number))
                }

                const parsedComments = JSON.parse(scoreData.comments || "[]")
                if (parsedComments.length >= 2) {
                    setConclusion(parsedComments[0] || "")
                    setRecommendation(parsedComments[1] || "")
                    if (parsedComments.length >= 22) {
                        setNotes(parsedComments.slice(2, 22))
                    }
                }
            } catch (e) {
                console.error("Error parsing psychology scores", e)
            }
        }
    }, [student])

    // Chỉ cộng các câu đã chọn điểm (>= 0), tránh lỗi hiển thị -20 điểm khi chưa chọn câu hỏi
    const calculateSectionScore = (sectionIdx: number) => {
        if (!sections[sectionIdx]) return 0
        let questionOffset = 0
        for (let i = 0; i < sectionIdx; i++) {
            questionOffset += sections[i].questions.length
        }
        const sectionQuestions = sections[sectionIdx].questions
        const sectionTotal = scores
            .slice(questionOffset, questionOffset + sectionQuestions.length)
            .reduce((a, b) => a + (b >= 0 ? b : 0), 0)
        return sectionTotal
    }

    const answeredCount = scores.filter(s => s >= 0).length
    const progress = Math.round((answeredCount / 20) * 100)
    const totalScore = scores.reduce((a, b) => a + (b >= 0 ? b : 0), 0)

    const getEvaluation = (score: number) => {
        if (isGrades6to12) {
            if (score <= 15) return { level: "Bình thường", hasSigns: false, suggestion: "Ổn định, thích nghi tốt", color: "text-[#059669]", bg: "bg-emerald-50", border: "border-emerald-200" }
            if (score <= 31) return { level: "Dấu hiệu nhẹ", hasSigns: true, suggestion: "Theo dõi - hỗ trợ tâm lý học đường", color: "text-[#00736E]", bg: "bg-[#F0FDFA]", border: "border-[#99F6E4]" }
            if (score <= 47) return { level: "Dấu hiệu vừa", hasSigns: true, suggestion: "Quan sát sâu, tư vấn cá nhân", color: "text-[#D97706]", bg: "bg-amber-50", border: "border-amber-200" }
            if (score <= 63) return { level: "Nguy cơ cao", hasSigns: true, suggestion: "Đánh giá chuyên sâu, can thiệp định kỳ", color: "text-[#D97706]", bg: "bg-amber-50", border: "border-amber-300" }
            return { level: "Nguy cơ rất cao", hasSigns: true, suggestion: "Cần can thiệp chuyên môn, phối hợp phụ huynh", color: "text-[#E11D48]", bg: "bg-rose-50", border: "border-rose-200" }
        }

        // Grades 1-5 default
        if (score <= 15) return { level: "Bình thường", hasSigns: false, suggestion: "Có thể theo học bình thường", color: "text-[#059669]", bg: "bg-emerald-50", border: "border-emerald-200" }
        if (score <= 31) return { level: "Dấu hiệu nhẹ", hasSigns: true, suggestion: "Theo dõi - hỗ trợ thích nghi", color: "text-[#00736E]", bg: "bg-[#F0FDFA]", border: "border-[#99F6E4]" }
        if (score <= 47) return { level: "Dấu hiệu vừa", hasSigns: true, suggestion: "Quan sát sâu, can thiệp nhẹ nếu cần", color: "text-[#D97706]", bg: "bg-amber-50", border: "border-amber-200" }
        if (score <= 63) return { level: "Nguy cơ cao", hasSigns: true, suggestion: "Cần đánh giá chuyên sâu và can thiệp", color: "text-[#D97706]", bg: "bg-amber-50", border: "border-amber-300" }
        return { level: "Nguy cơ rất cao", hasSigns: true, suggestion: "Cần can thiệp chuyên môn sớm (bảo đảm an toàn và hỗ trợ)", color: "text-[#E11D48]", bg: "bg-rose-50", border: "border-rose-200" }
    }

    const evaluation = isScoredForm ? getEvaluation(totalScore) : null
    // Quy tắc nghiệp vụ: Trường hợp TỔNG HỢP, Học sinh có dấu hiệu Tâm lý (> 15 điểm hoặc được GV xác nhận có dấu hiệu tâm lý) mới gửi mail GĐCS
    const hasPsychologySigns = totalScore > 15 || manualPsychSignsFlag

    const handlePrintOrExport = (isPdf = false) => {
        if (typeof onPrintPsychologyPdf === "function") {
            const sectionScores = sections.map((_, i) => calculateSectionScore(i))
            onPrintPsychologyPdf(student, {
                scores: scores.map(s => (s >= 0 ? s : 0)),
                notes,
                sectionScores,
                totalScore,
                evaluation,
                conclusion,
                recommendation,
                digitalSignature,
                reportedToGdcs: reportSentInfo,
                gdcsResponse
            })
            return
        }
        window.print()
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const normalizedRawScores = scores.map(s => (s >= 0 ? s : 0))
            const sectionScores = sections.map((_, i) => calculateSectionScore(i))
            const finalScores = [...sectionScores, totalScore, ...normalizedRawScores]
            const finalComments = [conclusion, recommendation, ...notes]

            await onSave(student, finalScores, finalComments)
            alert("Lưu kết quả đánh giá Tâm lý thành công!")
        } catch (e) {
            alert("Lỗi khi lưu kết quả.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleSendEmailToGdcs = async () => {
        if (!hasPsychologySigns) {
            alert("Chỉ gửi email báo cáo GĐCS khi kết quả TỔNG HỢP học sinh có dấu hiệu Tâm lý (> 15 điểm hoặc được xác nhận có dấu hiệu tâm lý).")
            return
        }
        if (!selectedGdcsEmail) {
            alert("Vui lòng chọn Giám Đốc Cơ Sở để gửi email báo cáo.")
            return
        }
        setSendingReport(true)
        try {
            // 1. Lưu kết quả vào form trước (giữ modal mở để hoàn tất gửi email)
            const normalizedRawScores = scores.map(s => (s >= 0 ? s : 0))
            const sectionScores = sections.map((_, i) => calculateSectionScore(i))
            const finalScores = [...sectionScores, totalScore, ...normalizedRawScores]
            const finalComments = [conclusion, recommendation, ...notes]
            await onSave(student, finalScores, finalComments, { keepOpen: true })

            // 2. Gửi API báo cáo GĐCS & gửi Email (CC Giáo vụ cơ sở, Tư vấn cơ sở)
            const res = await fetch("/api/admin/orientation/psychology-referral", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reportToGdcs",
                    studentId: student?.id,
                    gdcsName: selectedGdcsName,
                    gdcsEmail: selectedGdcsEmail,
                    campusCode: selectedCampusCode,
                    giaovuEmail: ccGiaovuEmail,
                    tuyensinhEmail: ccTuyensinhEmail,
                    hasPsychologySigns: true,
                    needGdcsDirective: true,
                    proposedAction: proposedAction,
                    directiveTopic: messageToGdcs || conclusion || evaluation?.suggestion || "",
                    scores: normalizedRawScores,
                    sectionScores: sectionScores,
                    totalScore: totalScore,
                    evaluation: evaluation || {},
                    conclusion: conclusion,
                    recommendation: recommendation,
                    notes: notes,
                    messageToGdcs: messageToGdcs
                })
            })

            const data = await res.json()
            if (data.success) {
                const newSentInfo = {
                    gdcsName: selectedGdcsName,
                    gdcsEmail: selectedGdcsEmail,
                    campusCode: selectedCampusCode,
                    giaovuEmail: data.giaovuEmail || ccGiaovuEmail,
                    tuyensinhEmail: data.tuyensinhEmail || ccTuyensinhEmail,
                    ccList: data.ccList || [],
                    proposedAction,
                    reportedAt: new Date().toISOString(),
                    messageToGdcs: messageToGdcs
                }
                setReportSentInfo(newSentInfo)
                setDirectiveResponseType(proposedAction)
                setIsReportModalOpen(false)
                alert(
                    `Đã gửi Email báo cáo học sinh có dấu hiệu Tâm lý đến GĐCS ${selectedGdcsName} (${selectedGdcsEmail}), CC Giáo vụ cơ sở (${newSentInfo.giaovuEmail}) và Tư vấn cơ sở (${newSentInfo.tuyensinhEmail}) thành công!`
                )
            } else {
                alert("Lỗi khi gửi báo cáo: " + (data.error || "Không xác định"))
            }
        } catch (e: any) {
            alert("Lỗi khi gửi email: " + e.message)
        } finally {
            setSendingReport(false)
        }
    }

    const getSmartOptionDefaults = (optCode: "DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER") => {
        const defaultTeacher = campusTeachers[0] || null
        if (optCode === "DIRECT_PARENT_MEETING") {
            return {
                location: directiveMeetingLocation || "Phòng Giám đốc Cơ sở",
                parentContent:
                    directiveParentContent ||
                    `Trao đổi trực tiếp với PHHS về kết quả sàng lọc tâm lý (${totalScore}/80 điểm), thống nhất lộ trình đồng hành và cam kết phối hợp giữa Gia đình & Nhà trường.`,
                generalNote:
                    directiveGeneralNote ||
                    `Đề nghị Tổ Tư vấn cơ sở (${selectedCampusCode}) liên hệ mời PHHS; Tổ Giáo vụ cơ sở chuẩn bị hồ sơ làm việc.`
            }
        }
        if (optCode === "SCHEDULE_MEETING") {
            return {
                location:
                    directiveMeetingLocation && directiveMeetingLocation !== "Phòng Giám đốc Cơ sở"
                        ? directiveMeetingLocation
                        : "Văn phòng Chuyên môn Cơ sở",
                participants:
                    directiveParticipants ||
                    `GĐCS, Tổ Giáo vụ ${selectedCampusCode}, Tổ Tư vấn ${selectedCampusCode}, GV Tâm lý, GVCN`,
                agenda:
                    directiveAgenda ||
                    `Hội chẩn chuyên môn thống nhất phương án hỗ trợ tâm lý, lộ trình tiếp nhận và xếp lớp phù hợp cho học sinh ${student?.fullName || ""}.`,
                generalNote:
                    directiveGeneralNote ||
                    `Đề nghị Tổ Giáo vụ cơ sở (${selectedCampusCode}) sắp xếp lịch hội chẩn; Tổ Tư vấn cơ sở tổng hợp thông tin gia đình.`
            }
        }
        return {
            teacherId: directiveDelegatedTeacherId || defaultTeacher?.id || "",
            teacherName: directiveDelegatedTeacherName || defaultTeacher?.teacherName || "Giáo viên đồng hành",
            teacherEmail: directiveDelegatedTeacherEmail || defaultTeacher?.email || "",
            duration: directiveDelegationDuration || "4 tuần đầu năm học",
            delegationNote:
                directiveDelegationNote ||
                `Theo dõi sát biểu hiện tâm lý - hành vi, làm việc với PHHS, hỗ trợ học sinh thích nghi và báo cáo định kỳ cho GĐCS & Tổ Giáo vụ (${selectedCampusCode}).`,
            generalNote:
                directiveGeneralNote ||
                `Ủy quyền Giáo viên đồng hành sát sao cùng học sinh; Tổ Giáo vụ và Tổ Tư vấn cơ sở (${selectedCampusCode}) phối hợp hỗ trợ.`
        }
    }

    const handleSelectDirectiveOption = async (
        optCode: "DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER",
        triggerInstantConfirm = false
    ) => {
        setDirectiveResponseType(optCode)
        const smart = getSmartOptionDefaults(optCode)
        if (optCode === "DIRECT_PARENT_MEETING") {
            setDirectiveMeetingLocation(smart.location)
            if (!directiveParentContent) setDirectiveParentContent(smart.parentContent)
            setDirectiveGeneralNote(smart.generalNote)
        } else if (optCode === "SCHEDULE_MEETING") {
            setDirectiveMeetingLocation(smart.location)
            if (!directiveParticipants) setDirectiveParticipants(smart.participants)
            if (!directiveAgenda) setDirectiveAgenda(smart.agenda)
            setDirectiveGeneralNote(smart.generalNote)
        } else if (optCode === "DELEGATE_TEACHER") {
            if (!directiveDelegatedTeacherId && smart.teacherId) setDirectiveDelegatedTeacherId(smart.teacherId)
            if (!directiveDelegatedTeacherName && smart.teacherName) setDirectiveDelegatedTeacherName(smart.teacherName)
            if (!directiveDelegatedTeacherEmail && smart.teacherEmail) setDirectiveDelegatedTeacherEmail(smart.teacherEmail)
            if (!directiveDelegationDuration) setDirectiveDelegationDuration(smart.duration)
            if (!directiveDelegationNote) setDirectiveDelegationNote(smart.delegationNote)
            setDirectiveGeneralNote(smart.generalNote)
        }

        if (triggerInstantConfirm || oneTouchConfirmMode) {
            await handleConfirmGdcsDirective(optCode, smart)
        }
    }

    const handleConfirmGdcsDirective = async (
        overrideType?: "DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER",
        smartOverride?: any
    ) => {
        if (!student?.id) return
        const targetType = overrideType || directiveResponseType
        const smart = smartOverride || getSmartOptionDefaults(targetType)
        setConfirmingDirective(true)
        try {
            const res = await fetch("/api/admin/orientation/psychology-referral", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "respondGdcsDirective",
                    studentId: student.id,
                    responseType: targetType,
                    meetingTime: directiveMeetingTime || "Theo lịch điều phối của Tư vấn & Giáo vụ cơ sở",
                    meetingLocation: smart.location || directiveMeetingLocation,
                    parentMeetingContent: smart.parentContent || directiveParentContent,
                    meetingParticipants: smart.participants || directiveParticipants,
                    meetingAgenda: smart.agenda || directiveAgenda,
                    delegatedTeacherId: smart.teacherId ?? directiveDelegatedTeacherId,
                    delegatedTeacherName: smart.teacherName ?? directiveDelegatedTeacherName,
                    delegatedTeacherEmail: smart.teacherEmail ?? directiveDelegatedTeacherEmail,
                    delegationDuration: smart.duration || directiveDelegationDuration,
                    delegationNote: smart.delegationNote || directiveDelegationNote,
                    generalDirectiveNote: smart.generalNote || directiveGeneralNote,
                    directorName: selectedGdcsName || user?.fullName || user?.name || "Giám Đốc Cơ Sở",
                    directorEmail: selectedGdcsEmail || user?.email || ""
                })
            })
            const data = await res.json()
            if (data.success) {
                setGdcsResponse(data.data)
                alert(data.message || "GĐCS đã xác nhận nội dung làm việc liên quan và gửi thông báo thành công!")
            } else {
                alert("Lỗi khi xác nhận nội dung làm việc: " + (data.error || "Không xác định"))
            }
        } catch (e: any) {
            alert("Lỗi kết nối: " + e.message)
        } finally {
            setConfirmingDirective(false)
        }
    }

    const currentQuestions = sections[activeSection]?.questions || []
    let currentOffset = 0
    for (let i = 0; i < activeSection; i++) {
        currentOffset += sections[i].questions.length
    }

    const proposedActionOptions = [
        {
            code: "DIRECT_PARENT_MEETING" as const,
            badge: "Phương án 1",
            label: "1. Trao đổi trực tiếp PHHS",
            desc: "GĐCS hẹn gặp trực tiếp Phụ huynh học sinh & thống nhất cam kết phối hợp",
            autoTask: "Tư vấn CS liên hệ mời PHHS • Giáo vụ CS chuẩn bị hồ sơ",
            defaultProposalMsg:
                "Kính trình GĐCS xem xét phương án 1 (Trao đổi trực tiếp PHHS) để thống nhất lộ trình đồng hành tâm lý và cam kết phối hợp giữa Gia đình & Nhà trường."
        },
        {
            code: "SCHEDULE_MEETING" as const,
            badge: "Phương án 2",
            label: "2. Hẹn lịch làm việc / Hội chẩn chuyên môn",
            desc: "Tổ chức buổi làm việc giữa GĐCS, Giáo vụ CS, Tư vấn CS, GV Tâm lý & GVCN",
            autoTask: "Giáo vụ CS sắp xếp lịch họp • Tư vấn CS tổng hợp thông tin",
            defaultProposalMsg:
                "Kính trình GĐCS xem xét phương án 2 (Hẹn lịch làm việc / Hội chẩn chuyên môn) giữa GĐCS, Tổ Giáo vụ, Tổ Tư vấn và GV Tâm lý để thống nhất lộ trình hỗ trợ."
        },
        {
            code: "DELEGATE_TEACHER" as const,
            badge: "Phương án 3",
            label: "3. Ủy quyền Giáo viên đồng hành",
            desc: "Chỉ định Giáo viên đồng hành hỗ trợ học sinh & làm việc với PHHS",
            autoTask: "Giáo vụ CS cập nhật phân công • Tư vấn CS chuyển đầu mối PHHS",
            defaultProposalMsg:
                "Kính trình GĐCS xem xét phương án 3 (Ủy quyền Giáo viên đồng hành) theo dõi sát biểu hiện tâm lý - hành vi và phối hợp cùng PHHS trong 4 tuần đầu."
        }
    ]

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-3 md:p-6 font-sans text-slate-900 text-xs font-semibold tabular-nums">
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Masthead Hồ sơ Học sinh — Chuẩn Sky-Line Academic Ledger */}
                <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E2E8F0] border-l-4 border-l-[#003B3A] flex flex-col md:flex-row gap-5 items-center justify-between">
                    <div className="flex flex-col md:flex-row items-center gap-4 flex-1 text-center md:text-left">
                        <div className="w-14 h-14 bg-[#003B3A] rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0">
                            <User size={28} />
                        </div>
                        <div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 items-center mb-1">
                                <span className="px-2.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-xs font-bold">
                                    Khối {rawGrade || "N/A"}
                                </span>
                                <span className="text-slate-500 text-xs font-medium tabular-nums">
                                    Mã HS: <strong className="text-slate-800">{student?.studentCode || "—"}</strong>
                                </span>
                                {(student?.admissionCampus || student?.registeredCampus) && (
                                    <span className="text-slate-500 text-xs font-medium">
                                        • Cơ sở: <strong className="text-[#003B3A]">{student?.admissionCampus || student?.registeredCampus}</strong>
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-[#003B3A] mb-1">{student?.fullName}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-0.5 rounded-md">
                                    <Sparkles size={12} className="text-[#00A19A]" /> Phiếu đánh giá Tâm lý học đường
                                </span>
                                {evaluation && answeredCount > 0 && (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-xs font-bold ${evaluation.bg} ${evaluation.border} ${evaluation.color}`}>
                                        {evaluation.level} ({totalScore}/80 điểm)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-1 mt-2 md:mt-0 shrink-0">
                        <div className="text-3xl font-black text-[#003B3A] flex items-baseline gap-1 tabular-nums">
                            {totalScore} <span className="text-xs text-slate-500 font-semibold">/ 80 điểm</span>
                        </div>
                        <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden mt-1 border border-slate-200/60">
                            <div
                                className="h-full bg-[#00A19A] transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums">
                            Tiến độ đánh giá: {answeredCount}/20 câu ({progress}%)
                        </div>
                    </div>
                </div>

                {/* Lược sử điểm đánh giá các đợt trước */}
                {(() => {
                    const pastAssessments = historyList.filter((h: any) => h.id !== student?.id)
                    if (pastAssessments.length === 0) return null
                    return (
                        <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E2E8F0] space-y-3">
                            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
                                <div className="flex items-center gap-2">
                                    <ClipboardCheck size={18} className="text-[#008B85]" />
                                    <h3 className="font-bold text-[#003B3A] text-sm">Lược sử điểm đánh giá các đợt trước</h3>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-xs font-bold tabular-nums">
                                    {pastAssessments.length} đợt
                                </span>
                            </div>
                            {loadingHistory ? (
                                <div className="text-xs text-slate-500 py-2">Đang tải lược sử...</div>
                            ) : (
                                <div className="space-y-2.5">
                                    {pastAssessments.map((histRec: any) => {
                                        const scoreData = histRec.scores?.find(
                                            (sc: any) => sc.subject?.code === "TLY" || sc.subject?.code?.toLowerCase() === "tly"
                                        )
                                        const scoreVal = (() => {
                                            if (histRec.psychologyScore !== null && histRec.psychologyScore !== undefined) {
                                                return Math.max(0, Number(histRec.psychologyScore) || 0)
                                            }
                                            if (!scoreData) return null
                                            try {
                                                const parsed = JSON.parse(scoreData.scores || "[]")
                                                if (parsed.length >= 7) return Math.max(0, Number(parsed[6]) || 0)
                                                if (parsed.length > 0) {
                                                    return parsed.reduce((sum: number, val: any) => {
                                                        const n = Number(val)
                                                        return sum + (!isNaN(n) && n >= 0 ? n : 0)
                                                    }, 0)
                                                }
                                            } catch (e) {}
                                            return null
                                        })()

                                        const comments = (() => {
                                            if (!scoreData) return []
                                            try {
                                                return JSON.parse(scoreData.comments || "[]")
                                            } catch (e) {
                                                return []
                                            }
                                        })()

                                        const concl = comments[0] || "—"
                                        const recom = comments[1] || "—"
                                        if (scoreVal === null) return null

                                        const isExpanded = expandedHistoryId === histRec.id
                                        const evalInfo = getEvaluation(scoreVal)

                                        return (
                                            <div key={histRec.id} className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC]">
                                                <div
                                                    onClick={() => setExpandedHistoryId(isExpanded ? null : histRec.id)}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 cursor-pointer gap-3 bg-white hover:bg-[#F8FAFC] transition-colors"
                                                >
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                                                            {histRec.period?.name || "Kỳ khảo sát"}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Đợt: <span className="font-semibold">{histRec.batch?.name || "Khảo sát lẻ"}</span> | Ngày đánh giá:{" "}
                                                            <span className="font-semibold tabular-nums">
                                                                {histRec.createdAt ? new Date(histRec.createdAt).toLocaleDateString("vi-VN") : "—"}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right tabular-nums">
                                                            <span className="text-base font-black text-[#003B3A]">{scoreVal}</span>
                                                            <span className="text-[10px] text-slate-400 font-semibold block -mt-0.5">Điểm</span>
                                                        </div>
                                                        {evalInfo && (
                                                            <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${evalInfo.bg} ${evalInfo.border} ${evalInfo.color}`}>
                                                                {evalInfo.level}
                                                            </div>
                                                        )}
                                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-3.5 border-t border-[#E2E8F0] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                        <div className="bg-white p-3 rounded-xl border border-amber-200">
                                                            <h5 className="font-bold text-amber-900 mb-1">Kết luận sơ bộ:</h5>
                                                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{concl}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-xl border border-emerald-200">
                                                            <h5 className="font-bold text-emerald-900 mb-1">Khuyến nghị dành cho phụ huynh:</h5>
                                                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{recom}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* Thang điểm chung */}
                {isScoredForm && (
                    <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E2E8F0]">
                        <h3 className="font-bold text-[#003B3A] text-xs sm:text-sm mb-2.5">5. Thang điểm chung cho mỗi câu hỏi:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 mb-3 text-xs">
                            <div className="flex gap-2"><span className="font-bold text-[#00736E] w-4 tabular-nums">0</span> <span className="text-slate-700">Không bao giờ / Không có biểu hiện</span></div>
                            <div className="flex gap-2"><span className="font-bold text-[#00736E] w-4 tabular-nums">1</span> <span className="text-slate-700">Hiếm khi / Biểu hiện rất nhẹ</span></div>
                            <div className="flex gap-2"><span className="font-bold text-[#00736E] w-4 tabular-nums">2</span> <span className="text-slate-700">Thỉnh thoảng / Biểu hiện nhẹ</span></div>
                            <div className="flex gap-2"><span className="font-bold text-[#00736E] w-4 tabular-nums">3</span> <span className="text-slate-700">Thường xuyên / Biểu hiện rõ</span></div>
                            <div className="flex gap-2 md:col-span-2"><span className="font-bold text-[#00736E] w-4 tabular-nums">4</span> <span className="text-slate-700">Rất thường xuyên / Ảnh hưởng rõ đến sinh hoạt hoặc học tập</span></div>
                        </div>
                        <h2 className="font-black text-[#003B3A] text-sm sm:text-base border-t border-[#F1F5F9] pt-2.5">
                            B. Thang đo sàng lọc tâm lý (6 mục • 20 câu hỏi):
                        </h2>
                    </div>
                )}

                {/* Thanh chuyển đổi 6 Mục */}
                <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] p-2 overflow-x-auto custom-scrollbar flex gap-2">
                    {sections.map((section, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveSection(idx)}
                            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border cursor-pointer ${
                                activeSection === idx
                                    ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                                    : "bg-transparent text-slate-600 border-transparent hover:bg-[#F8FAFC] hover:text-[#003B3A]"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${activeSection === idx ? "bg-[#5EEAD4]" : "bg-slate-300"}`} />
                                <span>{section.title}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] tabular-nums ${
                                    activeSection === idx ? "bg-white/15 text-[#CCFBF1]" : "bg-slate-100 text-slate-600"
                                }`}>
                                    {calculateSectionScore(idx)}đ
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Danh sách câu hỏi theo mục đang chọn */}
                <div className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden">
                    <div className="px-4 py-3 bg-[#003B3A] text-white flex justify-between items-center">
                        <h2 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                            <ChevronRight size={16} className="text-[#5EEAD4]" />
                            <span>{sections[activeSection]?.title}</span>
                        </h2>
                        <div className="text-xs font-bold text-[#5EEAD4] tabular-nums">
                            Điểm phần này: {calculateSectionScore(activeSection)} / {(sections[activeSection]?.questions?.length || 0) * 4} điểm
                        </div>
                    </div>

                    <div className="divide-y divide-[#E2E8F0]">
                        {currentQuestions.map((q, qIdx) => {
                            const actualIdx = currentOffset + qIdx
                            return (
                                <div key={qIdx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-center p-4 hover:bg-[#F8FAFC] transition-colors">
                                    <div className="lg:col-span-6 flex items-start gap-2.5">
                                        <span className="text-slate-400 font-bold text-xs sm:text-sm w-5 shrink-0 mt-0.5 tabular-nums">
                                            {actualIdx + 1}.
                                        </span>
                                        <span className="text-slate-800 text-xs sm:text-sm font-semibold leading-relaxed">
                                            {q.text.replace(/^\d+\.\s*/, "")}
                                        </span>
                                    </div>
                                    <div className={`lg:col-span-6 flex ${isScoredForm ? "gap-5 justify-start mt-1 lg:mt-0" : "gap-2"} w-full ml-7 lg:ml-0`}>
                                        {q.options.map((opt, oIdx) => {
                                            const optValue = q.options.length === 5 ? oIdx : oIdx + 1
                                            const isChecked = scores[actualIdx] === optValue
                                            return isScoredForm ? (
                                                <label key={oIdx} className="flex items-center gap-1.5 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        disabled={isLocked}
                                                        name={`question-${actualIdx}`}
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            const newScores = [...scores]
                                                            newScores[actualIdx] = optValue
                                                            setScores(newScores)
                                                        }}
                                                        className="w-4 h-4 border-slate-300 text-[#008B85] focus:ring-[#00A19A] cursor-pointer"
                                                    />
                                                    <span className={`font-bold text-xs sm:text-sm tabular-nums ${isChecked ? "text-[#003B3A]" : "text-slate-600 group-hover:text-[#00736E]"}`}>
                                                        {opt}
                                                    </span>
                                                </label>
                                            ) : (
                                                <button
                                                    key={oIdx}
                                                    type="button"
                                                    disabled={isLocked}
                                                    onClick={() => {
                                                        const newScores = [...scores]
                                                        newScores[actualIdx] = optValue
                                                        setScores(newScores)
                                                    }}
                                                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                        isChecked
                                                            ? "bg-[#F0FDFA] border-[#00A19A] text-[#003B3A]"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-[#00A19A]"
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {isScoredForm && (
                                        <div className="lg:col-span-12 w-full mt-1 ml-7 lg:ml-0 flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Ghi chú quan sát:</span>
                                            <input
                                                type="text"
                                                value={notes[actualIdx] || ""}
                                                onChange={(e) => {
                                                    const newNotes = [...notes]
                                                    newNotes[actualIdx] = e.target.value
                                                    setNotes(newNotes)
                                                }}
                                                disabled={isLocked}
                                                placeholder="Nhập biểu hiện quan sát thực tế (nếu có)..."
                                                className="flex-1 text-xs border-b border-slate-300 border-dashed bg-transparent outline-none focus:border-[#00A19A] transition-all text-slate-800 px-1 py-0.5"
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* KHỐI TỔNG HỢP & ĐIỀU KIỆN GỬI EMAIL GĐCS (CC GIÁO VỤ CƠ SỞ, TƯ VẤN CƠ SỞ) */}
                {isScoredForm && (
                    <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E2E8F0] border-l-4 border-l-[#003B3A] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                            <div>
                                <h3 className="font-bold text-[#003B3A] text-sm sm:text-base">
                                    Tổng hợp kết quả sàng lọc tâm lý
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Trường hợp Tổng hợp học sinh có dấu hiệu Tâm lý (&gt; 15 điểm) thì hệ thống mới gửi mail GĐCS, CC Giáo vụ cơ sở và Tư vấn cơ sở
                                </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#003B3A] tabular-nums">
                                Đã chấm: {answeredCount}/20 câu
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2.5 gap-x-8 text-xs sm:text-sm font-medium text-slate-700 tabular-nums">
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                <span>Mục I:</span> <span className="font-bold text-[#003B3A]">{calculateSectionScore(0)} điểm</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                <span>Mục III:</span> <span className="font-bold text-[#003B3A]">{calculateSectionScore(2)} điểm</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                <span>Mục V:</span> <span className="font-bold text-[#003B3A]">{calculateSectionScore(4)} điểm</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                <span>Mục II:</span> <span className="font-bold text-[#003B3A]">{calculateSectionScore(1)} điểm</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                <span>Mục IV:</span> <span className="font-bold text-[#003B3A]">{calculateSectionScore(3)} điểm</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                <span>Mục VI:</span> <span className="font-bold text-[#003B3A]">{calculateSectionScore(5)} điểm</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-3 border-t border-[#F1F5F9]">
                            <div className="flex items-center gap-2 shrink-0 bg-[#F8FAFC] px-4 py-3 rounded-xl border border-[#E2E8F0]">
                                <span className="font-bold text-slate-700 text-xs sm:text-sm">Tổng điểm:</span>
                                <span className="font-black text-[#003B3A] text-xl tabular-nums">{totalScore}</span>
                                <span className="text-xs text-slate-500 font-semibold">/ 80</span>
                            </div>

                            {evaluation && (
                                <div className={`flex-1 p-3.5 rounded-xl border ${evaluation.bg} ${evaluation.border}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-600">Mức độ nhận diện:</span>
                                            <span className={`font-black text-xs sm:text-sm ${evaluation.color}`}>{evaluation.level}</span>
                                        </div>
                                        {progress < 100 && (
                                            <span className="text-[11px] text-slate-500 italic">
                                                (Đang chấm {answeredCount}/20 câu)
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs font-bold text-slate-600 shrink-0">Định hướng:</span>
                                        <span className={`text-xs font-semibold ${evaluation.color}`}>{evaluation.suggestion}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PHÂN LUỒNG GỬI MAIL GĐCS THEO KẾT QUẢ TỔNG HỢP */}
                        {hasPsychologySigns ? (
                            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                                        <ShieldAlert size={16} className="text-[#D97706] shrink-0" />
                                        <span>
                                            Tổng hợp: Học sinh có dấu hiệu Tâm lý ({totalScore > 15 ? `${evaluation?.level} — ${totalScore}/80 điểm` : "Xác nhận chuyên môn"})
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        Theo quy trình, trường hợp học sinh có dấu hiệu Tâm lý sẽ <strong>gửi email báo cáo GĐCS</strong>, đồng gửi (CC) <strong>Giáo vụ cơ sở</strong> và <strong>Tư vấn cơ sở</strong> để GĐCS xác nhận nội dung làm việc liên quan.
                                    </p>
                                    {totalScore <= 15 && manualPsychSignsFlag && (
                                        <label className="inline-flex items-center gap-2 text-xs text-amber-900 font-semibold pt-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={manualPsychSignsFlag}
                                                onChange={(e) => setManualPsychSignsFlag(e.target.checked)}
                                                className="rounded border-amber-400 text-[#003B3A] focus:ring-[#00A19A]"
                                            />
                                            <span>Đang bật xác nhận thủ công học sinh có dấu hiệu tâm lý cần báo cáo GĐCS</span>
                                        </label>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(true)}
                                    disabled={isSaving || sendingReport}
                                    className="px-4 py-2.5 bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
                                >
                                    <Mail size={15} className="text-[#5EEAD4]" />
                                    <span>{reportSentInfo ? "Gửi lại Email GĐCS (CC Giáo vụ, Tư vấn)" : "Gửi Email GĐCS (CC Giáo vụ, Tư vấn)"}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[#059669] font-bold text-xs">
                                        <CheckCircle2 size={15} className="shrink-0" />
                                        <span>
                                            Tổng hợp: Học sinh ở mức Bình thường ({totalScore}/80 điểm — Không có dấu hiệu tâm lý)
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600">
                                        Học sinh không có dấu hiệu tâm lý bất thường nên <strong>chỉ lưu kết quả</strong>, không cần gửi email báo cáo GĐCS.
                                    </p>
                                </div>
                                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer shrink-0 hover:border-[#00A19A]">
                                    <input
                                        type="checkbox"
                                        checked={manualPsychSignsFlag}
                                        onChange={(e) => setManualPsychSignsFlag(e.target.checked)}
                                        className="rounded border-slate-300 text-[#003B3A] focus:ring-[#00A19A]"
                                    />
                                    <span>Có dấu hiệu tâm lý đặc biệt cần trình GĐCS</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {/* C. Kết luận sơ bộ & D. Khuyến nghị */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E2E8F0] flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="text-[#D97706]" />
                            <h3 className="font-bold text-[#003B3A] text-sm">
                                {isScoredForm ? "C. Kết luận sơ bộ:" : "Kết luận chuyên môn"}
                            </h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={conclusion}
                            onChange={(e) => setConclusion(e.target.value)}
                            className="flex-1 w-full min-h-[110px] p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none transition-all text-xs sm:text-sm text-slate-800 resize-y"
                            placeholder="Nhận định tổng quát về biểu hiện tâm lý, cảm xúc, hành vi và khả năng thích ứng..."
                        />
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E2E8F0] flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={18} className="text-[#059669]" />
                            <h3 className="font-bold text-[#003B3A] text-sm">
                                {isScoredForm ? "D. Khuyến nghị dành cho phụ huynh & nhà trường:" : "Kiến nghị hỗ trợ"}
                            </h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            className="flex-1 w-full min-h-[110px] p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none transition-all text-xs sm:text-sm text-slate-800 resize-y"
                            placeholder="Gợi ý biện pháp đồng hành, hỗ trợ tâm lý học đường hoặc nội dung làm việc với phụ huynh..."
                        />
                    </div>
                </div>

                {/* KHỐI XÁC NHẬN NỘI DUNG LÀM VIỆC LIÊN QUAN CỦA GĐCS (HIỂN THỊ KHI HS CÓ DẤU HIỆU TÂM LÝ HOẶC ĐÃ GỬI BÁO CÁO) */}
                {(hasPsychologySigns || reportSentInfo || gdcsResponse) && (
                    <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#E2E8F0] border-l-4 border-l-[#00A19A] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#003B3A] text-white flex items-center justify-center shrink-0">
                                    <ShieldCheck size={18} className="text-[#5EEAD4]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#003B3A] text-sm sm:text-base">
                                        Xác nhận nội dung làm việc liên quan (Giám đốc Cơ sở)
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        GĐCS xem xét kết quả tổng hợp tâm lý và xác nhận nội dung làm việc để Giáo vụ cơ sở, Tư vấn cơ sở &amp; GV triển khai
                                    </p>
                                </div>
                            </div>

                            {gdcsResponse ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 text-xs font-bold">
                                    <CheckCircle2 size={14} />
                                    <span>GĐCS đã xác nhận: {gdcsResponse.responseTypeName || "Đã chỉ đạo"}</span>
                                </span>
                            ) : reportSentInfo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 text-xs font-bold">
                                    <AlertCircle size={14} />
                                    <span>Đã gửi mail GĐCS • Chờ GĐCS xác nhận nội dung làm việc</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                                    <span>Chưa gửi mail báo cáo GĐCS</span>
                                </span>
                            )}
                        </div>

                        {/* Thông tin email đã gửi (To GĐCS, CC Tổ Giáo vụ CS & Tổ Tư vấn CS) */}
                        {reportSentInfo && (
                            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-500 block text-[11px]">Người nhận chính (To — GĐCS):</span>
                                    <strong className="text-[#003B3A]">{reportSentInfo.gdcsName}</strong>
                                    <span className="block text-[11px] text-slate-600">{reportSentInfo.gdcsEmail}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">Đồng gửi (CC — Tổ Giáo vụ &amp; Tổ Tư vấn CS):</span>
                                    <span className="text-slate-800 font-semibold block">
                                        Tổ Giáo vụ: {giaovuStaffList.length > 0 ? giaovuStaffList.map((s: any) => `${s.fullName} (${s.email})`).join(", ") : cleanStaffEmails(reportSentInfo.giaovuEmail, ccGiaovuEmail)}
                                    </span>
                                    <span className="text-slate-800 font-semibold block mt-0.5">
                                        Tổ Tư vấn: {tuvanStaffList.length > 0 ? tuvanStaffList.map((s: any) => `${s.fullName} (${s.email})`).join(", ") : cleanStaffEmails(reportSentInfo.tuyensinhEmail, ccTuyensinhEmail)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[11px]">Thời gian gửi &amp; Đề xuất:</span>
                                    <strong className="text-slate-800 tabular-nums">
                                        {reportSentInfo.reportedAt ? new Date(reportSentInfo.reportedAt).toLocaleString("vi-VN") : "Vừa gửi"}
                                    </strong>
                                    {reportSentInfo.messageToGdcs && (
                                        <span className="block text-[11px] text-slate-600 italic truncate" title={reportSentInfo.messageToGdcs}>
                                            &ldquo;{reportSentInfo.messageToGdcs}&rdquo;
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Kết quả GĐCS đã xác nhận (Giáo vụ & Tư vấn cơ sở nắm bắt đầy đủ) */}
                        {gdcsResponse && (
                            <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] space-y-2.5 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold text-[#003B3A] text-xs sm:text-sm">
                                        Phương án làm việc đã được GĐCS ({gdcsResponse.directorName || "Ban Giám đốc Cơ sở"}) xác nhận:
                                    </span>
                                    <span className="text-[11px] text-[#00736E] font-semibold tabular-nums">
                                        {gdcsResponse.respondedAtFormatted || (gdcsResponse.respondedAt ? new Date(gdcsResponse.respondedAt).toLocaleString("vi-VN") : "")}
                                    </span>
                                </div>
                                <div className="text-slate-800 space-y-1">
                                    <div>
                                        • <strong>Phương án làm việc:</strong>{" "}
                                        <span className="text-[#003B3A] font-bold">{gdcsResponse.responseTypeName}</span>
                                    </div>
                                    {gdcsResponse.details?.meetingTime && (
                                        <div>• <strong>Thời gian:</strong> {gdcsResponse.details.meetingTime} ({gdcsResponse.details.meetingLocation || "Tại cơ sở"})</div>
                                    )}
                                    {gdcsResponse.details?.parentMeetingContent && (
                                        <div>• <strong>Nội dung làm việc với PHHS:</strong> {gdcsResponse.details.parentMeetingContent}</div>
                                    )}
                                    {gdcsResponse.details?.meetingAgenda && (
                                        <div>• <strong>Nội dung hội chẩn chuyên môn:</strong> {gdcsResponse.details.meetingAgenda} (Thành phần: {gdcsResponse.details.meetingParticipants})</div>
                                    )}
                                    {gdcsResponse.details?.delegatedTeacherName && (
                                        <div>• <strong>Giáo viên được ủy quyền:</strong> {gdcsResponse.details.delegatedTeacherName} ({gdcsResponse.details.delegationDuration || "4 tuần đầu"}) — {gdcsResponse.details.delegationNote}</div>
                                    )}
                                    {gdcsResponse.generalDirectiveNote && (
                                        <div>• <strong>Ý kiến chỉ đạo của GĐCS:</strong> &ldquo;{gdcsResponse.generalDirectiveNote}&rdquo;</div>
                                    )}
                                </div>
                                <div className="pt-2 border-t border-[#99F6E4]/70 text-[11px] text-[#00736E] flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span className="font-bold text-[#003B3A]">Đã thông báo Tổ Giáo vụ &amp; Tư vấn cơ sở ({selectedCampusCode}):</span>
                                    <span>
                                        <strong>Giáo vụ:</strong>{" "}
                                        {(gdcsResponse.giaovuStaff || giaovuStaffList)?.length > 0
                                            ? (gdcsResponse.giaovuStaff || giaovuStaffList).map((s: any) => `${s.fullName} (${s.email})`).join(", ")
                                            : cleanStaffEmails(gdcsResponse.giaovuEmail, ccGiaovuEmail)}
                                    </span>
                                    <span>
                                        <strong>Tư vấn:</strong>{" "}
                                        {(gdcsResponse.tuvanStaff || tuvanStaffList)?.length > 0
                                            ? (gdcsResponse.tuvanStaff || tuvanStaffList).map((s: any) => `${s.fullName} (${s.email})`).join(", ")
                                            : cleanStaffEmails(gdcsResponse.tuyensinhEmail, ccTuyensinhEmail)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Biểu mẫu trực quan 1 chạm để GĐCS xác nhận phương án làm việc liên quan */}
                        <div className="space-y-3 pt-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-[#003B3A]">
                                        Chọn phương án làm việc (1 chạm xác nhận &amp; thông báo Tổ Giáo vụ, Tư vấn {selectedCampusCode}):
                                    </label>
                                    <p className="text-[11px] text-slate-500">
                                        Chạm trực tiếp vào 1 trong 3 thẻ phương án bên dưới để tự động điền nội dung chuẩn và xác nhận ngay
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-[#99F6E4] text-[11px] font-bold text-[#003B3A] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={oneTouchConfirmMode}
                                            onChange={(e) => setOneTouchConfirmMode(e.target.checked)}
                                            className="rounded border-teal-400 text-[#003B3A] focus:ring-[#00A19A]"
                                        />
                                        <span>Chạm là xác nhận ngay</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvancedDirectiveFields(!showAdvancedDirectiveFields)}
                                        className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#00A19A] text-[11px] font-semibold text-slate-700 cursor-pointer"
                                    >
                                        {showAdvancedDirectiveFields ? "Ẩn tùy chỉnh chi tiết" : "Tùy chỉnh chi tiết"}
                                    </button>
                                </div>
                            </div>

                            {/* 3 THẺ PHƯƠNG ÁN TRỰC QUAN 1 CHẠM */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {proposedActionOptions.map((opt, idx) => {
                                    const active = directiveResponseType === opt.code
                                    const isConfirmedOption = gdcsResponse?.responseType === opt.code
                                    const isProposedByPsych = reportSentInfo?.proposedAction === opt.code
                                    const OptionIcon = idx === 0 ? MessageSquare : idx === 1 ? Calendar : UserCheck
                                    return (
                                        <div
                                            key={opt.code}
                                            onClick={() => {
                                                if (!confirmingDirective) {
                                                    handleSelectDirectiveOption(opt.code, false)
                                                }
                                            }}
                                            className={`group relative p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                                                active
                                                    ? "bg-[#003B3A] border-[#003B3A] text-white shadow-md ring-2 ring-[#00A19A]/35"
                                                    : "bg-white border-[#E2E8F0] text-slate-800 hover:border-[#00A19A] hover:bg-[#F8FAFC]"
                                            }`}
                                        >
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                                            active ? "bg-white/15 text-[#5EEAD4]" : "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]"
                                                        }`}>
                                                            <OptionIcon size={15} />
                                                        </span>
                                                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${
                                                            active ? "bg-white/15 text-[#5EEAD4]" : "bg-slate-100 text-slate-600"
                                                        }`}>
                                                            {opt.badge}
                                                        </span>
                                                    </div>
                                                    {isConfirmedOption ? (
                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                                                            <Check size={11} /> Đã xác nhận
                                                        </span>
                                                    ) : isProposedByPsych ? (
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                            active ? "bg-amber-400/20 text-amber-200 border border-amber-300/40" : "bg-amber-50 text-amber-800 border border-amber-200"
                                                        }`}>
                                                            Đề xuất từ GV
                                                        </span>
                                                    ) : active ? (
                                                        <Check size={15} className="text-[#5EEAD4] shrink-0" />
                                                    ) : null}
                                                </div>

                                                <div className={`font-bold text-xs sm:text-[13px] leading-snug ${active ? "text-white" : "text-[#003B3A]"}`}>
                                                    {opt.label}
                                                </div>

                                                <p className={`text-[11px] leading-snug font-normal ${active ? "text-teal-100" : "text-slate-500"}`}>
                                                    {opt.desc}
                                                </p>
                                            </div>

                                            <div className={`pt-2 border-t flex items-center justify-between gap-2 ${
                                                active ? "border-white/15" : "border-slate-100"
                                            }`}>
                                                <span className={`text-[10px] font-medium truncate ${active ? "text-teal-200" : "text-slate-400"}`}>
                                                    {opt.autoTask}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={confirmingDirective}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSelectDirectiveOption(opt.code, true)
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold shrink-0 transition-all cursor-pointer ${
                                                        active
                                                            ? "bg-[#00A19A] hover:bg-[#008B85] text-white shadow-2xs"
                                                            : "bg-[#F0FDFA] hover:bg-[#003B3A] text-[#003B3A] hover:text-white border border-[#99F6E4]"
                                                    }`}
                                                >
                                                    {confirmingDirective && active ? "Đang lưu..." : "Chọn & Xác nhận"}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* CHIPS CHỌN NHANH 1 CHẠM CHO PHƯƠNG ÁN ĐANG CHỌN */}
                            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-[#003B3A] mr-1">Gợi ý 1 chạm:</span>
                                    {directiveResponseType === "DIRECT_PARENT_MEETING" && (
                                        <>
                                            {["Phòng Giám đốc Cơ sở", "Phòng Tư vấn Tuyển sinh", "Trao đổi trực tuyến / Điện thoại"].map((loc) => (
                                                <button
                                                    key={loc}
                                                    type="button"
                                                    onClick={() => setDirectiveMeetingLocation(loc)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${
                                                        directiveMeetingLocation === loc
                                                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                                                            : "bg-white text-slate-700 border-slate-200 hover:border-[#00A19A]"
                                                    }`}
                                                >
                                                    {loc}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {directiveResponseType === "SCHEDULE_MEETING" && (
                                        <>
                                            {[
                                                "GĐCS, Tổ Giáo vụ CS, Tổ Tư vấn CS, GV Tâm lý",
                                                "Hội đồng Tuyển sinh, Tổ Giáo vụ CS, GV Tâm lý & GVCN"
                                            ].map((part) => (
                                                <button
                                                    key={part}
                                                    type="button"
                                                    onClick={() => setDirectiveParticipants(part)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${
                                                        directiveParticipants === part
                                                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                                                            : "bg-white text-slate-700 border-slate-200 hover:border-[#00A19A]"
                                                    }`}
                                                >
                                                    {part}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {directiveResponseType === "DELEGATE_TEACHER" && (
                                        <>
                                            {["2 tuần đầu nhập học", "4 tuần đầu năm học", "Học kỳ I", "Cả năm học"].map((dur) => (
                                                <button
                                                    key={dur}
                                                    type="button"
                                                    onClick={() => setDirectiveDelegationDuration(dur)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all ${
                                                        directiveDelegationDuration === dur
                                                            ? "bg-[#003B3A] text-white border-[#003B3A]"
                                                            : "bg-white text-slate-700 border-slate-200 hover:border-[#00A19A]"
                                                    }`}
                                                >
                                                    {dur}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleConfirmGdcsDirective()}
                                    disabled={confirmingDirective}
                                    className="px-4 py-2 bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                                >
                                    <ShieldCheck size={14} className="text-[#5EEAD4]" />
                                    <span>
                                        {confirmingDirective
                                            ? "Đang xác nhận..."
                                            : gdcsResponse
                                            ? "Lưu cập nhật xác nhận GĐCS"
                                            : "Xác nhận & Thông báo Giáo vụ, Tư vấn"}
                                    </span>
                                </button>
                            </div>

                            {/* KHỐI TÙY CHỈNH CHI TIẾT (MỞ KHI CẦN NHẬP THỜI GIAN CỤ THỂ HOẶC CHỌN GV ỦY QUYỀN) */}
                            {(showAdvancedDirectiveFields || directiveResponseType === "DELEGATE_TEACHER") && (
                                <div className="space-y-3 animate-in fade-in duration-150">
                                    {directiveResponseType === "DIRECT_PARENT_MEETING" && (
                                        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Thời gian hẹn gặp PHHS:</label>
                                                <input
                                                    type="datetime-local"
                                                    value={directiveMeetingTime}
                                                    onChange={(e) => setDirectiveMeetingTime(e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800 tabular-nums"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Địa điểm làm việc:</label>
                                                <input
                                                    type="text"
                                                    value={directiveMeetingLocation}
                                                    onChange={(e) => setDirectiveMeetingLocation(e.target.value)}
                                                    placeholder="Phòng Giám đốc Cơ sở..."
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nội dung làm việc &amp; thỏa thuận với PHHS:</label>
                                                <textarea
                                                    rows={2}
                                                    value={directiveParentContent}
                                                    onChange={(e) => setDirectiveParentContent(e.target.value)}
                                                    placeholder="Nhập nội dung GĐCS xác nhận làm việc với PHHS (cam kết đồng hành, lộ trình hỗ trợ tâm lý)..."
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {directiveResponseType === "SCHEDULE_MEETING" && (
                                        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Thời gian làm việc / hội chẩn:</label>
                                                <input
                                                    type="datetime-local"
                                                    value={directiveMeetingTime}
                                                    onChange={(e) => setDirectiveMeetingTime(e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800 tabular-nums"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Địa điểm tổ chức:</label>
                                                <input
                                                    type="text"
                                                    value={directiveMeetingLocation}
                                                    onChange={(e) => setDirectiveMeetingLocation(e.target.value)}
                                                    placeholder="Phòng họp Chuyên môn Cơ sở..."
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Thành phần tham dự:</label>
                                                <input
                                                    type="text"
                                                    value={directiveParticipants}
                                                    onChange={(e) => setDirectiveParticipants(e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nội dung hội chẩn chuyên môn:</label>
                                                <input
                                                    type="text"
                                                    value={directiveAgenda}
                                                    onChange={(e) => setDirectiveAgenda(e.target.value)}
                                                    placeholder="Thống nhất phương án hỗ trợ tâm lý và xếp lớp thích hợp..."
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {directiveResponseType === "DELEGATE_TEACHER" && (
                                        <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Giáo viên nhận ủy quyền (1 chạm):</label>
                                                {campusTeachers.length > 0 ? (
                                                    <select
                                                        value={directiveDelegatedTeacherId}
                                                        onChange={(e) => {
                                                            const tId = e.target.value
                                                            setDirectiveDelegatedTeacherId(tId)
                                                            const found = campusTeachers.find((t: any) => t.id === tId || t.userId === tId)
                                                            if (found) {
                                                                setDirectiveDelegatedTeacherName(found.teacherName || "")
                                                                setDirectiveDelegatedTeacherEmail(found.email || "")
                                                            }
                                                        }}
                                                        className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                    >
                                                        <option value="">-- Chọn giáo viên cơ sở --</option>
                                                        {campusTeachers.map((t: any) => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.teacherName} {t.email ? `(${t.email})` : ""}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={directiveDelegatedTeacherName}
                                                        onChange={(e) => setDirectiveDelegatedTeacherName(e.target.value)}
                                                        placeholder="Nhập họ tên GV..."
                                                        className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Giáo viên ủy quyền:</label>
                                                <input
                                                    type="email"
                                                    value={directiveDelegatedTeacherEmail}
                                                    onChange={(e) => setDirectiveDelegatedTeacherEmail(e.target.value)}
                                                    placeholder="gv@skylineschool.edu.vn"
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Thời hạn đồng hành:</label>
                                                <input
                                                    type="text"
                                                    value={directiveDelegationDuration}
                                                    onChange={(e) => setDirectiveDelegationDuration(e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nội dung công việc ủy quyền:</label>
                                                <input
                                                    type="text"
                                                    value={directiveDelegationNote}
                                                    onChange={(e) => setDirectiveDelegationNote(e.target.value)}
                                                    placeholder="Làm việc với PHHS, theo dõi hỗ trợ tâm lý học sinh và báo cáo định kỳ..."
                                                    className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            Ý kiến xác nhận / chỉ đạo chung của Giám đốc Cơ sở:
                                        </label>
                                        <input
                                            type="text"
                                            value={directiveGeneralNote}
                                            onChange={(e) => setDirectiveGeneralNote(e.target.value)}
                                            placeholder="Nhập nội dung xác nhận làm việc của GĐCS để thông báo cho Giáo vụ cơ sở, Tư vấn cơ sở và GV..."
                                            className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#00A19A] outline-none text-xs text-slate-800"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Thanh tác vụ cố định dưới đáy */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-4 z-10">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                            <AlertCircle size={14} className="text-[#008B85]" />
                            <span>Lưu ý kiểm tra kỹ kết quả Tổng hợp trước khi xác nhận</span>
                        </div>
                        {reportSentInfo && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-bold">
                                <CheckCircle2 size={13} className="text-[#059669]" />
                                <span>
                                    Đã gửi mail GĐCS: <strong>{reportSentInfo.gdcsName}</strong> (CC Giáo vụ &amp; Tư vấn CS)
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        {/* Chỉ hiển thị nút Gửi Email Cho GĐCS khi TỔNG HỢP học sinh có dấu hiệu Tâm lý (hoặc đã từng gửi) */}
                        {(hasPsychologySigns || reportSentInfo) && (
                            <button
                                type="button"
                                onClick={() => setIsReportModalOpen(true)}
                                disabled={isSaving || sendingReport}
                                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#008B85] hover:bg-[#00736E] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                title="Gửi Email báo cáo GĐCS, CC Giáo vụ cơ sở và Tư vấn cơ sở (dành cho học sinh có dấu hiệu Tâm lý)"
                            >
                                <Mail size={15} />
                                <span>{reportSentInfo ? "Gửi lại Email cho GĐCS" : "Gửi Email cho GĐCS"}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || isLocked}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={15} />
                            )}
                            <span>{isLocked ? "Form đã khóa" : "Lưu kết quả"}</span>
                        </button>
                    </div>
                </div>

                {/* MODAL GỬI EMAIL BÁO CÁO KẾT QUẢ TÂM LÝ CHO GĐCS (CC GIÁO VỤ CƠ SỞ, TƯ VẤN CƠ SỞ) */}
                {isReportModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] max-w-2xl w-full p-6 space-y-4 my-8">
                            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl bg-[#003B3A] flex items-center justify-center text-white">
                                        <Mail size={18} className="text-[#5EEAD4]" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-[#003B3A]">
                                            Gửi Email báo cáo GĐCS (Học sinh có dấu hiệu Tâm lý)
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Gửi trực tiếp Giám đốc Cơ sở • Đồng gửi (CC) Giáo vụ cơ sở &amp; Tư vấn cơ sở
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* 1. CHỌN GĐCS */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#003B3A] block">
                                    1. Người nhận chính (To) — Giám đốc Cơ sở (GĐCS) <span className="text-rose-500">*</span>:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {gdcsList.map((g: any) => {
                                        const isSelected = selectedGdcsEmail === (g.managerEmail || g.gdcsEmail)
                                        const cCode = g.campusCode || "CS1"
                                        return (
                                            <button
                                                key={cCode || g.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCampusCode(cCode)
                                                    setSelectedGdcsName(g.managerName || g.gdcsName || "")
                                                    setSelectedGdcsEmail(g.managerEmail || g.gdcsEmail || "")
                                                    if (Array.isArray(g.giaovuStaff)) setGiaovuStaffList(g.giaovuStaff)
                                                    if (Array.isArray(g.tuvanStaff)) setTuvanStaffList(g.tuvanStaff)
                                                    setCcGiaovuEmail(g.giaovuEmail || DEFAULT_GIAOVU_MAP[cCode] || DEFAULT_GIAOVU_MAP.CS1)
                                                    setCcTuyensinhEmail(g.tuyensinhEmail || DEFAULT_TUYENSINH_MAP[cCode] || DEFAULT_TUYENSINH_MAP.CS1)
                                                }}
                                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "bg-[#F0FDFA] border-[#00A19A] ring-2 ring-[#00A19A]/20"
                                                        : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold text-[#003B3A] bg-[#CCFBF1]/70 px-2 py-0.5 rounded-md">
                                                        {cCode} - {g.campusName?.replace("Sky-Line", "").trim() || cCode}
                                                    </span>
                                                    {isSelected && <Check size={14} className="text-[#008B85]" />}
                                                </div>
                                                <div className="text-xs font-bold text-slate-900">{g.managerName || g.gdcsName}</div>
                                                <div className="text-[11px] text-slate-500 truncate">{g.managerEmail || g.gdcsEmail}</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* 2. ĐỒNG GỬI (CC): TỔ GIÁO VỤ CƠ SỞ & TỔ TƯ VẤN CƠ SỞ */}
                            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5">
                                <label className="text-xs font-bold text-[#003B3A] block">
                                    2. Đồng gửi bắt buộc (CC) — Tổ Giáo vụ cơ sở &amp; Tổ Tư vấn cơ sở ({selectedCampusCode}):
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                                            Tổ Giáo vụ cơ sở ({selectedCampusCode}):
                                        </span>
                                        {giaovuStaffList.length > 0 && (
                                            <div className="mb-1.5 flex flex-wrap gap-1">
                                                {giaovuStaffList.map((st: any, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0FDFA] border border-[#99F6E4] text-[10.5px] font-semibold text-[#003B3A]"
                                                    >
                                                        <span>{st.fullName}</span>
                                                        <span className="text-[#00736E] font-normal">({st.email})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            value={ccGiaovuEmail}
                                            onChange={(e) => setCcGiaovuEmail(e.target.value)}
                                            placeholder="Email nhân sự Tổ Giáo vụ cơ sở..."
                                            className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800 text-xs focus:border-[#00A19A] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                                            Tổ Tư vấn cơ sở ({selectedCampusCode}):
                                        </span>
                                        {tuvanStaffList.length > 0 && (
                                            <div className="mb-1.5 flex flex-wrap gap-1">
                                                {tuvanStaffList.map((st: any, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0FDFA] border border-[#99F6E4] text-[10.5px] font-semibold text-[#003B3A]"
                                                    >
                                                        <span>{st.fullName}</span>
                                                        <span className="text-[#00736E] font-normal">({st.email})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            value={ccTuyensinhEmail}
                                            onChange={(e) => setCcTuyensinhEmail(e.target.value)}
                                            placeholder="Email nhân sự Tổ Tư vấn cơ sở..."
                                            className="w-full p-2 rounded-lg border border-[#E2E8F0] bg-white text-slate-800 text-xs focus:border-[#00A19A] outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    Danh sách email được lấy trực tiếp từ nhân sự thuộc <strong>Tổ Giáo vụ</strong> và <strong>Tổ Tư vấn cơ sở</strong> ({selectedCampusCode}), đồng thời CC về Ban KT&amp;ĐBCL (<strong>ktdbcl@skylineschool.edu.vn</strong>).
                                </div>
                            </div>

                            {/* 3. TÓM TẮT KẾT QUẢ TỔNG HỢP */}
                            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#003B3A] flex items-center gap-1.5">
                                        <Award size={14} className="text-[#008B85]" />
                                        <span>3. Tóm tắt kết quả Tổng hợp đính kèm:</span>
                                    </span>
                                    <span className="text-[#003B3A] font-black text-sm tabular-nums">{totalScore} / 80 điểm</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                                        <span className="text-slate-400 block text-[10px]">Học sinh:</span>
                                        <strong className="text-slate-800">{student?.fullName} (Khối {rawGrade})</strong>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                                        <span className="text-slate-400 block text-[10px]">Mức độ dấu hiệu:</span>
                                        <strong className={evaluation?.color || "text-[#D97706]"}>{evaluation?.level || "Có dấu hiệu tâm lý"}</strong>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg border border-[#E2E8F0]">
                                        <span className="text-slate-400 block text-[10px]">Gợi ý chuyên môn:</span>
                                        <strong className="text-slate-800 truncate block">{evaluation?.suggestion || "Theo dõi hỗ trợ"}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* 4. ĐỀ XUẤT PHƯƠNG ÁN LÀM VIỆC TRÌNH GĐCS XÁC NHẬN (1 CHẠM) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-bold text-[#003B3A] block">
                                        4. Chọn 1 chạm phương án đề xuất trình GĐCS xác nhận:
                                    </label>
                                    <span className="text-[10.5px] text-[#00736E] font-semibold">
                                        Chạm để chọn &amp; tự động điền nội dung đề xuất
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {proposedActionOptions.map((opt, idx) => {
                                        const active = proposedAction === opt.code
                                        const OptIcon = idx === 0 ? MessageSquare : idx === 1 ? Calendar : UserCheck
                                        return (
                                            <button
                                                key={opt.code}
                                                type="button"
                                                onClick={() => {
                                                    setProposedAction(opt.code)
                                                    setMessageToGdcs(opt.defaultProposalMsg)
                                                }}
                                                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                                    active
                                                        ? "bg-[#003B3A] text-white border-[#003B3A] shadow-sm ring-2 ring-[#00A19A]/30"
                                                        : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-white hover:border-[#00A19A]"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        active ? "bg-white/15 text-[#5EEAD4]" : "bg-white text-[#003B3A] border border-slate-200"
                                                    }`}>
                                                        <OptIcon size={12} />
                                                        <span>{opt.badge}</span>
                                                    </span>
                                                    {active && <Check size={14} className="text-[#5EEAD4] shrink-0" />}
                                                </div>
                                                <div className="font-bold text-xs leading-snug">{opt.label}</div>
                                                <div className={`text-[10.5px] leading-snug font-normal ${active ? "text-teal-100" : "text-slate-500"}`}>
                                                    {opt.desc}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                                <textarea
                                    rows={2}
                                    value={messageToGdcs}
                                    onChange={(e) => setMessageToGdcs(e.target.value)}
                                    placeholder="Nội dung đề xuất tự động điền khi chạm chọn phương án trên (có thể chỉnh sửa thêm nếu cần)..."
                                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#00A19A] focus:bg-white resize-none"
                                />
                            </div>

                            {/* MODAL ACTIONS */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0]">
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(false)}
                                    disabled={sendingReport}
                                    className="px-4 py-2 border border-[#E2E8F0] text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendEmailToGdcs}
                                    disabled={sendingReport || !selectedGdcsEmail}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#003B3A] hover:bg-[#005250] text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {sendingReport ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Đang gửi email GĐCS (CC Giáo vụ, Tư vấn)...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={15} className="text-[#5EEAD4]" />
                                            <span>Xác nhận &amp; Gửi Email GĐCS (CC Giáo vụ, Tư vấn)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
