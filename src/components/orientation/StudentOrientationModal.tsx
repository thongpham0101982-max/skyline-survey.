"use client"

import React, { useState, useEffect } from "react"
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
  Copy
} from "lucide-react"
import QuickConsultationModal from "@/components/advisory/QuickConsultationModal"
import {
  getGradeGroupKey,
  getOrientationGradeGroupConfig,
  ORIENTATION_RATING_OPTIONS,
  ORIENTATION_CRITERIA_VERSION,
  isCommentMandatory,
  GradeGroupKey,
  RatingCode
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
  questionText: string
  category: string
  rating: RatingCode
  notes: string
  teacherComment?: string
  suggestedQuestions?: string[]
}

export function StudentOrientationModal({
  isOpen,
  onClose,
  student,
  onOpenReport,
  onSuccess
}: StudentOrientationModalProps) {
  const [activeTab, setActiveTab] = useState<"tab1" | "tab2" | "tab3">("tab1")
  const [loading, setLoading] = useState(false)
  
  // Tự động nhận diện 1 trong 5 nhóm khối từ khối lớp học sinh
  const gradeGroupKey = getGradeGroupKey(student?.grade)
  const groupConfig = getOrientationGradeGroupConfig(student?.grade)
  const currentPrompts = groupConfig.parentPrompts
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [tab1ViewMode, setTab1ViewMode] = useState<"cards" | "table">("cards")
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState(false)

  // Form State Tab 1: Phỏng vấn học sinh
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({})
  const [adaptationLevel, setAdaptationLevel] = useState("CONFIDENT")
  const [studentStrengths, setStudentStrengths] = useState("")
  const [studentNeedsSupport, setStudentNeedsSupport] = useState("")
  const [proposedPlacementRecommendation, setProposedPlacementRecommendation] = useState("")
  const [interviewerGeneralRemark, setInterviewerGeneralRemark] = useState("")
  const [interviewerName, setInterviewerName] = useState("")

  // Thẩm định Quản lý Chuyên môn Cơ sở (QLCM) & Liên thông Hồ sơ
  const [verificationStatus, setVerificationStatus] = useState<"PENDING" | "VERIFIED" | "REJECTED">("PENDING")
  const [verifierName, setVerifierName] = useState("")
  const [verifiedAt, setVerifiedAt] = useState("")
  const [verificationNotes, setVerificationNotes] = useState("")
  const [supportReferralConfirmed, setSupportReferralConfirmed] = useState(false)

  // Điều khiển hiển thị câu hỏi gợi mở & Validation
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({})

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

  // Form State Tab 2: Trao đổi PHHS
  const [parentRepresentativeName, setParentRepresentativeName] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [parentExpectations, setParentExpectations] = useState("")
  const [parentHealthNotes, setParentHealthNotes] = useState("")
  const [parentPersonalityNotes, setParentPersonalityNotes] = useState("")
  const [parentSpecialRequests, setParentSpecialRequests] = useState("")
  const [cooperationCommitment, setCooperationCommitment] = useState("")

  // Form State Định hướng chung & Chỉ đạo GĐCS
  const [proposedEduSystem, setProposedEduSystem] = useState("")
  const [proposedClassPlacement, setProposedClassPlacement] = useState("")
  const [admissionConsultantNote, setAdmissionConsultantNote] = useState("")

  // Form State Điểm khảo sát Tiếng Anh & Các môn theo quy chế tuyển sinh
  const [writtenEnglishScore, setWrittenEnglishScore] = useState("")
  const [oralEnglishScore, setOralEnglishScore] = useState("")
  const [mathScore, setMathScore] = useState("")
  const [literatureScore, setLiteratureScore] = useState("")

  // GĐCS Directives & Actions State
  const [gdcsDecision, setGdcsDecision] = useState<"TIEP_NHAN_CHUAN" | "TIEP_NHAN_DONG_HANH" | "TAM_HOAN_DANH_GIA">("TIEP_NHAN_CHUAN")
  const [gdcsGeneralNote, setGdcsGeneralNote] = useState("")
  
  // 1. GĐCS: Ủy quyền GV
  const [gdcsDelegateTeacher, setGdcsDelegateTeacher] = useState(false)
  const [gdcsDelegatedTeacherName, setGdcsDelegatedTeacherName] = useState("")
  const [gdcsDelegatedTeacherId, setGdcsDelegatedTeacherId] = useState("")
  const [gdcsDelegationNote, setGdcsDelegationNote] = useState("")

  // 2. GĐCS: Đặt lịch làm việc
  const [gdcsScheduleMeeting, setGdcsScheduleMeeting] = useState(false)
  const [gdcsMeetingTime, setGdcsMeetingTime] = useState("")
  const [gdcsMeetingLocation, setGdcsMeetingLocation] = useState("Phòng họp Giám đốc Cơ sở")
  const [gdcsMeetingParticipants, setGdcsMeetingParticipants] = useState("GĐCS, GV Tâm lý, BGH, TTCM")
  const [gdcsMeetingAgenda, setGdcsMeetingAgenda] = useState("")

  // 3. GĐCS: Trao đổi trực tiếp PHHS
  const [gdcsDirectParentMeeting, setGdcsDirectParentMeeting] = useState(false)
  const [gdcsParentMeetingTime, setGdcsParentMeetingTime] = useState("")
  const [gdcsParentMeetingLocation, setGdcsParentMeetingLocation] = useState("Phòng Giám đốc Cơ sở")
  const [gdcsParentMeetingContent, setGdcsParentMeetingContent] = useState("")

  // Psychology Referral State
  const [isPsychModalOpen, setIsPsychModalOpen] = useState(false)
  const [psychologyReferralStatus, setPsychologyReferralStatus] = useState<string>("NONE")
  const [psychologyReferralReason, setPsychologyReferralReason] = useState<string>("")
  const [selectedPsychTeacherId, setSelectedPsychTeacherId] = useState<string>("")
  const [selectedPsychTeacherName, setSelectedPsychTeacherName] = useState<string>("")
  const [selectedPsychTeacherEmail, setSelectedPsychTeacherEmail] = useState<string>("")
  const [assignedPsychTeachers, setAssignedPsychTeachers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>("TO_TLHN")
  const [loadingDeptTeachers, setLoadingDeptTeachers] = useState<boolean>(false)
  const [psychQuestions, setPsychQuestions] = useState<any[]>([])
  const [submittingPsych, setSubmittingPsych] = useState(false)
  const [psychSubmittedSuccess, setPsychSubmittedSuccess] = useState(false)
  const [psychPreviewTab, setPsychPreviewTab] = useState<"orientation" | "assessment">("orientation")
  const [psychologyData, setPsychologyData] = useState<any>(null)

  // Full Student Profile State
  const [studentDetail, setStudentDetail] = useState<any>(student || {})

  useEffect(() => {
    if (student) {
      setStudentDetail((prev: any) => ({ ...prev, ...student }))
      if (student.writtenEnglishScore !== undefined && student.writtenEnglishScore !== null) {
        setWrittenEnglishScore(String(student.writtenEnglishScore))
      }
      if (student.oralEnglishScore !== undefined && student.oralEnglishScore !== null) {
        setOralEnglishScore(String(student.oralEnglishScore))
      }
      if (student.mathScore !== undefined && student.mathScore !== null) {
        setMathScore(String(student.mathScore))
      }
      if (student.literatureScore !== undefined && student.literatureScore !== null) {
        setLiteratureScore(String(student.literatureScore))
      }
    }
  }, [student])

  // Hàm định dạng ngày sinh & tính tuổi chính xác
  const formatBirthDate = (d: any) => {
    if (!d) return { text: "Chưa cập nhật", age: null }
    try {
      const dt = new Date(d)
      if (isNaN(dt.getTime())) return { text: String(d), age: null }
      const day = String(dt.getDate()).padStart(2, "0")
      const month = String(dt.getMonth() + 1).padStart(2, "0")
      const year = dt.getFullYear()
      const now = new Date()
      let age = now.getFullYear() - year
      if (now.getMonth() + 1 < dt.getMonth() + 1 || (now.getMonth() + 1 === dt.getMonth() + 1 && now.getDate() < dt.getDate())) {
        age--
      }
      return {
        text: `${day}/${month}/${year}`,
        age: age >= 0 && age < 100 ? age : null
      }
    } catch {
      return { text: String(d), age: null }
    }
  }

  // Đổi Tổ chuyên môn để tải danh sách GV thuộc tổ
  const handleDepartmentChange = async (deptCode: string) => {
    setSelectedDeptCode(deptCode)
    if (!student?.id) return
    try {
      setLoadingDeptTeachers(true)
      const res = await fetch(`/api/admin/orientation/psychology-referral?studentId=${student.id}&departmentCode=${deptCode}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.success) {
          const teachers = data.assignedTeachers || data.tlhnTeachers || []
          setAssignedPsychTeachers(teachers)
          if (teachers.length > 0) {
            const first = teachers[0]
            setSelectedPsychTeacherId(first.teacherId || first.userId || "")
            setSelectedPsychTeacherName(first.teacherName || first.fullName || "")
            setSelectedPsychTeacherEmail(first.teacherEmail || first.email || "")
          } else {
            setSelectedPsychTeacherId("")
            setSelectedPsychTeacherName("")
            setSelectedPsychTeacherEmail("")
          }
        }
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách GV theo tổ:", err)
    } finally {
      setLoadingDeptTeachers(false)
    }
  }

  // Chuẩn hóa danh sách câu hỏi tâm lý (phẳng hóa nếu trả về dạng nhóm/sections)
  const flattenedPsychCriteria = React.useMemo(() => {
    if (!Array.isArray(psychQuestions)) return []
    const flat: any[] = []
    psychQuestions.forEach((item: any) => {
      if (item && Array.isArray(item.questions)) {
        item.questions.forEach((q: any) => {
          flat.push({
            ...q,
            category: item.title || "Tiêu chuẩn tâm lý"
          })
        })
      } else if (item) {
        flat.push(item)
      }
    })
    return flat
  }, [psychQuestions])

  // Tải danh mục câu hỏi theo khối và dữ liệu phiếu đã lưu của học sinh
  useEffect(() => {
    if (!isOpen || !student?.id) return

    let isMounted = true
    setLoading(true)

    const fetchData = async () => {
      try {
        // 1. Tự động nhận diện nhóm khối (1 trong 5 nhóm khối chuẩn hóa)
        const gradeGroup = getGradeGroupKey(student?.grade)
        const fallbackGroup = getOrientationGradeGroupConfig(student?.grade)

        // 2. Fetch danh sách câu hỏi / tiêu chí theo nhóm khối từ catalog
        let qList: any[] = []
        try {
          const qRes = await fetch(`/api/admin/orientation/catalog?gradeGroup=${gradeGroup}`)
          if (qRes.ok) {
            const qData = await qRes.json()
            if (qData?.success && Array.isArray(qData?.data) && qData.data.length > 0) {
              qList = qData.data.map((item: any) => {
                let parsedSample: any = {}
                if (item.sampleAnswers) {
                  try {
                    parsedSample = typeof item.sampleAnswers === "string" ? JSON.parse(item.sampleAnswers) : item.sampleAnswers
                  } catch (e) {}
                }
                return {
                  ...item,
                  suggestedQuestions: parsedSample.suggestedQuestions || [],
                  mandatoryCommentRatings: parsedSample.mandatoryCommentRatings || ["NEED_SUPPORT", "SPECIAL_ATTENTION"]
                }
              })
            }
          }
        } catch (e) {
          console.error("Error fetching orientation catalog:", e)
        }

        // Nếu catalog chưa có câu hỏi, tự động dùng 4 tiêu chí chuẩn hóa từ cấu hình
        if (!qList || qList.length === 0) {
          qList = fallbackGroup.criteria.map(c => ({
            id: c.id,
            gradeGroup,
            grade: fallbackGroup.label,
            category: c.category,
            categoryLabel: c.categoryLabel,
            questionText: c.name,
            suggestedGuideline: c.guideline,
            suggestedQuestions: c.suggestedQuestions,
            mandatoryCommentRatings: c.mandatoryCommentRatings,
            sortOrder: c.sortOrder,
            status: "ACTIVE"
          }))
        }

        // 3. Fetch dữ liệu phiếu của học sinh nếu đã từng lưu
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

        // Parse answers (Hỗ trợ cấu trúc lưu mới có version, verification & backward compatibility mảng cũ)
        const initialAnswers: Record<string, QuestionAnswer> = {}
        let savedAnswersList: any[] = []
        let parsedInterviewData: any = null

        if (record?.interviewData) {
          try {
            const parsed = JSON.parse(record.interviewData)
            parsedInterviewData = parsed
            if (Array.isArray(parsed)) {
              savedAnswersList = parsed
            } else if (parsed && Array.isArray(parsed.items)) {
              savedAnswersList = parsed.items
            } else if (parsed && Array.isArray(parsed.criteriaResults)) {
              savedAnswersList = parsed.criteriaResults
            }
          } catch (e) {}
        }

        qList.forEach((q: any) => {
          const matched = savedAnswersList.find((a: any) => a.questionId === q.id || a.criterionId === q.id || a.category === q.category)
          const comment = matched?.teacherComment || matched?.notes || ""
          initialAnswers[q.id] = {
            questionId: q.id,
            questionText: q.questionText || q.name,
            category: q.category,
            rating: (matched?.rating as RatingCode) || "NORMAL",
            notes: comment,
            teacherComment: comment,
            suggestedQuestions: q.suggestedQuestions || []
          }
        })

        setAnswers(initialAnswers)

        if (record) {
          setAdaptationLevel(record.adaptationLevel || "CONFIDENT")
          setStudentStrengths(record.studentStrengths || "")
          setStudentNeedsSupport(record.studentNeedsSupport || "")
          setInterviewerGeneralRemark(record.interviewerGeneralRemark || "")
          setInterviewerName(record.interviewerName || "")

          // Tách nhận xét tổng hợp trường 3: Đề xuất định hướng tiếp nhận
          setProposedPlacementRecommendation(
            parsedInterviewData?.proposedPlacementRecommendation ||
            record?.proposedClassPlacement ||
            record?.interviewerGeneralRemark ||
            ""
          )

          // Thẩm định QLCM cơ sở & Liên thông hồ sơ
          if (parsedInterviewData?.verification) {
            setVerificationStatus(parsedInterviewData.verification.status || "PENDING")
            setVerifierName(parsedInterviewData.verification.verifiedBy || "")
            setVerifiedAt(parsedInterviewData.verification.verifiedAt || "")
            setVerificationNotes(parsedInterviewData.verification.notes || "")
            setSupportReferralConfirmed(!!parsedInterviewData.verification.supportReferralConfirmed)
          }

          setParentRepresentativeName(record.parentRepresentativeName || "")
          setParentPhone(record.parentPhone || student.parentPhone || "")
          setParentExpectations(record.parentExpectations || "")
          setParentHealthNotes(record.parentHealthNotes || "")
          setParentPersonalityNotes(record.parentPersonalityNotes || "")
          setParentSpecialRequests(record.parentSpecialRequests || "")
          setCooperationCommitment(record.cooperationCommitment || "")

          const sanitizeEdu = (val?: string | null, st?: any) => {
            if (val && !["online", "offline"].includes(val.trim().toLowerCase())) return val;
            if (st?.surveyFormType && !["online", "offline"].includes(st.surveyFormType.trim().toLowerCase())) return st.surveyFormType;
            if (st?.surveySystem && !["online", "offline"].includes(st.surveySystem.trim().toLowerCase())) return st.surveySystem;
            return "Chất lượng cao (CLC)";
          };

          setProposedEduSystem(sanitizeEdu(record.proposedEduSystem, student))
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
        } else {
          const sanitizeEdu = (val?: string | null, st?: any) => {
            if (val && !["online", "offline"].includes(val.trim().toLowerCase())) return val;
            if (st?.surveyFormType && !["online", "offline"].includes(st.surveyFormType.trim().toLowerCase())) return st.surveyFormType;
            if (st?.surveySystem && !["online", "offline"].includes(st.surveySystem.trim().toLowerCase())) return st.surveySystem;
            return "Chất lượng cao (CLC)";
          };

          // Khởi tạo giá trị mặc định từ thông tin học sinh
          setParentRepresentativeName(student?.parentName || student?.contactName || "")
          setParentPhone(student?.parentPhone || student?.contactPhone || "")
          setProposedEduSystem(sanitizeEdu(null, student))
          setProposedClassPlacement("Xếp lớp theo phân bổ tuyển sinh")
        }

        // 4. Fetch thông tin đề xuất khảo sát Tâm lý & GV Tâm lý phân công
        try {
          const pRes = await fetch(`/api/admin/orientation/psychology-referral?studentId=${student.id}`)
          if (pRes.ok) {
            const pData = await pRes.json()
            if (pData?.success && isMounted) {
              const deptList = pData.departments || []
              setDepartments(deptList)
              setSelectedDeptCode(pData.selectedDepartmentCode || "TO_TLHN")

              const teachers = pData.assignedTeachers || pData.tlhnTeachers || []
              setAssignedPsychTeachers(teachers)
              setPsychQuestions(pData.psychologyQuestions || [])
              setPsychologyReferralStatus(pData.referralStatus || record?.psychologyReferralStatus || "NONE")
              setPsychologyReferralReason(pData.referralReason || record?.psychologyReferralReason || "")
              if (pData?.psychologyData && isMounted) {
                setPsychologyData(pData.psychologyData)
              }

              const savedTId = record?.psychologyTeacherId || pData.referralTeacherId
              const matched = teachers.find((t: any) => (t.teacherId || t.userId) === savedTId)
              const targetTeacher = matched || teachers[0]

              if (targetTeacher) {
                setSelectedPsychTeacherId(targetTeacher.teacherId || targetTeacher.userId || "")
                setSelectedPsychTeacherName(targetTeacher.teacherName || targetTeacher.fullName || "")
                setSelectedPsychTeacherEmail(targetTeacher.teacherEmail || targetTeacher.email || "")
              } else {
                setSelectedPsychTeacherId(savedTId || "")
                setSelectedPsychTeacherName(record?.psychologyTeacherName || pData.referralTeacherName || "")
                setSelectedPsychTeacherEmail("")
              }
            }
          }
        } catch (pErr) {
          console.error("Lỗi khi tải thông tin phân công tâm lý:", pErr)
        }
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

  const handleSubmitPsychReferral = async () => {
    if (!selectedPsychTeacherId) {
      alert("Vui lòng chọn Giáo viên Tâm lý tiếp nhận.")
      return
    }
    if (!psychologyReferralReason.trim()) {
      alert("Vui lòng nhập lý do hoặc chọn ít nhất một biểu hiện/dấu hiệu tâm lý cần khảo sát.")
      return
    }

    try {
      setSubmittingPsych(true)
      const res = await fetch("/api/admin/orientation/psychology-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          reason: psychologyReferralReason,
          teacherId: selectedPsychTeacherId,
          teacherName: selectedPsychTeacherName,
          teacherEmail: selectedPsychTeacherEmail,
          notifyEmail: true
        })
      })

      const data = await res.json()
      if (data.success) {
        setPsychologyReferralStatus("REQUESTED")
        setPsychSubmittedSuccess(true)
        setTimeout(() => {
          setPsychSubmittedSuccess(false)
          setIsPsychModalOpen(false)
        }, 1800)
        if (onSuccess) onSuccess()
      } else {
        alert("Lỗi khi gửi đề xuất khảo sát tâm lý: " + (data.error || "Không xác định"))
      }
    } catch (e: any) {
      alert("Lỗi kết nối máy chủ: " + e.message)
    } finally {
      setSubmittingPsych(false)
    }
  }

  if (!isOpen) return null

  const handleRatingChange = (qId: string, rating: QuestionAnswer["rating"]) => {
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

  const handleNotesChange = (qId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        notes: text,
        teacherComment: text
      }
    }))
    if (text.trim()) {
      setValidationErrors(prev => ({
        ...prev,
        [qId]: false
      }))
    }
  }

  const toggleHint = (qId: string) => {
    setOpenHints(prev => ({
      ...prev,
      [qId]: !prev[qId]
    }))
  }

  // ==========================================
  // SKY-LINE AI ADMISSION ASSISTANT HANDLERS
  // ==========================================

  // 1. AI gợi ý câu hỏi phỏng vấn theo nhóm khối
  const handleAiSuggestQuestions = async (q: any) => {
    try {
      setAiQuestionLoading(prev => ({ ...prev, [q.id]: true }))
      const ans = answers[q.id]
      const currentNotes = (ans?.teacherComment || ans?.notes || "").trim()

      const res = await fetch("/api/admin/orientation/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_questions",
          grade: student?.grade,
          gradeGroupKey,
          criterionName: q.questionText || q.name,
          categoryLabel: q.categoryLabel,
          guideline: q.suggestedGuideline,
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

  // 2. AI hỗ trợ dự thảo nhận xét theo tiêu chí (Không ghi đè tự động)
  const handleAiDraftComment = async (q: any) => {
    try {
      setAiCommentLoading(prev => ({ ...prev, [q.id]: true }))
      const ans = answers[q.id] || { rating: "NORMAL", notes: "" }
      const rawNotes = (ans?.teacherComment || ans?.notes || "").trim()

      const res = await fetch("/api/admin/orientation/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft_comment",
          criterionName: q.questionText || q.name,
          rating: ans.rating,
          rawNotes,
          guideline: q.suggestedGuideline,
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

  // Áp dụng dự thảo nhận xét của AI (Có xác nhận của GV)
  const handleApplyAiComment = (qId: string) => {
    const draft = aiDraftComments[qId]
    if (draft) {
      handleNotesChange(qId, draft)
      setShowAiDraftBox(prev => ({ ...prev, [qId]: false }))
    }
  }

  // 3. AI Tổng hợp hồ sơ định hướng (5 nhóm tiêu chuẩn)
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
            parentExpectations,
            parentPersonalityNotes,
            parentSpecialRequests,
            cooperationCommitment,
            parentHealthNotes
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

  // Áp dụng dự thảo tổng hợp AI vào các trường chính thức
  const handleApplyAiSummary = (options?: { strengths?: boolean; needsSupport?: boolean; placement?: boolean }) => {
    if (!aiSummaryData) return
    const { strengths = true, needsSupport = true, placement = true } = options || {}

    if (strengths && aiSummaryData.diemManhNoiBat) {
      setStudentStrengths(aiSummaryData.diemManhNoiBat)
    }
    if (needsSupport && aiSummaryData.noiDungCanPhatTrien) {
      const combined = [
        aiSummaryData.noiDungCanPhatTrien,
        aiSummaryData.deXuatHoTroBanDau ? `\n[Đề xuất hỗ trợ ban đầu]: ${aiSummaryData.deXuatHoTroBanDau}` : "",
        aiSummaryData.noiDungCanXacMinh ? `\n[Lưu ý xác minh thêm]: ${aiSummaryData.noiDungCanXacMinh}` : ""
      ].filter(Boolean).join("")
      setStudentNeedsSupport(combined)
    }
    if (placement && aiSummaryData.khuyenNghiXepLop) {
      setProposedPlacementRecommendation(
        `${aiSummaryData.khuyenNghiXepLop} - ${aiSummaryData.heHocDeXuat || ""}`.trim()
      )
    }
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

  const handleSave = async () => {
    try {
      setSaving(true)

      // 1. Kiểm tra validation: Bắt buộc nhận xét nếu chọn mức Cần hỗ trợ ban đầu hoặc Cần lưu ý thêm
      const missingCriteria: string[] = []
      const errMap: Record<string, boolean> = {}

      questions.forEach((q: any) => {
        const ans = answers[q.id]
        if (ans && isCommentMandatory(ans.rating)) {
          const comment = (ans.teacherComment || ans.notes || "").trim()
          if (!comment) {
            missingCriteria.push(`"${q.questionText || q.name}" (${ans.rating === "NEED_SUPPORT" ? "Cần hỗ trợ ban đầu" : "Cần lưu ý thêm"})`)
            errMap[q.id] = true
          }
        }
      })

      if (missingCriteria.length > 0) {
        setValidationErrors(errMap)
        setActiveTab("tab2")
        alert(`BẮT BUỘC NHẬP NHẬN XÉT GIÁO VIÊN:\n\nKhi đánh giá mức "Cần hỗ trợ ban đầu" hoặc "Cần lưu ý thêm", giáo viên bắt buộc phải nhập nhận xét lý do & biểu hiện cụ thể cho các tiêu chí:\n- ${missingCriteria.join("\n- ")}`)
        setSaving(false)
        return
      }

      setValidationErrors({})

      // 2. Chuẩn bị danh sách tiêu chí đã điền
      const itemsArray = questions.map((q: any) => {
        const ans = answers[q.id] || {}
        const comment = (ans.teacherComment || ans.notes || "").trim()
        return {
          questionId: q.id,
          criterionId: q.id,
          questionText: q.questionText || q.name,
          category: q.category,
          categoryLabel: q.categoryLabel,
          rating: ans.rating || "NORMAL",
          teacherComment: comment,
          notes: comment,
          suggestedQuestions: q.suggestedQuestions || []
        }
      })

      // 3. Cấu trúc dữ liệu phiên bản 2026.1 (Tương thích ngược 100%)
      const richInterviewPayload = {
        version: ORIENTATION_CRITERIA_VERSION,
        gradeGroup: gradeGroupKey,
        items: itemsArray,
        criteriaResults: itemsArray,
        proposedPlacementRecommendation,
        verification: {
          status: verificationStatus,
          verifiedBy: verifierName,
          verifiedAt: verifiedAt || (verificationStatus !== "PENDING" ? new Date().toISOString() : null),
          notes: verificationNotes,
          supportReferralConfirmed
        }
      }

      const gdcsPayloadStr = buildGdcsConsultantPayload()

      const payload = {
        studentId: student.id,
        adaptationLevel,
        interviewData: JSON.stringify(richInterviewPayload),
        studentStrengths,
        studentNeedsSupport,
        interviewerGeneralRemark: proposedPlacementRecommendation || interviewerGeneralRemark,
        interviewerName,

        parentRepresentativeName,
        parentPhone,
        parentExpectations,
        parentHealthNotes,
        parentPersonalityNotes,
        parentSpecialRequests,
        cooperationCommitment,

        proposedEduSystem,
        proposedClassPlacement: proposedPlacementRecommendation || proposedClassPlacement,
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
        setAdmissionConsultantNote(gdcsPayloadStr)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        if (onSuccess) onSuccess()
      } else {
        alert("Lỗi khi lưu phiếu định hướng: " + (data.error || "Không xác định"))
      }
    } catch (e: any) {
      alert("Lỗi: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleViewReport = () => {
    if (onOpenReport) {
      const itemsArray = questions.map((q: any) => {
        const ans = answers[q.id] || {}
        const comment = (ans.teacherComment || ans.notes || "").trim()
        return {
          questionId: q.id,
          criterionId: q.id,
          questionText: q.questionText || q.name,
          category: q.category,
          categoryLabel: q.categoryLabel,
          rating: ans.rating || "NORMAL",
          teacherComment: comment,
          notes: comment,
          suggestedQuestions: q.suggestedQuestions || []
        }
      })

      const richInterviewPayload = {
        version: ORIENTATION_CRITERIA_VERSION,
        gradeGroup: gradeGroupKey,
        items: itemsArray,
        proposedPlacementRecommendation,
        verification: {
          status: verificationStatus,
          verifiedBy: verifierName,
          verifiedAt: verifiedAt || new Date().toISOString(),
          notes: verificationNotes,
          supportReferralConfirmed
        }
      }

      const gdcsPayloadStr = buildGdcsConsultantPayload()
      const currentOrientationData = {
        studentId: student.id,
        adaptationLevel,
        interviewData: JSON.stringify(richInterviewPayload),
        studentStrengths,
        studentNeedsSupport,
        interviewerGeneralRemark: proposedPlacementRecommendation || interviewerGeneralRemark,
        proposedPlacementRecommendation,
        interviewerName,
        parentRepresentativeName,
        parentPhone,
        parentExpectations,
        parentHealthNotes,
        parentPersonalityNotes,
        parentSpecialRequests,
        cooperationCommitment,
        proposedEduSystem,
        proposedClassPlacement: proposedPlacementRecommendation || proposedClassPlacement,
        admissionConsultantNote: gdcsPayloadStr,
        verificationStatus,
        verifierName,
        verifiedAt,
        verificationNotes,
        supportReferralConfirmed
      }
      onOpenReport(student, currentOrientationData)
    }
  }

  // Helper tính toán dữ liệu hiển thị hồ sơ & điểm số cho toàn bộ modal
  const dobInfo = formatBirthDate(studentDetail?.dateOfBirth || student?.dateOfBirth)
  const campusName = studentDetail?.admissionCampus 
    || studentDetail?.registeredCampus 
    || studentDetail?.batch?.campus?.campusName 
    || (String(studentDetail?.batch?.name || "").includes("CS5") ? "Sky-Line Hill (CS5)" :
        String(studentDetail?.batch?.name || "").includes("CS1") ? "Sky-Line Riverside (CS1)" :
        String(studentDetail?.batch?.name || "").includes("CS2") ? "Sky-Line Central (CS2)" :
        String(studentDetail?.batch?.name || "").includes("CS3") ? "Sky-Line International (CS3)" :
        String(studentDetail?.batch?.name || "").includes("CS4") ? "Sky-Line Beach (CS4)" : "Sky-Line")
  const batchName = studentDetail?.batch?.name || (studentDetail?.batch?.batchNumber ? `Đợt ${studentDetail.batch.batchNumber}` : "") || "Khảo sát đầu vào"
  const periodName = studentDetail?.period?.name || "Khảo sát lẻ"
  const oldSchool = studentDetail?.oldSchoolName || "Chưa có thông tin"
  const gender = studentDetail?.gender || student?.gender || "Chưa rõ"
  const contactPerson = parentRepresentativeName || studentDetail?.parentName || studentDetail?.contactName || ""
  const contactPhoneNum = parentPhone || studentDetail?.parentPhone || studentDetail?.contactPhone || ""

  // Trích xuất điểm số các môn trong HỌC BẠ (Năm học trước nộp kèm hồ sơ tuyển sinh)
  const mathVal = studentDetail?.mathScore !== null && studentDetail?.mathScore !== undefined && studentDetail?.mathScore !== ""
    ? String(studentDetail.mathScore)
    : null

  const litVal = studentDetail?.literatureScore !== null && studentDetail?.literatureScore !== undefined && studentDetail?.literatureScore !== ""
    ? String(studentDetail.literatureScore)
    : null

  let engVal = ""
  if (studentDetail?.writtenEnglishScore !== null && studentDetail?.writtenEnglishScore !== undefined && studentDetail?.writtenEnglishScore !== "") {
    engVal += `Viết: ${studentDetail.writtenEnglishScore}`
  }
  if (studentDetail?.oralEnglishScore !== null && studentDetail?.oralEnglishScore !== undefined && studentDetail?.oralEnglishScore !== "") {
    engVal += `${engVal ? " • " : ""}Nói: ${studentDetail.oralEnglishScore}`
  }
  if (!engVal && studentDetail?.englishScore !== null && studentDetail?.englishScore !== undefined && studentDetail?.englishScore !== "") {
    engVal = String(studentDetail.englishScore)
  }

  // Thu thập điểm các bài khảo sát thực tế tại Sky-Line (Tâm lý, Năng lực tư duy, Chuẩn 5-6 tuổi...)
  const surveyScoresList: Array<{ name: string, score: string }> = []
  if (studentDetail?.psychologyScore !== null && studentDetail?.psychologyScore !== undefined && studentDetail?.psychologyScore !== "") {
    surveyScoresList.push({ name: "Tâm lý học đường", score: String(studentDetail.psychologyScore) })
  }
  
  // Thu thập điểm khảo sát thực tế các môn (Toán, Tiếng Việt/Ngữ Văn, Tiếng Anh...) tách riêng môn Tâm lý
  const academicSurveyScoresList: Array<{ name: string, score: string, teacherRemark?: string }> = []

  if (Array.isArray(studentDetail?.scores)) {
    studentDetail.scores.forEach((s: any) => {
      const sName = s.subject?.name || s.subject?.code || "Môn khảo sát"
      const sCode = String(s.subject?.code || "").toUpperCase()
      let sVal = s.finalScore ?? s.score ?? s.scoreComposite
      if (!sVal && s.scores) {
        try {
          const arr = JSON.parse(s.scores)
          if (Array.isArray(arr) && arr.length > 0) sVal = arr[arr.length - 1] ?? arr[0]
          else sVal = s.scores
        } catch {
          sVal = s.scores
        }
      }
      if (sVal !== null && sVal !== undefined && sVal !== "") {
        surveyScoresList.push({ name: sName, score: String(sVal) })

        // Nếu không phải là môn Tâm lý thì đưa vào danh sách môn khảo sát học thuật
        if (sCode !== "TLY" && !sCode.includes("TÂM LÝ") && !sCode.includes("TAM LY")) {
          let remark = s.remarks || s.note || ""
          if (!remark && s.comments) {
            try {
              const cArr = JSON.parse(s.comments)
              if (Array.isArray(cArr) && cArr.length > 0) remark = cArr.filter(Boolean).join(" • ")
              else if (typeof s.comments === "string") remark = s.comments
            } catch {}
          }
          academicSurveyScoresList.push({ name: sName, score: String(sVal), teacherRemark: remark })
        }
      }
    })
  }
  const otherScoresVal = studentDetail?.otherScores || null

  // 1. Hệ khảo sát: Format tên đầy đủ (không viết tắt HNS thô, không nhầm lẫn)
  const formatEduSystem = (val?: string | null) => {
    if (!val) return "Hội nhập Quốc tế (HNS)"
    const s = String(val).trim().toUpperCase()
    if (s === "HNS") return "Hội nhập Quốc tế (HNS)"
    if (s === "CLC") return "Chất lượng cao (CLC)"
    if (s === "SN" || s === "SONG NGU") return "Song ngữ Quốc tế"
    if (s === "OFFLINE" || s === "ONLINE") return "Hội nhập Quốc tế (HNS)"
    return val
  }
  const formattedEduSystem = formatEduSystem(studentDetail?.surveyFormType || studentDetail?.surveySystem)

  // 2. Chương trình học tập / Hồ sơ quốc tế: Tránh lặp lại với Hệ khảo sát
  const formattedCurriculum = (() => {
    const rawCt = studentDetail?.hoSoCtQuocTe?.trim()
    if (rawCt && rawCt.toLowerCase() !== String(studentDetail?.surveyFormType || "").toLowerCase()) {
      return rawCt
    }
    return "Chương trình chuẩn Sky-Line"
  })()

  // 3. Đợt khảo sát: Rút gọn để không bị lặp lại CS5 và ngày tháng dài lê thê
  const cleanBatchName = (() => {
    const raw = String(batchName || "")
    const match = raw.match(/Đợt\s*\d+/i)
    const dotStr = match ? match[0] : (studentDetail?.batch?.batchNumber ? `Đợt ${studentDetail.batch.batchNumber}` : raw)
    const dateMatch = raw.match(/\(([^)]+)\)/)
    const dateStr = dateMatch ? ` (${dateMatch[1]})` : ""
    return `${dotStr}${dateStr}` || raw
  })()

  // 4. Hình thức khảo sát
  const cleanSurveyMode = (() => {
    const mode = String(studentDetail?.surveySystem || "").toLowerCase()
    if (mode.includes("offline") || mode.includes("trực tiếp")) return "Trực tiếp tại trường (Offline)"
    if (mode.includes("online") || mode.includes("trực tuyến")) return "Trực tuyến (Online)"
    return "Trực tiếp tại trường"
  })()

  // 5. Bảng điểm / Học bạ
  const cleanTranscriptStatus = (() => {
    if (studentDetail?.kqgdTieuHoc) return studentDetail.kqgdTieuHoc
    if (studentDetail?.hocKy) return studentDetail.hocKy
    if (gradeGroupKey === "KHOI_1") return "Hồ sơ tuyển sinh Lớp 1 (Chưa có học bạ)"
    return "Đã tiếp nhận hồ sơ"
  })()

  // 6. Xếp loại & Rèn luyện
  const cleanAcademicRating = (() => {
    if (studentDetail?.academicRating) return studentDetail.academicRating
    if (studentDetail?.kqHocTap) return studentDetail.kqHocTap
    if (gradeGroupKey === "KHOI_1") return "Đạt chuẩn phát triển 5-6 tuổi"
    return "Hoàn thành tốt"
  })()

  const cleanConductRating = (() => {
    if (studentDetail?.conductRating) return studentDetail.conductRating
    if (studentDetail?.kqRenLuyen) return studentDetail.kqRenLuyen
    if (gradeGroupKey === "KHOI_1") return "Thích ứng tốt"
    return "Tốt"
  })()

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden font-sans">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-teal-950 via-teal-900 to-teal-950 text-white flex items-center justify-between border-b border-teal-800/60 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-200 shadow-xs">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-[10px] font-bold uppercase tracking-wider">
                  Phiếu Tiếp Nhận Đầu Vào
                </span>
                <span className="text-xs text-teal-200/90 font-medium">• Thời lượng khuyến nghị: 15-25 phút</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                  <span>Phiếu Định Hướng Đầu Vào:</span>
                  <span className="text-white font-black">{studentDetail?.fullName || student?.fullName}</span>
                </h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-teal-800/60 text-teal-100 text-[11px] font-semibold border border-teal-600/40">
                    Mã: {studentDetail?.studentCode || student?.studentCode || "—"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-teal-800/60 text-teal-100 text-[11px] font-semibold border border-teal-600/40">
                    Khối {studentDetail?.grade || student?.grade || "1"}
                  </span>
                  {(() => {
                    const prog = (studentDetail?.surveyFormType && !["online", "offline"].includes(studentDetail.surveyFormType.toLowerCase()))
                      ? studentDetail.surveyFormType
                      : (proposedEduSystem && !["online", "offline"].includes(proposedEduSystem.toLowerCase()))
                      ? proposedEduSystem
                      : (studentDetail?.surveySystem && !["online", "offline"].includes(studentDetail.surveySystem.toLowerCase()))
                      ? studentDetail.surveySystem
                      : "Chất lượng cao (CLC)";
                    return (
                      <span className="px-2.5 py-0.5 rounded-lg bg-teal-700/80 text-white text-[11px] font-semibold border border-teal-500/50">
                        {prog}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPsychModalOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                psychologyReferralStatus === "REQUESTED"
                  ? "bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/40"
                  : "bg-teal-600 hover:bg-teal-700 text-white border border-teal-400/40 hover:shadow-teal-500/20"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>{psychologyReferralStatus === "REQUESTED" ? "Đã Đề Xuất Tâm Lý" : "Khảo sát Tâm lý"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAdvisoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border border-amber-300/60 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20"
              title="Mở Trợ lý AI Admission: Nhận diện năng lực & Tổng hợp hồ sơ định hướng"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
              <span>Trợ lý AI Admission</span>
            </button>

            <button
              type="button"
              onClick={handleViewReport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-teal-100 hover:text-white border border-teal-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xem Báo cáo nhận diện (A4)</span>
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

        {/* QUICK GLANCE STRIP */}
        <div className="bg-teal-50/40 border-b border-teal-100 flex-shrink-0 transition-all">
              {/* Main Quick-Glance Bar */}
              <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-700">
                  
                  {/* Ngày sinh & Độ tuổi */}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="text-slate-500">Ngày sinh:</span>
                    <strong className="text-slate-900 font-bold">
                      {dobInfo.text}
                      {dobInfo.age !== null && (
                        <span className="text-teal-700 font-semibold ml-1">({dobInfo.age} tuổi)</span>
                      )}
                    </strong>
                  </div>

                  {/* Giới tính */}
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="text-slate-500">Giới tính:</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      String(gender).toLowerCase().includes("nữ")
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {gender}
                    </span>
                  </div>

                  {/* Khối & Hệ */}
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="text-slate-500">Khối / Hệ:</span>
                    <strong className="text-teal-900 font-bold">
                      Khối {studentDetail?.grade || student?.grade || "1"}
                      <span className="text-slate-400 mx-1">•</span>
                      {studentDetail?.surveyFormType || studentDetail?.surveySystem || "Song ngữ"}
                    </strong>
                  </div>

                  {/* Cơ sở */}
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="text-slate-500">Cơ sở:</span>
                    <strong className="text-teal-800 font-bold">{campusName}</strong>
                  </div>

                  {/* Trường cũ */}
                  <div className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="text-slate-500">Trường cũ:</span>
                    <span className="text-slate-800 font-semibold truncate max-w-[170px]" title={oldSchool}>
                      {oldSchool}
                    </span>
                  </div>

                  {/* PHHS liên hệ */}
                  {(contactPerson || contactPhoneNum) && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                      <span className="text-slate-500">PHHS:</span>
                      <span className="text-slate-900 font-bold">
                        {contactPerson || "Đại diện"}
                        {contactPhoneNum && (
                          <span className="text-emerald-700 font-medium ml-1">({contactPhoneNum})</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Controls: Tab 1 button & Nguyên tắc badge */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("tab1")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      activeTab === "tab1"
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                    }`}
                    title="Bấm để xem Tab 1: Dạng Bảng 17 Cột Thông Tin Tuyển Sinh"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Tab 1: Bảng 17 Cột</span>
                  </button>

                  <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Không chấm điểm số • Thấu hiểu & Hỗ trợ sớm</span>
                  </div>
                </div>
              </div>
            </div>

              {/* 3-TAB SWITCHER */}
        <div className="px-6 pt-3 pb-0 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* TAB 1 */}
            <button
              type="button"
              onClick={() => setActiveTab("tab1")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tab1"
                  ? "border-teal-600 text-teal-800 bg-teal-50/70 rounded-t-xl shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-teal-700 hover:bg-slate-50 rounded-t-xl"
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${activeTab === "tab1" ? "text-teal-600" : "text-slate-400"}`} />
              <span>Tab 1 – Thông tin Học sinh (Bảng 17 Cột)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "tab1" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                17 cột chuẩn
              </span>
            </button>

            {/* TAB 2 */}
            <button
              type="button"
              onClick={() => setActiveTab("tab2")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tab2"
                  ? "border-teal-600 text-teal-800 bg-teal-50/70 rounded-t-xl shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-teal-700 hover:bg-slate-50 rounded-t-xl"
              }`}
            >
              <UserCheck className={`w-4 h-4 ${activeTab === "tab2" ? "text-teal-600" : "text-slate-400"}`} />
              <span>Tab 2 – Phỏng vấn Học sinh</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "tab2" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {questions.length > 0 ? `${questions.length} câu hỏi` : "8 câu hỏi"}
              </span>
            </button>

            {/* TAB 3 */}
            <button
              type="button"
              onClick={() => setActiveTab("tab3")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "tab3"
                  ? "border-teal-600 text-teal-800 bg-teal-50/70 rounded-t-xl shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-teal-700 hover:bg-slate-50 rounded-t-xl"
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === "tab3" ? "text-teal-600" : "text-slate-400"}`} />
              <span>Tab 3 – Trao đổi Phụ huynh (PHHS)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === "tab3" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                Gia đình & Nhà trường
              </span>
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-bold text-slate-500">Đang chuẩn bị phiếu định hướng cho học sinh...</p>
            </div>
          
          ) : activeTab === "tab1" ? (
            /* TAB 1: THÔNG TIN HỌC SINH - ĐK TUYỂN SINH */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Header card giới thiệu Tab 1 */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold uppercase">
                        Hồ sơ tuyển sinh & Khảo sát đầu vào
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">• Dạng Bảng 17 Cột chuẩn hóa</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight mt-0.5">
                      Dạng Bảng 17 Cột Thông Tin Nghiệp Vụ
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Mã hồ sơ: <strong className="text-slate-900 font-bold">{studentDetail?.studentCode || student?.studentCode || "—"}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tab2")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ml-1"
                  >
                    <span>Sang Tab 2: Phỏng vấn HS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* BẢNG 17 MỤC TIÊU CHUẨN (CUỘN NGANG) - ĐÃ LÀM SẠCH KHÔNG TRÙNG LẶP */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto bg-white shadow-2xs">
                <div className="p-3 bg-teal-50/50 border-b border-teal-100 flex items-center justify-between text-xs sticky left-0">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-700" />
                    Dạng Bảng 17 Cột thông tin nghiệp vụ (Cuộn ngang để xem đầy đủ từ Cột 1 đến Cột 17)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Thứ tự chuẩn hóa: <strong className="text-teal-800">Cột 1 đến Cột 17</strong>
                  </span>
                </div>
                <table className="min-w-[1360px] w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-[11px] font-black uppercase text-slate-700 border-b border-slate-200 divide-x divide-slate-200">
                      <th className="p-2.5 min-w-[200px] sticky left-0 bg-slate-100 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">1. Thông tin Học sinh</th>
                      <th className="p-2.5 min-w-[150px]">2. Đợt khảo sát</th>
                      <th className="p-2.5 min-w-[90px] text-center">3. Khối ĐK</th>
                      <th className="p-2.5 min-w-[140px]">4. Hệ Khảo sát</th>
                      <th className="p-2.5 min-w-[110px]">5. Diện tuyển sinh</th>
                      <th className="p-2.5 min-w-[120px]">6. Hình thức KS</th>
                      <th className="p-2.5 min-w-[150px]">7. Chương trình học tập</th>
                      <th className="p-2.5 min-w-[140px]">8. Tên trường học cũ</th>
                      <th className="p-2.5 min-w-[150px]">9. Tỉnh / TP / Quốc gia</th>
                      <th className="p-2.5 min-w-[110px]">10. Hệ học trước</th>
                      <th className="p-2.5 min-w-[130px]">11. Bảng điểm/Học bạ</th>
                      <th className="p-2.5 min-w-[110px]">12. KQ Xếp loại</th>
                      <th className="p-2.5 min-w-[110px]">13. KQ Rèn luyện</th>
                      <th className="p-2.5 min-w-[120px] text-center bg-teal-50/40" title="Điểm tổng kết môn Toán trong học bạ năm học trước">14. Toán (Học bạ)</th>
                      <th className="p-2.5 min-w-[130px] text-center bg-teal-50/40" title="Điểm tổng kết môn Ngữ Văn/Tiếng Việt trong học bạ năm học trước">15. Ngữ Văn (Học bạ)</th>
                      <th className="p-2.5 min-w-[140px] text-center bg-teal-50/40" title="Điểm môn Tiếng Anh trong học bạ năm học trước">16. Tiếng Anh (Học bạ)</th>
                      <th className="p-2.5 min-w-[140px] bg-teal-50/40" title="Các môn học khác trong học bạ">17. Các môn khác (Học bạ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr className="divide-x divide-slate-200 hover:bg-slate-50/80 transition-colors group">
                      {/* 1. Thông tin Học sinh */}
                      <td className="p-2.5 align-top sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-slate-50">
                        <strong className="text-slate-900 block font-bold text-sm">
                          {studentDetail?.fullName || student?.fullName}
                        </strong>
                        <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                          <div>Mã: <span className="font-semibold text-slate-700">{studentDetail?.studentCode || student?.studentCode || "—"}</span></div>
                          <div>NS: <span className="font-semibold text-slate-700">{dobInfo.text}</span> {dobInfo.age !== null ? `(${dobInfo.age}t)` : ""}</div>
                          <div>Phái: <span className="font-semibold text-slate-700">{gender}</span></div>
                        </div>
                      </td>

                      {/* 2. Đợt khảo sát */}
                      <td className="p-2.5 align-top font-semibold text-slate-800">
                        <div>{cleanBatchName}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{periodName}</div>
                      </td>

                      {/* 3. Khối ĐK */}
                      <td className="p-2.5 align-top text-center">
                        <span className="inline-block px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold">
                          Khối {studentDetail?.grade || student?.grade || "1"}
                        </span>
                      </td>

                      {/* 4. Hệ Khảo sát */}
                      <td className="p-2.5 align-top font-semibold text-teal-950">
                        {formattedEduSystem}
                      </td>

                      {/* 5. Diện KS */}
                      <td className="p-2.5 align-top font-medium text-slate-800">
                        {studentDetail?.admissionCriteria || studentDetail?.targetType || "Khảo sát đầu vào"}
                      </td>

                      {/* 6. Hình thức KS */}
                      <td className="p-2.5 align-top font-medium text-slate-800">
                        {cleanSurveyMode}
                      </td>

                      {/* 7. Chương trình học tập */}
                      <td className="p-2.5 align-top font-medium text-slate-800">
                        {formattedCurriculum}
                      </td>

                      {/* 8. Tên trường học cũ */}
                      <td className="p-2.5 align-top font-semibold text-slate-800">
                        {oldSchool}
                      </td>

                      {/* 9. Tỉnh / Thành phố / Quốc gia */}
                      <td className="p-2.5 align-top text-slate-700 font-medium">
                        {[studentDetail?.wardName, studentDetail?.districtName, studentDetail?.cityName, studentDetail?.countryName].filter(Boolean).join(", ") || "Chưa cập nhật"}
                      </td>

                      {/* 10. Hệ học trước */}
                      <td className="p-2.5 align-top text-slate-700 font-medium">
                        {studentDetail?.oldSchoolType || "Mầm non / Công lập"}
                      </td>

                      {/* 11. Bảng điểm/Học bạ */}
                      <td className="p-2.5 align-top text-slate-700 font-medium">
                        {cleanTranscriptStatus}
                      </td>

                      {/* 12. KQ Xếp loại */}
                      <td className="p-2.5 align-top">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                          {cleanAcademicRating}
                        </span>
                      </td>

                      {/* 13. KQ Rèn luyện */}
                      <td className="p-2.5 align-top">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[11px]">
                          {cleanConductRating}
                        </span>
                      </td>

                      {/* 14. Điểm Môn Toán trong học bạ */}
                      <td className="p-2.5 align-top text-center bg-teal-50/20">
                        {mathVal ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-white text-teal-900 border border-teal-300 font-bold text-xs">
                            {mathVal}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">{gradeGroupKey === "KHOI_1" ? "— (Mầm non)" : "—"}</span>
                        )}
                      </td>

                      {/* 15. Điểm Môn Ngữ Văn trong học bạ */}
                      <td className="p-2.5 align-top text-center bg-teal-50/20">
                        {litVal ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-white text-teal-900 border border-teal-300 font-bold text-xs">
                            {litVal}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">{gradeGroupKey === "KHOI_1" ? "— (Mầm non)" : "—"}</span>
                        )}
                      </td>

                      {/* 16. Điểm Tiếng Anh trong học bạ */}
                      <td className="p-2.5 align-top text-center bg-teal-50/20">
                        {engVal ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 font-bold text-[11px]">
                            {engVal}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">{gradeGroupKey === "KHOI_1" ? "— (Mầm non)" : "—"}</span>
                        )}
                      </td>

                      {/* 17. Các môn khác trong học bạ */}
                      <td className="p-2.5 align-top bg-teal-50/20 text-slate-800 font-semibold text-[11px]">
                        {otherScoresVal || (gradeGroupKey === "KHOI_1" ? <span className="text-slate-400 italic">— (Mầm non)</span> : "—")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Hiển thị điểm khảo sát thực tế tại Sky-Line nếu có */}
              {surveyScoresList.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-teal-200 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-teal-600" />
                    Kết quả khảo sát năng lực Sky-Line:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {surveyScoresList.map((sc, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-950 font-bold text-xs">
                        {sc.name}: <span className="text-teal-700">{sc.score}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Điều hướng chuyển bước */}
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("tab2")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <span>Tiếp tục: Tab 2 – Phỏng vấn Học sinh</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : activeTab === "tab2" ? (
            /* TAB 2: PHỎNG VẤN HỌC SINH */
            <div className="space-y-6">
              
              {/* DANH SÁCH 04 TIÊU CHÍ ĐỊNH HƯỚNG THEO NHÓM KHỐI */}

              <div className="space-y-4">
                {/* Header card tiêu chí nhóm khối */}
                <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-indigo-900 p-4.5 rounded-2xl text-white shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/40 text-[10px] font-black uppercase tracking-wider">
                        {groupConfig.label} • {groupConfig.subLabel}
                      </span>
                      <span className="text-[11px] text-teal-200 font-medium">
                        Phiên bản bộ tiêu chí: {ORIENTATION_CRITERIA_VERSION}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white tracking-tight mt-1 flex items-center gap-2">
                      <MessageSquareQuote className="w-4 h-4 text-teal-300" />
                      <span>Bộ Tiêu Chí Phỏng Vấn Định Hướng Học Sinh ({questions.length > 0 ? questions.length : 8} câu hỏi chuẩn)</span>
                    </h3>
                    <p className="text-xs text-teal-100/80 mt-0.5">
                      Đánh giá theo 04 mức định tính • Kèm câu hỏi gợi mở cho GV • Ô nhận xét riêng cho từng tiêu chí
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-200 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-xl flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                      <span>Bắt buộc nhận xét khi chọn &quot;Cần hỗ trợ&quot; hoặc &quot;Lưu ý thêm&quot;</span>
                    </span>
                  </div>
                </div>

                {/* Danh sách từng tiêu chí */}
                <div className="space-y-4">
                  {(questions || []).map((q: any, idx: number) => {
                    const ans = (answers && answers[q.id]) || { rating: "NORMAL", notes: "", teacherComment: "" }
                    const isMandatory = isCommentMandatory(ans.rating)
                    const hasError = validationErrors[q.id]
                    const qHints: string[] = q.suggestedQuestions || []
                    const isHintOpen = openHints[q.id] ?? false

                    return (
                      <div
                        key={q.id || idx}
                        className={`bg-white p-5 rounded-2xl border shadow-xs space-y-4 transition-all ${
                          hasError
                            ? "border-rose-400 ring-2 ring-rose-200 bg-rose-50/10"
                            : isMandatory
                            ? "border-amber-200 bg-amber-50/15"
                            : "border-slate-200 hover:border-teal-200"
                        }`}
                      >
                        {/* Hàng 1: STT, Tên tiêu chí, Mức độ đánh giá */}
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white text-xs font-black inline-flex items-center justify-center shadow-xs">
                                {idx + 1}
                              </span>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                {q.questionText || q.name}
                              </h4>
                              {q.categoryLabel && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                  {q.categoryLabel}
                                </span>
                              )}
                            </div>

                            {q.suggestedGuideline && (
                              <p className="text-xs text-slate-500 italic pl-8">
                                <span className="font-semibold text-slate-700 not-italic">Gợi ý quan sát:</span> {q.suggestedGuideline}
                              </p>
                            )}

                            {/* Nhóm nút công cụ phỏng vấn: Câu hỏi gợi mở & Trợ lý AI */}
                            <div className="pl-8 pt-1 flex flex-wrap items-center gap-2">
                              {qHints.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleHint(q.id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all cursor-pointer"
                                >
                                  <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>
                                    {isHintOpen ? "Ẩn câu hỏi gợi mở" : `💡 Xem câu hỏi gợi mở cho GV (${qHints.length} câu)`}
                                  </span>
                                  {isHintOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}

                              {/* Nút bấm AI gợi ý câu hỏi phỏng vấn theo nhóm khối */}
                              <button
                                type="button"
                                onClick={() => handleAiSuggestQuestions(q)}
                                disabled={aiQuestionLoading[q.id]}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Sparkles className={`w-3.5 h-3.5 text-violet-600 ${aiQuestionLoading[q.id] ? "animate-spin" : ""}`} />
                                <span>
                                  {aiQuestionLoading[q.id]
                                    ? "AI đang tạo câu hỏi..."
                                    : openAiQuestions[q.id]
                                    ? "✨ Đóng gợi ý AI"
                                    : "✨ AI gợi ý câu hỏi (3 câu)"}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* 4 Mức độ nhận diện định tính */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-shrink-0 lg:w-[480px]">
                            {ORIENTATION_RATING_OPTIONS.map(opt => {
                              const isSelected = ans.rating === opt.code
                              return (
                                <button
                                  key={opt.code}
                                  type="button"
                                  onClick={() => handleRatingChange(q.id, opt.code)}
                                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? `${opt.activeClass} font-bold`
                                      : "bg-white text-slate-600 border-slate-200 hover:border-teal-300 hover:text-teal-900 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="text-[11px] font-bold block leading-tight">{opt.label}</span>
                                  <span className={`text-[9.5px] block mt-0.5 ${isSelected ? "text-white/90" : "text-slate-400"}`}>
                                    {opt.badgeLabel}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Accordion hiển thị câu hỏi gợi mở thủ công */}
                        {isHintOpen && qHints.length > 0 && (
                          <div className="ml-8 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                              <HelpCircle className="w-4 h-4 text-indigo-600" />
                              <span>Câu hỏi gợi mở khuyến nghị khi phỏng vấn ({groupConfig.label}):</span>
                            </div>
                            <ul className="space-y-1.5 text-xs text-indigo-950 font-medium pl-5 list-disc">
                              {qHints.map((hint, hIdx) => (
                                <li key={hIdx} className="leading-relaxed">
                                  {hint}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Accordion hiển thị câu hỏi gợi ý từ SKY-LINE AI INTERVIEW ASSISTANT */}
                        {openAiQuestions[q.id] && (
                          <div className="ml-8 p-3.5 bg-gradient-to-r from-violet-50/90 to-indigo-50/80 border border-violet-200 rounded-xl space-y-2.5 animate-in fade-in duration-150 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-black text-violet-950">
                                <Sparkles className="w-4 h-4 text-violet-600" />
                                <span>Gợi ý câu hỏi phỏng vấn theo nhóm khối ({groupConfig.label}) - Sky-Line AI:</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setOpenAiQuestions(prev => ({ ...prev, [q.id]: false }))}
                                className="text-[11px] font-bold text-violet-600 hover:text-violet-800 cursor-pointer"
                              >
                                Đóng
                              </button>
                            </div>

                            {Array.isArray(aiSuggestedQuestions[q.id]) && aiSuggestedQuestions[q.id].length > 0 ? (
                              <div className="space-y-2">
                                {aiSuggestedQuestions[q.id].map((sq, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 bg-white/90 rounded-lg border border-violet-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                                  >
                                    <div className="space-y-0.5 flex-1">
                                      <p className="text-xs font-bold text-slate-800">
                                        {sIdx + 1}. &quot;{sq.question}&quot;
                                      </p>
                                      {sq.purpose && (
                                        <p className="text-[10.5px] text-violet-700 italic">
                                          🎯 Mục đích sư phạm: {sq.purpose}
                                        </p>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = (ans.teacherComment || ans.notes || "").trim()
                                        const newComment = current ? `${current}\n- Hỏi: ${sq.question}` : `- Hỏi: ${sq.question}`
                                        handleNotesChange(q.id, newComment)
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-violet-100 hover:bg-violet-200 text-violet-900 text-[10.5px] font-bold flex-shrink-0 cursor-pointer transition-all"
                                    >
                                      <Copy className="w-3 h-3 text-violet-700" />
                                      <span>Lưu vào nhận xét</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic">
                                Nhấn nút &quot;AI gợi ý câu hỏi&quot; để trợ lý AI tạo các câu hỏi phù hợp cho học sinh này.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Ô nhận xét riêng của Giáo viên cho tiêu chí này */}
                        <div className="pt-2 pl-0 sm:pl-8 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <MessageSquareQuote className="w-3.5 h-3.5 text-teal-600" />
                              <span>Nhận xét chi tiết của Giáo viên cho tiêu chí này:</span>
                            </label>

                            <div className="flex items-center gap-2">
                              {/* NÚT AI HỖ TRỢ NHẬN XÉT */}
                              <button
                                type="button"
                                onClick={() => handleAiDraftComment(q)}
                                disabled={aiCommentLoading[q.id]}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Sparkles className={`w-3 h-3 text-violet-600 ${aiCommentLoading[q.id] ? "animate-spin" : ""}`} />
                                <span>{aiCommentLoading[q.id] ? "AI đang soạn..." : "🤖 AI hỗ trợ nhận xét"}</span>
                              </button>

                              {isMandatory ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  * Bắt buộc ghi nhận xét lý do &amp; biểu hiện
                                </span>
                              ) : (
                                <span className="text-[10.5px] text-slate-400">
                                  (Tùy chọn ghi chú phản xạ / câu trả lời của học sinh)
                                </span>
                              )}
                            </div>
                          </div>

                          <textarea
                            rows={2}
                            value={ans.teacherComment || ans.notes || ""}
                            onChange={(e) => handleNotesChange(q.id, e.target.value)}
                            placeholder={
                              isMandatory
                                ? `BẮT BUỘC: Ghi rõ biểu hiện cụ thể hoặc nguyên nhân học sinh cần hỗ trợ / cần lưu ý ở tiêu chí "${q.questionText || q.name}"...`
                                : `Ghi chú nhanh câu trả lời, phản xạ hoặc thái độ quan sát được của học sinh ở tiêu chí này...`
                            }
                            className={`w-full p-3 rounded-xl text-xs font-medium outline-none transition-all resize-none ${
                              hasError
                                ? "bg-rose-50/50 border-2 border-rose-500 text-rose-900 focus:ring-2 focus:ring-rose-200"
                                : isMandatory
                                ? "bg-amber-50/40 border border-amber-300 text-slate-900 focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-400/20"
                                : "bg-slate-50 border border-slate-200 text-slate-800 focus:border-teal-500 focus:bg-white"
                            }`}
                          />

                          {/* KHU VỰC DỰ THẢO NHẬN XÉT CỦA AI (KHÔNG GHI ĐÈ TỰ ĐỘNG - CHỜ GV DUYỆT) */}
                          {showAiDraftBox[q.id] && aiDraftComments[q.id] && (
                            <div className="p-3 bg-violet-50/80 border border-violet-300/80 rounded-xl space-y-2 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-violet-950 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                                  <span>Dự thảo nhận xét do AI đề xuất (Chưa áp dụng vào hồ sơ chính thức):</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleApplyAiComment(q.id)}
                                    className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Áp dụng vào nhận xét</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowAiDraftBox(prev => ({ ...prev, [q.id]: false }))}
                                    className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                                  >
                                    Bỏ qua
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-violet-950 font-medium leading-relaxed italic bg-white/80 p-2.5 rounded-lg border border-violet-100">
                                &quot;{aiDraftComments[q.id]}&quot;
                              </p>
                              <p className="text-[10px] text-slate-500">
                                💡 Nhận xét AI chỉ mang tính chất dự thảo. Giáo viên toàn quyền chỉnh sửa và xác nhận trước khi lưu chính thức vào hồ sơ SSM.
                              </p>
                            </div>
                          )}

                          {hasError && (
                            <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Vui lòng nhập nhận xét bắt buộc cho tiêu chí này trước khi lưu.</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* TỔNG HỢP NHẬN XÉT: 03 TRƯỜNG ĐỘC LẬP THEO QUY CHUẨN */}
              <div className="bg-white p-5.5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Tổng hợp Nhận xét &amp; Đánh giá của Giáo viên Tiếp nhận (03 Trường)
                    </h3>
                    <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Chuẩn hóa thông tin bàn giao
                    </span>
                  </div>

                  {/* NÚT AI TỔNG HỢP HỒ SƠ ĐỊNH HƯỚNG */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAiSynthesizeSummary}
                      disabled={aiSummaryLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm cursor-pointer transition-all disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${aiSummaryLoading ? "animate-spin" : ""}`} />
                      <span>{aiSummaryLoading ? "AI đang tổng hợp hồ sơ..." : "✨ AI Tổng hợp hồ sơ định hướng"}</span>
                    </button>
                  </div>
                </div>

                {/* BẢN DỰ THẢO 5 CHIỀU TỪ SKY-LINE AI ADMISSION (NẾU ĐÃ TẠO) */}
                {showAiSummaryDrawer && aiSummaryData && (
                  <div className="p-4.5 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/60 rounded-2xl border-2 border-violet-200 space-y-4 animate-in fade-in duration-200 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-violet-200/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-violet-950 uppercase tracking-wide flex items-center gap-1.5">
                            <span>Dự thảo Định Hướng Đầu Vào (Sky-Line AI Admission)</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                              5 Nhóm Tiêu Chuẩn
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Dữ liệu tổng hợp từ: Hồ sơ SSM • Học bạ • Phỏng vấn học sinh • Trao đổi PHHS • Kết quả khảo sát
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyAiSummary()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Áp dụng toàn bộ vào 03 ô bên dưới</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAiSummaryDrawer(false)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
                        >
                          Đóng xem lại
                        </button>
                      </div>
                    </div>

                    {/* 5 Khối nội dung chuẩn hóa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* 1. Điểm mạnh */}
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-black text-emerald-800 uppercase flex items-center gap-1.5">
                          <span>🌟 1. Điểm mạnh nổi bật</span>
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {aiSummaryData.diemManhNoiBat}
                        </p>
                      </div>

                      {/* 2. Cần phát triển */}
                      <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-black text-amber-800 uppercase flex items-center gap-1.5">
                          <span>🎯 2. Nội dung cần tiếp tục phát triển</span>
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {aiSummaryData.noiDungCanPhatTrien}
                        </p>
                      </div>

                      {/* 3. Khả năng thích nghi */}
                      <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-black text-blue-800 uppercase flex items-center gap-1.5">
                          <span>🌱 3. Khả năng thích nghi &amp; Tâm thế học tập</span>
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {aiSummaryData.khaNangThichNghi}
                        </p>
                      </div>

                      {/* 4. Đề xuất hỗ trợ */}
                      <div className="p-3 bg-white rounded-xl border border-indigo-200 space-y-1 shadow-2xs">
                        <span className="text-[11px] font-black text-indigo-800 uppercase flex items-center gap-1.5">
                          <span>🤝 4. Đề xuất hỗ trợ ban đầu (4 tuần đầu)</span>
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {aiSummaryData.deXuatHoTroBanDau}
                        </p>
                      </div>
                    </div>

                    {/* 5. Nội dung cần xác minh & Khuyến nghị hệ học */}
                    <div className="p-3 bg-white rounded-xl border border-violet-200 flex flex-col sm:flex-row items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 flex-1">
                        <span className="text-[11px] font-black text-rose-800 uppercase flex items-center gap-1.5">
                          <span>🔍 5. Nội dung cần tiếp tục xác minh</span>
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {aiSummaryData.noiDungCanXacMinh || "Hồ sơ đầy đủ, không có ghi nhận bất thường cần thẩm tra bổ sung."}
                        </p>
                      </div>

                      {(aiSummaryData.khuyenNghiXepLop || aiSummaryData.heHocDeXuat) && (
                        <div className="p-2.5 bg-violet-50 rounded-lg border border-violet-200 flex-shrink-0 text-right sm:max-w-xs">
                          <span className="text-[10px] font-black text-violet-900 uppercase block">
                            Khuyến nghị xếp lớp &amp; Hệ học
                          </span>
                          <span className="text-xs font-bold text-violet-950 block mt-0.5">
                            {aiSummaryData.khuyenNghiXepLop} {aiSummaryData.heHocDeXuat ? `• ${aiSummaryData.heHocDeXuat}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[10.5px] text-slate-500 italic text-center">
                      ⚠️ Lưu ý nguyên tắc: AI hỗ trợ tổng hợp thông tin, không tự động quyết định đạt/không đạt tuyển sinh. Giáo viên toàn quyền rà soát và xác nhận dữ liệu.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Trường 1: Điểm mạnh */}
                  <div className="space-y-1.5 p-3.5 bg-emerald-50/30 rounded-xl border border-emerald-200/80">
                    <label className="block text-[11px] font-black text-emerald-900 uppercase">
                      1. Điểm mạnh &amp; Năng khiếu nổi trội
                    </label>
                    <textarea
                      rows={4}
                      value={studentStrengths}
                      onChange={(e) => setStudentStrengths(e.target.value)}
                      placeholder="Ghi nhận các thế mạnh: Giao tiếp lễ phép, trí nhớ thị giác tốt, năng khiếu toán/ngôn ngữ, say mê đọc sách hoặc vẽ tranh..."
                      className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 resize-none shadow-2xs"
                    />
                  </div>

                  {/* Trường 2: Nội dung cần hỗ trợ */}
                  <div className="space-y-1.5 p-3.5 bg-amber-50/30 rounded-xl border border-amber-200/80">
                    <label className="block text-[11px] font-black text-amber-900 uppercase">
                      2. Nội dung cần hỗ trợ sớm khi nhập học
                    </label>
                    <textarea
                      rows={4}
                      value={studentNeedsSupport}
                      onChange={(e) => setStudentNeedsSupport(e.target.value)}
                      placeholder="Ghi nhận các nội dung cần hỗ trợ: Rèn sự tập trung, hỗ trợ ngữ âm tiếng Anh, hướng dẫn kỹ năng kết bạn hoặc nề nếp ngồi học..."
                      className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 resize-none shadow-2xs"
                    />
                  </div>

                  {/* Trường 3: Đề xuất định hướng tiếp nhận */}
                  <div className="space-y-1.5 p-3.5 bg-indigo-50/30 rounded-xl border border-indigo-200/80">
                    <label className="block text-[11px] font-black text-indigo-900 uppercase">
                      3. Đề xuất định hướng tiếp nhận &amp; phân lớp
                    </label>
                    <textarea
                      rows={4}
                      value={proposedPlacementRecommendation}
                      onChange={(e) => setProposedPlacementRecommendation(e.target.value)}
                      placeholder="Đề xuất của GV: Tiếp nhận vào hệ Chất lượng cao / Song ngữ; xếp bạn cùng bàn kèm cặp; thông báo GVCN theo dõi sát tuần đầu..."
                      className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none shadow-2xs"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-1/2 pt-1">
                  <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                    Họ và tên Giáo viên / Cán bộ phỏng vấn
                  </label>
                  <input
                    type="text"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    placeholder="Ví dụ: Cô Nguyễn Thị Mai (GVCN Khối Tiểu học)"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:bg-white"
                  />
                </div>
              </div>

              {/* KHU VỰC THẨM ĐỊNH CỦA QUẢN LÝ CHUYÊN MÔN CƠ SỞ (QLCM) & LIÊN THÔNG */}
              <div className="bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-5.5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Thẩm định của Quản lý Chuyên môn Cơ sở (QLCM) &amp; Liên thông Dữ liệu
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        QLCM cơ sở kiểm tra tính đầy đủ của nhận xét và xác nhận liên thông sang Hồ sơ học sinh
                      </p>
                    </div>
                  </div>

                  {/* Trạng thái thẩm định badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                    verificationStatus === "VERIFIED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : verificationStatus === "REJECTED"
                      ? "bg-rose-50 text-rose-800 border-rose-300"
                      : "bg-amber-50 text-amber-800 border-amber-300"
                  }`}>
                    {verificationStatus === "VERIFIED" ? "✓ Đã thẩm định" : verificationStatus === "REJECTED" ? "✕ Cần bổ sung nhận xét" : "⏳ Chờ thẩm định"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5">
                      Trạng thái thẩm định
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { code: "PENDING", label: "Chờ xét", cls: "border-amber-300 text-amber-900 bg-amber-50" },
                        { code: "VERIFIED", label: "Đạt chuẩn", cls: "border-emerald-300 text-emerald-900 bg-emerald-50" },
                        { code: "REJECTED", label: "Cần bổ sung", cls: "border-rose-300 text-rose-900 bg-rose-50" }
                      ].map(st => (
                        <button
                          key={st.code}
                          type="button"
                          onClick={() => setVerificationStatus(st.code as any)}
                          className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            verificationStatus === st.code
                              ? `${st.cls} ring-2 ring-indigo-400 font-black shadow-xs`
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5">
                      Người thẩm định (QLCM / BGH Cơ sở)
                    </label>
                    <input
                      type="text"
                      value={verifierName}
                      onChange={(e) => setVerifierName(e.target.value)}
                      placeholder="Ví dụ: Thầy Trần Văn Bình (QLCM CS1)"
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase mb-1.5">
                      Ý kiến / Ghi chú thẩm định
                    </label>
                    <input
                      type="text"
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="Nhận xét của QLCM đối với kết quả phỏng vấn..."
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Checkbox liên thông hồ sơ */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={supportReferralConfirmed}
                      onChange={(e) => setSupportReferralConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Đồng ý liên thông các nội dung cần hỗ trợ đã xác nhận sang Hồ sơ học tập sau nhập học
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Không tự động chẩn đoán tâm lý • Không tự động quyết định tuyển sinh</span>
                  </div>
                </div>
              </div>


              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("tab1")}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại Tab 1: Thông tin Học sinh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("tab3")}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <span>Tiếp tục: Tab 3 – Trao đổi PHHS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ) : (
            /* TAB 3: TRAO ĐỔI PHỤ HUYNH HỌC SINH (PHHS) */
            <div className="space-y-5 animate-in fade-in">
              {/* THÔNG TIN NGƯỜI ĐẠI DIỆN GIA ĐÌNH */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-black text-teal-950 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span>Thông tin Người đại diện gia đình trao đổi</span>
                  </h3>
                  <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-bold">
                    {currentPrompts.groupLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">
                      Họ tên Phụ huynh (Cha / Mẹ / Giám hộ)
                    </label>
                    <input
                      type="text"
                      value={parentRepresentativeName}
                      onChange={(e) => setParentRepresentativeName(e.target.value)}
                      placeholder="Ví dụ: Ông Lê Văn Nam (Bố)"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="0905 xxx xxx"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* NHÓM 1: NGUYỆN VỌNG & KỲ VỌNG */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>{currentPrompts?.group1_expectations?.title || "1. Nguyện vọng & Kỳ vọng của PHHS"}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                    Nhóm 1
                  </span>
                </div>

                {/* Gợi ý câu hỏi khi trò chuyện */}
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 text-[11px] text-teal-950 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-teal-950">
                    <span>💡 Gợi ý câu hỏi khi trò chuyện với PHHS:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 font-medium text-teal-900/90 leading-relaxed">
                    {(currentPrompts?.group1_expectations?.hints || []).map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={parentExpectations}
                    onChange={(e) => setParentExpectations(e.target.value)}
                    placeholder={currentPrompts?.group1_expectations?.placeholder || "Nhập nguyện vọng & kỳ vọng của gia đình..."}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:bg-white resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* NHÓM 2: ĐẶC ĐIỂM CÁ NHÂN, SỞ THÍCH & THÓI QUEN */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Smile className="w-4 h-4 text-teal-600" />
                    <span>{currentPrompts?.group2_personality?.title || "2. Đặc điểm cá nhân, sở thích & thói quen"}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                    Nhóm 2
                  </span>
                </div>

                {/* Gợi ý câu hỏi khi trò chuyện */}
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 text-[11px] text-teal-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-teal-950">
                    <span>💡 Gợi ý câu hỏi khi trò chuyện với PHHS:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 font-medium text-teal-900/90 leading-relaxed">
                    {(currentPrompts?.group2_personality?.hints || []).map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={parentPersonalityNotes}
                    onChange={(e) => setParentPersonalityNotes(e.target.value)}
                    placeholder={currentPrompts?.group2_personality?.placeholder || "Nhập đặc điểm cá nhân, sở thích của học sinh..."}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:bg-white resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* NHÓM 3: NHU CẦU HỖ TRỢ VÀ ĐỀ XUẤT TỪ PHHS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-sky-600" />
                    <span>{currentPrompts?.group3_support?.title || "3. Nhu cầu hỗ trợ & đề xuất từ PHHS"}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                    Nhóm 3
                  </span>
                </div>

                {/* Gợi ý câu hỏi khi trò chuyện */}
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 text-[11px] text-teal-950 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-teal-950">
                    <span>💡 Gợi ý câu hỏi khi trò chuyện với PHHS:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 font-medium text-teal-900/90 leading-relaxed">
                    {(currentPrompts?.group3_support?.hints || []).map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={parentSpecialRequests}
                    onChange={(e) => setParentSpecialRequests(e.target.value)}
                    placeholder={currentPrompts?.group3_support?.placeholder || "Nhập nhu cầu hỗ trợ từ gia đình..."}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:bg-white resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* NHÓM 4: NỘI DUNG PHỐI HỢP GIÁO DỤC GIỮA GIA ĐÌNH VÀ NHÀ TRƯỜNG */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>{currentPrompts?.group4_cooperation?.title || "4. Nội dung phối hợp giáo dục giữa gia đình và nhà trường"}</span>
                  </h3>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                    Nhóm 4
                  </span>
                </div>

                {/* Gợi ý câu hỏi khi trò chuyện */}
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 text-[11px] text-teal-950 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-teal-950">
                    <span>💡 Gợi ý câu hỏi khi trò chuyện với PHHS:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1 font-medium text-teal-900/90 leading-relaxed">
                    {(currentPrompts?.group4_cooperation?.hints || []).map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={cooperationCommitment}
                    onChange={(e) => setCooperationCommitment(e.target.value)}
                    placeholder={currentPrompts?.group4_cooperation?.placeholder || "Nhập cam kết phối hợp giáo dục..."}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 focus:bg-white resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* PHẦN V: QUY TRÌNH TIẾP NHẬN & CHỈ ĐẠO CỦA GIÁM ĐỐC CƠ SỞ (GĐCS) */}
              <div className="bg-white p-5 md:p-6 rounded-3xl border-2 border-teal-300 shadow-sm space-y-6">
                
                {/* TIÊU ĐỀ CHÍNH KHỐI V */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-teal-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      V
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-teal-950 flex items-center gap-2">
                        <span>Kết Luận & Định Hướng Tiếp Nhận</span>
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-300 px-2.5 py-0.5 rounded-full uppercase">
                          Dành Cho Giám Đốc Cơ Sở (GĐCS)
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Quy trình theo trình tự: 1. Kết quả Tâm lý &rarr; 2. Phương án xử lý GĐCS &rarr; 3. Cập nhật khảo sát các môn &rarr; 4. Xét duyệt tiếp nhận của GĐCS
                      </p>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* BƯỚC 1: KẾT QUẢ ĐÁNH GIÁ TÂM LÝ CHI TIẾT (BÁO CÁO TỪ GV TÂM LÝ -> GĐCS) */}
                {/* ========================================================= */}
                <div className="p-4 bg-amber-50/70 rounded-2xl border-2 border-amber-300 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          1. Kết Quả Đánh Giá Tâm Lý Chi Tiết (Báo Cáo Giáo Viên Tâm Lý &rarr; GĐCS)
                        </h4>
                        <p className="text-[11px] text-amber-800">
                          Kết quả sàng lọc tâm lý do Giáo viên Tâm lý thực hiện và báo cáo đến Giám Đốc Cơ Sở
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setIsPsychModalOpen(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>{psychologyReferralStatus === "COMPLETED" ? "Xem Lại Bài Đánh Giá" : "Chi Tiết Đề Xuất Tâm Lý"}</span>
                    </button>
                  </div>

                  {/* THẺ THÔNG TIN ĐÃ GỬI EMAIL CHO GĐCS (NẾU ĐÃ GỬI) */}
                  {psychologyData?.reportedToGdcs ? (
                    <div className="p-3 bg-white/95 rounded-xl border border-emerald-300 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-emerald-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Đã gửi Email báo cáo kết quả Tâm lý đến GĐCS: <strong>{psychologyData.reportedToGdcs.gdcsName}</strong>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          {psychologyData.reportedToGdcs.reportedAt ? new Date(psychologyData.reportedToGdcs.reportedAt).toLocaleString("vi-VN") : "Đã gửi email"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 pl-5 space-y-0.5">
                        <div>Email nhận: <span className="font-semibold text-slate-800">{psychologyData.reportedToGdcs.gdcsEmail}</span> • Người gửi: <span className="font-semibold text-slate-800">{psychologyData.reportedToGdcs.reportedBy || "Giáo viên Tâm lý"}</span> • Cơ sở: <span className="font-semibold text-slate-800">{psychologyData.reportedToGdcs.campusCode || campusName}</span></div>
                        {psychologyData.reportedToGdcs.messageToGdcs && (
                          <div className="text-amber-950 bg-amber-50/90 p-2 rounded-lg border border-amber-200 mt-1 italic font-medium">
                            Nội dung đề xuất gửi GĐCS: &quot;{psychologyData.reportedToGdcs.messageToGdcs}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                      <span>Trạng thái: <strong>{psychologyReferralStatus === "REQUESTED" ? "Đã gửi yêu cầu đánh giá tâm lý" : "Ghi nhận đánh giá tâm lý đầu vào"}</strong></span>
                      <span className="text-slate-500 italic">Chưa gửi email báo cáo GĐCS từ form GV Tâm lý</span>
                    </div>
                  )}

                  {/* THÔNG TIN TỔNG QUAN ĐIỂM SỐ & MỨC ĐỘ */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">GV Tâm lý phụ trách:</span>
                      <strong className="text-slate-900 text-xs font-bold block mt-0.5">
                        {selectedPsychTeacherName || studentDetail?.psychologyTeacherName || psychologyData?.reportedToGdcs?.reportedBy || "Giáo viên Tâm lý"}
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Tổng điểm sàng lọc:</span>
                      <strong className="text-amber-800 text-sm font-black block mt-0.5">
                        {psychologyData?.totalScore ?? studentDetail?.psychologyScore ?? "Chưa đánh giá"} điểm
                      </strong>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Mức độ nhận diện:</span>
                      <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs mt-0.5 ${
                        (psychologyData?.totalScore ?? studentDetail?.psychologyScore) > 47
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : (psychologyData?.totalScore ?? studentDetail?.psychologyScore) > 31
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : (psychologyData?.totalScore ?? studentDetail?.psychologyScore) > 15
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}>
                        {psychologyData?.evaluation?.level || (
                          (studentDetail?.psychologyScore != null)
                            ? (studentDetail.psychologyScore <= 15 ? "Bình thường" : studentDetail.psychologyScore <= 31 ? "Dấu hiệu nhẹ" : "Cần hỗ trợ")
                            : "Theo dõi thích nghi"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* CHI TIẾT 6 PHẦN THANG ĐO SÀNG LỌC (NẾU CÓ DỮ LIỆU) */}
                  {Array.isArray(psychologyData?.sectionScores) && psychologyData.sectionScores.length > 0 && (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-2">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">
                        Chi tiết điểm từng phần thang đo sàng lọc:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-600">I. Cảm xúc:</span>
                          <strong className="text-indigo-600">{psychologyData.sectionScores[0] ?? 0} đ</strong>
                        </div>
                        <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-600">II. Hành vi:</span>
                          <strong className="text-indigo-600">{psychologyData.sectionScores[1] ?? 0} đ</strong>
                        </div>
                        <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-600">III. Giao tiếp:</span>
                          <strong className="text-indigo-600">{psychologyData.sectionScores[2] ?? 0} đ</strong>
                        </div>
                        <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                          <span className="text-slate-600">IV. Chú ý & Học tập:</span>
                          <strong className="text-indigo-600">{psychologyData.sectionScores[3] ?? 0} đ</strong>
                        </div>
                        {psychologyData.sectionScores[4] !== undefined && (
                          <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-slate-600">V. Thích nghi:</span>
                            <strong className="text-indigo-600">{psychologyData.sectionScores[4] ?? 0} đ</strong>
                          </div>
                        )}
                        {psychologyData.sectionScores[5] !== undefined && (
                          <div className="flex justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-slate-600">VI. Biểu hiện khác:</span>
                            <strong className="text-indigo-600">{psychologyData.sectionScores[5] ?? 0} đ</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* KẾT LUẬN & KHUYẾN NGHỊ TÂM LÝ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-amber-200">
                      <span className="text-[10px] font-black text-amber-900 uppercase block mb-1">
                        Kết luận sơ bộ / Nhận định chuyên môn:
                      </span>
                      <p className="text-slate-800 text-[11px] leading-relaxed italic">
                        {psychologyData?.conclusion || psychologyReferralReason || "Học sinh có phản xạ tương tác tốt, chưa ghi nhận dấu hiệu bất thường cần can thiệp."}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-black text-emerald-900 uppercase block mb-1">
                        Khuyến nghị dành cho Phụ huynh / Nhà trường:
                      </span>
                      <p className="text-slate-800 text-[11px] leading-relaxed italic">
                        {psychologyData?.recommendation || "Tiếp tục tạo môi trường khuyến khích con giao tiếp tự tin, đồng hành cùng nhà trường trong giai đoạn đầu nhập học."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* BƯỚC 2: PHƯƠNG ÁN XỬ LÝ & CHỈ ĐẠO CỦA GĐCS (ỦY QUYỀN, GẶP TRỰC TIẾP, HẸN LỊCH) */}
                {/* ========================================================= */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border-2 border-indigo-200 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                          2. Phương Án Xử Lý & Chỉ Đạo Của GĐCS (Có thể chọn nhiều hình thức)
                        </h4>
                        <p className="text-[11px] text-indigo-800">
                          Ủy quyền GV đồng hành • GĐCS gặp trực tiếp PHHS • Đặt lịch làm việc chuyên sâu
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* 2.1. ỦY QUYỀN GV */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      gdcsDelegateTeacher ? "bg-indigo-50/70 border-indigo-300 shadow-2xs" : "bg-white border-slate-200"
                    }`}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={gdcsDelegateTeacher}
                            onChange={(e) => setGdcsDelegateTeacher(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            1. Ủy Quyền Giáo Viên Đồng Hành & Hỗ Trợ Chuyên Biệt
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 font-semibold">
                          GV Ủy quyền nhận kết quả chỉ đạo
                        </span>
                      </label>

                      {gdcsDelegateTeacher && (
                        <div className="mt-3 pt-3 border-t border-indigo-200/80 space-y-2.5 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Chọn Giáo viên được ủy quyền:
                              </label>
                              <select
                                value={gdcsDelegatedTeacherId}
                                onChange={(e) => {
                                  const id = e.target.value
                                  setGdcsDelegatedTeacherId(id)
                                  const found = assignedPsychTeachers.find((t: any) => (t.teacherId || t.userId) === id)
                                  if (found) {
                                    setGdcsDelegatedTeacherName(found.teacherName || found.fullName || "")
                                  }
                                }}
                                className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                              >
                                <option value="">-- Chọn giáo viên phụ trách --</option>
                                {assignedPsychTeachers.map((t: any, idx: number) => {
                                  const tId = t.teacherId || t.userId || String(idx)
                                  const tName = t.teacherName || t.fullName || "Giáo viên"
                                  return (
                                    <option key={tId} value={tId}>
                                      {tName} {t.teacherEmail ? `(${t.teacherEmail})` : ""}
                                    </option>
                                  )
                                })}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Hoặc nhập tên GV nếu chưa có trong danh sách:
                              </label>
                              <input
                                type="text"
                                value={gdcsDelegatedTeacherName}
                                onChange={(e) => setGdcsDelegatedTeacherName(e.target.value)}
                                placeholder="Ví dụ: Cô Nguyễn Thị Mai (GVCN Lớp 1A1)"
                                className="w-full h-9 px-3 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                              Nội dung chỉ đạo & Nhiệm vụ giao cho GV ủy quyền:
                            </label>
                            <textarea
                              rows={2}
                              value={gdcsDelegationNote}
                              onChange={(e) => setGdcsDelegationNote(e.target.value)}
                              placeholder="Giao GV theo dõi hành vi, hỗ trợ thích nghi trong 4 tuần đầu và báo cáo tiến độ định kỳ..."
                              className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2.2. TRAO ĐỔI TRỰC TIẾP PHHS */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      gdcsDirectParentMeeting ? "bg-purple-50/70 border-purple-300 shadow-2xs" : "bg-white border-slate-200"
                    }`}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={gdcsDirectParentMeeting}
                            onChange={(e) => setGdcsDirectParentMeeting(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-purple-600" />
                            2. GĐCS Hẹn Gặp & Trao Đổi Trực Tiếp Với Phụ Huynh Học Sinh (PHHS)
                          </span>
                        </div>
                        <span className="text-[10px] text-purple-800 bg-white px-2 py-0.5 rounded-full border border-purple-200 font-semibold">
                          Tư vấn nhận thông tin để liên hệ PHHS
                        </span>
                      </label>

                      {gdcsDirectParentMeeting && (
                        <div className="mt-3 pt-3 border-t border-purple-200/80 space-y-2.5 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Thời gian hẹn gặp PHHS:
                              </label>
                              <input
                                type="text"
                                value={gdcsParentMeetingTime}
                                onChange={(e) => setGdcsParentMeetingTime(e.target.value)}
                                placeholder="Ví dụ: 14:30 Thứ Sáu, 25/10/2026"
                                className="w-full h-9 px-3 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Địa điểm tiếp PHHS:
                              </label>
                              <input
                                type="text"
                                value={gdcsParentMeetingLocation}
                                onChange={(e) => setGdcsParentMeetingLocation(e.target.value)}
                                placeholder="Ví dụ: Phòng Giám đốc Cơ sở Sky-Line"
                                className="w-full h-9 px-3 bg-white border border-purple-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                              Nội dung trọng tâm cần trao đổi & cam kết với PHHS:
                            </label>
                            <textarea
                              rows={2}
                              value={gdcsParentMeetingContent}
                              onChange={(e) => setGdcsParentMeetingContent(e.target.value)}
                              placeholder="Trao đổi định hướng giáo dục, thỏa thuận nhập học và cam kết phối hợp can thiệp tâm lý..."
                              className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-purple-500 resize-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2.3. ĐẶT LỊCH LÀM VIỆC */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      gdcsScheduleMeeting ? "bg-teal-50/70 border-teal-300 shadow-2xs" : "bg-white border-slate-200"
                    }`}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={gdcsScheduleMeeting}
                            onChange={(e) => setGdcsScheduleMeeting(e.target.checked)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            3. Đặt Lịch Làm Việc Chuyên Sâu / Hội Chẩn Chuyên Môn
                          </span>
                        </div>
                        <span className="text-[10px] text-teal-800 bg-white px-2 py-0.5 rounded-full border border-teal-200 font-semibold">
                          Lịch hẹn từ GĐCS
                        </span>
                      </label>

                      {gdcsScheduleMeeting && (
                        <div className="mt-3 pt-3 border-t border-teal-200/80 space-y-2.5 animate-in fade-in duration-150">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Thời gian làm việc (Ngày & Giờ):
                              </label>
                              <input
                                type="text"
                                value={gdcsMeetingTime}
                                onChange={(e) => setGdcsMeetingTime(e.target.value)}
                                placeholder="Ví dụ: 09:00 Thứ Năm, 24/10/2026"
                                className="w-full h-9 px-3 bg-white border border-teal-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Địa điểm làm việc:
                              </label>
                              <input
                                type="text"
                                value={gdcsMeetingLocation}
                                onChange={(e) => setGdcsMeetingLocation(e.target.value)}
                                placeholder="Ví dụ: Phòng họp Ban Giám Hiệu"
                                className="w-full h-9 px-3 bg-white border border-teal-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Thành phần tham gia:
                              </label>
                              <input
                                type="text"
                                value={gdcsMeetingParticipants}
                                onChange={(e) => setGdcsMeetingParticipants(e.target.value)}
                                placeholder="Ví dụ: GĐCS, GV Tâm lý, TTCM, BGH"
                                className="w-full h-9 px-3 bg-white border border-teal-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                                Nội dung / Mục tiêu làm việc:
                              </label>
                              <input
                                type="text"
                                value={gdcsMeetingAgenda}
                                onChange={(e) => setGdcsMeetingAgenda(e.target.value)}
                                placeholder="Ví dụ: Hội chẩn kế hoạch can thiệp & lộ trình tiếp nhận học sinh"
                                className="w-full h-9 px-3 bg-white border border-teal-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* BƯỚC 3: CẬP NHẬT KẾT QUẢ KHẢO SÁT CÁC MÔN HỌC (TẠI SKY-LINE, NẾU CÓ) */}
                {/* ========================================================= */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border-2 border-teal-200 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-teal-950 uppercase tracking-wide">
                          3. Nhập &amp; Cập Nhật Kết Quả Khảo Sát Tiếng Anh &amp; Các Môn Theo Quy Chế
                        </h4>
                        <p className="text-[11px] text-teal-800">
                          Nhập trực tiếp hoặc đối chiếu điểm khảo sát năng lực (Tiếng Anh, Toán, Ngữ văn/Tiếng Việt) để GĐCS xem xét toàn diện
                        </p>
                      </div>
                    </div>
                    {academicSurveyScoresList.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300 font-bold text-[10px]">
                        {academicSurveyScoresList.length} môn khảo sát đã phân công
                      </span>
                    )}
                  </div>

                  {/* FORM NHẬP NHANH ĐIỂM TIẾNG ANH & CÁC MÔN KHẢO SÁT */}
                  <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs space-y-2.5">
                    <div className="text-[11px] font-black text-teal-950 uppercase flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                      <span>Nhập điểm khảo sát tuyển sinh thực tế (Đồng bộ trực tiếp vào Hồ sơ học sinh)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {/* Tiếng Anh Viết */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Tiếng Anh (Viết)
                        </label>
                        <input
                          type="text"
                          value={writtenEnglishScore}
                          onChange={(e) => setWrittenEnglishScore(e.target.value)}
                          placeholder="Điểm Viết (ví dụ: 8.5 hoặc 55/70)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-teal-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 transition-all"
                        />
                      </div>

                      {/* Tiếng Anh Nói / Vấn đáp */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Tiếng Anh (Vấn đáp / Phỏng vấn)
                        </label>
                        <input
                          type="text"
                          value={oralEnglishScore}
                          onChange={(e) => setOralEnglishScore(e.target.value)}
                          placeholder="Điểm Nói (ví dụ: 8.0 hoặc A2/B1)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-teal-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 transition-all"
                        />
                      </div>

                      {/* Môn Toán */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Môn Toán
                        </label>
                        <input
                          type="text"
                          value={mathScore}
                          onChange={(e) => setMathScore(e.target.value)}
                          placeholder="Điểm Toán KS (ví dụ: 8.0)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-teal-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 transition-all"
                        />
                      </div>

                      {/* Môn Ngữ văn / Tiếng Việt */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Môn Ngữ Văn / Tiếng Việt
                        </label>
                        <input
                          type="text"
                          value={literatureScore}
                          onChange={(e) => setLiteratureScore(e.target.value)}
                          placeholder="Điểm Văn/TV KS (ví dụ: 7.5)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-teal-900 outline-none focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BẢNG ĐỐI CHIẾU CÁC MÔN ĐÃ ĐƯỢC GV BỘ MÔN CHẤM (NẾU CÓ) */}
                  {academicSurveyScoresList.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-700 border-b border-slate-200">
                            <th className="p-2.5 w-12 text-center">STT</th>
                            <th className="p-2.5 w-48">Môn khảo sát</th>
                            <th className="p-2.5 w-32 text-center">Điểm từ GV chấm</th>
                            <th className="p-2.5">Nhận xét của Giáo viên bộ môn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {academicSurveyScoresList.map((sub, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-800">{sub.name}</td>
                              <td className="p-2.5 text-center">
                                <span className="px-3 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-black text-xs">
                                  {sub.score}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600 text-[11px]">
                                {sub.teacherRemark ? (
                                  <span>{sub.teacherRemark}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa có nhận xét</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 bg-white rounded-xl border border-dashed border-teal-200 text-center text-xs text-slate-500">
                      Chưa có kết quả khảo sát từ bài chấm riêng của giáo viên bộ môn. Điểm nhập ở trên sẽ được lưu trực tiếp vào kết quả xét tuyển của học sinh.
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* BƯỚC 4: CUỐI CÙNG LÀ XÉT DUYỆT TIẾP NHẬN CỦA GĐCS */}
                {/* ========================================================= */}
                <div className="p-4 bg-teal-50/70 rounded-2xl border-2 border-teal-400 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-teal-950 uppercase tracking-wide">
                          4. Phê Duyệt & Xét Duyệt Tiếp Nhận Của Giám Đốc Cơ Sở (GĐCS)
                        </h4>
                        <p className="text-[11px] text-teal-800">
                          Quyết định tiếp nhận cuối cùng, phê duyệt hệ đào tạo, phân lớp và chỉ đạo chung
                        </p>
                      </div>
                    </div>

                    {/* Quyết định tiếp nhận Badge */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setGdcsDecision("TIEP_NHAN_CHUAN")}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          gdcsDecision === "TIEP_NHAN_CHUAN"
                            ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                            : "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                        }`}
                      >
                        ✓ Sẵn sàng tiếp nhận
                      </button>
                      <button
                        type="button"
                        onClick={() => setGdcsDecision("TIEP_NHAN_DONG_HANH")}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          gdcsDecision === "TIEP_NHAN_DONG_HANH"
                            ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                            : "bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        ⚡ Kế hoạch đồng hành
                      </button>
                      <button
                        type="button"
                        onClick={() => setGdcsDecision("TAM_HOAN_DANH_GIA")}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                          gdcsDecision === "TAM_HOAN_DANH_GIA"
                            ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                            : "bg-white text-rose-800 border-rose-300 hover:bg-rose-50"
                        }`}
                      >
                        ⏳ Cần hội chẩn thêm
                      </button>
                    </div>
                  </div>

                  {/* Hệ đào tạo phê duyệt */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Hệ đào tạo phê duyệt <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={
                          ["Chất lượng cao (CLC)", "Song ngữ Quốc tế", "Hội nhập Quốc tế (HNS)", "Quốc tế Cambridge", "Tiêu chuẩn Sky-Line"].includes(proposedEduSystem)
                            ? proposedEduSystem
                            : proposedEduSystem ? "OTHER" : "Chất lượng cao (CLC)"
                        }
                        onChange={(e) => {
                          if (e.target.value === "OTHER") {
                            setProposedEduSystem("")
                          } else {
                            setProposedEduSystem(e.target.value)
                          }
                        }}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all cursor-pointer"
                      >
                        <option value="Chất lượng cao (CLC)">Chất lượng cao (CLC)</option>
                        <option value="Song ngữ Quốc tế">Song ngữ Quốc tế</option>
                        <option value="Hội nhập Quốc tế (HNS)">Hội nhập Quốc tế (HNS)</option>
                        <option value="Quốc tế Cambridge">Quốc tế Cambridge</option>
                        <option value="Tiêu chuẩn Sky-Line">Tiêu chuẩn Sky-Line</option>
                        <option value="OTHER">Tùy chỉnh khác...</option>
                      </select>
                    </div>
                    {!["Chất lượng cao (CLC)", "Song ngữ Quốc tế", "Hội nhập Quốc tế (HNS)", "Quốc tế Cambridge", "Tiêu chuẩn Sky-Line"].includes(proposedEduSystem) && (
                      <input
                        type="text"
                        value={proposedEduSystem}
                        onChange={(e) => setProposedEduSystem(e.target.value)}
                        placeholder="Nhập tên hệ đào tạo phê duyệt..."
                        className="w-full mt-2 px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                      />
                    )}
                  </div>

                  {/* Ý kiến chỉ đạo chung của GĐCS */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Ý kiến chỉ đạo / Ghi chú chung của Giám Đốc Cơ Sở (GĐCS)
                    </label>
                    <textarea
                      rows={2}
                      value={gdcsGeneralNote}
                      onChange={(e) => setGdcsGeneralNote(e.target.value)}
                      placeholder="Ghi chú thêm về điều kiện nhập học, kế hoạch theo dõi đầu năm hoặc ý kiến chỉ đạo khác..."
                      className="w-full p-3 bg-white border border-teal-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 resize-none leading-relaxed transition-all"
                    />
                  </div>

                  {/* THÔNG TIN PHÂN LUỒNG NHẬN KẾT QUẢ TỪ GĐCS */}
                  <div className="p-3 bg-white rounded-xl border border-teal-300 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                      <span className="font-bold text-teal-950">Phân luồng nhận kết quả chỉ đạo từ GĐCS:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-900 font-semibold">
                        🟢 <strong>Tư vấn:</strong> Nhận kết quả để tư vấn lộ trình & thủ tục nhập học
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold">
                        🔵 <strong>GV Ủy quyền:</strong> Nhận chỉ đạo & kế hoạch đồng hành
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-900 font-semibold">
                        🟣 <strong>Lịch hẹn GĐCS:</strong> Tự động đồng bộ lịch làm việc
                      </span>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* LỊCH SỬ TIẾN TRÌNH & THEO DÕI NGHIỆP VỤ (AUDIT TRAIL 5 MỐC) */}
                {/* ========================================================= */}
                <div className="p-4 bg-slate-50/90 rounded-2xl border-2 border-slate-300 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold shadow-xs">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Lịch Sử Tiến Trình &amp; Theo Dõi Nghiệp Vụ Phiếu Định Hướng (5 Mốc Quy Trình)
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Theo dõi chi tiết: GV phân công định hướng &rarr; GV tâm lý khảo sát &rarr; GĐCS chỉ đạo phương án &rarr; Nhập kết quả các môn &rarr; Xét duyệt GĐCS
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] uppercase">
                      Hệ thống tự động ghi vết
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-1 text-xs">
                    {/* MỐC 1: GV ĐỊNH HƯỚNG */}
                    <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-teal-800 uppercase">1. GV Định Hướng</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 line-clamp-1">
                        {interviewerName || "Cán bộ định hướng"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {studentDetail?.updatedAt ? new Date(studentDetail.updatedAt).toLocaleDateString("vi-VN") : "Đang thực hiện"}
                      </div>
                      <div className="text-[10.5px] text-teal-900 font-medium bg-teal-50/60 p-1.5 rounded-lg border border-teal-100">
                        Ghi nhận phỏng vấn HS &amp; nguyện vọng PHHS
                      </div>
                    </div>

                    {/* MỐC 2: GV TÂM LÝ KHẢO SÁT & BÁO CÁO GĐCS */}
                    <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                      psychologyReferralStatus === "COMPLETED" || psychologyData?.reportedToGdcs
                        ? "bg-white border-amber-300"
                        : psychologyReferralStatus === "REQUESTED"
                        ? "bg-white border-amber-200"
                        : "bg-slate-50/70 border-slate-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-800 uppercase">2. GV Tâm Lý</span>
                        {psychologyReferralStatus === "COMPLETED" || psychologyData?.reportedToGdcs ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : psychologyReferralStatus === "REQUESTED" ? (
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 line-clamp-1">
                        {psychologyData?.reportedToGdcs?.reporterName || selectedPsychTeacherName || "GV Tâm lý"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {psychologyData?.reportedToGdcs?.reportedAtFormatted || (psychologyReferralStatus === "COMPLETED" ? "Đã gửi báo cáo" : "Theo dõi chung")}
                      </div>
                      <div className="text-[10.5px] text-amber-950 font-medium bg-amber-50/60 p-1.5 rounded-lg border border-amber-100">
                        {psychologyReferralStatus === "COMPLETED" || psychologyData?.reportedToGdcs
                          ? `Đã gửi mail GĐCS (${psychologyData?.totalScore ?? studentDetail?.psychologyScore ?? 0}đ)`
                          : psychologyReferralStatus === "REQUESTED"
                          ? "Đã gửi đề xuất khảo sát"
                          : "Không có đề xuất chuyên biệt"}
                      </div>
                    </div>

                    {/* MỐC 3: GĐCS CHỈ ĐẠO PHƯƠNG ÁN */}
                    <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                      gdcsDelegateTeacher || gdcsDirectParentMeeting || gdcsScheduleMeeting
                        ? "bg-white border-indigo-300"
                        : "bg-slate-50/70 border-slate-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-900 uppercase">3. GĐCS Chỉ Đạo</span>
                        {gdcsDelegateTeacher || gdcsDirectParentMeeting || gdcsScheduleMeeting ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-indigo-950 line-clamp-1">
                        {gdcsDelegateTeacher
                          ? `Ủy quyền: ${gdcsDelegatedTeacherName || "GV phụ trách"}`
                          : gdcsDirectParentMeeting
                          ? "Gặp trực tiếp PHHS"
                          : gdcsScheduleMeeting
                          ? "Đặt lịch hội chẩn"
                          : "Quy trình tiêu chuẩn"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {gdcsParentMeetingTime || gdcsMeetingTime || "Chỉ đạo đồng hành"}
                      </div>
                      <div className="text-[10.5px] text-indigo-950 font-medium bg-indigo-50/60 p-1.5 rounded-lg border border-indigo-100">
                        {gdcsDelegateTeacher ? "Đã chỉ định GV hỗ trợ" : gdcsDirectParentMeeting ? "Đã đặt lịch hẹn PHHS" : gdcsScheduleMeeting ? "Đã lên lịch làm việc" : "Tiếp nhận theo chuẩn"}
                      </div>
                    </div>

                    {/* MỐC 4: KẾT QUẢ CÁC MÔN KHẢO SÁT */}
                    <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-900 uppercase">4. Các Môn Khảo Sát</span>
                        {academicSurveyScoresList.length > 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 line-clamp-1">
                        {academicSurveyScoresList.length > 0 ? `${academicSurveyScoresList.length} môn học thuật` : "Miễn bài thi"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {academicSurveyScoresList.length > 0 ? "Theo GV phân công chấm" : "Diện ưu tiên/xét tuyển"}
                      </div>
                      <div className="text-[10.5px] text-blue-950 font-medium bg-blue-50/60 p-1.5 rounded-lg border border-blue-100">
                        {academicSurveyScoresList.length > 0 ? academicSurveyScoresList.map((s: any) => `${s.name}: ${s.score}`).join(" • ") : "Đã ghi nhận học bạ"}
                      </div>
                    </div>

                    {/* MỐC 5: XÉT DUYỆT CỦA GĐCS */}
                    <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                      gdcsDecision === "TIEP_NHAN_CHUAN"
                        ? "bg-white border-emerald-300"
                        : gdcsDecision === "TIEP_NHAN_DONG_HANH"
                        ? "bg-white border-amber-300"
                        : "bg-white border-teal-300"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-teal-900 uppercase">5. Xét Duyệt GĐCS</span>
                        <CheckCircle2 className={`w-3.5 h-3.5 ${
                          gdcsDecision === "TIEP_NHAN_CHUAN" ? "text-emerald-600" : "text-amber-600"
                        }`} />
                      </div>
                      <div className="text-[11px] font-bold text-slate-900 line-clamp-1">
                        {gdcsDecision === "TIEP_NHAN_CHUAN"
                          ? "Sẵn sàng tiếp nhận"
                          : gdcsDecision === "TIEP_NHAN_DONG_HANH"
                          ? "Kế hoạch đồng hành"
                          : "Cần hội chẩn thêm"}
                      </div>
                      <div className="text-[10.5px] text-teal-950 font-medium bg-teal-50/60 p-1.5 rounded-lg border border-teal-100 line-clamp-2">
                        Hệ đào tạo: {proposedEduSystem || "Chất lượng cao (CLC)"}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("tab2")}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại Tab 2: Phỏng vấn Học sinh</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-teal-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Hoàn tất & Lưu Phiếu Định Hướng</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                Đã lưu phiếu định hướng thành công!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() => setIsPsychModalOpen(true)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                psychologyReferralStatus === "REQUESTED"
                  ? "bg-teal-100 hover:bg-teal-200 text-teal-950 border border-teal-300"
                  : "bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200"
              }`}
            >
              <Brain className="w-4 h-4 text-teal-600" />
              <span>{psychologyReferralStatus === "REQUESTED" ? "Đã Gửi GV Tâm Lý" : "Khảo sát Tâm lý"}</span>
            </button>

            <button
              type="button"
              onClick={handleViewReport}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-teal-700" />
              <span>Xem Báo cáo nhận diện</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-teal-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Phiếu Định Hướng</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* MODAL ĐỀ XUẤT KHẢO SÁT TÂM LÝ */}
      {isPsychModalOpen && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-teal-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header Dialog */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-teal-950 via-teal-900 to-teal-950 text-white flex items-center justify-between border-b border-teal-800/60 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-200 shadow-xs">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-[10px] font-bold uppercase tracking-wider">
                      Tham Vấn Chuyên Sâu
                    </span>
                    <span className="text-xs text-teal-200/90 font-medium">• Phân công Giáo viên Tâm lý</span>
                  </div>
                  <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                    <span>Đề Xuất Khảo Sát Tâm Lý:</span>
                    <span className="text-white font-bold">{student?.fullName}</span>
                    <span className="text-xs text-teal-200 font-normal">
                      ({student?.grade || "Khối 1"} • Mã: {student?.studentCode || "Chưa có"})
                    </span>
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPsychModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trạng thái nếu đã từng gửi */}
            {psychologyReferralStatus === "REQUESTED" && (
              <div className="px-6 py-2.5 bg-teal-50 border-b border-teal-200 flex items-center justify-between text-xs text-teal-950 flex-shrink-0">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Đã chuyển tiếp thông tin tới Giáo viên Tâm lý: <strong>{selectedPsychTeacherName || "GV Phụ trách"}</strong></span>
                </div>
                <span className="text-[11px] text-teal-600 bg-white px-2.5 py-0.5 rounded-full border border-teal-200 font-semibold">
                  Sẵn sàng đánh giá chuyên sâu
                </span>
              </div>
            )}

            {/* Dialog Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
              
              {/* PHẦN 1: CHỌN GIÁO VIÊN TÂM LÝ & LÝ DO CHUYỂN TIẾP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Cột 1: Chọn Tổ chuyên môn & Giáo viên Tâm lý */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-teal-600" />
                      <span>Giáo Viên Tâm Lý Tiếp Nhận <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                      Tổ TLHN
                    </span>
                  </div>

                  {/* 1. Chọn Tổ chuyên môn / Đơn vị */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>1. Chọn Tổ Chuyên Môn / Bộ Phận:</span>
                    </label>
                    <select
                      value={selectedDeptCode}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={loadingDeptTeachers}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                    >
                      {departments.length > 0 ? (
                        departments.map((d: any) => (
                          <option key={d.id || d.code} value={d.code || d.id}>
                            {d.name || d.code} {d.code === "TO_TLHN" ? "★ (Tổ Tâm lý - Hướng nghiệp)" : ""}
                          </option>
                        ))
                      ) : (
                        <option value="TO_TLHN">Tổ TLHN (Tổ Tâm Lý - Hướng Nghiệp)</option>
                      )}
                    </select>
                  </div>

                  {/* 2. Chọn Giáo viên Tâm lý */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-teal-600" />
                        <span>2. Chọn Giáo Viên Tiếp Nhận: <span className="text-rose-500">*</span></span>
                      </label>
                      {loadingDeptTeachers && (
                        <span className="text-[10px] text-teal-600 animate-pulse font-medium">Đang tải GV...</span>
                      )}
                    </div>

                    {assignedPsychTeachers.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          value={selectedPsychTeacherId}
                          onChange={(e) => {
                            const tId = e.target.value
                            setSelectedPsychTeacherId(tId)
                            const found = assignedPsychTeachers.find(t => (t.teacherId || t.userId) === tId)
                            if (found) {
                              setSelectedPsychTeacherName(found.teacherName || found.fullName || "")
                              setSelectedPsychTeacherEmail(found.teacherEmail || found.email || "")
                            }
                          }}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                        >
                          {assignedPsychTeachers.map((t: any) => {
                            const tId = t.teacherId || t.userId || ""
                            const tName = t.teacherName || t.fullName || "GV Tâm lý"
                            const tMail = t.teacherEmail || t.email || ""
                            const role = t.assignmentRole || t.position || "GV"
                            return (
                              <option key={tId} value={tId}>
                                {tName} [{role}] {tMail ? `• ${tMail}` : ""}
                              </option>
                            )
                          })}
                        </select>

                        {/* Card xác nhận thông tin GV đã chọn */}
                        <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-teal-200 text-teal-900 font-black text-xs flex items-center justify-center">
                              {selectedPsychTeacherName ? selectedPsychTeacherName.slice(0, 1) : "P"}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {selectedPsychTeacherName || "Chưa chọn GV"}
                              </div>
                              {selectedPsychTeacherEmail && (
                                <div className="text-[10px] text-teal-800 flex items-center gap-1 font-medium">
                                  <Mail className="w-3 h-3" />
                                  <span>{selectedPsychTeacherEmail}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ {selectedDeptCode === "TO_TLHN" ? "Tổ TLHN" : "Đã chọn"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={selectedPsychTeacherName}
                          onChange={(e) => {
                            setSelectedPsychTeacherName(e.target.value)
                            setSelectedPsychTeacherId(e.target.value)
                          }}
                          placeholder="Nhập tên hoặc email GV Tâm lý phụ trách..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                          Chưa có GV nào trong tổ này. Bạn có thể nhập trực tiếp tên/email GV tiếp nhận.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span>GV Tâm lý sẽ nhận thông báo qua email kèm link khảo sát và tiêu chí đánh giá.</span>
                  </div>
                </div>

                {/* Cột 2: Gợi ý nhanh các biểu hiện */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Dấu Hiệu Quan Sát Nhanh (Click để thêm)</span>
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Lo âu, căng thẳng khi giao tiếp",
                      "Rụt rè, thu mình, ít tương tác",
                      "Khó kiểm soát cảm xúc, dễ cáu gắt",
                      "Mất tập trung, vận động liên tục",
                      "Rào cản ngôn ngữ / Khó diễn đạt",
                      "Có biểu hiện sợ sệt người lớn",
                      "Tâm lý nhạy cảm, dễ xúc động",
                      "PHHS chia sẻ có biến cố gia đình"
                    ].map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const current = psychologyReferralReason.trim()
                          if (!current.includes(tag)) {
                            setPsychologyReferralReason(current ? `${current}; ${tag}` : tag)
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-900 rounded-lg text-[11px] font-semibold transition-all border border-slate-200 hover:border-teal-300 cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Ô NHẬP LÝ DO CHI TIẾT */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span>Nội Dung / Lý Do Chuyển Khảo Sát Tâm Lý <span className="text-rose-500">*</span></span>
                </label>
                <textarea
                  rows={3}
                  value={psychologyReferralReason}
                  onChange={(e) => setPsychologyReferralReason(e.target.value)}
                  placeholder="Ghi nhận cụ thể các biểu hiện tâm lý, hành vi hoặc băn khoăn của PHHS cần Giáo viên Tâm lý hỗ trợ chuyên sâu..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium leading-relaxed"
                />
              </div>

              {/* PHẦN 2: XEM TRƯỚC NỘI DUNG CHUYỂN TIẾP (2 TABS) */}
              <div className="bg-white rounded-2xl border border-teal-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3 bg-teal-50/70 border-b border-teal-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-teal-950">
                      Nội Dung Chuyển Giao Cho GV Tâm Lý
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-teal-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setPsychPreviewTab("orientation")}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        psychPreviewTab === "orientation"
                          ? "bg-teal-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      1. Kết Quả Định Hướng
                    </button>
                    <button
                      type="button"
                      onClick={() => setPsychPreviewTab("assessment")}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        psychPreviewTab === "assessment"
                          ? "bg-teal-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      2. Tiêu Chí Đánh Giá Tâm Lý Theo Khối
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  {psychPreviewTab === "orientation" ? (
                    <div className="space-y-4 text-xs">
                      {/* Tóm tắt Tab 1 */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-800 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-indigo-600" />
                            Phỏng Vấn Học Sinh (Tab 1)
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                            Mức độ thích ứng: {adaptationLevel === "CONFIDENT" ? "Tự tin, hào hứng" : adaptationLevel === "NORMAL" ? "Bình thường" : adaptationLevel === "NEED_SUPPORT" ? "Cần hỗ trợ thích nghi" : "Cần lưu ý đặc biệt"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                          <div>
                            <span className="font-bold text-slate-900">Điểm mạnh nổi trội:</span>
                            <p className="mt-0.5 text-slate-600 italic">{studentStrengths || "Chưa ghi nhận"}</p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Điểm cần lưu ý/hỗ trợ:</span>
                            <p className="mt-0.5 text-slate-600 italic">{studentNeedsSupport || "Chưa ghi nhận"}</p>
                          </div>
                        </div>
                        {interviewerGeneralRemark && (
                          <div className="pt-2 border-t border-slate-200">
                            <span className="font-bold text-slate-900">Nhận xét của GV phỏng vấn:</span>
                            <p className="mt-0.5 text-slate-600">{interviewerGeneralRemark}</p>
                          </div>
                        )}
                      </div>

                      {/* Tóm tắt Tab 2 */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                        <span className="font-black text-slate-800 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-teal-600" />
                          Trao Đổi Phụ Huynh Học Sinh (Tab 2)
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                          <div>
                            <span className="font-bold text-slate-900">Kỳ vọng của PHHS:</span>
                            <p className="mt-0.5 text-slate-600 line-clamp-2">{parentExpectations || "Chưa ghi nhận"}</p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Đặc điểm, thói quen của HS:</span>
                            <p className="mt-0.5 text-slate-600 line-clamp-2">{parentPersonalityNotes || "Chưa ghi nhận"}</p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Nhu cầu hỗ trợ & đề xuất:</span>
                            <p className="mt-0.5 text-slate-600 line-clamp-2">{parentSpecialRequests || "Chưa ghi nhận"}</p>
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">Nội dung phối hợp giáo dục:</span>
                            <p className="mt-0.5 text-slate-600 line-clamp-2">{cooperationCommitment || "Chưa ghi nhận"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-950">
                          Bộ công cụ Đánh giá Tâm lý chuẩn hóa theo khối <strong>{student?.grade || "Khối 1"}</strong> (6 nhóm tiêu chí / thang điểm 80)
                        </span>
                        <span className="px-2 py-0.5 bg-teal-200 text-teal-900 rounded-md font-semibold text-[11px]">
                          {flattenedPsychCriteria.length || 20} tiêu chí
                        </span>
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                        {flattenedPsychCriteria.map((q: any, idx: number) => (
                          <div key={q.id || idx} className="p-2.5 bg-slate-50 hover:bg-teal-50/40 rounded-xl border border-slate-200 text-xs flex items-start gap-2.5 transition-colors">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                                {q.category || "Tiêu chuẩn tâm lý"}
                              </span>
                              <p className="text-slate-800 font-medium mt-0.5">
                                {q.text || q.questionText || "Tiêu chí khảo sát"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="text-xs">
                {psychSubmittedSuccess ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã chuyển giao thông tin thành công cho GV Tâm lý!
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium">
                    Hệ thống sẽ đồng thời gửi email thông báo trực tiếp đến GV Tâm lý.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPsychModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={handleSubmitPsychReferral}
                  disabled={submittingPsych}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingPsych ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Xác Nhận & Gửi Cho GV Tâm Lý</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL CỐ VẤN & TRỢ LÝ AI ADMISSION LIÊN THÔNG */}
      {isAdvisoryModalOpen && (student?.id || studentDetail?.id) && (
        <QuickConsultationModal
          isOpen={isAdvisoryModalOpen}
          studentId={studentDetail?.id || student?.id}
          academicYearId={studentDetail?.academicYearId || student?.academicYearId || ""}
          student={studentDetail || student}
          orientationData={{
            answers,
            studentStrengths,
            studentNeedsSupport,
            proposedPlacementRecommendation,
            parentExpectations,
            parentPersonalityNotes,
            parentSpecialRequests,
            cooperationCommitment,
            parentHealthNotes,
            mathScore,
            literatureScore,
            writtenEnglishScore,
            oralEnglishScore
          }}
          onApplyOrientationSummary={(data) => {
            if (data?.diemManhNoiBat) setStudentStrengths(data.diemManhNoiBat)
            if (data?.noiDungCanPhatTrien) {
              const combined = [
                data.noiDungCanPhatTrien,
                data.deXuatHoTroBanDau ? `\n[Đề xuất hỗ trợ ban đầu]: ${data.deXuatHoTroBanDau}` : "",
                data.noiDungCanXacMinh ? `\n[Lưu ý xác minh thêm]: ${data.noiDungCanXacMinh}` : ""
              ].filter(Boolean).join("")
              setStudentNeedsSupport(combined)
            }
            if (data?.khuyenNghiXepLop) {
              const rec = data.heHocDeXuat && !data.khuyenNghiXepLop.includes(data.heHocDeXuat)
                ? `${data.khuyenNghiXepLop} - ${data.heHocDeXuat}`
                : data.khuyenNghiXepLop
              setProposedPlacementRecommendation(rec.trim())
            }
          }}
          onClose={() => setIsAdvisoryModalOpen(false)}
        />
      )}

    </div>
  )
}
