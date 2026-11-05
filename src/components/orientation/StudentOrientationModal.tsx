"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  X,
  HeartHandshake,
  UserCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
  Printer,
  Sparkles,
  RefreshCw,
  MessageSquareQuote,
  Smile,
  ShieldCheck,
  Compass,
  FileText,
  Clock,
  Check,
  Brain,
  Send,
  AlertTriangle,
  Info,
  ExternalLink,
  Building2,
  Mail,
  Calendar,
  GraduationCap,
  MapPin,
  School,
  Phone,
  ChevronDown,
  ChevronUp,
  User,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Table,
  HelpCircle,
  CheckSquare,
  FileCheck,
  ClipboardCheck,
  Lightbulb,
  Bot,
  Copy,
  FolderSync
} from "lucide-react"
import QuickConsultationModal from "@/components/advisory/QuickConsultationModal"
import {
  getGradeGroupKey,
  getOrientationGradeGroupConfig,
  ORIENTATION_RATING_OPTIONS,
  ORIENTATION_EVIDENCE_SOURCES,
  ORIENTATION_CRITERIA_VERSION,
  isCommentMandatory,
  GradeGroupKey,
  RatingCode,
  EvidenceSource
} from "@/lib/orientation/criteria-config"

interface StudentOrientationModalProps {
  isOpen: boolean
  onClose: () => void
  student: any
  initialSubjectId?: string
  onOpenReport?: (student: any, orientationData?: any) => void
  onSuccess?: () => void
}

const QUICK_SUBJECT_REMARKS = [
  "Tiếp thu bài nhanh, tự tin và hoàn thành tốt yêu cầu.",
  "Nắm vững kiến thức cơ bản, thao tác bài làm cẩn thận.",
  "Tư duy logic nhạy bén, phản xạ tốt trong các tình huống.",
  "Cần rèn luyện thêm kỹ năng tính toán và chú ý trình bày.",
  "Cần tập trung hơn trong giờ học và chủ động tương tác.",
  "Diễn đạt lưu loát, ngôn từ phong phú, phát âm rõ ràng.",
  "Có tiến bộ trong quá trình làm bài, thái độ tích cực.",
  "Cần củng cố thêm các kiến thức nền tảng của môn học."
]

interface QuestionAnswer {
  questionId: string
  code?: string
  questionText: string
  category: string
  categoryLabel?: string
  focus?: string
  rating: RatingCode
  notes: string
  studentNotes?: string
  teacherComment?: string
  evidenceSource?: EvidenceSource
  suggestedQuestions?: string[]
}

interface ParentAnswer {
  groupId: string
  groupCode?: string
  category: string
  categoryLabel?: string
  title: string
  focus?: string
  answer: string
  teacherNote?: string
  suggestedQuestions?: string[]
}

interface Summary9Items {
  strongPoints: string          // 1. Điểm mạnh nổi bật của học sinh
  interestsMotivation: string   // 2. Sở thích và động lực học tập
  adaptabilityAutonomy: string  // 3. Khả năng thích nghi và tự lập
  difficultiesNeeds: string     // 4. Khó khăn, nhu cầu cần quan tâm
  studentExpectations: string   // 5. Kỳ vọng của học sinh
  parentExpectations: string    // 6. Kỳ vọng của phụ huynh
  alignmentDifferences: string  // 7. Những điểm tương đồng hoặc khác biệt giữa hai nguồn thông tin
  initialRecommendations: string// 8. Đề xuất hỗ trợ và định hướng giáo dục ban đầu
  verificationItems: string     // 9. Nội dung cần xác minh hoặc trao đổi chuyên môn
}

