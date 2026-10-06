"use client"
// @ts-nocheck

import React from "react"
import {
  X, Plus, Sparkles, Zap, ShieldCheck, Info, BookOpen, Calendar, Clock, ChevronRight, RotateCcw, Send, Target, BarChart3,
  MapPin, User, Users, UserCheck, CheckCircle2, AlertCircle, AlertTriangle, FileText, Award, Check, Save, Mail, Loader2, Star,
  Search, Filter
} from "lucide-react"
import { QuickCommentPresets } from "./QuickCommentPresets"
import { getObserverSurpriseQuota, checkTeacherSurpriseHistory, findExistingSurpriseSlot, checkObservationConflict, createAssignedObservation } from "../actions"


const K12_SECTIONS = [
  {
    name: "Tiêu chuẩn 1: Phương tiện (3 điểm)",
    requirements: [
      { 
        id: 1, 
        label: "Yêu cầu 1", 
        max: 1.5, 
        mandatoryFor: ["Giỏi", "Khá", "Trung bình"],
        mandatoryText: "Buộc đạt điểm Max (1.5đ) cho loại Giỏi, Khá, TB",
        text: "Chuẩn bị giáo án tốt, giáo án phải chỉ rõ các hoạt động của trò và thầy, bám sát chuẩn kiến thức, kỹ năng, thể hiện mức độ phù hợp của các hoạt động học với mục tiêu, nội dung và phương pháp dạy học được sử dụng. KH bài dạy thể hiện mức độ rõ ràng, chính xác của mục tiêu, nội dung, sản phẩm, cách thức tổ chức thực hiện mỗi hoạt động học của học sinh." 
      },
      { id: 2, label: "Yêu cầu 2", max: 1.5, text: "Tích cực sử dụng đồ dùng, thiết bị dạy học. Thiết bị, đồ dùng dạy học phải phù hợp với nội dung, phương pháp của kiểu bài lên lớp." }
    ]
  },
  {
    name: "Tiêu chuẩn 2: Nội dung (5 điểm)",
    requirements: [
      { 
        id: 3, 
        label: "Yêu cầu 3", 
        max: 2.0, 
        mandatoryFor: ["Giỏi", "Khá", "Trung bình"],
        mandatoryText: "Buộc đạt điểm Max (2.0đ) cho loại Giỏi, Khá, TB",
        text: "Nội dung bài dạy chính xác, khoa học (bao gồm khoa học bộ môn và phù hợp với quan điểm tư tưởng, lập trường chính trị của Đảng); Hấp dẫn (bao gồm hấp dẫn của nội dung, phương pháp và hình thức giao nhiệm vụ học tập cho học sinh)." 
      },
      { id: 4, label: "Yêu cầu 4", max: 2.0, text: "Bảo đảm tính hệ thống, đủ nội dung theo chuẩn kiến thức, kỹ năng và làm rõ trọng tâm của bài học." },
      { id: 5, label: "Yêu cầu 5", max: 1.0, text: "Liên hệ với thực tế đời sống và sản xuất (nếu có). Nội dung liên hệ thực tế có tính giáo dục và gắn với nội dung bài dạy." }
    ]
  },
  {
    name: "Tiêu chuẩn 3: Phương pháp (9 điểm)",
    requirements: [
      { 
        id: 6, 
        label: "Yêu cầu 6", 
        max: 2.0, 
        mandatoryFor: ["Giỏi", "Khá"],
        mandatoryText: "Buộc đạt điểm Max (2.0đ) cho loại Giỏi, Khá",
        text: "Không dạy học theo lối 'đọc chép', áp đặt đối với học sinh. Thể hiện khả năng quan sát, theo dõi, phát hiện kịp thời những khó khăn của học sinh." 
      },
      { 
        id: 7, 
        label: "Yêu cầu 7", 
        max: 3.0, 
        mandatoryFor: ["Giỏi"],
        mandatoryText: "Buộc đạt điểm Max (3.0đ) cho loại Giỏi",
        text: "Tổ chức học sinh học tập tích cực, chủ động, phù hợp với từng đối tượng trong lớp. Khuyến khích học sinh hợp tác, giúp đỡ nhau khi thực hiện nhiệm vụ học tập. Học sinh được tham gia xây dựng bài và phát huy trí lực tốt, hứng thú học tập, không khí lớp học thân thiện." 
      },
      { id: 8, label: "Yêu cầu 8", max: 2.0, text: "Thực hiện linh hoạt các khâu lên lớp, phân phối thời gian hợp lý (đúng quy trình theo YCCD của CT2018). Dành thời gian thích hợp để củng cố, luyện tập nhằm khắc sâu trọng tâm bài học." },
      { id: 9, label: "Yêu cầu 9", max: 2.0, text: "Kết hợp tốt các phương pháp trong hoạt động dạy và học. Học sinh tiếp nhận, sẵn sàng, chủ động, sáng tạo, hợp tác thực hiện các nhiệm vụ, tích cực trong trình bày, thảo luận về kết quả thực hiện nhiệm vụ." }
    ]
  },
  {
    name: "Tiêu chuẩn 4: Kết quả (3 điểm)",
    requirements: [
      { id: 10, label: "Yêu cầu 10", max: 2.0, text: "Mức độ phù hợp, đúng đắn, chính xác của phương án kiểm tra, đánh giá trong quá trình tổ chức hoạt động dạy và học. Học sinh hiểu bài, dễ nhớ, nắm vững trọng tâm, biết vận dụng kiến thức. Tạo điều kiện để học sinh ghi chép bài đầy đủ." },
      { id: 11, label: "Yêu cầu 11", max: 1.0, text: "Tiết dạy nhuần nhuyễn, hấp dẫn, gây ấn tượng và có tính sáng tạo." }
    ]
  }
];

const MAMNON_SECTIONS = [
  {
    name: "1. Chuẩn bị cho hoạt động (2 điểm)",
    requirements: [
      { id: 1, label: "Yêu cầu 1", max: 1.0, text: "Mục tiêu hoạt động phù hợp với độ tuổi và phù hợp với khả năng của trẻ." },
      { id: 2, label: "Yêu cầu 2", max: 0.5, text: "Các phương tiện dạy học kích thích trẻ hoạt động." },
      { id: 3, label: "Yêu cầu 3", max: 0.5, text: "GV tận dụng các sản phẩm do trẻ làm ra để trẻ được hoạt động." }
    ]
  },
  {
    name: "2. Nội dung hoạt động (3 điểm)",
    requirements: [
      { id: 4, label: "Yêu cầu 4", max: 0.5, text: "Khuyến khích trẻ tham gia hoạt động giáo dục bằng vận động thân thể và các giác quan dưới nhiều hình thức khác nhau." },
      { id: 5, label: "Yêu cầu 5", max: 0.5, text: "Đảm bảo tính chính xác về mặt kiến thức, kỹ năng." },
      { id: 6, label: "Yêu cầu 6", max: 0.5, text: "Kiến thức có hệ thống, gần gũi với cuộc sống thực của trẻ." },
      { id: 7, label: "Yêu cầu 7", max: 0.5, text: "Thiết kế các hoạt động cho trẻ hợp lý, đảm bảo tính phát triển, phù hợp với đặc điểm nhận thức và khả năng tư duy của trẻ." },
      { id: 8, label: "Yêu cầu 8", max: 0.5, text: "Nội dung tích hợp nhẹ nhàng, phù hợp." },
      { id: 9, label: "Yêu cầu 9", max: 0.5, text: "GV hướng dẫn rõ ràng, ngắn gọn, chính xác. GV gợi ý, dẫn dắt trẻ tìm ra câu trả lời, luôn tạo cơ hội cho trẻ tham gia hoạt động." }
    ]
  },
  {
    name: "3. Phương pháp và hình thức tổ chức (3 điểm)",
    requirements: [
      { id: 10, label: "Yêu cầu 10", max: 1.0, text: "Tùy theo từng loại hình tổ chức hoạt động, GV kết hợp các phương pháp một cách linh hoạt và thành thạo. Phân bổ thời gian cho các hoạt động hợp lý." },
      { id: 11, label: "Yêu cầu 11", max: 0.5, text: "Giáo viên tổ chức, điều khiển, hỗ trợ đúng lúc, không làm thay trẻ. Khuyến khích tương tác giữa trẻ với trẻ." },
      { id: 12, label: "Yêu cầu 12", max: 0.5, text: "GV đưa ra những tình huống có vấn đề phù hợp, đúng lúc để tạo hứng thú và kích thích trẻ hoạt động." },
      { id: 13, label: "Yêu cầu 13", max: 0.5, text: "Bao quát lớp tốt, lắng nghe trẻ, khen ngợi trẻ kịp thời. GV có thái độ nhẹ nhàng tình cảm, lôi cuốn trẻ." },
      { id: 14, label: "Yêu cầu 14", max: 0.5, text: "Sử dụng các phương tiện tiện dạy học đạt hiệu quả. Có đa dạng các hình thức cho trẻ hoạt động." }
    ]
  },
  {
    name: "4. Kết quả trên trẻ (2 điểm)",
    requirements: [
      { id: 15, label: "Yêu cầu 15", max: 0.5, text: "Trẻ tích cực, hứng thú trên giờ học." },
      { id: 16, label: "Yêu cầu 16", max: 0.5, text: "Trẻ có nhiều cơ hội để khám phá." },
      { id: 17, label: "Yêu cầu 17", max: 0.5, text: "Mọi trẻ đều được GV hỗ trợ và được tham gia hoạt động." },
      { id: 18, label: "Yêu cầu 18", max: 0.5, text: "Trẻ tự chuẩn bị đồ dùng để hoạt động, GV không làm thay cho trẻ." }
    ]
  }
];

function getAllDeptNames(t: any, departments?: any[]): string {
  if (!t) return "";
  const names = new Set<string>();
  if (t.departmentRel?.name) names.add(t.departmentRel.name);
  else if (t.departmentId && departments) {
    const d = departments.find((dept: any) => dept.id === t.departmentId);
    if (d?.name) names.add(d.name);
  }
  if (t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
    t.departmentAssignments.forEach((da: any) => {
      if (da.department?.name) names.add(da.department.name);
      else if (da.departmentId && departments) {
        const d = departments.find((dept: any) => dept.id === da.departmentId);
        if (d?.name) names.add(d.name);
      }
    });
  }
  return Array.from(names).join(", ");
}

const calculateMamNonRanking = (scores: number[]) => {
  const sum = scores.reduce((a: number, b: number) => a + b, 0);
  if (sum === 0) return "Chưa xếp loại";
  if (sum >= 9.0) return "Tốt";
  if (sum >= 8.0) return "Khá";
  if (sum >= 7.0) return "Đạt";
  return "Không đạt";
};

const calculateK12Ranking = (scores: number[]) => {
  const sum = Math.round(scores.reduce((a: number, b: number) => a + b, 0) * 100) / 100;
  if (sum === 0) return "Chưa xếp loại";

  const yq1 = scores[0] || 0;
  const yq3 = scores[2] || 0;
  const yq6 = scores[5] || 0;
  const yq7 = scores[6] || 0;

  const maxScores = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
  const hasSub50 = scores.some((s, idx) => s < maxScores[idx] * 0.5);
  const hasZero = scores.some((s) => s === 0);

  // 1. Giỏi: sum >= 17, Y1=1.5, Y3=2.0, Y6=2.0, Y7=3.0, không có tiêu chí < 50%
  if (sum >= 17.0 && yq1 === 1.5 && yq3 === 2.0 && yq6 === 2.0 && yq7 === 3.0 && !hasSub50) {
    return "Giỏi";
  }

  // 2. Khá: sum >= 14, Y1=1.5, Y3=2.0, Y6=2.0, không có tiêu chí < 50%
  if (sum >= 14.0 && yq1 === 1.5 && yq3 === 2.0 && yq6 === 2.0 && !hasSub50) {
    return "Khá";
  }

  // 3. Trung bình: sum >= 12, Y1=1.5, Y3=2.0, không có tiêu chí 0đ
  if (sum >= 12.0 && yq1 === 1.5 && yq3 === 2.0 && !hasZero) {
    return "Trung bình";
  }

  return "Không xếp loại";
};

interface CreateObservationModalProps {
  isOpen: boolean
  onClose: () => void
  creationMode: "TEACHER_OPEN" | "OBSERVER_REQUEST" | "SURPRISE" | "ASSIGNED"
  setCreationMode: (mode: "TEACHER_OPEN" | "OBSERVER_REQUEST" | "SURPRISE" | "ASSIGNED") => void
  isMamNonTeacher: boolean
  isAdminUser: boolean
  isTTCM: boolean
  canCreateSurprise: boolean
  canAssignObservation?: boolean
  onAssignedSuccess?: () => void
  currentTeacher: any
  monthlyLimitCount: number
  // Surprise form props
  surpriseDeptId: string
  setSurpriseDeptId: (v: string) => void
  surpriseTeacherId: string
  setSurpriseTeacherId: (v: string) => void
  surpriseCampusId: string
  setSurpriseCampusId: (v: string) => void
  surpriseClassId: string
  setSurpriseClassId: (v: string) => void
  surpriseClassName: string
  setSurpriseClassName: (v: string) => void
  surpriseSubjectId: string
  setSurpriseSubjectId: (v: string) => void
  surpriseSubjectName: string
  setSurpriseSubjectName: (v: string) => void
  surpriseLevel: string
  setSurpriseLevel: (v: string) => void
  surpriseGrade: string
  setSurpriseGrade: (v: string) => void
  surpriseTopic: string
  setSurpriseTopic: (v: string) => void
  surpriseDate: string
  setSurpriseDate: (v: string) => void
  surprisePeriod: string
  setSurprisePeriod: (v: string) => void
  surpriseRoom: string
  setSurpriseRoom: (v: string) => void
  surpriseScoresK12: number[]
  setSurpriseScoresK12: React.Dispatch<React.SetStateAction<number[]>>
  surpriseScoresMN: number[]
  setSurpriseScoresMN: React.Dispatch<React.SetStateAction<number[]>>
  surpriseStrengths: string
  setSurpriseStrengths: (v: string) => void
  surpriseImprovements: string
  setSurpriseImprovements: (v: string) => void
  surpriseGeneral: string
  setSurpriseGeneral: (v: string) => void
  surpriseOverall: string
  setSurpriseOverall: (v: string) => void
  surpriseSubmitting: boolean
  handleSurpriseSubmit: (isDraft?: boolean, options?: { existingSlotId?: string; forceNewSlot?: boolean }) => void
  ttcmAllowedDepartments: any[]
  filteredTeachersForSurprise: any[]
  filteredClassesForSurprise: any[]
  // Request form props
  reqCampusId: string
  setReqCampusId: (v: string) => void
  reqDeptId: string
  setReqDeptId: (v: string) => void
  reqTeacherId: string
  setReqTeacherId: (v: string) => void
  reqSubjectId: string
  setReqSubjectId: (v: string) => void
  reqLevel: string
  setReqLevel: (v: string) => void
  reqGrade: string
  setReqGrade: (v: string) => void
  reqClassId: string
  setReqClassId: (v: string) => void
  reqDate: string
  setReqDate: (v: string) => void
  reqPeriod: string
  setReqPeriod: (v: string) => void
  reqTopic: string
  setReqTopic: (v: string) => void
  reqNotes: string
  setReqNotes: (v: string) => void
  handleRequestSubmit: (e: React.FormEvent) => void
  isSubmittingRequest?: boolean
  filteredTeachersForRequest: any[]
  filteredReqClasses: any[]
  // Teacher open form props
  openDeptId: string
  setOpenDeptId: (v: string) => void
  openSubjectId: string
  setOpenSubjectId: (v: string) => void
  openSubjectName: string
  setOpenSubjectName: (v: string) => void
  openCampusId: string
  setOpenCampusId: (v: string) => void
  openClassId: string
  setOpenClassId: (v: string) => void
  openClassName: string
  setOpenClassName: (v: string) => void
  openLevel: string
  setOpenLevel: (v: string) => void
  openGrade: string
  setOpenGrade: (v: string) => void
  openTopic: string
  setOpenTopic: (v: string) => void
  openDate: string
  setOpenDate: (v: string) => void
  openPeriod: string
  setOpenPeriod: (v: string) => void
  openRoom: string
  setOpenRoom: (v: string) => void
  openMaxSeats: number
  setOpenMaxSeats: (v: number) => void
  openLessonPlanUrl: string
  setOpenLessonPlanUrl: (v: string) => void
  openLessonPlanFile: any
  setOpenLessonPlanFile: (v: any) => void
  openNotes: string
  setOpenNotes: (v: string) => void
  sendEmailNotif: boolean
  setSendEmailNotif: (v: boolean) => void
  selectedEmailTeacherIds: string[]
  setSelectedEmailTeacherIds: React.Dispatch<React.SetStateAction<string[]>>
  myDeptTeachers: any[]
  isSubmittingOpen: boolean
  handleOpenSlotSubmit: (e: React.FormEvent) => void
  // Shared data
  subjects: any[]
  departments: any[]
  teachers: any[]
  campuses: any[]
  classes: any[]
  periodOptions: string[]
  getGradesForLevel: (lvl: string) => string[]
  getKhacChuyenDeSubjectId: (subs: any[]) => string
  isPreschoolDepartment: (d: string) => boolean
  k12Labels: string[]
  maxScoresK12: number[]
  getK12RankingDetails: (scores: number[]) => { rating: string; reason: string; color: string }
  getMamNonRankingDetails: (scores: number[]) => { rating: string; reason: string; color: string }
}



