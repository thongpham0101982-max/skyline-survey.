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
  onOpenReport?: (student: any, orientationData?: any) => void
  onSuccess?: () => void
}

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

  // Khảo sát tâm lý
  const [isPsychModalOpen, setIsPsychModalOpen] = useState(false)
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
        try {
          const rRes = await fetch(`/api/admin/orientation/records?studentId=${student.id}`)
          if (rRes.ok) {
            const rData = await rRes.json()
            record = rData?.success ? rData.data : null
            const sDetail = rData?.student || record?.student || null
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

        if (record) {
          setInterviewerName(record.interviewerName || "")
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

          // Thẩm định QLCM cơ sở
          if (parsedInterviewData?.verification) {
            setVerificationStatus(parsedInterviewData.verification.status || "PENDING")
            setVerifierName(parsedInterviewData.verification.verifiedBy || "")
            setVerifiedAt(parsedInterviewData.verification.verifiedAt || "")
            setVerificationNotes(parsedInterviewData.verification.notes || "")
            setSupportReferralConfirmed(!!parsedInterviewData.verification.supportReferralConfirmed)
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
        }

        // Tải thông tin Tổ tâm lý nếu có chỉ định
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
              setPsychologyReferralStatus(pData.referralStatus || record?.psychologyReferralStatus || "NONE")
              setPsychologyReferralReason(pData.referralReason || record?.psychologyReferralReason || "")
              if (pData?.psychologyData && isMounted) {
                setPsychologyData(pData.psychologyData)
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
            oralEnglishScore
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
      const richInterviewPayload = {
        version: ORIENTATION_CRITERIA_VERSION,
        gradeGroup: gradeGroupKey,
        formGrade: student?.grade,
        interviewDate,
        interviewerName,
        items: itemsArray,
        criteriaResults: itemsArray,
        parentItems: parentItemsArray,
        summary9Items: summary9,
        proposedPlacementRecommendation: summary9.initialRecommendations || proposedClassPlacement,
        verification: {
          status: verificationStatus,
          verifiedBy: verifierName,
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
        interviewerName,
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
        literatureScore
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

  // Mở Báo cáo nhận diện A4
  const handleViewReport = () => {
    if (onOpenReport) {
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
        interviewerName,
        items: itemsArray,
        criteriaResults: itemsArray,
        parentItems: parentItemsArray,
        summary9Items: summary9,
        proposedPlacementRecommendation: summary9.initialRecommendations || proposedClassPlacement,
        verification: {
          status: verificationStatus,
          verifiedBy: verifierName,
          verifiedAt: verifiedAt || (verificationStatus !== "PENDING" ? new Date().toISOString() : null),
          notes: verificationNotes,
          supportReferralConfirmed
        }
      }

      const orientationDataPreview = {
        studentId: student.id,
        interviewDate,
        interviewerName,
        studentStrengths: summary9.strongPoints,
        studentNeedsSupport: summary9.difficultiesNeeds,
        interviewerGeneralRemark: summary9.initialRecommendations,
        parentRepresentativeName,
        parentPhone,
        parentExpectations: summary9.parentExpectations,
        proposedEduSystem,
        proposedClassPlacement,
        admissionConsultantNote: buildGdcsConsultantPayload(),
        interviewData: JSON.stringify(richInterviewPayload)
      }

      onOpenReport(studentDetail || student, orientationDataPreview)
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

  const findSubjectScore = (keywords: string[]) => {
    // 1. Check parsed kqHocTap.scores
    if (parsedKqHocTap?.scores && typeof parsedKqHocTap.scores === "object") {
      for (const [k, v] of Object.entries(parsedKqHocTap.scores)) {
        const normK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        if (keywords.some(kw => normK.includes(kw)) && v !== null && v !== undefined && String(v).trim() !== "") {
          return String(v)
        }
      }
    }
    // 2. Check studentDetail.scores array
    if (Array.isArray(studentDetail?.scores)) {
      for (const item of studentDetail.scores) {
        const sName = String(item?.subject?.name || item?.subjectName || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
        if (keywords.some(kw => sName.includes(kw))) {
          const val = item?.score ?? item?.rawScore ?? item?.gradeLevel
          if (val !== null && val !== undefined && String(val).trim() !== "") {
            return String(val)
          }
        }
      }
    }
    return ""
  }

  const campusName = resolveCampusDisplay()
  const oldSchool = studentDetail?.oldSchoolName || student?.oldSchoolName || "—"
  const gender = studentDetail?.gender || student?.gender || "Nam"
  const dobDisplay = (studentDetail?.dateOfBirth || student?.dateOfBirth)
    ? new Date(studentDetail?.dateOfBirth || student?.dateOfBirth).toLocaleDateString("vi-VN")
    : "—"

  const displayHocTap =
    parsedKqHocTap?.hocTap ||
    parsedKqHocTap?.academicRating ||
    parsedKqHocTap?.nangLuc ||
    (typeof rawKq === "string" && !rawKq.trim().startsWith("{") ? rawKq : "") ||
    studentDetail?.academicRating ||
    studentDetail?.kqgdTieuHoc ||
    "Tốt"

  const displayRenLuyen =
    studentDetail?.kqRenLuyen ||
    studentDetail?.conductRating ||
    parsedKqHocTap?.renLuyen ||
    parsedKqHocTap?.phamChat ||
    "Tốt"

  const displayMath =
    mathScore ||
    studentDetail?.mathScore ||
    findSubjectScore(["toan", "math"]) ||
    "—"

  const displayLiterature =
    literatureScore ||
    studentDetail?.literatureScore ||
    findSubjectScore(["ngu van", "tieng viet", "van", "literature"]) ||
    "—"

  const displayEnglish =
    writtenEnglishScore ||
    studentDetail?.writtenEnglishScore ||
    oralEnglishScore ||
    studentDetail?.oralEnglishScore ||
    findSubjectScore(["tieng anh", "ngoai ngu", "english"]) ||
    "—"

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
      <div className="relative bg-white w-full max-w-[1320px] rounded-2xl shadow-2xl border border-purple-200 flex flex-col max-h-[96vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER GỌN CHUẨN THEO NHẬN DIỆN MÀU TÍM SKY-LINE */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-purple-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-sm border border-purple-400/40 flex-shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  PHIẾU ĐỊNH HƯỚNG HỌC SINH &amp; TRAO ĐỔI PHHS
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-100 border border-purple-400/40 text-[10px] font-bold">
                  {groupConfig.label}
                </span>
                <span className="hidden sm:inline text-[10px] text-purple-300 font-mono">v{formVersion}</span>
              </div>
              <p className="text-[11px] text-purple-200/90 leading-tight">
                Trọng tâm: {groupConfig.focus}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ngày phỏng vấn & GV phỏng vấn trên thanh Header */}
            <div className="hidden lg:flex items-center gap-2 bg-purple-900/70 border border-purple-700/70 rounded-xl px-2.5 py-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-purple-200">Ngày PV:</span>
              <input
                type="date"
                value={interviewDate}
                onChange={e => { setInterviewDate(e.target.value); markDirty(); }}
                className="bg-transparent text-white font-bold text-[11px] focus:outline-none cursor-pointer"
              />
              <span className="text-purple-600">|</span>
              <span className="text-purple-200">GV:</span>
              <input
                type="text"
                placeholder="Nhập tên GV..."
                value={interviewerName}
                onChange={e => { setInterviewerName(e.target.value); markDirty(); }}
                className="bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder:text-purple-300/70 rounded px-2 py-0.5 text-[11px] font-bold focus:outline-none w-32"
              />
            </div>

            {/* Trạng thái Auto-save */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-900/60 border border-purple-700/60 text-[11px] text-purple-200">
              {saving ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-purple-300" />
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer bg-purple-800/80 hover:bg-purple-700 text-purple-100 border border-purple-600"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>{psychologyReferralStatus === "REQUESTED" ? "Đã Đề Xuất Tâm Lý" : "Khảo sát Tâm lý"}</span>
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
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-purple-100 hover:text-white border border-purple-400/40 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Xem &amp; In A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-purple-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PHẦN ĐẦU: THÔNG TIN HỌC SINH (BẢNG 12 CỘT CHUẨN, GỌN, LUÔN HIỂN THỊ) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-700 text-white text-[10px] font-black uppercase tracking-wider">
                Thông tin Học sinh
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Hồ sơ đăng ký dự tuyển &amp; Kết quả học tập / khảo sát đầu vào
              </span>
            </div>

            {/* Hiển thị Ngày PV & GV phỏng vấn trên màn hình nhỏ */}
            <div className="flex lg:hidden items-center gap-2 text-[11px]">
              <span className="text-slate-500 font-semibold">Ngày PV:</span>
              <input
                type="date"
                value={interviewDate}
                onChange={e => { setInterviewDate(e.target.value); markDirty(); }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-800"
              />
              <span className="text-slate-500 font-semibold">GV:</span>
              <input
                type="text"
                placeholder="Tên GV..."
                value={interviewerName}
                onChange={e => { setInterviewerName(e.target.value); markDirty(); }}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px] font-bold text-slate-800 w-28"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-purple-50/80 text-[10px] font-black uppercase text-purple-950 border-b border-purple-100 whitespace-nowrap">
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">1. Mã HS</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">2. Họ và tên</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">3. Ngày sinh / Phái</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">4. Khối đăng ký</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">5. Hệ đào tạo</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">6. Cơ sở</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70">7. Trường cũ</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">8. Học tập</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">9. Rèn luyện</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">10. Toán</th>
                  <th className="py-1.5 px-2.5 border-r border-slate-200/70 text-center">11. Ngữ Văn</th>
                  <th className="py-1.5 px-2.5 text-center">12. Tiếng Anh</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-800 whitespace-nowrap">
                  <td className="py-1.5 px-2.5 border-r border-slate-100 font-mono font-bold text-slate-900">
                    {studentDetail?.studentCode || student?.studentCode || "—"}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 font-black text-purple-950">
                    {studentDetail?.fullName || student?.fullName || "—"}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-slate-700">
                    {dobDisplay} <span className="text-slate-400">&bull;</span> <span className="font-semibold">{gender}</span>
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100">
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[11px]">
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
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-center font-bold text-slate-900">
                    {displayMath}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-100 text-center font-bold text-slate-900">
                    {displayLiterature}
                  </td>
                  <td className="py-1.5 px-2.5 text-center font-bold text-slate-900">
                    {displayEnglish}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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

        {/* THANH ĐIỀU HƯỚNG 3 PHẦN CHÍNH: A - B - C */}
        <div className="px-4 bg-white border-b border-slate-200 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {/* TAB A: PHỎNG VẤN HỌC SINH */}
            <button
              type="button"
              onClick={() => setActiveTab("tab1")}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tab1"
                  ? "border-purple-700 text-purple-950 bg-purple-50/80 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-purple-800 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <UserCheck className={`w-3.5 h-3.5 ${activeTab === "tab1" ? "text-purple-700" : "text-slate-400"}`} />
              <span>A. Phỏng Vấn Định Hướng Học Sinh</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === "tab1" ? "bg-purple-700 text-white" : "bg-purple-100 text-purple-800"
              }`}>
                10 nhóm
              </span>
            </button>

            {/* TAB B: TRAO ĐỔI PHỤ HUYNH */}
            <button
              type="button"
              onClick={() => setActiveTab("tab2")}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tab2"
                  ? "border-purple-700 text-purple-950 bg-purple-50/80 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-purple-800 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${activeTab === "tab2" ? "text-purple-700" : "text-slate-400"}`} />
              <span>B. Trao Đổi Định Hướng Với Phụ Huynh</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === "tab2" ? "bg-purple-700 text-white" : "bg-purple-100 text-purple-800"
              }`}>
                5 nhóm
              </span>
            </button>

            {/* TAB C: TỔNG HỢP NHẬN DIỆN & THẨM ĐỊNH */}
            <button
              type="button"
              onClick={() => setActiveTab("tab3")}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tab3"
                  ? "border-purple-700 text-purple-950 bg-purple-50/80 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-purple-800 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <FileCheck className={`w-3.5 h-3.5 ${activeTab === "tab3" ? "text-purple-700" : "text-slate-400"}`} />
              <span>C. Tổng Hợp Nhận Diện &amp; Thẩm Định</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === "tab3" ? "bg-purple-700 text-white" : "bg-purple-100 text-purple-800"
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
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
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
              <RefreshCw className="w-7 h-7 animate-spin mx-auto text-purple-700" />
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
                        ? "border-purple-300"
                        : "border-slate-200 hover:border-purple-200"
                    }`}
                  >
                    {/* Tiêu đề Accordion Header Gọn */}
                    <div
                      onClick={() => toggleAccordionA(q.id)}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/60 rounded-t-xl hover:bg-purple-50/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                          <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                            {q.code}
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {q.questionText}
                          </span>
                          <span className="text-[11px] text-slate-500 hidden sm:inline">
                            &mdash; {q.focus || q.suggestedGuideline}
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
                        <div className="w-5 h-5 rounded text-slate-400 hover:text-purple-700 flex items-center justify-center">
                          {isOpenAcc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Nội dung chi tiết câu hỏi (Thiết kế 2 cột Gọn & Nhanh) */}
                    {isOpenAcc && (
                      <div className="p-3.5 pt-2.5 border-t border-slate-100 space-y-2.5">
                        {/* Thanh hướng dẫn + Nút xem câu hỏi gợi mở + Chọn nhanh 4 mức & Nguồn minh chứng */}
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-purple-50/40 px-3 py-1.5 rounded-lg border border-purple-100 text-[11px]">
                          <div className="text-slate-700">
                            <strong className="text-purple-900">Trọng tâm cần tìm hiểu: </strong>
                            <span>{q.focus || q.suggestedGuideline}</span>
                          </div>
                          {qHints.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleHint(q.id)}
                              className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>{isHintOpen ? "Ẩn câu hỏi gợi mở" : `Câu hỏi gợi mở (${qHints.length})`}</span>
                            </button>
                          )}
                        </div>

                        {isHintOpen && qHints.length > 0 && (
                          <div className="px-3 py-2 bg-indigo-50/50 rounded-lg border border-indigo-200 text-xs text-indigo-950">
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
                                      ? `${opt.borderClass} ${opt.bgClass} ${opt.textClass} ring-1 ring-purple-300 shadow-2xs`
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
                                      ? "border-purple-600 bg-purple-50 text-purple-950 ring-1 ring-purple-200"
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
                                <Smile className="w-3.5 h-3.5 text-purple-600" />
                                <span>Câu trả lời / Chia sẻ thực tế của học sinh:</span>
                              </label>
                            </div>
                            <textarea
                              rows={2}
                              value={ans.studentNotes || ""}
                              onChange={e => handleStudentNotesChange(q.id, e.target.value)}
                              placeholder="Ghi nhận chia sẻ tự nhiên của học sinh..."
                              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all text-slate-900 bg-white"
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
                                className="flex items-center gap-1 text-[10.5px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                              >
                                {aiCommentLoading[q.id] ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Đang gợi ý...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 text-purple-600" />
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
                                  : "border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Hộp gợi ý nhận xét từ AI */}
                        {showAiDraftBox[q.id] && aiDraftComments[q.id] && (
                          <div className="p-2.5 bg-purple-50/70 border border-purple-300 rounded-xl flex items-center justify-between gap-3 text-xs text-purple-950">
                            <p className="text-slate-800 italic flex-1">
                              <strong className="text-purple-900 not-italic mr-1">Gợi ý AI:</strong>
                              &quot;{aiDraftComments[q.id]}&quot;
                            </p>
                            <button
                              type="button"
                              onClick={() => handleApplyAiComment(q.id)}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-[11px] cursor-pointer flex-shrink-0"
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
                  className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
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
              <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <span className="font-bold text-slate-700 whitespace-nowrap">Người đại diện PHHS:</span>
                    <input
                      type="text"
                      value={parentRepresentativeName}
                      onChange={e => { setParentRepresentativeName(e.target.value); markDirty(); }}
                      placeholder="Ví dụ: Bố Nguyễn Văn A / Mẹ Lê Thị B"
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none text-slate-900 bg-white font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <span className="font-bold text-slate-700 whitespace-nowrap">SĐT liên hệ:</span>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={e => { setParentPhone(e.target.value); markDirty(); }}
                      placeholder="0905xxxxxx"
                      className="w-36 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-600 focus:outline-none text-slate-900 bg-white font-mono font-semibold"
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
                    <div key={pGroup.id} className="bg-white rounded-xl border border-indigo-200/90 shadow-2xs p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-900 flex items-center justify-center font-black text-xs flex-shrink-0">
                            {pIdx + 1}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                            {pGroup.code}
                          </span>
                          <h4 className="text-xs font-black text-slate-900">
                            {pGroup.title}
                          </h4>
                        </div>
                        {hints.length > 0 && (
                          <span className="text-[11px] text-indigo-700 font-medium">
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
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900 bg-white"
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
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white"
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
                  className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
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
              <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase text-purple-950 tracking-wide flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-purple-700" />
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
                <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-white rounded-xl border-2 border-purple-300 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-700" />
                      <h4 className="text-xs font-black text-purple-950 uppercase">
                        Dự Thảo Tổng Hợp Từ Sky-Line AI (9 Mục)
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyAiSummaryAll}
                        className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg cursor-pointer"
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
                    <div className="p-2 bg-white rounded-lg border border-purple-200">
                      <span className="font-bold text-purple-900 block">1. Điểm mạnh nổi bật:</span>
                      <p className="text-slate-700 text-[11px] italic">{aiSummaryData.strongPoints || aiSummaryData.diemManhNoiBat}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-purple-200">
                      <span className="font-bold text-purple-900 block">2. Sở thích &amp; Động lực:</span>
                      <p className="text-slate-700 text-[11px] italic">{aiSummaryData.interestsMotivation || "Học sinh hào hứng tham gia hoạt động học tập."}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-purple-200">
                      <span className="font-bold text-purple-900 block">3. Khả năng thích nghi:</span>
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

                <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-1">
                  <label className="font-bold text-purple-950 block text-xs">
                    5. Kỳ vọng của học sinh tại Sky-Line:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.studentExpectations}
                    onChange={e => handleSummary9Change("studentExpectations", e.target.value)}
                    placeholder="Mong muốn trải nghiệm, câu lạc bộ, bạn bè..."
                    className="w-full text-xs p-2 rounded-lg border border-purple-200 focus:border-purple-600 focus:outline-none text-slate-900 bg-purple-50/20"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-1">
                  <label className="font-bold text-indigo-950 block text-xs">
                    6. Kỳ vọng của phụ huynh đối với học sinh:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.parentExpectations}
                    onChange={e => handleSummary9Change("parentExpectations", e.target.value)}
                    placeholder="Mục tiêu phát triển kỹ năng, học thuật và nhân cách..."
                    className="w-full text-xs p-2 rounded-lg border border-indigo-200 focus:border-indigo-600 focus:outline-none text-slate-900 bg-indigo-50/20"
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

                <div className="p-3 bg-white rounded-xl border border-purple-300 shadow-2xs space-y-1">
                  <label className="font-bold text-purple-950 block text-xs">
                    9. Nội dung cần xác minh / trao đổi thêm:
                  </label>
                  <textarea
                    rows={2}
                    value={summary9.verificationItems}
                    onChange={e => handleSummary9Change("verificationItems", e.target.value)}
                    placeholder="Hồ sơ học bạ, lưu ý sức khỏe/tâm lý cần xem xét..."
                    className="w-full text-xs p-2 rounded-lg border border-purple-200 focus:border-purple-600 focus:outline-none text-slate-900 bg-purple-50/20"
                  />
                </div>
              </div>

              {/* THẨM ĐỊNH QLCM & KẾT LUẬN GĐCS (2 CỘT SONG SONG GỌN GÀNG) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Cột 1: Thẩm định QLCM */}
                <div className="p-3.5 bg-white rounded-xl border border-purple-200 shadow-2xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-purple-100 pb-2">
                    <h4 className="font-black uppercase text-purple-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-700" />
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
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Cán bộ QLCM thẩm định:</label>
                      <input
                        type="text"
                        value={verifierName}
                        onChange={e => { setVerifierName(e.target.value); markDirty(); }}
                        placeholder="Họ tên QLCM..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-purple-600 text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-[11px]">Ý kiến thẩm định chuyên môn:</label>
                      <input
                        type="text"
                        value={verificationNotes}
                        onChange={e => { setVerificationNotes(e.target.value); markDirty(); }}
                        placeholder="Nhận xét của QLCM..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-purple-600 text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="supportReferralConfirm"
                      checked={supportReferralConfirmed}
                      onChange={e => { setSupportReferralConfirmed(e.target.checked); markDirty(); }}
                      className="w-3.5 h-3.5 rounded text-purple-700 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="supportReferralConfirm" className="text-[11px] font-semibold text-slate-700 cursor-pointer">
                      Xác nhận liên thông dữ liệu định hướng vào Hồ sơ học tập sau nhập học
                    </label>
                  </div>
                </div>

                {/* Cột 2: Kết luận & Chỉ đạo của Giám đốc Cơ sở (GĐCS) */}
                <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-200 shadow-2xs space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-purple-200 pb-2">
                    <h4 className="font-black uppercase text-purple-950 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-purple-700" />
                      <span>Kết Luận Tiếp Nhận (Giám Đốc Cơ Sở)</span>
                    </h4>
                    <select
                      value={gdcsDecision}
                      onChange={e => { setGdcsDecision(e.target.value as any); markDirty(); }}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-purple-300 bg-white text-purple-950 focus:outline-none cursor-pointer"
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
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-purple-600 text-slate-900 bg-white"
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
              <Printer className="w-3.5 h-3.5 text-purple-700" />
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-700" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-purple-700" />
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
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition-all disabled:opacity-50"
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
