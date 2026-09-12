// @ts-nocheck
// Forced Vercel Deployment: 2026-08-28T15:53:02.733Z
"use client"

import { CreateObservationModal } from './components/CreateObservationModal';
import { ObservationRegistrationSection } from './components/ObservationRegistrationSection';
import { ReceivedEvaluationsTab } from './components/ReceivedEvaluationsTab';
import { TTCMDepartmentSummaryTab } from './components/TTCMDepartmentSummaryTab';
import { PrintObservationEvaluationModal } from './components/PrintObservationEvaluationModal';
import { QuickCommentPresets } from './components/QuickCommentPresets';
import { TeacherTargetTracker } from './components/TeacherTargetTracker';
import { AdminObservationKpiCards } from './components/AdminObservationKpiCards';
import { TeacherObservationReportTab } from './components/TeacherObservationReportTab';
import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Zap, ShieldCheck, Save, Calendar, Clock, MapPin, User, Users, BookOpen, Plus, PlusCircle, Search, X, Check,
  AlertCircle, Trash2, Info, Layers, FileText, ChevronDown, ChevronUp,
  ClipboardList, CheckCircle, Clock3, Building2, Shield, Filter, RotateCcw, SlidersHorizontal, Award,
  Eye, TrendingUp, TrendingDown, Target, Star, Sparkles, CheckSquare, Mail, History, Send, ChevronRight, UserCheck, FileCheck,
  CheckCircle2, XCircle, AlertTriangle, ExternalLink, Bookmark, HelpCircle, ArrowRight, UserPlus, CheckCheck,
  BarChart3, PieChart, Printer, Download, FileSpreadsheet, Edit, LayoutDashboard
} from "lucide-react"
import { ACADEMIC_DIVISIONS, normalizeDivisionCode } from "@/config/divisions";

const maxScoresK12 = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
const k12Labels = [
  "Y1: Chuẩn bị giáo án, bám sát kiến thức kỹ năng",
  "Y2: Sử dụng đồ dùng, thiết bị dạy học phù hợp",
  "Y3: Nội dung bài giảng chính xác, khoa học",
  "Y4: Đảm bảo tính hệ thống, trọng tâm bài dạy",
  "Y5: Liên hệ thực tế đời sống, tính giáo dục",
  "Y6: Không đọc chép, hỗ trợ kịp thời học sinh",
  "Y7: Tổ chức học tập chủ động, hợp tác nhóm",
  "Y8: Linh hoạt các khâu, phân phối thời gian hợp lý",
  "Y9: Kết hợp các phương pháp, khuyến khích tư duy",
  "Y10: Đánh giá quá trình học, học sinh nắm vững bài",
  "Y11: Tiết dạy nhuần nhuyễn, sinh động, sáng tạo"
];

const preschoolLabels = [
  "T1: Nội dung bài dạy phù hợp, chính xác",
  "T2: Phương pháp giảng dạy hiệu quả, sáng tạo",
  "T3: Tổ chức hoạt động học tập tích cực",
  "T4: Sử dụng CNTT và phương tiện dạy học",
  "T5: Kết quả học tập và tương tác của học sinh"
];

export const getK12RankingDetails = (scores: number[]) => {
  const sum = Math.round(scores.reduce((a, b) => a + b, 0) * 100) / 100;
  if (sum === 0) {
    return {
      rating: "Chưa xếp loại",
      reason: "Vui lòng chọn điểm các tiêu chí để hệ thống tự động tính điểm và xếp loại tiết dạy.",
      color: "slate"
    };
  }

  const yq1 = scores[0] || 0;
  const yq3 = scores[2] || 0;
  const yq6 = scores[5] || 0;
  const yq7 = scores[6] || 0;

  const maxScores = [1.5, 1.5, 2.0, 2.0, 1.0, 2.0, 3.0, 2.0, 2.0, 2.0, 1.0];
  const failed50 = scores
    .map((s, idx) => (s < maxScores[idx] * 0.5 ? `Y${idx + 1} (${s}/${maxScores[idx]}đ)` : null))
    .filter(Boolean);

  const zeroScores = scores
    .map((s, idx) => (s === 0 ? `Y${idx + 1}` : null))
    .filter(Boolean);

  // Danh sách các tiêu chí chưa đạt Max cho từng mức
  const missingMaxGioi = [
    yq1 < 1.5 ? "Y1 (1.5đ)" : null,
    yq3 < 2.0 ? "Y3 (2.0đ)" : null,
    yq6 < 2.0 ? "Y6 (2.0đ)" : null,
    yq7 < 3.0 ? "Y7 (3.0đ)" : null,
  ].filter(Boolean);

  const missingMaxKha = [
    yq1 < 1.5 ? "Y1 (1.5đ)" : null,
    yq3 < 2.0 ? "Y3 (2.0đ)" : null,
    yq6 < 2.0 ? "Y6 (2.0đ)" : null,
  ].filter(Boolean);

  const missingMaxTB = [
    yq1 < 1.5 ? "Y1 (1.5đ)" : null,
    yq3 < 2.0 ? "Y3 (2.0đ)" : null,
  ].filter(Boolean);

  // 1. Giỏi: sum >= 17, Y1=1.5, Y3=2.0, Y6=2.0, Y7=3.0, không có tiêu chí < 50%
  if (sum >= 17.0 && missingMaxGioi.length === 0 && failed50.length === 0) {
    return {
      rating: "Giỏi",
      reason: `Tổng điểm đạt ${sum.toFixed(2)}/20.00đ (≥ 17.0đ); đạt điểm tối đa (Max) ở cả 4 tiêu chí bắt buộc: Y1 (1.5đ), Y3 (2.0đ), Y6 (2.0đ), Y7 (3.0đ); tất cả các yêu cầu còn lại đều đạt từ 50% điểm tối đa trở lên.`,
      color: "emerald"
    };
  }

  // 2. Khá: sum >= 14, Y1=1.5, Y3=2.0, Y6=2.0, không có tiêu chí < 50%
  if (sum >= 14.0 && missingMaxKha.length === 0 && failed50.length === 0) {
    let note = `Tổng điểm đạt ${sum.toFixed(2)}/20.00đ (≥ 14.0đ); đạt điểm tối đa (Max) ở 3 tiêu chí bắt buộc: Y1 (1.5đ), Y3 (2.0đ), Y6 (2.0đ); các yêu cầu khác đều đạt từ 50% trở lên.`;
    if (sum >= 17.0) {
      const reasons = [];
      if (missingMaxGioi.length > 0) reasons.push(`chưa đạt Max ở ${missingMaxGioi.join(", ")}`);
      if (failed50.length > 0) reasons.push(`có yêu cầu dưới 50%: ${failed50.join(", ")}`);
      note += ` (Hạ từ loại Giỏi xuống Khá do: ${reasons.join("; ")})`;
    }
    return {
      rating: "Khá",
      reason: note,
      color: "sky"
    };
  }

  // 3. Trung bình: sum >= 12, Y1=1.5, Y3=2.0, không có tiêu chí 0đ
  if (sum >= 12.0 && missingMaxTB.length === 0 && zeroScores.length === 0) {
    let note = `Tổng điểm đạt ${sum.toFixed(2)}/20.00đ (≥ 12.0đ); đạt điểm tối đa (Max) ở 2 tiêu chí bắt buộc: Y1 (1.5đ), Y3 (2.0đ) và không có yêu cầu nào bị điểm 0.`;
    if (sum >= 14.0) {
      const reasons = [];
      if (missingMaxKha.length > 0) reasons.push(`chưa đạt Max ở ${missingMaxKha.join(", ")}`);
      if (failed50.length > 0) reasons.push(`có yêu cầu dưới 50%: ${failed50.join(", ")}`);
      note += ` (Hạ xuống loại Trung bình do: ${reasons.join("; ")})`;
    }
    return {
      rating: "Trung bình",
      reason: note,
      color: "amber"
    };
  }

  // 4. Không xếp loại
  let unratedReason = `Tổng điểm đạt ${sum.toFixed(2)}/20.00đ.`;
  if (sum < 12.0) {
    unratedReason += " Điểm tổng kết dưới 12.00 điểm (chưa đạt chuẩn tối thiểu loại Trung bình).";
  } else if (zeroScores.length > 0) {
    unratedReason += ` Có yêu cầu bị điểm 0: ${zeroScores.join(", ")} (theo quy định không được xếp loại khi có tiêu chí 0 điểm).`;
  } else if (missingMaxTB.length > 0) {
    unratedReason += ` Chưa đạt điểm tối đa (Max) ở tiêu chí bắt buộc tối thiểu: ${missingMaxTB.join(", ")} (yêu cầu bắt buộc để đạt loại Trung bình).`;
  } else {
    unratedReason += " Không thỏa mãn điều kiện xếp loại tối thiểu.";
  }

  return {
    rating: "Không xếp loại",
    reason: unratedReason,
    color: "rose"
  };
};

export const getMamNonRankingDetails = (scores: number[]) => {
  const sum = Math.round(scores.reduce((a, b) => a + b, 0) * 100) / 100;
  if (sum === 0) {
    return {
      rating: "Chưa xếp loại",
      reason: "Vui lòng chọn điểm các tiêu chí để hệ thống tự động tính điểm và xếp loại tiết dạy.",
      color: "slate"
    };
  }
  if (sum >= 9.0) {
    return {
      rating: "Tốt",
      reason: `Tổng điểm đạt ${sum.toFixed(2)}/10.00đ (Từ 9.0 điểm trở lên - Đạt chuẩn xếp loại TỐT bậc Mầm non).`,
      color: "emerald"
    };
  }
  if (sum >= 8.0) {
    return {
      rating: "Khá",
      reason: `Tổng điểm đạt ${sum.toFixed(2)}/10.00đ (Từ 8.0 đến dưới 9.0 điểm - Đạt chuẩn xếp loại KHÁ bậc Mầm non).`,
      color: "sky"
    };
  }
  if (sum >= 7.0) {
    return {
      rating: "Đạt",
      reason: `Tổng điểm đạt ${sum.toFixed(2)}/10.00đ (Từ 7.0 đến dưới 8.0 điểm - Đạt chuẩn xếp loại ĐẠT bậc Mầm non).`,
      color: "teal"
    };
  }
  return {
    rating: "Không đạt",
    reason: `Tổng điểm đạt ${sum.toFixed(2)}/10.00đ (Dưới 7.00 điểm - Chưa đạt chuẩn xếp loại tối thiểu bậc Mầm non).`,
    color: "rose"
  };
};