const mamNonGrades = ["Nhà trẻ", "Mầm", "Chồi", "Lá"];

function getTeacherAllDeptNames(t: any, departments?: any[]): string {
  if (!t) return "";
  const names = new Set<string>();
  if (t.departmentRel?.name) names.add(t.departmentRel.name);
  else if (t.departmentId && departments) {
    const d = departments.find((dept: any) => dept.id === t.departmentId);
    if (d?.name) names.add(d.name);
  }
  if (t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
    t.departmentAssignments.forEach((da: any) => {
      if (da.department?.name) names.add(da.department.name);
      else if (da.departmentId && departments) {
        const d = departments.find((dept: any) => dept.id === da.departmentId);
        if (d?.name) names.add(d.name);
      }
    });
  }
  return Array.from(names).join(", ");
}

export function ObservationRegistrationSection(props: any) {
  const minAllowedDate = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }, []);

  const {
    creationMode,
    setCreationMode,
    isMamNonTeacher,
    isAdminUser,
    isTTCM,
    canCreateSurprise,
    canAssignObservation,
    onAssignedSuccess,
    currentTeacher,
    monthlyLimitCount,
    myTaughtCount = 0,
    myObservedCount = 0,
    myReceivedEvaluationsStats = { count: 0, avgScore: 0 },
    onViewAllSchedule,
    onViewTaught,
    onViewObserved,
    onViewEvaluations,
    upcomingSlots = [],
    onResetForm,
    onSaveDraft,
    editSlotId,
    // Surprise
    surpriseDeptId, setSurpriseDeptId,
    surpriseTeacherId, setSurpriseTeacherId,
    surpriseCampusId, setSurpriseCampusId,
    surpriseClassId, setSurpriseClassId,
    surpriseClassName, setSurpriseClassName,
    surpriseSubjectId, setSurpriseSubjectId,
    surpriseSubjectName, setSurpriseSubjectName,
    surpriseLevel, setSurpriseLevel,
    surpriseGrade, setSurpriseGrade,
    surpriseTopic, setSurpriseTopic,
    surpriseDate, setSurpriseDate,
    surprisePeriod, setSurprisePeriod,
    surpriseRoom, setSurpriseRoom,
    surpriseScoresK12, setSurpriseScoresK12,
    surpriseScoresMN, setSurpriseScoresMN,
    surpriseStrengths, setSurpriseStrengths,
    surpriseImprovements, setSurpriseImprovements,
    surpriseGeneral, setSurpriseGeneral,
    surpriseOverall, setSurpriseOverall,
    surpriseSubmitting, handleSurpriseSubmit,
    ttcmAllowedDepartments, filteredTeachersForSurprise, filteredClassesForSurprise,
    // Request
    reqCampusId, setReqCampusId,
    reqDeptId, setReqDeptId,
    reqTeacherId, setReqTeacherId,
    reqSubjectId, setReqSubjectId,
    reqLevel, setReqLevel,
    reqGrade, setReqGrade,
    reqClassId, setReqClassId,
    reqDate, setReqDate,
    reqPeriod, setReqPeriod,
    reqTopic, setReqTopic,
    reqNotes, setReqNotes,
    handleRequestSubmit,
    isSubmittingRequest,
    filteredTeachersForRequest, filteredReqClasses,
    // Open slot
    openDeptId, setOpenDeptId,
    openSubjectId, setOpenSubjectId,
    openSubjectName, setOpenSubjectName,
    openCampusId, setOpenCampusId,
    openClassId, setOpenClassId,
    openClassName, setOpenClassName,
    openLevel, setOpenLevel,
    openGrade, setOpenGrade,
    openTopic, setOpenTopic,
    openDate, setOpenDate,
    openPeriod, setOpenPeriod,
    openRoom, setOpenRoom,
    openMaxSeats, setOpenMaxSeats,
    openLessonPlanUrl, setOpenLessonPlanUrl,
    openLessonPlanFile, setOpenLessonPlanFile,
    openNotes, setOpenNotes,
    sendEmailNotif, setSendEmailNotif,
    selectedEmailTeacherIds, setSelectedEmailTeacherIds,
    myDeptTeachers, isSubmittingOpen, handleOpenSlotSubmit,
    // Additional Form 1 props
    newCampusId, setNewCampusId,
    newDeptId, setNewDeptId,
    newSubjectId, setNewSubjectId,
    newLevel, setNewLevel,
    newGrade, setNewGrade,
    newClassId, setNewClassId,
    newDate, setNewDate,
    newStartTime, setNewStartTime,
    newEndTime, setNewEndTime,
    newIsDoublePeriod, setNewIsDoublePeriod,
    newTopic, setNewTopic,
    newChuDe, setNewChuDe,
    newHoatDong, setNewHoatDong,
    newDeTai, setNewDeTai,
    newLessonPlanName, setNewLessonPlanName,
    newLessonPlanData, setNewLessonPlanData,
    fileInputRef,
    handleCreateSubmit,
    handleStartTimeChange,
    handleDoublePeriodChange,
    handleFileChange,
    filteredClassesForCreation,
    submitting,
    // Shared
    subjects, departments, teachers, campuses, classes,
    periodOptions, getGradesForLevel, getKhacChuyenDeSubjectId, isPreschoolDepartment,
    k12Labels, maxScoresK12, getK12RankingDetails, getMamNonRankingDetails
  } = props;

  // Guaranteed reactive state for scoring (instant local reactivity + parent sync)
  const [internalScoresK12, setInternalScoresK12] = React.useState<number[]>(() => 
    Array.isArray(surpriseScoresK12) && surpriseScoresK12.length === 11 ? surpriseScoresK12 : Array(11).fill(0)
  );
  const [internalScoresMN, setInternalScoresMN] = React.useState<number[]>(() => 
    Array.isArray(surpriseScoresMN) && surpriseScoresMN.length === 18 ? surpriseScoresMN : Array(18).fill(0)
  );

  React.useEffect(() => {
    if (Array.isArray(surpriseScoresK12) && surpriseScoresK12.length === 11) {
      setInternalScoresK12(surpriseScoresK12);
    }
  }, [surpriseScoresK12]);

  React.useEffect(() => {
    if (Array.isArray(surpriseScoresMN) && surpriseScoresMN.length === 18) {
      setInternalScoresMN(surpriseScoresMN);
    }
  }, [surpriseScoresMN]);

  // Quản lý hạn ngạch Dự giờ đột xuất (Tối đa 50% chỉ tiêu)
  const [surpriseQuota, setSurpriseQuota] = React.useState<any>(null);
  const [loadingSurpriseQuota, setLoadingSurpriseQuota] = React.useState(false);

  // Quản lý cảnh báo giãn cách 30 ngày cho Giáo viên được dự
  const [teacherSurpriseHistory, setTeacherSurpriseHistory] = React.useState<any>(null);
  const [loadingTeacherHistory, setLoadingTeacherHistory] = React.useState(false);
  const [confirmedSpacingWarning, setConfirmedSpacingWarning] = React.useState(false);
  const [showSpacingConfirmModal, setShowSpacingConfirmModal] = React.useState(false);
  const [pendingDraftSubmit, setPendingDraftSubmit] = React.useState<boolean>(false);

  // Quản lý kiểm tra và tham gia phiên dự giờ đột xuất đã có (Co-observation)
  const [existingSurpriseSlot, setExistingSurpriseSlot] = React.useState<any>(null);
  const [loadingExistingSlot, setLoadingExistingSlot] = React.useState(false);
  const [joinExistingSlot, setJoinExistingSlot] = React.useState<boolean>(false);
  const [dismissDuplicateNotice, setDismissDuplicateNotice] = React.useState<boolean>(false);

  // Load hạn ngạch dự giờ đột xuất khi ở chế độ SURPRISE hoặc đổi ngày
  React.useEffect(() => {
    if (creationMode === "SURPRISE") {
      setLoadingSurpriseQuota(true);
      getObserverSurpriseQuota(surpriseDate)
        .then((res: any) => {
          if (res?.success) setSurpriseQuota(res);
        })
        .catch(err => console.error("Error loading surprise quota:", err))
        .finally(() => setLoadingSurpriseQuota(false));
    }
  }, [creationMode, surpriseDate]);

  // Kiểm tra lịch sử dự giờ đột xuất 30 ngày của giáo viên dạy được chọn
  React.useEffect(() => {
    if (creationMode === "SURPRISE" && surpriseTeacherId) {
      setLoadingTeacherHistory(true);
      setConfirmedSpacingWarning(false);
      checkTeacherSurpriseHistory(surpriseTeacherId, surpriseDate)
        .then((res: any) => {
          if (res?.success) {
            setTeacherSurpriseHistory(res);
          } else {
            setTeacherSurpriseHistory(null);
          }
        })
        .catch(err => console.error("Error checking teacher surprise history:", err))
        .finally(() => setLoadingTeacherHistory(false));
    } else {
      setTeacherSurpriseHistory(null);
      setConfirmedSpacingWarning(false);
    }
  }, [creationMode, surpriseTeacherId, surpriseDate]);

  // Tự động kiểm tra phiên dự giờ đột xuất đã tồn tại cùng GV, ngày, tiết, lớp
  React.useEffect(() => {
    if (creationMode === "SURPRISE" && surpriseTeacherId && surpriseDate && surprisePeriod && (surpriseClassId || surpriseClassName)) {
      setLoadingExistingSlot(true);
      findExistingSurpriseSlot({
        teacherId: surpriseTeacherId,
        date: surpriseDate,
        period: surprisePeriod,
        className: surpriseClassName,
        classId: surpriseClassId,
        campusId: surpriseCampusId
      })
        .then((res: any) => {
          if (res?.success && res.found) {
            setExistingSurpriseSlot(res.slot);
          } else {
            setExistingSurpriseSlot(null);
            setJoinExistingSlot(false);
            setDismissDuplicateNotice(false);
          }
        })
        .catch(err => console.error("Error finding existing surprise slot:", err))
        .finally(() => setLoadingExistingSlot(false));
    } else {
      setExistingSurpriseSlot(null);
      setJoinExistingSlot(false);
      setDismissDuplicateNotice(false);
    }
  }, [creationMode, surpriseTeacherId, surpriseDate, surprisePeriod, surpriseClassId, surpriseClassName, surpriseCampusId]);

  // ===== QUẢN LÝ CHỈ ĐỊNH DỰ GIỜ (ASSIGNED OBSERVATION) =====
  const [assignedAcademicYearId, setAssignedAcademicYearId] = React.useState<string>("");
  const [assignedLevel, setAssignedLevel] = React.useState<string>(() => isMamNonTeacher ? "Mầm non" : "Phổ thông K-12");
  const [assignedGrade, setAssignedGrade] = React.useState<string>(() => isMamNonTeacher ? "Mầm non" : "Khối 10");
  const [assignedCampusId, setAssignedCampusId] = React.useState<string>(() => currentTeacher?.campusId || (campuses?.[0]?.id || ""));
  const [assignedDeptId, setAssignedDeptId] = React.useState<string>(() => currentTeacher?.departmentId || "");

  const isTeacherInDepartment = (t: any, deptId: string): boolean => {
    if (!t || !deptId || deptId === "all") return true;
    if (t.departmentId === deptId) return true;
    if (t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
      return t.departmentAssignments.some((da: any) => da.departmentId === deptId);
    }
    return false;
  };
  const [assignedTeacherId, setAssignedTeacherId] = React.useState<string>("");
  const [assignedClassId, setAssignedClassId] = React.useState<string>("");
  const [assignedClassName, setAssignedClassName] = React.useState<string>("");
  const [assignedDate, setAssignedDate] = React.useState<string>(() => new Date().toISOString().split("T")[0]);
  const [assignedPeriod, setAssignedPeriod] = React.useState<string>(() => isMamNonTeacher ? "HĐ Học sáng" : "Tiết 1");
  const [assignedRoom, setAssignedRoom] = React.useState<string>("Phòng học");
  const [assignedSubjectId, setAssignedSubjectId] = React.useState<string>("");
  const [assignedSubjectName, setAssignedSubjectName] = React.useState<string>("");
  const [assignedTopic, setAssignedTopic] = React.useState<string>("");
  const [assignedNotes, setAssignedNotes] = React.useState<string>("");
  const [assignedObserverIds, setAssignedObserverIds] = React.useState<string[]>([]);
  const [assignedSubmitting, setAssignedSubmitting] = React.useState<boolean>(false);
  const [assignedConflict, setAssignedConflict] = React.useState<any>(null);
  const [assignedJoinExisting, setAssignedJoinExisting] = React.useState<boolean>(false);
  const [assignedForceNew, setAssignedForceNew] = React.useState<boolean>(false);
  const [loadingAssignedConflict, setLoadingAssignedConflict] = React.useState<boolean>(false);

  // Bộ lọc và tìm kiếm cho mục Người dự (Field 10)
  const [observerFilterDeptId, setObserverFilterDeptId] = React.useState<string>("");
  const [observerSearchQuery, setObserverSearchQuery] = React.useState<string>("");

  // Hàm kiểm tra Tổ chuyên môn / Ban Giám Hiệu có thuộc Khối Mầm non hay không
  const isPreschoolDept = React.useCallback((dept: any): boolean => {
    if (!dept) return false;
    const name = dept.name || dept.departmentName || "";
    const code = dept.code || "";
    const block = (dept.blockCM || "").toLowerCase();
    if (typeof isPreschoolDepartment === "function" && (isPreschoolDepartment(name) || isPreschoolDepartment(code))) {
      return true;
    }
    const str = `${name} ${code} ${block}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (
      str.includes("mam non") ||
      str.includes("nha tre") ||
      str.includes("mau giao") ||
      str.includes("bghmn") ||
      str.includes("bgh mn") ||
      str.includes("bgh_mn") ||
      str.includes("ban giam hieu mam non") ||
      str.includes("mgb") ||
      str.includes("mgn") ||
      str.includes("mgl") ||
      str.includes("to_tactq_mn") ||
      str.includes("nt")
    );
  }, [isPreschoolDepartment]);

  // Danh sách Tổ chuyên môn hiển thị đầy đủ của hệ thống theo yêu cầu quản lý
  const myAssignedAllowedDepts = React.useMemo(() => {
    return departments || [];
  }, [departments]);

  // Lọc TCM theo Khối học: Khi chọn Phổ thông hiện đầy đủ tất cả TCM Phổ thông; khi chọn Mầm non hiện đầy đủ tất cả TCM/BGH Mầm non
  const levelFilteredAssignedDepts = React.useMemo(() => {
    const list = (myAssignedAllowedDepts || []).filter((d: any) => {
      const isMN = isPreschoolDept(d);
      if (assignedLevel === "Mầm non") {
        return isMN;
      } else {
        return !isMN;
      }
    });
    return [...list].sort((a: any, b: any) => (a.name || a.departmentName || "").localeCompare(b.name || b.departmentName || "", "vi"));
  }, [myAssignedAllowedDepts, isPreschoolDept, assignedLevel]);

  const levelFilteredDeptIds = React.useMemo(() => {
    return new Set(levelFilteredAssignedDepts.map((d: any) => d.id));
  }, [levelFilteredAssignedDepts]);

  // Danh sách Lớp học map theo Cơ sở (và Khối học), hoàn toàn độc lập không liên quan đến GV
  const availableClassesForAssigned = React.useMemo(() => {
    return (classes || []).filter((c: any) => {
      if (assignedCampusId) {
        const target = String(assignedCampusId).trim().toLowerCase();
        const cCampusId = String(c.campusId || "").trim().toLowerCase();
        let matchCampus = cCampusId === target;
        if (!matchCampus) {
          if ((target === "camp_main" || target === "cs1" || target.includes("cơ sở 1")) && (cCampusId === "cs1" || cCampusId === "camp_main")) {
            matchCampus = true;
          } else if ((cCampusId === "camp_main" || cCampusId === "cs1") && (target === "cs1" || target === "camp_main")) {
            matchCampus = true;
          } else {
            const selCampus = (campuses || []).find((cp: any) =>
              String(cp.id || "").toLowerCase() === target ||
              String(cp.campusCode || "").toLowerCase() === target ||
              String(cp.campusName || "").toLowerCase() === target
            );
            if (selCampus) {
              const sId = String(selCampus.id || "").toLowerCase();
              const sCode = String(selCampus.campusCode || "").toLowerCase();
              if (cCampusId === sId || cCampusId === sCode) matchCampus = true;
              else if (sCode && c.className && String(c.className).toLowerCase().includes(sCode)) matchCampus = true;
              else if (sId && c.className && String(c.className).toLowerCase().includes(sId)) matchCampus = true;
            }
          }
        }
        if (!matchCampus) return false;
      }
      const isMN = (() => {
        const n = (c.name || c.className || "").toLowerCase();
        const g = (c.grade || "").toLowerCase();
        return n.includes("mầm") || n.includes("mam") || n.includes("chồi") || n.includes("choi") || n.includes("lá") || n.includes("la") || n.includes("nhà trẻ") || n.includes("nha tre") || n.includes("mgb") || n.includes("mgn") || n.includes("mgl") || g.includes("mầm non") || g.includes("nhà trẻ");
      })();
      if (assignedLevel === "Mầm non") return isMN;
      return !isMN;
    });
  }, [classes, assignedCampusId, assignedLevel, campuses]);

  // Tự động reset và đồng bộ khi đổi Khối học hoặc Tổ chuyên môn không còn thuộc Khối đã chọn
  React.useEffect(() => {
    if (creationMode === "ASSIGNED") {
      if (assignedDeptId && !levelFilteredDeptIds.has(assignedDeptId)) {
        setAssignedDeptId("");
        setAssignedTeacherId("");
      }
      if (observerFilterDeptId && !levelFilteredDeptIds.has(observerFilterDeptId)) {
        setObserverFilterDeptId("");
      }
    }
  }, [creationMode, assignedLevel, levelFilteredDeptIds, assignedDeptId, observerFilterDeptId]);

  // Danh sách Giáo viên khả dụng cho việc phân công Người dự (đảm bảo đúng Khối học và TCM phụ trách)
  const availableTeachersForObservation = React.useMemo(() => {
    if (!Array.isArray(teachers)) return [];
    const allowedDeptIds = levelFilteredDeptIds;

    return teachers.filter((t: any) => {
      // 1. Không trùng với GV được chỉ định dạy
      if (t.id === assignedTeacherId) return false;

      // 2. Không lặp lại người đã được chọn
      if (assignedObserverIds.includes(t.id)) return false;

      // 3. Phân quyền và lọc theo TCM thuộc khối đang chọn (Phổ thông vs Mầm non)
      if (allowedDeptIds.size > 0) {
        let inScope = false;
        if (t.departmentId && allowedDeptIds.has(t.departmentId)) inScope = true;
        if (!inScope && t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
          inScope = t.departmentAssignments.some((da: any) => allowedDeptIds.has(da.departmentId));
        }
        if (!inScope) return false;
      }

      // 4. Lọc theo Tổ chuyên môn được chọn ở dropdown bộ lọc người dự
      if (observerFilterDeptId && observerFilterDeptId !== "all") {
        let matchDept = (t.departmentId === observerFilterDeptId);
        if (!matchDept && t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
          matchDept = t.departmentAssignments.some((da: any) => da.departmentId === observerFilterDeptId);
        }
        if (!matchDept) return false;
      }

      // 5. Lọc theo từ khóa tìm kiếm (Tên GV, Mã GV)
      if (observerSearchQuery.trim()) {
        const q = observerSearchQuery.toLowerCase().trim();
        const nameMatch = (t.teacherName || "").toLowerCase().includes(q);
        const codeMatch = (t.teacherCode || "").toLowerCase().includes(q);
        const emailMatch = (t.email || "").toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [teachers, assignedTeacherId, assignedObserverIds, levelFilteredDeptIds, observerFilterDeptId, observerSearchQuery]);

  // Tự động kiểm tra trùng phiên khi cán bộ quản lý chọn GV, Ngày, Tiết, Lớp
  React.useEffect(() => {
    if (creationMode === "ASSIGNED" && assignedTeacherId && assignedDate && assignedPeriod && (assignedClassId || assignedClassName)) {
      setLoadingAssignedConflict(true);
      checkObservationConflict({
        teacherId: assignedTeacherId,
        date: assignedDate,
        period: assignedPeriod,
        classId: assignedClassId,
        className: assignedClassName,
        campusId: assignedCampusId
      })
        .then((res: any) => {
          if (res?.success && res.conflict) {
            setAssignedConflict(res.slot);
          } else {
            setAssignedConflict(null);
            setAssignedJoinExisting(false);
            setAssignedForceNew(false);
          }
        })
        .catch(err => console.error("Error checking conflict for assignment:", err))
        .finally(() => setLoadingAssignedConflict(false));
    } else {
      setAssignedConflict(null);
      setAssignedJoinExisting(false);
      setAssignedForceNew(false);
    }
  }, [creationMode, assignedTeacherId, assignedDate, assignedPeriod, assignedClassId, assignedClassName, assignedCampusId]);

  const handleAssignedFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTeacherId) {
      alert("Vui lòng chọn Giáo viên được dự giờ.");
      return;
    }
    if (!assignedDate) {
      alert("Vui lòng chọn Ngày dự giờ.");
      return;
    }
    if (!assignedPeriod) {
      alert("Vui lòng chọn Tiết học / Khung thời gian.");
      return;
    }
    if (!assignedClassName && !assignedClassId) {
      alert("Vui lòng chọn hoặc nhập Lớp học.");
      return;
    }
    if (assignedObserverIds.length === 0) {
      alert("Vui lòng chọn ít nhất một người tham gia dự giờ.");
      return;
    }

    if (assignedConflict && !assignedJoinExisting && !assignedForceNew) {
      alert("Đã tồn tại phiên dự giờ của giáo viên này trong cùng thời gian và lớp. Vui lòng chọn 'Tham gia phiên hiện có' hoặc 'Tạo phiên riêng biệt'.");
      return;
    }

    setAssignedSubmitting(true);
    try {
      const payload: any = {
        level: assignedLevel,
        grade: assignedGrade,
        campusId: assignedCampusId,
        targetDeptId: assignedDeptId,
        teacherId: assignedTeacherId,
        classId: assignedClassId || undefined,
        className: assignedClassName || "Lớp học",
        date: assignedDate,
        period: assignedPeriod,
        room: assignedRoom || "Phòng học",
        subjectId: assignedSubjectId || undefined,
        subjectName: assignedSubjectName || (assignedLevel === "Mầm non" ? "Chủ đề/Chuyên đề" : "Môn học"),
        topic: assignedTopic || `Chỉ định dự giờ: ${assignedSubjectName || "Chuyên môn"} - ${assignedClassName}`,
        notes: assignedNotes,
        observerTeacherIds: assignedObserverIds,
        academicYearId: assignedAcademicYearId || undefined
      };

      if (assignedJoinExisting && assignedConflict?.id) {
        payload.existingSlotId = assignedConflict.id;
      } else if (assignedForceNew) {
        payload.forceNewSlot = true;
      }

      const res = await createAssignedObservation(payload);
      if (res.success) {
        alert(res.message || "Đã tạo lượt Chỉ định dự giờ thành công!");
        setAssignedTeacherId("");
        setAssignedObserverIds([]);
        setAssignedTopic("");
        setAssignedNotes("");
        setAssignedConflict(null);
        setAssignedJoinExisting(false);
        setAssignedForceNew(false);

        if (typeof onAssignedSuccess === "function") {
          onAssignedSuccess();
        } else if (typeof props.onClose === "function") {
          props.onClose();
        }
      } else {
        alert(res.error || "Không thể tạo lượt Chỉ định dự giờ.");
      }
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi tạo chỉ định dự giờ.");
    } finally {
      setAssignedSubmitting(false);
    }
  };

  const effectiveScoresK12 = internalScoresK12;
  const effectiveScoresMN = internalScoresMN;


  const handleUpdateK12Score = (index: number, val: number) => {
    const nextScores = [...effectiveScoresK12];
    nextScores[index] = val;
    setInternalScoresK12(nextScores);
    if (typeof setSurpriseScoresK12 === "function") {
      setSurpriseScoresK12(nextScores);
    }
    if (typeof setSurpriseOverall === "function") {
      setSurpriseOverall(calculateK12Ranking(nextScores));
    }
  };

  const handleUpdateMNScore = (index: number, val: number) => {
    const nextScores = [...effectiveScoresMN];
    nextScores[index] = val;
    setInternalScoresMN(nextScores);
    if (typeof setSurpriseScoresMN === "function") {
      setSurpriseScoresMN(nextScores);
    }
    if (typeof setSurpriseOverall === "function") {
      setSurpriseOverall(calculateMamNonRanking(nextScores));
    }
  };

  const handleSetAllMaxSafe = () => {
    if (surpriseLevel !== "Mầm non") {
      const maxArr = K12_SECTIONS.flatMap(s => s.requirements.map(r => r.max));
      setInternalScoresK12(maxArr);
      if (typeof setSurpriseScoresK12 === "function") setSurpriseScoresK12(maxArr);
      if (typeof setSurpriseOverall === "function") setSurpriseOverall(calculateK12Ranking(maxArr));
    } else {
      const maxArr = MAMNON_SECTIONS.flatMap(s => s.requirements.map(r => r.max));
      setInternalScoresMN(maxArr);
      if (typeof setSurpriseScoresMN === "function") setSurpriseScoresMN(maxArr);
      if (typeof setSurpriseOverall === "function") setSurpriseOverall(calculateMamNonRanking(maxArr));
    }
  };

  const handleResetScoresSafe = () => {
    if (surpriseLevel !== "Mầm non") {
      const zeroArr = Array(11).fill(0);
      setInternalScoresK12(zeroArr);
      if (typeof setSurpriseScoresK12 === "function") setSurpriseScoresK12(zeroArr);
      if (typeof setSurpriseOverall === "function") setSurpriseOverall(calculateK12Ranking(zeroArr));
    } else {
      const zeroArr = Array(18).fill(0);
      setInternalScoresMN(zeroArr);
      if (typeof setSurpriseScoresMN === "function") setSurpriseScoresMN(zeroArr);
      if (typeof setSurpriseOverall === "function") setSurpriseOverall(calculateMamNonRanking(zeroArr));
    }
  };

  const currentMonthNum = new Date().getMonth() + 1;
  const progressPct = Math.min(100, Math.round(((monthlyLimitCount || 0) / 2) * 100));

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">

      {/* 2. 4 OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Tiết trong tháng */}
        <div 
          onClick={onViewTaught}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 leading-tight">
                {myTaughtCount}
              </div>
              <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                Tiết trong tháng
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Lượt đăng ký */}
        <div 
          onClick={onViewObserved}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-teal-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#00A19A] flex items-center justify-center border border-teal-100 group-hover:scale-105 transition-transform shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 leading-tight">
                {myObservedCount}
              </div>
              <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                Lượt đăng ký
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-teal-50 text-slate-400 group-hover:text-teal-600 flex items-center justify-center transition-colors shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Đã đánh giá */}
        <div 
          onClick={onViewEvaluations}
          className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-purple-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:scale-105 transition-transform shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 leading-tight">
                {myReceivedEvaluationsStats?.count || 0}
              </div>
              <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                Đã đánh giá
              </div>
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-purple-50 text-slate-400 group-hover:text-purple-600 flex items-center justify-center transition-colors shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Điểm TB tháng */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 leading-tight">
                {myReceivedEvaluationsStats?.avgScore != null && Number(myReceivedEvaluationsStats.avgScore) > 0 ? Number(myReceivedEvaluationsStats.avgScore).toFixed(2) : "-"}
              </div>
              <div className="text-xs font-bold text-slate-500 whitespace-nowrap">
                Điểm TB tháng
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SWITCHER TABS (Pills layout matching mockup) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setCreationMode("TEACHER_OPEN")}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            creationMode === "TEACHER_OPEN"
              ? "bg-[#00A19A] text-white shadow-md shadow-teal-900/20 scale-[1.01]"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Đăng ký tiết dạy</span>
        </button>

        <button
          type="button"
          onClick={() => setCreationMode("OBSERVER_REQUEST")}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            creationMode === "OBSERVER_REQUEST"
              ? "bg-[#00A19A] text-white shadow-md shadow-teal-900/20 scale-[1.01]"
              : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Xin dự giờ</span>
        </button>

        {canCreateSurprise && (
          <button
            type="button"
            onClick={() => setCreationMode("SURPRISE")}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              creationMode === "SURPRISE"
                ? "bg-[#00A19A] text-white shadow-md shadow-teal-900/20 scale-[1.01]"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Dự giờ đột xuất</span>
          </button>
        )}

        {canAssignObservation && (
          <button
            type="button"
            onClick={() => setCreationMode("ASSIGNED")}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              creationMode === "ASSIGNED"
                ? "bg-purple-700 text-white shadow-md shadow-purple-900/20 scale-[1.01]"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4 text-purple-300" />
            <span>Chỉ định dự giờ</span>
          </button>
        )}
      </div>

      {/* 4. MAIN FORM: Mở rộng giao diện full-width 100% cho tất cả các thẻ tag như thẻ Đột xuất */}
      <div className="w-full flex flex-col gap-6">
        {/* Main Form Column */}
        <div className="w-full">
          <div className={`w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 flex flex-col gap-6 border-t-4 ${
            creationMode === "SURPRISE" ? "border-t-[#00A19A]" : isMamNonTeacher ? "border-t-amber-500" : "border-t-[#00A19A]"
          }`}>
            {/* Header Banner */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                creationMode === "ASSIGNED"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "bg-teal-50 text-[#00A19A] border border-teal-100"
              }`}>
                {creationMode === "SURPRISE" ? (
                  <Zap className="w-5 h-5 text-amber-500" />
                ) : creationMode === "ASSIGNED" ? (
                  <UserCheck className="w-5 h-5 text-purple-700" />
                ) : (
                  <Calendar className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {creationMode === "TEACHER_OPEN"
                    ? "THÔNG TIN ĐĂNG KÝ TIẾT DẠY"
                    : creationMode === "OBSERVER_REQUEST"
                    ? "THÔNG TIN XIN DỰ GIỜ"
                    : creationMode === "ASSIGNED"
                    ? "THÔNG TIN CHỈ ĐỊNH DỰ GIỜ"
                    : "THÔNG TIN DỰ GIỜ ĐỘT XUẤT"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {creationMode === "SURPRISE"
                    ? "Hệ thống ghi nhận và đánh giá trực tiếp tiết dạy đột xuất một cách khách quan, thân thiện và đồng hành phát triển chuyên môn."
                    : creationMode === "ASSIGNED"
                    ? "Cán bộ quản lý chủ động chỉ định giáo viên được dự và phân công người dự theo kế hoạch. Tiết dạy có hiệu lực ngay mà không yêu cầu giáo viên xác nhận."
                    : "Vui lòng khai báo đầy đủ thông tin để gửi đăng ký tiết dạy. Hệ thống sẽ kiểm tra trùng lịch và tự động gửi email thông báo tới Giáo viên cùng Tổ chuyên môn."}
                </p>
              </div>
            </div>

            {creationMode === "SURPRISE" ? (
            /* ===== FORM 3: DỰ GIỜ ĐỘT XUẤT (TTCM & BAN ĐHCM / GĐCS) ===== */
            <div className="flex flex-col gap-6 text-xs font-semibold bg-gradient-to-b from-slate-50/40 via-white to-teal-50/20 p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm animate-in fade-in duration-300">
              {/* Header Banner */}
              <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white ${
                surpriseLevel === "Mầm non"
                  ? "bg-gradient-to-r from-amber-700 via-amber-800 to-[#003B3A] border-amber-500/40"
                  : "bg-gradient-to-r from-[#003B3A] via-[#005B54] to-[#00A19A] border-teal-600/40"
              }`}>
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-black tracking-wide">
                        {surpriseLevel === "Mầm non" ? "DỰ GIỜ ĐỘT XUẤT MẦM NON" : "DỰ GIỜ ĐỘT XUẤT"}
                      </h4>
                      <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-400 text-amber-950 uppercase">
                        {isAdminUser ? "Ban ĐHCM / GĐCS / TBP / Quản lý" : (surpriseLevel === "Mầm non" ? "TTCM / BGH Mầm non" : "TTCM / Trưởng Bộ Phận")}
                      </span>

                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-800/80 text-teal-100 border border-teal-500/40">
                        Đồng hành chuyên môn
                      </span>
                    </div>
                    <p className="text-[11px] text-teal-50/90 font-medium mt-1 leading-relaxed">
                      {surpriseLevel === "Mầm non"
                        ? "Đánh giá hoạt động học / chuyên đề Mầm non (18 tiêu chí - Tổng 10 điểm). Tự động ghi nhận không cần duyệt trước."
                        : "Đánh giá trực tiếp tiết dạy đột xuất (11 tiêu chí - Chuẩn 20 điểm) nhằm đồng hành, hỗ trợ và phát triển chuyên môn giáo viên. Kết quả được lưu tự động mà không cần phê duyệt trước."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl border border-white/20 text-[11px] font-bold text-teal-100 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Hình thức: Mặc định đột xuất</span>
                </div>
              </div>

              {/* QUOTA TRACKER BANNER (Quy định không vượt quá 50% chỉ tiêu) */}
              {surpriseQuota && (
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  surpriseQuota.isExceeded
                    ? "bg-rose-50/90 border-rose-200 text-rose-950 shadow-xs"
                    : "bg-gradient-to-r from-teal-50/90 via-emerald-50/60 to-cyan-50/80 border-teal-200/90 text-slate-800 shadow-xs"
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                        surpriseQuota.isExceeded ? "bg-rose-200 text-rose-800" : "bg-teal-200/70 text-[#00A19A]"
                      }`}>
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-800">
                            Hạn ngạch Dự Giờ Đột Xuất ({surpriseQuota.monthLabel})
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/80 border border-slate-200 text-slate-700">
                            {surpriseQuota.roleName}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                            surpriseQuota.isExceeded ? "bg-rose-600 text-white" : "bg-[#00A19A] text-white"
                          }`}>
                            Tối đa 50% chỉ tiêu
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 mt-1">
                          Chỉ tiêu quy định: <strong className="text-slate-800 font-bold">{surpriseQuota.monthlyTarget} tiết/tháng</strong> • Dự giờ đột xuất tối đa: <strong className="text-[#00A19A] font-black">{surpriseQuota.maxSurpriseAllowed} tiết</strong> (50%)
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pl-12 md:pl-0">
                      <div className="flex items-center gap-2 text-xs font-black">
                        <span className={surpriseQuota.isExceeded ? "text-rose-700" : "text-[#00A19A]"}>
                          Đã dùng: {surpriseQuota.currentSurpriseCount} / {surpriseQuota.maxSurpriseAllowed} tiết
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          ({Math.min(100, Math.round((surpriseQuota.currentSurpriseCount / (surpriseQuota.maxSurpriseAllowed || 1)) * 100))}%)
                        </span>
                      </div>
                      <div className="w-full sm:w-48 h-2 rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            surpriseQuota.isExceeded ? "bg-rose-600" : "bg-gradient-to-r from-teal-500 to-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((surpriseQuota.currentSurpriseCount / (surpriseQuota.maxSurpriseAllowed || 1)) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="text-[11px] font-bold">
                        {surpriseQuota.isExceeded ? (
                          <span className="text-rose-600 font-black">⚠️ Đã đạt giới hạn tối đa 50% chỉ tiêu</span>
                        ) : (
                          <span className="text-emerald-700">🟢 Còn lại {surpriseQuota.remainingSurpriseCount} lượt đăng ký</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {surpriseQuota.isExceeded && (
                    <div className="mt-3 pt-3 border-t border-rose-200/80 text-xs text-rose-800 font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        Thầy/Cô đã hoàn thành tối đa số lượt dự giờ đột xuất cho phép trong tháng (50% của {surpriseQuota.monthlyTarget} tiết chỉ tiêu). Để đảm bảo tính sư phạm và kế hoạch chuyên môn, các tiết dự giờ còn lại vui lòng chuyển sang tab <strong>"Xin dự giờ"</strong> theo kế hoạch.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CO-OBSERVATION: BỘ LỌC VÀ CẢNH BÁO PHIÊN DỰ GIỜ ĐỘT XUẤT CÙNG TIẾT */}
              {loadingExistingSlot && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-800 text-xs flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                  <span className="font-semibold">Đang tự động kiểm tra phiên dự giờ của giáo viên trong cùng tiết học...</span>
                </div>
              )}

              {existingSurpriseSlot && !dismissDuplicateNotice && !joinExistingSlot && (
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/95 via-sky-50/80 to-teal-50/90 border-2 border-indigo-300 shadow-sm flex flex-col gap-4 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                          Phát hiện phiên dự giờ cùng tiết học
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                          ⚡ Gộp phiên (Co-observation)
                        </span>
                      </div>
                      <h5 className="text-sm sm:text-base font-black text-indigo-950 mt-1.5 leading-snug">
                        “Đã tồn tại phiên dự giờ của giáo viên này trong cùng tiết học. Bạn có muốn tham gia phiên dự giờ hiện có?”
                      </h5>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Hệ thống xác định phiên dự giờ dựa trên: Giáo viên được dự (<strong>{existingSurpriseSlot.teacherName}</strong>), Ngày (<strong>{existingSurpriseSlot.date}</strong>), Tiết (<strong>{existingSurpriseSlot.period}</strong>), Lớp (<strong>{existingSurpriseSlot.className}</strong>) tại cơ sở <strong>{existingSurpriseSlot.campusName}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Chi tiết phiên hiện có */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/95 border border-indigo-100 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Môn & Bài dạy</span>
                        <strong className="text-slate-900 text-xs font-bold block truncate">
                          {existingSurpriseSlot.subjectName} — "{existingSurpriseSlot.topic}"
                        </strong>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Lớp & Tiết học</span>
                        <strong className="text-slate-900 text-xs font-bold block">
                          {existingSurpriseSlot.className} • {existingSurpriseSlot.period}
                        </strong>
                      </div>
                      <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 sm:col-span-2 lg:col-span-1">
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Cơ sở & Phòng</span>
                        <span className="font-bold text-slate-700 block truncate">
                          {existingSurpriseSlot.campusName} {existingSurpriseSlot.room ? `• ${existingSurpriseSlot.room}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="text-slate-500 font-semibold">Người tham gia dự giờ:</span>
                        <span className="font-bold text-indigo-950">
                          {existingSurpriseSlot.participants?.map((p: any) => `${p.teacherName} (${p.position || "Cán bộ"})`).join(", ") || "Đang dự"}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        {existingSurpriseSlot.participantCount} người tham gia
                      </span>
                    </div>
                  </div>

                  {/* 2 Lựa chọn hành động theo yêu cầu */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-600 font-medium italic">
                      💡 Vui lòng lựa chọn cách ghi nhận phiên dự giờ:
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setJoinExistingSlot(false);
                          setDismissDuplicateNotice(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        ➕ Tạo phiên mới
                        <span className="text-[10px] font-normal text-slate-500 block sm:inline sm:ml-1">(Tiết dạy khác)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setJoinExistingSlot(true);
                          if (existingSurpriseSlot.topic) setSurpriseTopic(existingSurpriseSlot.topic);
                          if (existingSurpriseSlot.subjectName) setSurpriseSubjectName(existingSurpriseSlot.subjectName);
                          if (existingSurpriseSlot.subjectId) setSurpriseSubjectId(existingSurpriseSlot.subjectId);
                          if (existingSurpriseSlot.room) setSurpriseRoom(existingSurpriseSlot.room);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#003B3A] via-[#005B54] to-[#00A19A] hover:from-[#002B2A] hover:to-[#005B54] text-white font-black text-xs transition-all shadow-md shadow-teal-950/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-emerald-300" />
                        <span>Tham gia phiên dự giờ</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-emerald-950 text-[10px] font-black">Khuyến nghị</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TRẠNG THÁI ĐÃ CHỌN THAM GIA PHIÊN DỰ GIỜ CHUNG */}
              {existingSurpriseSlot && joinExistingSlot && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50/95 via-emerald-50/90 to-cyan-50/90 border-2 border-[#00A19A] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-800 animate-in fade-in duration-200">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00A19A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-[#003B3A] uppercase tracking-wide">
                          Đã chọn: Tham gia phiên dự giờ chung
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                          {existingSurpriseSlot.participantCount} người cùng dự
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Phiếu đánh giá riêng độc lập
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        Phiên: <strong>"{existingSurpriseSlot.topic}"</strong> ({existingSurpriseSlot.subjectName} - {existingSurpriseSlot.className} - {existingSurpriseSlot.period}). Hệ thống chỉ ghi nhận 01 phiên cho GV dạy; Thầy/Cô thực hiện phiếu đánh giá riêng của mình (11 tiêu chí, nhận xét và điểm số độc lập).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setJoinExistingSlot(false);
                      setDismissDuplicateNotice(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                  >
                    Thay đổi lựa chọn
                  </button>
                </div>
              )}

              {/* SECTION 1: THÔNG TIN TIẾT DẠY & GIÁO VIÊN */}

              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-teal-100 text-[#00A19A] rounded-md flex items-center justify-center text-xs font-black">1</span>
                    Thông tin Giáo viên & Tiết học
                  </h5>
                  <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                    Các mục có dấu <span className="text-rose-500 font-bold">*</span> là bắt buộc
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-4 sm:gap-5">
                  {/* 1. Chọn Tổ CM */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Chọn Tổ CM *</span>
                      </span>
                      {!isAdminUser && isTTCM && !isMamNonTeacher && (
                        <span className="text-[10px] text-amber-600 font-bold">🔒 Khóa theo TCM</span>
                      )}
                      {isMamNonTeacher && (
                        <span className="text-[10px] text-emerald-600 font-bold">✨ Tổ Mầm non & TA</span>
                      )}
                    </label>
                    <select
                      value={surpriseDeptId}
                      onChange={e => {
                        const newDeptId = e.target.value;
                        setSurpriseDeptId(newDeptId);
                        setSurpriseTeacherId("");
                        if (newDeptId) {
                          const selectedDept = departments.find((d: any) => d.id === newDeptId);
                          if (selectedDept && isPreschoolDepartment(selectedDept.name || selectedDept.code || "")) {
                            setSurpriseLevel("Mầm non");
                            const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                            setSurpriseSubjectId(khacChuyenDeId);
                            setSurpriseSubjectName("Chủ đề/Chuyên đề");
                          } else {
                            if (surpriseLevel === "Mầm non") setSurpriseLevel("Phổ thông K-12");
                          }
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      {(isAdminUser || isMamNonTeacher) && <option value="">-- Chọn Tổ CM --</option>}
                      {ttcmAllowedDepartments.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Giáo viên dạy được dự */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-5 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Giáo viên dạy được dự *</span>
                      </span>
                      {filteredTeachersForSurprise.length > 0 && (
                        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          {filteredTeachersForSurprise.length} GV
                        </span>
                      )}
                    </label>
                    <select
                      value={surpriseTeacherId}
                      onChange={e => {
                        const tId = e.target.value;
                        setSurpriseTeacherId(tId);
                        if (tId) {
                          const tObj = teachers.find((t: any) => t.id === tId);
                          if (tObj) {
                            if (tObj.campusId && !surpriseCampusId) setSurpriseCampusId(tObj.campusId);
                            if (tObj.mainSubjectRel?.subjectName && !surpriseSubjectId) {
                              setSurpriseSubjectName(tObj.mainSubjectRel.subjectName);
                              if (tObj.mainSubjectId) setSurpriseSubjectId(tObj.mainSubjectId);
                            }
                            const tDept = departments.find((d: any) => d.id === tObj.departmentId) || tObj.departmentRel;
                            if (tDept && isPreschoolDepartment(tDept.name || tDept.code || "")) {
                              setSurpriseLevel("Mầm non");
                              const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                              setSurpriseSubjectId(khacChuyenDeId);
                              setSurpriseSubjectName("Chủ đề/Chuyên đề");
                            } else {
                              if (surpriseLevel === "Mầm non") {
                                setSurpriseLevel("Phổ thông K-12");
                              }
                            }
                          }
                        }
                      }}
                      required
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn Giáo viên dạy --</option>
                      {filteredTeachersForSurprise.map((t: any) => {
                        const campusObj = campuses.find((c: any) => c.id === t.campusId);
                        const campusShort = campusObj?.campusCode || campusObj?.campusName?.replace("Sky-Line ", "") || "";
                        const depts = getTeacherAllDeptNames(t, departments);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ""} {depts ? `• ${depts}` : ""} {campusShort ? `[${campusShort}]` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 3. Môn học */}
                  <div className="col-span-12 sm:col-span-12 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Môn học *</span>
                      </span>
                      {isMamNonTeacher && (
                        <span className="text-[10px] text-emerald-600 font-bold">✨ Chủ đề/Chuyên đề</span>
                      )}
                    </label>
                    <select
                      value={surpriseSubjectId}
                      onChange={e => {
                        const sId = e.target.value;
                        setSurpriseSubjectId(sId);
                        const sObj = subjects.find((s: any) => s.id === sId);
                        if (sObj) {
                          setSurpriseSubjectName(sObj.subjectName);
                        } else if (sId) {
                          setSurpriseSubjectName(sId);
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {/* Đưa môn Chủ đề/Chuyên đề lên đầu danh sách */}
                      {(() => {
                        const chuDeSub = subjects.find((s: any) => {
                          const n = (s.subjectName || "").toLowerCase();
                          return n.includes("chủ đề") || n.includes("chu de") || n === "chủ đề/chuyên đề";
                        });
                        const chuDeId = chuDeSub ? chuDeSub.id : "Chủ đề/Chuyên đề";
                        return (
                          <option key="opt_chude" value={chuDeId}>
                            🌟 Chủ đề/Chuyên đề {isMamNonTeacher ? "(Mầm non)" : ""}
                          </option>
                        );
                      })()}
                      {subjects.map((s: any) => {
                        const n = (s.subjectName || "").toLowerCase();
                        if (n.includes("chủ đề") || n.includes("chu de") || n === "chủ đề/chuyên đề") return null;
                        return (
                          <option key={s.id} value={s.id}>{s.subjectName}</option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 30-DAY SPACING WARNING BANNER CHO GIÁO VIÊN ĐƯỢC CHỌN */}
                  {loadingTeacherHistory && (
                    <div className="col-span-12 p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-teal-700 text-xs flex items-center gap-2 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-[#00A19A]" />
                      <span className="font-semibold">Đang kiểm tra lịch sử dự giờ đột xuất của giáo viên trong 30 ngày qua...</span>
                    </div>
                  )}

                  {!loadingTeacherHistory && teacherSurpriseHistory?.hasRecentSurprise && (
                    <div className="col-span-12 p-4 sm:p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 text-amber-950 flex flex-col gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-200/90 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <AlertTriangle className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h6 className="text-xs font-black text-amber-950 tracking-tight uppercase flex items-center gap-1.5">
                              <span>⚠️ Cảnh báo giãn cách dự giờ đột xuất</span>
                            </h6>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                              {teacherSurpriseHistory.count} lượt trong 30 ngày qua
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-amber-900 mt-1.5 leading-relaxed">
                            Giáo viên này đã có <strong>{teacherSurpriseHistory.count} lượt dự giờ đột xuất trong 30 ngày gần nhất</strong>. Lượt gần nhất vào ngày <strong>{teacherSurpriseHistory.recentSlot?.date}</strong> (cách đây <strong>{teacherSurpriseHistory.daysAgo} ngày</strong>) do <strong>{teacherSurpriseHistory.recentSlot?.evaluatorName} ({teacherSurpriseHistory.recentSlot?.evaluatorPosition})</strong> thực hiện với bài dạy <em>"{teacherSurpriseHistory.recentSlot?.topic}"</em> ({teacherSurpriseHistory.recentSlot?.subjectName} - {teacherSurpriseHistory.recentSlot?.className}).
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <span className="text-[11px] text-amber-800/90 font-medium italic">
                          💡 Để đảm bảo phân bổ dự giờ đồng đều và không tạo áp lực dồn dập cho giáo viên, Thầy/Cô vui lòng cân nhắc kỹ trước khi tiếp tục:
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSurpriseTeacherId("");
                              setTeacherSurpriseHistory(null);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition-colors text-xs cursor-pointer shadow-2xs"
                          >
                            Đổi giáo viên khác
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer bg-amber-100/90 hover:bg-amber-200/80 px-3.5 py-1.5 rounded-xl border border-amber-300 font-bold text-amber-950 transition-colors">
                            <input
                              type="checkbox"
                              checked={confirmedSpacingWarning}
                              onChange={e => setConfirmedSpacingWarning(e.target.checked)}
                              className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                            />
                            <span>Tôi đã cân nhắc & tiếp tục</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Ngày dự giờ */}

                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Ngày dự giờ *</span>
                    </label>
                    <input
                      type="date"
                      value={surpriseDate}
                      min={minAllowedDate}
                      onChange={e => setSurpriseDate(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    />
                  </div>

                  {/* 5. Tiết dự */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>{surpriseLevel === "Mầm non" ? "Khung giờ / Hoạt động dự *" : "Tiết dự *"}</span>
                    </label>
                    <select
                      value={surprisePeriod}
                      onChange={e => setSurprisePeriod(e.target.value)}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      {surpriseLevel === "Mầm non" && (
                        <>
                          <option value="HĐ Học sáng">Hoạt động học có chủ đích (08:30 - 09:15)</option>
                          <option value="HĐ Tiếng Anh">Làm quen Tiếng Anh (09:15 - 09:45)</option>
                          <option value="HĐ Góc/Ngoài trời">Hoạt động góc / Ngoài trời (09:45 - 10:30)</option>
                          <option value="HĐ Chiều">Hoạt động chiều / Năng khiếu (14:30 - 15:15)</option>
                        </>
                      )}
                      <option value="Tiết 1">Tiết 1 (07:30 - 08:15)</option>
                      <option value="Tiết 2">Tiết 2 (08:20 - 09:05)</option>
                      <option value="Tiết 3">Tiết 3 (09:20 - 10:05)</option>
                      <option value="Tiết 4">Tiết 4 (10:10 - 10:55)</option>
                      <option value="Tiết 5">Tiết 5 (13:30 - 14:15)</option>
                      <option value="Tiết 6">Tiết 6 (14:20 - 15:05)</option>
                      <option value="Tiết 7">Tiết 7 (15:10 - 15:55)</option>
                      <option value="Tiết 8">Tiết 8 (15:55 - 16:40)</option>
                    </select>
                  </div>

                  {/* 6. Cơ sở trường */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Cơ sở trường</span>
                    </label>
                    <select
                      value={surpriseCampusId}
                      onChange={e => {
                        setSurpriseCampusId(e.target.value);
                        setSurpriseClassId("");
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn cơ sở để chọn lớp --</option>
                      {campuses.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.campusName}</option>
                      ))}
                    </select>
                  </div>

                  {/* 7. Cấp học */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Cấp học</span>
                    </label>
                    <select
                      value={surpriseLevel}
                      onChange={e => {
                        const newLvl = e.target.value;
                        setSurpriseLevel(newLvl);
                        setSurpriseClassId("");
                        if (newLvl === "Mầm non") {
                          const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                          setSurpriseSubjectId(khacChuyenDeId);
                          setSurpriseSubjectName("Chủ đề/Chuyên đề");
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="Phổ thông K-12">Phổ thông K-12</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                      <option value="Mầm non">Mầm non</option>
                    </select>
                  </div>

                  {/* 8. Lớp học */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#00A19A]" />
                        <span>Lớp học *</span>
                      </span>
                      {filteredClassesForSurprise.length > 0 && (
                        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                          {filteredClassesForSurprise.length} lớp
                        </span>
                      )}
                    </label>
                    <select
                      value={surpriseClassId}
                      onChange={e => {
                        const clsId = e.target.value;
                        setSurpriseClassId(clsId);
                        const clsObj = classes.find((c: any) => c.id === clsId);
                        if (clsObj) {
                          setSurpriseClassName(clsObj.className);
                          if (clsObj.grade) setSurpriseGrade(clsObj.grade);
                          if (clsObj.level) setSurpriseLevel(clsObj.level);
                          if (clsObj.campusId && !surpriseCampusId) setSurpriseCampusId(clsObj.campusId);

                          // Tự động nhận diện Tổ chuyên môn theo Khối của lớp Mầm non
                          if (clsObj.level === "Mầm non") {
                            const gClean = (clsObj.grade || clsObj.className || "").toLowerCase();
                            let matchedDept = null;
                            if (gClean.includes("nha tre") || gClean.includes("nhà trẻ")) {
                              matchedDept = departments.find((d: any) => d.code === "NHA_TRE" || d.name.includes("Nhà Trẻ"));
                            } else if (gClean.includes("be") || gClean.includes("bé")) {
                              matchedDept = departments.find((d: any) => d.code === "MGB" || d.name.includes("Mẫu giáo Bé"));
                            } else if (gClean.includes("nho") || gClean.includes("nhỡ")) {
                              matchedDept = departments.find((d: any) => d.code === "MGN" || d.name.includes("Mẫu giáo Nhỡ"));
                            } else if (gClean.includes("lon") || gClean.includes("lớn")) {
                              matchedDept = departments.find((d: any) => d.code === "MGL" || d.name.includes("Mẫu giáo Lớn"));
                            }
                            if (matchedDept && (!surpriseDeptId || surpriseDeptId === "all")) {
                              setSurpriseDeptId(matchedDept.id);
                            }

                            // Gợi ý giáo viên chủ nhiệm của lớp nếu chưa chọn GV
                            if (clsObj.homeroomTeacherId && !surpriseTeacherId) {
                              setSurpriseTeacherId(clsObj.homeroomTeacherId);
                            }
                          }
                        }
                      }}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="">-- Chọn danh sách lớp --</option>
                      {filteredClassesForSurprise.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.className}</option>
                      ))}
                    </select>
                  </div>

                  {/* 9. Phòng học */}
                  <div className="col-span-12 sm:col-span-6 lg:col-span-3 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Phòng học</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Phòng 204, Phòng Lab..."
                      value={surpriseRoom}
                      onChange={e => setSurpriseRoom(e.target.value)}
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs placeholder:text-slate-400"
                    />
                  </div>

                  {/* 10. Chủ đề / Nội dung bài dạy */}
                  <div className="col-span-12 lg:col-span-6 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#00A19A]" />
                      <span>Chủ đề / Nội dung bài dạy *</span>
                    </label>
                    <input
                      type="text"
                      placeholder={surpriseLevel === "Mầm non" 
                        ? "VD: Chủ đề: Bản thân và gia đình, Hoạt động góc, STEAM, Khám phá khoa học..." 
                        : "VD: Bài 12: Phân tích số liệu và biểu đồ thống kê..."}
                      value={surpriseTopic}
                      onChange={e => setSurpriseTopic(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none bg-slate-50/60 hover:bg-white text-slate-800 transition-all shadow-2xs placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Thẻ Người dự giờ tự động */}
                <div className="bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-slate-50 rounded-2xl p-4 border border-teal-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#00A19A] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {currentTeacher?.teacherName ? currentTeacher.teacherName.charAt(0) : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider">Người dự giờ (Tự động):</span>
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{currentTeacher?.teacherName || "Tài khoản đăng nhập"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {currentTeacher?.email || "Email"} • Chức vụ: <span className="font-bold text-slate-700">{isTTCM ? "Tổ trưởng chuyên môn" : (currentTeacher?.position || "Ban ĐHCM / Quản lý")}</span>
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-3 py-1.5 text-[11px] font-bold rounded-xl bg-white border border-teal-200 text-teal-800 shadow-2xs shrink-0 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tự động ghi nhận</span>
                  </span>
                </div>
              </div>

              {/* SECTION 2: FORM ĐÁNH GIÁ 11 TIÊU CHÍ (CHUẨN 20 ĐIỂM) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 bg-teal-100 text-[#00A19A] rounded-md flex items-center justify-center text-xs font-black">2</span>
                    {surpriseLevel !== "Mầm non" ? "Phiếu Đánh Giá 11 Tiêu Chí (Tổng 20 điểm)" : "Phiếu Đánh Giá Mầm Non (Tổng 10 điểm)"}
                  </h5>

                  {/* Summary Score Box & Quick Actions */}
                  <div className="flex items-center flex-wrap gap-2.5">
                    <span className="text-xs font-black text-slate-600 uppercase">Tổng điểm:</span>
                    <span className="text-sm font-black text-teal-950 bg-teal-50 px-3.5 py-1.5 rounded-xl border border-teal-200 shadow-2xs">
                      {surpriseLevel !== "Mầm non" 
                        ? `${effectiveScoresK12.reduce((a, b) => a + b, 0).toFixed(2)} / 20.00đ`
                        : `${effectiveScoresMN.reduce((a, b) => a + b, 0).toFixed(2)} / 10.00đ`
                      }
                    </span>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      Xếp loại: {surpriseLevel !== "Mầm non" ? calculateK12Ranking(effectiveScoresK12) : calculateMamNonRanking(effectiveScoresMN)}
                    </span>

                    {/* Quick batch scoring buttons */}
                    <div className="flex items-center gap-1.5 pl-1">
                      <button
                        type="button"
                        onClick={handleSetAllMaxSafe}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Chấm điểm tối đa cho toàn bộ các tiêu chí"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Chấm nhanh Max ({surpriseLevel !== "Mầm non" ? "20/20" : "10/10"})</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetScoresSafe}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Đặt lại toàn bộ tiêu chí về 0 điểm"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Đặt lại 0đ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tiêu chí K-12 */}
                {surpriseLevel !== "Mầm non" ? (
                  <div className="space-y-6">
                    {K12_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += K12_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h6 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <span className="w-5 h-5 bg-rose-600 text-white rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h6>

                          <div className="space-y-2.5">
                            {sec.requirements.map((req, rSubIdx) => {
                              const globalIdx = reqStartIdx + rSubIdx;
                              const options = [];
                              for (let v = 0; v <= req.max; v += 0.25) {
                                options.push(Math.round(v * 100) / 100);
                              }

                              const currentScore = effectiveScoresK12[globalIdx] ?? 0;
                              const isMaxReached = currentScore === req.max;

                              return (
                                <div
                                  key={req.id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isMaxReached
                                      ? "bg-emerald-50/40 border-emerald-200/80 shadow-2xs"
                                      : currentScore > 0
                                        ? "bg-teal-50/30 border-teal-200/70 shadow-2xs"
                                        : "bg-slate-50/70 hover:bg-slate-50 border-slate-200/70"
                                  }`}
                                >
                                  <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                      <span className="text-[11px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                      {req.mandatoryText && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                                          isMaxReached
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                            : "bg-amber-50 text-amber-700 border-amber-300"
                                        }`}>
                                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                          {req.mandatoryText}
                                          {isMaxReached && (
                                            <span className="ml-0.5 font-black text-emerald-600">✓ Đạt Max</span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{req.text}</p>
                                  </div>

                                  {/* Interactive scoring section: Badge + Quick Pills + Dropdown */}
                                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Điểm:</span>
                                      <div
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border shadow-2xs transition-all ${
                                          isMaxReached
                                            ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-100"
                                            : currentScore > 0
                                              ? "bg-teal-600 text-white border-teal-700 shadow-teal-100"
                                              : "bg-slate-200 text-slate-700 border-slate-300"
                                        }`}
                                      >
                                        <span>{currentScore.toFixed(2)}đ</span>
                                        <span className="text-[10px] opacity-80">/ {req.max}đ</span>
                                        {isMaxReached && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </div>
                                      {isMaxReached ? (
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                                          ✓ Tối đa 100%
                                        </span>
                                      ) : currentScore > 0 ? (
                                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-lg border border-teal-200">
                                          Đạt {Math.round((currentScore / req.max) * 100)}%
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                          Chưa chấm
                                        </span>
                                      )}
                                    </div>

                                    {/* Score Pills & Dropdown */}
                                    <div className="flex items-center flex-wrap gap-1.5 justify-start md:justify-end">
                                      <div className="flex items-center flex-wrap gap-1">
                                        {options.map((o) => {
                                          const isSelected = currentScore === o;
                                          const isMax = o === req.max;
                                          return (
                                            <button
                                              key={o}
                                              type="button"
                                              onClick={() => handleUpdateK12Score(globalIdx, o)}
                                              className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                                                isSelected
                                                  ? isMax
                                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300/70 scale-105 font-black"
                                                    : o > 0
                                                      ? "bg-teal-600 text-white border-teal-700 shadow-xs ring-2 ring-teal-300/70 scale-105 font-black"
                                                      : "bg-slate-700 text-white border-slate-800 shadow-xs ring-2 ring-slate-300/70 scale-105 font-black"
                                                  : isMax
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                              }`}
                                              title={`Chọn ${o.toFixed(2)} điểm`}
                                            >
                                              {isMax ? `★ ${o}` : o}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <select
                                        value={currentScore}
                                        onChange={(e) => handleUpdateK12Score(globalIdx, parseFloat(e.target.value))}
                                        className={`rounded-xl border px-2 py-1 text-xs font-black outline-none shadow-2xs transition-all w-20 cursor-pointer ${
                                          isMaxReached
                                            ? "border-emerald-300 bg-emerald-50/70 text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                                            : currentScore > 0
                                              ? "border-teal-300 bg-teal-50/70 text-teal-800 focus:ring-2 focus:ring-teal-500"
                                              : "border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-slate-400"
                                        }`}
                                        title="Hoặc chọn điểm từ danh sách"
                                      >
                                        {options.map((o) => (
                                          <option key={o} value={o}>
                                            {o.toFixed(2)}đ
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {MAMNON_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += MAMNON_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h6 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                            <span className="w-5 h-5 bg-amber-600 text-white rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h6>

                          <div className="space-y-2.5">
                            {sec.requirements.map((req, rSubIdx) => {
                              const globalIdx = reqStartIdx + rSubIdx;
                              const options = [];
                              for (let v = 0; v <= req.max; v += 0.25) {
                                options.push(Math.round(v * 100) / 100);
                              }

                              const currentScore = effectiveScoresMN[globalIdx] ?? 0;
                              const isMaxReached = currentScore === req.max;

                              return (
                                <div
                                  key={req.id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isMaxReached
                                      ? "bg-emerald-50/40 border-emerald-200/80 shadow-2xs"
                                      : currentScore > 0
                                        ? "bg-amber-50/30 border-amber-200/70 shadow-2xs"
                                        : "bg-slate-50/70 hover:bg-slate-50 border-slate-200/70"
                                  }`}
                                >
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                      <span className="text-[11px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                      {isMaxReached && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-emerald-50 text-emerald-700 border-emerald-300">
                                          ✓ Đạt Max
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{req.text}</p>
                                  </div>

                                  {/* Interactive scoring section: Badge + Quick Pills + Dropdown */}
                                  <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Điểm:</span>
                                      <div
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border shadow-2xs transition-all ${
                                          isMaxReached
                                            ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-100"
                                            : currentScore > 0
                                              ? "bg-amber-600 text-white border-amber-700 shadow-amber-100"
                                              : "bg-slate-200 text-slate-700 border-slate-300"
                                        }`}
                                      >
                                        <span>{currentScore.toFixed(2)}đ</span>
                                        <span className="text-[10px] opacity-80">/ {req.max}đ</span>
                                        {isMaxReached && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                      </div>
                                      {isMaxReached ? (
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-200">
                                          ✓ Tối đa 100%
                                        </span>
                                      ) : currentScore > 0 ? (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-lg border border-amber-200">
                                          Đạt {Math.round((currentScore / req.max) * 100)}%
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                                          Chưa chấm
                                        </span>
                                      )}
                                    </div>

                                    {/* Score Pills & Dropdown */}
                                    <div className="flex items-center flex-wrap gap-1.5 justify-start md:justify-end">
                                      <div className="flex items-center flex-wrap gap-1">
                                        {options.map((o) => {
                                          const isSelected = currentScore === o;
                                          const isMax = o === req.max;
                                          return (
                                            <button
                                              key={o}
                                              type="button"
                                              onClick={() => handleUpdateMNScore(globalIdx, o)}
                                              className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                                                isSelected
                                                  ? isMax
                                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300/70 scale-105 font-black"
                                                    : o > 0
                                                      ? "bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-300/70 scale-105 font-black"
                                                      : "bg-slate-700 text-white border-slate-800 shadow-xs ring-2 ring-slate-300/70 scale-105 font-black"
                                                  : isMax
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-bold"
                                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                              }`}
                                              title={`Chọn ${o.toFixed(2)} điểm`}
                                            >
                                              {isMax ? `★ ${o}` : o}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <select
                                        value={currentScore}
                                        onChange={(e) => handleUpdateMNScore(globalIdx, parseFloat(e.target.value))}
                                        className={`rounded-xl border px-2 py-1 text-xs font-black outline-none shadow-2xs transition-all w-20 cursor-pointer ${
                                          isMaxReached
                                            ? "border-emerald-300 bg-emerald-50/70 text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                                            : currentScore > 0
                                              ? "border-amber-300 bg-amber-50/70 text-amber-800 focus:ring-2 focus:ring-amber-500"
                                              : "border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-slate-400"
                                        }`}
                                        title="Hoặc chọn điểm từ danh sách"
                                      >
                                        {options.map((o) => (
                                          <option key={o} value={o}>
                                            {o.toFixed(2)}đ
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Comment Presets for Surprise Observation */}
                <QuickCommentPresets
                  isPreschool={surpriseLevel === "Mầm non"}
                  onAddStrength={(text) => setSurpriseStrengths((prev: string) => prev ? `${prev}\n• ${text}` : `• ${text}`)}
                  onAddImprovement={(text) => setSurpriseImprovements((prev: string) => prev ? `${prev}\n• ${text}` : `• ${text}`)}
                />

                {/* Qualitative Feedback Textareas */}
                <div className="space-y-4 pt-2">
                  <h6 className="font-black text-xs text-slate-800 uppercase tracking-wider">Nhận xét & Góp ý chuyên môn</h6>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">1. Ưu điểm nổi bật của tiết dạy</label>
                    <textarea
                      placeholder="Những điểm mạnh, sáng tạo trong phương pháp và tổ chức hoạt động của giáo viên..."
                      rows={2}
                      value={surpriseStrengths}
                      onChange={e => setSurpriseStrengths(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none resize-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">2. Nội dung cần cải thiện / Góp ý phát triển</label>
                    <textarea
                      placeholder="Các gợi ý phương pháp, phân bổ thời gian hoặc điều chỉnh hoạt động học sinh tốt hơn..."
                      rows={2}
                      value={surpriseImprovements}
                      onChange={e => setSurpriseImprovements(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none resize-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">3. Đề xuất & Kiến nghị chuyên môn</label>
                    <textarea
                      placeholder="Đề xuất bồi dưỡng chuyên môn, nhân rộng tiết dạy mẫu hoặc kế hoạch hỗ trợ tiếp theo..."
                      rows={2}
                      value={surpriseGeneral}
                      onChange={e => setSurpriseGeneral(e.target.value)}
                      className="w-full text-xs font-medium p-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00A19A] focus:border-[#00A19A] outline-none resize-none bg-slate-50/50 hover:bg-white transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Overall Rating & Automatic Reason */}
                {(() => {
                  const isMN = surpriseLevel === "Mầm non";
                  const rankInfo = isMN 
                    ? getMamNonRankingDetails(effectiveScoresMN)
                    : getK12RankingDetails(effectiveScoresK12);
                  const currentRank = surpriseOverall || rankInfo.rating;

                  return (
                    <div className="flex flex-col gap-4 p-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-150">
                        <div>
                          <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            Xếp loại tiết dạy tổng thể (Tự động)
                          </label>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Hệ thống tự động phân tích điểm số các tiêu chuẩn để xếp loại và giải trình lý do
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-slate-500">Kết quả xếp loại:</span>
                          <span className={`px-3.5 py-1 text-xs font-black uppercase rounded-xl border shadow-2xs ${
                            currentRank === "Giỏi" || currentRank === "Tốt"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : currentRank === "Khá"
                              ? "bg-sky-50 text-sky-700 border-sky-300"
                              : currentRank === "Trung bình" || currentRank === "Đạt"
                              ? "bg-amber-50 text-amber-700 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-300"
                          }`}>
                            {currentRank}
                          </span>
                        </div>
                      </div>

                      {/* Reason Callout Box */}
                      <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                        rankInfo.color === "emerald"
                          ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-950"
                          : rankInfo.color === "sky"
                          ? "bg-sky-50/80 border-sky-200/80 text-sky-950"
                          : rankInfo.color === "amber"
                          ? "bg-amber-50/80 border-amber-200/80 text-amber-950"
                          : "bg-rose-50/80 border-rose-200/80 text-rose-950"
                      }`}>
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h6 className="text-[11px] font-black uppercase tracking-wider">
                            Lý do xếp loại:
                          </h6>
                          <p className="text-xs font-medium leading-relaxed">
                            {rankInfo.reason}
                          </p>
                        </div>
                      </div>

                      {/* Rating selection buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        {(isMN
                          ? [["Tốt","bg-emerald-600"],["Khá","bg-sky-600"],["Đạt","bg-teal-600"],["Không đạt","bg-rose-600"]]
                          : [["Giỏi","bg-emerald-600"],["Khá","bg-sky-600"],["Trung bình","bg-amber-500"],["Không xếp loại","bg-rose-600"]]
                        ).map(([r, color]) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSurpriseOverall(r)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              currentRank === r
                                ? `${color} text-white shadow-md ring-2 ring-offset-1 ring-slate-400/40`
                                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {currentRank === r && <Check className="w-3.5 h-3.5" />}
                            <span>{r}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons: Lưu nháp / Hoàn thành */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                {surpriseQuota?.isExceeded && (
                  <span className="text-xs text-rose-600 font-black mr-auto flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Đã hết hạn ngạch dự giờ đột xuất tháng ({surpriseQuota.currentSurpriseCount}/{surpriseQuota.maxSurpriseAllowed} tiết).
                  </span>
                )}

                {(() => {
                  const doSubmitSurprise = (isDraft: boolean) => {
                    if (surpriseQuota?.isExceeded) return;
                    if (teacherSurpriseHistory?.hasRecentSurprise && !confirmedSpacingWarning) {
                      setPendingDraftSubmit(isDraft);
                      setShowSpacingConfirmModal(true);
                      return;
                    }
                    if (joinExistingSlot && existingSurpriseSlot?.id) {
                      handleSurpriseSubmit(isDraft, { existingSlotId: existingSurpriseSlot.id });
                    } else if (dismissDuplicateNotice) {
                      handleSurpriseSubmit(isDraft, { forceNewSlot: true });
                    } else {
                      handleSurpriseSubmit(isDraft);
                    }
                  };

                  return (
                    <>
                      <button
                        type="button"
                        disabled={surpriseSubmitting || surpriseQuota?.isExceeded}
                        onClick={() => doSubmitSurprise(true)}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Save className="w-4 h-4 text-slate-500" />
                        {surpriseSubmitting ? "Đang lưu..." : "Lưu nháp"}
                      </button>

                      <button
                        type="button"
                        disabled={surpriseSubmitting || surpriseQuota?.isExceeded}
                        onClick={() => doSubmitSurprise(false)}
                        className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                          surpriseQuota?.isExceeded
                            ? "bg-slate-300 text-slate-500 shadow-none"
                            : "bg-gradient-to-r from-[#00A19A] via-[#008B85] to-emerald-600 hover:from-[#008B85] hover:to-emerald-700 text-white shadow-teal-900/20"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        {surpriseSubmitting ? "Đang xử lý..." : (joinExistingSlot ? "Hoàn thành đánh giá (Gộp phiên)" : "Hoàn thành đánh giá")}
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* MODAL XÁC NHẬN CẢNH BÁO GIÃN CÁCH 30 NGÀY */}
              {showSpacingConfirmModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mx-auto shadow-xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-base font-black text-slate-800">
                        Xác nhận đăng ký Dự giờ đột xuất
                      </h4>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        Giáo viên <strong>{teacherSurpriseHistory?.recentSlot?.teacherName || "này"}</strong> đã có <strong>{teacherSurpriseHistory?.count} lượt dự giờ đột xuất trong 30 ngày gần nhất</strong> (ngày {teacherSurpriseHistory?.recentSlot?.date} do {teacherSurpriseHistory?.recentSlot?.evaluatorName} thực hiện).
                      </p>
                      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-left text-xs text-amber-900 font-semibold space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>💡 Khuyến nghị chuyên môn:</span>
                        </div>
                        <p className="text-[11px] font-normal leading-relaxed text-amber-800">
                          Để đảm bảo tâm lý thoải mái và phân bổ hoạt động hỗ trợ đồng đều cho đội ngũ, Thầy/Cô có thể cân nhắc đổi sang giáo viên khác chưa được dự giờ gần đây.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSpacingConfirmModal(false);
                          setSurpriseTeacherId("");
                          setTeacherSurpriseHistory(null);
                        }}
                        className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Đổi giáo viên khác
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmedSpacingWarning(true);
                          setShowSpacingConfirmModal(false);
                          if (joinExistingSlot && existingSurpriseSlot?.id) {
                            handleSurpriseSubmit(pendingDraftSubmit, { existingSlotId: existingSurpriseSlot.id });
                          } else if (dismissDuplicateNotice) {
                            handleSurpriseSubmit(pendingDraftSubmit, { forceNewSlot: true });
                          } else {
                            handleSurpriseSubmit(pendingDraftSubmit);
                          }
                        }}
                        className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-[#00A19A] hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-md shadow-teal-900/20 cursor-pointer"
                      >
                        Xác nhận tiếp tục
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : creationMode === "OBSERVER_REQUEST" ? (

            /* ===== FORM 2: GVBM XIN ĐĂNG KÝ DỰ GIỜ ===== */
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4 text-xs font-semibold bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/80">
              <div className="bg-indigo-500/10 border border-indigo-200/70 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-indigo-950 leading-relaxed">
                  <span className="font-extrabold text-indigo-900">Đề xuất xin dự giờ:</span> Chọn Tổ chuyên môn & Giáo viên dạy, cùng Cơ sở, Khối lớp và Tiết học mong muốn. Yêu cầu sẽ được gửi tới Giáo viên dạy để xem xét phê duyệt.
                </p>
              </div>

              {/* Group 1: Tổ chuyên môn & Giáo viên dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">1. Chọn Tổ chuyên môn</label>
                  <select
                    value={reqDeptId}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      setReqDeptId(newDeptId);
                      if (newDeptId && reqTeacherId) {
                        const curTeacher = teachers.find((t: any) => t.id === reqTeacherId);
                        if (curTeacher && !isTeacherInDepartment(curTeacher, newDeptId)) {
                          setReqTeacherId("");
                        }
                      }
                      if (newDeptId) {
                        const selectedDept = departments.find((d: any) => d.id === newDeptId);
                        if (selectedDept && isPreschoolDepartment(selectedDept.name || selectedDept.code || "")) {
                          const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                          setReqSubjectId(khacChuyenDeId);
                          if (!reqLevel || reqLevel === "ALL") {
                            setReqLevel("Mầm non");
                          }
                        }
                      }
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">Tất cả các Tổ chuyên môn</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide flex items-center justify-between">
                    <span>2. Chọn Giáo viên dạy *</span>
                    {filteredTeachersForRequest.length > 0 && (
                      <span className="text-[10px] text-indigo-600 font-semibold lowercase">
                        ({filteredTeachersForRequest.length} giáo viên)
                      </span>
                    )}
                  </label>
                  <select
                    value={reqTeacherId}
                    onChange={e => {
                      const tId = e.target.value;
                      setReqTeacherId(tId);
                      if (tId) {
                        const tObj = teachers.find((t: any) => t.id === tId);
                        if (tObj) {
                          // 1. Tự động ánh xạ Tổ chuyên môn
                          const tDept = departments.find((d: any) => d.id === tObj.departmentId) || tObj.departmentRel;
                          if (tDept?.id) {
                            setReqDeptId(tDept.id);
                          }
                          // 2. Tự động ánh xạ Cơ sở
                          if (tObj.campusId) {
                            setReqCampusId(tObj.campusId);
                          }
                          // 3. Nếu là Mầm non
                          if (tDept && isPreschoolDepartment(tDept.name || tDept.code || "")) {
                            const khacChuyenDeId = getKhacChuyenDeSubjectId(subjects);
                            setReqSubjectId(khacChuyenDeId);
                            if (!reqLevel || reqLevel === "ALL") {
                              setReqLevel("Mầm non");
                            }
                          }
                        }
                      }
                    }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn Giáo viên dạy --</option>
                    {filteredTeachersForRequest.map((t: any) => {
                      const depts = getTeacherAllDeptNames(t, departments);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ""} {depts ? `(${depts})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Card ánh xạ tự động thông tin Giáo viên dạy: Họ và tên, Mã NV, Tổ CM, Email */}
              {(() => {
                const selTeacher = teachers.find((t: any) => t.id === reqTeacherId);
                if (!selTeacher) return null;
                const deptName = getTeacherAllDeptNames(selTeacher, departments) || selTeacher.departmentRel?.name || "Chuyên môn";
                const campusObj = campuses.find((c: any) => c.id === selTeacher.campusId) || selTeacher.campus;
                let resolvedEmail = (selTeacher.email || "").trim();
                if (selTeacher.teacherCode === "0201000094" || selTeacher.teacherName?.includes("Phạm Nguyên Thông")) {
                  resolvedEmail = "thongpn@skylineschool.edu.vn";
                } else if (selTeacher.teacherCode === "0101000105") {
                  resolvedEmail = "thangdx@skylineschool.edu.vn";
                } else if (selTeacher.teacherCode === "0101000648") {
                  resolvedEmail = "minhttn@skylineschool.edu.vn";
                } else if (selTeacher.teacherCode === "0201000407") {
                  resolvedEmail = "nguyentt@skyline.edu.vn";
                } else if (selTeacher.teacherCode === "0201000817") {
                  resolvedEmail = "thuongmth@skylineschool.edu.vn";
                }

                return (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-teal-200/90 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          {selTeacher.teacherName}
                        </span>
                        <span className="px-2 py-0.5 bg-white border border-teal-200 text-teal-800 rounded-md font-extrabold text-[11px]">
                          Mã NV: {selTeacher.teacherCode || "N/A"}
                        </span>
                        <span className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-800 rounded-md font-extrabold text-[11px]">
                          Tổ CM: {deptName}
                        </span>
                        {campusObj?.campusName && (
                          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md font-semibold text-[11px]">
                            {campusObj.campusName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Hệ thống đã tự động ánh xạ thông tin giáo viên, mã NV, tổ CM và địa chỉ email nhận thông báo.
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-emerald-100" />
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">Email nhận thông báo</span>
                        <span className="text-xs font-black text-white">{resolvedEmail || "Chưa có email"}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Group 2: Môn học & Chủ đề/Tên bài dạy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">3. Chọn Môn học *</label>
                  <select
                    value={reqSubjectId}
                    onChange={e => setReqSubjectId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                    {!subjects.some((s: any) => {
                      const sName = (s.subjectName || "").toLowerCase();
                      const sNorm = sName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      return (sNorm.includes("khac") && sNorm.includes("chuyen de")) || sName === "khác/chuyên đề";
                    }) && (
                      <option value="Khác/Chuyên đề">Khác/Chuyên đề</option>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">4. Tên bài dạy / Chủ đề dự giờ *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Cấp số cộng, Sự nảy mầm của hạt..."
                    value={reqTopic}
                    onChange={e => setReqTopic(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Group 3: Cơ sở & Cấp học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">5. Chọn Cơ sở *</label>
                  <select
                    value={reqCampusId}
                    onChange={e => { setReqCampusId(e.target.value); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.campusName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">6. Chọn Cấp học *</label>
                  <select
                    value={reqLevel}
                    onChange={e => { setReqLevel(e.target.value); setReqGrade(""); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn cấp học --</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>
              </div>

              {/* Group 4: Khối & Lớp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">7. Chọn Khối lớp *</label>
                  <select
                    value={reqGrade}
                    onChange={e => { setReqGrade(e.target.value); setReqClassId(""); }}
                    required
                    disabled={!reqLevel}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn khối học --</option>
                    {getGradesForLevel(reqLevel).map((g: any) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">8. Chọn Lớp học *</label>
                  <select
                    value={reqClassId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      setReqClassId(selectedId);
                      if (selectedId) {
                        const selClass = classes.find((c: any) => c.id === selectedId);
                        if (selClass) {
                          if (selClass.campusId && !reqCampusId) {
                            setReqCampusId(selClass.campusId);
                          }
                          if (selClass.grade && (!reqGrade || reqGrade === "all")) {
                            const cleanG = String(selClass.grade).replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
                            setReqGrade(`Khối ${cleanG}`);
                          }
                          if (!reqLevel) {
                            const lvl = (selClass.level || "").toLowerCase();
                            if (lvl.includes("thcs")) setReqLevel("THCS");
                            else if (lvl.includes("thpt")) setReqLevel("THPT");
                            else if (lvl.includes("tieu") || lvl.includes("tiểu")) setReqLevel("Tiểu học");
                            else if (lvl.includes("mam") || lvl.includes("mầm")) setReqLevel("Mầm non");
                          }
                        }
                      }
                    }}
                    required
                    disabled={!reqCampusId && !reqGrade && !reqLevel}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 disabled:opacity-50"
                  >
                    <option value="">
                      {filteredReqClasses.length > 0
                        ? `-- Chọn lớp học (${filteredReqClasses.length} lớp) --`
                        : (reqCampusId ? "Không có lớp học phù hợp" : "-- Chọn lớp học --")}
                    </option>
                    {filteredReqClasses.map((c: any) => {
                      const campusObj = campuses.find((cp: any) => cp.id === c.campusId || cp.campusCode === c.campusId);
                      const campusLabel = campusObj ? (campusObj.campusCode || campusObj.campusName) : "";
                      const gLabel = c.grade ? `Khối ${String(c.grade).replace(/Khối\s+/gi, "")}` : "";
                      return (
                        <option key={c.id} value={c.id}>
                          {c.className} {gLabel ? `(${gLabel})` : ""} {campusLabel ? `[${campusLabel}]` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Group 5: Tiết & Ngày */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">9. Tiết học dự *</label>
                  <select
                    value={reqPeriod}
                    onChange={e => setReqPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  >
                    {periodOptions.map((p: any) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">10. Ngày dạy dự kiến *</label>
                  <input
                    type="date"
                    value={reqDate}
                    min={minAllowedDate}
                    onChange={e => setReqDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-indigo-900 uppercase tracking-wide">11. Ghi chú / Lời nhắn tới GV dạy</label>
                <textarea
                  placeholder="Ghi chú thêm về nội dung bài dạy cần quan sát, yêu cầu hỗ trợ..."
                  rows={2}
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md shadow-indigo-600/25 text-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý, vui lòng chờ...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gửi Đề xuất Xin Dự Giờ
                  </>
                )}
              </button>
            </form>
          ) : creationMode === "ASSIGNED" ? (
            /* ===== FORM 4: CHỈ ĐỊNH DỰ GIỜ (BGH/GĐCS, QLCM, TTCM) ===== */
            <form onSubmit={handleAssignedFormSubmit} className="flex flex-col gap-5 text-xs font-semibold bg-purple-50/20 p-5 sm:p-6 rounded-3xl border border-purple-100 shadow-sm animate-in fade-in duration-300">
              
              {/* Banner Hướng dẫn nghiệp vụ */}
              <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-indigo-500/10 border border-purple-200 rounded-2xl p-4 flex items-start gap-3.5">
                <div className="size-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <UserCheck className="size-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-purple-900 text-xs uppercase tracking-wide">
                    Chỉ định dự giờ chuyên môn
                  </h4>
                  <p className="text-[11px] font-medium text-purple-950 leading-relaxed">
                    Cán bộ quản lý (BGH/GĐCS, QLCM, TTCM) chủ động tạo lượt dự giờ cho giáo viên và phân công người dự. <strong>Lượt dự giờ này không yêu cầu giáo viên được dự phê duyệt</strong> và có hiệu lực ngay khi lưu thành công.
                  </p>
                </div>
              </div>

              {/* Nhóm 1: Năm học & Khối học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    1. Năm học
                  </label>
                  <select
                    value={assignedAcademicYearId}
                    onChange={e => setAssignedAcademicYearId(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Năm học hiện hành --</option>
                    {(props.academicYears || []).map((ay: any) => (
                      <option key={ay.id} value={ay.id}>{ay.name || ay.title} {ay.status === "ACTIVE" ? "(Đang diễn ra)" : ""}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    2. Khối học *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (assignedLevel !== "Phổ thông K-12") {
                          setAssignedLevel("Phổ thông K-12");
                          setAssignedPeriod("Tiết 1");
                          setAssignedGrade("Khối 10");
                          setAssignedDeptId("");
                          setAssignedTeacherId("");
                          setObserverFilterDeptId("");
                          setAssignedClassId("");
                          setAssignedClassName("");
                          setAssignedSubjectId("");
                          setAssignedSubjectName("");
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                        assignedLevel === "Phổ thông K-12"
                          ? "bg-purple-700 text-white border-purple-700 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Phổ thông (K-12)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (assignedLevel !== "Mầm non") {
                          setAssignedLevel("Mầm non");
                          setAssignedPeriod("HĐ Học sáng");
                          setAssignedGrade("Mầm non");
                          setAssignedDeptId("");
                          setAssignedTeacherId("");
                          setObserverFilterDeptId("");
                          setAssignedClassId("");
                          setAssignedClassName("");
                          const khacChuyenDeId = typeof getKhacChuyenDeSubjectId === "function" ? getKhacChuyenDeSubjectId(subjects) : "";
                          setAssignedSubjectId(khacChuyenDeId);
                          setAssignedSubjectName("Chủ đề/Chuyên đề");
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                        assignedLevel === "Mầm non"
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      Mầm non
                    </button>
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Cơ sở & Lớp học (Lớp học map theo cơ sở, hoàn toàn độc lập với GV) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    3. Cơ sở *
                  </label>
                  <select
                    value={assignedCampusId}
                    onChange={e => {
                      const nextCampusId = e.target.value;
                      setAssignedCampusId(nextCampusId);
                      setAssignedClassId("");
                      setAssignedClassName("");
                    }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {(campuses || []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.campusName || c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    <span>4. Lớp học *</span>
                    <span className="text-[10px] text-purple-600 font-bold">
                      Map theo cơ sở ({availableClassesForAssigned.length} lớp)
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={assignedClassId}
                      onChange={e => {
                        const val = e.target.value;
                        setAssignedClassId(val);
                        const found = (classes || []).find((c: any) => c.id === val);
                        if (found) setAssignedClassName(found.name || found.className);
                      }}
                      className="w-1/2 text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                    >
                      <option value="">
                        {!assignedCampusId
                          ? "-- Chọn cơ sở trước --"
                          : availableClassesForAssigned.length > 0
                          ? `-- Chọn lớp (${availableClassesForAssigned.length} lớp) --`
                          : "-- Không có lớp --"}
                      </option>
                      {availableClassesForAssigned.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name || c.className}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Hoặc nhập tên lớp..."
                      value={assignedClassName}
                      onChange={e => setAssignedClassName(e.target.value)}
                      required
                      className="w-1/2 text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Nhóm 3: Tổ chuyên môn & Giáo viên được dự (Chỉ định) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                    <span>5. Tổ chuyên môn</span>
                    <span className="text-[10px] text-purple-600 font-bold">
                      {levelFilteredAssignedDepts.length} {assignedLevel === "Mầm non" ? "TCM/BGH Mầm non" : "TCM Phổ thông"}
                    </span>
                  </label>
                  <select
                    value={assignedDeptId}
                    onChange={e => {
                      setAssignedDeptId(e.target.value);
                      setAssignedTeacherId("");
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                  >
                    <option value="">
                      {assignedLevel === "Mầm non"
                        ? `-- Tất cả TCM & BGH Mầm non (${levelFilteredAssignedDepts.length} tổ) --`
                        : `-- Tất cả TCM Phổ thông (${levelFilteredAssignedDepts.length} tổ) --`}
                    </option>
                    {(levelFilteredAssignedDepts || []).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name || d.departmentName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-purple-900 uppercase tracking-wide flex items-center justify-between">
                    <span>6. Giáo viên được dự (Chỉ định) *</span>
                    <span className="text-[10px] text-purple-600 font-semibold lowercase">Không cần GV duyệt</span>
                  </label>
                  <select
                    value={assignedTeacherId}
                    onChange={e => setAssignedTeacherId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border-2 border-purple-300 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800 shadow-2xs"
                  >
                    <option value="">-- Chọn giáo viên được dự --</option>
                    {(teachers || [])
                      .filter((t: any) => {
                        if (assignedDeptId) {
                          if (t.departmentId === assignedDeptId) return true;
                          const hasDa = t.departmentAssignments?.some((da: any) => da.departmentId === assignedDeptId);
                          return Boolean(hasDa);
                        }
                        if (levelFilteredDeptIds.size > 0) {
                          const inMainDept = t.departmentId && levelFilteredDeptIds.has(t.departmentId);
                          if (inMainDept) return true;
                          const inAssigned = t.departmentAssignments?.some((da: any) => levelFilteredDeptIds.has(da.departmentId));
                          return Boolean(inAssigned);
                        }
                        return true;
                      })
                      .map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.teacherName} ({t.teacherCode || "-"}) • {t.departmentRel?.name || (departments || []).find((d: any) => d.id === t.departmentId)?.name || "Tổ CM"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Nhóm 4: Ngày & Tiết học */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    7. Ngày dự giờ *
                  </label>
                  <input
                    type="date"
                    value={assignedDate}
                    min={minAllowedDate}
                    onChange={e => setAssignedDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    8. Tiết học / Khung giờ *
                  </label>
                  <select
                    value={assignedPeriod}
                    onChange={e => setAssignedPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                  >
                    {assignedLevel === "Mầm non" ? (
                      <>
                        <option value="HĐ Học sáng">HĐ Học sáng (08:30 - 09:15)</option>
                        <option value="HĐ Tiếng Anh">HĐ Tiếng Anh (09:15 - 09:45)</option>
                        <option value="HĐ Góc/Ngoài trời">HĐ Góc/Ngoài trời (09:45 - 10:30)</option>
                        <option value="HĐ Chiều">HĐ Chiều (14:30 - 15:15)</option>
                      </>
                    ) : (
                      <>
                        <option value="Tiết 1">Tiết 1 (07:30 - 08:15)</option>
                        <option value="Tiết 2">Tiết 2 (08:25 - 09:10)</option>
                        <option value="Tiết 3">Tiết 3 (09:30 - 10:15)</option>
                        <option value="Tiết 4">Tiết 4 (10:25 - 11:10)</option>
                        <option value="Tiết 5">Tiết 5 (13:00 - 13:45)</option>
                        <option value="Tiết 6">Tiết 6 (13:55 - 14:40)</option>
                        <option value="Tiết 7">Tiết 7 (15:00 - 15:45)</option>
                        <option value="Tiết 8">Tiết 8 (15:55 - 16:40)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    9. Phòng học / Địa điểm
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Phòng 204, Sân bóng..."
                    value={assignedRoom}
                    onChange={e => setAssignedRoom(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Nhóm 5: Người dự (Multi-select có chọn TCM phụ trách và tìm kiếm theo Tên/Mã GV) */}
              <div className="flex flex-col gap-3 p-4 bg-purple-50/50 rounded-2xl border-2 border-purple-200/90 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[11px] font-black text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="size-4 text-purple-600" />
                    <span>10. Người dự (Phân công cán bộ/GV đi dự) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Nút bấm nhanh phân công bản thân người tạo */}
                    {currentTeacher?.id && currentTeacher.id !== assignedTeacherId && !assignedObserverIds.includes(currentTeacher.id) && (
                      <button
                        type="button"
                        onClick={() => setAssignedObserverIds(prev => [...prev, currentTeacher.id])}
                        className="px-2.5 py-1 rounded-lg bg-white text-purple-700 hover:bg-purple-100 border border-purple-300 text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        title="Tự thêm mình vào danh sách tham gia dự giờ"
                      >
                        <UserCheck className="size-3.5 text-purple-600" />
                        <span>+ Phân công tôi đi dự</span>
                      </button>
                    )}
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-200/80 text-purple-900 border border-purple-300/80">
                      {assignedObserverIds.length > 0 ? `Đã phân công ${assignedObserverIds.length} người` : "Chưa chọn người dự"}
                    </span>
                  </div>
                </div>

                {/* Danh sách người dự đã chọn */}
                {assignedObserverIds.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-purple-200/80 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span>Danh sách cán bộ / giáo viên được phân công dự ({assignedObserverIds.length}):</span>
                      {assignedObserverIds.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => setAssignedObserverIds([])}
                          className="text-rose-600 hover:text-rose-700 hover:underline cursor-pointer text-[10px]"
                        >
                          Xóa tất cả
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {assignedObserverIds.map(id => {
                        const obsTeacher = (teachers || []).find((t: any) => t.id === id);
                        const isMe = currentTeacher?.id === id;
                        const tDept = obsTeacher?.departmentRel?.name || (departments || []).find((d: any) => d.id === obsTeacher?.departmentId)?.name || "Chuyên môn";
                        return (
                          <span
                            key={id}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                              isMe
                                ? "bg-purple-100 text-purple-950 border-purple-300 ring-2 ring-purple-300/50"
                                : "bg-white text-slate-800 border-purple-200 hover:border-purple-300"
                            }`}
                          >
                            <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                            <div className="flex flex-col text-left">
                              <span className="font-black text-slate-900 leading-tight">
                                {obsTeacher?.teacherName || "Cán bộ"} {isMe ? "(Tôi)" : ""}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {obsTeacher?.teacherCode ? `Mã: ${obsTeacher.teacherCode}` : ""} • Tổ: {tDept}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAssignedObserverIds(prev => prev.filter(x => x !== id))}
                              className="size-5 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center text-xs font-black transition-colors cursor-pointer ml-1"
                              title="Xóa người này khỏi danh sách dự"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Khung điều khiển 2 cột: 1. Chọn TCM phụ trách | 2. Ô tìm kiếm Tên/Mã GV */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Cột 1: Chọn TCM */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-purple-900 uppercase tracking-wide flex items-center gap-1">
                      <Filter className="size-3 text-purple-600" />
                      <span>1. Chọn Tổ chuyên môn</span>
                    </label>
                    <select
                      value={observerFilterDeptId}
                      onChange={e => setObserverFilterDeptId(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-purple-200 bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs"
                    >
                      <option value="">
                        {assignedLevel === "Mầm non"
                          ? `-- Tất cả TCM & BGH Mầm non (${levelFilteredAssignedDepts.length} tổ) --`
                          : `-- Tất cả TCM Phổ thông (${levelFilteredAssignedDepts.length} tổ) --`}
                      </option>
                      {levelFilteredAssignedDepts.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.departmentName} {d.code ? `(${d.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cột 2: Gõ tên Giáo viên hoặc Mã GV */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-purple-900 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Search className="size-3 text-purple-600" />
                        <span>2. Gõ tên Giáo viên hoặc Mã GV</span>
                      </span>
                      {observerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setObserverSearchQuery("")}
                          className="text-[10px] text-slate-400 hover:text-purple-700 font-bold cursor-pointer"
                        >
                          Xóa tìm kiếm
                        </button>
                      )}
                    </label>
                    <div className="relative flex items-center">
                      <Search className="size-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Gõ tên GV hoặc mã GV (VD: Nam, GV012)..."
                        value={observerSearchQuery}
                        onChange={e => setObserverSearchQuery(e.target.value)}
                        className="w-full text-xs font-bold pl-8.5 pr-8 py-2.5 rounded-xl border border-purple-200 bg-white text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs placeholder:font-normal placeholder:text-slate-400"
                      />
                      {observerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setObserverSearchQuery("")}
                          className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs font-black cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropdown danh sách GV phù hợp để bấm chọn */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold px-1">
                    <span>Chọn giáo viên để phân công:</span>
                    <span>{availableTeachersForObservation.length} giáo viên phù hợp</span>
                  </div>
                  <select
                    value=""
                    onChange={e => {
                      const val = e.target.value;
                      if (val && !assignedObserverIds.includes(val)) {
                        setAssignedObserverIds(prev => [...prev, val]);
                        if (observerSearchQuery) setObserverSearchQuery("");
                      }
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-500 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800 transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="">
                      {availableTeachersForObservation.length > 0
                        ? `+ Bấm để chọn Giáo viên tham gia dự giờ (${availableTeachersForObservation.length} người)...`
                        : (observerSearchQuery || observerFilterDeptId ? "Không tìm thấy giáo viên nào phù hợp bộ lọc" : "Không có giáo viên khả dụng")}
                    </option>
                    {availableTeachersForObservation.map((t: any) => {
                      const deptName = t.departmentRel?.name || (departments || []).find((d: any) => d.id === t.departmentId)?.name || "Chuyên môn";
                      return (
                        <option key={t.id} value={t.id}>
                          + {t.teacherName} ({t.teacherCode || "Mã: -"}) • Tổ: {deptName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Nhóm 6: Chuyên đề, Ghi chú & Hình thức */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    11. Tên chuyên đề / Nội dung trọng tâm
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Kiểm tra chuyên môn định kỳ phương pháp dạy học..."
                    value={assignedTopic}
                    onChange={e => setAssignedTopic(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    12. Hình thức dự giờ
                  </label>
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <span className="font-black text-purple-900 text-xs">Chỉ định dự giờ</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800">
                      Tự động gán (ASSIGNED)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                  13. Ghi chú điều hành / Yêu cầu đối với giáo viên & người dự
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về hồ sơ cần chuẩn bị, tiêu chí trọng tâm..."
                  value={assignedNotes}
                  onChange={e => setAssignedNotes(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                />
              </div>

              {/* CẢNH BÁO TRÙNG PHIÊN (NẾU PHÁT HIỆN TRÙNG GV + NGÀY + TIẾT + LỚP) */}
              {assignedConflict && (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-xs flex flex-col gap-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-amber-900 text-xs">
                        ⚠️ Đã tồn tại phiên dự giờ của giáo viên này trong cùng thời gian và lớp!
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Phiên: <strong>"{assignedConflict.topic}"</strong> ({assignedConflict.period}, {new Date(assignedConflict.date).toLocaleDateString("vi-VN")}) tại <strong>{assignedConflict.className}</strong>. Hiện đã có <strong>{assignedConflict.participantCount} người tham gia</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignedJoinExisting(true);
                        setAssignedForceNew(false);
                      }}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        assignedJoinExisting
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-100/60"
                      }`}
                    >
                      ✓ Tham gia phiên hiện có (Gộp người dự)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAssignedForceNew(true);
                        setAssignedJoinExisting(false);
                      }}
                      className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        assignedForceNew
                          ? "bg-purple-700 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      Tạo phiên riêng biệt (Xác nhận)
                    </button>
                  </div>
                </div>
              )}

              {/* Nút hành động Submit */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={props.onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={assignedSubmitting}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-extrabold text-xs transition-all shadow-md shadow-purple-900/20 flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {assignedSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-white" />
                      <span>Đang lưu chỉ định...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 text-purple-200" />
                      <span>{assignedJoinExisting ? "Xác nhận gộp vào phiên hiện có" : "Lưu Chỉ Định Dự Giờ"}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            /* ===== FORM 1: GV DẠY TỰ MỞ TIẾT DẠY ===== */
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs">
              {isMamNonTeacher ? (
                /* ===== MẦM NON FORM ===== */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Chủ đề bài dạy *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Thế giới động vật, Gia đình..."
                      value={newChuDe}
                      onChange={e => setNewChuDe(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-amber-50/20 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Hoạt động *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Âm nhạc, Tạo hình, KPKH..."
                      value={newHoatDong}
                      onChange={e => setNewHoatDong(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-amber-50/20 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Đề tài *</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Bé yêu các con vật..."
                      value={newDeTai}
                      onChange={e => setNewDeTai(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-amber-50/20 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Cơ sở *</label>
                    <select
                      value={newCampusId}
                      onChange={e => { setNewCampusId(e.target.value); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    >
                      <option value="">Chọn cơ sở</option>
                      {campuses.map((c: any) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Khối học *</label>
                    <select
                      value={newGrade}
                      onChange={e => { setNewGrade(e.target.value); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                    >
                      <option value="">Chọn khối học</option>
                      {mamNonGrades.map((g: any) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wide">Tên lớp *</label>
                    <select
                      value={newClassId}
                      onChange={e => {
                        const cId = e.target.value;
                        setNewClassId(cId);
                        if (cId && cId !== "other") {
                          const sel = classes.find((c: any) => c.id === cId);
                          if (sel) {
                            if (!newCampusId && sel.campusId) setNewCampusId(sel.campusId);
                            if (sel.grade && (!newGrade || newGrade === "all")) setNewGrade(sel.grade);
                          }
                        }
                      }}
                      required
                      disabled={!newCampusId && !newGrade}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-slate-800 disabled:opacity-50"
                    >
                      <option value="">
                        {filteredClassesForCreation.length > 0
                          ? `-- Chọn tên lớp (${filteredClassesForCreation.length} lớp) --`
                          : (newCampusId ? "Không có lớp học phù hợp" : "-- Vui lòng chọn cơ sở trước --")}
                      </option>
                      {filteredClassesForCreation.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.className} {c.grade ? `(${c.grade})` : ""}
                        </option>
                      ))}
                      <option value="other">Lớp khác (Nhập tay...)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Ngày dạy *</label>
                    <input
                      type="date"
                      value={newDate}
                      min={minAllowedDate}
                      onChange={e => setNewDate(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none bg-white text-slate-800"
                    />
                  </div>
                </div>
              ) : (
                /* ===== K-12 FORM ===== */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Cấp học *</label>
                    <select
                      value={newLevel}
                      onChange={e => { setNewLevel(e.target.value); setNewGrade(""); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#00A19A] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    >
                      <option value="">Chọn cấp học</option>
                      <option value="Mầm non">Mầm non</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Khối lớp *</label>
                    <select
                      value={newGrade}
                      onChange={e => { setNewGrade(e.target.value); setNewClassId(""); }}
                      required
                      disabled={!newLevel}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#00A19A] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800 disabled:opacity-50"
                    >
                      <option value="">Chọn khối lớp</option>
                      {getGradesForLevel(newLevel).map((g: any) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Môn học *</label>
                    <select
                      value={newSubjectId}
                      onChange={e => setNewSubjectId(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#00A19A] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    >
                      <option value="">Chọn môn học</option>
                      {subjects.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.subjectName}</option>)}
                      <option value="other">Môn học khác / Chuyên đề</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Cơ sở *</label>
                    <select
                      value={newCampusId}
                      onChange={e => { setNewCampusId(e.target.value); setNewClassId(""); }}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#00A19A] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    >
                      <option value="">Chọn cơ sở</option>
                      {campuses.map((c: any) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Lớp học *</label>
                    <select
                      value={newClassId}
                      onChange={e => {
                        const cId = e.target.value;
                        setNewClassId(cId);
                        if (cId && cId !== "other") {
                          const selClass = classes.find((c: any) => c.id === cId);
                          if (selClass) {
                            if (!newCampusId && selClass.campusId) {
                              setNewCampusId(selClass.campusId);
                            }
                            if (selClass.grade && (!newGrade || newGrade === "all")) {
                              const cleanG = String(selClass.grade).replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
                              setNewGrade(`Khối ${cleanG}`);
                            }
                            if (!newLevel) {
                              const lvl = (selClass.level || "").toLowerCase();
                              if (lvl.includes("thcs")) setNewLevel("THCS");
                              else if (lvl.includes("thpt")) setNewLevel("THPT");
                              else if (lvl.includes("tieu") || lvl.includes("tiểu")) setNewLevel("Tiểu học");
                              else if (lvl.includes("mam") || lvl.includes("mầm")) setNewLevel("Mầm non");
                            }
                          }
                        }
                      }}
                      required
                      disabled={!newCampusId && !newLevel}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#00A19A] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800 disabled:opacity-50"
                    >
                      <option value="">
                        {filteredClassesForCreation.length > 0
                          ? `-- Chọn lớp học (${filteredClassesForCreation.length} lớp) --`
                          : (newCampusId ? "Không có lớp học phù hợp" : "-- Vui lòng chọn cơ sở trước --")}
                      </option>
                      {filteredClassesForCreation.map((c: any) => {
                        const gLabel = c.grade ? `(Khối ${String(c.grade).replace(/Khối\s+/gi, "")})` : (c.level ? `(${c.level})` : "");
                        return (
                          <option key={c.id} value={c.id}>
                            {c.className} {gLabel}
                          </option>
                        );
                      })}
                      <option value="other">Lớp khác (Nhập tay...)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Ngày dạy *</label>
                    <input
                      type="date"
                      value={newDate}
                      min={minAllowedDate}
                      onChange={e => setNewDate(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200/90 focus:border-[#00A19A] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Tên bài dạy / Chủ đề *</label>
                    <input
                      type="text"
                      placeholder="Nhập tên bài dạy hoặc chủ đề tiết học..."
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      required
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200/90 focus:border-[#00A19A] focus:ring-2 focus:ring-teal-500/20 outline-none bg-white text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Time & Period Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase">Tiết: Từ *</label>
                  <select
                    value={newStartTime}
                    onChange={e => handleStartTimeChange(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 outline-none"
                  >
                    {periodOptions.map((p: any) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-600 uppercase">Đến *</label>
                  <select
                    value={newEndTime}
                    disabled={newIsDoublePeriod}
                    onChange={e => setNewEndTime(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800 outline-none disabled:opacity-50"
                  >
                    {periodOptions.map((p: any) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2 pb-2 pl-1">
                  <input
                    type="checkbox"
                    id="isDoublePeriod"
                    checked={newIsDoublePeriod}
                    disabled={newStartTime === "Tiết 8"}
                    onChange={e => handleDoublePeriodChange(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00A19A] focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="isDoublePeriod" className="text-xs font-extrabold text-slate-700 select-none cursor-pointer">
                    Dạy 2 tiết liền
                  </label>
                </div>
              </div>

              {/* PDF Upload Dropzone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-600 uppercase">Giáo án đính kèm (PDF) <span className="text-slate-400 font-normal lowercase">(không bắt buộc)</span></label>
                <div className="flex items-center gap-2">
                  <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="pdf-upload-file-inline" />
                  <label htmlFor="pdf-upload-file-inline" className="flex-1 flex items-center justify-center gap-2 bg-slate-100/80 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all">
                    <FileText className="w-4 h-4 text-slate-500" />
                    {newLessonPlanName ? "Thay đổi File PDF..." : "Tải lên file Giáo án (.PDF)"}
                  </label>
                  {newLessonPlanName && (
                    <button type="button" onClick={() => { setNewLessonPlanName(""); setNewLessonPlanData(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                      className="p-2.5 hover:bg-rose-100 text-rose-600 transition-all rounded-xl border border-rose-200" title="Xóa file đã chọn">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {newLessonPlanName && (
                  <span className="text-xs font-bold text-teal-700 truncate block">
                    Đã chọn: <span className="underline">{newLessonPlanName}</span>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || monthlyLimitCount >= 2}
                className="w-full mt-2 py-3 bg-[#00A19A] hover:bg-[#008B85] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md shadow-teal-800/20 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {submitting ? "Đang lưu..." : (editSlotId ? "Cập nhật tiết dạy" : "Đăng ký tiết dạy")}
              </button>
            </form>
          )}
          </div>
        </div>

        {/* Guidance & Policy Section - Dàn đều 4 cột phía dưới form khi xem trên trang (ẩn trong Modal) để giao diện các thẻ tag luôn mở rộng full-width như thẻ Đột xuất */}
        {creationMode !== "SURPRISE" && !props.isOpen && !props.showCreateModal && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-2">
            {/* Card 1: Circular Progress Gauge for TIẾN ĐỘ THÁNG */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">
                  Tiến độ tháng {currentMonthNum}
                </h4>
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-slate-100"
                      strokeWidth="7"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      stroke="#00A19A"
                      strokeWidth="7"
                      strokeDasharray={213.6}
                      strokeDashoffset={213.6 * (1 - Math.min(1, (monthlyLimitCount || 0) / 2))}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black text-slate-800">
                      {progressPct}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs font-black text-slate-700">{monthlyLimitCount || 0} / 2</span>
                  <span className="text-xs font-bold text-slate-500 ml-1">tiết quy định</span>
                </div>
              </div>

              <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-3.5 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-teal-100 text-[#00A19A] flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-teal-900 font-medium leading-relaxed">
                  Mỗi giáo viên: tối đa 2 tiết/tháng.<br />
                  Bạn còn <strong className="font-black text-[#00A19A]">{Math.max(0, 2 - (monthlyLimitCount || 0))} lượt đăng ký</strong>.
                </p>
              </div>
            </div>

            {/* Card 2: LỊCH SẮP TỚI */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00A19A]" />
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">Lịch sắp tới</h4>
                </div>
                <button
                  type="button"
                  onClick={onViewAllSchedule}
                  className="text-[11px] font-bold text-[#00A19A] hover:text-teal-800 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Xem tất cả</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {upcomingSlots && upcomingSlots.length > 0 ? (
                <div className="space-y-2.5">
                  {upcomingSlots.map((slot: any) => (
                    <div key={slot.id} className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-800 truncate max-w-[170px]">{slot.subject?.name || slot.topic}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">{slot.period || slot.startTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{slot.class?.name || "Lớp"}</span>
                        <span className="font-semibold text-slate-600">{slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 text-center">
                  <Calendar className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
                  <p className="text-xs font-bold text-slate-600">Chưa có lịch dự giờ</p>
                  <p className="text-[11px] text-slate-400">Các lịch đăng ký sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>

            {/* Card 3: HƯỚNG DẪN NHANH */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">Hướng dẫn nhanh</h4>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 border border-teal-200/60">1</span>
                  <p className="leading-snug font-medium text-slate-700">Chọn thông tin và gửi đăng ký</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 border border-teal-200/60">2</span>
                  <p className="leading-snug font-medium text-slate-700">Chờ TTCM phê duyệt</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5 border border-teal-200/60">3</span>
                  <p className="leading-snug font-medium text-slate-700">Thực hiện dự giờ và đánh giá</p>
                </div>
              </div>
            </div>

            {/* Card 4: QUY ĐỊNH & LƯU Ý DỰ GIỜ */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold">
                  <Info className="w-4 h-4" />
                </div>
                <h4 className="font-black text-xs text-[#003B3A] uppercase tracking-wider">Quy định & Lưu ý dự giờ</h4>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                  <p className="leading-snug"><strong className="text-slate-800">Tối đa 4 người dự:</strong> Mỗi tiết dạy mở tối đa 4 chỗ đăng ký để đảm bảo chất lượng giờ học.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                  <p className="leading-snug"><strong className="text-slate-800">Phê duyệt tham dự:</strong> Giáo viên đứng lớp có quyền xem và duyệt danh sách người đăng ký trước giờ dạy.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                  <p className="leading-snug"><strong className="text-slate-800">Đính kèm giáo án:</strong> Khuyến khích tải lên file Kế hoạch bài dạy (.PDF) để người dự chuẩn bị tốt nhất.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-teal-50 text-[#00A19A] flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">4</span>
                  <p className="leading-snug"><strong className="text-slate-800">Nộp phiếu đánh giá:</strong> Người dự thực hiện chấm điểm trực tiếp trên hệ thống ngay sau tiết học.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