export function StudentOrientationModal({
  isOpen,
  onClose,
  student,
  initialSubjectId,
  onOpenReport,
  onSuccess
}: StudentOrientationModalProps) {
  // 4 Tab: tab1 (Phỏng vấn HS), tab2 (Trao đổi PH), tab3 (Tổng hợp & Thẩm định), tab4 (Bảng 17 cột hồ sơ)
  const [activeTab, setActiveTab] = useState<"tab1" | "tab2" | "tab3" | "tab4">("tab1")
  const [loading, setLoading] = useState(false)
  
  // Tự động nhận diện cấu hình theo khối của học sinh (1 trong 12 khối)
  const gradeGroupKey = getGradeGroupKey(student?.grade)
  const groupConfig = getOrientationGradeGroupConfig(student?.grade)
  
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [parentGroupsList, setParentGroupsList] = useState<any[]>([])
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false)
  const [studentDetail, setStudentDetail] = useState<any>(student)

  // Ngày phỏng vấn & Cán bộ thực hiện
  const [interviewDate, setInterviewDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [interviewerName, setInterviewerName] = useState("")

  // Form State Phần A: Phỏng vấn học sinh (10 nhóm nội dung)
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({})
  const [openAccordionA, setOpenAccordionA] = useState<Record<string, boolean>>({})

  // Form State Phần B: Trao đổi PHHS (5 nhóm nội dung)
  const [parentAnswers, setParentAnswers] = useState<Record<string, ParentAnswer>>({})
  const [parentRepresentativeName, setParentRepresentativeName] = useState("")
  const [parentPhone, setParentPhone] = useState("")

  // Form State Phần C: Tổng hợp nhận diện (9 mục nội dung)
  const [summary9, setSummary9] = useState<Summary9Items>({
    strongPoints: "",
    interestsMotivation: "",
    adaptabilityAutonomy: "",
    difficultiesNeeds: "",
    studentExpectations: "",
    parentExpectations: "",
    alignmentDifferences: "",
    initialRecommendations: "",
    verificationItems: ""
  })

  // Thẩm định Quản lý Chuyên môn Cơ sở (QLCM) & Liên thông Hồ sơ
  const [verificationStatus, setVerificationStatus] = useState<"PENDING" | "VERIFIED" | "REJECTED">("PENDING")
  const [verifierName, setVerifierName] = useState("")
  const [verifiedAt, setVerifiedAt] = useState("")
  const [verificationNotes, setVerificationNotes] = useState("")
  const [supportReferralConfirmed, setSupportReferralConfirmed] = useState(false)

  // Điều khiển hiển thị câu hỏi gợi mở & Validation
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})

  // Phiên bản biểu mẫu & Quản lý lịch sử khi đổi khối
  const [formVersion, setFormVersion] = useState<string>(ORIENTATION_CRITERIA_VERSION)
  const [historyVersions, setHistoryVersions] = useState<any[]>([])
  const [showGradeChangeWarning, setShowGradeChangeWarning] = useState(false)
  const [savedGradeGroup, setSavedGradeGroup] = useState<string>(gradeGroupKey)

  // SKY-LINE AI ADMISSION ASSISTANT STATE
  const [aiQuestionLoading, setAiQuestionLoading] = useState<Record<string, boolean>>({})
  const [aiSuggestedQuestions, setAiSuggestedQuestions] = useState<Record<string, { question: string; purpose: string }[]>>({})
  const [openAiQuestions, setOpenAiQuestions] = useState<Record<string, boolean>>({})
  const [aiCommentLoading, setAiCommentLoading] = useState<Record<string, boolean>>({})
  const [aiDraftComments, setAiDraftComments] = useState<Record<string, string>>({})
  const [showAiDraftBox, setShowAiDraftBox] = useState<Record<string, boolean>>({})
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)
  const [aiSummaryData, setAiSummaryData] = useState<any>(null)
  const [showAiSummaryDrawer, setShowAiSummaryDrawer] = useState(false)

  // Form State Điểm khảo sát & Định hướng tuyển sinh
  const [proposedEduSystem, setProposedEduSystem] = useState("")
  const [proposedClassPlacement, setProposedClassPlacement] = useState("")
  const [admissionConsultantNote, setAdmissionConsultantNote] = useState("")
  const [writtenEnglishScore, setWrittenEnglishScore] = useState("")
  const [oralEnglishScore, setOralEnglishScore] = useState("")
  const [mathScore, setMathScore] = useState("")
  const [literatureScore, setLiteratureScore] = useState("")

  // GĐCS Directives & Actions State
  const [gdcsDecision, setGdcsDecision] = useState<"TIEP_NHAN_CHUAN" | "TIEP_NHAN_DONG_HANH" | "TAM_HOAN_DANH_GIA">("TIEP_NHAN_CHUAN")
  const [gdcsGeneralNote, setGdcsGeneralNote] = useState("")
  const [gdcsDelegateTeacher, setGdcsDelegateTeacher] = useState(false)
  const [gdcsDelegatedTeacherName, setGdcsDelegatedTeacherName] = useState("")
  const [gdcsDelegatedTeacherId, setGdcsDelegatedTeacherId] = useState("")
  const [gdcsDelegationNote, setGdcsDelegationNote] = useState("")
  const [gdcsScheduleMeeting, setGdcsScheduleMeeting] = useState(false)
  const [gdcsMeetingTime, setGdcsMeetingTime] = useState("")
  const [gdcsMeetingLocation, setGdcsMeetingLocation] = useState("")
  const [gdcsMeetingParticipants, setGdcsMeetingParticipants] = useState("")
  const [gdcsMeetingAgenda, setGdcsMeetingAgenda] = useState("")
  const [gdcsDirectParentMeeting, setGdcsDirectParentMeeting] = useState(false)
  const [gdcsParentMeetingTime, setGdcsParentMeetingTime] = useState("")
  const [gdcsParentMeetingLocation, setGdcsParentMeetingLocation] = useState("")
  const [gdcsParentMeetingContent, setGdcsParentMeetingContent] = useState("")

  // GV phụ trách định hướng được phân công tự động
  const [assignedOrientationTeachers, setAssignedOrientationTeachers] = useState<any[]>([])

  // Kết quả Môn Khảo sát đầu vào theo phân công của Giáo viên
  const [subjectEvaluations, setSubjectEvaluations] = useState<any[]>([])
  const [savingSubjectMap, setSavingSubjectMap] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({})
  const [dirtySubjectIds, setDirtySubjectIds] = useState<Set<string>>(new Set())
  const [showAllSubjectsInModal, setShowAllSubjectsInModal] = useState(false)
  const [isSubjectSectionExpanded, setIsSubjectSectionExpanded] = useState(true)
  const [openQuickRemarksForSubject, setOpenQuickRemarksForSubject] = useState<string | null>(null)

  // Khảo sát tâm lý & Form đánh giá tâm lý chuẩn
  const [isPsychModalOpen, setIsPsychModalOpen] = useState(false)
  const [psychModalTab, setPsychModalTab] = useState<"referral" | "form">("referral")
  const [psychologyReferralStatus, setPsychologyReferralStatus] = useState("NONE")
  const [psychologyReferralReason, setPsychologyReferralReason] = useState("")
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDeptCode, setSelectedDeptCode] = useState("TO_TLHN")
  const [assignedPsychTeachers, setAssignedPsychTeachers] = useState<any[]>([])
  const [selectedPsychTeacherId, setSelectedPsychTeacherId] = useState("")
  const [selectedPsychTeacherName, setSelectedPsychTeacherName] = useState("")
  const [selectedPsychTeacherEmail, setSelectedPsychTeacherEmail] = useState("")
  const [submittingPsych, setSubmittingPsych] = useState(false)
  const [psychSubmittedSuccess, setPsychSubmittedSuccess] = useState(false)
  const [psychQuestions, setPsychQuestions] = useState<any[]>([])
  const [psychologyData, setPsychologyData] = useState<any>(null)
  const [loadingDeptTeachers, setLoadingDeptTeachers] = useState(false)

  // State cho Form Đánh giá Tâm lý (6 nhóm - 20 câu - 80 điểm) & Nguồn phân công GV Tâm lý
  const [psychAssignmentSource, setPsychAssignmentSource] = useState<"PERIOD_ASSIGNED" | "ORIENTATION_ASSIGNED" | "UNASSIGNED">("UNASSIGNED")
  const [savedPsychTeacherId, setSavedPsychTeacherId] = useState("")
  const [savedPsychTeacherName, setSavedPsychTeacherName] = useState("")
  const [assigningPsychTeacher, setAssigningPsychTeacher] = useState(false)
  const [psychAssignToast, setPsychAssignToast] = useState("")
  const [psychScores, setPsychScores] = useState<number[]>(Array(20).fill(-1))
  const [psychNotes, setPsychNotes] = useState<string[]>(Array(20).fill(""))
  const [psychConclusion, setPsychConclusion] = useState("")
  const [psychRecommendation, setPsychRecommendation] = useState("")
  const [psychActiveSection, setPsychActiveSection] = useState<number | "ALL">(0)
  const [savingPsychAssessment, setSavingPsychAssessment] = useState(false)
  const [psychAssessmentSaved, setPsychAssessmentSaved] = useState(false)

  // Khởi tạo và fetch dữ liệu khi mở Modal
  useEffect(() => {
    if (!isOpen || !student?.id) return

    let isMounted = true
    setLoading(true)

    const fetchData = async () => {
      try {
        const gradeKey = getGradeGroupKey(student?.grade)
        const config = getOrientationGradeGroupConfig(student?.grade)

        // Tải 10 câu hỏi chuẩn Phần A và 5 nhóm Phần B
        const qList = config.criteria.map(c => ({
          id: c.id,
          code: c.code,
          gradeGroup: gradeKey,
          grade: config.label,
          category: c.category,
          categoryLabel: c.categoryLabel,
          questionText: c.name,
          focus: c.focus,
          suggestedGuideline: c.guideline,
          suggestedQuestions: c.suggestedQuestions,
          mandatoryCommentRatings: c.mandatoryCommentRatings,
          sortOrder: c.sortOrder
        }))

        const pGroups = config.parentGroups.map(p => ({
          id: p.id,
          code: p.code,
          category: p.category,
          categoryLabel: p.categoryLabel,
          title: p.title,
          focus: p.focus,
          suggestedQuestions: p.suggestedQuestions,
          placeholder: p.placeholder,
          sortOrder: p.sortOrder
        }))

        // Mặc định mở 3 nhóm đầu tiên của Phần A
        const defaultOpenA: Record<string, boolean> = {}
        qList.forEach((q, idx) => {
          defaultOpenA[q.id] = idx < 3
        })
        setOpenAccordionA(defaultOpenA)

        // Fetch dữ liệu phiếu của học sinh từ DB
        let record: any = null
        let autoAssignedTeacherName = ""
        try {
          const rRes = await fetch(`/api/admin/orientation/records?studentId=${student.id}`)
          if (rRes.ok) {
            const rData = await rRes.json()
            record = rData?.success ? rData.data : null
            const sDetail = rData?.student || record?.student || null
            if (rData?.assignedOrientationTeachers && isMounted) {
              setAssignedOrientationTeachers(rData.assignedOrientationTeachers)
            }
            if (rData?.assignedOrientationTeacher?.teacherName) {
              autoAssignedTeacherName = rData.assignedOrientationTeacher.teacherName
            }
            if (Array.isArray(rData?.assignedSubjectEvaluations) && isMounted) {
              const evalList = rData.assignedSubjectEvaluations.map((ev: any) => {
                if (initialSubjectId && ev.subjectId === initialSubjectId && !ev.isLocked) {
                  return { ...ev, isAssignedToMe: true, canEdit: true }
                }
                return ev
              })
              // Đưa môn đang chọn trên bộ lọc lên đầu danh sách
              evalList.sort((a: any, b: any) => {
                const aInit = initialSubjectId && a.subjectId === initialSubjectId ? 1 : 0
                const bInit = initialSubjectId && b.subjectId === initialSubjectId ? 1 : 0
                if (aInit !== bInit) return bInit - aInit
                if (a.isAssignedToMe !== b.isAssignedToMe) return a.isAssignedToMe ? -1 : 1
                if (a.canEdit !== b.canEdit) return a.canEdit ? -1 : 1
                return 0
              })
              setSubjectEvaluations(evalList)
              setDirtySubjectIds(new Set())
            }
            if (sDetail && isMounted) {
              setStudentDetail((prev: any) => ({ ...prev, ...sDetail }))
              if (sDetail.writtenEnglishScore !== undefined && sDetail.writtenEnglishScore !== null) {
                setWrittenEnglishScore(String(sDetail.writtenEnglishScore))
              }
              if (sDetail.oralEnglishScore !== undefined && sDetail.oralEnglishScore !== null) {
                setOralEnglishScore(String(sDetail.oralEnglishScore))
              }
              if (sDetail.mathScore !== undefined && sDetail.mathScore !== null) {
                setMathScore(String(sDetail.mathScore))
              }
              if (sDetail.literatureScore !== undefined && sDetail.literatureScore !== null) {
                setLiteratureScore(String(sDetail.literatureScore))
              }
            }
            if (record?.psychologyData && isMounted) {
              try {
                const parsed = typeof record.psychologyData === "string" ? JSON.parse(record.psychologyData) : record.psychologyData
                setPsychologyData(parsed)
              } catch (e) {}
            }
          }
        } catch (e) {
          console.error("Error fetching orientation records:", e)
        }

        if (!isMounted) return

        setQuestions(qList)
        setParentGroupsList(pGroups)

        // Parse answers Phần A & B & C
        const initialAnswers: Record<string, QuestionAnswer> = {}
        const initialParentAnswers: Record<string, ParentAnswer> = {}
        let savedAnswersList: any[] = []
        let savedParentList: any[] = []
        let parsedInterviewData: any = null

        if (record?.interviewData) {
          try {
            const parsed = typeof record.interviewData === "string" ? JSON.parse(record.interviewData) : record.interviewData
            parsedInterviewData = parsed
            if (Array.isArray(parsed)) {
              savedAnswersList = parsed
            } else if (parsed && typeof parsed === "object") {
              savedAnswersList = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed.criteriaResults) ? parsed.criteriaResults : [])
              savedParentList = Array.isArray(parsed.parentItems) ? parsed.parentItems : []
              if (parsed.summary9Items) {
                setSummary9(parsed.summary9Items)
              }
              if (parsed.historyVersions) {
                setHistoryVersions(parsed.historyVersions)
              }
              if (parsed.gradeGroup) {
                setSavedGradeGroup(parsed.gradeGroup)
                if (parsed.gradeGroup !== gradeKey && parsed.gradeGroup !== "KHOI_1") {
                  setShowGradeChangeWarning(true)
                }
              }
            }
          } catch (e) {}
        }

        // Điền answers Phần A
        qList.forEach((q) => {
          const matched = savedAnswersList.find((a: any) =>
            a.questionId === q.id || a.criterionId === q.id || a.category === q.category || a.code === q.code
          )
          const comment = matched?.teacherComment || matched?.notes || ""
          const sNotes = matched?.studentNotes || (matched?.notes !== comment ? matched?.notes : "") || ""
          initialAnswers[q.id] = {
            questionId: q.id,
            code: q.code,
            questionText: q.questionText,
            category: q.category,
            categoryLabel: q.categoryLabel,
            focus: q.focus,
            rating: (matched?.rating as RatingCode) || "NORMAL",
            notes: comment,
            studentNotes: sNotes,
            teacherComment: comment,
            evidenceSource: matched?.evidenceSource || "STUDENT_SHARED",
            suggestedQuestions: q.suggestedQuestions || []
          }
        })
        setAnswers(initialAnswers)

        // Điền answers Phần B
        pGroups.forEach((p, idx) => {
          const matched = savedParentList.find((pa: any) =>
            pa.groupId === p.id || pa.category === p.category || pa.groupCode === p.code
          )
          let fallbackAns = ""
          if (idx === 0) fallbackAns = record?.parentPersonalityNotes || ""
          else if (idx === 1) fallbackAns = record?.parentHealthNotes || ""
          else if (idx === 2) fallbackAns = record?.parentSpecialRequests || ""
          else if (idx === 3) fallbackAns = record?.cooperationCommitment || ""
          else if (idx === 4) fallbackAns = record?.parentExpectations || ""

          initialParentAnswers[p.id] = {
            groupId: p.id,
            groupCode: p.code,
            category: p.category,
            categoryLabel: p.categoryLabel,
            title: p.title,
            focus: p.focus,
            answer: matched?.answer || fallbackAns,
            teacherNote: matched?.teacherNote || "",
            suggestedQuestions: p.suggestedQuestions || []
          }
        })
        setParentAnswers(initialParentAnswers)

        const resolvedTeacherName =
          record?.interviewerName ||
          autoAssignedTeacherName ||
          student?.assignedTeacherName ||
          ""

        if (record) {
          setInterviewerName(resolvedTeacherName)
          if (record.interviewDate) {
            try {
              const dStr = new Date(record.interviewDate).toISOString().split("T")[0]
              setInterviewDate(dStr)
            } catch (e) {}
          }

          // Khởi tạo 9 mục tổng hợp nếu chưa có từ parsed interviewData
          if (!parsedInterviewData?.summary9Items) {
            setSummary9({
              strongPoints: record.studentStrengths || "",
              interestsMotivation: "",
              adaptabilityAutonomy: record.adaptationLevel === "CONFIDENT" ? "Thích nghi nhanh, tự tin và chủ động" : "Cần hỗ trợ làm quen môi trường",
              difficultiesNeeds: record.studentNeedsSupport || "",
              studentExpectations: "",
              parentExpectations: record.parentExpectations || "",
              alignmentDifferences: "",
              initialRecommendations: record.interviewerGeneralRemark || record.proposedClassPlacement || "",
              verificationItems: ""
            })
          }

          // GV phụ trách định hướng & Thẩm định
          if (parsedInterviewData?.verification) {
            setVerificationStatus(parsedInterviewData.verification.status || "PENDING")
            setVerifierName(parsedInterviewData.verification.verifiedBy || resolvedTeacherName)
            setVerifiedAt(parsedInterviewData.verification.verifiedAt || "")
            setVerificationNotes(parsedInterviewData.verification.notes || "")
            setSupportReferralConfirmed(!!parsedInterviewData.verification.supportReferralConfirmed)
          } else {
            setVerifierName(resolvedTeacherName)
          }

          setParentRepresentativeName(record.parentRepresentativeName || "")
          setParentPhone(record.parentPhone || student.parentPhone || "")
          setProposedEduSystem(record.proposedEduSystem || student?.surveyFormType || student?.surveySystem || "Chất lượng cao (CLC)")
          setProposedClassPlacement(record.proposedClassPlacement || "Xếp lớp theo phân bổ tuyển sinh")
          setAdmissionConsultantNote(record.admissionConsultantNote || "")

          // Parse GĐCS Directives & Actions
          if (record.admissionConsultantNote) {
            try {
              if (record.admissionConsultantNote.trim().startsWith("{")) {
                const parsed = JSON.parse(record.admissionConsultantNote)
                if (parsed.gdcsDecision) setGdcsDecision(parsed.gdcsDecision)
                if (parsed.gdcsGeneralNote !== undefined) setGdcsGeneralNote(parsed.gdcsGeneralNote)
                if (parsed.delegateTeacher !== undefined) setGdcsDelegateTeacher(!!parsed.delegateTeacher)
                if (parsed.delegatedTeacherName) setGdcsDelegatedTeacherName(parsed.delegatedTeacherName)
                if (parsed.delegatedTeacherId) setGdcsDelegatedTeacherId(parsed.delegatedTeacherId)
                if (parsed.delegationNote) setGdcsDelegationNote(parsed.delegationNote)
                if (parsed.scheduleMeeting !== undefined) setGdcsScheduleMeeting(!!parsed.scheduleMeeting)
                if (parsed.meetingTime) setGdcsMeetingTime(parsed.meetingTime)
                if (parsed.meetingLocation) setGdcsMeetingLocation(parsed.meetingLocation)
                if (parsed.meetingParticipants) setGdcsMeetingParticipants(parsed.meetingParticipants)
                if (parsed.meetingAgenda) setGdcsMeetingAgenda(parsed.meetingAgenda)
                if (parsed.directParentMeeting !== undefined) setGdcsDirectParentMeeting(!!parsed.directParentMeeting)
                if (parsed.parentMeetingTime) setGdcsParentMeetingTime(parsed.parentMeetingTime)
                if (parsed.parentMeetingLocation) setGdcsParentMeetingLocation(parsed.parentMeetingLocation)
                if (parsed.parentMeetingContent) setGdcsParentMeetingContent(parsed.parentMeetingContent)
              } else {
                setGdcsGeneralNote(record.admissionConsultantNote)
              }
            } catch (e) {
              setGdcsGeneralNote(record.admissionConsultantNote)
            }
          }
        } else if (resolvedTeacherName) {
          setInterviewerName(resolvedTeacherName)
          setVerifierName(resolvedTeacherName)
        }

        // Tải thông tin Tổ tâm lý & dữ liệu Form Tâm lý nếu có
        try {
          const pRes = await fetch(`/api/admin/orientation/psychology-referral?studentId=${student.id}`)
          if (pRes.ok) {
            const pData = await pRes.json()
            if (pData?.success && isMounted) {
              setDepartments(pData.departments || [])
              setSelectedDeptCode(pData.selectedDepartmentCode || "TO_TLHN")
              const teachers = pData.assignedTeachers || pData.tlhnTeachers || []
              setAssignedPsychTeachers(teachers)
              setPsychQuestions(pData.psychologyQuestions || [])
              const refStatus = pData.referralStatus || record?.psychologyReferralStatus || "NONE"
              setPsychologyReferralStatus(refStatus)
              setPsychologyReferralReason(pData.referralReason || record?.psychologyReferralReason || "")
              const src = pData.assignmentSource || "UNASSIGNED"
              setPsychAssignmentSource(src)

              // Tự động chọn GV Tâm lý đã được gán hoặc GV đầu tiên được phân công trong đợt
              const currentPsychTeacherId = pData.referralTeacherId || record?.psychologyTeacherId || teachers[0]?.teacherId || ""
              const currentPsychTeacherObj = teachers.find((t: any) => t.teacherId === currentPsychTeacherId) || teachers[0]
              if (currentPsychTeacherObj) {
                const tId = currentPsychTeacherObj.teacherId || ""
                const tName = pData.referralTeacherName || record?.psychologyTeacherName || currentPsychTeacherObj.teacherName || ""
                setSelectedPsychTeacherId(tId)
                setSelectedPsychTeacherName(tName)
                setSelectedPsychTeacherEmail(currentPsychTeacherObj.teacherEmail || "")
                if (src !== "UNASSIGNED") {
                  setSavedPsychTeacherId(tId)
                  setSavedPsychTeacherName(tName)
                }
              } else if (pData.referralTeacherName || record?.psychologyTeacherName) {
                const tName = pData.referralTeacherName || record?.psychologyTeacherName || ""
                setSelectedPsychTeacherName(tName)
                setSavedPsychTeacherName(tName)
              }

              const pDataObj = pData.psychologyData || (record?.psychologyData ? (typeof record.psychologyData === "string" ? JSON.parse(record.psychologyData) : record.psychologyData) : null)
              if (pDataObj && isMounted) {
                setPsychologyData(pDataObj)
                if (Array.isArray(pDataObj.scores) && pDataObj.scores.length > 0) {
                  const loadedScores = Array(20).fill(-1)
                  pDataObj.scores.slice(0, 20).forEach((s: any, i: number) => {
                    loadedScores[i] = Number.isFinite(Number(s)) ? Number(s) : -1
                  })
                  setPsychScores(loadedScores)
                }
                if (Array.isArray(pDataObj.notes) && pDataObj.notes.length > 0) {
                  const loadedNotes = Array(20).fill("")
                  pDataObj.notes.slice(0, 20).forEach((n: any, i: number) => {
                    loadedNotes[i] = String(n || "")
                  })
                  setPsychNotes(loadedNotes)
                }
                if (pDataObj.conclusion) setPsychConclusion(pDataObj.conclusion)
                if (pDataObj.recommendation) setPsychRecommendation(pDataObj.recommendation)
                setPsychModalTab("form")
              } else if (refStatus === "REQUESTED" || src !== "UNASSIGNED") {
                setPsychModalTab("form")
              }
            }
          }
        } catch (pErr) {}

      } catch (err) {
        console.error("Lỗi khi tải dữ liệu phiếu định hướng:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [isOpen, student])

  // Lắng nghe thay đổi để đánh dấu Unsaved Changes & Hỗ trợ Auto-save có kiểm soát
  const markDirty = () => {
    setHasUnsavedChanges(true)
  }

  // Tự động lưu nháp (Auto-save) sau 20s khi có thay đổi
  useEffect(() => {
    if (!hasUnsavedChanges || saving) return

    const timer = setTimeout(() => {
      handleSave(true) // isAutoSave = true
    }, 20000)

    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, answers, parentAnswers, summary9, saving])

  // Thay đổi mức đánh giá 4 mức
  const handleRatingChange = (qId: string, rating: RatingCode) => {
    markDirty()
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        rating
      }
    }))
    if (!isCommentMandatory(rating)) {
      setValidationErrors(prev => ({
        ...prev,
        [qId]: false
      }))
    }
  }

  // Thay đổi nguồn minh chứng
  const handleEvidenceSourceChange = (qId: string, source: EvidenceSource) => {
    markDirty()
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        evidenceSource: source
      }
    }))
  }

  // Thay đổi câu trả lời học sinh
  const handleStudentNotesChange = (qId: string, text: string) => {
    markDirty()
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        studentNotes: text
      }
    }))
  }

  // Thay đổi nhận xét giáo viên
  const handleTeacherCommentChange = (qId: string, text: string) => {
    markDirty()
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        teacherComment: text,
        notes: text
      }
    }))
    if (text.trim()) {
      setValidationErrors(prev => ({
        ...prev,
        [qId]: false
      }))
    }
  }

  // Thay đổi câu trả lời Phần B (Phụ huynh)
  const handleParentAnswerChange = (pId: string, field: "answer" | "teacherNote", text: string) => {
    markDirty()
    setParentAnswers(prev => ({
      ...prev,
      [pId]: {
        ...prev[pId],
        [field]: text
      }
    }))
  }

  // Thay đổi 9 mục tổng hợp Phần C
  const handleSummary9Change = (field: keyof Summary9Items, text: string) => {
    markDirty()
    setSummary9(prev => ({
      ...prev,
      [field]: text
    }))
  }

  // Cập nhật điểm môn khảo sát theo phân công ngay trong Phiếu Định Hướng
  const handleSubjectScoreChange = (subjectId: string, colIdx: number, val: string) => {
    markDirty()
    setDirtySubjectIds(prev => {
      const next = new Set(prev)
      next.add(subjectId)
      return next
    })
    setSubjectEvaluations(prev =>
      prev.map(ev => {
        if (ev.subjectId !== subjectId) return ev
        const newScoreVals = [...(ev.scoreVals || [])]
        newScoreVals[colIdx] = val
        // Tự động tính điểm tổng hợp nếu môn có nhiều hơn 1 cột điểm số
        const isNumericType = !ev.gradeConfig?.scoreColumnTypes?.some((t: string) => t && t !== "SCORE_10")
        const numCols = ev.gradeConfig?.scoreColumns || 1
        if (isNumericType && numCols > 1 && colIdx < numCols) {
          let sum = 0
          let hasAny = false
          for (let i = 0; i < numCols; i++) {
            const v = parseFloat(String(newScoreVals[i] ?? "").replace(",", "."))
            if (!isNaN(v)) {
              sum += v
              hasAny = true
            }
          }
          newScoreVals[numCols] = hasAny ? String(Math.round(sum * 100) / 100) : ""
        }

        // Đồng bộ trực tiếp với mathScore / literatureScore / writtenEnglishScore / oralEnglishScore trên Header 12 cột
        const subNameNorm = String(ev.subjectName || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
        const primaryVal = String(
          numCols > 1 && newScoreVals[numCols] !== undefined && newScoreVals[numCols] !== ""
            ? newScoreVals[numCols]
            : newScoreVals[0] ?? ""
        ).trim()

        if (subNameNorm.includes("toan") || subNameNorm.includes("math")) {
          setMathScore(primaryVal)
        } else if (subNameNorm.includes("ngu van") || subNameNorm.includes("tieng viet") || subNameNorm.includes("van")) {
          setLiteratureScore(primaryVal)
        } else if (subNameNorm.includes("tieng anh") || subNameNorm.includes("english")) {
          if (numCols >= 2) {
            if (newScoreVals[0] !== undefined) setWrittenEnglishScore(String(newScoreVals[0]))
            if (newScoreVals[1] !== undefined) setOralEnglishScore(String(newScoreVals[1]))
          } else {
            setWrittenEnglishScore(primaryVal)
          }
        }

        return {
          ...ev,
          scoreVals: newScoreVals
        }
      })
    )
  }

  // Cập nhật nhận xét môn khảo sát theo phân công
  const handleSubjectCommentChange = (subjectId: string, colIdx: number, val: string) => {
    markDirty()
    setDirtySubjectIds(prev => {
      const next = new Set(prev)
      next.add(subjectId)
      return next
    })
    setSubjectEvaluations(prev =>
      prev.map(ev => {
        if (ev.subjectId !== subjectId) return ev
        const newCommentVals = [...(ev.commentVals || [""])]
        newCommentVals[colIdx] = val
        return {
          ...ev,
          commentVals: newCommentVals
        }
      })
    )
  }

  // Lưu nhanh điểm 1 môn khảo sát ngay trong Phiếu Định Hướng
  const handleSaveSingleSubject = async (ev: any) => {
    if (!student?.id || !ev?.subjectId) return
    setSavingSubjectMap(prev => ({ ...prev, [ev.subjectId]: "saving" }))
    try {
      const res = await fetch("/api/teacher-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          subjectId: ev.subjectId,
          scores: ev.scoreVals || [],
          comments: ev.commentVals || []
        })
      })
      if (res.ok) {
        setSavingSubjectMap(prev => ({ ...prev, [ev.subjectId]: "saved" }))
        setDirtySubjectIds(prev => {
          const next = new Set(prev)
          next.delete(ev.subjectId)
          return next
        })
        setSubjectEvaluations(prev =>
          prev.map(item =>
            item.subjectId === ev.subjectId
              ? { ...item, isSaved: true, updatedAt: new Date().toISOString() }
              : item
          )
        )
        setTimeout(() => {
          setSavingSubjectMap(prev => ({ ...prev, [ev.subjectId]: "idle" }))
        }, 2500)
        if (onSuccess) onSuccess()
      } else {
        const errData = await res.json().catch(() => ({}))
        setSavingSubjectMap(prev => ({ ...prev, [ev.subjectId]: "error" }))
        alert(errData?.error || "Không thể lưu điểm môn học.")
      }
    } catch (e: any) {
      setSavingSubjectMap(prev => ({ ...prev, [ev.subjectId]: "error" }))
      alert("Lỗi kết nối khi lưu điểm môn: " + e.message)
    }
  }

  const toggleAccordionA = (qId: string) => {
    setOpenAccordionA(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }))
  }

  const toggleHint = (qId: string) => {
    setOpenHints(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }))
  }

  // AI Gợi ý câu hỏi
  const handleAiSuggestQuestions = async (q: any) => {
    try {
      setAiQuestionLoading(prev => ({ ...prev, [q.id]: true }))
      const ans = answers[q.id]
      const currentNotes = (ans?.studentNotes || ans?.teacherComment || "").trim()

      const res = await fetch("/api/admin/orientation/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_questions",
          grade: student?.grade,
          gradeGroupKey,
          criterionName: q.questionText || q.name,
          categoryLabel: q.categoryLabel,
          guideline: q.focus || q.suggestedGuideline,
          studentName: student?.fullName,
          currentNotes,
          existingQuestions: q.suggestedQuestions || []
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data?.success && Array.isArray(data?.questions)) {
          setAiSuggestedQuestions(prev => ({ ...prev, [q.id]: data.questions }))
          setOpenAiQuestions(prev => ({ ...prev, [q.id]: true }))
        }
      }
    } catch (e) {
      console.error("Lỗi khi AI gợi ý câu hỏi:", e)
    } finally {
      setAiQuestionLoading(prev => ({ ...prev, [q.id]: false }))
    }
  }

  // AI Dự thảo nhận xét
  const handleAiDraftComment = async (q: any) => {
    try {
      setAiCommentLoading(prev => ({ ...prev, [q.id]: true }))
      const ans = answers[q.id] || { rating: "NORMAL", notes: "", studentNotes: "" }
      const rawNotes = (ans?.studentNotes || ans?.teacherComment || "").trim()

      const res = await fetch("/api/admin/orientation/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft_comment",
          criterionName: q.questionText || q.name,
          rating: ans.rating,
          rawNotes,
          guideline: q.focus || q.suggestedGuideline,
          studentName: student?.fullName,
          grade: student?.grade
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data?.success && data?.draftComment) {
          setAiDraftComments(prev => ({ ...prev, [q.id]: data.draftComment }))
          setShowAiDraftBox(prev => ({ ...prev, [q.id]: true }))
        }
      }
    } catch (e) {
      console.error("Lỗi khi AI hỗ trợ nhận xét:", e)
    } finally {
      setAiCommentLoading(prev => ({ ...prev, [q.id]: false }))
    }
  }

  const handleApplyAiComment = (qId: string) => {
    const draft = aiDraftComments[qId]
    if (draft) {
      handleTeacherCommentChange(qId, draft)
      setShowAiDraftBox(prev => ({ ...prev, [qId]: false }))
    }
  }

  // AI Tổng hợp nhận diện (9 mục chuẩn hóa)
  const handleAiSynthesizeSummary = async () => {
    try {
      setAiSummaryLoading(true)
      const res = await fetch("/api/admin/orientation/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "synthesize_summary",
          student: studentDetail || student,
          criteriaAnswers: answers,
          parentData: {
            parentExpectations: parentAnswers[parentGroupsList[4]?.id]?.answer || "",
            parentPersonalityNotes: parentAnswers[parentGroupsList[0]?.id]?.answer || "",
            parentSpecialRequests: parentAnswers[parentGroupsList[2]?.id]?.answer || "",
            cooperationCommitment: parentAnswers[parentGroupsList[3]?.id]?.answer || "",
            parentHealthNotes: parentAnswers[parentGroupsList[1]?.id]?.answer || ""
          },
          surveyScores: {
            mathScore,
            literatureScore,
            writtenEnglishScore,
            oralEnglishScore,
            subjectEvaluations: subjectEvaluations
              .filter(ev => ev.scoreVals?.some((v: any) => String(v || "").trim() !== "") || ev.commentVals?.some((c: any) => String(c || "").trim() !== ""))
              .map(ev => ({
                subjectName: ev.subjectName,
                scores: ev.scoreVals,
                comments: ev.commentVals
              }))
          }
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data?.success) {
          setAiSummaryData(data)
          setShowAiSummaryDrawer(true)
        }
      }
    } catch (e) {
      console.error("Lỗi khi AI tổng hợp hồ sơ định hướng:", e)
    } finally {
      setAiSummaryLoading(false)
    }
  }

  // Áp dụng dự thảo tổng hợp AI vào 9 mục
  const handleApplyAiSummaryAll = () => {
    if (!aiSummaryData) return
    markDirty()
    setSummary9({
      strongPoints: aiSummaryData.strongPoints || aiSummaryData.diemManhNoiBat || summary9.strongPoints,
      interestsMotivation: aiSummaryData.interestsMotivation || summary9.interestsMotivation,
      adaptabilityAutonomy: aiSummaryData.adaptabilityAutonomy || aiSummaryData.khaNangThichNghi || summary9.adaptabilityAutonomy,
      difficultiesNeeds: aiSummaryData.difficultiesNeeds || aiSummaryData.noiDungCanPhatTrien || summary9.difficultiesNeeds,
      studentExpectations: aiSummaryData.studentExpectations || summary9.studentExpectations,
      parentExpectations: aiSummaryData.parentExpectations || summary9.parentExpectations,
      alignmentDifferences: aiSummaryData.alignmentDifferences || summary9.alignmentDifferences,
      initialRecommendations: aiSummaryData.initialRecommendations || aiSummaryData.deXuatHoTroBanDau || summary9.initialRecommendations,
      verificationItems: aiSummaryData.verificationItems || aiSummaryData.noiDungCanXacMinh || summary9.verificationItems
    })
    setShowAiSummaryDrawer(false)
  }

  const buildGdcsConsultantPayload = () => {
    return JSON.stringify({
      gdcsDecision,
      gdcsGeneralNote,
      delegateTeacher: gdcsDelegateTeacher,
      delegatedTeacherName: gdcsDelegatedTeacherName,
      delegatedTeacherId: gdcsDelegatedTeacherId,
      delegationNote: gdcsDelegationNote,
      scheduleMeeting: gdcsScheduleMeeting,
      meetingTime: gdcsMeetingTime,
      meetingLocation: gdcsMeetingLocation,
      meetingParticipants: gdcsMeetingParticipants,
      meetingAgenda: gdcsMeetingAgenda,
      directParentMeeting: gdcsDirectParentMeeting,
      parentMeetingTime: gdcsParentMeetingTime,
      parentMeetingLocation: gdcsParentMeetingLocation,
      parentMeetingContent: gdcsParentMeetingContent,
      notifiedConsultant: true,
      notifiedTeacher: gdcsDelegateTeacher
    })
  }

  // Lưu dữ liệu phiếu định hướng (hỗ trợ cả lưu thủ công & tự động lưu nháp)
  const handleSave = async (isAutoSave = false) => {
    try {
      if (!isAutoSave) setSaving(true)

      // Kiểm tra validation nhận xét nếu bấm Hoàn thành / Lưu chính thức
      if (!isAutoSave) {
        const missingCriteria: string[] = []
        const errMap: Record<string, boolean> = {}

        questions.forEach((q: any) => {
          const ans = answers[q.id]
          if (ans && isCommentMandatory(ans.rating)) {
            const comment = (ans.teacherComment || ans.notes || "").trim()
            if (!comment) {
              missingCriteria.push(`"${q.questionText || q.name}" (${ans.rating === "NEED_SUPPORT" ? "Cần tìm hiểu thêm" : "Chưa đủ thông tin"})`)
              errMap[q.id] = true
            }
          }
        })

        if (missingCriteria.length > 0) {
          setValidationErrors(errMap)
          setActiveTab("tab1")
          alert(`BẮT BUỘC NHẬP NHẬN XÉT GIÁO VIÊN:\n\nKhi đánh giá mức "Cần tìm hiểu thêm" hoặc "Chưa đủ thông tin", giáo viên bắt buộc phải nhập nhận xét lý do & biểu hiện cụ thể cho các tiêu chí:\n- ${missingCriteria.join("\n- ")}`)
          setSaving(false)
          return
        }
        setValidationErrors({})
      }

      // Danh sách tiêu chí Phần A
      const itemsArray = questions.map((q: any) => {
        const ans = answers[q.id] || {}
        const comment = (ans.teacherComment || ans.notes || "").trim()
        const sNotes = (ans.studentNotes || "").trim()
        return {
          questionId: q.id,
          criterionId: q.id,
          code: q.code,
          questionText: q.questionText || q.name,
          category: q.category,
          categoryLabel: q.categoryLabel,
          focus: q.focus,
          rating: ans.rating || "NORMAL",
          studentNotes: sNotes,
          teacherComment: comment,
          notes: comment,
          evidenceSource: ans.evidenceSource || "STUDENT_SHARED",
          suggestedQuestions: q.suggestedQuestions || []
        }
      })

      // Danh sách 5 nhóm Phần B (Phụ huynh)
      const parentItemsArray = parentGroupsList.map((p: any) => {
        const pAns = parentAnswers[p.id] || {}
        return {
          groupId: p.id,
          groupCode: p.code,
          category: p.category,
          categoryLabel: p.categoryLabel,
          title: p.title,
          focus: p.focus,
          answer: pAns.answer || "",
          teacherNote: pAns.teacherNote || "",
          suggestedQuestions: p.suggestedQuestions || []
        }
      })

      // Lưu trữ cấu trúc phiên bản 2026.3
      const effectiveTeacherName = verifierName || interviewerName || ""
      const richInterviewPayload = {
        version: ORIENTATION_CRITERIA_VERSION,
        gradeGroup: gradeGroupKey,
        formGrade: student?.grade,
        interviewDate,
        interviewerName: effectiveTeacherName,
        items: itemsArray,
        criteriaResults: itemsArray,
        parentItems: parentItemsArray,
        summary9Items: summary9,
        proposedPlacementRecommendation: summary9.initialRecommendations || proposedClassPlacement,
        verification: {
          status: verificationStatus,
          verifiedBy: effectiveTeacherName,
          verifiedAt: verifiedAt || (verificationStatus !== "PENDING" ? new Date().toISOString() : null),
          notes: verificationNotes,
          supportReferralConfirmed
        },
        historyVersions
      }

      const gdcsPayloadStr = buildGdcsConsultantPayload()

      const payload = {
        studentId: student.id,
        interviewDate: new Date(interviewDate).toISOString(),
        interviewerName: effectiveTeacherName,
        adaptationLevel: summary9.adaptabilityAutonomy ? (summary9.adaptabilityAutonomy.includes("tự tin") ? "CONFIDENT" : "NORMAL") : "CONFIDENT",
        interviewData: JSON.stringify(richInterviewPayload),
        studentStrengths: summary9.strongPoints,
        studentNeedsSupport: summary9.difficultiesNeeds,
        interviewerGeneralRemark: summary9.initialRecommendations || admissionConsultantNote,
        parentRepresentativeName,
        parentPhone,
        parentExpectations: summary9.parentExpectations || parentAnswers[parentGroupsList[4]?.id]?.answer || "",
        parentHealthNotes: parentAnswers[parentGroupsList[1]?.id]?.answer || "",
        parentPersonalityNotes: parentAnswers[parentGroupsList[0]?.id]?.answer || "",
        parentSpecialRequests: parentAnswers[parentGroupsList[2]?.id]?.answer || "",
        cooperationCommitment: parentAnswers[parentGroupsList[3]?.id]?.answer || "",
        proposedEduSystem,
        proposedClassPlacement: summary9.initialRecommendations || proposedClassPlacement,
        admissionConsultantNote: gdcsPayloadStr,
        gdcsDecision,
        gdcsGeneralNote,
        writtenEnglishScore,
        oralEnglishScore,
        mathScore,
        literatureScore,
        subjectEvaluations: subjectEvaluations
          .filter(ev => ev.canEdit && !ev.isLocked && (dirtySubjectIds.has(ev.subjectId) || ev.scoreVals?.some((v: any) => String(v || "").trim() !== "") || ev.commentVals?.some((c: any) => String(c || "").trim() !== "")))
          .map(ev => ({
            subjectId: ev.subjectId,
            subjectName: ev.subjectName,
            scoreVals: ev.scoreVals || [],
            commentVals: ev.commentVals || []
          }))
      }

      const res = await fetch("/api/admin/orientation/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (data.success) {
        setHasUnsavedChanges(false)
        const now = new Date()
        setLastSavedTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
        if (!isAutoSave) {
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 3000)
          if (onSuccess) onSuccess()
        }
      } else {
        if (!isAutoSave) alert("Lỗi khi lưu phiếu định hướng: " + (data.error || "Không xác định"))
      }
    } catch (e: any) {
      if (!isAutoSave) alert("Lỗi: " + e.message)
    } finally {
      if (!isAutoSave) setSaving(false)
    }
  }

  // Đổi Tổ chuyên môn để lọc danh sách Giáo viên Tâm lý
  const handleDepartmentChange = async (deptCode: string) => {
    setSelectedDeptCode(deptCode)
    setLoadingDeptTeachers(true)
    try {
      const res = await fetch(`/api/admin/orientation/psychology-referral?studentId=${student.id}&departmentCode=${encodeURIComponent(deptCode)}`)
      if (res.ok) {
        const data = await res.json()
        const teachers = data.assignedTeachers || data.tlhnTeachers || []
        setAssignedPsychTeachers(teachers)
        if (teachers.length > 0) {
          setSelectedPsychTeacherId(teachers[0].teacherId || "")
          setSelectedPsychTeacherName(teachers[0].teacherName || "")
          setSelectedPsychTeacherEmail(teachers[0].teacherEmail || "")
        } else {
          setSelectedPsychTeacherId("")
          setSelectedPsychTeacherName("")
          setSelectedPsychTeacherEmail("")
        }
      }
    } catch (e) {
      console.error("Lỗi khi tải GV theo tổ:", e)
    } finally {
      setLoadingDeptTeachers(false)
    }
  }

  // Gán nhanh GV Tâm lý khi GV Định hướng chọn từ danh sách & chuyển sang tiến hành đánh giá
  const handleQuickAssignPsychTeacher = async (targetTeacherId?: string, targetTeacherName?: string, openFormAfter = true) => {
    const tId = targetTeacherId ?? selectedPsychTeacherId
    const tName = targetTeacherName ?? selectedPsychTeacherName
    if (!tId && !tName) return

    setAssigningPsychTeacher(true)
    setPsychAssignToast("")
    try {
      const res = await fetch("/api/admin/orientation/psychology-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assignPsychTeacher",
          studentId: student.id,
          teacherId: tId,
          teacherName: tName,
          reason: psychologyReferralReason.trim() || "Phân công khảo sát tâm lý từ Phiếu định hướng"
        })
      })
      const data = await res.json()
      if (data.success) {
        const finalId = data.data?.teacherId || tId
        const finalName = data.data?.teacherName || tName
        setSavedPsychTeacherId(finalId)
        setSavedPsychTeacherName(finalName)
        setSelectedPsychTeacherId(finalId)
        setSelectedPsychTeacherName(finalName)
        setPsychAssignmentSource("ORIENTATION_ASSIGNED")
        if (psychologyReferralStatus === "NONE") {
          setPsychologyReferralStatus("REQUESTED")
        }
        setPsychAssignToast(`✓ Đã gán GV Tâm lý ${finalName} phụ trách đánh giá học sinh này!`)
        setTimeout(() => setPsychAssignToast(""), 4500)
        if (openFormAfter) {
          setPsychModalTab("form")
        }
        if (onSuccess) onSuccess()
      } else {
        alert("Lỗi khi gán GV Tâm lý: " + (data.error || "Không xác định"))
      }
    } catch (e: any) {
      console.error("Lỗi khi gán GV Tâm lý:", e)
    } finally {
      setAssigningPsychTeacher(false)
    }
  }

  // Gửi đề xuất & phân công Giáo viên Tâm lý (kèm thông báo Email)
  const handleSubmitPsychReferral = async () => {
    if (!psychologyReferralReason.trim()) {
      alert("Vui lòng nhập hoặc chọn biểu hiện / lý do cần khảo sát tâm lý.")
      return
    }
    setSubmittingPsych(true)
    setPsychSubmittedSuccess(false)
    try {
      const res = await fetch("/api/admin/orientation/psychology-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          reason: psychologyReferralReason.trim(),
          teacherId: selectedPsychTeacherId,
          teacherName: selectedPsychTeacherName,
          teacherEmail: selectedPsychTeacherEmail,
          notifyEmail: true
        })
      })
      const data = await res.json()
      if (data.success) {
        setPsychologyReferralStatus("REQUESTED")
        setSavedPsychTeacherId(selectedPsychTeacherId)
        setSavedPsychTeacherName(selectedPsychTeacherName)
        if (psychAssignmentSource === "UNASSIGNED") {
          setPsychAssignmentSource("ORIENTATION_ASSIGNED")
        }
        setPsychSubmittedSuccess(true)
        setPsychModalTab("form")
        if (onSuccess) onSuccess()
      } else {
        alert("Lỗi khi gửi đề xuất: " + (data.error || "Không xác định"))
      }
    } catch (e: any) {
      alert("Lỗi khi gửi đề xuất: " + e.message)
    } finally {
      setSubmittingPsych(false)
    }
  }

  // Các hàm tính điểm cho Form Đánh giá Tâm lý chuẩn hóa (6 nhóm - 20 câu - 80 điểm)
  const calculatePsychSectionScore = (sectionIdx: number) => {
    if (!Array.isArray(psychQuestions) || !psychQuestions[sectionIdx]) return 0
    let offset = 0
    for (let i = 0; i < sectionIdx; i++) {
      offset += (psychQuestions[i]?.questions?.length || 0)
    }
    const len = psychQuestions[sectionIdx]?.questions?.length || 0
    return psychScores
      .slice(offset, offset + len)
      .reduce((sum, val) => sum + (val >= 0 ? val : 0), 0)
  }

  const psychAnsweredCount = psychScores.filter(s => s >= 0).length
  const psychProgress = Math.round((psychAnsweredCount / 20) * 100)
  const psychTotalScore = psychScores.reduce((sum, val) => sum + (val >= 0 ? val : 0), 0)

  const getPsychEvaluation = (score: number) => {
    const rawGrade = String(studentDetail?.grade || student?.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim()
    const isGrades6to12 = ["6", "7", "8", "9", "10", "11", "12"].includes(rawGrade)
    if (isGrades6to12) {
      if (score <= 15) return { level: "Bình thường", suggestion: "Ổn định, thích nghi tốt", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" }
      if (score <= 31) return { level: "Dấu hiệu nhẹ", suggestion: "Theo dõi - hỗ trợ tâm lý học đường", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" }
      if (score <= 47) return { level: "Dấu hiệu vừa", suggestion: "Quan sát sâu, tư vấn cá nhân", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" }
      if (score <= 63) return { level: "Nguy cơ cao", suggestion: "Đánh giá chuyên sâu, can thiệp định kỳ", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" }
      return { level: "Nguy cơ rất cao", suggestion: "Cần can thiệp chuyên môn, phối hợp phụ huynh", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" }
    }
    if (score <= 15) return { level: "Bình thường", suggestion: "Có thể theo học bình thường", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" }
    if (score <= 31) return { level: "Dấu hiệu nhẹ", suggestion: "Theo dõi - hỗ trợ thích nghi", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" }
    if (score <= 47) return { level: "Dấu hiệu vừa", suggestion: "Quan sát sâu, can thiệp nhẹ nếu cần", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" }
    if (score <= 63) return { level: "Nguy cơ cao", suggestion: "Cần đánh giá chuyên sâu và can thiệp", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" }
    return { level: "Nguy cơ rất cao", suggestion: "Cần can thiệp chuyên môn sớm (bảo đảm an toàn và hỗ trợ)", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" }
  }

  const psychEvaluation = getPsychEvaluation(psychTotalScore)

  // Lưu trực tiếp kết quả khảo sát & đánh giá tâm lý theo Form Tâm lý
  const handleSavePsychAssessment = async () => {
    setSavingPsychAssessment(true)
    setPsychAssessmentSaved(false)
    try {
      const normalizedScores = psychScores.map(s => (s >= 0 ? s : 0))
      const sectionScores = Array.isArray(psychQuestions)
        ? psychQuestions.map((_, idx) => calculatePsychSectionScore(idx))
        : []
      const evalObj = getPsychEvaluation(psychTotalScore)

      const res = await fetch("/api/admin/orientation/psychology-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "savePsychologyAssessment",
          studentId: student.id,
          teacherId: selectedPsychTeacherId,
          teacherName: selectedPsychTeacherName,
          reason: psychologyReferralReason,
          scores: normalizedScores,
          sectionScores,
          totalScore: psychTotalScore,
          evaluation: evalObj,
          conclusion: psychConclusion,
          recommendation: psychRecommendation,
          notes: psychNotes
        })
      })

      const data = await res.json()
      if (data.success) {
        setPsychologyReferralStatus("COMPLETED")
        setPsychologyData(data.data?.psychologyData || {
          scores: normalizedScores,
          sectionScores,
          totalScore: psychTotalScore,
          evaluation: evalObj,
          conclusion: psychConclusion,
          recommendation: psychRecommendation,
          notes: psychNotes,
          assessedBy: selectedPsychTeacherName || data.data?.teacherName || "GV Tâm lý",
          assessedAtFormatted: new Date().toLocaleString("vi-VN")
        })
        setPsychAssessmentSaved(true)
        setTimeout(() => setPsychAssessmentSaved(false), 3500)
        if (onSuccess) onSuccess()
      } else {
        alert("Lỗi khi lưu đánh giá tâm lý: " + (data.error || "Không xác định"))
      }
    } catch (e: any) {
      alert("Lỗi khi lưu đánh giá tâm lý: " + e.message)
    } finally {
      setSavingPsychAssessment(false)
    }
  }

  // Mở Báo cáo nhận diện A4
  const handleViewReport = () => {
    if (onOpenReport) {
      const effectiveTeacherName = verifierName || interviewerName || ""
      const itemsArray = questions.map((q: any) => {
        const ans = answers[q.id] || {}
        const comment = (ans.teacherComment || ans.notes || "").trim()
        const sNotes = (ans.studentNotes || "").trim()
        return {
          questionId: q.id,
          code: q.code,
          questionText: q.questionText || q.name,
          category: q.category,
          categoryLabel: q.categoryLabel,
          focus: q.focus,
          rating: ans.rating || "NORMAL",
          studentNotes: sNotes,
          teacherComment: comment,
          notes: comment,
          evidenceSource: ans.evidenceSource || "STUDENT_SHARED",
          suggestedQuestions: q.suggestedQuestions || []
        }
      })

      const parentItemsArray = parentGroupsList.map((p: any) => {
        const pAns = parentAnswers[p.id] || {}
        return {
          groupId: p.id,
          groupCode: p.code,
          category: p.category,
          categoryLabel: p.categoryLabel,
          title: p.title,
          focus: p.focus,
          answer: pAns.answer || "",
          teacherNote: pAns.teacherNote || ""
        }
      })

      const richInterviewPayload = {
        version: ORIENTATION_CRITERIA_VERSION,
        gradeGroup: gradeGroupKey,
        formGrade: student?.grade,
        interviewDate,
        interviewerName: effectiveTeacherName,
        items: itemsArray,
        criteriaResults: itemsArray,
        parentItems: parentItemsArray,
        summary9Items: summary9,
        proposedPlacementRecommendation: summary9.initialRecommendations || proposedClassPlacement,
        verification: {
          status: verificationStatus,
          verifiedBy: effectiveTeacherName,
          verifiedAt: verifiedAt || (verificationStatus !== "PENDING" ? new Date().toISOString() : null),
          notes: verificationNotes,
          supportReferralConfirmed
        }
      }

      const orientationDataPreview = {
        studentId: student.id,
        interviewDate,
        interviewerName: effectiveTeacherName,
        studentStrengths: summary9.strongPoints,
        studentNeedsSupport: summary9.difficultiesNeeds,
        interviewerGeneralRemark: summary9.initialRecommendations,
        parentRepresentativeName,
        parentPhone,
        parentExpectations: summary9.parentExpectations,
        proposedEduSystem,
        proposedClassPlacement,
        admissionConsultantNote: buildGdcsConsultantPayload(),
        interviewData: JSON.stringify(richInterviewPayload),
        psychologyReferralStatus,
        psychologyReferralReason,
        psychologyTeacherName: selectedPsychTeacherName,
        psychologyData,
        mathScore: mathScore || findSubjectScore(["toan", "math"]),
        literatureScore: literatureScore || findSubjectScore(["ngu van", "tieng viet", "van", "literature"]),
        writtenEnglishScore: writtenEnglishScore || findSubjectScore(["tieng anh", "ngoai ngu", "english"]),
        oralEnglishScore
      }

      const enrichedStudentForReport = {
        ...(studentDetail || student),
        mathScore: mathScore || studentDetail?.mathScore || findSubjectScore(["toan", "math"]),
        literatureScore: literatureScore || studentDetail?.literatureScore || findSubjectScore(["ngu van", "tieng viet", "van", "literature"]),
        writtenEnglishScore: writtenEnglishScore || studentDetail?.writtenEnglishScore || findSubjectScore(["tieng anh", "ngoai ngu", "english"]),
        oralEnglishScore: oralEnglishScore || studentDetail?.oralEnglishScore,
        scores:
          subjectEvaluations.length > 0
            ? subjectEvaluations
                .filter(ev => ev.scoreVals?.some((v: any) => String(v || "").trim() !== "") || ev.commentVals?.some((c: any) => String(c || "").trim() !== ""))
                .map(ev => ({
                  subjectId: ev.subjectId,
                  subject: { id: ev.subjectId, name: ev.subjectName, code: ev.subjectCode },
                  scores: JSON.stringify(ev.scoreVals || []),
                  comments: JSON.stringify(ev.commentVals || [])
                }))
            : studentDetail?.scores || student?.scores
      }

      onOpenReport(enrichedStudentForReport, orientationDataPreview)
    }
  }

  if (!isOpen) return null

  const isCuidLike = (val?: string | null) =>
    Boolean(val && /^(cm|cl)[a-z0-9]{15,}$/i.test(String(val).trim()))

  const resolveCampusDisplay = () => {
    const cCode = studentDetail?.batch?.campus?.campusCode
    const cName = studentDetail?.batch?.campus?.campusName
    if (cCode && !isCuidLike(cCode)) return cCode
    if (cName && !isCuidLike(cName)) return cName
    const adm = studentDetail?.admissionCampus
    if (adm && !isCuidLike(adm)) return adm
    const reg = studentDetail?.registeredCampus
    if (reg && !isCuidLike(reg)) return reg
    const bName = String(studentDetail?.batch?.name || "")
    const m = bName.match(/\b(CS\d+)\b/i)
    if (m) return m[1].toUpperCase()
    return "Sky-Line"
  }

  let parsedKqHocTap: any = null
  const rawKq = studentDetail?.kqHocTap
  if (typeof rawKq === "string" && rawKq.trim().startsWith("{")) {
    try {
      parsedKqHocTap = JSON.parse(rawKq)
    } catch (e) {}
  } else if (rawKq && typeof rawKq === "object") {
    parsedKqHocTap = rawKq
  }

  // Chỉ trích xuất điểm từ Kết quả học bạ (kqHocTap), tuyệt đối KHÔNG lấy từ điểm khảo sát đầu vào
  const matchTranscriptSubject = (rawName: string, keywords: string[]) => {
    const norm = String(rawName || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
    if (!norm) return false
    return keywords.some(kw => {
      if (kw === "van") {
        return /(^|\s|\/|-)van($|\s|\/|-)/.test(norm) && !norm.includes("van dap")
      }
      return norm.includes(kw)
    })
  }

  const findSubjectScore = (keywords: string[]) => {
    // 1. Check parsed kqHocTap.scores object (Học bạ)
    if (parsedKqHocTap?.scores && typeof parsedKqHocTap.scores === "object") {
      for (const [k, v] of Object.entries(parsedKqHocTap.scores)) {
        if (matchTranscriptSubject(k, keywords) && v !== null && v !== undefined && String(v).trim() !== "") {
          return String(v).trim()
        }
      }
    }
    // 2. Check parsed kqHocTap.moet?.subjects / bilingual?.moetSubjects / foreign?.subjects / homeschool?.subjects (Học bạ)
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
          if (matchTranscriptSubject(sName, keywords) && sub?.score !== null && sub?.score !== undefined && String(sub.score).trim() !== "") {
            return String(sub.score).trim()
          }
        }
      }
    }
    return ""
  }

  const cleanTranscriptRating = (val?: string | null) => {
    if (!val || typeof val !== "string") return ""
    let text = val.trim()
    if (!text || text.startsWith("{")) return ""
    if (text.includes("Trường cũ") || text.includes("Đối tượng:")) {
      const cleanLines = text
        .split(/[\r\n]+/)
        .map(l => l.trim())
        .filter(l => l && !l.includes("Trường cũ") && !l.includes("Đối tượng:"))
      text = cleanLines[0] || ""
    }
    return text.trim()
  }

  const campusName = resolveCampusDisplay()
  const oldSchool = studentDetail?.oldSchoolName || student?.oldSchoolName || "—"
  const gender = studentDetail?.gender || student?.gender || "Nam"
  const dobDisplay = (studentDetail?.dateOfBirth || student?.dateOfBirth)
    ? new Date(studentDetail?.dateOfBirth || student?.dateOfBirth).toLocaleDateString("vi-VN")
    : "—"

  const displayHocTap =
    cleanTranscriptRating(parsedKqHocTap?.overallRating) ||
    cleanTranscriptRating(parsedKqHocTap?.moet?.overallRating) ||
    cleanTranscriptRating(parsedKqHocTap?.bilingual?.moetRating) ||
    cleanTranscriptRating(parsedKqHocTap?.bilingual?.internationalRating) ||
    cleanTranscriptRating(parsedKqHocTap?.foreign?.gpaOrHonors) ||
    cleanTranscriptRating(parsedKqHocTap?.homeschool?.overallEvaluation) ||
    cleanTranscriptRating(parsedKqHocTap?.hocTap) ||
    cleanTranscriptRating(parsedKqHocTap?.academicRating) ||
    cleanTranscriptRating(parsedKqHocTap?.nangLuc) ||
    cleanTranscriptRating(typeof rawKq === "string" ? rawKq : "") ||
    cleanTranscriptRating(studentDetail?.academicRating) ||
    cleanTranscriptRating(studentDetail?.kqgdTieuHoc) ||
    "—"

  const displayRenLuyen =
    cleanTranscriptRating(parsedKqHocTap?.moet?.conductRating) ||
    cleanTranscriptRating(parsedKqHocTap?.renLuyen) ||
    cleanTranscriptRating(parsedKqHocTap?.phamChat) ||
    cleanTranscriptRating(typeof studentDetail?.kqRenLuyen === "string" ? studentDetail.kqRenLuyen : "") ||
    cleanTranscriptRating(studentDetail?.conductRating) ||
    "—"

  const displayMath =
    findSubjectScore(["toan", "math"]) ||
    "—"

  const displayLiterature =
    findSubjectScore(["ngu van", "tieng viet", "van", "vietnamese", "literature"]) ||
    "—"

  const displayEnglish =
    findSubjectScore(["tieng anh", "ngoai ngu", "english", "esl"]) ||
    "—"

  const gradeNumForModalHeader = parseInt(String(studentDetail?.grade || student?.grade || "1").replace(/\D/g, ""), 10) || 1
  const vnSubjectModalHeaderLabel = gradeNumForModalHeader <= 5 ? "11. Tiếng Việt (HB)" : "11. Ngữ văn (HB)"

  const allExpandedA = questions.length > 0 && questions.every((q: any) => openAccordionA[q.id])
  const toggleAllAccordionA = () => {
    const nextState: Record<string, boolean> = {}
    questions.forEach((q: any) => {
      nextState[q.id] = !allExpandedA
    })
    setOpenAccordionA(nextState)
  }

  return (
    <div id="student-orientation-modal-root" className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-white w-full max-w-[1320px] rounded-2xl shadow-2xl border border-teal-200 flex flex-col max-h-[96vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER GỌN CHUẨN THEO NHẬN DIỆN MÀU XANH SKY-LINE */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-[#083d39] via-[#0b524d] to-[#0f6b64] text-white flex flex-wrap items-center justify-between gap-3 border-b border-teal-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm border border-teal-300/40 flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  PHIẾU ĐỊNH HƯỚNG HỌC SINH &amp; TRAO ĐỔI PHHS
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-400/25 text-teal-50 border border-teal-300/40 text-[10px] font-bold">
                  {groupConfig.label}
                </span>
                <span className="hidden sm:inline text-[10px] text-teal-200 font-mono">v{formVersion}</span>
              </div>
              <p className="text-[11px] text-teal-100/90 leading-tight">
                Trọng tâm: {groupConfig.focus}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ngày phỏng vấn trên thanh Header (đã bỏ trường GV theo yêu cầu) */}
            <div className="hidden lg:flex items-center gap-2 bg-[#073330]/80 border border-teal-700/70 rounded-xl px-2.5 py-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-teal-300" />
              <span className="text-teal-100">Ngày PV:</span>
              <input
                type="date"
                value={interviewDate}
                onChange={e => { setInterviewDate(e.target.value); markDirty(); }}
                className="bg-transparent text-white font-bold text-[11px] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Trạng thái Auto-save */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#073330]/70 border border-teal-700/60 text-[11px] text-teal-100">
              {saving ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-teal-300" />
                  <span>Đang lưu...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <AlertCircle className="w-3 h-3 text-amber-300" />
                  <span className="text-amber-200">Chưa lưu</span>
                </>
              ) : lastSavedTime ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-200">Đã lưu {lastSavedTime}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3 text-teal-300" />
                  <span>Tự động lưu nháp</span>
                </>
              )}
            </div>

            {/* Nút Khảo sát tâm lý */}
            <button
              type="button"
              onClick={() => setIsPsychModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                psychologyReferralStatus === "COMPLETED" || psychologyData
                  ? "bg-emerald-700/90 hover:bg-emerald-600 text-white border-emerald-300/60 shadow-2xs"
                  : psychologyReferralStatus === "REQUESTED"
                  ? "bg-amber-600/90 hover:bg-amber-600 text-white border-amber-300/60 shadow-2xs"
                  : "bg-teal-800/90 hover:bg-teal-700 text-teal-50 border-teal-500/60"
              }`}
              title="Trường hợp học sinh có vấn đề tâm lý: Chọn GV Tâm lý được phân công & thực hiện khảo sát theo Form Tâm lý"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>
                {psychologyReferralStatus === "COMPLETED" || psychologyData
                  ? `Tâm lý: ${psychologyData?.totalScore ?? psychTotalScore}/80đ`
                  : psychologyReferralStatus === "REQUESTED"
                  ? "Đã Đề Xuất Tâm Lý"
                  : "Khảo sát Tâm lý"}
              </span>
            </button>

            {/* Nút Trợ lý AI */}
            <button
              type="button"
              onClick={() => setIsAdvisoryModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border border-amber-300/60 rounded-xl text-[11px] font-black shadow-sm cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-100 fill-yellow-100" />
              <span>Trợ lý AI</span>
            </button>

            {/* Nút In / Xem trước A4 */}
            <button
              type="button"
              onClick={handleViewReport}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-teal-50 hover:text-white border border-teal-400/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xem &amp; In A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PHẦN ĐẦU: THÔNG TIN HỌC SINH (BẢNG 12 CỘT CHUẨN, GỌN, LUÔN HIỂN THỊ) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#0b524d] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                Thông tin Học sinh &amp; Học bạ
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Hồ sơ đăng ký dự tuyển &amp; Kết quả học bạ (Trường cũ)
              </span>
            </div>

            {/* Hiển thị Ngày PV trên màn hình nhỏ */}
            <div className="flex lg:hidden items-center gap-2 text-[11px]">
              <span className="text-slate-500 font-semibold">Ngày PV:</span>
              <input
                type="date"
                value={interviewDate}
                onChange={e => { setInterviewDate(e.target.value); markDirty(); }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-teal-200/80 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-teal-50/80 text-[10px] font-black uppercase text-[#083d39] border-b border-teal-100 whitespace-nowrap">
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">1. Mã HS</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">2. Họ và tên</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">3. Ngày sinh / Giới tính</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">4. Khối đăng ký</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">5. Hệ đào tạo</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">6. Cơ sở</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">7. Trường cũ</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">8. Học tập (HB)</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">9. Rèn luyện (HB)</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">10. Toán (HB)</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">{vnSubjectModalHeaderLabel}</th>
                  <th className="py-1.5 px-2.5 text-center">12. Tiếng Anh (HB)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-800 whitespace-nowrap">
                  <td className="py-1.5 px-2.5 border-r border-slate-100 font-mono font-bold text-slate-900">
                    {studentDetail?.studentCode || student?.studentCode || "—"}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 font-black text-[#083d39]">
                    {studentDetail?.fullName || student?.fullName || "—"}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-slate-700">
                    {dobDisplay} <span className="text-slate-400">&bull;</span> <span className="font-semibold">{gender}</span>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100">
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 font-bold text-[11px]">
                      {groupConfig.label}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 font-bold text-teal-800">
                    {proposedEduSystem || studentDetail?.surveyFormType || studentDetail?.surveySystem || "HNS"}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 font-bold text-slate-900">
                    {campusName}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-slate-700 max-w-[160px] truncate" title={oldSchool}>
                    {oldSchool}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                      {displayHocTap}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[11px]">
                      {displayRenLuyen}
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-center font-bold text-slate-900 tabular-nums">
                    {displayMath}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-center font-bold text-slate-900 tabular-nums">
                    {displayLiterature}
                  </td>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-900 tabular-nums">
                    {displayEnglish}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SỔ CÁI NHẬP KẾT QUẢ MÔN KHẢO SÁT ĐẦU VÀO THEO PHÂN CÔNG (TÍCH HỢP TRỰC TIẾP TRONG PHIẾU ĐỊNH HƯỚNG) */}
          {subjectEvaluations.length > 0 && (
            <div className="mt-2 border border-[#003B3A]/20 rounded-xl bg-white shadow-2xs overflow-hidden">
              <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 border-l-4 border-l-[#003B3A]">
                <div className="flex flex-wrap items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#003B3A]" />
                  <span className="text-xs font-bold text-[#003B3A]">
                    Kết quả môn khảo sát đầu vào theo phân công
                  </span>
                  <span className="px-2 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200 text-[11px] font-semibold tabular-nums">
                    {subjectEvaluations.filter(e => e.isAssignedToMe).length > 0
                      ? `${subjectEvaluations.filter(e => e.isAssignedToMe).length} môn được phân công`
                      : `${subjectEvaluations.length} môn khảo sát`}
                  </span>
                  <span className="text-[11px] text-slate-500 hidden md:inline">
                    Nhập điểm &amp; nhận xét môn tại đây sẽ đồng bộ 2 chiều với bảng Nhập điểm khảo sát và Báo cáo A4
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {subjectEvaluations.some(e => !e.isAssignedToMe) && subjectEvaluations.some(e => e.isAssignedToMe) && (
                    <button
                      type="button"
                      onClick={() => setShowAllSubjectsInModal(prev => !prev)}
                      className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors"
                    >
                      {showAllSubjectsInModal
                        ? "Chỉ hiện môn tôi phụ trách"
                        : `Xem tất cả môn (${subjectEvaluations.length})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSubjectSectionExpanded(prev => !prev)}
                    className="px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#003B3A] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>{isSubjectSectionExpanded ? "Thu gọn" : "Mở rộng nhập điểm"}</span>
                    {isSubjectSectionExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {isSubjectSectionExpanded && (
                <div className="divide-y divide-slate-100">
                  {subjectEvaluations
                    .filter(ev => {
                      if (showAllSubjectsInModal) return true
                      const hasMine = subjectEvaluations.some(x => x.isAssignedToMe)
                      return hasMine ? ev.isAssignedToMe : true
                    })
                    .map((ev: any) => {
                      const cfg = ev.gradeConfig || {
                        scoreColumns: 1,
                        commentColumns: 1,
                        scoreLabels: ["Điểm khảo sát"],
                        scoreColumnTypes: ["SCORE_10"],
                        scoreMaxScores: [10],
                        commentLabels: ["Nhận xét chuyên môn"]
                      }
                      const numScoreCols = Math.max(1, Number(cfg.scoreColumns || 1))
                      const numCommentCols = Math.max(1, Number(cfg.commentColumns || 1))
                      const isNumericType = !cfg.scoreColumnTypes?.some((t: string) => t && t !== "SCORE_10")
                      const saveState = savingSubjectMap[ev.subjectId] || "idle"
                      const isSubDirty = dirtySubjectIds.has(ev.subjectId)

                      return (
                        <div
                          key={ev.subjectId}
                          className={`px-3 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 transition-colors ${
                            ev.isAssignedToMe ? "bg-white" : "bg-slate-50/70"
                          }`}
                        >
                          {/* Cột trái: Tên môn & Trạng thái phân công */}
                          <div className="flex items-center gap-2 min-w-[210px] max-w-[260px]">
                            <div className={`w-2 h-7 rounded-full shrink-0 ${ev.isAssignedToMe ? "bg-[#00A19A]" : "bg-slate-300"}`} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-[#003B3A] truncate">
                                  {ev.subjectName}
                                </span>
                                {ev.isAssignedToMe ? (
                                  <span className="px-1.5 py-0.5 rounded bg-teal-50 text-[#00736E] border border-teal-200 text-[10px] font-semibold">
                                    Phân công của bạn
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium">
                                    GV: {ev.scoredByTeacherName || "Khác"}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                {ev.isSaved ? (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Đã có điểm
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium">Chưa chấm điểm</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Cột giữa: Các ô nhập điểm & nhận xét */}
                          <div className="flex-1 flex flex-wrap items-start gap-2.5">
                            {Array.from({ length: numScoreCols }).map((_, cIdx) => {
                              const label = cfg.scoreLabels?.[cIdx] || `Điểm ${cIdx + 1}`
                              const colType = cfg.scoreColumnTypes?.[cIdx] || "SCORE_10"
                              const maxScore = Number(cfg.scoreMaxScores?.[cIdx] || 10)
                              const curVal = ev.scoreVals?.[cIdx] ?? ""

                              return (
                                <div key={`sc-${cIdx}`} className="w-28 sm:w-32 shrink-0">
                                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5 truncate" title={label}>
                                    {label} {colType === "SCORE_10" ? `(Thang ${maxScore})` : ""}
                                  </label>
                                  {colType === "GRADE_SKL" ? (
                                    <select
                                      disabled={!ev.canEdit || ev.isLocked}
                                      value={curVal}
                                      onChange={e => handleSubjectScoreChange(ev.subjectId, cIdx, e.target.value)}
                                      className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:border-[#00A19A] focus:outline-none disabled:bg-slate-100 tabular-nums"
                                    >
                                      <option value="">-- Chọn mức --</option>
                                      <option value="Hoàn thành tốt">Hoàn thành tốt</option>
                                      <option value="Hoàn thành">Hoàn thành</option>
                                      <option value="Đạt">Đạt</option>
                                      <option value="Cần cố gắng">Cần cố gắng</option>
                                    </select>
                                  ) : colType === "GRADE_CEFR" ? (
                                    <select
                                      disabled={!ev.canEdit || ev.isLocked}
                                      value={curVal}
                                      onChange={e => handleSubjectScoreChange(ev.subjectId, cIdx, e.target.value)}
                                      className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:border-[#00A19A] focus:outline-none disabled:bg-slate-100 tabular-nums"
                                    >
                                      <option value="">-- CEFR --</option>
                                      {["Pre-A1", "A1", "A2", "B1", "B2", "C1"].map(lv => (
                                        <option key={lv} value={lv}>{lv}</option>
                                      ))}
                                    </select>
                                  ) : colType === "GRADE_INTL" ? (
                                    <select
                                      disabled={!ev.canEdit || ev.isLocked}
                                      value={curVal}
                                      onChange={e => handleSubjectScoreChange(ev.subjectId, cIdx, e.target.value)}
                                      className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:border-[#00A19A] focus:outline-none disabled:bg-slate-100 tabular-nums"
                                    >
                                      <option value="">-- Grade --</option>
                                      {["A*", "A", "B", "C", "D", "E", "U"].map(lv => (
                                        <option key={lv} value={lv}>{lv}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="number"
                                      step="0.25"
                                      min={0}
                                      max={maxScore}
                                      disabled={!ev.canEdit || ev.isLocked}
                                      value={curVal}
                                      onChange={e => handleSubjectScoreChange(ev.subjectId, cIdx, e.target.value)}
                                      placeholder={`0 - ${maxScore}`}
                                      className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-center text-[#003B3A] focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 focus:outline-none disabled:bg-slate-100 tabular-nums"
                                    />
                                  )}
                                </div>
                              )
                            })}

                            {/* Cột điểm tổng hợp nếu môn có >= 2 cột điểm số */}
                            {isNumericType && numScoreCols > 1 && (
                              <div className="w-24 shrink-0">
                                <label className="block text-[10.5px] font-semibold text-[#00736E] mb-0.5">
                                  Tổng điểm
                                </label>
                                <div className="h-8 px-2.5 rounded-lg bg-teal-50/80 border border-teal-200 flex items-center justify-center text-xs font-black text-[#003B3A] tabular-nums">
                                  {ev.scoreVals?.[numScoreCols] ?? "—"}
                                </div>
                              </div>
                            )}

                            {/* Cột nhận xét chuyên môn */}
                            {Array.from({ length: numCommentCols }).map((_, cmIdx) => {
                              const cmLabel = cfg.commentLabels?.[cmIdx] || (numCommentCols > 1 ? `Nhận xét ${cmIdx + 1}` : "Nhận xét môn khảo sát")
                              const curCm = ev.commentVals?.[cmIdx] ?? ""
                              const quickKey = `${ev.subjectId}_${cmIdx}`
                              const isQuickOpen = openQuickRemarksForSubject === quickKey

                              return (
                                <div key={`cm-${cmIdx}`} className="flex-1 min-w-[220px]">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <label className="text-[10.5px] font-semibold text-slate-600 truncate">
                                      {cmLabel}
                                    </label>
                                    {ev.canEdit && !ev.isLocked && (
                                      <button
                                        type="button"
                                        onClick={() => setOpenQuickRemarksForSubject(isQuickOpen ? null : quickKey)}
                                        className="text-[10px] font-semibold text-[#00736E] hover:underline cursor-pointer"
                                      >
                                        {isQuickOpen ? "Ẩn mẫu câu" : "+ Mẫu nhận xét nhanh"}
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    disabled={!ev.canEdit || ev.isLocked}
                                    value={curCm}
                                    onChange={e => handleSubjectCommentChange(ev.subjectId, cmIdx, e.target.value)}
                                    placeholder={ev.canEdit ? "Nhập nhận xét năng lực môn khảo sát..." : "Chưa có nhận xét"}
                                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 focus:outline-none disabled:bg-slate-100"
                                  />
                                  {isQuickOpen && ev.canEdit && !ev.isLocked && (
                                    <div className="mt-1.5 flex flex-wrap gap-1 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                                      {QUICK_SUBJECT_REMARKS.map((rmk, rIdx) => (
                                        <button
                                          key={rIdx}
                                          type="button"
                                          onClick={() => {
                                            const nextText = curCm ? `${curCm.trim()}; ${rmk}` : rmk
                                            handleSubjectCommentChange(ev.subjectId, cmIdx, nextText)
                                            setOpenQuickRemarksForSubject(null)
                                          }}
                                          className="text-[10.5px] px-2 py-0.5 rounded bg-white hover:bg-teal-50 text-slate-700 hover:text-[#003B3A] border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer text-left"
                                        >
                                          + {rmk}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Cột phải: Nút Lưu điểm môn tức thời */}
                          <div className="flex items-center justify-end shrink-0">
                            {ev.canEdit && !ev.isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleSaveSingleSubject(ev)}
                                disabled={saveState === "saving"}
                                className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  saveState === "saved"
                                    ? "bg-emerald-600 text-white"
                                    : isSubDirty
                                    ? "bg-[#003B3A] hover:bg-[#005250] text-white shadow-2xs"
                                    : "bg-slate-100 hover:bg-teal-50 text-[#003B3A] border border-slate-200"
                                }`}
                              >
                                {saveState === "saving" ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Đang lưu...</span>
                                  </>
                                ) : saveState === "saved" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Đã lưu điểm</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{isSubDirty ? "Lưu điểm môn" : "Cập nhật điểm"}</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic px-2">
                                {ev.isLocked ? "Đã khóa kỳ" : "Chỉ xem"}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CẢNH BÁO ĐIỀU CHỈNH KHỐI LỚP (BẢO VỆ DỮ LIỆU) */}
        {showGradeChangeWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-between text-xs text-amber-900 flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Lưu ý điều chỉnh khối:</strong> Khối đăng ký hiện tại là <strong>{groupConfig.label}</strong> (Khác với phiên bản đã lưu: <strong>{savedGradeGroup}</strong>). Dữ liệu cũ được bảo toàn.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowGradeChangeWarning(false)}
              className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold rounded text-[11px] cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        )}

        {/* THANH ĐIỀU HƯỚNG THẺ TAG MÀU XANH SKY-LINE CHUẨN GỌN */}
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* TAG A: PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH */}
            <button
              type="button"
              onClick={() => setActiveTab("tab1")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap border ${
                activeTab === "tab1"
                  ? "bg-gradient-to-r from-[#0b524d] to-[#0f6b64] text-white border-[#083d39] shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50/70 hover:text-[#083d39] hover:border-teal-300"
              }`}
            >
              <UserCheck className={`w-3.5 h-3.5 ${activeTab === "tab1" ? "text-teal-200" : "text-teal-700"}`} />
              <span>A. Phỏng Vấn Định Hướng Học Sinh</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "tab1" ? "bg-white/20 text-white border border-white/25" : "bg-teal-100/80 text-teal-900"
              }`}>
                10 nhóm chuẩn hóa
              </span>
            </button>

            {/* TAG B: TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH */}
            <button
              type="button"
              onClick={() => setActiveTab("tab2")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap border ${
                activeTab === "tab2"
                  ? "bg-gradient-to-r from-[#0b524d] to-[#0f6b64] text-white border-[#083d39] shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50/70 hover:text-[#083d39] hover:border-teal-300"
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${activeTab === "tab2" ? "text-teal-200" : "text-teal-700"}`} />
              <span>B. Trao Đổi Định Hướng Với Phụ Huynh</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "tab2" ? "bg-white/20 text-white border border-white/25" : "bg-teal-100/80 text-teal-900"
              }`}>
                5 nhóm nội dung
              </span>
            </button>

            {/* TAG C: TỔNG HỢP NHẬN DIỆN & THẨM ĐỊNH */}
            <button
              type="button"
              onClick={() => setActiveTab("tab3")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer whitespace-nowrap border ${
                activeTab === "tab3"
                  ? "bg-gradient-to-r from-[#0b524d] to-[#0f6b64] text-white border-[#083d39] shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50/70 hover:text-[#083d39] hover:border-teal-300"
              }`}
            >
              <FileCheck className={`w-3.5 h-3.5 ${activeTab === "tab3" ? "text-teal-200" : "text-teal-700"}`} />
              <span>C. Tổng Hợp Nhận Diện &amp; Thẩm Định</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "tab3" ? "bg-white/20 text-white border border-white/25" : "bg-teal-100/80 text-teal-900"
              }`}>
                9 mục &bull; QLCM &bull; GĐCS
              </span>
            </button>
          </div>

          {activeTab === "tab1" && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Bắt buộc nhận xét khi chọn &quot;Cần tìm hiểu thêm&quot; / &quot;Chưa đủ thông tin&quot;</span>
              </span>
              <button
                type="button"
                onClick={toggleAllAccordionA}
                className="text-[11px] font-bold text-[#0b524d] hover:text-[#083d39] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
              >
                {allExpandedA ? "Thu gọn tất cả" : "Mở tất cả 10 mục"}
              </button>
            </div>
          )}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 custom-scrollbar">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-teal-700" />
              <p className="text-xs font-bold text-slate-500">Đang chuẩn bị bộ câu hỏi phân hóa cho {groupConfig.label}...</p>
            </div>
          ) : activeTab === "tab1" ? (
            /* TAB A: PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH (10 NHÓM NỘI DUNG GỌN CHUẨN) */
            <div className="space-y-2.5">
              {(questions || []).map((q: any, idx: number) => {
                const ans = answers[q.id] || { rating: "NORMAL", notes: "", studentNotes: "", teacherComment: "", evidenceSource: "STUDENT_SHARED" }
                const isMandatory = isCommentMandatory(ans.rating)
                const hasError = validationErrors[q.id]
                const qHints: string[] = q.suggestedQuestions || []
                const isOpenAcc = openAccordionA[q.id] ?? (idx < 3)
                const isHintOpen = openHints[q.id] ?? false

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-xl border transition-all duration-150 shadow-2xs ${
                      hasError
                        ? "border-rose-400 ring-2 ring-rose-200 bg-rose-50/20"
                        : isOpenAcc
                        ? "border-teal-300"
                        : "border-slate-200 hover:border-teal-200"
                    }`}
                  >
                    {/* Tiêu đề Accordion Header Gọn */}
                    <div
                      onClick={() => toggleAccordionA(q.id)}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/60 rounded-t-xl hover:bg-teal-50/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-[#0b524d] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                          <span className="text-xs font-black text-slate-900">
                            {q.questionText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {Boolean(ans.studentNotes?.trim() || ans.teacherComment?.trim()) && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Đã ghi nhận
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-lg text-[10.5px] border font-bold ${ORIENTATION_RATING_OPTIONS[ans.rating]?.badgeClass || "bg-slate-100 text-slate-700"}`}>
                          {ORIENTATION_RATING_OPTIONS[ans.rating]?.label || "Đang hình thành"}
                        </span>
                        <div className="w-5 h-5 rounded text-slate-400 hover:text-teal-700 flex items-center justify-center">
                          {isOpenAcc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Nội dung chi tiết câu hỏi (Thiết kế 2 cột Gọn & Nhanh) */}
                    {isOpenAcc && (
                      <div className="p-3.5 pt-2.5 border-t border-slate-100 space-y-2.5">
                        {/* Thanh hướng dẫn + Nút xem câu hỏi gợi mở */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-teal-50/40 px-3 py-1.5 rounded-lg border border-teal-100 text-[11px]">
                          <div className="text-slate-700">
                            <strong className="text-[#083d39]">Trọng tâm cần tìm hiểu: </strong>
                            <span>{q.focus || q.suggestedGuideline}</span>
                          </div>
                          {qHints.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleHint(q.id)}
                              className="flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>{isHintOpen ? "Ẩn câu hỏi gợi mở" : `Câu hỏi gợi mở (${qHints.length})`}</span>
                            </button>
                          )}
                        </div>

                        {isHintOpen && qHints.length > 0 && (
                          <div className="px-3 py-2 bg-teal-50/60 rounded-lg border border-teal-200 text-xs text-teal-950">
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-800 text-[11px]">
                              {qHints.map((hint, hIdx) => (
                                <li key={hIdx}>{hint}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Hàng chọn Mức độ quan sát định tính (4 mức) & Nguồn minh chứng (3 nguồn) trên cùng 1 dòng */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
                          <div className="lg:col-span-7 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-700 mr-1">Mức độ quan sát:</span>
                            {(Object.keys(ORIENTATION_RATING_OPTIONS) as RatingCode[]).map(rCode => {
                              const opt = ORIENTATION_RATING_OPTIONS[rCode]
                              const isSelected = ans.rating === rCode
                              return (
                                <button
                                  key={rCode}
                                  type="button"
                                  onClick={() => handleRatingChange(q.id, rCode)}
                                  title={opt.subText}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                    isSelected
                                      ? `${opt.borderClass} ${opt.bgClass} ${opt.textClass} ring-1 ring-teal-400 shadow-2xs`
                                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </button>
                              )
                            })}
                          </div>

                          <div className="lg:col-span-5 flex flex-wrap items-center lg:justify-end gap-1.5">
                            <span className="text-[11px] font-bold text-slate-700 mr-1">Minh chứng:</span>
                            {(["STUDENT_SHARED", "TEACHER_OBSERVED", "TEACHER_ASSESSED"] as EvidenceSource[]).map(sCode => {
                              const sOpt = ORIENTATION_EVIDENCE_SOURCES[sCode]
                              const isSelected = (ans.evidenceSource || "STUDENT_SHARED") === sCode
                              return (
                                <button
                                  key={sCode}
                                  type="button"
                                  onClick={() => handleEvidenceSourceChange(q.id, sCode)}
                                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-teal-600 bg-teal-50 text-[#083d39] ring-1 ring-teal-200"
                                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                                  }`}
                                >
                                  {sOpt.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Hàng 2 cột: Bên trái Câu trả lời của HS | Bên phải Nhận xét của GV */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Cột trái: Ghi nhận chia sẻ của học sinh */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <label className="font-bold text-slate-800 flex items-center gap-1">
                                <Smile className="w-3.5 h-3.5 text-teal-600" />
                                <span>Câu trả lời / Chia sẻ thực tế của học sinh:</span>
                              </label>
                            </div>
                            <textarea
                              rows={2}
                              value={ans.studentNotes || ""}
                              onChange={e => handleStudentNotesChange(q.id, e.target.value)}
                              placeholder="Ghi nhận chia sẻ tự nhiên của học sinh..."
                              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-slate-900 bg-white"
                            />
                          </div>

                          {/* Cột phải: Nhận xét / Quan sát của giáo viên */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <label className="font-bold text-slate-800 flex items-center gap-1">
                                <span>Nhận xét / Quan sát của giáo viên:</span>
                                {isMandatory && (
                                  <span className="text-rose-600 font-black">* (Bắt buộc)</span>
                                )}
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAiDraftComment(q)}
                                disabled={aiCommentLoading[q.id]}
                                className="flex items-center gap-1 text-[10.5px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                              >
                                {aiCommentLoading[q.id] ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Đang gợi ý...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 text-teal-600" />
                                    <span>AI Gợi ý nhận xét</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={ans.teacherComment || ""}
                              onChange={e => handleTeacherCommentChange(q.id, e.target.value)}
                              placeholder={isMandatory ? "Bắt buộc nhập biểu hiện cụ thể hoặc lý do cần tìm hiểu thêm..." : "Nhận xét, đánh giá sư phạm của giáo viên..."}
                              className={`w-full text-xs p-2.5 rounded-xl border transition-all text-slate-900 bg-white ${
                                hasError
                                  ? "border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-200"
                                  : "border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Hộp gợi ý nhận xét từ AI */}
                        {showAiDraftBox[q.id] && aiDraftComments[q.id] && (
                          <div className="p-2.5 bg-teal-50/70 border border-teal-300 rounded-xl flex items-center justify-between gap-3 text-xs text-teal-950">
                            <p className="text-slate-800 italic flex-1">
                              <strong className="text-[#083d39] not-italic mr-1">Gợi ý AI:</strong>
                              &quot;{aiDraftComments[q.id]}&quot;
                            </p>
                            <button
                              type="button"
                              onClick={() => handleApplyAiComment(q.id)}
                              className="px-2.5 py-1 bg-[#0b524d] hover:bg-[#083d39] text-white rounded-lg font-bold text-[11px] cursor-pointer flex-shrink-0"
                            >
                              Áp dụng
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Chuyển sang Phần B */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("tab2")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0b524d] hover:bg-[#083d39] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
                >
                  <span>Tiếp tục: B. Trao Đổi Định Hướng Với Phụ Huynh</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : activeTab === "tab2" ? (
            /* TAB B: TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH (5 NHÓM NỘI DUNG GỌN CHUẨN) */
            <div className="space-y-3">
              {/* Thanh thông tin đại diện PHHS gọn trên 1 hàng */}
              <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <span className="font-bold text-slate-700 whitespace-nowrap">Người đại diện PHHS:</span>
                    <input
                      type="text"
                      value={parentRepresentativeName}
                      onChange={e => { setParentRepresentativeName(e.target.value); markDirty(); }}
                      placeholder="Ví dụ: Bố Nguyễn Văn A / Mẹ Lê Thị B"
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-teal-600 focus:outline-none text-slate-900 bg-white font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <span className="font-bold text-slate-700 whitespace-nowrap">SĐT liên hệ:</span>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={e => { setParentPhone(e.target.value); markDirty(); }}
                      placeholder="0905xxxxxx"
                      className="w-36 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-teal-600 focus:outline-none text-slate-900 bg-white font-mono font-semibold"
                    />
                  </div>
                </div>
                <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                  Thông tin gia đình cung cấp là nguồn tham khảo phối hợp giáo dục
                </span>
              </div>

              {/* DANH SÁCH 5 NHÓM TRAO ĐỔI VỚI PHHS */}
              <div className="space-y-2.5">
                {(parentGroupsList || []).map((pGroup: any, pIdx: number) => {
                  const pAns = parentAnswers[pGroup.id] || { answer: "", teacherNote: "" }
                  const hints: string[] = pGroup.suggestedQuestions || []

                  return (
                    <div key={pGroup.id} className="bg-white rounded-xl border border-teal-200/90 shadow-2xs p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#0b524d] text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                            {pIdx + 1}
                          </span>
                          <h4 className="text-xs font-black text-slate-900">
                            {pGroup.title}
                          </h4>
                        </div>
                        {hints.length > 0 && (
                          <span className="text-[11px] text-teal-800 font-medium">
                            Gợi mở: {hints.join(" • ")}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* Ô ghi nhận câu trả lời của Phụ huynh */}
                        <div className="md:col-span-7 space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Nội dung phụ huynh chia sẻ &amp; cung cấp:
                          </label>
                          <textarea
                            rows={2}
                            value={pAns.answer || ""}
                            onChange={e => handleParentAnswerChange(pGroup.id, "answer", e.target.value)}
                            placeholder={pGroup.placeholder || "Ghi nhận ý kiến chia sẻ của phụ huynh..."}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all text-slate-900 bg-white"
                          />
                        </div>

                        {/* Ô nhận xét / quan sát thêm của Giáo viên */}
                        <div className="md:col-span-5 space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">
                            Nhận xét / Đánh giá sư phạm của giáo viên:
                          </label>
                          <textarea
                            rows={2}
                            value={pAns.teacherNote || ""}
                            onChange={e => handleParentAnswerChange(pGroup.id, "teacherNote", e.target.value)}
                            placeholder="Nhận xét mức độ đồng thuận, lưu ý phối hợp..."
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 text-slate-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Điều hướng Phần A / Phần C */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("tab1")}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại Phần A</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tab3")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0b524d] hover:bg-[#083d39] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
                >
                  <span>Tiếp tục: C. Tổng Hợp Nhận Diện &amp; Thẩm Định</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* TAB C: TỔNG HỢP NHẬN DIỆN & THẨM ĐỊNH (9 MỤC NỘI DUNG + QLCM + GĐCS) */
            <div className="space-y-4">
              {/* Thanh tiêu đề Phần C & Nút AI Tổng hợp */}
              <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-[#083d39] tracking-wide flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-700" />
                    <span>C. Tổng Hợp Nhận Diện &amp; Định Hướng Ban Đầu (9 Mục Chuẩn Hóa)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tổng hợp từ kết quả Phỏng vấn học sinh (Phần A) và Trao đổi PHHS (Phần B) &bull; Giáo viên chỉnh sửa trực tiếp trước khi gửi thẩm định
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAiSynthesizeSummary}
                  disabled={aiSummaryLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition-all disabled:opacity-50"
                >
                  {aiSummaryLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-100" />
                      <span>AI Đang Tổng Hợp...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
                      <span>Sky-Line AI Tổng Hợp Nhanh (9 Mục)</span>
                    </>
                  )}
                </button>
              </div>

              {/* DRAWER DỰ THẢO TỔNG HỢP AI */}
              {showAiSummaryDrawer && aiSummaryData && (
                <div className="p-4 bg-gradient-to-r from-teal-50 via-emerald-50/60 to-white rounded-xl border-2 border-teal-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-700" />
                      <h4 className="text-xs font-black text-[#083d39] uppercase">
                        Dự Thảo Tổng Hợp Từ Sky-Line AI (9 Mục)
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyAiSummaryAll}
                        className="px-3 py-1 bg-[#0b524d] hover:bg-[#083d39] text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Áp dụng toàn bộ vào 9 mục
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAiSummaryDrawer(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-teal-200">
                      <span className="font-bold text-[#083d39] block">1. Điểm mạnh nổi bật:</span>
                      <p className="text-slate-700 text-[11px] italic">{aiSummaryData.strongPoints || aiSummaryData.diemManhNoiBat}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-teal-200">
                      <span className="font-bold text-[#083d39] block">2. Sở thích &amp; Động lực:</span>
                      <p className="text-slate-700 text-[11px] italic">{aiSummaryData.interestsMotivation || "Học sinh hào hứng tham gia hoạt động học tập."}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-teal-200">
                      <span className="font-bold text-[#083d39] block">3. Khả năng thích nghi:</span>
                      <p className="text-slate-700 text-[11px] italic">{aiSummaryData.adaptabilityAutonomy || aiSummaryData.khaNangThichNghi}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* LƯỚI 9 MỤC TỔNG HỢP NHẬN DIỆN GỌN CHUẨN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                  <label className="font-bold text-emerald-950 block text-xs">
                    1. Điểm mạnh nổi bật của học sinh:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.strongPoints}
                    onChange={e => handleSummary9Change("strongPoints", e.target.value)}
                    placeholder="Năng khiếu, phản xạ, thái độ tích cực nổi bật..."
                    className="w-full text-xs p-2 rounded-lg border border-emerald-200 focus:border-emerald-600 focus:outline-none text-slate-900 bg-emerald-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-1">
                  <label className="font-bold text-blue-950 block text-xs">
                    2. Sở thích &amp; Động lực học tập:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.interestsMotivation}
                    onChange={e => handleSummary9Change("interestsMotivation", e.target.value)}
                    placeholder="Môn học yêu thích, đam mê cá nhân, động lực nội tại..."
                    className="w-full text-xs p-2 rounded-lg border border-blue-200 focus:border-blue-600 focus:outline-none text-slate-900 bg-blue-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1">
                  <label className="font-bold text-teal-950 block text-xs">
                    3. Khả năng thích nghi &amp; Tự lập:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.adaptabilityAutonomy}
                    onChange={e => handleSummary9Change("adaptabilityAutonomy", e.target.value)}
                    placeholder="Tự phục vụ, hòa nhập lớp mới, quản lý thời gian..."
                    className="w-full text-xs p-2 rounded-lg border border-teal-200 focus:border-teal-600 focus:outline-none text-slate-900 bg-teal-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1">
                  <label className="font-bold text-amber-950 block text-xs">
                    4. Khó khăn, nhu cầu cần quan tâm:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.difficultiesNeeds}
                    onChange={e => handleSummary9Change("difficultiesNeeds", e.target.value)}
                    placeholder="Nội dung cần rèn luyện thêm, biểu hiện cần hỗ trợ..."
                    className="w-full text-xs p-2 rounded-lg border border-amber-200 focus:border-amber-600 focus:outline-none text-slate-900 bg-amber-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-1">
                  <label className="font-bold text-[#083d39] block text-xs">
                    5. Kỳ vọng của học sinh tại Sky-Line:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.studentExpectations}
                    onChange={e => handleSummary9Change("studentExpectations", e.target.value)}
                    placeholder="Mong muốn trải nghiệm, câu lạc bộ, bạn bè..."
                    className="w-full text-xs p-2 rounded-lg border border-teal-200 focus:border-teal-600 focus:outline-none text-slate-900 bg-teal-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-cyan-200 shadow-2xs space-y-1">
                  <label className="font-bold text-cyan-950 block text-xs">
                    6. Kỳ vọng của phụ huynh đối với học sinh:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.parentExpectations}
                    onChange={e => handleSummary9Change("parentExpectations", e.target.value)}
                    placeholder="Mục tiêu phát triển kỹ năng, học thuật và nhân cách..."
                    className="w-full text-xs p-2 rounded-lg border border-cyan-200 focus:border-cyan-600 focus:outline-none text-slate-900 bg-cyan-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-2xs space-y-1">
                  <label className="font-bold text-rose-950 block text-xs">
                    7. Tương đồng / Khác biệt giữa 2 nguồn:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.alignmentDifferences}
                    onChange={e => handleSummary9Change("alignmentDifferences", e.target.value)}
                    placeholder="So sánh góc nhìn học sinh chia sẻ & gia đình cung cấp..."
                    className="w-full text-xs p-2 rounded-lg border border-rose-200 focus:border-rose-600 focus:outline-none text-slate-900 bg-rose-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-1">
                  <label className="font-bold text-emerald-950 block text-xs">
                    8. Đề xuất hỗ trợ &amp; Định hướng ban đầu:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.initialRecommendations}
                    onChange={e => handleSummary9Change("initialRecommendations", e.target.value)}
                    placeholder="Biện pháp đồng hành của GVCN/Bộ môn trong 4 tuần đầu..."
                    className="w-full text-xs p-2 rounded-lg border border-emerald-300 focus:border-emerald-600 focus:outline-none text-slate-900 bg-emerald-50/30"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-teal-300 shadow-2xs space-y-1">
                  <label className="font-bold text-[#083d39] block text-xs">
                    9. Nội dung cần xác minh / trao đổi thêm:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.verificationItems}
                    onChange={e => handleSummary9Change("verificationItems", e.target.value)}
                    placeholder="Hồ sơ học bạ, lưu ý sức khỏe/tâm lý cần xem xét..."
                    className="w-full text-xs p-2 rounded-lg border border-teal-200 focus:border-teal-600 focus:outline-none text-slate-900 bg-teal-50/20"
                  />
                </div>
              </div>

              {/* KHỐI KHẢO SÁT & ĐÁNH GIÁ TÂM LÝ (NẾU HỌC SINH CÓ VẤN ĐỀ TÂM LÝ) */}
              <div className={`p-3.5 rounded-xl border shadow-2xs space-y-3 text-xs ${
                psychologyReferralStatus === "COMPLETED" || psychologyData
                  ? "bg-teal-50/50 border-teal-300"
                  : psychologyReferralStatus === "REQUESTED"
                  ? "bg-amber-50/50 border-amber-300"
                  : "bg-white border-slate-200"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#0b524d] text-white flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="font-black uppercase text-[#083d39] text-xs">
                          Khảo Sát &amp; Đánh Giá Tâm Lý Học Đường (Dành Cho HS Có Vấn Đề Tâm Lý)
                        </h4>
                        {psychologyReferralStatus === "COMPLETED" || psychologyData ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black">
                            ✓ Đã hoàn thành đánh giá Form Tâm lý ({psychologyData?.totalScore ?? psychTotalScore}/80đ)
                          </span>
                        ) : psychologyReferralStatus === "REQUESTED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">
                            ⏳ Đã gán GV Tâm lý khảo sát
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                            Không bắt buộc (Chỉ thực hiện khi HS có biểu hiện tâm lý)
                          </span>
                        )}

                        {psychAssignmentSource === "PERIOD_ASSIGNED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[#083d39] border border-teal-300 text-[10px] font-bold">
                            ★ Đã phân công theo đợt KS: {savedPsychTeacherName || selectedPsychTeacherName}
                          </span>
                        ) : psychAssignmentSource === "ORIENTATION_ASSIGNED" ? (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-bold">
                            ✓ Đã gán từ Phiếu định hướng: {savedPsychTeacherName || selectedPsychTeacherName}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {savedPsychTeacherName || selectedPsychTeacherName
                          ? `GV Tâm lý phụ trách: ${savedPsychTeacherName || selectedPsychTeacherName} (${
                              psychAssignmentSource === "PERIOD_ASSIGNED"
                                ? "Đã được phân công trong đợt khảo sát"
                                : psychAssignmentSource === "ORIENTATION_ASSIGNED"
                                ? "Được GV Định hướng chọn gán"
                                : "Chọn gán để đánh giá"
                            })${psychologyReferralReason ? ` • Lý do: ${psychologyReferralReason}` : ""}`
                          : "Trường hợp HS có vấn đề tâm lý: Chọn danh sách GV Tâm lý được phân công và tiến hành khảo sát kèm kết quả theo đúng Form Tâm lý."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(psychologyReferralStatus !== "NONE" || psychologyData) && (
                      <button
                        type="button"
                        onClick={() => {
                          setPsychModalTab("form")
                          setIsPsychModalOpen(true)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-[#083d39] border border-teal-300 text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-teal-700" />
                        <span>Mở Form Đánh Giá Tâm Lý (20 câu)</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPsychModalTab(psychologyData || psychologyReferralStatus === "COMPLETED" ? "form" : "referral")
                        setIsPsychModalOpen(true)
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0b524d] hover:bg-[#083d39] text-white text-[11px] font-black cursor-pointer transition-all shadow-2xs"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>
                        {psychologyReferralStatus === "COMPLETED" || psychologyData
                          ? "Xem / Cập Nhật Kết Quả Tâm Lý"
                          : psychologyReferralStatus === "REQUESTED"
                          ? "Thực Hiện Khảo Sát Tâm Lý"
                          : "Khảo Sát Tâm Lý"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* HIỂN THỊ KẾT QUẢ ĐÁNH GIÁ KÈM THEO ĐÚNG FORM TÂM LÝ NẾU ĐÃ KHẢO SÁT */}
                {(psychologyData || psychologyReferralStatus === "COMPLETED" || psychologyReferralStatus === "REQUESTED") && (
                  <div className="pt-2.5 border-t border-teal-200/80 space-y-2.5">
                    {/* Bảng tóm tắt 6 nhóm tiêu chí của Form Tâm lý */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                      {[
                        { label: "Mục I: Cảm xúc", idx: 0, max: 16 },
                        { label: "Mục II: Hành vi", idx: 1, max: 12 },
                        { label: "Mục III: Giao tiếp", idx: 2, max: 12 },
                        { label: "Mục IV: Chú ý & Học tập", idx: 3, max: 16 },
                        { label: "Mục V: Tư duy", idx: 4, max: 12 },
                        { label: "Mục VI: Động lực", idx: 5, max: 12 }
                      ].map(sec => {
                        const secVal =
                          psychologyData?.sectionScores?.[sec.idx] !== undefined
                            ? Number(psychologyData.sectionScores[sec.idx])
                            : calculatePsychSectionScore(sec.idx)
                        return (
                          <div key={sec.idx} className="p-2 rounded-lg bg-white border border-teal-200/80 text-center">
                            <span className="text-[10px] font-bold text-slate-500 block truncate">{sec.label}</span>
                            <span className="text-xs font-black text-[#083d39]">{secVal}</span>
                            <span className="text-[10px] text-slate-400">/{sec.max}đ</span>
                          </div>
                        )
                      })}

                      <div className="p-2 rounded-lg bg-[#083d39] text-white text-center flex flex-col justify-center">
                        <span className="text-[9.5px] font-bold text-teal-200 uppercase">Tổng điểm</span>
                        <span className="text-sm font-black">{psychologyData?.totalScore ?? psychTotalScore}/80</span>
                      </div>

                      <div className={`p-2 rounded-lg border text-center flex flex-col justify-center ${
                        (psychologyData?.evaluation || psychEvaluation).bg
                      } ${(psychologyData?.evaluation || psychEvaluation).border}`}>
                        <span className="text-[9.5px] font-bold text-slate-500 uppercase">Mức độ</span>
                        <span className={`text-[11px] font-black ${(psychologyData?.evaluation || psychEvaluation).color}`}>
                          {(psychologyData?.evaluation || psychEvaluation).level}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                        <span className="text-[10.5px] font-black uppercase text-amber-900 block mb-0.5">
                          Kết luận sơ bộ (Form Tâm lý):
                        </span>
                        <p className="text-slate-800 text-xs">
                          {psychologyData?.conclusion || psychConclusion || (psychologyData?.evaluation || psychEvaluation).suggestion || "Chưa nhập kết luận sơ bộ"}
                        </p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                        <span className="text-[10.5px] font-black uppercase text-emerald-900 block mb-0.5">
                          Khuyến nghị dành cho Phụ huynh &amp; Nhà trường:
                        </span>
                        <p className="text-slate-800 text-xs">
                          {psychologyData?.recommendation || psychRecommendation || "Chưa nhập khuyến nghị hỗ trợ"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* THẨM ĐỊNH QLCM & KẾT LUẬN GĐCS (2 CỘT SONG SONG GỌN GÀNG) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Cột 1: Thẩm định QLCM & GV phụ trách định hướng */}
                <div className="p-3.5 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-teal-100 pb-2">
                    <h4 className="font-black uppercase text-[#083d39] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span>Thẩm Định Quản Lý Chuyên Môn (QLCM)</span>
                    </h4>
                    <select
                      value={verificationStatus}
                      onChange={e => {
                        const val = e.target.value as any
                        setVerificationStatus(val)
                        if (val === "VERIFIED" && !verifiedAt) setVerifiedAt(new Date().toISOString())
                        markDirty()
                      }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                        verificationStatus === "VERIFIED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : verificationStatus === "REJECTED"
                          ? "bg-rose-50 text-rose-800 border-rose-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      <option value="PENDING">⏳ Chờ Thẩm Định</option>
                      <option value="VERIFIED">✓ Đã Thẩm Định</option>
                      <option value="REJECTED">✕ Yêu Cầu Bổ Sung</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 text-[11px]">GV phụ trách định hướng:</label>
                        <span className="px-1.5 py-0.5 rounded bg-teal-50 text-[#083d39] border border-teal-200 text-[9.5px] font-bold">
                          ✓ Tự gán theo phân công
                        </span>
                      </div>
                      {assignedOrientationTeachers.length > 1 ? (
                        <select
                          value={verifierName || interviewerName}
                          onChange={e => {
                            setVerifierName(e.target.value)
                            setInterviewerName(e.target.value)
                            markDirty()
                          }}
                          className="w-full text-xs p-2 rounded-lg border border-teal-300 focus:border-teal-600 text-[#083d39] font-bold bg-teal-50/30 cursor-pointer"
                        >
                          {assignedOrientationTeachers.map((t: any, idx: number) => (
                            <option key={t.teacherId || idx} value={t.teacherName}>
                              {t.teacherName} ({t.subjectName || "Phân công KS"})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={verifierName || interviewerName}
                          onChange={e => {
                            setVerifierName(e.target.value)
                            setInterviewerName(e.target.value)
                            markDirty()
                          }}
                          placeholder="Tự động gán theo phân công..."
                          className="w-full text-xs p-2 rounded-lg border border-teal-300 focus:border-teal-600 text-[#083d39] font-bold bg-teal-50/30"
                        />
                      )}
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Ý kiến thẩm định chuyên môn:</label>
                      <input
                        type="text"
                        value={verificationNotes}
                        onChange={e => { setVerificationNotes(e.target.value); markDirty(); }}
                        placeholder="Nhận xét của QLCM..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-teal-600 text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="supportReferralConfirm"
                      checked={supportReferralConfirmed}
                      onChange={e => { setSupportReferralConfirmed(e.target.checked); markDirty(); }}
                      className="w-3.5 h-3.5 rounded text-teal-700 focus:ring-teal-500 cursor-pointer"
                    />
                    <label htmlFor="supportReferralConfirm" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                      Xác nhận liên thông dữ liệu định hướng vào Hồ sơ học tập sau nhập học
                    </label>
                  </div>
                </div>

                {/* Cột 2: Kết luận & Chỉ đạo của Giám đốc Cơ sở (GĐCS) */}
                <div className="p-3.5 bg-teal-50/40 rounded-xl border border-teal-200 shadow-2xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-teal-200 pb-2">
                    <h4 className="font-black uppercase text-[#083d39] flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-teal-700" />
                      <span>Kết Luận Tiếp Nhận (Giám Đốc Cơ Sở)</span>
                    </h4>
                    <select
                      value={gdcsDecision}
                      onChange={e => { setGdcsDecision(e.target.value as any); markDirty(); }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-teal-300 bg-white text-[#083d39] focus:outline-none cursor-pointer"
                    >
                      <option value="TIEP_NHAN_CHUAN">✓ Tiếp nhận chuẩn (Theo quy chế)</option>
                      <option value="TIEP_NHAN_DONG_HANH">⚠️ Tiếp nhận có cam kết đồng hành</option>
                      <option value="TAM_HOAN_DANH_GIA">⏳ Tạm hoãn đánh giá / Chờ bổ sung</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                      Ghi chú chỉ đạo của Ban Giám Đốc Cơ Sở:
                    </label>
                    <textarea
                      rows={2}
                      value={gdcsGeneralNote}
                      onChange={e => { setGdcsGeneralNote(e.target.value); markDirty(); }}
                      placeholder="Chỉ đạo về xếp lớp, phân công giáo viên chủ nhiệm đồng hành..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-teal-600 text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER CỐ ĐỊNH GỌN GÀNG */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleViewReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-teal-700" />
              <span>Xem trước / Xuất PDF (A4)</span>
            </button>

            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã lưu thành công dữ liệu phiếu định hướng!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#083d39] border border-teal-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-teal-700" />
                  <span>Lưu nháp</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeTab === "tab1") {
                  setActiveTab("tab2")
                } else if (activeTab === "tab2") {
                  setActiveTab("tab3")
                } else {
                  handleSave(false)
                }
              }}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#0b524d] to-[#0f6b64] hover:from-[#083d39] hover:to-[#0b524d] text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {activeTab === "tab3"
                  ? "Hoàn thành & Gửi thẩm định QLCM"
                  : activeTab === "tab2"
                  ? "Tiếp tục & Tổng hợp (Phần C)"
                  : "Tiếp tục: Trao đổi PHHS (Phần B)"}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL KHẢO SÁT & ĐÁNH GIÁ TÂM LÝ HỌC ĐƯỜNG (CHỌN GV TÂM LÝ + FORM TÂM LÝ CHUẨN 6 NHÓM / 20 CÂU) */}
      {isPsychModalOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-teal-200 flex flex-col max-h-[94vh] overflow-hidden">
            
            {/* Header Modal Tâm Lý */}
            <div className="px-5 py-3 bg-gradient-to-r from-[#083d39] via-[#0b524d] to-[#0f6b64] text-white flex flex-wrap items-center justify-between gap-3 border-b border-teal-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-teal-300/40 flex items-center justify-center text-white">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                      Khảo Sát &amp; Đánh Giá Tâm Lý Học Đường
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-teal-400/25 border border-teal-300/40 text-[10px] font-bold">
                      {studentDetail?.fullName || student?.fullName} • {groupConfig.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-100/90">
                    Chọn Giáo viên Tâm lý được phân công &amp; Thực hiện khảo sát kèm kết quả đánh giá theo đúng Form Tâm lý chuẩn
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#073330]/90 p-1 rounded-xl border border-teal-600/60">
                  <button
                    type="button"
                    onClick={() => setPsychModalTab("referral")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      psychModalTab === "referral"
                        ? "bg-white text-[#083d39] shadow-2xs"
                        : "text-teal-100 hover:text-white"
                    }`}
                  >
                    1. Phân công GV Tâm lý
                  </button>
                  <button
                    type="button"
                    onClick={() => setPsychModalTab("form")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      psychModalTab === "form"
                        ? "bg-white text-[#083d39] shadow-2xs"
                        : "text-teal-100 hover:text-white"
                    }`}
                  >
                    2. Form Đánh Giá Tâm Lý ({psychAnsweredCount}/20 câu)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPsychModalOpen(false)}
                  className="p-1.5 text-teal-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thanh Chọn GV Tâm Lý Được Phân Công (Luôn hiển thị ở đầu Modal) */}
            <div className="px-5 py-2.5 bg-teal-50/70 border-b border-teal-200 flex flex-col gap-2 flex-shrink-0 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <span className="font-black text-[#083d39] uppercase text-[11px] flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span>GV Tâm lý được phân công:</span>
                  </span>

                  <select
                    value={selectedDeptCode}
                    onChange={e => handleDepartmentChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600 cursor-pointer"
                  >
                    <option value="TO_TLHN">Tổ Tâm lý Học đường &amp; Phân công đợt KS</option>
                    {departments
                      .filter((d: any) => d.code !== "TO_TLHN")
                      .map((d: any) => (
                        <option key={d.id || d.code} value={d.code || d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>

                  <select
                    value={selectedPsychTeacherId}
                    onChange={e => {
                      const tId = e.target.value
                      setSelectedPsychTeacherId(tId)
                      const found = assignedPsychTeachers.find((t: any) => t.teacherId === tId)
                      if (found) {
                        setSelectedPsychTeacherName(found.teacherName || "")
                        setSelectedPsychTeacherEmail(found.teacherEmail || "")
                        // Khi chọn GV Tâm lý từ danh sách -> Tự động gán phụ trách và chuyển sang đánh giá
                        handleQuickAssignPsychTeacher(tId, found.teacherName || "", true)
                      }
                    }}
                    disabled={loadingDeptTeachers || assigningPsychTeacher}
                    className="px-3 py-1.5 bg-white border border-teal-400 rounded-lg text-xs font-black text-[#083d39] focus:outline-none focus:border-teal-700 min-w-[260px] cursor-pointer"
                  >
                    {assignedPsychTeachers.length === 0 ? (
                      <option value="">-- Chưa có danh sách GV Tâm lý --</option>
                    ) : (
                      <>
                        {assignedPsychTeachers.some((t: any) => t.isPeriodAssigned || t.isStudentAssigned) && (
                          <optgroup label="★ TRƯỜNG HỢP 1: ĐÃ ĐƯỢC PHÂN CÔNG (ĐỢT KS / HỒ SƠ HS)">
                            {assignedPsychTeachers
                              .filter((t: any) => t.isPeriodAssigned || t.isStudentAssigned)
                              .map((t: any, idx: number) => (
                                <option key={`assigned-${t.teacherId || idx}`} value={t.teacherId}>
                                  {t.teacherName} {t.isPeriodAssigned ? "★ (Đã phân công đợt KS)" : "✓ (Đã gán từ Phiếu ĐH)"}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        <optgroup label="TRƯỜNG HỢP 2: CHỌN GÁN GV TÂM LÝ (TỔ TÂM LÝ HỌC ĐƯỜNG)">
                          {assignedPsychTeachers
                            .filter((t: any) => !t.isPeriodAssigned && !t.isStudentAssigned)
                            .map((t: any, idx: number) => (
                              <option key={`dept-${t.teacherId || idx}`} value={t.teacherId}>
                                {t.teacherName} ({t.assignmentRole || "Tổ Tâm lý Học đường"})
                              </option>
                            ))}
                        </optgroup>
                      </>
                    )}
                  </select>

                  {/* Trạng thái phân công / Nút xác nhận gán nhanh */}
                  {assigningPsychTeacher ? (
                    <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-[#083d39] border border-teal-300 text-[11px] font-bold flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700" />
                      <span>Đang gán GV Tâm lý...</span>
                    </span>
                  ) : psychAssignmentSource === "PERIOD_ASSIGNED" && (!savedPsychTeacherId || selectedPsychTeacherId === savedPsychTeacherId) ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Đã phân công theo đợt KS</span>
                    </span>
                  ) : psychAssignmentSource === "ORIENTATION_ASSIGNED" && selectedPsychTeacherId === savedPsychTeacherId ? (
                    <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-[#083d39] border border-teal-300 text-[11px] font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                      <span>Đã gán phụ trách &amp; đồng bộ danh sách KS</span>
                    </span>
                  ) : selectedPsychTeacherName ? (
                    <button
                      type="button"
                      onClick={() => handleQuickAssignPsychTeacher(selectedPsychTeacherId, selectedPsychTeacherName, true)}
                      className="px-3 py-1.5 rounded-lg bg-[#0b524d] hover:bg-[#083d39] text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Gán GV Tâm lý này &amp; Đánh giá ngay</span>
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-[11px] font-bold text-[#083d39]">
                    Tổng điểm: <strong className="text-sm font-black">{psychTotalScore}</strong>/80đ
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-black ${psychEvaluation.bg} ${psychEvaluation.border} ${psychEvaluation.color}`}>
                    {psychEvaluation.level}
                  </span>
                </div>
              </div>

              {psychAssignToast && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-[11px] font-bold flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span>{psychAssignToast}</span>
                  </div>
                  <span className="text-[10px] text-emerald-800">Đã tự động mở danh sách KS môn Tâm lý cho GV</span>
                </div>
              )}
            </div>

            {/* Body Modal Tâm Lý */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/70 space-y-4">
              {psychModalTab === "referral" ? (
                <div className="space-y-4">
                  {/* Khối kiểm tra 2 trường hợp phân công GV Tâm lý */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className={`p-3.5 rounded-xl border ${
                      psychAssignmentSource === "PERIOD_ASSIGNED"
                        ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300"
                        : "bg-white border-slate-200"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black uppercase text-[#083d39] text-[11px]">
                          Trường hợp 1: Đã phân công theo đợt Khảo sát
                        </span>
                        {psychAssignmentSource === "PERIOD_ASSIGNED" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black">
                            Đang áp dụng
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Giáo vụ / KT&amp;ĐBCL đã phân công GV Tâm lý trong đợt khảo sát đầu vào. Hệ thống tự động nhận diện GV phụ trách để thực hiện đánh giá ngay.
                      </p>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                      psychAssignmentSource === "ORIENTATION_ASSIGNED"
                        ? "bg-teal-50/70 border-teal-300 ring-1 ring-teal-300"
                        : "bg-white border-slate-200"
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black uppercase text-[#083d39] text-[11px]">
                          Trường hợp 2: GV Định hướng chọn gán phát sinh
                        </span>
                        {psychAssignmentSource === "ORIENTATION_ASSIGNED" && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-200/80 text-[#083d39] text-[10px] font-black">
                            Đã gán: {savedPsychTeacherName || selectedPsychTeacherName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Khi phát hiện HS có biểu hiện tâm lý trong buổi phỏng vấn, GV Định hướng chọn GV Tâm lý ở thanh trên. Hệ thống tự động gán quyền khảo sát môn Tâm lý và gửi thông báo cho GV Tâm lý.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-teal-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase text-[#083d39] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Biểu hiện / Vấn đề tâm lý ghi nhận cần khảo sát chuyên sâu:</span>
                      </label>
                      <span className="text-[11px] text-slate-500">Chọn nhanh biểu hiện hoặc nhập chi tiết</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Rụt rè, lo âu căng thẳng kéo dài khi giao tiếp",
                        "Khó tập trung chú ý, dễ xao nhãng hoặc tăng động",
                        "Khó kiểm soát cảm xúc khi gặp tình huống bất ngờ",
                        "Ngại tương tác xã hội, thu mình hoặc né tránh ánh mắt",
                        "Phụ huynh chia sẻ học sinh cần hỗ trợ tâm lý học đường",
                        "Cần đánh giá mức độ sẵn sàng tâm lý & thích nghi môi trường mới"
                      ].map((tag, i) => {
                        const isSelected = psychologyReferralReason.includes(tag)
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setPsychologyReferralReason(prev => prev.replace(tag, "").replace(/;\s*;/g, ";").replace(/^;\s*|;\s*$/g, "").trim())
                              } else {
                                setPsychologyReferralReason(prev => (prev ? `${prev}; ${tag}` : tag))
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#0b524d] text-white border-[#083d39]"
                                : "bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            + {tag}
                          </button>
                        )
                      })}
                    </div>

                    <textarea
                      rows={3}
                      value={psychologyReferralReason}
                      onChange={e => setPsychologyReferralReason(e.target.value)}
                      placeholder="Mô tả cụ thể biểu hiện tâm lý, hành vi hoặc lưu ý cần GV Tâm lý khảo sát..."
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-teal-600 focus:outline-none text-slate-900 bg-white"
                    />
                  </div>

                  {/* Tóm tắt thông tin định hướng gửi kèm cho GV Tâm lý */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
                    <h4 className="font-black uppercase text-[#083d39] text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-700" />
                      <span>Thông tin ghi nhận từ Phiếu định hướng chuyển giao cho GV Tâm lý</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-900 block mb-0.5">Điểm mạnh &amp; Sở thích của HS:</span>
                        <p className="text-slate-600">{summary9.strongPoints || "Chưa ghi nhận"}</p>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-900 block mb-0.5">Khó khăn / Nhu cầu cần hỗ trợ:</span>
                        <p className="text-slate-600">{summary9.difficultiesNeeds || "Chưa ghi nhận"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB 2: FORM KHẢO SÁT & ĐÁNH GIÁ TÂM LÝ CHUẨN THEO KHỐI (6 NHÓM - 20 CÂU - THANG ĐIỂM 0-4) */
                <div className="space-y-4">
                  {/* Thang điểm chuẩn 0 - 4 */}
                  <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-black text-[#083d39] uppercase">Thang điểm chuẩn (0 – 4 điểm / câu):</span>
                    <div className="flex flex-wrap items-center gap-3 text-slate-700 font-semibold">
                      <span><strong className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">0</strong> Không có biểu hiện</span>
                      <span><strong className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">1</strong> Biểu hiện rất nhẹ</span>
                      <span><strong className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">2</strong> Thỉnh thoảng / Nhẹ</span>
                      <span><strong className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">3</strong> Thường xuyên / Rõ</span>
                      <span><strong className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">4</strong> Rất thường xuyên / Ảnh hưởng rõ</span>
                    </div>
                  </div>

                  {/* Thanh chọn Nhóm tiêu chí (Mục I -> VI hoặc Xem tất cả) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setPsychActiveSection("ALL")}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap border transition-all cursor-pointer ${
                        psychActiveSection === "ALL"
                          ? "bg-[#0b524d] text-white border-[#083d39]"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                      }`}
                    >
                      Tất cả 6 Mục (20 câu)
                    </button>
                    {psychQuestions.map((sec: any, sIdx: number) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setPsychActiveSection(sIdx)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all cursor-pointer flex items-center gap-1.5 ${
                          psychActiveSection === sIdx
                            ? "bg-[#0b524d] text-white border-[#083d39]"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50"
                        }`}
                      >
                        <span>{sec.title.split("(")[0].trim()}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                          psychActiveSection === sIdx ? "bg-teal-400/30 text-white" : "bg-teal-50 text-[#083d39]"
                        }`}>
                          {calculatePsychSectionScore(sIdx)}đ
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Danh sách câu hỏi đánh giá tâm lý */}
                  <div className="space-y-3">
                    {psychQuestions.map((sec: any, sIdx: number) => {
                      if (psychActiveSection !== "ALL" && psychActiveSection !== sIdx) return null
                      let sectionOffset = 0
                      for (let i = 0; i < sIdx; i++) {
                        sectionOffset += (psychQuestions[i]?.questions?.length || 0)
                      }
                      return (
                        <div key={sIdx} className="bg-white rounded-xl border border-teal-200 shadow-2xs overflow-hidden">
                          <div className="px-4 py-2 bg-teal-50/80 border-b border-teal-100 flex items-center justify-between">
                            <h5 className="font-black text-[#083d39] text-xs">{sec.title}</h5>
                            <span className="text-[11px] font-black text-teal-800">
                              Điểm phần này: {calculatePsychSectionScore(sIdx)} / {(sec.questions?.length || 0) * 4}đ
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {(sec.questions || []).map((q: any, qIdx: number) => {
                              const actualIdx = sectionOffset + qIdx
                              const currentScore = psychScores[actualIdx]
                              return (
                                <div key={qIdx} className="p-3 hover:bg-slate-50/80 transition-colors space-y-2">
                                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                                    <div className="text-xs font-bold text-slate-800 flex-1">
                                      {q.text}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {(q.options || ["0", "1", "2", "3", "4"]).map((opt: string, oIdx: number) => {
                                        const val = (q.options?.length || 5) === 5 ? oIdx : oIdx + 1
                                        const active = currentScore === val
                                        return (
                                          <button
                                            key={oIdx}
                                            type="button"
                                            onClick={() => {
                                              const next = [...psychScores]
                                              next[actualIdx] = val
                                              setPsychScores(next)
                                            }}
                                            className={`min-w-[34px] px-2.5 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                                              active
                                                ? "bg-[#0b524d] text-white border-[#083d39] shadow-2xs"
                                                : "bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:text-[#083d39]"
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Ghi chú quan sát:</span>
                                    <input
                                      type="text"
                                      value={psychNotes[actualIdx] || ""}
                                      onChange={e => {
                                        const nextNotes = [...psychNotes]
                                        nextNotes[actualIdx] = e.target.value
                                        setPsychNotes(nextNotes)
                                      }}
                                      placeholder="Ghi nhận biểu hiện cụ thể của học sinh ở câu này (nếu có)..."
                                      className="flex-1 text-xs border-b border-dashed border-slate-300 focus:border-teal-600 bg-transparent py-0.5 px-1 text-slate-800 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tổng hợp Kết luận sơ bộ & Khuyến nghị theo Form Tâm lý */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                      <label className="text-xs font-black uppercase text-amber-900 block">
                        C. Kết luận sơ bộ của Giáo viên Tâm lý:
                      </label>
                      <textarea
                        rows={3}
                        value={psychConclusion}
                        onChange={e => setPsychConclusion(e.target.value)}
                        placeholder="Nhận định tổng quát về cảm xúc, hành vi, khả năng tập trung và thích nghi của học sinh..."
                        className="w-full text-xs p-2.5 rounded-lg border border-amber-200 focus:border-amber-500 focus:outline-none text-slate-900 bg-amber-50/20"
                      />
                    </div>

                    <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-1.5">
                      <label className="text-xs font-black uppercase text-emerald-900 block">
                        D. Khuyến nghị dành cho Phụ huynh &amp; Nhà trường:
                      </label>
                      <textarea
                        rows={3}
                        value={psychRecommendation}
                        onChange={e => setPsychRecommendation(e.target.value)}
                        placeholder="Gợi ý biện pháp đồng hành, hỗ trợ tâm lý học đường hoặc phối hợp gia đình..."
                        className="w-full text-xs p-2.5 rounded-lg border border-emerald-200 focus:border-emerald-600 focus:outline-none text-slate-900 bg-emerald-50/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal Tâm Lý */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="text-xs">
                {psychSubmittedSuccess && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đã phân công &amp; gửi thông báo cho GV Tâm lý ({selectedPsychTeacherName})!</span>
                  </span>
                )}
                {psychAssessmentSaved && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Đã lưu Kết quả Đánh giá Tâm lý kèm vào Phiếu Định Hướng thành công!</span>
                  </span>
                )}
                {!psychSubmittedSuccess && !psychAssessmentSaved && (
                  <span className="text-slate-500 font-medium">
                    Kết quả đánh giá theo Form Tâm lý sẽ được đính kèm trực tiếp vào Phiếu Định Hướng &amp; Hồ sơ Tuyển sinh.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPsychModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Đóng
                </button>

                {psychModalTab === "referral" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPsychModalTab("form")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#083d39] border border-teal-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-teal-700" />
                      <span>Mở Form Khảo Sát Tâm Lý Ngay &rarr;</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitPsychReferral}
                      disabled={submittingPsych}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#0b524d] to-[#0f6b64] hover:from-[#083d39] hover:to-[#0b524d] text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {submittingPsych ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang gửi...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Phân Công &amp; Gửi Thông Báo GV Tâm Lý</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSavePsychAssessment}
                    disabled={savingPsychAssessment}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#0b524d] to-[#0f6b64] hover:from-[#083d39] hover:to-[#0b524d] text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingPsychAssessment ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu kết quả...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Lưu Kết Quả Đánh Giá Tâm Lý ({psychTotalScore}/80đ)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* QUICK CONSULTATION MODAL */}
      {isAdvisoryModalOpen && (
        <QuickConsultationModal
          isOpen={isAdvisoryModalOpen}
          onClose={() => setIsAdvisoryModalOpen(false)}
          studentId={studentDetail?.id || student?.id || ""}
          academicYearId={studentDetail?.academicYearId || student?.academicYearId || ""}
          student={studentDetail || student}
        />
      )}
    </div>
  )
}