export function getTeacherAllDeptNames(t: any, departments?: any[]): string {
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

export function isTeacherInDepartment(t: any, deptId: string): boolean {
  if (!t || !deptId || deptId === "all") return true;
  if (t.departmentId === deptId) return true;
  if (t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
    return t.departmentAssignments.some((da: any) => da.departmentId === deptId);
  }
  return false;
}

import { 
  createObservationSlot, updateObservationSlot, registerObservation, cancelObservation, getDepartmentTeachers,
  requestObservationSlot, respondToObservationRequest,
  deleteObservationSlot, deleteMultipleObservationSlots, getCreatedCountInMonth, getObservationSlots, triggerSlotReminder,
  approveRegistration, submitEvaluation, updateTeacherObservationTargets, sendPendingEvaluationReminder,
  requestReEvaluation, approveReEvaluation, rejectReEvaluation, getReEvaluationRequests,
  createSurpriseObservation
} from "./actions"

interface TeacherInfo {
  id: string;
  teacherName: string;
  teacherCode: string;
  email: string | null;
  departmentId: string | null;
  campusId: string;
  departmentRel?: any;
  user?: { role: string } | null;
  observerType?: string | null;
  observeeType?: string | null;
  requiredObserved?: number | null;
  observedUnit?: string | null;
  requiredTaught?: number | null;
  taughtUnit?: string | null;
  position?: string | null;
  departmentAssignments?: any[];
}
interface SubjectInfo { id: string; subjectCode: string; subjectName: string }
interface DeptInfo { id: string; code: string; name: string }
interface CampusInfo { id: string; campusCode: string; campusName: string }
interface ClassInfo { id: string; classCode: string; className: string; level: string; grade: string; campusId: string; academicYearId?: string }

export function getSlotCategoryInfo(slot: any): { key: "MAM_NON" | "GVNN_ESL" | "K12", label: string, shortCode: "MN" | "GVNN" | "PT", badgeClass: string } {
  const isMN = slot?.level === "Mầm non" ||
    (slot?.grade || "").toLowerCase().includes("mầm non") ||
    (slot?.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non") ||
    (slot?.teacher?.departmentRel?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
  if (isMN) {
    return { key: "MAM_NON", label: "Mầm non", shortCode: "MN", badgeClass: "bg-amber-100 text-amber-900 border-amber-300" };
  }
  const subj = (slot?.subjectName || "").toLowerCase();
  const top = (slot?.topic || "").toLowerCase();
  const desc = (slot?.description || "").toLowerCase();
  const deptName = (slot?.teacher?.departmentRel?.name || "").toLowerCase();

  const isEsl = subj.includes("esl") ||
    subj.includes("tiếng anh (esl)") ||
    subj.includes("tieng anh (esl)") ||
    subj.includes("foreign") ||
    top.includes("foreign") ||
    top.includes("gvnn") ||
    desc.includes("gvnn") ||
    slot?.requestOrigin === "FOREIGN_WALKTHROUGH" ||
    (deptName.includes("quốc tế") && (subj.includes("esl") || subj.includes("ela") || subj.includes("english")));
  if (isEsl) {
    return { key: "GVNN_ESL", label: "Dự giờ GVNN (ESL)", shortCode: "GVNN", badgeClass: "bg-sky-100 text-sky-900 border-sky-300" };
  }
  return { key: "K12", label: "Phổ thông K-12", shortCode: "PT", badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300" };
}

interface ObservationClientProps {
  isAdminPage?: boolean
  initialViewMode?: "ADMIN" | "TEACHER"
  isPreschoolPage?: boolean
  initialSlots: any[]
  initialPersonalSlots?: any[]
  currentTeacher?: TeacherInfo | null
  subjects: SubjectInfo[]
  departments: DeptInfo[]
  divisions?: any[]
  teachers: any[]
  campuses: CampusInfo[]
  classes: ClassInfo[]
  initialFilters: { level: string; period: string; grade: string; classId?: string; date: string; month?: string; campusId: string; deptId: string; divisionCode?: string; academicYearId?: string }
  academicYears?: { id: string; name: string; status: string }[]
  selectedYearId?: string
  initialReceivedEvaluations?: any[]
}

const CRITERIA_LABELS = [
  "Nội dung bài dạy phù hợp, chính xác",
  "Phương pháp giảng dạy hiệu quả, sáng tạo",
  "Tổ chức hoạt động học tập tích cực",
  "Sử dụng CNTT và phương tiện dạy học",
  "Kết quả học tập và tương tác của học sinh"
]

const RATING_LABELS = ["Tốt", "Khá", "Trung bình", "Yếu"]

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

const calculateMamNonRanking = (scores: number[]) => {
  const sum = scores.reduce((a: number, b: number) => a + b, 0);
  if (sum >= 9.0) return "Tốt";
  if (sum >= 8.0) return "Khá";
  if (sum >= 7.0) return "Đạt";
  return "Không đạt";
};

const RATING_COLORS: Record<string, string> = {
  "Tốt": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Giỏi": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Khá": "bg-sky-50 text-sky-700 border-sky-200",
  "Trung bình": "bg-amber-50 text-amber-700 border-amber-200",
  "Đạt": "bg-teal-50 text-teal-700 border-teal-200",
  "Không đạt": "bg-rose-50 text-rose-700 border-rose-200",
  "Không xếp loại": "bg-rose-50 text-rose-700 border-rose-200",
  "Yếu": "bg-rose-50 text-rose-700 border-rose-200"
}

// Generate consistent avatar color based on name
const getAvatarGradient = (name: string) => {
  const gradients = [
    "from-teal-500 to-emerald-600",
    "from-sky-500 to-blue-600",
    "from-indigo-500 to-violet-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-teal-600",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};


const mapTabToMainTab = (tab: string | null | undefined, isDefaultAdmin = false): "my_schedule" | "overview_slots" | "evaluations" | "teacher_report" | "ttcm_summary" | "re_evaluations" => {
  if (!tab) return isDefaultAdmin ? "overview_slots" : "my_schedule";
  if (tab === "my_schedule" || tab === "my-schedule" || tab === "lich-day" || tab === "schedule") return "my_schedule";
  if (tab === "overview_slots" || tab === "tong-quan" || tab === "overview" || tab === "slots" || tab === "danh-sach" || tab === "dang-ky-du-gio" || tab === "dang-ky" || tab === "register_request") return "overview_slots";
  if (tab === "evaluations" || tab === "evaluation" || tab === "danh-gia") return "evaluations";
  if (tab === "teacher_report" || tab === "report" || tab === "bao-cao" || tab === "thong-ke" || tab === "bao-cao-thong-ke") return "teacher_report";
  if (tab === "ttcm_summary" || tab === "ttcm" || tab === "theo-doi-tong-hop" || tab === "tong-hop-ttcm" || tab === "to-chuyen-mon") return "ttcm_summary";
  if (tab === "re_evaluations" || tab === "re-evaluations" || tab === "xet-duyet" || tab === "xet-duyet-danh-gia-lai") return "re_evaluations";
  return isDefaultAdmin ? "overview_slots" : "my_schedule";
};

const isPreschoolDepartment = (deptNameOrCode: string) => {
  if (!deptNameOrCode) return false;
  const norm = deptNameOrCode
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const raw = deptNameOrCode.toLowerCase().trim();

  return (
    raw.includes("bghmn") ||
    raw.includes("bgh mn") ||
    raw.includes("bgh_mn") ||
    raw.includes("to_tactq_mn") ||
    norm.includes("bghmn") ||
    norm.includes("bgh mn") ||
    norm.includes("ban giam hieu mam non") ||
    norm.includes("mau giao be") ||
    norm.includes("mau giao nho") ||
    norm.includes("mau giao lon") ||
    norm.includes("nha tre") ||
    norm.includes("mam non") ||
    norm.includes("ta mam non") ||
    norm === "mgb" ||
    norm === "mgn" ||
    norm === "mgl" ||
    norm === "nt" ||
    norm.includes("to mau giao") ||
    norm.includes("to nha tre")
  );
};

const getKhacChuyenDeSubjectId = (subjectsList: any[]) => {
  const found = subjectsList.find((s: any) => {
    const name = (s.subjectName || "").toLowerCase().trim();
    const norm = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (
      name === "chủ đề/chuyên đề" ||
      name === "chủ đề / chuyên đề" ||
      norm === "chu de/chuyen de" ||
      norm === "chu de / chuyen de" ||
      name === "khác/chuyên đề" ||
      name === "khác / chuyên đề" ||
      name === "môn học khác / chuyên đề" ||
      norm === "khac/chuyen de" ||
      norm === "khac / chuyen de" ||
      (norm.includes("chu de") && norm.includes("chuyen de")) ||
      (norm.includes("khac") && norm.includes("chuyen de"))
    );
  });
  return found ? found.id : "Chủ đề/Chuyên đề";
};

const isSurpriseSlot = (slot: any) => {
  if (!slot) return false;
  return (
    slot.requestOrigin === "SURPRISE" ||
    (typeof slot.description === "string" && (slot.description.includes("[SURPRISE]") || slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
    (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
  );
};

const isSlotExpired = (slot: any, todayStart: Date) => {
  if (!slot) return true;
  if (slot.status === "EXPIRED") return true;
  if (!slot.date) return false;
  const slotDate = new Date(slot.date);
  if (isNaN(slotDate.getTime())) return false;
  return slotDate < todayStart;
};

const formatEvalDateTimeVi = (dateVal: string | Date | undefined | null) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${time} ngày ${date}`;
};

const getSlotMonthStatus = (dateValue: string | Date | undefined | null): "CURRENT" | "PAST" | "FUTURE" => {
  if (!dateValue) return "CURRENT";
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  let slotYear = currentYear;
  let slotMonth = currentMonth;
  
  if (typeof dateValue === "string" && dateValue.includes("-")) {
    const parts = dateValue.split("T")[0].split("-");
    if (parts.length >= 2) {
      slotYear = parseInt(parts[0], 10);
      slotMonth = parseInt(parts[1], 10) - 1;
    }
  } else {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      slotYear = d.getFullYear();
      slotMonth = d.getMonth();
    }
  }
  
  if (slotYear < currentYear || (slotYear === currentYear && slotMonth < currentMonth)) {
    return "PAST";
  }
  if (slotYear > currentYear || (slotYear === currentYear && slotMonth > currentMonth)) {
    return "FUTURE";
  }
  return "CURRENT";
};

export function ObservationClient(props: ObservationClientProps) {
  const {
    initialSlots = [],
    initialPersonalSlots = [],
    currentTeacher = null,
    subjects = [],
    departments = [],
    divisions = [],
    teachers = [],
    campuses = [],
    classes = [],
    initialFilters = {} as any,
    academicYears = [],
    selectedYearId,
    initialReceivedEvaluations = []
  } = props;

  const isMamNonTeacher = typeof props.isPreschoolPage === "boolean"
    ? props.isPreschoolPage
    : (
        currentTeacher?.user?.role === "GV_MN" || 
        currentTeacher?.user?.role === "BGH_MN" ||
        (currentTeacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non")
      );

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTabParam = searchParams.get("tab") || "dang-ky"
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAdminRoute = (typeof pathname === "string" && pathname.startsWith("/admin")) || props.isAdminPage || false;
  const [viewMode, setViewMode] = useState<"ADMIN" | "TEACHER">(() => {
    if (props.initialViewMode) return props.initialViewMode;
    if (isAdminRoute || props.isAdminPage) return "ADMIN";
    return "TEACHER";
  });

  const [slots, setSlots] = useState(initialSlots)
  const [personalSlots, setPersonalSlots] = useState<any[]>(props.initialPersonalSlots || initialSlots)

  useEffect(() => {
    if (props.initialPersonalSlots) {
      setPersonalSlots(props.initialPersonalSlots);
    }
  }, [props.initialPersonalSlots])
  const [activeTab, setActiveTab] = useState(activeTabParam)
  
  // Re-evaluation States
  const [reEvalModal, setReEvalModal] = useState<{ registration: any; slot: any } | null>(null)
  const [reEvalReason, setReEvalReason] = useState("")
  const [reEvalSubmitting, setReEvalSubmitting] = useState(false)
  const [adminReEvalModal, setAdminReEvalModal] = useState<{ request: any; action: "approve" | "reject" } | null>(null)
  const [adminReEvalNote, setAdminReEvalNote] = useState("")
  const [adminReEvalSubmitting, setAdminReEvalSubmitting] = useState(false)
  const [reEvalFilterStatus, setReEvalFilterStatus] = useState<"ALL" | "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED">("ALL")
  const [reEvalSearchQuery, setReEvalSearchQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creationMode, setCreationMode] = useState<"TEACHER_OPEN" | "OBSERVER_REQUEST" | "SURPRISE">("TEACHER_OPEN")

  const minAllowedDate = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }, []);

  // Surprise Observation States
  const [surpriseDeptId, setSurpriseDeptId] = useState<string>("")
  const [surpriseTeacherId, setSurpriseTeacherId] = useState<string>("")
  const [surpriseCampusId, setSurpriseCampusId] = useState<string>("")
  const [surpriseClassId, setSurpriseClassId] = useState<string>("")
  const [surpriseClassName, setSurpriseClassName] = useState<string>("")
  const [surpriseSubjectId, setSurpriseSubjectId] = useState<string>(() => isMamNonTeacher ? getKhacChuyenDeSubjectId(subjects) : "")
  const [surpriseSubjectName, setSurpriseSubjectName] = useState<string>(() => isMamNonTeacher ? "Chủ đề/Chuyên đề" : "")
  const [surpriseLevel, setSurpriseLevel] = useState<string>(() => isMamNonTeacher ? "Mầm non" : "Phổ thông K-12")
  const [surpriseGrade, setSurpriseGrade] = useState<string>(() => isMamNonTeacher ? "Mầm non" : "Khối 10")
  const [surpriseTopic, setSurpriseTopic] = useState<string>("")
  const [surpriseDate, setSurpriseDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [surprisePeriod, setSurprisePeriod] = useState<string>("Tiết 1")
  const [surpriseRoom, setSurpriseRoom] = useState<string>("Phòng học")
  const [surpriseScoresK12, setSurpriseScoresK12] = useState<number[]>(() => Array(11).fill(0))
  const [surpriseScoresMN, setSurpriseScoresMN] = useState<number[]>(() => Array(18).fill(0))
  const [surpriseStrengths, setSurpriseStrengths] = useState<string>("")
  const [surpriseImprovements, setSurpriseImprovements] = useState<string>("")
  const [surpriseGeneral, setSurpriseGeneral] = useState<string>("")
  const [surpriseOverall, setSurpriseOverall] = useState<string>("")
  const [surpriseSubmitting, setSurpriseSubmitting] = useState<boolean>(false)

  // Request Observation Form States
  const [reqCampusId, setReqCampusId] = useState("")
  const [reqDeptId, setReqDeptId] = useState("")
  const [reqTeacherId, setReqTeacherId] = useState("")
  const [reqSubjectId, setReqSubjectId] = useState("")
  const [reqLevel, setReqLevel] = useState("")
  const [reqGrade, setReqGrade] = useState("")
  const [reqClassId, setReqClassId] = useState("")
  const [reqDate, setReqDate] = useState("")
  const [reqPeriod, setReqPeriod] = useState("Tiết 1")
  const [reqTopic, setReqTopic] = useState("")
  const [reqNotes, setReqNotes] = useState("")
  const [declineReason, setDeclineReason] = useState("")
  const [decliningSlotId, setDecliningSlotId] = useState<string | null>(null)
  const [registerDetailSlot, setRegisterDetailSlot] = useState<any | null>(null)
  const [historySlot, setHistorySlot] = useState<any | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [printModalSlot, setPrintModalSlot] = useState<{ slot: any; registration: any } | null>(null);
  const [evalDraftSavedAt, setEvalDraftSavedAt] = useState<Date | null>(null);
  const [hasEvalDraft, setHasEvalDraft] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null)
  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(null)
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [isDeletingBulk, setIsDeletingBulk] = useState<boolean>(false)

  // Filter states
  const [filterSchoolBlock, setFilterSchoolBlock] = useState("all");
  const [selectedEvalMonth, setSelectedEvalMonth] = useState('ALL');
  const [activeMainTab, setActiveMainTab] = useState<"register_request" | "overview_slots" | "my_schedule" | "evaluations" | "teacher_report" | "ttcm_summary" | "re_evaluations">(() => mapTabToMainTab(searchParams.get("tab"), (props.isAdminPage || (typeof pathname === "string" && pathname.startsWith("/admin")))));
  const [myScheduleSubTab, setMyScheduleSubTab] = useState<"register" | "all" | "taught" | "observed" | "requests">("all");
  type FilterTab = "all" | "self_open" | "expired" | "gbm_request" | "my_dept" | "other_dept";
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>("all");
  const [taughtOriginFilter, setTaughtOriginFilter] = useState<"all" | "PLAN" | "SURPRISE">("all");
  const [taughtCategoryFilter, setTaughtCategoryFilter] = useState<"all" | "MN" | "PT">("all");
  const [observedOriginFilter, setObservedOriginFilter] = useState<"all" | "PLAN" | "SURPRISE">("all");
  const [observedCategoryFilter, setObservedCategoryFilter] = useState<"all" | "GVNN" | "MN" | "PT">("all");
  const [sendEmailNotif, setSendEmailNotif] = useState<boolean>(true);
  const [selectedEmailTeacherIds, setSelectedEmailTeacherIds] = useState<string[]>([]);

  // Filter teachers belonging ONLY to current logged-in teacher's department
  const myDeptTeachers = useMemo(() => {
    if (!currentTeacher?.departmentId) return teachers;
    return teachers.filter((t: any) => t.departmentId === currentTeacher.departmentId);
  }, [teachers, currentTeacher?.departmentId]);

  useEffect(() => {
    if (myDeptTeachers.length > 0 && selectedEmailTeacherIds.length === 0) {
      setSelectedEmailTeacherIds(myDeptTeachers.map((t: any) => t.id));
    }
  }, [myDeptTeachers]);

  const [filterLevel, setFilterLevel] = useState(initialFilters.level || "all")
  const [filterGrade, setFilterGrade] = useState(initialFilters.grade || "all")
  const [filterPeriod, setFilterPeriod] = useState(initialFilters.period || "all")
  const [filterDate, setFilterDate] = useState(initialFilters.date || "")
  const [filterCampusId, setFilterCampusId] = useState(initialFilters.campusId || "all")
  const [filterDeptId, setFilterDeptId] = useState(initialFilters.deptId || "all")
  const [filterDivisionCode, setFilterDivisionCode] = useState(initialFilters.divisionCode || "all")
  const [filterClassId, setFilterClassId] = useState(initialFilters.classId || "all")
  const [filterAcademicYearId, setFilterAcademicYearId] = useState(initialFilters.academicYearId || selectedYearId || "")

  const handleAcademicYearChange = (yearId: string) => {
    setFilterAcademicYearId(yearId)
    const params = new URLSearchParams(window.location.search)
    params.set("academicYearId", yearId)
    router.push(`${pathname}?${params.toString()}`)
  }

  const [filterMonth, setFilterMonth] = useState<string>(initialFilters.month || "all");

  useEffect(() => {
    if (!initialFilters.month && typeof window !== "undefined") {
      const stored = localStorage.getItem("skyline_du_gio_filter_month");
      if (stored && stored !== "all") {
        setFilterMonth(stored);
      }
    }
  }, [initialFilters.month]);

  const handleMonthChange = (newMonth: string) => {
    setFilterMonth(newMonth);
    if (typeof window !== "undefined") {
      if (newMonth && newMonth !== "all") {
        localStorage.setItem("skyline_du_gio_filter_month", newMonth);
      } else {
        localStorage.removeItem("skyline_du_gio_filter_month");
      }
    }
  };

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const safeYears = Array.isArray(academicYears) ? academicYears : [];
    const activeYearObj = safeYears.find((y: any) => y.id === filterAcademicYearId) || safeYears.find((y: any) => y.status === "ACTIVE") || safeYears[0];
    
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (activeYearObj?.startDate && activeYearObj?.endDate) {
      startDate = new Date(activeYearObj.startDate);
      endDate = new Date(activeYearObj.endDate);
      // Extend end date to the end of that day/month
      endDate.setHours(23, 59, 59, 999);
    } else if (typeof activeYearObj?.name === "string" && activeYearObj.name.includes("-")) {
      const parts = activeYearObj.name.split("-");
      const startYear = parseInt(parts[0], 10);
      const endYear = parseInt(parts[1], 10);
      if (!isNaN(startYear) && !isNaN(endYear)) {
        startDate = new Date(`${startYear}-08-01T00:00:00.000Z`);
        endDate = new Date(`${endYear}-07-31T23:59:59.999Z`);
      }
    }

    const isMonthInAcademicYear = (y: number, m: number) => {
      if (startDate && endDate) {
        const checkStart = new Date(y, m - 1, 1);
        const checkEnd = new Date(y, m, 0, 23, 59, 59, 999);
        return checkEnd >= startDate && checkStart <= endDate;
      }
      return true;
    };

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    if (isMonthInAcademicYear(curY, curM)) {
      monthsSet.add(`${curY}-${curM.toString().padStart(2, "0")}`);
    }

    (slots || []).forEach((slot: any) => {
      if (slot.date) {
        const d = new Date(slot.date);
        if (!isNaN(d.getTime())) {
          const sy = d.getFullYear();
          const sm = d.getMonth() + 1;
          if (isMonthInAcademicYear(sy, sm)) {
            monthsSet.add(`${sy}-${sm.toString().padStart(2, "0")}`);
          }
        }
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [slots, academicYears, filterAcademicYearId]);

  const checkIsMyDept = useCallback((slot: any) => {
    if (!currentTeacher || !slot?.teacher) return false;
    const normDept = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    
    const myDeptIds = new Set<string>();
    const myDeptNames = new Set<string>();

    if (currentTeacher.departmentId) myDeptIds.add(currentTeacher.departmentId);
    if (currentTeacher.departmentRel?.name) myDeptNames.add(normDept(currentTeacher.departmentRel.name));
    
    if (currentTeacher.departmentAssignments && Array.isArray(currentTeacher.departmentAssignments)) {
      currentTeacher.departmentAssignments.forEach((da: any) => {
        if (da.departmentId) myDeptIds.add(da.departmentId);
        if (da.department?.name) myDeptNames.add(normDept(da.department.name));
      });
    }

    const slotTeacher = slot.teacher;
    const slotDeptIds = new Set<string>();
    const slotDeptNames = new Set<string>();

    if (slotTeacher.departmentId) slotDeptIds.add(slotTeacher.departmentId);
    if (slotTeacher.departmentRel?.name) slotDeptNames.add(normDept(slotTeacher.departmentRel.name));
    if (slot.targetDeptId) slotDeptIds.add(slot.targetDeptId);

    if (slotTeacher.departmentAssignments && Array.isArray(slotTeacher.departmentAssignments)) {
      slotTeacher.departmentAssignments.forEach((da: any) => {
        if (da.departmentId) slotDeptIds.add(da.departmentId);
        if (da.department?.name) slotDeptNames.add(normDept(da.department.name));
      });
    }

    if (isMamNonTeacher) {
      const slotMN = slot.level === "Mầm non" || (slotTeacher.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
      if (!slotMN) return false;
      if (myDeptNames.size === 0) return true;
      for (const name of slotDeptNames) {
        if (name !== "" && myDeptNames.has(name)) return true;
      }
      return false;
    }

    for (const id of slotDeptIds) {
      if (myDeptIds.has(id)) return true;
    }

    for (const name of slotDeptNames) {
      if (name !== "" && myDeptNames.has(name)) return true;
      for (const myName of myDeptNames) {
        if (name !== "" && myName !== "" && (name.includes(myName) || myName.includes(name))) return true;
      }
    }

    return false;
  }, [currentTeacher, isMamNonTeacher]);

  const filteredReqClasses = useMemo(() => {
    let cleanDbLevel = "";
    if (reqLevel && reqLevel !== "all") {
      if (reqLevel === "Tiểu học") cleanDbLevel = "tieu hoc";
      else if (reqLevel === "THCS") cleanDbLevel = "thcs";
      else if (reqLevel === "THPT") cleanDbLevel = "thpt";
      else if (reqLevel === "Mầm non") cleanDbLevel = "mam non";
      else cleanDbLevel = reqLevel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    const numGrade = reqGrade ? reqGrade.replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim() : "";

    return classes.filter((c: any) => {
      if (reqCampusId && reqCampusId !== "all" && c.campusId !== reqCampusId) return false;

      if (cleanDbLevel && cleanDbLevel !== "pho thong k-12") {
        const cLevelClean = (c.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (cLevelClean !== cleanDbLevel) return false;
      }

      if (!reqGrade || reqGrade === "all") return true;

      if (cleanDbLevel === "mam non") {
        const cleanCGrade = (c.grade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const cleanNGrade = reqGrade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return cleanCGrade === cleanNGrade || cleanCGrade.includes(cleanNGrade) || cleanNGrade.includes(cleanCGrade);
      }

      const cGradeNum = (c.grade || "").replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
      return cGradeNum === numGrade || (c.grade || "").trim() === numGrade || cGradeNum.startsWith(numGrade + ".");
    });
  }, [classes, reqLevel, reqGrade, reqCampusId]);

  const filteredTeachersForRequest = useMemo(() => {
    if (!reqDeptId) return teachers;
    return teachers.filter((t: any) => isTeacherInDepartment(t, reqDeptId));
  }, [teachers, reqDeptId]);

  const autoSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create form states
  const [newSubjectId, setNewSubjectId] = useState("")
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newLevel, setNewLevel] = useState(isMamNonTeacher ? "Mầm non" : "")
  const [newGrade, setNewGrade] = useState("")
  const [newCampusId, setNewCampusId] = useState(currentTeacher?.campusId || "")
  const [newClassId, setNewClassId] = useState("")
  const [newClassNameText, setNewClassNameText] = useState("")
  const [newTopic, setNewTopic] = useState("")
  const [newChuDe, setNewChuDe] = useState("")
  const [newHoatDong, setNewHoatDong] = useState("")
  const [newDeTai, setNewDeTai] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newStartTime, setNewStartTime] = useState("Tiết 1")
  const [newEndTime, setNewEndTime] = useState("Tiết 1")
  const [newIsDoublePeriod, setNewIsDoublePeriod] = useState(false)
  const [newDescription, setNewDescription] = useState("")
  const [newVisibility, setNewVisibility] = useState("ALL");
  const [newNotifMode, setNewNotifMode] = useState<"ALL" | "SELECTED">("ALL");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [availableDeptTeachers, setAvailableDeptTeachers] = useState<any[]>([]);
  const [newTargetDeptId, setNewTargetDeptId] = useState("")
  const [newLessonPlanName, setNewLessonPlanName] = useState("")
  const [newLessonPlanData, setNewLessonPlanData] = useState("")

  const [monthlyLimitCount, setMonthlyLimitCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [editSlotId, setEditSlotId] = useState<string | null>(null)

  // Targets
  const [selfRequiredObserved, setSelfRequiredObserved] = useState(currentTeacher?.requiredObserved || 0)
  const [selfObservedUnit, setSelfObservedUnit] = useState(currentTeacher?.observedUnit || "tháng")
  const [selfRequiredTaught, setSelfRequiredTaught] = useState(currentTeacher?.requiredTaught || 0)
  const [selfTaughtUnit, setSelfTaughtUnit] = useState(currentTeacher?.taughtUnit || "tháng")

  // Evaluation modal state
  const [evalModal, setEvalModal] = useState<{ registration: any; slot: any } | null>(null)
  const [evalCriteria, setEvalCriteria] = useState([0, 0, 0, 0, 0])
  const [evalK12Scores, setEvalK12Scores] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  const [evalStrengths, setEvalStrengths] = useState("")
  const [evalImprovements, setEvalImprovements] = useState("")
  const [evalGeneral, setEvalGeneral] = useState("")
  const [evalOverall, setEvalOverall] = useState("")
  const [evalSubmitting, setEvalSubmitting] = useState(false)
  const [teacherFeedbackText, setTeacherFeedbackText] = useState("")
  const [teacherFeedbackSubmitting, setTeacherFeedbackSubmitting] = useState(false)

  useEffect(() => { 
    setActiveTab(activeTabParam);
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveMainTab(mapTabToMainTab(tab));
    }
  }, [activeTabParam, searchParams]);

  useEffect(() => {
    const evalSlotIdParam = searchParams.get("evalSlotId");
    if (evalSlotIdParam) {
      setActiveMainTab("evaluations");
    }
    if (evalSlotIdParam && slots.length > 0) {
      const targetSlot = slots.find((s: any) => s.id === evalSlotIdParam);
      if (targetSlot) {
        const myReg = targetSlot.registrations?.find((r: any) => r.teacherId === currentTeacher?.id);
        if (myReg) {
          openEvalModal(myReg, targetSlot);
        } else if (targetSlot.registrations && targetSlot.registrations.length > 0) {
          openEvalModal(targetSlot.registrations[0], targetSlot);
        }
      }
    }
  }, [searchParams, slots, currentTeacher]);

  // Deep-linking from notification or email: Auto switch tab, scroll to slot, highlight, and open registration modal
  useEffect(() => {
    const slotIdParam = searchParams.get("slotId");
    const teacherNameParam = searchParams.get("teacherName");
    const topicParam = searchParams.get("topic");
    const actionParam = searchParams.get("action");
    const tabParam = searchParams.get("tab");

    if (!slotIdParam && !teacherNameParam && !topicParam) return;
    if (tabParam === "evaluations") return;

    if (slots && slots.length > 0) {
      let targetSlot: any = null;

      if (slotIdParam) {
        targetSlot = slots.find((s: any) => s.id === slotIdParam);
      }

      if (!targetSlot && teacherNameParam) {
        const cleanTeacher = teacherNameParam.trim().toLowerCase();
        targetSlot = slots.find((s: any) => {
          const sTeacher = (s.teacher?.teacherName || "").trim().toLowerCase();
          return sTeacher.includes(cleanTeacher) || cleanTeacher.includes(sTeacher);
        });
      }

      if (!targetSlot && topicParam) {
        const cleanTopic = topicParam.trim().toLowerCase();
        targetSlot = slots.find((s: any) => {
          const sTopic = (s.topic || "").trim().toLowerCase();
          return sTopic.includes(cleanTopic) || cleanTopic.includes(sTopic);
        });
      }

      if (targetSlot) {
        const isHost = targetSlot.teacherId === currentTeacher?.id || targetSlot.teacher?.id === currentTeacher?.id;

        if (isHost) {
          // Logged-in teacher is the host of this slot -> go to my_schedule
          setActiveMainTab("my_schedule");
          setHighlightedSlotId(targetSlot.id);
          setTimeout(() => {
            const el = document.getElementById(`my-taught-slot-${targetSlot.id}`) || document.getElementById(`slot-row-${targetSlot.id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 400);
        } else {
          // Observer user -> Switch to overview_slots, reset filters that could hide this slot
          setActiveMainTab("overview_slots");
          setActiveFilterTab("all");
          setFilterSchoolBlock("all");
          setHighlightedSlotId(targetSlot.id);

          setTimeout(() => {
            const el = document.getElementById(`slot-row-${targetSlot.id}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 400);

          // If action is register, open the registration modal or notify status
          if (actionParam === "register") {
            const todayStr = new Date().toISOString().split("T")[0];
            const isExpired = targetSlot.status === "EXPIRED" || (targetSlot.date && targetSlot.date.split("T")[0] < todayStr);
            const myReg = targetSlot.registrations?.find((r: any) => r.teacherId === currentTeacher?.id);
            const observerCount = targetSlot.registrations?.length || 0;

            if (myReg) {
              setToast({
                message: `Bạn đã đăng ký tham dự tiết dạy của Thầy/Cô ${targetSlot.teacher?.teacherName} (${myReg.isApproved ? "Đã được xác nhận" : "Đang chờ duyệt"}).`,
                type: "info"
              });
            } else if (isExpired) {
              setToast({
                message: `Tiết dạy của Thầy/Cô ${targetSlot.teacher?.teacherName} đã diễn ra hoặc hết hạn đăng ký.`,
                type: "error"
              });
            } else if (observerCount >= (targetSlot.maxSeats || 4)) {
              setToast({
                message: `Tiết dạy của Thầy/Cô ${targetSlot.teacher?.teacherName} đã đủ ${targetSlot.maxSeats || 4} giáo viên đăng ký.`,
                type: "error"
              });
            } else {
              // Valid to register! Open registration modal popup directly
              setRegisterDetailSlot(targetSlot);
            }
          }
        }

        // Auto remove highlight pulse after 7 seconds
        const timer = setTimeout(() => {
          setHighlightedSlotId(null);
        }, 7000);
        return () => clearTimeout(timer);
      }
    }
  }, [searchParams, slots, currentTeacher]);

  useEffect(() => {
    setSlots(initialSlots)
  }, [initialSlots])

  useEffect(() => {
    if (newDate) {
      getCreatedCountInMonth(newDate).then(res => { if (res.success) setMonthlyLimitCount(res.count) })
    }
  }, [newDate])

  useEffect(() => {
    if (isMamNonTeacher) {
      setNewLevel("Mầm non");
    }
  }, [isMamNonTeacher])

  const openHistoryModal = (slot: any) => {
    setHistorySlot(slot);
    setShowHistoryModal(true);
  };

  const resetCreateForm = () => {
    setEditSlotId(null);
    setNewCampusId(currentTeacher?.campusId || "");
    setNewSubjectId(""); setNewSubjectName(""); setNewLevel(isMamNonTeacher ? "Mầm non" : ""); setNewGrade(""); setNewClassId("");
    setNewClassNameText(""); setNewTopic(""); setNewDate(""); setNewStartTime("Tiết 1"); setNewEndTime("Tiết 1");
    setNewIsDoublePeriod(false); setNewDescription(""); setNewVisibility("ALL"); setNewTargetDeptId(""); setNewNotifMode("ALL"); setSelectedMemberIds([]); setSendEmailNotif(true);
    setNewLessonPlanName(""); setNewLessonPlanData("");
    setNewChuDe(""); setNewHoatDong(""); setNewDeTai("");
    setSurpriseTopic("");
    setSurpriseTeacherId("");
    setSurpriseScoresK12(Array(11).fill(0));
    setSurpriseScoresMN(Array(18).fill(0));
    setSurpriseStrengths("");
    setSurpriseImprovements("");
    setSurpriseGeneral("");
    setSurpriseOverall("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEditModal = (slot: any) => {
    setEditSlotId(slot.id);
    setNewSubjectId(slot.subjectId || "other");
    setNewSubjectName(slot.subjectName || "");
    setNewLevel(slot.level || "");
    setNewGrade(slot.grade ? (slot.level === "Mầm non" ? slot.grade : "Khoi " + slot.grade) : "");
    setNewCampusId(slot.campusId || "");
    setNewClassId(slot.classId || "other");
    setNewClassNameText(slot.className || "");
    setNewTopic(slot.topic || "");
    if (slot.level === "Mầm non") {
      const parts = (slot.subjectName || "").split(" | ");
      setNewChuDe(parts[0] || "");
      setNewHoatDong(parts[1] || "");
      setNewDeTai(slot.topic || "");
    } else {
      setNewChuDe("");
      setNewHoatDong("");
      setNewDeTai("");
    }
    setNewDate(new Date(slot.date).toISOString().split('T')[0]);
    setNewStartTime(slot.startTime || "Tiết 1");
    setNewEndTime(slot.endTime || "Tiết 1");
    setNewIsDoublePeriod(slot.isDoublePeriod || false);
    setNewDescription(slot.description || "");
    setNewVisibility(slot.visibilityType || "ALL");
    setNewTargetDeptId(slot.targetDeptId || "");
    setNewLessonPlanName(slot.lessonPlanName || "");
    setNewLessonPlanData(slot.lessonPlanData || "");
    setShowCreateModal(true);
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const mamNonGrades = useMemo(() => {
    const effectiveCampusId = newCampusId || reqCampusId || currentTeacher?.campusId || "";
    const gradeSet = new Set<string>();
    classes.forEach((cls: any) => {
      if (effectiveCampusId && cls.campusId !== effectiveCampusId) return;
      const lvlClean = (cls.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (lvlClean !== "mam non") return;
      if (cls.grade) gradeSet.add(cls.grade);
    });
    const ORDER = ["Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];
    return [...gradeSet].sort((a, b) => {
      const idxA = ORDER.indexOf(a);
      const idxB = ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, "vi");
    });
  }, [classes, newCampusId, reqCampusId, currentTeacher?.campusId]);

  // Auto-sync ranking when surprise scores change
  useEffect(() => {
    const isMN = surpriseLevel === "Mầm non" || isMamNonTeacher;
    const rankInfo = isMN ? getMamNonRankingDetails(surpriseScoresMN) : getK12RankingDetails(surpriseScoresK12);
    setSurpriseOverall(rankInfo.rating);
  }, [surpriseScoresK12, surpriseScoresMN, surpriseLevel, isMamNonTeacher]);

  // Auto-sync ranking when evalModal scores change
  useEffect(() => {
    if (!evalModal) return;
    const isMN = evalModal.slot?.level === "Mầm non";
    const rankInfo = isMN ? getMamNonRankingDetails(evalCriteria) : getK12RankingDetails(evalK12Scores);
    setEvalOverall(rankInfo.rating);
  }, [evalK12Scores, evalCriteria, evalModal]);

  const periodOptions = ["Tiết 1","Tiết 2","Tiết 3","Tiết 4","Tiết 5","Tiết 6","Tiết 7","Tiết 8"]

  const getGradesForLevel = (level: string) => {
    switch (level) {
      case "Mầm non": return mamNonGrades.length > 0 ? mamNonGrades : ["Nhà trẻ 24-36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"]
      case "Tiểu học": return ["Khối 1","Khối 2","Khối 3","Khối 4","Khối 5"]
      case "THCS": return ["Khối 6","Khối 7","Khối 8","Khối 9"]
      case "THPT": return ["Khối 10","Khối 11","Khối 12"]
      case "Phổ thông K-12": return [
        "Khối 1","Khối 2","Khối 3","Khối 4","Khối 5",
        "Khối 6","Khối 7","Khối 8","Khối 9",
        "Khối 10","Khối 11","Khối 12"
      ]
      default: return []
    }
  }

  const filteredClassesForCreation = useMemo(() => {
    if (!newLevel) return [];
    const effectiveCampusId = newCampusId || currentTeacher?.campusId || "";

    let cleanDbLevel = "";
    if (newLevel === "Tiểu học") cleanDbLevel = "tieu hoc";
    else if (newLevel === "THCS") cleanDbLevel = "thcs";
    else if (newLevel === "THPT") cleanDbLevel = "thpt";
    else if (newLevel === "Mầm non") cleanDbLevel = "mam non";
    else cleanDbLevel = newLevel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const numGrade = newGrade ? newGrade.replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim() : "";

    return classes.filter(c => {
      if (effectiveCampusId && c.campusId !== effectiveCampusId) return false;

      if (cleanDbLevel && cleanDbLevel !== "pho thong k-12") {
        const cLevelClean = (c.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (cLevelClean !== cleanDbLevel) return false;
      }

      if (!newGrade || newGrade === "all") return true;

      if (cleanDbLevel === "mam non") {
        const cleanCGrade = (c.grade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const cleanNGrade = newGrade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return cleanCGrade === cleanNGrade || cleanCGrade.includes(cleanNGrade) || cleanNGrade.includes(cleanCGrade);
      }

      const cGradeNum = (c.grade || "").replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
      return cGradeNum === numGrade || (c.grade || "").trim() === numGrade || cGradeNum.startsWith(numGrade + ".");
    });
  }, [classes, newCampusId, currentTeacher?.campusId, newLevel, newGrade]);

  

  const getNextPeriod = (p: string) => { const m = p.match(/\d+/); if (m) { const n = parseInt(m[0]); if (n < 8) return `Tiết ${n+1}` } return p }
  const handleStartTimeChange = (val: string) => { setNewStartTime(val); setNewEndTime(newIsDoublePeriod ? getNextPeriod(val) : val) }
  const handleDoublePeriodChange = (checked: boolean) => { setNewIsDoublePeriod(checked); if (checked) setNewEndTime(getNextPeriod(newStartTime)); else setNewEndTime(newStartTime) }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") { showToast("Chỉ hỗ trợ tải lên file PDF!", "error"); e.target.value = ""; return }
    if (file.size > 5 * 1024 * 1024) { showToast("Kích thước file không được vượt quá 5MB!", "error"); e.target.value = ""; return }
    const reader = new FileReader()
    reader.onload = () => { setNewLessonPlanName(file.name); setNewLessonPlanData(reader.result as string); showToast("Đã đính kèm giáo án PDF!", "info") }
    reader.readAsDataURL(file)
  }

  const handleSearch = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    if (filterSchoolBlock && filterSchoolBlock !== "all") params.set("schoolBlock", filterSchoolBlock); else params.delete("schoolBlock")
    if (filterCampusId && filterCampusId !== "all") params.set("campusId", filterCampusId); else params.delete("campusId")
    if (filterDivisionCode && filterDivisionCode !== "all") params.set("divisionCode", filterDivisionCode); else params.delete("divisionCode")
    if (filterDeptId && filterDeptId !== "all") params.set("deptId", filterDeptId); else params.delete("deptId")
    if (filterLevel && filterLevel !== "all") params.set("level", filterLevel); else params.delete("level")
    if (filterGrade && filterGrade !== "all") params.set("grade", filterGrade); else params.delete("grade")
    if (filterClassId && filterClassId !== "all") params.set("classId", filterClassId); else params.delete("classId")
    if (filterDate) params.set("date", filterDate); else params.delete("date")
    if (filterMonth && filterMonth !== "all") params.set("month", filterMonth); else params.delete("month")
    if (filterPeriod && filterPeriod !== "all") params.set("period", filterPeriod); else params.delete("period")
    
    setIsSearching(true)
    try {
      router.push(`${pathname}?${params.toString()}`)
      const res = await getObservationSlots({ 
        schoolBlock: filterSchoolBlock, 
        campusId: filterCampusId, 
        divisionCode: filterDivisionCode,
        deptId: filterDeptId, 
        level: filterLevel, 
        grade: filterGrade, 
        classId: filterClassId, 
        period: filterPeriod, 
        date: filterDate,
        month: filterMonth,
        academicYearId: filterAcademicYearId
      })
      if (res.success && res.slots) { setSlots(res.slots) }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSearching(false)
    }
  }, [filterSchoolBlock, filterCampusId, filterDivisionCode, filterDeptId, filterLevel, filterGrade, filterClassId, filterPeriod, filterDate, filterMonth, filterAcademicYearId, router, pathname])

  useEffect(() => {
    if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current)
    autoSearchTimerRef.current = setTimeout(() => {
      handleSearch()
    }, 400)
    return () => { if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current) }
  }, [filterSchoolBlock, filterCampusId, filterDivisionCode, filterDeptId, filterLevel, filterGrade, filterClassId, filterPeriod, filterDate, filterMonth, handleSearch])

  const filterAvailableClasses = useMemo(() => {
    return classes.filter(c => {
      if (filterCampusId && filterCampusId !== "all" && c.campusId !== filterCampusId) return false;
      if (filterLevel && filterLevel !== "all") {
        let cleanLevel = filterLevel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (filterLevel === "Tiểu học") cleanLevel = "tieu hoc";
        else if (filterLevel === "THCS") cleanLevel = "thcs";
        else if (filterLevel === "THPT") cleanLevel = "thpt";
        else if (filterLevel === "Mầm non") cleanLevel = "mam non";
        if (cleanLevel !== "pho thong k-12") {
          const cLevelClean = (c.level || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          if (cLevelClean && cLevelClean !== cleanLevel) return false;
        }
      }
      if (filterGrade && filterGrade !== "all") {
        const cGradeClean = (c.grade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const fGradeClean = filterGrade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const fGradeNum = filterGrade.replace(/Khối\s+/gi, "").replace(/Khoi\s+/gi, "").trim();
        if (cGradeClean !== fGradeClean && !cGradeClean.includes(fGradeClean) && !fGradeClean.includes(cGradeClean)) {
          if (!cGradeClean.endsWith(fGradeNum) && cGradeClean !== fGradeNum) return false;
        }
      }
      return true;
    });
  }, [classes, filterCampusId, filterLevel, filterGrade]);

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterCampusId && filterCampusId !== "all") count++
    if (filterDivisionCode && filterDivisionCode !== "all") count++
    if (filterDeptId && filterDeptId !== "all") count++
    if (filterLevel && filterLevel !== "all") count++
    if (filterGrade && filterGrade !== "all") count++
    if (filterClassId && filterClassId !== "all") count++
    if (filterDate) count++
    if (filterMonth && filterMonth !== "all") count++
    if (filterPeriod && filterPeriod !== "all") count++
    return count
  }, [filterCampusId, filterDivisionCode, filterDeptId, filterLevel, filterGrade, filterClassId, filterDate, filterMonth, filterPeriod])

  const activeFilterTags = useMemo(() => {
    const tags: { key: string; label: string; value: string; onRemove: () => void }[] = []
    if (filterCampusId && filterCampusId !== "all") {
      const campus = campuses.find(c => c.id === filterCampusId)
      tags.push({ key: "campus", label: "Cơ sở", value: campus?.campusName || filterCampusId, onRemove: () => { setFilterCampusId("all"); setFilterClassId("all"); } })
    }
    if (filterDivisionCode && filterDivisionCode !== "all") {
      const div = (props.divisions || ACADEMIC_DIVISIONS).find((d: any) => d.code === filterDivisionCode)
      tags.push({ key: "division", label: "Bộ phận", value: div?.name || filterDivisionCode, onRemove: () => { setFilterDivisionCode("all"); setFilterDeptId("all"); } })
    }
    if (filterDeptId && filterDeptId !== "all") {
      const dept = departments.find(d => d.id === filterDeptId)
      tags.push({ key: "dept", label: "Tổ CM", value: dept?.name || filterDeptId, onRemove: () => setFilterDeptId("all") })
    }
    if (filterLevel && filterLevel !== "all") {
      tags.push({ key: "level", label: "Bậc học", value: filterLevel, onRemove: () => { setFilterLevel("all"); setFilterGrade("all"); setFilterClassId("all"); } })
    }
    if (filterGrade && filterGrade !== "all") {
      tags.push({ key: "grade", label: "Khối", value: filterGrade, onRemove: () => { setFilterGrade("all"); setFilterClassId("all"); } })
    }
    if (filterClassId && filterClassId !== "all") {
      const cls = classes.find(c => c.id === filterClassId || c.className === filterClassId)
      tags.push({ key: "class", label: "Lớp", value: cls?.className || filterClassId, onRemove: () => setFilterClassId("all") })
    }
    if (filterDate) {
      const d = new Date(filterDate)
      const formatted = d.getDate().toString().padStart(2,"0") + "/" + (d.getMonth()+1).toString().padStart(2,"0") + "/" + d.getFullYear()
      tags.push({ key: "date", label: "Ngày", value: formatted, onRemove: () => setFilterDate("") })
    }
    if (filterMonth && filterMonth !== "all") {
      const [y, m] = filterMonth.split("-");
      tags.push({ key: "month", label: "Tháng", value: `Tháng ${m}/${y}`, onRemove: () => handleMonthChange("all") })
    }
    if (filterPeriod && filterPeriod !== "all") {
      tags.push({ key: "period", label: "Tiết", value: filterPeriod, onRemove: () => setFilterPeriod("all") })
    }
    return tags
  }, [filterCampusId, filterDivisionCode, filterDeptId, filterLevel, filterGrade, filterClassId, filterDate, filterMonth, filterPeriod, campuses, departments, classes, props.divisions])

  const clearAllFilters = () => {
    setFilterCampusId("all")
    setFilterDivisionCode("all")
    setFilterDeptId("all")
    setFilterLevel("all")
    setFilterGrade("all")
    setFilterClassId("all")
    setFilterDate("")
    handleMonthChange("all")
    setFilterPeriod("all")
    setFilterSchoolBlock("all")
  }

  const refreshSlots = async () => {
    const [res, refRes] = await Promise.all([
      getObservationSlots({ 
        schoolBlock: filterSchoolBlock, 
        campusId: filterCampusId, 
        divisionCode: filterDivisionCode,
        deptId: filterDeptId, 
        level: filterLevel, 
        grade: filterGrade, 
        classId: filterClassId, 
        period: filterPeriod, 
        date: filterDate,
        month: filterMonth,
        academicYearId: filterAcademicYearId
      }),
      getObservationData(filterAcademicYearId)
    ]);
    if (res.success && res.slots) setSlots(res.slots);
    if (refRes.success && refRes.myPersonalSlots) setPersonalSlots(refRes.myPersonalSlots);
  }



  const handleRegister = async (slotId: string) => {
    setRegisterDetailSlot(null)
    startTransition(async () => {
      const res = await registerObservation(slotId)
      if (res.success) { showToast("Đăng ký dự giờ thành công!", "success"); refreshSlots() }
      else showToast(res.error || "Không thể đăng ký!", "error")
    })
  }

  const handleCancelRegistration = async (slotId: string) => {
    if (!confirm("Thầy/Cô có chắc chắn muốn hủy đăng ký dự giờ tiết dạy này?")) return
    startTransition(async () => {
      const res = await cancelObservation(slotId)
      if (res.success) { showToast("Đã hủy đăng ký dự giờ!", "info"); refreshSlots() }
      else showToast(res.error || "Không thể hủy đăng ký!", "error")
    })
  }

  const handleDeleteSlot = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    const hasRegs = slot.registrations && slot.registrations.length > 0;
    
    if (hasRegs && !canDeleteAnySlot) {
      showToast("Không thể xóa tiết dạy đã có giáo viên đăng ký!", "error");
      return;
    }
    
    const confirmMsg = hasRegs
      ? `Tiết dạy này đã có ${slot.registrations.length} giáo viên đăng ký.\n\nThầy/Cô có chắc chắn muốn xóa tiết dạy này không? Toàn bộ đăng ký dự giờ và phiếu đánh giá liên quan sẽ bị xóa theo.`
      : "Thầy/Cô có chắc chắn muốn xóa tiết dạy dự giờ này?";

    if (!confirm(confirmMsg)) return;
    startTransition(async () => {
      const res = await deleteObservationSlot(slotId);
      if (res.success) {
        showToast("Đã xóa tiết dạy thành công!", "info");
        setSelectedSlotIds(prev => prev.filter(id => id !== slotId));
        refreshSlots();
      } else {
        showToast(res.error || "Không thể xóa!", "error");
      }
    });
  };



  const handleApprove = async (registrationId: string) => {
    startTransition(async () => {
      const res = await approveRegistration(registrationId)
      if (res.success) { showToast("Đã xác nhận GV dự giờ thành công!", "success"); refreshSlots() }
      else showToast(res.error || "Không thể xác nhận!", "error")
    })
  }

  
  // Parse all assigned and concurrent positions of current teacher
  const teacherPositions = useMemo(() => {
    const set = new Set<string>();
    if (currentTeacher?.position) set.add(currentTeacher.position.trim());
    if (currentTeacher?.positions) {
      try {
        const parsed = typeof currentTeacher.positions === "string" ? JSON.parse(currentTeacher.positions) : currentTeacher.positions;
        if (Array.isArray(parsed)) parsed.forEach((p: string) => set.add(p.trim()));
      } catch {}
    }
    if (currentTeacher?.departmentAssignments && Array.isArray(currentTeacher.departmentAssignments)) {
      currentTeacher.departmentAssignments.forEach((da: any) => {
        if (da.position) set.add(da.position.trim());
      });
    }
    if (currentTeacher?.divisionAssignments && Array.isArray(currentTeacher.divisionAssignments)) {
      currentTeacher.divisionAssignments.forEach((da: any) => {
        if (da.position) set.add(da.position.trim());
      });
    }
    return Array.from(set);
  }, [currentTeacher]);

  // 1. Chức vụ TTCM (Tổ trưởng Chuyên môn)
  const isTTCM = useMemo(() => {
    const TTCM_KEYS = ["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM", "TT", "TO_TRUONG_CM", "TỔ TRƯỞNG", "Tổ trưởng Chuyên môn", "Tổ phó", "TO_PHO", "TPCM"];
    const role = (currentTeacher?.user?.role || "").toUpperCase().trim();
    if (["TTCM", "TO_TRUONG", "TO_PHO", "TPCM"].includes(role)) return true;
    return teacherPositions.some(p => TTCM_KEYS.some(k => p.toUpperCase() === k.toUpperCase() || p.toLowerCase().includes("tổ trưởng") || p.toLowerCase().includes("to truong") || p.toLowerCase().includes("tổ phó")));
  }, [teacherPositions, currentTeacher?.user?.role]);

  // 2. Chức vụ TBP (Trưởng Bộ Phận)
  const isTBP = useMemo(() => {
    const TBP_KEYS = ["TBP", "TRUONG_BO_PHAN", "TRUONG_BOPHAN", "Trưởng bộ phận", "TB_DHCM", "TRƯỞNG BỘ PHẬN", "Phó bộ phận", "PHO_BO_PHAN"];
    const role = (currentTeacher?.user?.role || "").toUpperCase().trim();
    if (["TBP", "TRUONG_BO_PHAN", "PHO_BO_PHAN"].includes(role)) return true;
    return teacherPositions.some(p => TBP_KEYS.some(k => p.toUpperCase() === k.toUpperCase() || p.toLowerCase().includes("trưởng bộ phận") || p.toLowerCase().includes("truong bo phan") || p.toLowerCase().includes("phó bộ phận")));
  }, [teacherPositions, currentTeacher?.user?.role]);

  // 3. Chức vụ GĐCS (Giám đốc Cơ sở)
  const isGDCS = useMemo(() => {
    const GDCS_KEYS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CO_SO", "Giám đốc cơ sở", "Giam doc co so", "GIÁM ĐỐC CƠ SỞ", "Phó Giám đốc cơ sở", "PGDCS", "PGĐCS", "PHO_GIAM_DOC_CO_SO"];
    const role = (currentTeacher?.user?.role || "").toUpperCase().trim();
    if (["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "PGDCS", "PGĐCS"].includes(role)) return true;
    return teacherPositions.some(p => GDCS_KEYS.some(k => p.toUpperCase() === k.toUpperCase() || p.toLowerCase().includes("giám đốc cơ sở") || p.toLowerCase().includes("giam doc co so") || p.toLowerCase().includes("phó giám đốc cơ sở")));
  }, [teacherPositions, currentTeacher?.user?.role]);

  // 4. Ban ĐHCM / BGH
  const isBanDHCM = useMemo(() => {
    const DHCM_KEYS = [
      "BAN_DHCM", "TB_DHCM", "TRUONG_BAN_DHCM", "PHO_BAN_DHCM", 
      "Ban ĐHCM", "Ban DHCM", "BAN ĐHCM", "BAN DHCM",
      "QLCM", "QUAN_LY_CM", "Quản lý CM", "QUẢN LÝ CM", 
      "BGH", "BGH_MN", "BGHMN", "BGMMN", "BGH Mầm non", "Ban Giám hiệu", "BAN GIAM HIEU",
      "Trưởng ban ĐHCM", "Phó ban ĐHCM", "Trưởng ban Điều hành chuyên môn", "Phó ban Điều hành chuyên môn",
      "Trưởng ban KT&ĐBCL", "Phó ban KT&ĐBCL", "Trưởng ban KT-ĐBCL", "Phó ban KT-ĐBCL"
    ];
    const role = (currentTeacher?.user?.role || "").toUpperCase().trim();
    if (["BAN_DHCM", "TB_DHCM", "TRUONG_BAN_DHCM", "PHO_BAN_DHCM", "QLCM", "QUAN_LY_CM", "BGH", "BGH_MN", "BGHMN", "ADMIN", "SUPER_ADMIN", "ADMINISTRATOR"].includes(role)) return true;
    
    // Check positions ONLY - do NOT grant management rights just because of department affiliation!
    return teacherPositions.some(p => DHCM_KEYS.some(k => p.toUpperCase() === k.toUpperCase() || p.toLowerCase().includes("ban đhcm") || p.toLowerCase().includes("ban dhcm") || p.toLowerCase().includes("quản lý cm") || p.toLowerCase().includes("quan ly cm") || p.toLowerCase().includes("ban giám hiệu") || p.toLowerCase().includes("trưởng ban") || p.toLowerCase().includes("phó ban")));
  }, [teacherPositions, currentTeacher?.user?.role]);

  const isAdminUser = useMemo(() => {
    const role = (currentTeacher?.user?.role || "").toUpperCase().trim();
    const isSuper = ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR", "SUPERADMIN", "KT_DBCL", "BAN_DHCM", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(role);
    return isSuper || isBanDHCM || isGDCS || isAdminRoute;
  }, [currentTeacher?.user?.role, isBanDHCM, isGDCS, isAdminRoute]);

  const isQLCM = useMemo(() => {
    return isBanDHCM;
  }, [isBanDHCM]);

  const isBGHMN = useMemo(() => {
    const role = (currentTeacher?.user?.role || "").toUpperCase().trim();
    return ["BGH_MN", "BGHMN", "BGMMN", "BGH Mầm non"].includes(role) || teacherPositions.some(p => ["BGH_MN", "BGHMN", "BGMMN", "BGH Mầm non"].includes(p));
  }, [currentTeacher?.user?.role, teacherPositions]);

  const canCreateSurprise = useMemo(() => {
    return isAdminUser || isTTCM || isQLCM || isBGHMN || isTBP || isGDCS || isBanDHCM;
  }, [isAdminUser, isTTCM, isQLCM, isBGHMN, isTBP, isGDCS, isBanDHCM]);

  // Chỉ có tài khoản GV có chức vụ TTCM, TBP, GĐCS, Ban ĐHCM (hoặc Quản trị viên) thì mới có tag Chế độ quản lý
  const isManagerRole = useMemo(() => {
    return isTTCM || isTBP || isGDCS || isBanDHCM || isAdminUser || isAdminRoute;
  }, [isTTCM, isTBP, isGDCS, isBanDHCM, isAdminUser, isAdminRoute]);

  const canDeleteAnySlot = useMemo(() => {
    return isAdminUser || isManagerRole || viewMode === "ADMIN";
  }, [isAdminUser, isManagerRole, viewMode]);

  useEffect(() => {
    if (!isManagerRole && !isAdminRoute) {
      if (viewMode === "ADMIN") {
        setViewMode("TEACHER");
      }
    }
  }, [isManagerRole, viewMode, isAdminRoute]);

  const ttcmAllowedDepartments = useMemo(() => {
    const allDepts = departments;
    // 1. Toàn quyền (Ban ĐHCM, Ban KT&ĐBCL, Ban GĐ, Ban TT, Admin, GĐCS, Quản lý CM)
    if (isAdminUser || isBanDHCM || isQLCM) return allDepts;

    // 2. Trưởng / Phó Bộ Phận (TBP)
    if (isTBP) {
      const myDivCodes = new Set<string>();
      currentTeacher?.divisionAssignments?.forEach((da: any) => {
        if (da.divisionCode) myDivCodes.add(normalizeDivisionCode(da.divisionCode));
      });
      currentTeacher?.divisionCodes?.forEach((dc: string) => {
        if (dc) myDivCodes.add(normalizeDivisionCode(dc));
      });
      if (["BAN_DHCM", "TB_DHCM"].includes(currentTeacher?.position || "")) {
        myDivCodes.add("BAN_DHCM");
      }
      const isSuperDiv = Array.from(myDivCodes).some(dc => ["BAN_GD", "BAN_KT_DBCL", "BAN_DHCM", "BAN_TT"].includes(dc));
      if (isSuperDiv) return allDepts;

      return allDepts.filter(d => {
        const dDivNorm = normalizeDivisionCode(d.divisionCode);
        if (dDivNorm && myDivCodes.has(dDivNorm)) return true;
        if (currentTeacher?.departmentId && d.id === currentTeacher.departmentId) return true;
        return false;
      });
    }

    // 3. Tổ Trưởng / Tổ Phó Chuyên Môn (TTCM)
    if (isTTCM) {
      const deptIds = new Set<string>();
      if (currentTeacher?.departmentId) deptIds.add(currentTeacher.departmentId);
      if (currentTeacher?.departmentAssignments) {
        currentTeacher.departmentAssignments.forEach((da: any) => {
          if (["TTCM", "Tổ trưởng", "TO_TRUONG", "Tổ trưởng CM", "Tổ phó", "TO_PHO", "TPCM", "TPTCM"].some(k => (da.position || "").toUpperCase().includes(k.toUpperCase())) && da.departmentId) {
            deptIds.add(da.departmentId);
          }
        });
      }
      return allDepts.filter(d => deptIds.has(d.id));
    }

    // 4. Giáo viên bình thường (GV) - Không có quyền quản lý
    if (currentTeacher?.departmentId) {
      return allDepts.filter(d => d.id === currentTeacher.departmentId);
    }
    return [];
  }, [departments, currentTeacher, isTTCM, isTBP, isBanDHCM, isQLCM, isAdminUser]);

  // Set default surprise department for TTCM or TBP
  useEffect(() => {
    if (ttcmAllowedDepartments.length > 0 && !surpriseDeptId) {
      const myDept = currentTeacher?.departmentId && ttcmAllowedDepartments.find(d => d.id === currentTeacher.departmentId);
      setSurpriseDeptId(myDept ? myDept.id : ttcmAllowedDepartments[0].id);
    }
  }, [ttcmAllowedDepartments, surpriseDeptId, currentTeacher?.departmentId]);

  const filteredTeachersForSurprise = useMemo(() => {
    let list = teachers;

    // Giới hạn phạm vi giáo viên theo danh sách tổ được phép quản lý (TBP/TTCM)
    if (!isAdminUser && !isBanDHCM && !isQLCM) {
      const allowedDeptIds = new Set(ttcmAllowedDepartments.map(d => d.id));
      list = list.filter((t: any) => {
        if (t.departmentId && allowedDeptIds.has(t.departmentId)) return true;
        if (t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
          return t.departmentAssignments.some((da: any) => allowedDeptIds.has(da.departmentId));
        }
        return false;
      });
    }

    // Lọc theo tổ được chọn cụ thể nếu có
    if (surpriseDeptId && surpriseDeptId !== "all") {
      list = list.filter((t: any) => {
        if (t.departmentId === surpriseDeptId) return true;
        if (t.departmentAssignments && Array.isArray(t.departmentAssignments)) {
          return t.departmentAssignments.some((da: any) => da.departmentId === surpriseDeptId);
        }
        return false;
      });
    }

    // Lọc theo campus nếu đã chọn campus
    if (surpriseCampusId) {
      list = list.filter((t: any) => !t.campusId || t.campusId === surpriseCampusId);
    }

    return list;
  }, [teachers, surpriseDeptId, surpriseCampusId, isAdminUser, isBanDHCM, isQLCM, ttcmAllowedDepartments]);

  const filteredClassesForSurprise = useMemo(() => {
    if (!classes || classes.length === 0) return [];
    return classes.filter(c => {
      if (isMamNonTeacher && c.level !== "Mầm non") return false;
      if (!isMamNonTeacher && surpriseLevel !== "Mầm non" && c.level === "Mầm non") return false;
      if (surpriseCampusId && c.campusId !== surpriseCampusId) return false;
      return true;
    });
  }, [classes, surpriseCampusId, isMamNonTeacher, surpriseLevel]);



  const allReEvalRequests = useMemo(() => {
    const list: any[] = [];
    slots.forEach((slot: any) => {
      slot.registrations?.forEach((reg: any) => {
        if (reg.evaluation && reg.evaluation.reEvaluationStatus) {
          list.push({
            evaluation: reg.evaluation,
            registration: reg,
            slot: slot,
            evaluator: reg.teacher,
            hostTeacher: slot.teacher
          });
        }
      });
    });
    return list.sort((a, b) => {
      const tA = a.evaluation.reEvaluationRequestedAt ? new Date(a.evaluation.reEvaluationRequestedAt).getTime() : 0;
      const tB = b.evaluation.reEvaluationRequestedAt ? new Date(b.evaluation.reEvaluationRequestedAt).getTime() : 0;
      return tB - tA;
    });
  }, [slots]);

  const pendingReEvalCount = useMemo(() => {
    return allReEvalRequests.filter(r => r.evaluation.reEvaluationStatus === "REQUESTED").length;
  }, [allReEvalRequests]);

  const filteredReEvalRequests = useMemo(() => {
    return allReEvalRequests.filter((item) => {
      if (reEvalFilterStatus !== "ALL" && item.evaluation.reEvaluationStatus !== reEvalFilterStatus) {
        return false;
      }
      if (reEvalSearchQuery.trim()) {
        const q = reEvalSearchQuery.toLowerCase();
        const matchEvaluator = (item.evaluator?.teacherName || "").toLowerCase().includes(q) || (item.evaluator?.email || "").toLowerCase().includes(q);
        const matchHost = (item.hostTeacher?.teacherName || "").toLowerCase().includes(q);
        const matchTopic = (item.slot?.topic || "").toLowerCase().includes(q);
        const matchClass = (item.slot?.className || item.slot?.grade || "").toLowerCase().includes(q);
        const matchSubject = (item.slot?.subjectName || "").toLowerCase().includes(q);
        return matchEvaluator || matchHost || matchTopic || matchClass || matchSubject;
      }
      return true;
    });
  }, [allReEvalRequests, reEvalFilterStatus, reEvalSearchQuery]);

  const handleRequestReEval = async () => {
    if (!reEvalModal) return;
    if (!reEvalReason.trim()) {
      showToast("Vui lòng nhập lý do xin đánh giá lại!", "error");
      return;
    }
    setReEvalSubmitting(true);
    const res = await requestReEvaluation({
      registrationId: reEvalModal.registration.id,
      evaluationId: reEvalModal.registration.evaluation?.id,
      reason: reEvalReason.trim()
    });
    setReEvalSubmitting(false);
    if (res.success) {
      showToast("Đã gửi yêu cầu xét duyệt đánh giá lại tới Ban Quản trị!", "success");
      setReEvalModal(null);
      setReEvalReason("");
      if (evalModal) setEvalModal(null);
      refreshSlots();
    } else {
      showToast(res.error || "Gửi yêu cầu thất bại", "error");
    }
  };

  const handleApproveReEval = async () => {
    if (!adminReEvalModal) return;
    setAdminReEvalSubmitting(true);
    const res = await approveReEvaluation({
      evaluationId: adminReEvalModal.request.evaluation.id,
      registrationId: adminReEvalModal.request.registration.id,
      adminNote: adminReEvalNote.trim()
    });
    setAdminReEvalSubmitting(false);
    if (res.success) {
      showToast("Đã phê duyệt mở lại phiếu và gửi Email thông báo tới GVBM thành công!", "success");
      setAdminReEvalModal(null);
      setAdminReEvalNote("");
      refreshSlots();
    } else {
      showToast(res.error || "Phê duyệt thất bại", "error");
    }
  };

  const handleRejectReEval = async () => {
    if (!adminReEvalModal) return;
    if (!adminReEvalNote.trim()) {
      showToast("Vui lòng nhập lý do từ chối để phản hồi cho GVBM!", "error");
      return;
    }
    setAdminReEvalSubmitting(true);
    const res = await rejectReEvaluation({
      evaluationId: adminReEvalModal.request.evaluation.id,
      registrationId: adminReEvalModal.request.registration.id,
      adminNote: adminReEvalNote.trim()
    });
    setAdminReEvalSubmitting(false);
    if (res.success) {
      showToast("Đã từ chối yêu cầu và gửi Email phản hồi tới GVBM!", "info");
      setAdminReEvalModal(null);
      setAdminReEvalNote("");
      refreshSlots();
    } else {
      showToast(res.error || "Từ chối thất bại", "error");
    }
  };

  const openEvalModal = (registration: any, slot: any) => {
    // Nếu là đánh giá mới (chưa có phiếu) và không phải Admin, chỉ cho phép đánh giá trong tháng hiện tại
    if (!registration?.evaluation && !isAdminUser && slot?.date) {
      const monthStatus = getSlotMonthStatus(slot.date);
      if (monthStatus !== "CURRENT") {
        const slotD = new Date(slot.date);
        const now = new Date();
        const slotMonthStr = !isNaN(slotD.getTime()) ? `${slotD.getMonth() + 1}/${slotD.getFullYear()}` : "";
        const curMonthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
        showToast(
          `Chỉ được phép đánh giá các tiết dạy diễn ra trong tháng hiện tại (Tháng ${curMonthStr}). Tiết dạy này thuộc thời gian tháng ${slotMonthStr} nên không thể đánh giá!`,
          "error"
        );
        return;
      }
    }

    const isMN = slot.level === "Mầm non";
    if (registration.evaluation) {
      let parsedScores = Array(18).fill(0);
      let actualGeneralComment = registration.evaluation.generalComment || "";
      
      if (isMN) {
        try {
          const parsed = JSON.parse(registration.evaluation.generalComment);
          if (parsed && Array.isArray(parsed.scores)) {
            parsedScores = parsed.scores;
            actualGeneralComment = parsed.text || "";
          }
        } catch (e) {
          parsedScores = [
            registration.evaluation.criterion1 || 0,
            registration.evaluation.criterion2 || 0,
            registration.evaluation.criterion3 || 0,
            registration.evaluation.criterion4 || 0,
            registration.evaluation.criterion5 || 0,
            ...Array(13).fill(0)
          ];
        }
      } else {
        setEvalK12Scores([
          registration.evaluation.score1 || 0,
          registration.evaluation.score2 || 0,
          registration.evaluation.score3 || 0,
          registration.evaluation.score4 || 0,
          registration.evaluation.score5 || 0,
          registration.evaluation.score6 || 0,
          registration.evaluation.score7 || 0,
          registration.evaluation.score8 || 0,
          registration.evaluation.score9 || 0,
          registration.evaluation.score10 || 0,
          registration.evaluation.score11 || 0
        ]);
      }
      
      setEvalCriteria(isMN ? parsedScores : [0, 0, 0, 0, 0]);
      setEvalStrengths(registration.evaluation.strengths || "");
      setEvalImprovements(registration.evaluation.improvements || "");
      setEvalGeneral(actualGeneralComment);
      setEvalOverall(registration.evaluation.overallRating || "");
      setTeacherFeedbackText(registration.evaluation.teacherFeedback || "");
    } else {
      setEvalCriteria(isMN ? Array(18).fill(0) : [0, 0, 0, 0, 0]);
      setEvalK12Scores([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      setEvalStrengths("");
      setEvalImprovements("");
      setEvalGeneral("");
      setEvalOverall("");
      setTeacherFeedbackText("");
    }

    // Check if there is a local draft saved in browser
    if (typeof window !== "undefined") {
      const draftKey = `skyline_eval_draft_${slot.id}_${registration.id}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            setHasEvalDraft(true);
            if (parsed.timestamp) setEvalDraftSavedAt(new Date(parsed.timestamp));
          }
        } catch (e) {
          setHasEvalDraft(false);
        }
      } else {
        setHasEvalDraft(false);
        setEvalDraftSavedAt(null);
      }
    }

    setEvalModal({ registration, slot })
  }

  const handleRestoreDraft = () => {
    if (!evalModal?.slot?.id || !evalModal?.registration?.id || typeof window === "undefined") return;
    const draftKey = `skyline_eval_draft_${evalModal.slot.id}_${evalModal.registration.id}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.evalK12Scores && Array.isArray(parsed.evalK12Scores)) setEvalK12Scores(parsed.evalK12Scores);
        if (parsed.evalCriteria && Array.isArray(parsed.evalCriteria)) setEvalCriteria(parsed.evalCriteria);
        if (parsed.evalStrengths != null) setEvalStrengths(parsed.evalStrengths);
        if (parsed.evalImprovements != null) setEvalImprovements(parsed.evalImprovements);
        if (parsed.evalGeneral != null) setEvalGeneral(parsed.evalGeneral);
        if (parsed.evalOverall != null) setEvalOverall(parsed.evalOverall);
        showToast("Đã khôi phục dữ liệu từ bản nháp!", "success");
      } catch (e) {
        showToast("Không thể khôi phục bản nháp", "error");
      }
    }
  };

  const handleSaveLocalDraft = useCallback(() => {
    if (!evalModal?.slot?.id || !evalModal?.registration?.id || typeof window === "undefined") return;
    const draftKey = `skyline_eval_draft_${evalModal.slot.id}_${evalModal.registration.id}`;
    const draftData = {
      evalK12Scores,
      evalCriteria,
      evalStrengths,
      evalImprovements,
      evalGeneral,
      evalOverall,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    setEvalDraftSavedAt(new Date());
    setHasEvalDraft(true);
  }, [evalModal?.slot?.id, evalModal?.registration?.id, evalK12Scores, evalCriteria, evalStrengths, evalImprovements, evalGeneral, evalOverall]);

  const calculateK12Ranking = (scores: number[]) => {
    return getK12RankingDetails(scores).rating;
  }

  
  const handleSurpriseSubmit = async (isDraft: boolean) => {
    if (!surpriseTeacherId) {
      showToast("Vui lòng chọn Giáo viên được dự giờ!", "error");
      return;
    }
    if (!surpriseSubjectName && !surpriseSubjectId) {
      showToast("Vui lòng chọn hoặc nhập Môn học!", "error");
      return;
    }
    if (!surpriseTopic.trim()) {
      showToast("Vui lòng nhập Chủ đề / Nội dung bài dạy!", "error");
      return;
    }
    if (!surpriseDate) {
      showToast("Vui lòng chọn Ngày dự giờ!", "error");
      return;
    }
    if (surpriseDate < minAllowedDate) {
      showToast("Không thể chọn ngày thuộc các tháng trước. Vui lòng chọn ngày trong tháng hiện tại hoặc các tháng sau!", "error");
      return;
    }
    if (!isDraft && !surpriseImprovements.trim()) {
      showToast("Vui lòng nhập 'Nội dung cần cải thiện / Góp ý phát triển' trước khi hoàn tất biên bản!", "error");
      return;
    }

    const isK12 = surpriseLevel !== "Mầm non";
    const totalScore = isK12 
      ? surpriseScoresK12.reduce((a, b) => a + b, 0)
      : surpriseScoresMN.reduce((a, b) => a + b, 0);

    const payload: any = {
      teacherId: surpriseTeacherId,
      targetDeptId: surpriseDeptId || undefined,
      campusId: surpriseCampusId || undefined,
      classId: surpriseClassId || undefined,
      className: surpriseClassName || undefined,
      level: surpriseLevel || "Phổ thông K-12",
      grade: surpriseGrade || "Khối",
      subjectId: surpriseSubjectId || undefined,
      subjectName: surpriseSubjectName || "Môn học",
      topic: surpriseTopic.trim(),
      date: surpriseDate,
      period: surprisePeriod,
      room: surpriseRoom || "Phòng học",
      totalScore: totalScore,
      overallRating: surpriseOverall || (isK12 ? calculateK12Ranking(surpriseScoresK12) : calculateMamNonRanking(surpriseScoresMN)),
      strengths: surpriseStrengths.trim(),
      improvements: surpriseImprovements.trim(),
      generalComment: surpriseGeneral.trim(),
      isDraft: isDraft
    };

    if (isK12) {
      payload.score1 = surpriseScoresK12[0];
      payload.score2 = surpriseScoresK12[1];
      payload.score3 = surpriseScoresK12[2];
      payload.score4 = surpriseScoresK12[3];
      payload.score5 = surpriseScoresK12[4];
      payload.score6 = surpriseScoresK12[5];
      payload.score7 = surpriseScoresK12[6];
      payload.score8 = surpriseScoresK12[7];
      payload.score9 = surpriseScoresK12[8];
      payload.score10 = surpriseScoresK12[9];
      payload.score11 = surpriseScoresK12[10];
    } else {
      payload.criterion1 = Math.round(surpriseScoresMN[0] || 0);
      payload.criterion2 = Math.round(surpriseScoresMN[1] || 0);
      payload.criterion3 = Math.round(surpriseScoresMN[2] || 0);
      payload.criterion4 = Math.round(surpriseScoresMN[3] || 0);
      payload.criterion5 = Math.round(surpriseScoresMN[4] || 0);
      payload.generalComment = JSON.stringify({
        scores: surpriseScoresMN,
        text: surpriseGeneral.trim()
      });
    }

    setSurpriseSubmitting(true);
    const res = await createSurpriseObservation(payload);
    setSurpriseSubmitting(false);

    if (res.success) {
      showToast(res.message || (isDraft ? "Đã lưu nháp phiếu đánh giá!" : "Đã hoàn thành đánh giá dự giờ đột xuất!"), "success");
      setShowCreateModal(false);
      refreshSlots();
      // Reset form
      setSurpriseTopic("");
      setSurpriseTeacherId("");
      setSurpriseScoresK12(Array(11).fill(0));
      setSurpriseScoresMN(Array(18).fill(0));
      setSurpriseStrengths("");
      setSurpriseImprovements("");
      setSurpriseGeneral("");
      setSurpriseOverall("");
      // Switch to overview or evaluations tab
      setActiveMainTab("overview_slots");
    } else {
      showToast(res.error || "Không thể tạo dự giờ đột xuất!", "error");
    }
  };

  const handleSubmitEval = async () => {
    if (!evalModal) return
    const isK12 = evalModal.slot.level !== "Mầm non"

    if (!evalImprovements || !evalImprovements.trim()) {
      showToast("Vui lòng nhập 'Nội dung cần cải thiện / Góp ý phát triển' trước khi nộp phiếu đánh giá!", "error");
      return;
    }
    
    const payload: any = {
      registrationId: evalModal.registration.id,
      slotId: evalModal.slot.id,
      strengths: evalStrengths.trim(),
      improvements: evalImprovements.trim(),
      generalComment: evalGeneral.trim(),
      overallRating: evalOverall
    }

    if (isK12) {
      const sum = evalK12Scores.reduce((a, b) => a + b, 0)
      payload.score1 = evalK12Scores[0]
      payload.score2 = evalK12Scores[1]
      payload.score3 = evalK12Scores[2]
      payload.score4 = evalK12Scores[3]
      payload.score5 = evalK12Scores[4]
      payload.score6 = evalK12Scores[5]
      payload.score7 = evalK12Scores[6]
      payload.score8 = evalK12Scores[7]
      payload.score9 = evalK12Scores[8]
      payload.score10 = evalK12Scores[9]
      payload.score11 = evalK12Scores[10]
      payload.totalScore = sum
    } else {
      if (evalCriteria.length < 18 || evalCriteria.some(c => c === undefined || c === null)) {
        showToast("Vui lòng đánh giá đầy đủ 18 yêu cầu!", "error");
        return;
      }
      const sum = evalCriteria.reduce((a, b) => a + b, 0);
      payload.totalScore = sum;
      payload.generalComment = JSON.stringify({
        scores: evalCriteria,
        text: evalGeneral.trim()
      });
      payload.criterion1 = Math.round(evalCriteria[0]);
      payload.criterion2 = Math.round(evalCriteria[1]);
      payload.criterion3 = Math.round(evalCriteria[2]);
      payload.criterion4 = Math.round(evalCriteria[3]);
      payload.criterion5 = Math.round(evalCriteria[4]);
    }

    if (!evalOverall) { showToast("Vui lòng chọn xếp loại tổng thể!", "error"); return }

    setEvalSubmitting(true)
    const res = await submitEvaluation(payload)
    setEvalSubmitting(false)
    if (res.success) {
      if (typeof window !== "undefined" && evalModal) {
        const draftKey = `skyline_eval_draft_${evalModal.slot.id}_${evalModal.registration.id}`;
        localStorage.removeItem(draftKey);
      }
      showToast("Đã lưu và hoàn thành biên bản! Hệ thống đã tự động gửi Email thông báo kết quả tới Giáo viên dạy & Người dự.", "success")
      setEvalModal(null)
      refreshSlots()
    } else {
      showToast(res.error || "Lỗi nộp phiếu!", "error")
    }
  }

  const handleAcknowledgeAndFeedback = async () => {
    if (!evalModal?.registration?.evaluation?.id && !evalModal?.registration?.id) return;
    setTeacherFeedbackSubmitting(true);
    const res = await acknowledgeAndFeedbackEvaluation({
      evaluationId: evalModal.registration.evaluation?.id,
      registrationId: evalModal.registration.id,
      feedback: teacherFeedbackText
    });
    setTeacherFeedbackSubmitting(false);
    if (res.success) {
      showToast(res.message || "Đã xác nhận tiếp thu góp ý thành công!", "success");
      if (evalModal.registration.evaluation) {
        evalModal.registration.evaluation.teacherAcknowledgedAt = new Date();
        evalModal.registration.evaluation.teacherFeedback = teacherFeedbackText.trim() || "Đã tiếp thu toàn bộ góp ý chuyên môn.";
        evalModal.registration.evaluation.teacherFeedbackAt = new Date();
      }
      refreshSlots();
    } else {
      showToast(res.error || "Không thể gửi phản hồi", "error");
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reqTeacherId) {
      showToast("Vui lòng chọn Giáo viên dạy!", "error")
      return
    }
    if (!reqDate) {
      showToast("Vui lòng chọn ngày dạy!", "error")
      return
    }
    if (reqDate < minAllowedDate) {
      showToast("Không thể chọn ngày thuộc các tháng trước. Vui lòng chọn ngày trong tháng hiện tại hoặc các tháng sau!", "error")
      return
    }

    const selectedClass = classes.find((c: any) => c.id === reqClassId)
    const selectedSub = subjects.find((s: any) => s.id === reqSubjectId)
    const resolvedSubjectName = selectedSub
      ? selectedSub.subjectName
      : (reqSubjectId === "Khác/Chuyên đề" || reqSubjectId === "other" ? "Khác/Chuyên đề" : reqSubjectId || "Khác/Chuyên đề")
    const resolvedSubjectId = selectedSub ? selectedSub.id : null

    setSubmitting(true)
    startTransition(async () => {
      try {
        const res = await requestObservationSlot({
          targetTeacherId: reqTeacherId,
          targetDeptId: reqDeptId || undefined,
          classId: reqClassId || undefined,
          className: selectedClass ? selectedClass.className : undefined,
          level: reqLevel || (selectedClass ? selectedClass.level : "ALL"),
          grade: reqGrade || (selectedClass ? selectedClass.grade : "Khối"),
          subjectId: resolvedSubjectId || undefined,
          subjectName: resolvedSubjectName,
          topic: reqTopic || "Yêu cầu dự giờ",
          date: reqDate,
          period: reqPeriod,
          notes: reqNotes,
          academicYearId: filterAcademicYearId,
        })
        setSubmitting(false)
        if (res.success) {
          showToast("Đã gửi đề xuất xin dự giờ và gửi Email thông báo tới Giáo viên dạy thành công!", "success")
          setReqTeacherId("")
          setReqTopic("")
          setReqNotes("")
          setReqDate("")
          setShowCreateModal(false)
          refreshSlots()
        } else {
          showToast(res.error || "Không thể gửi yêu cầu!", "error")
        }
      } catch (err: any) {
        setSubmitting(false)
        showToast(err?.message || "Đã xảy ra lỗi khi gửi yêu cầu!", "error")
      }
    })
  }

  const handleRespondRequest = async (slotId: string, accept: boolean, reason?: string) => {
    setSubmitting(true)
    startTransition(async () => {
      const res = await respondToObservationRequest(slotId, accept, reason)
      setSubmitting(false)
      if (res.success) {
        showToast(accept ? "Đã xác nhận & đồng ý cho dự giờ!" : "Đã từ chối yêu cầu dự giờ.", accept ? "success" : "info")
        setDecliningSlotId(null)
        setDeclineReason("")
        refreshSlots()
      } else {
        showToast(res.error || "Thao tác thất bại!", "error")
      }
    })
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newDate && newDate < minAllowedDate) {
      showToast("Không thể chọn ngày thuộc các tháng trước. Vui lòng chọn ngày trong tháng hiện tại hoặc các tháng sau!", "error");
      return;
    }
    const isMN = isMamNonTeacher || newLevel === "Mầm non";
    if (isMN) {
      if (!newGrade || !newChuDe.trim() || !newHoatDong.trim() || !newDeTai.trim() || !newDate || !newStartTime || !newEndTime || !newCampusId) {
        showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "error"); return
      }
    } else {
      if (!newLevel || !newGrade || !newTopic || !newDate || !newStartTime || !newEndTime || !newCampusId) {
        showToast("Vui lòng điền đầy đủ các thông tin bắt buộc (*)", "error"); return
      }
      if (!newSubjectId) { showToast("Vui lòng chọn môn học!", "error"); return }
      if (newSubjectId === "other" && !newSubjectName.trim()) { showToast("Vui lòng nhập tên môn học khác!", "error"); return }
    }
    setSubmitting(true)
    const selectedSub = subjects.find(s => s.id === newSubjectId)
    const subName = isMN ? `${newChuDe} | ${newHoatDong}` : (selectedSub ? selectedSub.subjectName : newSubjectName || "Khác")
    const topicText = isMN ? newDeTai : newTopic
    const selectedCampus = campuses.find(c => c.id === newCampusId)
    const campusNameStr = selectedCampus ? selectedCampus.campusName : ""
    let classNameStr = newClassNameText
    if (newClassId && newClassId !== "other") { const selClass = classes.find(c => c.id === newClassId); if (selClass) classNameStr = selClass.className }
    let res;
    if (editSlotId) {
      res = await updateObservationSlot(editSlotId, {
        subjectId: (!isMN && newSubjectId && newSubjectId !== "other") ? newSubjectId : undefined,
        subjectName: subName, level: isMN ? "Mầm non" : newLevel, grade: newGrade, topic: topicText, date: newDate,
        startTime: newStartTime, endTime: newEndTime, isDoublePeriod: newIsDoublePeriod,
        room: classNameStr, description: newDescription, visibilityType: newVisibility,
        sendEmailNotif: sendEmailNotif,
        notifMode: "SELECTED",
        selectedMemberIds: selectedEmailTeacherIds,
        targetDeptId: newVisibility === "DEPARTMENT" ? newTargetDeptId : undefined,
        campusId: newCampusId, campusName: campusNameStr,
        classId: (newClassId && newClassId !== "other") ? newClassId : undefined,
        className: classNameStr,
        lessonPlanName: newLessonPlanName || undefined, lessonPlanData: newLessonPlanData || undefined
      });
    } else {
      res = await createObservationSlot({
        subjectId: (!isMN && newSubjectId && newSubjectId !== "other") ? newSubjectId : undefined,
        subjectName: subName, level: isMN ? "Mầm non" : newLevel, grade: newGrade, topic: topicText, date: newDate,
        startTime: newStartTime, endTime: newEndTime, isDoublePeriod: newIsDoublePeriod,
        room: classNameStr, description: newDescription, visibilityType: newVisibility,
        sendEmailNotif: sendEmailNotif,
        notifMode: "SELECTED",
        selectedMemberIds: selectedEmailTeacherIds,
        targetDeptId: newVisibility === "DEPARTMENT" ? newTargetDeptId : undefined,
        campusId: newCampusId, campusName: campusNameStr,
        classId: (newClassId && newClassId !== "other") ? newClassId : undefined,
        className: classNameStr,
        lessonPlanName: newLessonPlanName || undefined, lessonPlanData: newLessonPlanData || undefined
      });
    }
    setSubmitting(false)
    if (res.success) {
      showToast(editSlotId ? "Cập nhật tiết dạy thành công!" : "Tạo tiết dạy thành công và đã tự động gửi Email thông báo tới các GV trong Tổ chuyên môn!", "success")
      setShowCreateModal(false)
      resetCreateForm()
      refreshSlots()
    } else {
      showToast(res.error || "Lỗi tạo tiết dạy!", "error")
    }
  }

  const monthlyStats = useMemo(() => {
    const stats: Record<string, { monthStr: string; year: number; month: number; taughtCount: number; taughtSurpriseCount: number; observedCount: number; observedSurpriseCount: number }> = {};
    (slots || []).forEach(slot => {
      const slotDate = new Date(slot.date);
      if (isNaN(slotDate.getTime())) return;
      const year = slotDate.getFullYear();
      const month = slotDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, "0")}`;
      
      const isHost = slot.teacherId === currentTeacher?.id;
      const isObserverApproved = (slot.registrations || []).some((r: any) => r.teacherId === currentTeacher?.id && r.isApproved);
      const isSurprise = isSurpriseSlot(slot);
      
      if (!stats[key]) {
        stats[key] = {
          monthStr: `Tháng ${month.toString().padStart(2, "0")}/${year}`,
          year,
          month,
          taughtCount: 0,
          taughtSurpriseCount: 0,
          observedCount: 0,
          observedSurpriseCount: 0
        };
      }
      
      const countWeight = slot.isDoublePeriod ? 2 : 1;
      if (isHost) {
        const approvedRegs = (slot.registrations || []).filter((r: any) => r.isApproved);
        const allEvaluated = approvedRegs.length > 0 && approvedRegs.some((r: any) => !!r.evaluation);
        if (allEvaluated) {
          stats[key].taughtCount += countWeight;
          if (isSurprise) stats[key].taughtSurpriseCount += countWeight;
        }
      }
      if (isObserverApproved) {
        const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id && r.isApproved);
        if (myReg && myReg.evaluation) {
          stats[key].observedCount += countWeight;
          if (isSurprise) stats[key].observedSurpriseCount += countWeight;
        }
      }
    });
    
    return Object.values(stats).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [slots, currentTeacher?.id]);

  const teacherMonthlyStatsList = useMemo(() => {
    const stats: Record<string, {
      monthKey: string;
      monthStr: string;
      year: number;
      month: number;
      taughtCount: number;
      totalTaughtSlots: number;
      observedCount: number;
      totalObservedSlots: number;
      pendingObservedCount: number;
      avgScore: string | null;
      receivedEvalCount: number;
      surpriseTaughtCount: number;
      surpriseObservedCount: number;
    }> = {};

    (availableMonths || []).forEach(mKey => {
      if (!mKey || typeof mKey !== "string" || !mKey.includes("-")) return;
      const [y, m] = mKey.split("-");
      const year = parseInt(y, 10);
      const month = parseInt(m, 10);
      stats[mKey] = {
        monthKey: mKey,
        monthStr: `Tháng ${m}/${y}`,
        year,
        month,
        taughtCount: 0,
        totalTaughtSlots: 0,
        observedCount: 0,
        totalObservedSlots: 0,
        pendingObservedCount: 0,
        avgScore: null,
        receivedEvalCount: 0,
        surpriseTaughtCount: 0,
        surpriseObservedCount: 0
      };
    });

    (personalSlots || []).forEach(slot => {
      const slotDate = new Date(slot.date);
      if (isNaN(slotDate.getTime())) return;
      const year = slotDate.getFullYear();
      const month = slotDate.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, "0")}`;

      // Only accumulate stats for months belonging to the active academic year
      if (!stats[key]) return;

      const countWeight = slot.isDoublePeriod ? 2 : 1;
      const isHost = slot.teacherId === currentTeacher?.id;
      const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
      const isSurprise = isSurpriseSlot(slot);

      if (isHost) {
        stats[key].totalTaughtSlots += 1;
        const approvedRegs = (slot.registrations || []).filter((r: any) => r.isApproved || isSurprise);
        const hasEval = approvedRegs.some((r: any) => !!r.evaluation);
        if (hasEval) {
          stats[key].taughtCount += countWeight;
          if (isSurprise) {
            stats[key].surpriseTaughtCount += countWeight;
          }
        }
      }

      if (myReg && (myReg.isApproved || isSurprise)) {
        stats[key].totalObservedSlots += 1;
        if (myReg.evaluation) {
          stats[key].observedCount += countWeight;
          if (isSurprise) {
            stats[key].surpriseObservedCount += countWeight;
          }
        } else {
          stats[key].pendingObservedCount += 1;
        }
      }
    });

    Object.values(stats).forEach(st => {
      let sum = 0;
      let cnt = 0;
      (personalSlots || []).forEach(slot => {
        const slotDate = new Date(slot.date);
        if (isNaN(slotDate.getTime())) return;
        const key = `${slotDate.getFullYear()}-${(slotDate.getMonth() + 1).toString().padStart(2, "0")}`;
        if (key === st.monthKey && slot.teacherId === currentTeacher?.id) {
          (slot.registrations || []).forEach((r: any) => {
            if (r.evaluation && Number(r.evaluation.totalScore) > 0) {
              sum += Number(r.evaluation.totalScore);
              cnt++;
            }
          });
        }
      });
      st.avgScore = cnt > 0 ? (sum / cnt).toFixed(2) : null;
      st.receivedEvalCount = cnt;
    });

    return Object.values(stats).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [slots, availableMonths, currentTeacher?.id]);

  const receivedEvaluations = useMemo(() => {
    const map = new Map<string, any>();
    
    // 1. Populate from initialReceivedEvaluations (full academic year)
    (props.initialReceivedEvaluations || []).forEach((item: any) => {
      const evalId = item?.evaluation?.id || item?.registration?.id;
      if (evalId) {
        const isHost = item.slot?.teacherId === currentTeacher?.id;
        const role = item.role || (isHost ? "TEACHER" : "OBSERVER");
        map.set(evalId, { ...item, role });
      }
    });

    // 2. Merge/update with any evaluations from current slots state
    (slots || []).forEach(slot => {
      const isHost = slot.teacherId === currentTeacher?.id;
      const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);

      // GV Dạy: Các phiếu nhận xét từ người dự
      if (isHost) {
        (slot.registrations || []).forEach((reg: any) => {
          if (reg.evaluation) {
            const evalId = reg.evaluation.id || reg.id;
            map.set(evalId, {
              slot,
              registration: reg,
              evaluation: reg.evaluation,
              role: "TEACHER"
            });
          }
        });
      }

      // GV Dự: Phiếu tôi đã chấm cho GV dạy
      if (myReg && myReg.evaluation) {
        const evalId = myReg.evaluation.id || myReg.id;
        if (!map.has(evalId) || !isHost) {
          map.set(evalId, {
            slot,
            registration: myReg,
            evaluation: myReg.evaluation,
            role: isHost ? "TEACHER" : "OBSERVER"
          });
        }
      }
    });

    const list = Array.from(map.values());
    return list.sort((a, b) => {
      const bTime = b.slot?.date ? new Date(b.slot.date).getTime() : 0;
      const aTime = a.slot?.date ? new Date(a.slot.date).getTime() : 0;
      return bTime - aTime;
    });
  }, [slots, currentTeacher?.id, props.initialReceivedEvaluations]);

  const isPreschoolEvaluations = useMemo(() => {
    if (isMamNonTeacher) return true;
    if (receivedEvaluations.length === 0) return false;
    return receivedEvaluations.every(e => e.slot?.level === "Mầm non");
  }, [isMamNonTeacher, receivedEvaluations]);

    const teacherCompetencyResult = useMemo(() => {
    const competencyData: any[] = [];
    const weaknessData: any[] = [];
    const hasEvals = receivedEvaluations.length > 0;

    if (!isPreschoolEvaluations) {
      for (let i = 1; i <= 11; i++) {
        const scoreKey = "score" + i;
        const maxVal = maxScoresK12[i - 1];
        const sum = hasEvals ? receivedEvaluations.reduce((acc, curr) => acc + (Number(curr.evaluation?.[scoreKey]) || 0), 0) : 0;
        const avg = hasEvals ? (sum / receivedEvaluations.length) : 0;
        const pct = Math.round((avg / maxVal) * 100);

        const lowCount = hasEvals ? receivedEvaluations.filter(curr => {
          const val = curr.evaluation?.[scoreKey] != null ? Number(curr.evaluation[scoreKey]) : 0;
          return val < maxVal * 0.70;
        }).length : 0;
        const lowPct = hasEvals ? Math.round((lowCount / receivedEvaluations.length) * 100) : 0;

        competencyData.push({
          id: "Y" + i,
          label: k12Labels[i - 1],
          avg: avg,
          max: maxVal,
          pct: pct,
          standard: i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4
        });

        if (hasEvals) {
          weaknessData.push({
            id: "Y" + i,
            label: k12Labels[i - 1],
            lowCount: lowCount,
            lowPct: lowPct,
            avgPct: pct
          });
        }
      }
    } else {
      for (let i = 1; i <= 5; i++) {
        const critKey = "criterion" + i;
        const sum = hasEvals ? receivedEvaluations.reduce((acc, curr) => acc + (Number(curr.evaluation?.[critKey]) || 0), 0) : 0;
        const avg = hasEvals ? (sum / receivedEvaluations.length) : 0;
        const pct = Math.round((avg / 4) * 100);

        const lowCount = hasEvals ? receivedEvaluations.filter(curr => (Number(curr.evaluation?.[critKey]) || 0) <= 2).length : 0;
        const lowPct = hasEvals ? Math.round((lowCount / receivedEvaluations.length) * 100) : 0;

        competencyData.push({
          id: "T" + i,
          label: preschoolLabels[i - 1],
          avg: avg,
          max: 4,
          pct: pct,
          standard: 1
        });

        if (hasEvals) {
          weaknessData.push({
            id: "T" + i,
            label: preschoolLabels[i - 1],
            lowCount: lowCount,
            lowPct: lowPct,
            avgPct: pct
          });
        }
      }
    }

    const sortedWeaknesses = [...weaknessData].sort((a, b) => b.lowPct - a.lowPct);
    const sortedStrengths = [...weaknessData].sort((a, b) => b.avgPct - a.avgPct);
    return { competencyData, sortedWeaknesses, sortedStrengths, hasEvals };
  }, [receivedEvaluations, isPreschoolEvaluations]);

  const teacherAvgScore = useMemo(() => {
    if (receivedEvaluations.length === 0) return null;
    if (isPreschoolEvaluations) return null;
    const scores = receivedEvaluations
      .map(e => e.evaluation?.totalScore)
      .filter(s => s !== null && s !== undefined && typeof s === "number");
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
  }, [receivedEvaluations, isPreschoolEvaluations]);

  const tabCounts = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    let all = 0;
    let selfOpen = 0;
    let expired = 0;
    let gbmRequest = 0;
    let myDept = 0;
    let otherDept = 0;

    (slots || []).forEach(slot => {
      const isSurprise = isSurpriseSlot(slot);
      const isReq = slot.requestOrigin === "OBSERVER_REQUEST";
      const isExpired = isSlotExpired(slot, todayStart);
      const isMyDeptSlot = checkIsMyDept(slot);

      // 1. All tab: count all non-expired valid slots
      if (!isExpired) {
        all++;
      } else {
        expired++;
      }

      // 2. Self Open: GV tu mo tiet day
      if (!isReq && !isExpired) {
        selfOpen++;
      }

      // 3. GBM Request: Ban chuyen mon / BGH yeu cau
      if (isReq && !isExpired) {
        gbmRequest++;
      }

      // 4. My Dept: Cung to chuyen mon
      if (isMyDeptSlot && !isExpired) {
        myDept++;
      }

      // 5. Other Dept: Ngoai to chuyen mon
      if (!isMyDeptSlot && !isExpired) {
        otherDept++;
      }
    });

    return { all, selfOpen, expired, gbmRequest, myDept, otherDept };
  }, [slots, filterMonth, checkIsMyDept]);

  const tabFilteredSlots = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return (slots || []).filter(slot => {
      const isSurprise = isSurpriseSlot(slot);
      const isReq = slot.requestOrigin === "OBSERVER_REQUEST";
      const isExpired = isSlotExpired(slot, todayStart);
      const isMyDeptSlot = checkIsMyDept(slot);

      if (activeFilterTab === "expired") return isExpired;
      if (isExpired) return false;

      if (activeFilterTab === "all") return true;
      if (activeFilterTab === "self_open") return !isReq;
      if (activeFilterTab === "gbm_request") return isReq;
      if (activeFilterTab === "my_dept") return isMyDeptSlot;
      if (activeFilterTab === "other_dept") return !isMyDeptSlot;
      return true;
    }).sort((slotA, slotB) => {
      const dateA = new Date(slotA.date);
      const dateB = new Date(slotB.date);
      const isExpiredA = isSlotExpired(slotA, todayStart);
      const isExpiredB = isSlotExpired(slotB, todayStart);

      // 1. Phân cấp nhóm hết hạn và chưa hết hạn
      if (isExpiredA && !isExpiredB) return 1;
      if (!isExpiredA && isExpiredB) return -1;

      const getPeriodOrder = (pStr: string) => {
        if (!pStr) return 99;
        const m = pStr.match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 99;
      };

      // 2. Nhóm còn hạn: Sắp xếp tăng dần theo ngày (gần hôm nay nhất xếp trước)
      if (!isExpiredA) {
        const timeDiff = dateA.getTime() - dateB.getTime();
        if (timeDiff !== 0) return timeDiff;
        return getPeriodOrder(slotA.startTime) - getPeriodOrder(slotB.startTime);
      }

      // 3. Nhóm hết hạn: Sắp xếp giảm dần theo ngày (gần hôm nay nhất xếp trước trong nhóm hết hạn)
      const expiredDiff = dateB.getTime() - dateA.getTime();
      if (expiredDiff !== 0) return expiredDiff;
      return getPeriodOrder(slotA.startTime) - getPeriodOrder(slotB.startTime);
    });
  }, [slots, activeFilterTab, checkIsMyDept]);

  const isAllCurrentSelected = useMemo(() => {
    if (!tabFilteredSlots || tabFilteredSlots.length === 0) return false;
    return tabFilteredSlots.every((s: any) => selectedSlotIds.includes(s.id));
  }, [tabFilteredSlots, selectedSlotIds]);

  const handleToggleSelectAll = useCallback(() => {
    if (isAllCurrentSelected) {
      const currentIds = new Set(tabFilteredSlots.map((s: any) => s.id));
      setSelectedSlotIds(prev => prev.filter(id => !currentIds.has(id)));
    } else {
      const currentIds = tabFilteredSlots.map((s: any) => s.id);
      setSelectedSlotIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  }, [isAllCurrentSelected, tabFilteredSlots]);

  const handleToggleSelectSlot = useCallback((slotId: string) => {
    setSelectedSlotIds(prev => prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedSlotIds([]);
  }, []);

  const handleDeleteMultipleSlots = async () => {
    if (selectedSlotIds.length === 0) return;
    const count = selectedSlotIds.length;
    const confirmMsg = `Thầy/Cô có chắc chắn muốn xóa ${count} tiết dạy đã chọn không?\n\nToàn bộ dữ liệu đăng ký dự giờ và phiếu đánh giá liên quan đến các tiết này sẽ bị xóa vĩnh viễn khỏi hệ thống.`;
    if (!confirm(confirmMsg)) return;

    setIsDeletingBulk(true);
    startTransition(async () => {
      try {
        const res = await deleteMultipleObservationSlots(selectedSlotIds);
        if (res.success) {
          showToast(`Đã xóa thành công ${res.count || count} tiết dạy!`, "success");
          setSelectedSlotIds([]);
          refreshSlots();
        } else {
          showToast(res.error || "Không thể xóa các tiết dạy đã chọn!", "error");
        }
      } catch (err: any) {
        showToast(err?.message || "Có lỗi xảy ra khi xóa tiết dạy!", "error");
      } finally {
        setIsDeletingBulk(false);
      }
    });
  };

  const exportSlotsToExcel = () => {
    if (!slots || slots.length === 0) {
      showToast("Không có dữ liệu để xuất file!", "error");
      return;
    }
    const headers = [
      "STT",
      "Mã tiết",
      "Giáo viên dạy",
      "Thời gian đăng ký",
      "Mã GV",
      "Cơ sở",
      "Tổ chuyên môn",
      "Bậc học",
      "Khối",
      "Lớp",
      "Môn học / Hoạt động",
      "Tên bài dạy / Chủ đề",
      "Ngày dạy",
      "Tiết dạy",
      "Phòng học",
      "Hình thức",
      "Số người đăng ký",
      "Danh sách người dự",
      "Trạng thái",
      "Điểm TB",
      "Xếp loại"
    ];

    const rows = (tabFilteredSlots || []).map((slot: any, idx: number) => {
      const isSurprise = isSurpriseSlot(slot);
      const regs = slot.registrations || [];
      const observerNames = regs.map((r: any) => `${r.teacher?.teacherName || "GV"} (${r.teacher?.teacherCode || ""}) - ${r.evaluation ? `Đã chấm (${r.evaluation.totalScore != null ? Number(r.evaluation.totalScore).toFixed(1) + "đ - " + (r.evaluation.overallRating || "") : "Đạt"})` : "Chưa chấm"}`).join("; ");
      
      const evalScores = regs.map((r: any) => r.evaluation?.totalScore).filter((s: any) => s != null && !isNaN(s));
      const avgScore = evalScores.length > 0 ? (evalScores.reduce((a: number, b: number) => a + Number(b), 0) / evalScores.length).toFixed(2) : "";
      const ratings = regs.map((r: any) => r.evaluation?.overallRating).filter(Boolean);
      const ratingStr = ratings.join(", ");

      const regTimeStr = slot.createdAt
        ? `${new Date(slot.createdAt).toLocaleDateString("vi-VN")} ${new Date(slot.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
        : "";

      return [
        idx + 1,
        slot.id,
        `"${(slot.teacher?.teacherName || "").replace(/"/g, '""')}"`,
        `"${regTimeStr}"`,
        slot.teacher?.teacherCode || "",
        `"${(slot.campusName || slot.teacher?.campus?.campusName || "").replace(/"/g, '""')}"`,
        `"${(slot.deptName || slot.teacher?.departmentRel?.name || "").replace(/"/g, '""')}"`,
        slot.level || "",
        slot.grade || "",
        slot.className || "",
        `"${(slot.subjectName || "").replace(/"/g, '""')}"`,
        `"${(slot.topic || "").replace(/"/g, '""')}"`,
        slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : "",
        slot.startTime || "",
        `"${(slot.room || "").replace(/"/g, '""')}"`,
        isSurprise ? "Đột xuất ⚡" : "Theo kế hoạch",
        `${regs.length}/${slot.maxSeats || 4}`,
        `"${observerNames.replace(/"/g, '""')}"`,
        slot.status || "OPEN",
        avgScore,
        `"${ratingStr.replace(/"/g, '""')}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DS_Tiet_Du_Gio_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách tiết dự giờ thành công!", "success");
  };

  const myTaughtSlots = useMemo(() => {
    return (personalSlots || []).filter(slot => slot.teacherId === currentTeacher?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [personalSlots, currentTeacher?.id]);

  const displayedMyTaughtSlots = useMemo(() => {
    return myTaughtSlots.filter(slot => {
      if (taughtOriginFilter !== "all") {
        const isSurprise = isSurpriseSlot(slot);
        if (taughtOriginFilter === "SURPRISE" ? !isSurprise : isSurprise) return false;
      }
      if (taughtCategoryFilter !== "all") {
        const cat = getSlotCategoryInfo(slot);
        const code = cat.shortCode === "MN" ? "MN" : (cat.shortCode === "GVNN" ? "GVNN" : "PT");
        if (code !== taughtCategoryFilter) return false;
      }
      return true;
    });
  }, [myTaughtSlots, taughtOriginFilter, taughtCategoryFilter]);

  const myObservedSlots = useMemo(() => {
    return (personalSlots || []).filter(slot => (slot.registrations || []).some((r: any) => r.teacherId === currentTeacher?.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [personalSlots, currentTeacher?.id]);

  const displayedMyObservedSlots = useMemo(() => {
    return myObservedSlots.filter(slot => {
      if (observedOriginFilter !== "all") {
        const isSurprise = isSurpriseSlot(slot);
        if (observedOriginFilter === "SURPRISE" ? !isSurprise : isSurprise) return false;
      }
      if (observedCategoryFilter !== "all") {
        const cat = getSlotCategoryInfo(slot);
        if (cat.shortCode !== observedCategoryFilter) return false;
      }
      return true;
    });
  }, [myObservedSlots, observedOriginFilter, observedCategoryFilter]);

  // Các tiết dự hợp lệ (bản thân GV đã có phiếu đánh giá / nhận xét)
  const myValidObservedSlots = useMemo(() => {
    return myObservedSlots.filter(slot => {
      const reg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
      return reg && (reg.isApproved || isSurpriseSlot(slot)) && !!reg.evaluation;
    });
  }, [myObservedSlots, currentTeacher?.id]);

    const upcomingSlots = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const combined = [...(myTaughtSlots || []), ...(myObservedSlots || [])];
    const map = new Map();
    combined.forEach((s: any) => {
      if (s && s.id && !map.has(s.id)) map.set(s.id, s);
    });
    return Array.from(map.values())
      .filter((s: any) => s.date && s.date >= todayStr && s.status !== "CANCELLED")
      .sort((a: any, b: any) => (a.date > b.date ? 1 : -1))
      .slice(0, 3);
  }, [myTaughtSlots, myObservedSlots]);

  const myObservedCount = useMemo(() => {
    let count = 0;
    myValidObservedSlots.forEach(slot => {
      count += (slot.isDoublePeriod ? 2 : 1);
    });
    return count;
  }, [myValidObservedSlots]);

  const mySurpriseObservedCount = useMemo(() => {
    let count = 0;
    myValidObservedSlots.forEach(slot => {
      if (isSurpriseSlot(slot)) {
        count += (slot.isDoublePeriod ? 2 : 1);
      }
    });
    return count;
  }, [myValidObservedSlots]);

  // Tiết dạy hợp lệ: Tiết dạy ít nhất có 1 phiếu đánh giá từ người dự (1-4 phiếu)
  const myValidTaughtSlots = useMemo(() => {
    return myTaughtSlots.filter(slot => {
      const approvedRegs = slot.registrations?.filter((r: any) => r.isApproved || isSurpriseSlot(slot)) || [];
      return approvedRegs.some((r: any) => !!r.evaluation);
    });
  }, [myTaughtSlots]);

  const myTaughtCount = useMemo(() => {
    let count = 0;
    myValidTaughtSlots.forEach(slot => {
      count += (slot.isDoublePeriod ? 2 : 1);
    });
    return count;
  }, [myValidTaughtSlots]);

  const mySurpriseTaughtCount = useMemo(() => {
    let count = 0;
    myValidTaughtSlots.forEach(slot => {
      if (isSurpriseSlot(slot)) {
        count += (slot.isDoublePeriod ? 2 : 1);
      }
    });
    return count;
  }, [myValidTaughtSlots]);

  const totalSurpriseTaughtSlots = useMemo(() => {
    return myTaughtSlots.filter(s => isSurpriseSlot(s)).length;
  }, [myTaughtSlots]);

  const totalSurpriseObservedSlots = useMemo(() => {
    return myObservedSlots.filter(s => isSurpriseSlot(s)).length;
  }, [myObservedSlots]);

  // Tổng số phiếu đánh giá nhận được từ tất cả các tiết dạy
  const totalReceivedEvalCount = useMemo(() => {
    let count = 0;
    myTaughtSlots.forEach(slot => {
      slot.registrations?.forEach((r: any) => {
        if (r.evaluation) count++;
      });
    });
    return count;
  }, [myTaughtSlots]);

  const defaultObsTarget = isMamNonTeacher ? 8 : (currentTeacher?.requiredObserved || 10);
  const defaultTaughtTarget = isMamNonTeacher ? 4 : (currentTeacher?.requiredTaught || 2);
  const obsTarget = selfRequiredObserved > 0 ? selfRequiredObserved : defaultObsTarget;
  const taughtTarget = selfRequiredTaught > 0 ? selfRequiredTaught : defaultTaughtTarget;

  const obsProgress = obsTarget > 0 ? Math.min(100, Math.round((myObservedCount / obsTarget) * 100)) : 0;
  const taughtProgress = taughtTarget > 0 ? Math.min(100, Math.round((myTaughtCount / (taughtTarget || 1)) * 100)) : 0;

  const myPendingEvaluationsCount = useMemo(() => {
    return myObservedSlots.filter(s => {
      const reg = s.registrations?.find((r: any) => r.teacherId === currentTeacher?.id);
      return reg && (reg.isApproved || isSurpriseSlot(s)) && !reg.evaluation;
    }).length;
  }, [myObservedSlots, currentTeacher?.id]);

  const myReceivedEvaluationsStats = useMemo(() => {
    let sum = 0;
    let count = 0;
    myTaughtSlots.forEach(slot => {
      slot.registrations?.forEach((r: any) => {
        if (r.evaluation && Number(r.evaluation.totalScore) > 0) {
          sum += Number(r.evaluation.totalScore);
          count++;
        }
      });
    });
    return {
      avgScore: count > 0 ? (sum / count).toFixed(2) : null,
      count
    };
  }, [myTaughtSlots]);

  const pendingObserverRequestsCount = useMemo(() => {
    return slots.filter(s => s.teacherId === currentTeacher?.id && s.requestOrigin === "OBSERVER_REQUEST" && s.status === "REQUEST_PENDING").length;
  }, [slots, currentTeacher?.id]);

  const activeAcademicYear = useMemo(() => {
    const safeYears = Array.isArray(academicYears) ? academicYears : [];
    if (safeYears.length === 0) return null;
    return safeYears.find(y => y.id === filterAcademicYearId) || safeYears.find(y => y.status === "ACTIVE") || safeYears[0];
  }, [academicYears, filterAcademicYearId]);

  return (
    <div className="flex flex-col gap-5 relative pb-16 text-slate-800 bg-[#F8FAFC] min-h-screen p-2 sm:p-4 md:p-6 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border border-white/20 text-white animate-in slide-in-from-top duration-300 ${toast.type === "success" ? "bg-emerald-600 shadow-emerald-600/30" : toast.type === "error" ? "bg-rose-600 shadow-rose-600/30" : "bg-[#008B82] shadow-teal-700/30"}`}>
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
          <span className="text-xs sm:text-sm font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* TOP APP BAR: Streamlined Enterprise Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#002D2B] via-[#004D47] to-[#007068] p-4 sm:p-5 text-white shadow-lg border border-teal-800/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-b from-[#48BFE3]/15 to-transparent rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          {/* Left: Branding, Title & Teacher info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200">
                  {viewMode === "ADMIN" ? "SKY-LINE • TRUNG TÂM ĐIỀU HÀNH DỰ GIỜ" : "SKY-LINE • ĐÁNH GIÁ CHUYÊN MÔN"}
                </span>
                {isMamNonTeacher && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-amber-950">
                    BẬC MẦM NON
                  </span>
                )}
                {viewMode === "ADMIN" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500 text-white border border-indigo-400/30">
                    👔 QUẢN TRỊ
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                {viewMode === "ADMIN" 
                  ? (isMamNonTeacher ? "Quản trị & Điều hành Dự giờ Mầm non" : "Quản trị & Điều hành Tiết dạy Dự giờ Toàn trường")
                  : (isMamNonTeacher ? "Dự giờ & Đánh giá Hoạt động Mầm non" : "Dự giờ & Đánh giá Tiết dạy Giáo viên")}
              </h1>
            </div>

            <div className="hidden sm:block w-px h-10 bg-white/15" />

            {/* Teacher Chip & Year selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(currentTeacher?.teacherName || "G")} text-white flex items-center justify-center font-black text-sm shadow-xs border border-white/30`}>
                  {currentTeacher?.teacherName?.charAt(0) || "G"}
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black text-white leading-tight">{currentTeacher?.teacherName}</span>
                  <span className="block text-[10px] text-emerald-200/80 font-medium">
                    {currentTeacher?.departmentRel?.name || "Giáo viên"} {currentTeacher?.campus?.campusName ? `• ${currentTeacher.campus.campusName}` : ""}
                  </span>
                </div>
              </div>

              {academicYears && academicYears.length > 0 && (
                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-200 uppercase">Năm:</span>
                  <select
                    value={filterAcademicYearId}
                    onChange={e => handleAcademicYearChange(e.target.value)}
                    className="bg-transparent text-xs font-black text-white outline-none cursor-pointer"
                  >
                    {academicYears.map(y => (
                      <option key={y.id} value={y.id} className="text-slate-800 font-semibold">{y.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right: Mode Switcher & Primary Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Switcher for Management Roles */}
            {isManagerRole && (
              <div className="bg-black/25 backdrop-blur-md p-1 rounded-xl border border-white/20 flex items-center gap-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("ADMIN");
                    if (activeMainTab === "my_schedule" || activeMainTab === "register_request") {
                      setActiveMainTab("overview_slots");
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === "ADMIN"
                      ? "bg-white text-[#003B3A] shadow-sm scale-105"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Chuyển sang Chế độ Quản trị & Điều hành"
                >
                  <Building2 className="w-3.5 h-3.5 text-teal-700" />
                  <span>Chế độ Quản lý</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode("TEACHER");
                    if (activeMainTab === "ttcm_summary") {
                      setActiveMainTab("my_schedule");
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === "TEACHER"
                      ? "bg-white text-teal-900 shadow-sm scale-105"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Chuyển sang Chế độ Cá nhân (Giáo viên)"
                >
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chế độ Cá nhân</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setCreationMode("TEACHER_OPEN");
                setShowCreateModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs transition-all shadow-md shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Mở tiết dạy</span>
            </button>

            {viewMode === "TEACHER" && (
              <button
                type="button"
                onClick={() => {
                  setCreationMode("OBSERVER_REQUEST");
                  setShowCreateModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Xin dự giờ</span>
              </button>
            )}

            {canCreateSurprise && (
              <button
                type="button"
                onClick={() => {
                  setCreationMode("SURPRISE");
                  setShowCreateModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-black text-xs transition-all shadow-md shadow-rose-950/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Đột xuất ⚡</span>
              </button>
            )}

            {viewMode === "ADMIN" && (
              <button
                type="button"
                onClick={exportSlotsToExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md border border-emerald-400/40 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                title="Xuất file Excel danh sách tiết dạy và kết quả"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  router.refresh();
                  showToast("Đã làm mới dữ liệu mới nhất!", "info");
                });
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/15"
              title="Làm mới dữ liệu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODERN TAB NAVIGATION */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-1.5 shadow-2xs sticky top-2 z-20">
        {viewMode === "ADMIN" ? (
          /* ADMIN MODE TAB BAR (4 TABS) */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
            {/* Admin Tab 1: Báo cáo & Thống kê TCM */}
            <button
              type="button"
              onClick={() => setActiveMainTab("ttcm_summary")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "ttcm_summary"
                  ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-[#003B3A] text-white shadow-md shadow-indigo-900/25 scale-[1.01] border border-indigo-400/40"
                  : "text-indigo-950 bg-indigo-50/70 hover:bg-indigo-100/90 border border-indigo-200/80"
              }`}
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${activeMainTab === "ttcm_summary" ? "text-indigo-200" : "text-indigo-600"}`} />
              <span className="truncate">1. Báo cáo & Thống kê TCM</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                activeMainTab === "ttcm_summary" 
                  ? "bg-white/25 text-white border border-white/30" 
                  : "bg-indigo-200/80 text-indigo-950 border border-indigo-300/80"
              }`}>
                TCM
              </span>
            </button>

            {/* Admin Tab 2: Quản lý Tiết dạy toàn trường */}
            <button
              type="button"
              onClick={() => setActiveMainTab("overview_slots")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "overview_slots"
                  ? "bg-gradient-to-r from-[#008B82] via-teal-700 to-[#003B3A] text-white shadow-md shadow-teal-900/25 scale-[1.01] border border-teal-400/40"
                  : "text-teal-950 bg-teal-50/60 hover:bg-teal-100/80 border border-teal-200/70"
              }`}
            >
              <Layers className={`w-4 h-4 shrink-0 ${activeMainTab === "overview_slots" ? "text-cyan-200" : "text-[#008B82]"}`} />
              <span className="truncate">2. Quản lý Tiết dạy toàn trường</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                activeMainTab === "overview_slots" 
                  ? "bg-white/25 text-white border border-white/30" 
                  : "bg-teal-200/80 text-teal-950 border border-teal-300/80"
              }`}>
                {slots.length}
              </span>
            </button>

            {/* Admin Tab 3: Kết quả đánh giá */}
            <button
              type="button"
              onClick={() => setActiveMainTab("evaluations")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "evaluations"
                  ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-violet-800/25 scale-[1.01] border border-violet-400/40"
                  : "text-violet-950 bg-violet-50/60 hover:bg-violet-100/80 border border-violet-200/70"
              }`}
            >
              <Award className={`w-4 h-4 shrink-0 ${activeMainTab === "evaluations" ? "text-violet-200" : "text-violet-600"}`} />
              <span className="truncate">3. Kết quả đánh giá</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                activeMainTab === "evaluations" 
                  ? "bg-white/25 text-white border border-white/30" 
                  : "bg-violet-200/80 text-violet-950 border border-violet-300/80"
              }`}>
                {receivedEvaluations.length}
              </span>
            </button>

            {/* Admin Tab 4: Duyệt chấm lại */}
            <button
              type="button"
              onClick={() => setActiveMainTab("re_evaluations")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "re_evaluations"
                  ? "bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 text-white shadow-md shadow-rose-800/25 scale-[1.01] border border-rose-400/40"
                  : "text-rose-950 bg-rose-50/70 hover:bg-rose-100/90 border border-rose-200/80"
              }`}
            >
              <RotateCcw className={`w-4 h-4 shrink-0 ${activeMainTab === "re_evaluations" ? "text-rose-200" : "text-rose-600"}`} />
              <span className="truncate">4. Duyệt chấm lại</span>
              {pendingReEvalCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 bg-red-500 text-white border border-white animate-pulse">
                  {pendingReEvalCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          /* TEACHER MODE TAB BAR (UP TO 6 TABS) */
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${(isAdminUser && isTTCM) ? "lg:grid-cols-6" : (isAdminUser || isTTCM || isTBP) ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-1.5`}>
            
            {/* Tab 1: My Schedule & Tasks */}
            <button
              type="button"
              onClick={() => setActiveMainTab("my_schedule")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "my_schedule"
                  ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-md shadow-amber-800/25 scale-[1.01] border border-amber-400/40"
                  : "text-amber-950 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200/70"
              }`}
            >
              <Calendar className={`w-4 h-4 shrink-0 ${activeMainTab === "my_schedule" ? "text-amber-200" : "text-amber-600"}`} />
              <span className="truncate">1. Lịch & Việc của tôi</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                activeMainTab === "my_schedule" 
                  ? "bg-white/25 text-white border border-white/30" 
                  : "bg-amber-200/80 text-amber-950 border border-amber-300/80"
              }`}>
                {myTaughtSlots.length + myObservedSlots.length}
              </span>
            </button>

            {/* Tab 2: Overview / Explore Open Slots */}
            <button
              type="button"
              onClick={() => setActiveMainTab("overview_slots")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "overview_slots"
                  ? "bg-gradient-to-r from-[#008B82] via-teal-700 to-[#003B3A] text-white shadow-md shadow-teal-900/25 scale-[1.01] border border-teal-400/40"
                  : "text-teal-950 bg-teal-50/60 hover:bg-teal-100/80 border border-teal-200/70"
              }`}
            >
              <Layers className={`w-4 h-4 shrink-0 ${activeMainTab === "overview_slots" ? "text-cyan-200" : "text-[#008B82]"}`} />
              <span className="truncate">2. Danh sách tiết dạy</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                activeMainTab === "overview_slots" 
                  ? "bg-white/25 text-white border border-white/30" 
                  : "bg-teal-200/80 text-teal-950 border border-teal-300/80"
              }`}>
                {slots.length}
              </span>
            </button>

            {/* Tab 3: Evaluations Received */}
            <button
              type="button"
              onClick={() => setActiveMainTab("evaluations")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "evaluations"
                  ? "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-violet-800/25 scale-[1.01] border border-violet-400/40"
                  : "text-violet-950 bg-violet-50/60 hover:bg-violet-100/80 border border-violet-200/70"
              }`}
            >
              <Award className={`w-4 h-4 shrink-0 ${activeMainTab === "evaluations" ? "text-violet-200" : "text-violet-600"}`} />
              <span className="truncate">3. Kết quả đánh giá</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                activeMainTab === "evaluations" 
                  ? "bg-white/25 text-white border border-white/30" 
                  : "bg-violet-200/80 text-violet-950 border border-violet-300/80"
              }`}>
                {receivedEvaluations.length}
              </span>
            </button>

            {/* Tab 4: Teacher Personal Report */}
            <button
              type="button"
              onClick={() => setActiveMainTab("teacher_report")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                activeMainTab === "teacher_report"
                  ? "bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-800 text-white shadow-md shadow-emerald-800/25 scale-[1.01] border border-emerald-400/40"
                  : "text-emerald-950 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200/70"
              }`}
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${activeMainTab === "teacher_report" ? "text-emerald-200" : "text-emerald-600"}`} />
              <span className="truncate">4. Báo cáo thống kê</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                activeMainTab === "teacher_report" 
                  ? "bg-white/25 text-white border border-white/30" 
                  : "bg-emerald-200/80 text-emerald-950 border border-emerald-300/80"
              }`}>
                {myTaughtCount} dạy • {myObservedCount} dự
              </span>
            </button>

            {/* Tab 5: TTCM / TBP Department Summary (TTCM / TBP / Admin only) */}
            {(isTTCM || isTBP || isAdminUser) && (
              <button
                type="button"
                onClick={() => setActiveMainTab("ttcm_summary")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                  activeMainTab === "ttcm_summary"
                    ? "bg-gradient-to-r from-blue-700 via-indigo-700 to-[#003B3A] text-white shadow-md shadow-indigo-900/25 scale-[1.01] border border-indigo-400/40"
                    : "text-indigo-950 bg-indigo-50/70 hover:bg-indigo-100/90 border border-indigo-200/80"
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeMainTab === "ttcm_summary" ? "text-indigo-200" : "text-indigo-600"}`} />
                <span className="truncate">{isTBP ? "5. Báo cáo TBP & Tổ CM" : "5. Báo cáo TTCM"}</span>
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 ${
                  activeMainTab === "ttcm_summary" 
                    ? "bg-white/25 text-white border border-white/30" 
                    : "bg-indigo-200/80 text-indigo-950 border border-indigo-300/80"
                }`}>
                  {isTBP ? "TBP" : "TTCM"}
                </span>
              </button>
            )}

            {/* Tab 6: Re-evaluation Approvals (Admin only) */}
            {isAdminUser && (
              <button
                type="button"
                onClick={() => setActiveMainTab("re_evaluations")}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                  activeMainTab === "re_evaluations"
                    ? "bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 text-white shadow-md shadow-rose-800/25 scale-[1.01] border border-rose-400/40"
                    : "text-rose-950 bg-rose-50/70 hover:bg-rose-100/90 border border-rose-200/80"
                }`}
              >
                <RotateCcw className={`w-4 h-4 shrink-0 ${activeMainTab === "re_evaluations" ? "text-rose-200" : "text-rose-600"}`} />
                <span className="truncate">6. Duyệt chấm lại</span>
                {pendingReEvalCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full font-black shrink-0 bg-red-500 text-white border border-white animate-pulse">
                    {pendingReEvalCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: 1. ĐĂNG KÝ & XIN DỰ GIỜ */}
      {(activeMainTab === "register_request" || (activeMainTab === "my_schedule" && myScheduleSubTab === "register")) && (
        <ObservationRegistrationSection
          creationMode={creationMode}
          setCreationMode={setCreationMode}
          isMamNonTeacher={isMamNonTeacher}
          isAdminUser={isAdminUser}
          isTTCM={isTTCM}
          canCreateSurprise={canCreateSurprise}
          currentTeacher={currentTeacher}
          monthlyLimitCount={monthlyLimitCount}
          myTaughtCount={myTaughtCount}
          myObservedCount={myObservedCount}
          myReceivedEvaluationsStats={myReceivedEvaluationsStats}
          onViewAllSchedule={() => {
            setActiveMainTab("my_schedule");
            setMyScheduleSubTab("all");
          }}
          onViewTaught={() => {
            setActiveMainTab("my_schedule");
            setMyScheduleSubTab("taught");
          }}
          onViewObserved={() => {
            setActiveMainTab("my_schedule");
            setMyScheduleSubTab("observed");
          }}
          onViewEvaluations={() => setActiveMainTab("evaluations")}
          upcomingSlots={upcomingSlots}
          onResetForm={() => {
            setNewTopic("");
            setNewDescription("");
            setNewNotes("");
            setNewLessonPlanName("");
            setNewLessonPlanData("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            showToast("Đã làm mới biểu mẫu đăng ký!", "info");
          }}
          onSaveDraft={() => {
            showToast("Bản nháp thông tin tiết dạy đã được lưu tạm!", "success");
          }}
          editSlotId={editSlotId}
          surpriseDeptId={surpriseDeptId}
          setSurpriseDeptId={setSurpriseDeptId}
          surpriseTeacherId={surpriseTeacherId}
          setSurpriseTeacherId={setSurpriseTeacherId}
          surpriseCampusId={surpriseCampusId}
          setSurpriseCampusId={setSurpriseCampusId}
          surpriseClassId={surpriseClassId}
          setSurpriseClassId={setSurpriseClassId}
          surpriseClassName={surpriseClassName}
          setSurpriseClassName={setSurpriseClassName}
          surpriseSubjectId={surpriseSubjectId}
          setSurpriseSubjectId={setSurpriseSubjectId}
          surpriseSubjectName={surpriseSubjectName}
          setSurpriseSubjectName={setSurpriseSubjectName}
          surpriseLevel={surpriseLevel}
          setSurpriseLevel={setSurpriseLevel}
          surpriseGrade={surpriseGrade}
          setSurpriseGrade={setSurpriseGrade}
          surpriseTopic={surpriseTopic}
          setSurpriseTopic={setSurpriseTopic}
          surpriseDate={surpriseDate}
          setSurpriseDate={setSurpriseDate}
          surprisePeriod={surprisePeriod}
          setSurprisePeriod={setSurprisePeriod}
          surpriseRoom={surpriseRoom}
          setSurpriseRoom={setSurpriseRoom}
          surpriseScoresK12={surpriseScoresK12}
          surpriseScoresMN={surpriseScoresMN}
          surpriseStrengths={surpriseStrengths}
          setSurpriseStrengths={setSurpriseStrengths}
          surpriseImprovements={surpriseImprovements}
          setSurpriseImprovements={setSurpriseImprovements}
          surpriseGeneral={surpriseGeneral}
          setSurpriseGeneral={setSurpriseGeneral}
          surpriseOverall={surpriseOverall}
          setSurpriseOverall={setSurpriseOverall}
          surpriseSubmitting={surpriseSubmitting}
          handleSurpriseSubmit={handleSurpriseSubmit}
          ttcmAllowedDepartments={ttcmAllowedDepartments}
          filteredTeachersForSurprise={filteredTeachersForSurprise}
          filteredClassesForSurprise={filteredClassesForSurprise}
          reqCampusId={reqCampusId}
          setReqCampusId={setReqCampusId}
          reqDeptId={reqDeptId}
          setReqDeptId={setReqDeptId}
          reqTeacherId={reqTeacherId}
          setReqTeacherId={setReqTeacherId}
          reqSubjectId={reqSubjectId}
          setReqSubjectId={setReqSubjectId}
          reqLevel={reqLevel}
          setReqLevel={setReqLevel}
          reqGrade={reqGrade}
          setReqGrade={setReqGrade}
          reqClassId={reqClassId}
          setReqClassId={setReqClassId}
          reqDate={reqDate}
          setReqDate={setReqDate}
          reqPeriod={reqPeriod}
          setReqPeriod={setReqPeriod}
          reqTopic={reqTopic}
          setReqTopic={setReqTopic}
          reqNotes={reqNotes}
          setReqNotes={setReqNotes}
          handleRequestSubmit={handleRequestSubmit}
          isSubmittingRequest={submitting}
          filteredTeachersForRequest={filteredTeachersForRequest}
          filteredReqClasses={filteredReqClasses}
          openDeptId={newTargetDeptId}
          setOpenDeptId={setNewTargetDeptId}
          openSubjectId={newSubjectId}
          setOpenSubjectId={setNewSubjectId}
          openSubjectName={newSubjectName}
          setOpenSubjectName={setNewSubjectName}
          openCampusId={newCampusId}
          setOpenCampusId={setNewCampusId}
          openClassId={newClassId}
          setOpenClassId={setNewClassId}
          openClassName={newClassNameText}
          setOpenClassName={setNewClassNameText}
          openLevel={newLevel}
          setOpenLevel={setNewLevel}
          openGrade={newGrade}
          setOpenGrade={setNewGrade}
          openTopic={newTopic}
          setOpenTopic={setNewTopic}
          openDate={newDate}
          setOpenDate={setNewDate}
          openPeriod={newStartTime}
          setOpenPeriod={setNewStartTime}
          openRoom={newClassNameText}
          setOpenRoom={setNewClassNameText}
          openMaxSeats={4}
          setOpenMaxSeats={() => {}}
          openLessonPlanUrl={newLessonPlanData}
          setOpenLessonPlanUrl={setNewLessonPlanData}
          openLessonPlanFile={null}
          setOpenLessonPlanFile={() => {}}
          openNotes={newDescription}
          setOpenNotes={setNewDescription}
          sendEmailNotif={sendEmailNotif}
          setSendEmailNotif={setSendEmailNotif}
          selectedEmailTeacherIds={selectedEmailTeacherIds}
          setSelectedEmailTeacherIds={setSelectedEmailTeacherIds}
          myDeptTeachers={myDeptTeachers}
          isSubmittingOpen={submitting}
          handleOpenSlotSubmit={handleCreateSubmit}
          newCampusId={newCampusId}
          setNewCampusId={setNewCampusId}
          newDeptId={newTargetDeptId}
          setNewDeptId={setNewTargetDeptId}
          newSubjectId={newSubjectId}
          setNewSubjectId={setNewSubjectId}
          newLevel={newLevel}
          setNewLevel={setNewLevel}
          newGrade={newGrade}
          setNewGrade={setNewGrade}
          newClassId={newClassId}
          setNewClassId={setNewClassId}
          newDate={newDate}
          setNewDate={setNewDate}
          newStartTime={newStartTime}
          setNewStartTime={setNewStartTime}
          newEndTime={newEndTime}
          setNewEndTime={setNewEndTime}
          newIsDoublePeriod={newIsDoublePeriod}
          setNewIsDoublePeriod={setNewIsDoublePeriod}
          newTopic={newTopic}
          setNewTopic={setNewTopic}
          newChuDe={newChuDe}
          setNewChuDe={setNewChuDe}
          newHoatDong={newHoatDong}
          setNewHoatDong={setNewHoatDong}
          newDeTai={newDeTai}
          setNewDeTai={setNewDeTai}
          newLessonPlanName={newLessonPlanName}
          setNewLessonPlanName={setNewLessonPlanName}
          newLessonPlanData={newLessonPlanData}
          setNewLessonPlanData={setNewLessonPlanData}
          fileInputRef={fileInputRef}
          handleCreateSubmit={handleCreateSubmit}
          handleStartTimeChange={handleStartTimeChange}
          handleDoublePeriodChange={handleDoublePeriodChange}
          handleFileChange={handleFileChange}
          filteredClassesForCreation={filteredClassesForCreation}
          submitting={submitting}
          minAllowedDate={minAllowedDate}
          subjects={subjects}
          departments={departments}
          teachers={teachers}
          campuses={campuses}
          classes={classes}
          periodOptions={periodOptions}
          getGradesForLevel={getGradesForLevel}
          getKhacChuyenDeSubjectId={getKhacChuyenDeSubjectId}
          isPreschoolDepartment={isPreschoolDepartment}
          k12Labels={k12Labels}
          maxScoresK12={maxScoresK12}
          getK12RankingDetails={getK12RankingDetails}
          getMamNonRankingDetails={getMamNonRankingDetails}
        />
      )}
      {/* TAB 2: TỔNG HỢP & DANH SÁCH TIẾT DẠY */}
      {activeMainTab === "overview_slots" && (
        <div className="w-full space-y-5 animate-in fade-in duration-300">
          {/* Admin Mode KPI Dashboard Cards */}
          {viewMode === "ADMIN" && (
            <AdminObservationKpiCards
              slots={slots}
              isPreschool={isMamNonTeacher}
              selectedMonth={filterMonth}
              academicYearName={activeAcademicYear?.name}
            />
          )}

          {/* Teacher Mode: Compact Quick Register Bar (Space-saving, Simple & Elegant) */}
          {viewMode === "TEACHER" && (
            <div className="w-full bg-gradient-to-r from-teal-50/90 via-white to-amber-50/60 rounded-2xl border border-teal-200/90 p-3 shadow-2xs">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
                {/* Title Tag */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#008B82] to-[#004f4a] text-white text-xs font-black uppercase flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Đăng ký nhanh</span>
                  </span>
                  <span className="hidden sm:inline-block text-xs font-bold text-slate-500">
                    Gợi ý tiết mới nhất:
                  </span>
                </div>

                {/* Suggested 3 Compact Slim Cards */}
                <div className="flex-1">
                  {(() => {
                    const today = new Date();
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                    const suggested = (slots || [])
                      .filter(s => {
                        if (s.teacherId === currentTeacher?.id) return false;
                        if ((s.registrations || []).some((r: any) => r.teacherId === currentTeacher?.id)) return false;
                        if (s.requestOrigin === "OBSERVER_REQUEST") return false;
                        return true;
                      })
                      .sort((a, b) => {
                        const aDate = new Date(a.date);
                        const bDate = new Date(b.date);
                        const aRegs = a.registrations || [];
                        const bRegs = b.registrations || [];
                        const aIsExpired = aDate < todayStart || a.status === "EXPIRED" || aRegs.length >= (a.maxSeats || 4);
                        const bIsExpired = bDate < todayStart || b.status === "EXPIRED" || bRegs.length >= (b.maxSeats || 4);

                        if (!aIsExpired && bIsExpired) return -1;
                        if (aIsExpired && !bIsExpired) return 1;

                        const getScore = (slot: any) => {
                          let score = 0;
                          const isSlotMamNon = slot.level === "Mầm non" ||
                            (slot.teacher?.departmentRel?.blockCM || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("mam non");
                          
                          if (isMamNonTeacher) {
                            if (isSlotMamNon) {
                              score += 500;
                              const isSameDept = checkIsMyDept(slot);
                              const isSameCampus = slot.campusId === currentTeacher?.campusId;
                              if (isSameCampus && isSameDept) score += 300;
                              else if (isSameCampus) score += 200;
                              else if (isSameDept) score += 100;
                            }
                          } else {
                            if (!isSlotMamNon) {
                              score += 500;
                              const isSameDept = checkIsMyDept(slot);
                              const isSameCampus = slot.campusId === currentTeacher?.campusId;
                              if (isSameCampus && isSameDept) score += 300;
                              else if (isSameCampus) score += 200;
                              else if (isSameDept) score += 100;
                            }
                          }
                          return score;
                        };

                        const scoreDiff = getScore(b) - getScore(a);
                        if (scoreDiff !== 0) return scoreDiff;

                        const aTime = new Date(a.createdAt || a.date).getTime();
                        const bTime = new Date(b.createdAt || b.date).getTime();
                        return bTime - aTime;
                      })
                      .slice(0, 3);
                    
                    if (suggested.length === 0) {
                      return (
                        <div className="py-2 text-xs font-bold text-slate-400 italic text-center">
                          Chưa có tiết dạy dự giờ nào khả dụng.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {suggested.map(slot => {
                          const slotDate = new Date(slot.date);
                          const sRegs = slot.registrations || [];
                          const isPastSlot = slotDate < todayStart || slot.status === "EXPIRED" || sRegs.length >= (slot.maxSeats || 4);
                          const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "";
                          const remainingSeats = Math.max(0, (slot.maxSeats || 4) - sRegs.length);
                          const tName = slot.teacher?.teacherName || slot.teacherName || "GV";

                          return (
                            <div 
                              key={slot.id} 
                              className="flex items-center justify-between gap-2.5 p-2.5 px-3 bg-white hover:bg-teal-50/50 border border-slate-200/90 hover:border-teal-400 rounded-xl transition-all shadow-2xs hover:shadow-xs text-xs"
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  {campusDisplay && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 font-extrabold text-[10px] shrink-0 border border-amber-200">
                                      {campusDisplay}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-black text-slate-900 truncate text-xs" title={slot.topic}>
                                      {slot.topic}
                                    </span>
                                    {isSurpriseSlot(slot) && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 rounded shrink-0">
                                        ⚡ Đột xuất
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                                  <span className="font-bold text-slate-700 truncate max-w-[100px]">{tName}</span>
                                  <span>•</span>
                                  <span>{slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} ({slot.startTime})</span>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-extrabold shrink-0">Còn {remainingSeats} chỗ</span>
                                </div>
                              </div>

                              <button 
                                disabled={isPastSlot}
                                onClick={() => setRegisterDetailSlot(slot)}
                                className={`px-3 py-1.5 text-[11px] font-black uppercase rounded-lg transition-all shrink-0 cursor-pointer shadow-2xs ${
                                  isPastSlot
                                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white hover:scale-105 active:scale-95"
                                }`}
                              >
                                {isPastSlot ? "Hết" : "Đăng ký"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

        {/* ROW 2: Danh sách tiết dạy đăng ký dự giờ (Full-width Data Table) */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5 border-t-4 border-t-[#003B3A]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#008B82] flex items-center justify-center">
              {viewMode === "ADMIN" ? <LayoutDashboard className="w-5 h-5 text-teal-700" /> : <SlidersHorizontal className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider">
                {viewMode === "ADMIN" ? "Bảng Điều hành Tiết dạy Dự giờ Toàn trường" : "Danh sách tiết dạy đăng ký dự giờ"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {viewMode === "ADMIN" ? "Quản lý, điều phối, phê duyệt và theo dõi tiến độ dự giờ toàn trường" : "Tìm kiếm, lọc theo tổ chuyên môn và chọn tiết dự giờ phù hợp"}
              </p>
            </div>
            {isSearching && (
              <div className="flex items-center gap-1.5 ml-2 text-xs font-bold text-teal-600 animate-pulse">
                <div className="w-2 h-2 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span>Đang tải...</span>
              </div>
            )}
          </div>

          {/* Unified Filter Tabs Bar (6 Thẻ Lọc: Tất cả, Tiết tự mở, Hết hạn, Xin dự giờ, Thuộc TCM, TCM khác) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
            {/* 1. Tất cả */}
            <button
              type="button"
              onClick={() => setActiveFilterTab("all")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeFilterTab === "all"
                  ? "bg-gradient-to-r from-[#003B3A] to-slate-900 text-white shadow-md shadow-slate-900/30 border border-slate-500/40 scale-[1.02]"
                  : "text-slate-700 bg-white/80 hover:bg-white hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              <span>⭐ Tất cả</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                activeFilterTab === "all" ? "bg-white/25 text-white border border-white/30" : "bg-slate-200 text-slate-800 border border-slate-300"
              }`}>
                {tabCounts.all}
              </span>
            </button>

            {/* 2. Tiết GV Dạy tự mở */}
            <button
              type="button"
              onClick={() => setActiveFilterTab("self_open")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeFilterTab === "self_open"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40 scale-[1.02]"
                  : "text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/80"
              }`}
            >
              <span>✨ Tiết GV Dạy tự mở</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                activeFilterTab === "self_open" ? "bg-white/25 text-white border border-white/30" : "bg-emerald-200/80 text-emerald-950 border border-emerald-300"
              }`}>
                {tabCounts.self_open}
              </span>
            </button>

            {/* 3. Hết hạn */}
            <button
              type="button"
              onClick={() => setActiveFilterTab("expired")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeFilterTab === "expired"
                  ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/30 border border-rose-400/40 scale-[1.02]"
                  : "text-rose-900 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/80"
              }`}
            >
              <span>⏳ Hết hạn</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                activeFilterTab === "expired" ? "bg-white/25 text-white border border-white/30" : "bg-rose-200/80 text-rose-950 border border-rose-300"
              }`}>
                {tabCounts.expired}
              </span>
            </button>

            {/* 4. Xin dự giờ */}
            <button
              type="button"
              onClick={() => setActiveFilterTab("gbm_request")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeFilterTab === "gbm_request"
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40 scale-[1.02]"
                  : "text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/80"
              }`}
            >
              <span>📩 Xin dự giờ</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                activeFilterTab === "gbm_request" ? "bg-white/25 text-white border border-white/30" : "bg-indigo-200/80 text-indigo-950 border border-indigo-300"
              }`}>
                {tabCounts.gbm_request}
              </span>
            </button>

            {/* 5. Thuộc TCM */}
            <button
              type="button"
              onClick={() => setActiveFilterTab("my_dept")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeFilterTab === "my_dept"
                  ? "bg-gradient-to-r from-teal-700 to-emerald-800 text-white shadow-md shadow-teal-900/30 border border-teal-400/40 scale-[1.02]"
                  : "text-teal-950 bg-teal-50/70 hover:bg-teal-100 border border-teal-200/80"
              }`}
            >
              <span>🏫 Thuộc TCM</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                activeFilterTab === "my_dept" ? "bg-white/25 text-white border border-white/30" : "bg-teal-200/80 text-teal-950 border border-teal-300"
              }`}>
                {tabCounts.my_dept}
              </span>
            </button>

            {/* 6. TCM khác */}
            <button
              type="button"
              onClick={() => setActiveFilterTab("other_dept")}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                activeFilterTab === "other_dept"
                  ? "bg-gradient-to-r from-sky-700 to-blue-800 text-white shadow-md shadow-sky-900/30 border border-sky-400/40 scale-[1.02]"
                  : "text-sky-950 bg-sky-50/70 hover:bg-sky-100 border border-sky-200/80"
              }`}
            >
              <span>🌐 TCM khác</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                activeFilterTab === "other_dept" ? "bg-white/25 text-white border border-white/30" : "bg-sky-200/80 text-sky-950 border border-sky-300"
              }`}>
                {tabCounts.other_dept}
              </span>
            </button>
          </div>
        </div>
        
        {/* Compact Advanced Filter Bar (6 Filters) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs font-semibold">
          {/* 1. Tháng */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Tháng</span>
            <select value={filterMonth} onChange={e => handleMonthChange(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả tháng</option>
              {availableMonths.map(m => {
                const [y, mon] = m.split("-");
                const isCurrent = m === `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
                return (
                  <option key={m} value={m}>
                    Tháng {mon}/{y} {isCurrent ? " (Hiện tại)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          {/* 2. Cơ sở */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Cơ sở</span>
            <select value={filterCampusId} onChange={e => { setFilterCampusId(e.target.value); setFilterClassId("all"); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả cơ sở</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
            </select>
          </div>

          {/* 3. Bộ phận (Ban ĐHCM) */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-indigo-500 uppercase flex items-center gap-1">
              <span>🏢 Bộ phận</span>
            </span>
            <select 
              value={filterDivisionCode} 
              onChange={e => { setFilterDivisionCode(e.target.value); setFilterDeptId("all"); }}
              className="w-full text-xs font-bold rounded-xl border border-indigo-200 p-2 bg-indigo-50/30 text-indigo-950 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả 6 Bộ phận</option>
              {(props.divisions || ACADEMIC_DIVISIONS).map(div => (
                <option key={div.code} value={div.code}>{div.name}</option>
              ))}
            </select>
          </div>

          {/* 4. Tổ chuyên môn */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Tổ chuyên môn</span>
            <select value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">{isMamNonTeacher ? "Tất cả Tổ Mầm non & TA" : "Tất cả TCM"}</option>
              {(
                departments
                  .filter(d => {
                    if (filterDivisionCode && filterDivisionCode !== "all") {
                      return (d as any).divisionCode === filterDivisionCode;
                    }
                    if (isMamNonTeacher) {
                      return isPreschoolDepartment(d.name || d.code || "") || ((d as any).blockCM || "").toLowerCase().includes("mam non") || (d.code && ["TO_TACTQ_MN.S", "TO_TACTQ_PT.G"].includes(d.code));
                    }
                    return true;
                  })
              ).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* 5. Bậc học */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Bậc học</span>
            <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterGrade("all"); setFilterClassId("all"); }}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả bậc</option>
              <option value="Mầm non">Mầm non</option>
              <option value="Tiểu học">Tiểu học</option>
              <option value="THCS">THCS</option>
              <option value="THPT">THPT</option>
              <option value="Phổ thông K-12">Phổ thông K-12</option>
            </select>
          </div>

          {/* 9. Tiết dạy */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-black text-slate-400 uppercase">Tiết dạy</span>
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-white text-slate-800 outline-none focus:border-[#008B82] focus:ring-1 focus:ring-[#008B82]">
              <option value="all">Tất cả tiết</option>
              {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterTags.map(tag => (
              <span key={tag.key} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-teal-50 text-[#008B82] border border-teal-200">
                <span>{tag.label}:</span> <span className="font-black">{tag.value}</span>
                <button onClick={tag.onRemove} className="p-0.5 hover:bg-teal-200/50 rounded-full transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-xs font-black text-rose-500 hover:underline ml-2">
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

        {/* Slots Table */}
        {tabFilteredSlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Calendar className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-800">Không tìm thấy tiết dạy dự giờ nào!</p>
              <p className="text-xs text-slate-400">Thay đổi bộ lọc hoặc khởi tạo thêm tiết dạy mới của bạn.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {activeFilterTab === "gbm_request" ? (
                  <tr className="bg-indigo-50/80 border-b border-indigo-100 text-indigo-900 font-black uppercase text-[11px] tracking-wider">
                    {canDeleteAnySlot && (
                      <th className="p-4 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isAllCurrentSelected}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                          title="Chọn / Bỏ chọn tất cả tiết hiển thị"
                        />
                      </th>
                    )}
                    <th className="p-4 text-center w-12">TT</th>
                    <th className="p-4">GV Xin dự giờ</th>
                    <th className="p-4">GV Dạy</th>
                    <th className="p-4">Thời gian đăng ký</th>
                    <th className="p-4">Môn học</th>
                    <th className="p-4">Tên bài dạy / Chủ đề</th>
                    <th className="p-4">Lớp</th>
                    <th className="p-4">Tiết</th>
                    <th className="p-4">Ngày dạy</th>
                    <th className="p-4 text-center">Trạng thái</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                ) : (
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-wider">
                    {canDeleteAnySlot && (
                      <th className="p-4 text-center w-10">
                        <input
                          type="checkbox"
                          checked={isAllCurrentSelected}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                          title="Chọn / Bỏ chọn tất cả tiết hiển thị"
                        />
                      </th>
                    )}
                    <th className="p-4 text-center w-12">TT</th>
                    <th className="p-4">Giáo viên</th>
                    <th className="p-4">Thời gian đăng ký</th>
                    <th className="p-4">Cơ sở</th>
                    <th className="p-4">Tổ chuyên môn</th>
                    <th className="p-4">Môn học & Chủ đề</th>
                    <th className="p-4">Thời gian / Phòng</th>
                    <th className="p-4 text-center">Số chỗ</th>
                    <th className="p-4">GV Đăng ký</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">{canDeleteAnySlot ? "Thao tác Quản trị" : "Đăng ký"}</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                {tabFilteredSlots.map((slot, index) => {
                  const isHost = slot.teacherId === currentTeacher?.id;
                  const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
                  const isRegistered = !!myReg;
                  const observerCount = (slot.registrations || []).length;
                  const slotDate = new Date(slot.date);
                  
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isExpired = slotDate < todayStart || slot.status === "EXPIRED";
                  const isSelected = selectedSlotIds.includes(slot.id);

                  if (activeFilterTab === "gbm_request") {
                    const observerReg = slot.registrations?.[0];
                    const observerName = observerReg?.teacher?.teacherName || observerReg?.teacherName || "GVBM";

                    return (
                      <tr 
                        key={slot.id} 
                        id={`slot-row-${slot.id}`}
                        className={`hover:bg-indigo-50/30 transition-all duration-500 ${
                          isSelected ? "bg-indigo-50/70" : ""
                        } ${
                          highlightedSlotId === slot.id ? "bg-amber-100/90 ring-4 ring-amber-400 ring-offset-2 rounded-xl shadow-lg scale-[1.01]" : ""
                        }`}
                      >
                        {canDeleteAnySlot && (
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectSlot(slot.id)}
                              className="w-4 h-4 rounded text-indigo-600 border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-4 text-center font-black text-slate-400">{index + 1}</td>
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(observerName)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                              {observerName.charAt(0)}
                            </div>
                            <span className="font-black text-indigo-950">{observerName}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(slot.teacher?.teacherName || "G")} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                              {(slot.teacher?.teacherName || "G").charAt(0)}
                            </div>
                            <span className="font-black text-slate-800">{slot.teacher?.teacherName}</span>
                          </div>
                        </td>
                        {/* Thời gian đăng ký */}
                        <td className="p-4 whitespace-nowrap">
                          {slot.createdAt ? (() => {
                            const createdDate = new Date(slot.createdAt);
                            if (isNaN(createdDate.getTime())) {
                              return <span className="text-slate-400 italic text-xs">—</span>;
                            }
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>{createdDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{createdDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              </div>
                            );
                          })() : (
                            <span className="text-slate-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                            {slot.subjectName}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[#003B3A]">{slot.topic}</td>
                        <td className="p-4 font-bold text-slate-700">{slot.className || "Chưa xếp"}</td>
                        <td className="p-4 font-bold text-teal-700">{slot.startTime}</td>
                        <td className="p-4 font-bold text-slate-800">
                          {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </td>
                        <td className="p-4 text-center">
                          {slot.status === "PENDING_TEACHER_APPROVAL" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Chờ duyệt
                            </span>
                          ) : slot.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                              <X className="w-3 h-3 text-rose-500" />
                              Từ chối
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black uppercase rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-500" />
                              Đã duyệt
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isHost && slot.status === "PENDING_TEACHER_APPROVAL" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRespondRequest(slot.id, true)}
                                  className="px-3 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
                                >
                                  Đồng ý
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRespondRequest(slot.id, false, "Giáo viên bận")}
                                  className="px-3 py-1.5 text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                            {canDeleteAnySlot && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer shadow-2xs hover:scale-105"
                                title="Xóa tiết yêu cầu dự giờ này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!isHost && slot.status !== "PENDING_TEACHER_APPROVAL" && !canDeleteAnySlot && (
                              <span className="text-xs text-slate-400 italic font-medium">
                                Đã gửi yêu cầu
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr 
                      key={slot.id} 
                      id={`slot-row-${slot.id}`}
                      className={`hover:bg-slate-50/80 transition-all duration-500 ${
                        isSelected ? "bg-teal-50/60" : ""
                      } ${
                        highlightedSlotId === slot.id ? "bg-amber-100/90 ring-4 ring-amber-400 ring-offset-2 rounded-xl shadow-lg scale-[1.01]" : ""
                      }`}
                    >
                      {canDeleteAnySlot && (
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectSlot(slot.id)}
                            className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-4 text-center font-black text-slate-400">{index + 1}</td>
                      
                      {/* Cột GIÁO VIÊN */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(slot.teacher.teacherName)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                            {slot.teacher.teacherName.charAt(0)}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                            {slot.teacher.teacherName}
                          </span>
                        </div>
                      </td>

                      {/* Cột THỜI GIAN ĐĂNG KÝ */}
                      <td className="p-4 whitespace-nowrap">
                        {slot.createdAt ? (() => {
                          const createdDate = new Date(slot.createdAt);
                          if (isNaN(createdDate.getTime())) {
                            return <span className="text-slate-400 italic text-xs">—</span>;
                          }
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>{createdDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{createdDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>

                      {/* Cột CƠ SỞ */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-black inline-block shadow-2xs">
                          {slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "Sky-Line"}
                        </span>
                      </td>

                      {/* Cột TỔ CHUYÊN MÔN */}
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-extrabold inline-block shadow-2xs">
                          {slot.teacher?.departmentRel?.name || (departments.find((d: any) => d.id === slot.teacher?.departmentId)?.name) || "Chưa xếp tổ"}
                        </span>
                      </td>

                      {/* Cột MÔN HỌC & CHỦ ĐỀ */}
                      <td className="p-4">
                        {slot.level === "Mầm non" ? (() => {
                          const parts = (slot.subjectName || "").split(" | ");
                          const chuDe = parts[0] || "";
                          const hoatDong = parts[1] || "";
                          const deTai = slot.topic || "";
                          return (
                            <div className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-100 text-amber-900 border border-amber-200">Mầm non</span>
                                <span className="text-xs font-bold text-amber-950 truncate">Chủ đề: {chuDe}</span>
                              </div>
                              <p className="font-black text-amber-950 text-xs leading-snug">Đề tài: {deTai}</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                Hoạt động: <span className="text-amber-800 font-bold">{hoatDong}</span> • Lớp: {slot.className || "Chưa xếp"}
                              </p>
                            </div>
                          );
                        })() : (
                          <div className="space-y-1">
                            <p className="font-black text-[#003B3A] text-xs leading-snug">{slot.topic}</p>
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-500 font-medium text-[11px]">
                              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60 font-bold">
                                {slot.subjectName}
                              </span>
                              <span>•</span>
                              <span>Lớp {slot.className || "Chưa xếp"}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Cột THỜI GIAN / PHÒNG */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{slot.startTime || `Tiết ${slot.period || 1}`}</span>
                            <span>•</span>
                            <span className="truncate max-w-[100px]">Phòng: {slot.room || "Phòng học"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cột SỐ CHỖ */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-black rounded-xl border inline-block shadow-2xs ${
                          observerCount >= (slot.maxSeats || 4)
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : observerCount > 0
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}>
                          {observerCount}/{slot.maxSeats || 4}
                        </span>
                      </td>

                      {/* Cột GV ĐĂNG KÝ */}
                      <td className="p-4">
                        {slot.registrations && slot.registrations.length > 0 ? (
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            {slot.registrations.map((reg: any) => {
                              const regTeacherName = reg.teacher?.teacherName || reg.teacherName || "GV";
                              return (
                                <div key={reg.id} className="flex items-center gap-1.5 text-[11px] truncate">
                                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${getAvatarGradient(regTeacherName)} text-white flex items-center justify-center font-black text-[9px] shrink-0`}>
                                    {regTeacherName.charAt(0)}
                                  </div>
                                  <span className="font-bold text-slate-700 truncate">{regTeacherName}</span>
                                  {reg.isApproved ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 shrink-0">Đã duyệt</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 shrink-0">Chờ duyệt</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic font-medium">Chưa có</span>
                        )}
                      </td>

                      {/* Cột TRẠNG THÁI */}
                      <td className="p-4 whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                            Hết hạn
                          </span>
                        ) : observerCount >= (slot.maxSeats || 4) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Xin dự
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Mở ĐK
                          </span>
                        )}
                      </td>

                      {/* Cột THAO TÁC / ĐĂNG KÝ */}
                      <td className="p-4 text-right">
                        {canDeleteAnySlot || viewMode === "ADMIN" ? (
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Chi tiết / In phiếu */}
                            <button
                              type="button"
                              onClick={() => {
                                const reg = slot.registrations?.[0] || null;
                                setPrintModalSlot({ slot, registration: reg });
                              }}
                              className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#008B82] border border-teal-200/80 transition-all cursor-pointer shadow-2xs"
                              title="Xem chi tiết & In phiếu đánh giá"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Sửa tiết dạy */}
                            <button
                              type="button"
                              onClick={() => openEditModal(slot)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all cursor-pointer shadow-2xs"
                              title="Chỉnh sửa thông tin tiết dạy"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Gửi email nhắc nhở */}
                            {slot.registrations && slot.registrations.length > 0 && slot.registrations.some((r: any) => !r.evaluation) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  startTransition(async () => {
                                    const res = await triggerSlotReminder(slot.id);
                                    if (res.success) {
                                      showToast("Đã gửi email nhắc nhở giáo viên tham gia dự giờ / nộp phiếu!", "success");
                                    } else {
                                      showToast(res.error || "Gửi email nhắc nhở thất bại", "error");
                                    }
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-all cursor-pointer shadow-2xs"
                                title="Gửi email nhắc nhở nộp phiếu đánh giá"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Xóa tiết dạy */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 transition-all cursor-pointer shadow-2xs hover:scale-105"
                              title={slot.registrations && slot.registrations.length > 0 ? `Xóa tiết dạy (${slot.registrations.length} GV đã đăng ký)` : "Xóa tiết dạy này"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {isHost ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-amber-50 text-amber-800 border border-amber-200 inline-block shadow-2xs">
                                  Tôi dạy
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer shadow-2xs"
                                  title="Xóa tiết dạy của tôi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : isExpired ? (
                              <button disabled className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                                Hết hạn
                              </button>
                            ) : isRegistered ? (
                              myReg?.isApproved ? (
                                <span className="px-3 py-1.5 text-xs font-black rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block shadow-2xs">
                                  Đã đăng ký (Đã duyệt)
                                </span>
                              ) : (
                                <button onClick={() => handleCancelRegistration(myReg.id)}
                                  className="px-3.5 py-1.5 text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-200 cursor-pointer shadow-2xs">
                                  Hủy dự
                                </button>
                              )
                            ) : observerCount >= (slot.maxSeats || 4) ? (
                              <button disabled className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                                Khóa
                              </button>
                            ) : (
                              <button 
                                onClick={() => setRegisterDetailSlot(slot)}
                                className="px-4 py-2 text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-teal-800/15 bg-gradient-to-r from-[#008B82] to-[#007068] hover:from-[#007068] hover:to-[#005c56] text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Đăng ký
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sticky / Floating Bulk Action Toolbar for Admin */}
        {canDeleteAnySlot && selectedSlotIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[90vw]">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
              <CheckSquare className="w-5 h-5 text-teal-400" />
              <span className="text-xs font-black tracking-wide">
                Đã chọn <span className="text-teal-300 text-sm font-black">{selectedSlotIds.length}</span> / {tabFilteredSlots.length} tiết
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/80 transition-all cursor-pointer"
              >
                {isAllCurrentSelected ? "Bỏ chọn trang này" : "Chọn tất cả đang hiện"}
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/80 transition-all cursor-pointer"
              >
                Bỏ chọn
              </button>

              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={handleDeleteMultipleSlots}
                className="px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {isDeletingBulk ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa {selectedSlotIds.length} tiết đã chọn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )}

      {/* TAB 3: 3. LỊCH DẠY & DỰ GIỜ CỦA TÔI (Compact & Structured Table Layout) */}
      {activeMainTab === "my_schedule" && myScheduleSubTab !== "register" && (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
          {/* Personal Target Tracker Progress Bars */}
          <TeacherTargetTracker
            taughtCount={myTaughtCount}
            targetTaught={taughtTarget}
            observedCount={myObservedCount}
            targetObserved={obsTarget}
            totalTaughtSlots={myTaughtSlots.length}
            totalObservedSlots={myObservedSlots.length}
            pendingEvaluationCount={myPendingEvaluationsCount}
            avgScore={myReceivedEvaluationsStats.avgScore}
            receivedEvaluationCount={myReceivedEvaluationsStats.count}
            surpriseTaughtCount={mySurpriseTaughtCount}
            totalSurpriseTaughtSlots={totalSurpriseTaughtSlots}
            surpriseObservedCount={mySurpriseObservedCount}
            totalSurpriseObservedSlots={totalSurpriseObservedSlots}
            isPreschool={isMamNonTeacher}
            academicYearName={activeAcademicYear?.name || ""}
            selectedMonth={filterMonth}
            onSelectMonth={handleMonthChange}
            availableMonths={availableMonths}
            monthlyStatsList={teacherMonthlyStatsList}
            onViewReport={() => setActiveMainTab("teacher_report")}
          />
          
          {/* Sub-navigation inside My Workspace */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMyScheduleSubTab("all")}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                myScheduleSubTab === "all"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 bg-white/60"
              }`}
            >
              <span>🌟 Tất cả</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                myScheduleSubTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {myTaughtSlots.length + myObservedSlots.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMyScheduleSubTab("taught")}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                myScheduleSubTab === "taught"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-amber-800 bg-white/60"
              }`}
            >
              <span>🧑‍🏫 Tiết tôi dạy</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                myScheduleSubTab === "taught" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900"
              }`}>
                {myTaughtSlots.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMyScheduleSubTab("observed")}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                myScheduleSubTab === "observed"
                  ? "bg-gradient-to-r from-[#008B82] to-teal-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-teal-800 bg-white/60"
              }`}
            >
              <span>👁️ Tiết tôi đi dự</span>
              <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                myScheduleSubTab === "observed" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-900"
              }`}>
                {myObservedSlots.length}
              </span>
              {myPendingEvaluationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white text-[9px] font-black animate-pulse">
                  {myPendingEvaluationsCount} chưa chấm
                </span>
              )}
            </button>
          </div>
          
          {/* SECTION 1: TIẾT DẠY CỦA TÔI (TÔI DẠY) - DATA TABLE */}
          {(myScheduleSubTab === "all" || myScheduleSubTab === "taught") && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-4 border-t-4 border-t-amber-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black border border-amber-200 shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider">
                      Tiết dạy của tôi (Tôi trực tiếp giảng dạy)
                    </h3>
                    <span className="px-2.5 py-0.5 text-xs font-black bg-amber-100 text-amber-900 rounded-full border border-amber-300">
                      {myTaughtSlots.length} tiết
                    </span>
                    {myTaughtSlots.filter(s => isSurpriseSlot(s)).length > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-black bg-rose-50 text-rose-700 rounded-full border border-rose-200 flex items-center gap-1 shadow-2xs">
                        <span>⚡</span>
                        <span>{myTaughtSlots.filter(s => isSurpriseSlot(s)).length} đột xuất</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Quản lý danh sách tiết bạn mở, duyệt danh sách giáo viên đăng ký tham gia dự giờ
                  </p>
                </div>
              </div>

              {/* Filter tabs: Origin + Cấp học (MN, PT) */}
              {myTaughtSlots.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setTaughtOriginFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        taughtOriginFilter === "all"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Tất cả ({myTaughtSlots.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaughtOriginFilter("PLAN")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        taughtOriginFilter === "PLAN"
                          ? "bg-white text-teal-800 shadow-xs"
                          : "text-slate-500 hover:text-teal-800"
                      }`}
                    >
                      <span>📋 Kế hoạch</span>
                      <span className="text-[11px] opacity-75">({myTaughtSlots.filter(s => !isSurpriseSlot(s)).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaughtOriginFilter("SURPRISE")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        taughtOriginFilter === "SURPRISE"
                          ? "bg-white text-rose-700 shadow-xs"
                          : "text-slate-500 hover:text-rose-700"
                      }`}
                    >
                      <span>⚡ Đột xuất</span>
                      <span className="text-[11px] opacity-75">({myTaughtSlots.filter(s => isSurpriseSlot(s)).length})</span>
                    </button>
                  </div>

                  {/* Cấp học filter pills */}
                  <div className="flex items-center gap-1 bg-amber-50/80 p-1 rounded-2xl border border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => setTaughtCategoryFilter("all")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        taughtCategoryFilter === "all"
                          ? "bg-white text-amber-950 shadow-xs border border-amber-300/60"
                          : "text-amber-800/80 hover:text-amber-950"
                      }`}
                    >
                      Mọi cấp
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaughtCategoryFilter("MN")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        taughtCategoryFilter === "MN"
                          ? "bg-white text-amber-950 shadow-xs border border-amber-300"
                          : "text-amber-800/80 hover:text-amber-950"
                      }`}
                    >
                      <span>🍼 MN</span>
                      <span className="text-[11px] opacity-75">({myTaughtSlots.filter(s => getSlotCategoryInfo(s).shortCode === "MN").length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaughtCategoryFilter("PT")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        taughtCategoryFilter === "PT"
                          ? "bg-white text-emerald-950 shadow-xs border border-emerald-300"
                          : "text-emerald-800/80 hover:text-emerald-950"
                      }`}
                    >
                      <span>🏫 PT</span>
                      <span className="text-[11px] opacity-75">({myTaughtSlots.filter(s => getSlotCategoryInfo(s).shortCode !== "MN").length})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {myTaughtSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Calendar className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-center">Bạn chưa khởi tạo tiết dạy nào trong tháng.</p>
                <button
                  type="button"
                  onClick={() => setActiveMainTab("register_request")}
                  className="mt-3 px-4 py-2 text-xs font-black text-white bg-[#008B82] hover:bg-[#007068] rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  + Mở tiết dạy mới ngay
                </button>
              </div>
            ) : displayedMyTaughtSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Calendar className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-center">Không có tiết dạy nào phù hợp với bộ lọc hình thức đã chọn.</p>
                <button
                  type="button"
                  onClick={() => setTaughtOriginFilter("all")}
                  className="mt-3 px-4 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all cursor-pointer"
                >
                  Xem tất cả ({myTaughtSlots.length}) tiết dạy
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-amber-50/60 border-b border-amber-200/80 text-amber-950 font-black uppercase text-[11px] tracking-wider">
                      <th className="p-3.5 text-center w-12">TT</th>
                      <th className="p-3.5 text-center w-20">Cơ sở</th>
                      <th className="p-3.5 text-center w-24">Cấp học</th>
                      <th className="p-3.5">Môn học & Tên bài dạy / Chủ đề</th>
                      <th className="p-3.5">Thời gian & Lớp</th>
                      <th className="p-3.5">GV Đăng ký dự giờ (Duyệt)</th>
                      <th className="p-3.5 text-center">Giáo án</th>
                      <th className="p-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                    {displayedMyTaughtSlots.map((slot, index) => {
                      const slotDate = new Date(slot.date);
                      const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "Sky-Line";

                      return (
                        <tr 
                          key={slot.id} 
                          id={`my-taught-slot-${slot.id}`}
                          className={`hover:bg-amber-50/20 transition-all duration-500 ${
                            highlightedSlotId === slot.id ? "bg-amber-100/90 ring-4 ring-amber-400 ring-offset-2 rounded-xl shadow-lg scale-[1.01]" : ""
                          }`}
                        >
                          {/* TT */}
                          <td className="p-3.5 text-center font-black text-slate-400">{index + 1}</td>

                          {/* Cơ sở */}
                          <td className="p-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black inline-block shadow-2xs">
                              {campusDisplay}
                            </span>
                          </td>

                          {/* Cột Cấp học (MN, PT nếu dạy) */}
                          <td className="p-3.5 text-center">
                            {(() => {
                              const cat = getSlotCategoryInfo(slot);
                              const code = cat.shortCode === "MN" ? "MN" : (cat.shortCode === "GVNN" ? "GVNN" : "PT");
                              const badgeStyle = code === "MN"
                                ? "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/30"
                                : (code === "GVNN"
                                  ? "bg-sky-100 text-sky-900 border-sky-300 ring-1 ring-sky-400/30"
                                  : "bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30");
                              const icon = code === "MN" ? "🍼" : (code === "GVNN" ? "🌐" : "🏫");
                              return (
                                <span
                                  className={`px-2.5 py-1 rounded-xl text-xs font-black border inline-flex items-center justify-center gap-1 shadow-2xs min-w-[56px] ${badgeStyle}`}
                                  title={code === "MN" ? "Mầm non" : (code === "GVNN" ? "Dự giờ GVNN (ESL)" : "Phổ thông")}
                                >
                                  <span>{icon}</span>
                                  <span>{code}</span>
                                </span>
                              );
                            })()}
                          </td>

                          {/* Môn học & Chủ đề */}
                          <td className="p-3.5">
                            <div className="space-y-1 max-w-[280px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-black text-[#003B3A] text-xs leading-snug" title={slot.topic}>
                                  {slot.topic}
                                </p>
                                {isSurpriseSlot(slot) && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 rounded shrink-0">
                                    ⚡ Đột xuất
                                  </span>
                                )}
                                {slot.isDoublePeriod && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-300 rounded shrink-0">
                                    Tiết đôi (x2)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60 font-bold">
                                  {slot.subjectName}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 font-bold">Lớp {slot.className || "Chưa xếp"}</span>
                              </div>
                            </div>
                          </td>

                          {/* Thời gian & Lớp */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </p>
                              <p className="text-xs font-bold text-teal-700">
                                {slot.startTime} • Phòng {slot.room || "học"}
                              </p>
                            </div>
                          </td>

                          {/* GV Đăng ký dự giờ */}
                          <td className="p-3.5">
                            <div className="space-y-1.5 min-w-[220px] max-w-[320px]">
                              <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500">
                                <span>Người dự:</span>
                                <span className="text-teal-800 bg-teal-50 px-2 py-0.2 rounded-md border border-teal-200">
                                  {(slot.registrations || []).length} / {slot.maxSeats || 4} chỗ
                                </span>
                              </div>
                              {(slot.registrations || []).length === 0 ? (
                                <span className="text-xs text-slate-400 italic">Chưa có người đăng ký</span>
                              ) : (
                                <div className="space-y-1">
                                  {(slot.registrations || []).map((reg: any) => {
                                    const regName = reg.teacher?.teacherName || reg.teacherName || "Giáo viên";
                                    return (
                                      <div key={reg.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200/80 shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getAvatarGradient(regName)} text-white flex items-center justify-center font-black text-[10px] shrink-0`}>
                                            {regName.charAt(0)}
                                          </div>
                                          <span className="font-bold text-slate-800 text-xs truncate" title={regName}>
                                            {regName}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {reg.isApproved ? (
                                            <>
                                              {reg.evaluation ? (
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                                                    ⭐ {reg.evaluation.overallRating || "Đã đánh giá"} {reg.evaluation.totalScore != null && Number(reg.evaluation.totalScore) > 0 ? `(${Number(reg.evaluation.totalScore).toFixed(2).replace(/\.00$/, "")}đ)` : ""}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => openEvalModal(reg, slot)}
                                                    className="px-2 py-0.5 text-[10px] font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-md transition-all shadow-2xs cursor-pointer"
                                                  >
                                                    Xem phiếu
                                                  </button>
                                                </div>
                                              ) : (
                                                <>
                                                  <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                                    Đã duyệt
                                                  </span>
                                                  <button
                                                    type="button"
                                                    title="Gửi email nhắc nhở nhập đánh giá tới GV"
                                                    onClick={async () => {
                                                      const res = await sendPendingEvaluationReminder(reg.id);
                                                      if (res.success) {
                                                        alert(`Đã gửi email nhắc nhở nhập đánh giá tới Thầy/Cô ${regName}!`);
                                                      } else {
                                                        alert(res.error || "Gửi email thất bại");
                                                      }
                                                    }}
                                                    className="px-2 py-0.5 text-[10px] font-black rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                                  >
                                                    <Mail className="w-2.5 h-2.5 text-amber-600" />
                                                    Nhắc mail
                                                  </button>
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => handleApprove(reg.id)}
                                              className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg bg-[#008B82] hover:bg-[#007068] text-white shadow-xs transition-all cursor-pointer hover:scale-105"
                                            >
                                              Duyệt
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Giáo án */}
                          <td className="p-3.5 text-center">
                            {slot.lessonPlanUrl ? (
                              <a
                                href={slot.lessonPlanUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 text-xs font-bold transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-teal-600" />
                                Xem PDF
                              </a>
                            ) : (
                              <span className="text-xs text-slate-300 italic">-</span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(slot)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                              >
                                Hủy tiết
                              </button>
                            </div>
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

          {/* SECTION 2: TIẾT TÔI DỰ (ĐÃ ĐĂNG KÝ) - DATA TABLE */}
          {(myScheduleSubTab === "all" || myScheduleSubTab === "observed") && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-4 border-t-4 border-t-[#008B82]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#008B82] flex items-center justify-center font-black border border-teal-200 shadow-2xs">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm text-[#003B3A] uppercase tracking-wider">
                      Tiết tôi dự (Đã đăng ký tham gia)
                    </h3>
                    <span className="px-2.5 py-0.5 text-xs font-black bg-teal-100 text-teal-900 rounded-full border border-teal-300">
                      {myObservedSlots.length} tiết
                    </span>
                    {myObservedSlots.filter(s => isSurpriseSlot(s)).length > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-black bg-rose-50 text-rose-700 rounded-full border border-rose-200 flex items-center gap-1 shadow-2xs">
                        <span>⚡</span>
                        <span>{myObservedSlots.filter(s => isSurpriseSlot(s)).length} đột xuất</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Theo dõi trạng thái duyệt, tiến hành nhập phiếu chấm điểm hoặc xem lại kết quả đánh giá
                  </p>
                </div>
              </div>

              {/* Filter tabs: Origin + Phân loại (GVNN, MN, PT nếu Dự) */}
              {myObservedSlots.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setObservedOriginFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        observedOriginFilter === "all"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Tất cả ({myObservedSlots.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setObservedOriginFilter("PLAN")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        observedOriginFilter === "PLAN"
                          ? "bg-white text-teal-800 shadow-xs"
                          : "text-slate-500 hover:text-teal-800"
                      }`}
                    >
                      <span>📋 Kế hoạch</span>
                      <span className="text-[11px] opacity-75">({myObservedSlots.filter(s => !isSurpriseSlot(s)).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setObservedOriginFilter("SURPRISE")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        observedOriginFilter === "SURPRISE"
                          ? "bg-white text-rose-700 shadow-xs"
                          : "text-slate-500 hover:text-rose-700"
                      }`}
                    >
                      <span>⚡ Đột xuất</span>
                      <span className="text-[11px] opacity-75">({myObservedSlots.filter(s => isSurpriseSlot(s)).length})</span>
                    </button>
                  </div>

                  {/* Phân loại (GVNN, MN, PT) filter pills */}
                  <div className="flex items-center gap-1 bg-teal-50/80 p-1 rounded-2xl border border-teal-200/80">
                    <button
                      type="button"
                      onClick={() => setObservedCategoryFilter("all")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        observedCategoryFilter === "all"
                          ? "bg-white text-teal-950 shadow-xs border border-teal-300/60"
                          : "text-teal-800/80 hover:text-teal-950"
                      }`}
                    >
                      Tất cả loại
                    </button>
                    <button
                      type="button"
                      onClick={() => setObservedCategoryFilter("GVNN")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        observedCategoryFilter === "GVNN"
                          ? "bg-white text-sky-950 shadow-xs border border-sky-300"
                          : "text-sky-800/80 hover:text-sky-950"
                      }`}
                    >
                      <span>🌐 GVNN</span>
                      <span className="text-[11px] opacity-75">({myObservedSlots.filter(s => getSlotCategoryInfo(s).shortCode === "GVNN").length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setObservedCategoryFilter("MN")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        observedCategoryFilter === "MN"
                          ? "bg-white text-amber-950 shadow-xs border border-amber-300"
                          : "text-amber-800/80 hover:text-amber-950"
                      }`}
                    >
                      <span>🍼 MN</span>
                      <span className="text-[11px] opacity-75">({myObservedSlots.filter(s => getSlotCategoryInfo(s).shortCode === "MN").length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setObservedCategoryFilter("PT")}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        observedCategoryFilter === "PT"
                          ? "bg-white text-emerald-950 shadow-xs border border-emerald-300"
                          : "text-emerald-800/80 hover:text-emerald-950"
                      }`}
                    >
                      <span>🏫 PT</span>
                      <span className="text-[11px] opacity-75">({myObservedSlots.filter(s => getSlotCategoryInfo(s).shortCode === "PT").length})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {myObservedSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <ClipboardList className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-center">Bạn chưa đăng ký tham gia dự giờ tiết học nào.</p>
                <button
                  type="button"
                  onClick={() => setActiveMainTab("overview_slots")}
                  className="mt-3 px-4 py-2 text-xs font-black text-white bg-[#008B82] hover:bg-[#007068] rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Xem danh sách tiết dạy để đăng ký
                </button>
              </div>
            ) : displayedMyObservedSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <ClipboardList className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-xs font-bold text-center">Không có tiết dự nào phù hợp với bộ lọc hình thức đã chọn.</p>
                <button
                  type="button"
                  onClick={() => setObservedOriginFilter("all")}
                  className="mt-3 px-4 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-all cursor-pointer"
                >
                  Xem tất cả ({myObservedSlots.length}) tiết dự
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-teal-50/70 border-b border-teal-200 text-teal-950 font-black uppercase text-[11px] tracking-wider">
                      <th className="p-3.5 text-center w-12">TT</th>
                      <th className="p-3.5 text-center w-20">Cơ sở</th>
                      <th className="p-3.5 text-center w-24">Phân loại</th>
                      <th className="p-3.5">Giáo viên dạy</th>
                      <th className="p-3.5">Môn học & Tên bài dạy / Chủ đề</th>
                      <th className="p-3.5">Thời gian & Lớp</th>
                      <th className="p-3.5 text-center">Trạng thái duyệt</th>
                      <th className="p-3.5">Đánh giá kết quả</th>
                      <th className="p-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                    {displayedMyObservedSlots.map((slot, index) => {
                      const slotDate = new Date(slot.date);
                      const myReg = (slot.registrations || []).find((r: any) => r.teacherId === currentTeacher?.id);
                      const campusDisplay = slot.campusName || slot.teacher?.campus?.campusName || (campuses.find(c => c.id === slot.campusId || c.campusCode === slot.campusId)?.campusName) || "Sky-Line";

                      return (
                        <tr 
                          key={slot.id} 
                          id={`my-observed-slot-${slot.id}`}
                          className={`hover:bg-teal-50/20 transition-all duration-500 ${
                            highlightedSlotId === slot.id ? "bg-amber-100/90 ring-4 ring-amber-400 ring-offset-2 rounded-xl shadow-lg scale-[1.01]" : ""
                          }`}
                        >
                          {/* TT */}
                          <td className="p-3.5 text-center font-black text-slate-400">{index + 1}</td>

                          {/* Cơ sở */}
                          <td className="p-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/80 text-xs font-black inline-block shadow-2xs">
                              {campusDisplay}
                            </span>
                          </td>

                          {/* Cột Phân loại (GVNN, MN, PT nếu Dự) */}
                          <td className="p-3.5 text-center">
                            {(() => {
                              const cat = getSlotCategoryInfo(slot);
                              const code = cat.shortCode;
                              const badgeStyle = code === "GVNN"
                                ? "bg-sky-100 text-sky-900 border-sky-300 ring-1 ring-sky-400/30"
                                : (code === "MN"
                                  ? "bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400/30"
                                  : "bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30");
                              const icon = code === "GVNN" ? "🌐" : (code === "MN" ? "🍼" : "🏫");
                              return (
                                <span
                                  className={`px-2.5 py-1 rounded-xl text-xs font-black border inline-flex items-center justify-center gap-1 shadow-2xs min-w-[64px] ${badgeStyle}`}
                                  title={code === "GVNN" ? "Dự giờ GVNN (ESL)" : (code === "MN" ? "Mầm non" : "Phổ thông")}
                                >
                                  <span>{icon}</span>
                                  <span>{code}</span>
                                </span>
                              );
                            })()}
                          </td>

                          {/* Giáo viên dạy */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(slot.teacher.teacherName)} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                                {slot.teacher.teacherName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 text-xs tracking-tight block">
                                  {slot.teacher.teacherName}
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {slot.teacher?.departmentRel?.name || (departments.find((d: any) => d.id === slot.teacher?.departmentId)?.name) || "TCM"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Môn học & Chủ đề */}
                          <td className="p-3.5">
                            <div className="space-y-1 max-w-[280px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-black text-[#003B3A] text-xs leading-snug" title={slot.topic}>
                                  {slot.topic}
                                </p>
                                {isSurpriseSlot(slot) && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 rounded shrink-0">
                                    ⚡ Đột xuất
                                  </span>
                                )}
                                {slot.isDoublePeriod && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-300 rounded shrink-0">
                                    Tiết đôi (x2)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/60 font-bold">
                                  {slot.subjectName}
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 font-bold">Lớp {slot.className || "Chưa xếp"}</span>
                              </div>
                            </div>
                          </td>

                          {/* Thời gian & Lớp */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {slotDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </p>
                              <p className="text-xs font-bold text-teal-700">
                                {slot.startTime} • Phòng {slot.room || "học"}
                              </p>
                            </div>
                          </td>

                          {/* Trạng thái duyệt */}
                          <td className="p-3.5 text-center">
                            {myReg?.isApproved ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Đã duyệt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Chờ duyệt
                              </span>
                            )}
                          </td>

                          {/* Đánh giá kết quả */}
                          <td className="p-3.5">
                            {myReg?.evaluation ? (
                              <div className="flex flex-col gap-1.5 py-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-950 font-black text-xs border border-emerald-300 shadow-2xs">
                                    ⭐ {myReg.evaluation.overallRating || myReg.evaluation.rating || "Đã đánh giá"} {myReg.evaluation.totalScore != null && Number(myReg.evaluation.totalScore) > 0 ? `(${Number(myReg.evaluation.totalScore).toFixed(2).replace(/\.00$/, "")}đ)` : ""}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openEvalModal(myReg, slot)}
                                    className="px-3 py-1 text-xs font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                                  >
                                    Xem phiếu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPrintModalSlot({ slot, registration: myReg })}
                                    className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                    title="In phiếu đánh giá chuẩn A4"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                                    <span className="hidden sm:inline">In phiếu</span>
                                  </button>
                                  {myReg.evaluation.reEvaluationStatus === "REQUESTED" && (
                                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                      ⏳ Chờ duyệt mở lại
                                    </span>
                                  )}
                                  {myReg.evaluation.reEvaluationStatus === "APPROVED" && (
                                    <button
                                      type="button"
                                      onClick={() => openEvalModal(myReg, slot)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs animate-pulse flex items-center gap-1 cursor-pointer"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Đánh giá lại</span>
                                    </button>
                                  )}
                                </div>

                                {/* Thời gian đánh giá: hiển thị thời gian, ngày giờ GV hoàn thành */}
                                {(myReg.evaluation.submittedAt || myReg.evaluation.updatedAt || myReg.evaluation.createdAt) && (
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>
                                      Thời gian đánh giá: <strong className="text-slate-800 font-bold">{formatEvalDateTimeVi(myReg.evaluation.submittedAt || myReg.evaluation.updatedAt || myReg.evaluation.createdAt)}</strong>
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : myReg?.isApproved ? (
                              (() => {
                                const monthStatus = getSlotMonthStatus(slot.date);
                                const now = new Date();
                                const slotD = new Date(slot.date);

                                if (monthStatus === "PAST") {
                                  return (
                                    <div className="flex flex-col gap-1 items-start">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold shadow-2xs" title="Tiết dạy đã qua tháng, đã hết hạn đánh giá">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>Hết hạn đánh giá</span>
                                      </span>
                                      <span className="text-[10px] text-slate-400 italic">
                                        Chỉ đánh giá trong tháng {now.getMonth() + 1}/{now.getFullYear()}
                                      </span>
                                    </div>
                                  );
                                }

                                if (monthStatus === "FUTURE") {
                                  return (
                                    <div className="flex flex-col gap-1 items-start">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold shadow-2xs" title="Chưa đến tháng diễn ra tiết dạy">
                                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>Chưa đến hạn</span>
                                      </span>
                                      <span className="text-[10px] text-slate-400 italic">
                                        Đánh giá vào tháng {!isNaN(slotD.getTime()) ? `${slotD.getMonth() + 1}/${slotD.getFullYear()}` : "tới"}
                                      </span>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={() => openEvalModal(myReg, slot)}
                                    className="px-4 py-2 bg-gradient-to-r from-[#008B82] to-teal-700 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-teal-900/20 transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                    <span>✍️ Nhập đánh giá</span>
                                  </button>
                                );
                              })()
                            ) : (
                              <span className="text-xs text-slate-400 italic">Chờ duyệt xong</span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="p-3.5 text-right">
                            {myReg?.evaluation ? (
                              <span className="text-xs text-emerald-700 font-extrabold flex items-center justify-end gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Hoàn thành
                              </span>
                            ) : myReg?.isApproved ? (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 inline-block shadow-2xs" title="Tiết dạy đã được duyệt, không thể tự ý hủy">
                                Đã duyệt (Không thể hủy)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCancelRegistration(myReg?.id)}
                                className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                              >
                                Hủy đăng ký
                              </button>
                            )}
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

        </div>
      )}

      {/* TAB 3: 3. KẾT QUẢ ĐÁNH GIÁ TIẾT DẠY NHẬN ĐƯỢC */}
      {activeMainTab === 'evaluations' && (
        <ReceivedEvaluationsTab
          receivedEvaluations={receivedEvaluations}
          isPreschoolEvaluations={isPreschoolEvaluations}
          openEvalModal={openEvalModal}
          getAvatarGradient={getAvatarGradient}
          RATING_COLORS={RATING_COLORS}
          currentTeacher={currentTeacher}
          setPrintModalSlot={setPrintModalSlot}
        />
      )}

      {/* TAB 4: BÁO CÁO THỐNG KÊ DỰ GIỜ & TIẾT DẠY CỦA GIÁO VIÊN */}
      {activeMainTab === 'teacher_report' && (
        <TeacherObservationReportTab
          currentTeacher={currentTeacher}
          academicYearName={activeAcademicYear?.name || "Năm học hiện tại"}
          personalSlots={personalSlots}
          myTaughtSlots={myTaughtSlots}
          myObservedSlots={myObservedSlots}
          myTaughtCount={myTaughtCount}
          myObservedCount={myObservedCount}
          taughtTarget={taughtTarget}
          obsTarget={obsTarget}
          avgScore={myReceivedEvaluationsStats?.avgScore}
          totalReceivedEvalCount={totalReceivedEvalCount}
          myPendingEvaluationsCount={myPendingEvaluationsCount}
          monthlyStatsList={teacherMonthlyStatsList}
          availableMonths={availableMonths}
          isPreschool={isMamNonTeacher}
        />
      )}

      {/* TAB 5: THEO DÕI TỔNG HỢP TỔ CHUYÊN MÔN (DÀNH CHO TTCM / TBP / ADMIN) */}
      {activeMainTab === 'ttcm_summary' && (isTTCM || isTBP || isAdminUser) && (
        <TTCMDepartmentSummaryTab
          currentTeacher={currentTeacher}
          departments={departments}
          ttcmAllowedDepartments={ttcmAllowedDepartments}
          academicYears={academicYears}
          selectedYearId={filterAcademicYearId}
          openEvalModal={openEvalModal}
          getAvatarGradient={getAvatarGradient}
          RATING_COLORS={RATING_COLORS}
          isMamNonTeacher={isMamNonTeacher}
        />
      )}

      {/* Register Details Modal */}
      {registerDetailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-[#003B3A] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-base">Xác nhận Đăng ký Dự giờ</h3>
                <p className="text-white/70 text-xs font-medium mt-0.5">Kiểm tra thông tin tiết dạy trước khi gửi đăng ký</p>
              </div>
              <button 
                onClick={() => setRegisterDetailSlot(null)} 
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="bg-teal-50/40 p-4 rounded-2xl border border-teal-100 space-y-1">
                <span className="text-[10px] font-black text-[#008B82] uppercase tracking-wider">Chủ đề bài dạy</span>
                <h4 className="text-sm font-black text-[#003B3A] leading-snug">{registerDetailSlot.topic}</h4>
                <p className="text-xs text-slate-500 font-medium">Môn: {registerDetailSlot.subjectName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Giáo viên dạy</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">{registerDetailSlot.teacher?.teacherName}</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Lớp & Phòng</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">{registerDetailSlot.className || "Lớp"} • Phòng {registerDetailSlot.room || "Phòng học"}</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Thời gian</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">
                    {registerDetailSlot.startTime} • {new Date(registerDetailSlot.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Cơ sở</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5">{registerDetailSlot.campus?.campusName || registerDetailSlot.campusName || "Sky-Line"}</span>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setRegisterDetailSlot(null)} 
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                onClick={() => handleRegister(registerDetailSlot.id)} 
                className="px-5 py-2 bg-[#008B82] hover:bg-[#007068] text-white font-bold rounded-xl transition-all text-xs shadow-md shadow-teal-800/20 cursor-pointer"
              >
                Xác nhận Đăng ký
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal (Phiếu đánh giá chuyên môn chuẩn) */}
      {evalModal && (() => {
        const isApprovedForReEval = evalModal.registration.evaluation?.reEvaluationStatus === "APPROVED";
        const isReadOnly = !!evalModal.registration.evaluation && !isApprovedForReEval;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              <div className="px-6 py-5 bg-gradient-to-r from-[#003B3A] to-[#007068] text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" /> Phiếu Đánh Giá Tiết Dự Giờ
                      </h3>
                      {isSurpriseSlot(evalModal.slot) && (
                        <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500/90 text-white border border-rose-300/40 shadow-2xs">
                          ⚡ Dự giờ đột xuất
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-white/80 text-xs mt-0.5 font-medium">
                    GV Dạy: <span className="font-bold text-white">{evalModal.slot.teacher?.teacherName}</span> • Bài dạy: <span className="font-bold text-white">{evalModal.slot.topic}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintModalSlot({ slot: evalModal.slot, registration: evalModal.registration })}
                    className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#48BFE3]" />
                    <span className="hidden sm:inline">In phiếu A4</span>
                  </button>
                  <button onClick={() => setEvalModal(null)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer">
                    <X className="w-5 h-5 text-white/80" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs font-semibold">
                {/* Re-evaluation Status Alert Banners */}
                {isApprovedForReEval && (
                  <div className="p-4 bg-emerald-50/90 rounded-2xl border border-emerald-300 flex items-start gap-3 shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-black text-emerald-950 uppercase tracking-wide">Phiếu đánh giá đã được Admin phê duyệt mở lại</h5>
                      <p className="text-xs text-emerald-800 font-medium mt-0.5">
                        Thầy/Cô có thể chỉnh sửa lại điểm các tiêu chí, nhận xét và xếp loại. Sau khi chỉnh sửa, vui lòng bấm nút "Cập nhật phiếu đánh giá" bên dưới.
                      </p>
                      {evalModal.registration.evaluation?.reEvaluationNote && (
                        <p className="text-[11px] text-emerald-900 font-bold mt-1.5 bg-white/80 p-2 rounded-xl border border-emerald-200">
                          💬 Ghi chú từ Admin: {evalModal.registration.evaluation.reEvaluationNote}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {evalModal.registration.evaluation?.reEvaluationStatus === "REQUESTED" && (
                  <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-300 flex items-start gap-3 shadow-xs">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-black text-amber-950 uppercase tracking-wide">Đang chờ Ban Quản trị / Admin xét duyệt mở lại phiếu</h5>
                      <p className="text-xs text-amber-800 font-medium mt-0.5">
                        Lý do xin mở lại: "{evalModal.registration.evaluation.reEvaluationReason}"
                      </p>
                      <p className="text-[10px] text-amber-600 font-bold mt-1">
                        Thời gian gửi: {evalModal.registration.evaluation.reEvaluationRequestedAt ? new Date(evalModal.registration.evaluation.reEvaluationRequestedAt).toLocaleString("vi-VN") : ""}
                      </p>
                    </div>
                  </div>
                )}

                {evalModal.registration.evaluation?.reEvaluationStatus === "REJECTED" && (
                  <div className="p-4 bg-rose-50/90 rounded-2xl border border-rose-300 flex items-start gap-3 shadow-xs">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-black text-rose-950 uppercase tracking-wide">Yêu cầu mở lại phiếu chưa được phê duyệt</h5>
                      {evalModal.registration.evaluation?.reEvaluationNote && (
                        <p className="text-xs text-rose-800 font-medium mt-0.5">
                          Lý do từ chối: {evalModal.registration.evaluation.reEvaluationNote}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {/* Score Summary Box */}
                {evalModal.slot.level !== "Mầm non" ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                      <span className="text-xs font-black text-teal-900 uppercase tracking-wide">Tổng điểm tự động:</span>
                      <span className="text-base font-black text-teal-950 bg-white px-4 py-1.5 rounded-xl shadow-xs border border-teal-200">
                        {evalK12Scores.reduce((a, b) => a + b, 0).toFixed(2)} / 20.00 điểm
                      </span>
                    </div>

                    {K12_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += K12_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 bg-teal-100 text-teal-800 rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h4>
                          <div className="space-y-2.5">
                            {sec.requirements.map((req, rSubIdx) => {
                              const globalIdx = reqStartIdx + rSubIdx;
                              const options = [];
                              for (let v = 0; v <= req.max; v += 0.25) {
                                options.push(Math.round(v * 100) / 100);
                              }

                              const currentScore = evalK12Scores[globalIdx] || 0;
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
                                      value={evalK12Scores[globalIdx]}
                                      onChange={(e) => {
                                        const nextScores = [...evalK12Scores];
                                        nextScores[globalIdx] = parseFloat(e.target.value);
                                        setEvalK12Scores(nextScores);
                                        const nextRank = calculateK12Ranking(nextScores);
                                        setEvalOverall(nextRank);
                                      }}
                                      disabled={isReadOnly}
                                      className="rounded-xl border border-slate-200 p-2 bg-white text-xs font-black text-slate-800 outline-none w-24 shadow-2xs disabled:opacity-75"
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
                    <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                      <span className="text-xs font-black text-amber-900 uppercase tracking-wide">Tổng điểm tự động:</span>
                      <span className="text-base font-black text-amber-950 bg-white px-4 py-1.5 rounded-xl shadow-xs border border-amber-200">
                        {evalCriteria.reduce((a, b) => a + b, 0).toFixed(2)} / 10.00 điểm
                      </span>
                    </div>

                    {MAMNON_SECTIONS.map((sec, sIdx) => {
                      let reqStartIdx = 0;
                      for (let i = 0; i < sIdx; i++) {
                        reqStartIdx += MAMNON_SECTIONS[i].requirements.length;
                      }

                      return (
                        <div key={sIdx} className="space-y-3">
                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span className="w-5 h-5 bg-amber-100 text-amber-800 rounded-md flex items-center justify-center text-xs font-black">{sIdx + 1}</span>
                            {sec.name}
                          </h4>
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
                                      value={evalCriteria[globalIdx]}
                                      onChange={(e) => {
                                        const nextCriteria = [...evalCriteria];
                                        nextCriteria[globalIdx] = parseFloat(e.target.value);
                                        setEvalCriteria(nextCriteria);
                                        const nextRank = calculateMamNonRanking(nextCriteria);
                                        setEvalOverall(nextRank);
                                      }}
                                      disabled={isReadOnly}
                                      className="rounded-xl border border-slate-200 p-2 bg-white text-xs font-black text-slate-800 outline-none w-24 shadow-2xs disabled:opacity-75"
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

                {/* Quick Comment Presets & Auto Draft Bar */}
                {!isReadOnly && (
                  <QuickCommentPresets
                    isPreschool={evalModal.slot.level === "Mầm non"}
                    onAddStrength={(text) => {
                      setEvalStrengths(prev => prev ? `${prev}\n• ${text}` : `• ${text}`);
                      handleSaveLocalDraft();
                    }}
                    onAddImprovement={(text) => {
                      setEvalImprovements(prev => prev ? `${prev}\n• ${text}` : `• ${text}`);
                      handleSaveLocalDraft();
                    }}
                    draftSavedAt={evalDraftSavedAt}
                    hasDraft={hasEvalDraft}
                    onRestoreDraft={handleRestoreDraft}
                  />
                )}

                {/* Qualitative Feedback */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">Nhận xét & Góp ý chuyên môn</h4>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Ưu điểm nổi bật của tiết dạy</label>
                    <textarea
                      placeholder="Những điểm mạnh, sáng tạo trong phương pháp và tổ chức hoạt động..."
                      rows={2}
                      value={evalStrengths}
                      onChange={e => setEvalStrengths(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-amber-900 flex items-center gap-1">
                      <span>Góp ý cải thiện / phát triển</span>
                      <span className="text-rose-600 text-xs font-black">* (Bắt buộc)</span>
                    </label>
                    <textarea
                      placeholder="Các gợi ý phương pháp, phân bổ thời gian hoặc tổ chức hoạt động tốt hơn..."
                      rows={2}
                      value={evalImprovements}
                      onChange={e => setEvalImprovements(e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full text-xs font-medium p-3 rounded-xl border focus:ring-2 outline-none resize-none disabled:opacity-75 disabled:bg-slate-100 ${
                        !evalImprovements.trim() && !isReadOnly ? "border-amber-300 focus:ring-amber-500" : "border-slate-200 focus:ring-teal-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Overall Rating & Automatic Reason in EvalModal */}
                {(() => {
                  const isMN = evalModal.slot.level === "Mầm non";
                  const rankInfo = isMN 
                    ? getMamNonRankingDetails(evalCriteria)
                    : getK12RankingDetails(evalK12Scores);
                  const currentRank = evalOverall || rankInfo.rating;

                  return (
                    <div className="flex flex-col gap-4 p-5 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200/90 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-150">
                        <div>
                          <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            Xếp loại tiết dạy tổng thể
                          </label>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Tự động xác định theo quy chuẩn đánh giá Sky-Line
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-bold text-slate-500">Kết quả:</span>
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
                          <Clock className="w-4 h-4 text-[#008B82] shrink-0" />
                          <span>
                            {evalModal.registration.evaluation?.submittedAt ? (
                              <>
                                Thời gian nộp đánh giá:{" "}
                                <strong className="text-slate-900 font-bold">
                                  {new Date(evalModal.registration.evaluation.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • {new Date(evalModal.registration.evaluation.submittedAt).toLocaleDateString("vi-VN")}
                                </strong>
                              </>
                            ) : (
                              <>
                                Thời gian thực hiện:{" "}
                                <strong className="text-slate-900 font-bold">
                                  {evalModal.slot?.date ? new Date(evalModal.slot.date).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")} ({evalModal.slot.startTime || "Tiết dạy"})
                                </strong>{" "}
                                <span className="text-amber-600 font-semibold">(Đang nhập đánh giá)</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>
                            Người đánh giá:{" "}
                            <strong className="text-slate-900 font-bold">
                              {evalModal.registration.teacher?.teacherName || currentTeacher?.teacherName}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {!isReadOnly && (
                  <div className="bg-teal-50 border border-teal-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-teal-950 mt-4">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center shrink-0 text-teal-700">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-teal-900">📧 Tự động gửi Email kết quả đánh giá</p>
                      <p className="text-[11px] text-teal-700 font-medium">Khi Thầy/Cô bấm <strong>"Lưu và hoàn thành biên bản"</strong>, hệ thống sẽ tự động gửi Email thông báo kết quả đánh giá chi tiết tới Giáo viên dạy và gửi bản sao về hòm thư của Thầy/Cô.</p>
                    </div>
                  </div>
                )}

                {/* Two-way Feedback & Acknowledgment Section */}
                {evalModal.registration.evaluation && (
                  <div className="mt-4 p-5 rounded-2xl border border-slate-200/90 transition-all bg-gradient-to-b from-slate-50/80 to-white shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-150 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-black">💬</span>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Phản hồi 2 chiều & Kế hoạch khắc phục của Giáo viên dạy
                        </h4>
                      </div>
                      {evalModal.registration.evaluation.teacherAcknowledgedAt ? (
                        <span className="px-3 py-1 text-[11px] font-black rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã tiếp thu góp ý ({new Date(evalModal.registration.evaluation.teacherAcknowledgedAt).toLocaleDateString("vi-VN")})
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-[11px] font-black rounded-xl bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Chưa xác nhận tiếp thu
                        </span>
                      )}
                    </div>

                    {/* Content for Host Teacher (Giáo viên dạy) */}
                    {evalModal.slot.teacherId === currentTeacher?.id || evalModal.slot.teacher?.id === currentTeacher?.id ? (
                      <div className="space-y-3 pt-3">
                        {!evalModal.registration.evaluation.teacherAcknowledgedAt ? (
                          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-amber-950 text-xs">
                            <p className="font-bold flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-amber-600 shrink-0" />
                              Xác nhận đã đọc biên bản & Tiếp thu ý kiến chuyên môn
                            </p>
                            <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                              Thầy/Cô vui lòng nhập ngắn gọn kế hoạch khắc phục điểm tồn tại (nếu có) hoặc ý kiến trao đổi và bấm <strong>"Xác nhận đã tiếp thu góp ý"</strong> để hoàn tất quy trình phản hồi 2 chiều.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-emerald-950 text-xs">
                            <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              Thầy/Cô đã xác nhận tiếp thu góp ý của tiết dạy này
                            </p>
                            <p className="text-[11px] text-emerald-800 mt-0.5">
                              Thời gian xác nhận: {new Date(evalModal.registration.evaluation.teacherAcknowledgedAt).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-700">
                            Kế hoạch khắc phục / Ý kiến phản hồi của Thầy/Cô:
                          </label>
                          <textarea
                            rows={3}
                            value={teacherFeedbackText}
                            onChange={(e) => setTeacherFeedbackText(e.target.value)}
                            placeholder="Nhập kế hoạch điều chỉnh phương pháp, quản lý thời gian hoặc ý kiến chuyên môn phản hồi lại người dự giờ..."
                            className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none resize-none bg-white text-slate-800"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            disabled={teacherFeedbackSubmitting}
                            onClick={handleAcknowledgeAndFeedback}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs shadow-md shadow-emerald-900/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
                          >
                            <CheckCheck className="w-4 h-4 text-emerald-200" />
                            {teacherFeedbackSubmitting ? "Đang xử lý..." : evalModal.registration.evaluation.teacherAcknowledgedAt ? "Cập nhật phản hồi" : "✅ Xác nhận Đã Tiếp Thu Góp Ý & Gửi Phản Hồi"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Content for Observer / TTCM / Ban DHCM / Admin */
                      <div className="pt-3 text-xs">
                        {evalModal.registration.evaluation.teacherAcknowledgedAt ? (
                          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                              <span>👨‍🏫 Phản hồi từ Giáo viên dạy ({evalModal.slot.teacher?.teacherName}):</span>
                              <span className="text-slate-500 font-medium">
                                {new Date(evalModal.registration.evaluation.teacherAcknowledgedAt).toLocaleString("vi-VN")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed italic bg-white p-2.5 rounded-lg border border-emerald-100 whitespace-pre-line">
                              "{evalModal.registration.evaluation.teacherFeedback || "Đã tiếp thu toàn bộ góp ý chuyên môn."}"
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs italic flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>Giáo viên dạy chưa gửi phản hồi xác nhận tiếp thu biên bản này.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between gap-3 shrink-0">
                <div>
                  {isReadOnly && evalModal.registration.teacherId === currentTeacher?.id && (
                    <>
                      {evalModal.registration.evaluation?.reEvaluationStatus === "REQUESTED" ? (
                        <span className="px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black inline-flex items-center gap-1.5">
                          ⏳ Đang chờ BGH/Admin xét duyệt
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReEvalModal(evalModal);
                            setReEvalReason("");
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Yêu cầu đánh giá lại</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEvalModal(null)}
                    className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={handleSubmitEval}
                      disabled={evalSubmitting}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#008B82] to-[#006059] hover:from-[#007068] hover:to-[#004f4a] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl transition-all shadow-md text-xs cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-teal-200" />
                      {evalSubmitting ? "Đang lưu..." : isApprovedForReEval ? "💾 Lưu & Cập nhật biên bản" : "💾 Lưu và hoàn thành biên bản"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* TAB 5: 5. XÉT DUYỆT ĐÁNH GIÁ LẠI (ADMIN / BGH / QUẢN LÝ) */}
      {/* ======================================================== */}
      {activeMainTab === "re_evaluations" && isAdminUser && (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
          {/* Header & Filter Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col gap-5 border-t-4 border-t-rose-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-rose-600" />
                  DANH SÁCH YÊU CẦU XÉT DUYỆT MỞ LẠI PHIẾU ĐÁNH GIÁ
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Tiếp nhận thông tin yêu cầu từ GVBM, phê duyệt mở lại phiếu và hệ thống tự động gửi Email thông báo tới GVBM.
                </p>
              </div>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "ALL", label: "Tất cả", count: allReEvalRequests.length, color: "bg-slate-100 text-slate-700 border-slate-200" },
                  { id: "REQUESTED", label: "Chờ xét duyệt", count: allReEvalRequests.filter(r => r.evaluation.reEvaluationStatus === "REQUESTED").length, color: "bg-amber-50 text-amber-800 border-amber-300" },
                  { id: "APPROVED", label: "Đã phê duyệt", count: allReEvalRequests.filter(r => r.evaluation.reEvaluationStatus === "APPROVED").length, color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
                  { id: "REJECTED", label: "Đã từ chối", count: allReEvalRequests.filter(r => r.evaluation.reEvaluationStatus === "REJECTED").length, color: "bg-rose-50 text-rose-800 border-rose-300" },
                  { id: "COMPLETED", label: "Đã nộp lại", count: allReEvalRequests.filter(r => r.evaluation.reEvaluationStatus === "COMPLETED").length, color: "bg-teal-50 text-teal-800 border-teal-300" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReEvalFilterStatus(item.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer ${
                      reEvalFilterStatus === item.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : `${item.color} hover:bg-slate-200/70`
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-bold ${
                      reEvalFilterStatus === item.id ? "bg-white/20 text-white" : "bg-white text-slate-800"
                    }`}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm theo tên GVBM, GV Dạy, Môn học, Lớp, Tiết dạy..."
                value={reEvalSearchQuery}
                onChange={(e) => setReEvalSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white outline-none"
              />
              {reEvalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setReEvalSearchQuery("")}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          </div>

          {/* Stat Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số yêu cầu</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{allReEvalRequests.length}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Chờ xét duyệt</p>
                <p className="text-2xl font-black text-amber-950 mt-1">{pendingReEvalCount}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-200/80 flex items-center justify-center text-amber-800">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Đã phê duyệt</p>
                <p className="text-2xl font-black text-emerald-950 mt-1">
                  {allReEvalRequests.filter(r => r.evaluation.reEvaluationStatus === "APPROVED").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-200/80 flex items-center justify-center text-emerald-800">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-rose-50 to-red-50 rounded-3xl border border-rose-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black text-rose-800 uppercase tracking-wider">Đã từ chối</p>
                <p className="text-2xl font-black text-rose-950 mt-1">
                  {allReEvalRequests.filter(r => r.evaluation.reEvaluationStatus === "REJECTED").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-200/80 flex items-center justify-center text-rose-800">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Table List of Requests */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {filteredReEvalRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <RotateCcw className="w-12 h-12 mx-auto text-slate-300 mb-3 opacity-60" />
                <p className="font-bold text-sm text-slate-600">Không có yêu cầu đánh giá lại nào</p>
                <p className="text-xs text-slate-400 mt-1">Hiện không có yêu cầu nào phù hợp với bộ lọc hiện tại</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider">
                      <th className="p-4">STT</th>
                      <th className="p-4">GVBM Đánh giá</th>
                      <th className="p-4">Tiết dạy & GV Dạy</th>
                      <th className="p-4">Thời gian dạy</th>
                      <th className="p-4">Điểm / Xếp loại cũ</th>
                      <th className="p-4">Lý do xin mở lại</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredReEvalRequests.map((req, idx) => {
                      const status = req.evaluation.reEvaluationStatus;
                      const statusMap: Record<string, { label: string; bg: string }> = {
                        REQUESTED: { label: "Chờ xét duyệt", bg: "bg-amber-100 text-amber-900 border-amber-300" },
                        APPROVED: { label: "Đã phê duyệt", bg: "bg-emerald-100 text-emerald-900 border-emerald-300" },
                        REJECTED: { label: "Đã từ chối", bg: "bg-rose-100 text-rose-900 border-rose-300" },
                        COMPLETED: { label: "Đã nộp lại", bg: "bg-teal-100 text-teal-900 border-teal-300" }
                      };
                      const statusBadge = (status && statusMap[status]) ? statusMap[status] : { label: status || "Chưa rõ", bg: "bg-slate-100 text-slate-700 border-slate-200" };

                      return (
                        <tr key={req.evaluation.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 text-slate-400 font-bold">{idx + 1}</td>

                          {/* GVBM Đánh giá */}
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{req.evaluator?.teacherName || "Chưa rõ"}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{req.evaluator?.email || ""}</div>
                            {req.evaluator?.departmentRel?.name && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                                {req.evaluator.departmentRel.name}
                              </span>
                            )}
                          </td>

                          {/* Tiết dạy & GV Dạy */}
                          <td className="p-4">
                            <div className="font-extrabold text-slate-900 text-xs">{req.slot?.topic}</div>
                            <div className="text-[11px] text-teal-800 font-bold mt-0.5">
                              GV Dạy: {req.hostTeacher?.teacherName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Lớp: {req.slot?.className || req.slot?.grade} • Môn: {req.slot?.subjectName}
                            </div>
                          </td>

                          {/* Thời gian dạy */}
                          <td className="p-4">
                            <div className="font-bold text-slate-800">
                              {new Date(req.slot.date).toLocaleDateString("vi-VN")}
                            </div>
                            <div className="text-[11px] text-slate-500 font-semibold">
                              {req.slot.startTime} {req.slot.endTime ? "- " + req.slot.endTime : ""}
                            </div>
                          </td>

                          {/* Điểm / Xếp loại cũ */}
                          <td className="p-4">
                            <div className="font-black text-slate-900">
                              {req.evaluation.totalScore ? req.evaluation.totalScore + " điểm" : "—"}
                            </div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-200/80 text-slate-800 rounded-md text-[10px] font-black">
                              {req.evaluation.overallRating || "Chưa xếp loại"}
                            </span>
                          </td>

                          {/* Lý do xin mở lại */}
                          <td className="p-4 max-w-xs">
                            <p className="text-xs text-slate-800 font-semibold line-clamp-2" title={req.evaluation.reEvaluationReason}>
                              "{req.evaluation.reEvaluationReason || "—"}"
                            </p>
                            <span className="text-[10px] text-slate-400 font-bold block mt-1">
                              Gửi: {req.evaluation.reEvaluationRequestedAt ? new Date(req.evaluation.reEvaluationRequestedAt).toLocaleString("vi-VN") : ""}
                            </span>
                            {req.evaluation.reEvaluationNote && (
                              <p className="text-[10px] text-emerald-800 font-bold mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 line-clamp-1" title={req.evaluation.reEvaluationNote}>
                                Admin: {req.evaluation.reEvaluationNote}
                              </p>
                            )}
                          </td>

                          {/* Trạng thái */}
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border inline-block ${statusBadge.bg}`}>
                              {statusBadge.label}
                            </span>
                          </td>

                          {/* Thao tác */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {status === "REQUESTED" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdminReEvalModal({ request: req, action: "approve" });
                                      setAdminReEvalNote("");
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Đồng ý</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdminReEvalModal({ request: req, action: "reject" });
                                      setAdminReEvalNote("");
                                    }}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Từ chối</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminReEvalModal({ request: req, action: "approve" });
                                    setAdminReEvalNote(req.evaluation.reEvaluationNote || "");
                                  }}
                                  className="px-3 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                                >
                                  Cập nhật duyệt
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEvalModal(req.registration, req.slot)}
                                className="px-2.5 py-1 text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                              >
                                Xem phiếu
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: GVBM YÊU CẦU ĐÁNH GIÁ LẠI */}
      {/* ======================================================== */}
      {reEvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" /> GỬI YÊU CẦU ĐÁNH GIÁ LẠI
                </h3>
                <p className="text-white/80 text-xs mt-0.5 font-medium">
                  Tiết dạy: {reEvalModal.slot?.topic} • GV Dạy: {reEvalModal.slot?.teacher?.teacherName}
                </p>
              </div>
              <button
                onClick={() => setReEvalModal(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-medium leading-relaxed">
                ℹ️ Sau khi Thầy/Cô gửi yêu cầu, Ban Quản trị / Admin sẽ tiến hành xét duyệt. Khi được phê duyệt mở lại, hệ thống sẽ tự động gửi Email thông báo và mở khóa để Thầy/Cô cập nhật lại phiếu đánh giá.
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                  Lý do xin đánh giá lại <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Ví dụ: Cần điều chỉnh lại điểm tiêu chí phương pháp, bổ sung góp ý chi tiết cho giáo viên dạy..."
                  value={reEvalReason}
                  onChange={(e) => setReEvalReason(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReEvalModal(null)}
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRequestReEval}
                disabled={reEvalSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:bg-slate-200 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {reEvalSubmitting ? "Đang gửi..." : "Gửi yêu cầu xét duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADMIN PHÊ DUYỆT / TỪ CHỐI ĐÁNH GIÁ LẠI */}
      {/* ======================================================== */}
      {adminReEvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className={`px-6 py-5 text-white flex items-center justify-between ${
              adminReEvalModal.action === "approve"
                ? "bg-gradient-to-r from-[#003B3A] to-[#008B82]"
                : "bg-gradient-to-r from-rose-700 to-red-600"
            }`}>
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  {adminReEvalModal.action === "approve" ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> PHÊ DUYỆT MỞ LẠI PHIẾU ĐÁNH GIÁ
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" /> TỪ CHỐI YÊU CẦU ĐÁNH GIÁ LẠI
                    </>
                  )}
                </h3>
                <p className="text-white/80 text-xs mt-0.5 font-medium">
                  GVBM: {adminReEvalModal.request.evaluator?.teacherName} • Tiết dạy: {adminReEvalModal.request.slot?.topic}
                </p>
              </div>
              <button
                onClick={() => setAdminReEvalModal(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Giáo viên dạy:</span>
                  <span className="font-bold text-slate-900">{adminReEvalModal.request.hostTeacher?.teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Lớp & Ngày dạy:</span>
                  <span className="font-bold text-slate-900">
                    {adminReEvalModal.request.slot?.className || adminReEvalModal.request.slot?.grade} • {new Date(adminReEvalModal.request.slot?.date).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Lý do GVBM xin mở lại:</span>
                  <span className="font-bold text-teal-800 text-right max-w-[260px]">{adminReEvalModal.request.evaluation?.reEvaluationReason}</span>
                </div>
              </div>

              {adminReEvalModal.action === "approve" ? (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs leading-relaxed font-medium">
                  📧 Khi bấm xác nhận, hệ thống sẽ <strong>mở khóa phiếu đánh giá</strong> cho GVBM và <strong>tự động gửi Email thông báo</strong> tới hòm thư của GVBM ({adminReEvalModal.request.evaluator?.email || "Email GVBM"}).
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 text-xs leading-relaxed font-medium">
                  ⚠️ Thầy/Cô vui lòng nhập lý do từ chối để hệ thống gửi Email phản hồi đến GVBM.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                  {adminReEvalModal.action === "approve" ? "Ghi chú / Lưu ý từ Admin (Tùy chọn)" : "Lý do từ chối *"}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    adminReEvalModal.action === "approve"
                      ? "Ví dụ: Đã đồng ý mở lại phiếu. Thầy/Cô vui lòng cập nhật lại trước ngày..."
                      : "Ví dụ: Phiếu đánh giá đã được tổng hợp báo cáo kỳ, không thể chỉnh sửa..."
                  }
                  value={adminReEvalNote}
                  onChange={(e) => setAdminReEvalNote(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdminReEvalModal(null)}
                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={adminReEvalModal.action === "approve" ? handleApproveReEval : handleRejectReEval}
                disabled={adminReEvalSubmitting}
                className={`px-6 py-2 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  adminReEvalModal.action === "approve"
                    ? "bg-[#008B82] hover:bg-[#007068] disabled:bg-slate-200"
                    : "bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200"
                }`}
              >
                {adminReEvalSubmitting
                  ? "Đang xử lý..."
                  : adminReEvalModal.action === "approve"
                  ? "✅ Đồng ý & Gửi Email"
                  : "❌ Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: IN PHIẾU ĐÁNH GIÁ DỰ GIỜ A4 CHUẨN SKY-LINE */}
      {/* ======================================================== */}
      {printModalSlot && (
        <PrintObservationEvaluationModal
          slot={printModalSlot.slot}
          registration={printModalSlot.registration}
          onClose={() => setPrintModalSlot(null)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 4: TẠO TIẾT DẠY / XIN DỰ GIỜ / DỰ GIỜ ĐỘT XUẤT */}
      {/* ======================================================== */}
      <CreateObservationModal
        isOpen={showCreateModal}
        showCreateModal={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        creationMode={creationMode}
        setCreationMode={setCreationMode}
        isMamNonTeacher={isMamNonTeacher}
        isAdminUser={isAdminUser}
        isTTCM={isTTCM}
        canCreateSurprise={canCreateSurprise}
        currentTeacher={currentTeacher}
        monthlyLimitCount={monthlyLimitCount}
        myTaughtCount={myTaughtCount}
        myObservedCount={myObservedCount}
        myReceivedEvaluationsStats={myReceivedEvaluationsStats}
        onViewAllSchedule={() => {
          setShowCreateModal(false);
          setActiveMainTab("my_schedule");
          setMyScheduleSubTab("all");
        }}
        onViewTaught={() => {
          setShowCreateModal(false);
          setActiveMainTab("my_schedule");
          setMyScheduleSubTab("taught");
        }}
        onViewObserved={() => {
          setShowCreateModal(false);
          setActiveMainTab("my_schedule");
          setMyScheduleSubTab("observed");
        }}
        onViewEvaluations={() => {
          setShowCreateModal(false);
          setActiveMainTab("evaluations");
        }}
        upcomingSlots={upcomingSlots}
        onResetForm={() => {
          setNewTopic("");
          setNewDescription("");
          setNewNotes("");
          setNewLessonPlanName("");
          setNewLessonPlanData("");
          if (fileInputRef.current) fileInputRef.current.value = "";
          showToast("Đã làm mới biểu mẫu đăng ký!", "info");
        }}
        onSaveDraft={() => {
          showToast("Bản nháp thông tin tiết dạy đã được lưu tạm!", "success");
        }}
        editSlotId={editSlotId}
        surpriseDeptId={surpriseDeptId}
        setSurpriseDeptId={setSurpriseDeptId}
        surpriseTeacherId={surpriseTeacherId}
        setSurpriseTeacherId={setSurpriseTeacherId}
        surpriseCampusId={surpriseCampusId}
        setSurpriseCampusId={setSurpriseCampusId}
        surpriseClassId={surpriseClassId}
        setSurpriseClassId={setSurpriseClassId}
        surpriseClassName={surpriseClassName}
        setSurpriseClassName={setSurpriseClassName}
        surpriseSubjectId={surpriseSubjectId}
        setSurpriseSubjectId={setSurpriseSubjectId}
        surpriseSubjectName={surpriseSubjectName}
        setSurpriseSubjectName={setSurpriseSubjectName}
        surpriseLevel={surpriseLevel}
        setSurpriseLevel={setSurpriseLevel}
        surpriseGrade={surpriseGrade}
        setSurpriseGrade={setSurpriseGrade}
        surpriseTopic={surpriseTopic}
        setSurpriseTopic={setSurpriseTopic}
        surpriseDate={surpriseDate}
        setSurpriseDate={setSurpriseDate}
        surprisePeriod={surprisePeriod}
        setSurprisePeriod={setSurprisePeriod}
        surpriseRoom={surpriseRoom}
        setSurpriseRoom={setSurpriseRoom}
        surpriseScoresK12={surpriseScoresK12}
        surpriseScoresMN={surpriseScoresMN}
        surpriseStrengths={surpriseStrengths}
        setSurpriseStrengths={setSurpriseStrengths}
        surpriseImprovements={surpriseImprovements}
        setSurpriseImprovements={setSurpriseImprovements}
        surpriseGeneral={surpriseGeneral}
        setSurpriseGeneral={setSurpriseGeneral}
        surpriseOverall={surpriseOverall}
        setSurpriseOverall={setSurpriseOverall}
        surpriseSubmitting={surpriseSubmitting}
        handleSurpriseSubmit={handleSurpriseSubmit}
        ttcmAllowedDepartments={ttcmAllowedDepartments}
        filteredTeachersForSurprise={filteredTeachersForSurprise}
        filteredClassesForSurprise={filteredClassesForSurprise}
        reqCampusId={reqCampusId}
        setReqCampusId={setReqCampusId}
        reqDeptId={reqDeptId}
        setReqDeptId={setReqDeptId}
        reqTeacherId={reqTeacherId}
        setReqTeacherId={setReqTeacherId}
        reqSubjectId={reqSubjectId}
        setReqSubjectId={setReqSubjectId}
        reqLevel={reqLevel}
        setReqLevel={setReqLevel}
        reqGrade={reqGrade}
        setReqGrade={setReqGrade}
        reqClassId={reqClassId}
        setReqClassId={setReqClassId}
        reqDate={reqDate}
        setReqDate={setReqDate}
        reqPeriod={reqPeriod}
        setReqPeriod={setReqPeriod}
        reqTopic={reqTopic}
        setReqTopic={setReqTopic}
        reqNotes={reqNotes}
        setReqNotes={setReqNotes}
        handleRequestSubmit={handleRequestSubmit}
        isSubmittingRequest={submitting}
        filteredTeachersForRequest={filteredTeachersForRequest}
        filteredReqClasses={filteredReqClasses}
        openDeptId={newTargetDeptId}
        setOpenDeptId={setNewTargetDeptId}
        openSubjectId={newSubjectId}
        setOpenSubjectId={setNewSubjectId}
        openSubjectName={newSubjectName}
        setOpenSubjectName={setNewSubjectName}
        openCampusId={newCampusId}
        setOpenCampusId={setNewCampusId}
        openClassId={newClassId}
        setOpenClassId={setNewClassId}
        openClassName={newClassNameText}
        setOpenClassName={setNewClassNameText}
        openLevel={newLevel}
        setOpenLevel={setNewLevel}
        openGrade={newGrade}
        setOpenGrade={setNewGrade}
        openTopic={newTopic}
        setOpenTopic={setNewTopic}
        openDate={newDate}
        setOpenDate={setNewDate}
        openPeriod={newStartTime}
        setOpenPeriod={setNewStartTime}
        openRoom={newClassNameText}
        setOpenRoom={setNewClassNameText}
        openMaxSeats={4}
        setOpenMaxSeats={() => {}}
        openLessonPlanUrl={newLessonPlanData}
        setOpenLessonPlanUrl={setNewLessonPlanData}
        openLessonPlanFile={null}
        setOpenLessonPlanFile={() => {}}
        openNotes={newDescription}
        setOpenNotes={setNewDescription}
        sendEmailNotif={sendEmailNotif}
        setSendEmailNotif={setSendEmailNotif}
        selectedEmailTeacherIds={selectedEmailTeacherIds}
        setSelectedEmailTeacherIds={setSelectedEmailTeacherIds}
        myDeptTeachers={myDeptTeachers}
        isSubmittingOpen={submitting}
        handleOpenSlotSubmit={handleCreateSubmit}
        newCampusId={newCampusId}
        setNewCampusId={setNewCampusId}
        newDeptId={newTargetDeptId}
        setNewDeptId={setNewTargetDeptId}
        newSubjectId={newSubjectId}
        setNewSubjectId={setNewSubjectId}
        newLevel={newLevel}
        setNewLevel={setNewLevel}
        newGrade={newGrade}
        setNewGrade={setNewGrade}
        newClassId={newClassId}
        setNewClassId={setNewClassId}
        newDate={newDate}
        setNewDate={setNewDate}
        newStartTime={newStartTime}
        setNewStartTime={setNewStartTime}
        newEndTime={newEndTime}
        setNewEndTime={setNewEndTime}
        newIsDoublePeriod={newIsDoublePeriod}
        setNewIsDoublePeriod={setNewIsDoublePeriod}
        newTopic={newTopic}
        setNewTopic={setNewTopic}
        newChuDe={newChuDe}
        setNewChuDe={setNewChuDe}
        newHoatDong={newHoatDong}
        setNewHoatDong={setNewHoatDong}
        newDeTai={newDeTai}
        setNewDeTai={setNewDeTai}
        newLessonPlanName={newLessonPlanName}
        setNewLessonPlanName={setNewLessonPlanName}
        newLessonPlanData={newLessonPlanData}
        setNewLessonPlanData={setNewLessonPlanData}
        fileInputRef={fileInputRef}
        handleCreateSubmit={handleCreateSubmit}
        handleStartTimeChange={handleStartTimeChange}
        handleDoublePeriodChange={handleDoublePeriodChange}
        handleFileChange={handleFileChange}
        filteredClassesForCreation={filteredClassesForCreation}
        submitting={submitting}
        minAllowedDate={minAllowedDate}
        subjects={subjects}
        departments={departments}
        teachers={teachers}
        campuses={campuses}
        classes={classes}
        periodOptions={periodOptions}
        getGradesForLevel={getGradesForLevel}
        getKhacChuyenDeSubjectId={getKhacChuyenDeSubjectId}
        isPreschoolDepartment={isPreschoolDepartment}
        k12Labels={k12Labels}
        maxScoresK12={maxScoresK12}
        getK12RankingDetails={getK12RankingDetails}
        getMamNonRankingDetails={getMamNonRankingDetails}
      />

    </div>
  );
}
