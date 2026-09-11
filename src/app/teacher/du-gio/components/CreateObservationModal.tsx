// @ts-nocheck
"use client"

import React from "react"
import {
  X, Plus, Sparkles, Zap, ShieldCheck, Info, BookOpen, Calendar, Clock,
  MapPin, User, Users, CheckCircle2, AlertCircle, FileText, Award, Check, Save, Mail, Loader2
} from "lucide-react"
import { QuickCommentPresets } from "./QuickCommentPresets"

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
  creationMode: "TEACHER_OPEN" | "OBSERVER_REQUEST" | "SURPRISE"
  setCreationMode: (mode: "TEACHER_OPEN" | "OBSERVER_REQUEST" | "SURPRISE") => void
  isMamNonTeacher: boolean
  isAdminUser: boolean
  isTTCM: boolean
  canCreateSurprise: boolean
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
  handleSurpriseSubmit: (isDraft?: boolean) => void
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

export function CreateObservationModal(props: CreateObservationModalProps) {
  if (!props.isOpen) return null

  const minAllowedDate = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }, []);

  const {
    onClose,
    creationMode,
    setCreationMode,
    isMamNonTeacher,
    isAdminUser,
    isTTCM,
    canCreateSurprise,
    currentTeacher,
    monthlyLimitCount,
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
    // Shared
    subjects, departments, teachers, campuses, classes,
    periodOptions, getGradesForLevel, getKhacChuyenDeSubjectId, isPreschoolDepartment,
    k12Labels, maxScoresK12, getK12RankingDetails, getMamNonRankingDetails
  } = props

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#003B3A] via-[#004D47] to-[#007068] text-white flex items-center justify-between gap-4 border-b border-teal-700/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-teal-200 border border-white/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {creationMode === "TEACHER_OPEN"
                  ? "Mở Tiết Dạy Dự Giờ Mới"
                  : creationMode === "OBSERVER_REQUEST"
                  ? "Gửi Yêu Cầu Xin Dự Giờ"
                  : "Lập Biên Bản Dự Giờ Đột Xuất"}
              </h3>
              <p className="text-xs text-teal-100/80 font-medium">
                Khởi tạo và thiết lập thông tin tiết dạy chuyên môn trên hệ thống Sky-Line
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-2xl w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setCreationMode("TEACHER_OPEN")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                creationMode === "TEACHER_OPEN"
                  ? "bg-gradient-to-r from-[#008B82] to-[#006059] text-white shadow-md shadow-teal-800/25"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Plus className="w-4 h-4" />
              1. GV Dạy Tự Mở Tiết
            </button>
            <button
              type="button"
              onClick={() => setCreationMode("OBSERVER_REQUEST")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                creationMode === "OBSERVER_REQUEST"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-800/25"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              2. GVBM Xin Dự Giờ
            </button>
            {canCreateSurprise && (
              <button
                type="button"
                onClick={() => setCreationMode("SURPRISE")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  creationMode === "SURPRISE"
                    ? "bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-800/25"
                    : "text-rose-900 hover:bg-rose-100/60"
                }`}
              >
                <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                3. Dự Giờ Đột Xuất ⚡
              </button>
            )}
          </div>

          {creationMode === "TEACHER_OPEN" && (
            <span className={`hidden sm:inline-flex text-xs font-black px-3 py-1.5 rounded-xl border ${isMamNonTeacher ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-teal-50 text-[#008B82] border-teal-200"}`}>
              Tháng {new Date().getMonth() + 1}: {monthlyLimitCount}/2 tiết đã tạo
            </span>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ================= MODE 1: TEACHER OPEN FORM ================= */}
          {creationMode === "TEACHER_OPEN" && (
            <form onSubmit={handleOpenSlotSubmit} className="flex flex-col gap-5 text-xs font-semibold">
              <div className="bg-teal-500/10 border border-teal-200/70 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-teal-950 leading-relaxed">
                  <strong className="text-teal-900">Quy định tự mở tiết:</strong> Giáo viên trực tiếp lên lịch tiết dạy của mình để đồng nghiệp và TTCM đăng ký dự giờ. Giới hạn tối đa 2 tiết/tháng.
                </p>
              </div>

              {/* Group 1: Cơ sở & Tổ chuyên môn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">1. Cơ sở giảng dạy *</label>
                  <select
                    value={openCampusId}
                    onChange={e => { setOpenCampusId(e.target.value); setOpenClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.campusName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">2. Môn học / Chủ đề *</label>
                  <select
                    value={openSubjectId}
                    onChange={e => {
                      const selId = e.target.value;
                      setOpenSubjectId(selId);
                      const sObj = subjects.find((s: any) => s.id === selId);
                      if (sObj) setOpenSubjectName(sObj.subjectName);
                    }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 2: Tên bài dạy */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">3. Tên bài dạy / Chủ đề dự giờ *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Định luật II Newton, Chủ đề Bản thân & Gia đình..."
                  value={openTopic}
                  onChange={e => setOpenTopic(e.target.value)}
                  required
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800"
                />
              </div>

              {/* Group 3: Cấp học & Khối & Lớp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">4. Cấp học *</label>
                  <select
                    value={openLevel}
                    onChange={e => { setOpenLevel(e.target.value); setOpenGrade(""); setOpenClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn cấp học --</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">5. Khối lớp *</label>
                  <select
                    value={openGrade}
                    onChange={e => { setOpenGrade(e.target.value); setOpenClassId(""); }}
                    required
                    disabled={!openLevel}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn khối --</option>
                    {getGradesForLevel(openLevel).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">6. Lớp học *</label>
                  <select
                    value={openClassId}
                    onChange={e => {
                      const selId = e.target.value;
                      setOpenClassId(selId);
                      const cObj = classes.find((c: any) => c.id === selId);
                      if (cObj) {
                        setOpenClassName(cObj.className);
                        if (cObj.campusId && !openCampusId) setOpenCampusId(cObj.campusId);
                      }
                    }}
                    required
                    disabled={!openGrade}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes
                      .filter((c: any) => (!openCampusId || c.campusId === openCampusId) && (!openGrade || c.grade === openGrade || c.level === openLevel))
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>{c.className}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Group 4: Thời gian & Phòng & Chỗ */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">7. Ngày dạy *</label>
                  <input
                    type="date"
                    value={openDate}
                    min={minAllowedDate}
                    onChange={e => setOpenDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">8. Tiết dạy *</label>
                  <select
                    value={openPeriod}
                    onChange={e => setOpenPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">9. Phòng học</label>
                  <input
                    type="text"
                    placeholder="Phòng học"
                    value={openRoom}
                    onChange={e => setOpenRoom(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">10. Số chỗ dự tối đa</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={openMaxSeats}
                    onChange={e => setOpenMaxSeats(parseInt(e.target.value) || 4)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              {/* Group 5: Kế hoạch bài dạy / Giáo án */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">11. Link kế hoạch bài dạy / KHDH</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={openLessonPlanUrl}
                  onChange={e => setOpenLessonPlanUrl(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-800"
                />
              </div>

              {/* Email Notification Notice */}
              <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-teal-950">
                <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center shrink-0 text-teal-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-teal-900">📧 Tự động gửi Email thông báo khi mở tiết dạy</p>
                  <p className="text-[11px] text-teal-700 font-medium">Khi Thầy/Cô bấm <strong>"Xác nhận mở tiết dạy"</strong>, hệ thống sẽ tự động gửi Email thông báo tới các Giáo viên trong Tổ chuyên môn để đăng ký tham dự.</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOpen}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#008B82] to-[#006059] hover:from-[#007068] hover:to-[#004f4a] text-white font-black text-xs transition-all shadow-md shadow-teal-800/25 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-200" />
                  {isSubmittingOpen ? "Đang lưu tiết dạy..." : "Xác nhận mở tiết dạy"}
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 2: OBSERVER REQUEST FORM ================= */}
          {creationMode === "OBSERVER_REQUEST" && (
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-5 text-xs font-semibold">
              <div className="bg-indigo-500/10 border border-indigo-200/70 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-indigo-950 leading-relaxed">
                  <strong className="text-indigo-900">Đề xuất xin dự giờ:</strong> Chọn Tổ chuyên môn & Giáo viên dạy, cùng Cơ sở, Khối lớp và Tiết học mong muốn. Yêu cầu sẽ được gửi tới Giáo viên dạy để xem xét phê duyệt.
                </p>
              </div>

              {/* Group 1: Tổ & Giáo viên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">1. Chọn Tổ chuyên môn</label>
                  <select
                    value={reqDeptId}
                    onChange={e => {
                      const newDeptId = e.target.value;
                      setReqDeptId(newDeptId);
                      setReqTeacherId("");
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">Tất cả các Tổ chuyên môn</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">2. Chọn Giáo viên dạy *</label>
                  <select
                    value={reqTeacherId}
                    onChange={e => setReqTeacherId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn Giáo viên dạy --</option>
                    {filteredTeachersForRequest.map((t: any) => {
                      const depts = getAllDeptNames(t, departments);
                      return (
                        <option key={t.id} value={t.id}>
                          {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ""} {depts ? `(${depts})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Group 2: Môn học & Chủ đề */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">3. Chọn Môn học *</label>
                  <select
                    value={reqSubjectId}
                    onChange={e => setReqSubjectId(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.subjectName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">4. Tên bài dạy / Chủ đề *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Cấp số cộng, Sự nảy mầm của hạt..."
                    value={reqTopic}
                    onChange={e => setReqTopic(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Group 3: Cơ sở & Cấp học & Khối & Lớp */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">5. Cơ sở *</label>
                  <select
                    value={reqCampusId}
                    onChange={e => { setReqCampusId(e.target.value); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {campuses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.campusName}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">6. Cấp học *</label>
                  <select
                    value={reqLevel}
                    onChange={e => { setReqLevel(e.target.value); setReqGrade(""); setReqClassId(""); }}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    <option value="">-- Cấp học --</option>
                    <option value="Mầm non">Mầm non</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">7. Khối lớp *</label>
                  <select
                    value={reqGrade}
                    onChange={e => { setReqGrade(e.target.value); setReqClassId(""); }}
                    required
                    disabled={!reqLevel}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Khối --</option>
                    {getGradesForLevel(reqLevel).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">8. Lớp học *</label>
                  <select
                    value={reqClassId}
                    onChange={e => setReqClassId(e.target.value)}
                    required
                    disabled={!reqGrade}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800 disabled:opacity-50"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {filteredReqClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Group 4: Thời gian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">9. Tiết học dự *</label>
                  <select
                    value={reqPeriod}
                    onChange={e => setReqPeriod(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  >
                    {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">10. Ngày dự *</label>
                  <input
                    type="date"
                    value={reqDate}
                    min={minAllowedDate}
                    onChange={e => setReqDate(e.target.value)}
                    required
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              {/* Email Notification Notice */}
              <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-indigo-950">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-indigo-900">📧 Tự động gửi Email thông báo tới Giáo viên dạy</p>
                  <p className="text-[11px] text-indigo-700 font-medium">Khi Thầy/Cô bấm <strong>"Gửi đề xuất xin dự giờ"</strong>, hệ thống sẽ tự động gửi Email thông báo trực tiếp tới Giáo viên dạy để xem xét và phê duyệt tiết dự.</p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmittingRequest}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-black text-xs transition-all shadow-md shadow-indigo-700/25 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmittingRequest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Đang gửi đề xuất & Email...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Gửi đề xuất xin dự giờ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 3: SURPRISE OBSERVATION FORM ================= */}
          {creationMode === "SURPRISE" && canCreateSurprise && (
            <div className="flex flex-col gap-6 text-xs font-semibold">
              <div className="bg-rose-500/10 border border-rose-200/70 rounded-2xl p-4 flex items-start gap-3">
                <Zap className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-rose-950">Biên bản Dự Giờ Đột Xuất & Phiếu Đánh Giá Chuyên Môn</h4>
                  <p className="text-xs font-medium text-rose-900 mt-0.5 leading-relaxed">
                    Dành cho TTCM / Ban Giám hiệu / Ban ĐHCM / Ban KT&ĐBCL. Điền thông tin tiết dạy và trực tiếp chấm điểm <strong>Phiếu Đánh Giá</strong> ngay bên dưới. Dữ liệu sẽ được ghi nhận và tính vào KPI hệ thống.
                  </p>
                </div>
              </div>

              {/* Step 1: Thông tin giáo viên & Tiết học */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-5 h-5 bg-rose-600 text-white rounded-md flex items-center justify-center text-xs font-black">1</span>
                  Thông tin Tiết Dạy & Giáo Viên
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Tổ chuyên môn *</label>
                    <select
                      value={surpriseDeptId}
                      onChange={e => {
                        const newDeptId = e.target.value;
                        setSurpriseDeptId(newDeptId);
                        setSurpriseTeacherId("");
                      }}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800 cursor-pointer"
                    >
                      {(isAdminUser || (ttcmAllowedDepartments && ttcmAllowedDepartments.length > 1)) && (
                        <option value="">{isAdminUser ? "-- Tất cả các Tổ chuyên môn --" : "-- Tất cả Tổ thuộc Bộ phận --"}</option>
                      )}
                      {ttcmAllowedDepartments.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Giáo viên được dự *</label>
                    <select
                      value={surpriseTeacherId}
                      onChange={e => {
                        const tId = e.target.value;
                        setSurpriseTeacherId(tId);
                        if (tId) {
                          const tObj = teachers.find((t: any) => t.id === tId);
                          if (tObj?.campusId) setSurpriseCampusId(tObj.campusId);
                          if (tObj?.mainSubjectRel?.subjectName) {
                            setSurpriseSubjectName(tObj.mainSubjectRel.subjectName);
                            if (tObj.mainSubjectId) setSurpriseSubjectId(tObj.mainSubjectId);
                          }
                        }
                      }}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Chọn giáo viên --</option>
                      {filteredTeachersForSurprise.map((t: any) => {
                        const depts = getAllDeptNames(t, departments);
                        return (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ""} {depts ? `• ${depts}` : ""} ({t.campus?.campusName || "Cơ sở"})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Môn học *</label>
                    <select
                      value={surpriseSubjectId}
                      onChange={e => {
                        const sId = e.target.value;
                        setSurpriseSubjectId(sId);
                        const sObj = subjects.find((s: any) => s.id === sId);
                        if (sObj) setSurpriseSubjectName(sObj.subjectName);
                      }}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Chọn môn học --</option>
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.subjectName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Tên bài dạy / Chủ đề *</label>
                    <input
                      type="text"
                      value={surpriseTopic}
                      onChange={e => setSurpriseTopic(e.target.value)}
                      placeholder={isMamNonTeacher || surpriseLevel === "Mầm non" ? "VD: Hoạt động khám phá, STEAM, Kỹ năng sống..." : "Nhập tên bài dạy..."}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-white text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Lớp học *</label>
                    <select
                      value={surpriseClassId}
                      onChange={e => {
                        const cId = e.target.value;
                        setSurpriseClassId(cId);
                        const cObj = classes.find((c: any) => c.id === cId);
                        if (cObj) setSurpriseClassName(cObj.className);
                      }}
                      className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-slate-800 cursor-pointer"
                    >
                      <option value="">-- Chọn lớp --</option>
                      {filteredClassesForSurprise.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.className}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">Ngày & Tiết dạy *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={surpriseDate}
                        min={minAllowedDate}
                        onChange={e => setSurpriseDate(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                      />
                      <select
                        value={surprisePeriod}
                        onChange={e => setSurprisePeriod(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 cursor-pointer"
                      >
                        {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Thẻ Người dự giờ tự động */}
                <div className="bg-rose-50/60 rounded-xl p-3 border border-rose-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                      {currentTeacher?.teacherName ? currentTeacher.teacherName.charAt(0) : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Người dự giờ (Tự động):</span>
                        <span className="font-extrabold text-slate-900 text-xs">{currentTeacher?.teacherName || "Tài khoản đăng nhập"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {currentTeacher?.email || "Email"} • Chức vụ: {isTTCM ? "Tổ trưởng chuyên môn" : (currentTeacher?.position || "Ban ĐHCM / Quản lý")}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-white border border-rose-200 text-rose-700 shrink-0">
                    ⚡ Đột xuất
                  </span>
                </div>
              </div>

              {/* Step 2: PHIẾU ĐÁNH GIÁ DỰ GIỜ CHI TIẾT */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-150">
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 bg-rose-600 text-white rounded-md flex items-center justify-center text-xs font-black">2</span>
                      {surpriseLevel !== "Mầm non" ? "Phiếu Đánh Giá Dự Giờ (11 Tiêu Chí • 20.00 điểm)" : "Phiếu Đánh Giá Dự Giờ Mầm Non (18 Tiêu Chí • 10.00 điểm)"}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Chấm điểm trực tiếp từng yêu cầu chuyên môn
                    </p>
                  </div>

                  {/* Summary Score Box */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-600 uppercase">Tổng điểm:</span>
                    <span className="text-sm font-black text-rose-950 bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
                      {surpriseLevel !== "Mầm non" 
                        ? `${surpriseScoresK12.reduce((a, b) => a + b, 0).toFixed(2)} / 20.00đ`
                        : `${surpriseScoresMN.reduce((a, b) => a + b, 0).toFixed(2)} / 10.00đ`
                      }
                    </span>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      Xếp loại: {surpriseLevel !== "Mầm non" ? calculateK12Ranking(surpriseScoresK12) : calculateMamNonRanking(surpriseScoresMN)}
                    </span>
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

                              const currentScore = surpriseScoresK12[globalIdx] || 0;
                              const isMaxReached = currentScore === req.max;

                              return (
                                <div key={req.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col md:flex-row md:items-start justify-between gap-3">
                                  <div className="space-y-1.5 min-w-0 flex-1">
                                    <div className="flex items-center flex-wrap gap-2">
                                      <span className="px-2 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
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

                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                                    <span className="text-xs font-bold text-slate-500">Điểm:</span>
                                    <select
                                      value={surpriseScoresK12[globalIdx] || 0}
                                      onChange={e => {
                                        const nextScores = [...surpriseScoresK12];
                                        nextScores[globalIdx] = parseFloat(e.target.value);
                                        setSurpriseScoresK12(nextScores);
                                        const nextRank = calculateK12Ranking(nextScores);
                                        setSurpriseOverall(nextRank);
                                      }}
                                      className="rounded-xl border border-rose-200 p-2 bg-white text-xs font-black text-slate-800 outline-none w-24 shadow-2xs focus:ring-2 focus:ring-rose-500 cursor-pointer"
                                    >
                                      {options.map(o => <option key={o} value={o}>{o.toFixed(2)}</option>)}
                                    </select>
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

                              return (
                                <div key={req.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col md:flex-row md:items-start justify-between gap-3">
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 text-[10px] font-black bg-slate-200 text-slate-700 rounded-md uppercase tracking-wider">{req.label}</span>
                                      <span className="text-[11px] font-bold text-slate-400">(Tối đa: {req.max}đ)</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{req.text}</p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                                    <span className="text-xs font-bold text-slate-500">Điểm:</span>
                                    <select
                                      value={surpriseScoresMN[globalIdx] || 0}
                                      onChange={e => {
                                        const nextScores = [...surpriseScoresMN];
                                        nextScores[globalIdx] = parseFloat(e.target.value);
                                        setSurpriseScoresMN(nextScores);
                                        const nextRank = calculateMamNonRanking(nextScores);
                                        setSurpriseOverall(nextRank);
                                      }}
                                      className="rounded-xl border border-amber-200 p-2 bg-white text-xs font-black text-slate-800 outline-none w-24 shadow-2xs focus:ring-2 focus:ring-amber-500 cursor-pointer"
                                    >
                                      {options.map(o => <option key={o} value={o}>{o.toFixed(2)}</option>)}
                                    </select>
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
                  isPreschool={isMamNonTeacher || surpriseLevel === "Mầm non"}
                  onAddStrength={(text) => setSurpriseStrengths(prev => prev ? `${prev}\n• ${text}` : `• ${text}`)}
                  onAddImprovement={(text) => setSurpriseImprovements(prev => prev ? `${prev}\n• ${text}` : `• ${text}`)}
                />

                {/* Qualitative Feedback Textareas */}
                <div className="space-y-4 pt-2">
                  <h6 className="font-black text-xs text-slate-800 uppercase tracking-wider">Nhận xét & Góp ý chuyên môn</h6>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-emerald-800">1. Ưu điểm nổi bật của tiết dạy</label>
                    <textarea
                      placeholder="Những điểm mạnh, sáng tạo trong phương pháp và tổ chức hoạt động của giáo viên..."
                      rows={3}
                      value={surpriseStrengths}
                      onChange={e => setSurpriseStrengths(e.target.value)}
                      className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none resize-none bg-slate-50/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                      <span>2. Nội dung cần cải thiện / Góp ý phát triển</span>
                      <span className="text-rose-600 text-xs font-black">* (Bắt buộc)</span>
                    </label>
                    <textarea
                      placeholder="Các gợi ý phương pháp, phân bổ thời gian hoặc điều chỉnh hoạt động học sinh tốt hơn..."
                      rows={3}
                      value={surpriseImprovements}
                      onChange={e => setSurpriseImprovements(e.target.value)}
                      className={`w-full text-xs font-medium p-3 rounded-xl border focus:ring-2 outline-none resize-none bg-slate-50/50 ${
                        !surpriseImprovements.trim() ? "border-amber-300 focus:ring-amber-500" : "border-slate-200 focus:ring-rose-500"
                      }`}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700">3. Đề xuất & Kiến nghị chuyên môn</label>
                    <textarea
                      placeholder="Đề xuất bồi dưỡng chuyên môn, nhân rộng tiết dạy mẫu hoặc kế hoạch hỗ trợ tiếp theo..."
                      rows={2}
                      value={surpriseGeneral}
                      onChange={e => setSurpriseGeneral(e.target.value)}
                      className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none resize-none bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Overall Rating & Automatic Reason */}
                {(() => {
                  const isMN = surpriseLevel === "Mầm non" || isMamNonTeacher;
                  const rankInfo = isMN 
                    ? getMamNonRankingDetails(surpriseScoresMN)
                    : getK12RankingDetails(surpriseScoresK12);
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
                              : currentRank === "Chưa xếp loại"
                              ? "bg-slate-100 text-slate-700 border-slate-300"
                              : "bg-rose-50 text-rose-700 border-rose-300"
                          }`}>
                            {currentRank || "Chưa xếp loại"}
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
                          : rankInfo.color === "slate"
                          ? "bg-slate-50/90 border-slate-200 text-slate-700"
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

                      {/* Evaluation History & Timestamp Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Thời gian lập biên bản:{" "}
                            <strong className="text-slate-900 font-bold">
                              {surpriseDate ? new Date(surpriseDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")} ({surprisePeriod || "Tiết 1"})
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>
                            Người đánh giá:{" "}
                            <strong className="text-slate-900 font-bold">
                              {currentTeacher?.teacherName || "Giáo viên dự giờ"}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Email Notification Notice for Surprise Observation */}
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-rose-950">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-rose-900">📧 Tự động gửi Email kết quả & biên bản đánh giá</p>
                  <p className="text-[11px] text-rose-700 font-medium">Khi Thầy/Cô bấm <strong>"Lưu & Hoàn thành biên bản"</strong>, hệ thống sẽ tự động gửi Email chứa đầy đủ bảng điểm, xếp loại và góp ý phát triển tới Giáo viên dạy & lưu bản sao vào hòm thư của Thầy/Cô.</p>
                </div>
              </div>

              {/* Action Buttons: Lưu nháp / Hoàn thành */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  disabled={surpriseSubmitting}
                  onClick={() => handleSurpriseSubmit(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  {surpriseSubmitting ? "Đang lưu..." : "Lưu nháp"}
                </button>

                <button
                  type="button"
                  disabled={surpriseSubmitting}
                  onClick={() => handleSurpriseSubmit(false)}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black text-xs transition-all shadow-md shadow-rose-700/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-200" />
                  {surpriseSubmitting ? "Đang xử lý..." : "Lưu & Hoàn thành biên bản"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
