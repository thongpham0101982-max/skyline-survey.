"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Target,
  Award,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  RefreshCw,
  Lightbulb,
  ThumbsUp,
  UserCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import { getTTCMDepartmentOverview } from "../actions";

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
  "T2: Phương pháp tổ chức hoạt động giáo dục tích cực",
  "T3: Sử dụng học liệu, đồ chơi trực quan sinh động",
  "T4: Đảm bảo an toàn, chăm sóc chu đáo trẻ",
  "T5: Không khí tiết học vui tươi, kích thích tương tác"
];

const isSurpriseSlot = (slot: any) => {
  if (!slot) return false;
  return (
    slot.requestOrigin === "SURPRISE" ||
    (typeof slot.description === "string" &&
      (slot.description.includes("[SURPRISE]") ||
        slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
    (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
  );
};

interface TTCMDepartmentSummaryTabProps {
  currentTeacher: any;
  departments: any[];
  ttcmAllowedDepartments: any[];
  academicYears?: { id: string; name: string; status: string }[];
  selectedYearId?: string;
  openEvalModal: (registration: any, slot: any) => void;
  getAvatarGradient: (name: string) => string;
  RATING_COLORS: Record<string, string>;
  isMamNonTeacher?: boolean;
}

export function TTCMDepartmentSummaryTab({
  currentTeacher,
  departments,
  ttcmAllowedDepartments,
  academicYears,
  selectedYearId,
  openEvalModal,
  getAvatarGradient,
  RATING_COLORS,
  isMamNonTeacher = false
}: TTCMDepartmentSummaryTabProps) {
  // Department selection state
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
    if (currentTeacher?.departmentId && ttcmAllowedDepartments.some(d => d.id === currentTeacher.departmentId)) {
      return currentTeacher.departmentId;
    }
    return ttcmAllowedDepartments[0]?.id || currentTeacher?.departmentId || "";
  });

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<"ALL" | "PLAN" | "SURPRISE">("ALL");
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "competency" | "warnings" | "ratings" | "feedback"
  >("overview");
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("");
  const [filterProgressStatus, setFilterProgressStatus] = useState<"ALL" | "MET" | "UNMET">("ALL");

  // Selected teacher detail modal state
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<any | null>(null);

  // Data fetching state
  const [loading, setLoading] = useState(false);
  const [departmentData, setDepartmentData] = useState<{
    department: any;
    teachers: any[];
    slots: any[];
  }>({
    department: null,
    teachers: [],
    slots: []
  });

  // Fetch department data from server
  const fetchDeptData = async (deptId: string) => {
    if (!deptId) return;
    setLoading(true);
    try {
      const res = await getTTCMDepartmentOverview({
        departmentId: deptId,
        academicYearId: selectedYearId
      });
      if (res.success) {
        setDepartmentData({
          department: res.department,
          teachers: res.teachers || [],
          slots: res.slots || []
        });
      }
    } catch (e) {
      console.error("Error fetching TTCM department overview:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDeptId) {
      fetchDeptData(selectedDeptId);
    }
  }, [selectedDeptId, selectedYearId]);

  const { department, teachers, slots } = departmentData;

  const isPreschool = useMemo(() => {
    if (department?.blockCM === "Mầm Non" || department?.name?.toLowerCase().includes("mầm non")) return true;
    if (isMamNonTeacher) return true;
    return false;
  }, [department, isMamNonTeacher]);

  // Extract available months dynamically from academic year and existing slots
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const defaultMonths = [
      "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
      "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"
    ];
    defaultMonths.forEach(m => monthsSet.add(m));

    slots.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          monthsSet.add(`${y}-${m}`);
        }
      }
    });

    return Array.from(monthsSet).sort().map(k => {
      const [y, m] = k.split("-");
      return { key: k, label: `Tháng ${m}/${y}` };
    });
  }, [slots]);

  // Filter slots by origin and local month
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      if (originFilter !== "ALL") {
        const isSurprise = isSurpriseSlot(slot);
        if (originFilter === "SURPRISE" && !isSurprise) return false;
        if (originFilter === "PLAN" && isSurprise) return false;
      }
      if (selectedMonth !== "all" && slot.date) {
        const d = new Date(slot.date);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          if (`${y}-${m}` !== selectedMonth) return false;
        }
      }
      return true;
    });
  }, [slots, originFilter, selectedMonth]);

  // Set of teacher IDs in this department
  const deptTeacherIdSet = useMemo(() => {
    return new Set(teachers.map(t => t.id));
  }, [teachers]);

  // Teacher statistics: taught & observed
  const teacherStats = useMemo(() => {
    const map: Record<
      string,
      {
        taughtCount: number;
        taughtPlanCount: number;
        taughtSurpriseCount: number;
        observedCount: number;
        observedPlanCount: number;
        observedSurpriseCount: number;
        taughtSlots: any[];
        observedSlots: any[];
        scores: number[];
        avgScore: number | null;
        ratings: Record<string, number>;
      }
    > = {};

    teachers.forEach(t => {
      map[t.id] = {
        taughtCount: 0,
        taughtPlanCount: 0,
        taughtSurpriseCount: 0,
        observedCount: 0,
        observedPlanCount: 0,
        observedSurpriseCount: 0,
        taughtSlots: [],
        observedSlots: [],
        scores: [],
        avgScore: null,
        ratings: {}
      };
    });

    filteredSlots.forEach(slot => {
      const isSurprise = isSurpriseSlot(slot);
      const inc = slot.isDoublePeriod ? 2 : 1;

      // Check host teacher (tiết dạy: yêu cầu lấy các tiết dạy CÓ PHIẾU ĐÁNH GIÁ)
      if (map[slot.teacherId]) {
        const hasEval = slot.registrations?.some(
          (r: any) => r.evaluation !== null && r.evaluation?.reEvaluationStatus !== "DRAFT"
        );
        
        if (hasEval) {
          map[slot.teacherId].taughtCount += inc;
          if (isSurprise) map[slot.teacherId].taughtSurpriseCount += inc;
          else map[slot.teacherId].taughtPlanCount += inc;
          map[slot.teacherId].taughtSlots.push(slot);

          slot.registrations?.forEach((r: any) => {
            if (r.evaluation && r.evaluation.reEvaluationStatus !== "DRAFT") {
              if (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined) {
                map[slot.teacherId].scores.push(r.evaluation.totalScore);
              }
              const rating = r.evaluation.overallRating || "Đạt";
              map[slot.teacherId].ratings[rating] = (map[slot.teacherId].ratings[rating] || 0) + 1;
            }
          });
        }
      }

      // Check observers (tiết dự: yêu cầu PHẢI HOÀN THÀNH ĐÁNH GIÁ)
      slot.registrations?.forEach((r: any) => {
        const hasCompletedEval = r.isApproved && r.evaluation !== null && r.evaluation?.reEvaluationStatus !== "DRAFT";
        if (map[r.teacherId] && hasCompletedEval) {
          map[r.teacherId].observedCount += inc;
          if (isSurprise) map[r.teacherId].observedSurpriseCount += inc;
          else map[r.teacherId].observedPlanCount += inc;
          map[r.teacherId].observedSlots.push({ slot, registration: r });
        }
      });
    });

    Object.values(map).forEach(s => {
      if (s.scores.length > 0) {
        s.avgScore = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
      }
    });

    return map;
  }, [teachers, filteredSlots]);

  // Overall Department KPIs
  const departmentKPIs = useMemo(() => {
    let totalTaught = 0;
    let totalObserved = 0;
    let requiredTaughtTotal = 0;
    let requiredObservedTotal = 0;
    let totalEvals = 0;
    let passingEvals = 0;
    const allScores: number[] = [];
    const ratingDistribution: Record<string, number> = {
      "Tốt": 0,
      "Khá": 0,
      "Đạt": 0,
      "Chưa đạt": 0
    };

    teachers.forEach(t => {
      const stats = teacherStats[t.id];
      if (stats) {
        totalTaught += stats.taughtCount;
        totalObserved += stats.observedCount;
      }
      requiredTaughtTotal += t.requiredTaught || 0;
      requiredObservedTotal += t.requiredObserved || 0;
    });

    filteredSlots.forEach(slot => {
      if (!deptTeacherIdSet.has(slot.teacherId)) return;
      slot.registrations?.forEach((r: any) => {
        if (r.evaluation && r.evaluation.reEvaluationStatus !== "DRAFT") {
          totalEvals++;
          const score = r.evaluation.totalScore;
          if (score !== null && score !== undefined) {
            allScores.push(score);
          }

          const rawRating = (r.evaluation.overallRating || "").trim();
          let normalizedRating = "Đạt";
          if (["Tốt", "Giỏi", "Xuất sắc"].includes(rawRating)) normalizedRating = "Tốt";
          else if (["Khá"].includes(rawRating)) normalizedRating = "Khá";
          else if (["Đạt", "Trung bình"].includes(rawRating)) normalizedRating = "Đạt";
          else if (["Chưa đạt", "Yếu", "Kém"].includes(rawRating)) normalizedRating = "Chưa đạt";

          ratingDistribution[normalizedRating] = (ratingDistribution[normalizedRating] || 0) + 1;

          const passed = !isPreschool
            ? (score !== null && score !== undefined ? score >= 14 : ["Tốt", "Khá"].includes(normalizedRating))
            : ["Tốt", "Khá", "Đạt"].includes(normalizedRating);

          if (passed) passingEvals++;
        }
      });
    });

    const avgScore = allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

    const passRate = totalEvals > 0 ? Math.round((passingEvals / totalEvals) * 100) : 100;
    const taughtRate = requiredTaughtTotal > 0 ? Math.round((totalTaught / requiredTaughtTotal) * 100) : 100;
    const observedRate = requiredObservedTotal > 0 ? Math.round((totalObserved / requiredObservedTotal) * 100) : 100;

    return {
      totalTaught,
      requiredTaughtTotal,
      taughtRate,
      totalObserved,
      requiredObservedTotal,
      observedRate,
      totalEvals,
      passingEvals,
      passRate,
      avgScore,
      ratingDistribution
    };
  }, [teachers, teacherStats, filteredSlots, deptTeacherIdSet, isPreschool]);

  // All non-draft completed evaluations for the department (for radar chart, warnings & comments)
  const departmentEvaluations = useMemo(() => {
    const list: any[] = [];
    filteredSlots.forEach(slot => {
      if (deptTeacherIdSet.has(slot.teacherId)) {
        slot.registrations?.forEach((reg: any) => {
          if (reg.evaluation && reg.evaluation.reEvaluationStatus !== "DRAFT") {
            list.push({
              slot,
              registration: reg,
              evaluation: reg.evaluation,
              hostTeacher: slot.teacher,
              observerTeacher: reg.teacher
            });
          }
        });
      }
    });
    return list.sort((a, b) => new Date(b.slot.date).getTime() - new Date(a.slot.date).getTime());
  }, [filteredSlots, deptTeacherIdSet]);

  // Competency Analysis & Radar Chart Calculation
  const departmentCompetency = useMemo(() => {
    const evalCount = departmentEvaluations.length;
    const labels = isPreschool ? preschoolLabels : k12Labels;
    const maxVals = isPreschool ? [4, 4, 4, 4, 4] : maxScoresK12;
    const criteriaCount = labels.length;

    const criteriaStats: {
      id: string;
      code: string;
      label: string;
      avgScore: number;
      maxScore: number;
      pct: number;
      lowCount: number;
      lowPct: number;
      standardId?: number;
    }[] = [];

    let totalScoreSum = 0;
    let totalMaxPossible = 0;

    for (let i = 1; i <= criteriaCount; i++) {
      const code = (isPreschool ? "T" : "Y") + i;
      const scoreKey = isPreschool ? "criterion" + i : "score" + i;
      const maxScore = maxVals[i - 1];

      let sum = 0;
      let lowCount = 0;

      if (evalCount > 0) {
        departmentEvaluations.forEach(item => {
          const val = Number(item.evaluation?.[scoreKey] || 0);
          sum += val;
          const isLow = isPreschool ? val <= 2 : val < maxScore * 0.70;
          if (isLow) lowCount++;
        });
      }

      const avgScore = evalCount > 0 ? sum / evalCount : (maxScore * 0.88);
      const pct = Math.round((avgScore / maxScore) * 100);
      const lowPct = evalCount > 0 ? Math.round((lowCount / evalCount) * 100) : 0;

      totalScoreSum += avgScore;
      totalMaxPossible += maxScore;

      const standardId = !isPreschool
        ? (i <= 2 ? 1 : i <= 5 ? 2 : i <= 9 ? 3 : 4)
        : 1;

      criteriaStats.push({
        id: code,
        code,
        label: labels[i - 1],
        avgScore,
        maxScore,
        pct,
        lowCount,
        lowPct,
        standardId
      });
    }

    const overallPct = totalMaxPossible > 0 ? Math.round((totalScoreSum / totalMaxPossible) * 100) : 88;

    return {
      criteriaStats,
      overallPct,
      totalScoreSum,
      totalMaxPossible,
      evalCount
    };
  }, [departmentEvaluations, isPreschool]);

  // WARNING SYSTEM: Criteria frequency analysis by Department & by Teacher
  const warningAnalytics = useMemo(() => {
    const { criteriaStats } = departmentCompetency;

    const departmentWeaknesses = [...criteriaStats]
      .filter(c => c.lowCount > 0 || c.pct < 85)
      .sort((a, b) => b.lowCount !== a.lowCount ? b.lowCount - a.lowCount : a.pct - b.pct);

    const departmentStrengths = [...criteriaStats]
      .filter(c => c.pct >= 85)
      .sort((a, b) => b.pct - a.pct);

    const teacherWarnings: {
      teacher: any;
      evalCount: number;
      avgScore: number | null;
      frequentWeaknesses: {
        criterion: string;
        label: string;
        lowCount: number;
        pct: number;
      }[];
      recentImprovements: string[];
    }[] = [];

    teachers.forEach(t => {
      const teacherEvals = departmentEvaluations.filter(e => e.hostTeacher?.id === t.id);
      if (teacherEvals.length === 0) return;

      const critCounts: Record<string, { count: number; totalPct: number; label: string }> = {};
      const improvementsList: string[] = [];

      teacherEvals.forEach(ev => {
        if (ev.evaluation?.improvements && ev.evaluation.improvements.trim()) {
          improvementsList.push(ev.evaluation.improvements.trim());
        }

        const criteriaCount = isPreschool ? 5 : 11;
        const maxVals = isPreschool ? [4, 4, 4, 4, 4] : maxScoresK12;
        const labels = isPreschool ? preschoolLabels : k12Labels;

        for (let i = 1; i <= criteriaCount; i++) {
          const code = (isPreschool ? "T" : "Y") + i;
          const scoreKey = isPreschool ? "criterion" + i : "score" + i;
          const maxVal = maxVals[i - 1];
          const val = Number(ev.evaluation?.[scoreKey] || 0);

          const isLow = isPreschool ? val <= 2 : val < maxVal * 0.70;
          if (isLow) {
            if (!critCounts[code]) {
              critCounts[code] = { count: 0, totalPct: 0, label: labels[i - 1] };
            }
            critCounts[code].count++;
            critCounts[code].totalPct += (val / maxVal) * 100;
          }
        }
      });

      const frequentWeaknesses = Object.entries(critCounts)
        .map(([code, data]) => ({
          criterion: code,
          label: data.label,
          lowCount: data.count,
          pct: Math.round(data.totalPct / data.count)
        }))
        .sort((a, b) => b.lowCount - a.lowCount);

      teacherWarnings.push({
        teacher: t,
        evalCount: teacherEvals.length,
        avgScore: teacherStats[t.id]?.avgScore || null,
        frequentWeaknesses,
        recentImprovements: improvementsList.slice(0, 3)
      });
    });

    teacherWarnings.sort((a, b) => {
      const aMaxLow = a.frequentWeaknesses[0]?.lowCount || 0;
      const bMaxLow = b.frequentWeaknesses[0]?.lowCount || 0;
      return bMaxLow - aMaxLow;
    });

    return {
      departmentWeaknesses,
      departmentStrengths,
      teacherWarnings,
      totalEvalsWithWarnings: departmentEvaluations.filter(e => {
        return criteriaStats.some(c => {
          const scoreKey = isPreschool ? "criterion" + c.code.replace("T", "") : "score" + c.code.replace("Y", "");
          const val = Number(e.evaluation?.[scoreKey] || 0);
          return isPreschool ? val <= 2 : val < c.maxScore * 0.70;
        });
      }).length
    };
  }, [departmentCompetency, departmentEvaluations, teachers, teacherStats, isPreschool]);

  // Export to Excel function
  const handleExportExcel = () => {
    if (teachers.length === 0) return;

    const rows = teachers.map((t, idx) => {
      const stats = teacherStats[t.id] || {
        taughtCount: 0,
        taughtPlanCount: 0,
        taughtSurpriseCount: 0,
        observedCount: 0,
        observedPlanCount: 0,
        observedSurpriseCount: 0,
        avgScore: null
      };
      const reqTaught = t.requiredTaught || 0;
      const reqObserved = t.requiredObserved || 0;
      const isMetTaught = reqTaught === 0 || stats.taughtCount >= reqTaught;
      const isMetObserved = reqObserved === 0 || stats.observedCount >= reqObserved;
      const statusStr = isMetTaught && isMetObserved ? "Đạt chỉ tiêu" : "Chưa đạt chỉ tiêu";

      return {
        STT: idx + 1,
        "Mã GV": t.teacherCode,
        "Họ và tên": t.teacherName,
        "Chức vụ": t.position || "GV",
        "Tiết dạy (Có phiếu ĐG)": stats.taughtCount,
        "Tiết dạy Chỉ tiêu": reqTaught,
        "Tiết dạy Kế hoạch": stats.taughtPlanCount,
        "Tiết dạy Đột xuất": stats.taughtSurpriseCount,
        "Tiết dự (Hoàn thành ĐG)": stats.observedCount,
        "Tiết dự Chỉ tiêu": reqObserved,
        "Tiết dự Kế hoạch": stats.observedPlanCount,
        "Tiết dự Đột xuất": stats.observedSurpriseCount,
        "Điểm TB Tiết dạy": stats.avgScore !== null ? stats.avgScore.toFixed(1) : "-",
        "Trạng thái": statusStr
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Thống kê TTCM");
    const deptName = department?.name ? department.name.replace(/[^a-zA-Z0-9]/g, "_") : "ToChuyenMon";
    const monthStr = selectedMonth === "all" ? "CaNam" : selectedMonth;
    XLSX.writeFile(workbook, `BaoCao_TTCM_${deptName}_${monthStr}.xlsx`);
  };

  // Filtered teachers for table view
  const filteredTeachersList = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch =
        t.teacherName.toLowerCase().includes(searchTeacherQuery.toLowerCase()) ||
        t.teacherCode.toLowerCase().includes(searchTeacherQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterProgressStatus !== "ALL") {
        const stats = teacherStats[t.id];
        const reqTaught = t.requiredTaught || 0;
        const reqObserved = t.requiredObserved || 0;
        const isMet = (reqTaught === 0 || (stats?.taughtCount || 0) >= reqTaught) &&
                      (reqObserved === 0 || (stats?.observedCount || 0) >= reqObserved);
        if (filterProgressStatus === "MET" && !isMet) return false;
        if (filterProgressStatus === "UNMET" && isMet) return false;
      }

      return true;
    });
  }, [teachers, searchTeacherQuery, filterProgressStatus, teacherStats]);

  // Pedagogical action recommendations based on top department weaknesses
  const getPedagogicalAdvice = (criterionCode: string) => {
    const adviceMap: Record<string, string> = {
      Y1: "Tăng cường duyệt kế hoạch bài dạy trước 1 tuần, hướng dẫn GV bám sát chuẩn kiến thức kỹ năng môn học.",
      Y2: "Tổ chức chuyên đề về ứng dụng đồ dùng trực quan, thí nghiệm thực hành và phần mềm mô phỏng trong giảng dạy.",
      Y3: "Tổ chức sinh hoạt chuyên môn theo nghiên cứu bài học, chuẩn hóa kiến thức chuyên sâu và thuật ngữ bộ môn.",
      Y4: "Định hướng GV xây dựng sơ đồ tư duy, hệ thống hóa bài học và phân bổ trọng tâm rõ ràng trong từng pha dạy học.",
      Y5: "Khuyến khích giáo viên tích hợp tình huống thực tiễn, giáo dục kỹ năng sống và liên môn vào bài học.",
      Y6: "Tăng cường quan sát và hỗ trợ học sinh chậm tiến bộ, chuyển từ thuyết giảng một chiều sang hướng dẫn cá thể hóa.",
      Y7: "Tập huấn chuyên sâu phương pháp học tập hợp tác, kỹ thuật chia nhóm (khăn trải bàn, mảnh ghép) và giao nhiệm vụ rõ ràng.",
      Y8: "Rèn luyện kỹ năng điều phối nhịp độ tiết dạy, căn chỉnh thời gian từng hoạt động tránh 'cháy' hoặc dư thời gian.",
      Y9: "Đổi mới phương pháp đặt câu hỏi phân hóa (theo thang Bloom), kích thích học sinh phản biện và tư duy sáng tạo.",
      Y10: "Ứng dụng công cụ đánh giá thường xuyên (form nhanh, bảng kiểm rubrics, mini-quiz) để nắm bắt mức độ hiểu bài của học sinh.",
      Y11: "Tổ chức các tiết dạy mẫu truyền cảm hứng, xây dựng không khí lớp học sôi nổi, khích lệ học sinh tự tin biểu đạt.",
      T1: "Rà soát mục tiêu bài dạy phù hợp độ tuổi, chuẩn bị giáo án tích hợp sinh động.",
      T2: "Đổi mới hình thức tổ chức 'học bằng chơi, chơi mà học', kích thích trẻ tò mò khám phá.",
      T3: "Đầu tư học liệu mở, đồ chơi tự làm an toàn, đa dạng màu sắc và kích thích đa giác quan.",
      T4: "Đảm bảo an toàn tuyệt đối, quan sát bao quát toàn bộ trẻ trong suốt quá trình học tập và vui chơi.",
      T5: "Tạo không khí lớp học vui vẻ, gần gũi, khen ngợi động viên trẻ tích cực tham gia hoạt động."
    };
    return adviceMap[criterionCode] || "Đưa vào nội dung trọng tâm sinh hoạt chuyên môn định kỳ để các tổ viên trao đổi kinh nghiệm.";
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-12">
      {/* 1. TOP HEADER & FILTER BAR */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#008B82] to-[#003B3A] text-white flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#003B3A]">
                  Theo Dõi Tổng Hợp Tổ Chuyên Môn
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-100 text-[#008B82] border border-teal-200">
                  {department?.name || "Tổ chuyên môn"}
                </span>
                {isPreschool && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                    Khối Mầm Non
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Báo cáo tiến độ tiết dạy, tiết dự, kết quả xếp loại và phân tích năng lực chuyên môn
              </p>
            </div>
          </div>

          {/* Quick Action: Export Excel & Refresh */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
              title="Xuất bảng thống kê ra Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <button
              type="button"
              onClick={() => fetchDeptData(selectedDeptId)}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>

        {/* Filters Row: Department Selector, Month Selector, Origin Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Department Select (if TTCM has multiple depts or Admin viewing) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Tổ Chuyên Môn
            </label>
            <div className="relative">
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-all focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                {ttcmAllowedDepartments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Filter Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Kỳ Thống Kê / Tháng
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 transition-all focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="all">Toàn bộ năm học (Tất cả các tháng)</option>
                {availableMonths.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Origin Filter (Kế hoạch / Đột xuất) */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Hình Thức Tiết Dạy
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setOriginFilter("ALL")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  originFilter === "ALL"
                    ? "bg-white text-teal-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setOriginFilter("PLAN")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  originFilter === "PLAN"
                    ? "bg-white text-teal-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Kế hoạch
              </button>
              <button
                type="button"
                onClick={() => setOriginFilter("SURPRISE")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  originFilter === "SURPRISE"
                    ? "bg-white text-amber-800 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đột xuất
              </button>
            </div>
          </div>
        </div>

        {/* Sub Navigation Bar: 5 Sub-features */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeSubTab === "overview"
                ? "bg-[#008B82] text-white shadow-md shadow-teal-900/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Thống kê Tiết dạy & Tiết dự</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {teachers.length} GV
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("competency")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeSubTab === "competency"
                ? "bg-[#008B82] text-white shadow-md shadow-teal-900/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Target className="w-4 h-4" />
            <span>2. Biểu đồ Năng lực Tổ</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {isPreschool ? "5 T.Chí" : "11 T.Chí"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("warnings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeSubTab === "warnings"
                ? "bg-amber-600 text-white shadow-md shadow-amber-700/20"
                : "text-amber-700 bg-amber-50 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>3. Cảnh báo Tiêu chí Tần số cao</span>
            {warningAnalytics.departmentWeaknesses.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-800/60 text-white font-bold animate-pulse">
                {warningAnalytics.departmentWeaknesses.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("ratings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeSubTab === "ratings"
                ? "bg-[#008B82] text-white shadow-md shadow-teal-900/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>4. Kết quả Xếp loại</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-bold">
              {departmentEvaluations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("feedback")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              activeSubTab === "feedback"
                ? "bg-[#008B82] text-white shadow-md shadow-teal-900/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>5. Góp ý & Nhận xét</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Taught Progress */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Tiết Dạy (Có Phiếu ĐG)
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#003B3A]">
                {departmentKPIs.totalTaught}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                / {departmentKPIs.requiredTaughtTotal} chỉ tiêu
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-[#008B82] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, departmentKPIs.taughtRate)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-teal-700 mt-1.5 block">
              {departmentKPIs.taughtRate}% hoàn thành kế hoạch
            </span>
          </div>
        </div>

        {/* KPI 2: Observed Progress */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Tiết Dự (Hoàn Thành ĐG)
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-950">
                {departmentKPIs.totalObserved}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                / {departmentKPIs.requiredObservedTotal} chỉ tiêu
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, departmentKPIs.observedRate)}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-cyan-700 mt-1.5 block">
              {departmentKPIs.observedRate}% hoàn thành kế hoạch
            </span>
          </div>
        </div>

        {/* KPI 3: Average Score & Pass Rate */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Điểm TB & Tỷ Lệ Đạt
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-violet-950">
                {departmentKPIs.avgScore !== null
                  ? departmentKPIs.avgScore.toFixed(1)
                  : "Chưa có"}
              </span>
              {!isPreschool && departmentKPIs.avgScore !== null && (
                <span className="text-xs text-slate-400 font-bold">/ 20đ</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                {departmentKPIs.passRate}% Đạt chuẩn
              </span>
              <span className="text-[11px] text-slate-500 font-bold">
                ({departmentKPIs.passingEvals}/{departmentKPIs.totalEvals} tiết)
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Warning Status */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Cảnh Báo Chuyên Môn
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-700">
                {warningAnalytics.departmentWeaknesses.length}
              </span>
              <span className="text-xs text-slate-400 font-bold">tiêu chí cần lưu ý</span>
            </div>
            <p className="text-[11px] font-bold text-amber-800/80 mt-1.5 line-clamp-1">
              {warningAnalytics.departmentWeaknesses[0]
                ? `Tần số cao nhất: ${warningAnalytics.departmentWeaknesses[0].code}`
                : "Chất lượng tiết dạy ổn định"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SUB-TAB 1: THỐNG KÊ TIẾT DẠY & TIẾT DỰ THEO THÁNG */}
      {activeSubTab === "overview" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-[#003B3A]">
                Tiến Độ Dạy & Dự Giờ Của Giáo Viên Trong Tổ
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Đối chiếu số tiết thực hiện với chỉ tiêu năm học {selectedMonth === "all" ? "(Toàn bộ năm học)" : `(Kỳ ${selectedMonth})`} • Thống kê tiết dạy có phiếu đánh giá và tiết dự đã hoàn thành đánh giá.
              </p>
            </div>

            {/* Table Search & Status Filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm giáo viên..."
                  value={searchTeacherQuery}
                  onChange={e => setSearchTeacherQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 w-40 sm:w-48"
                />
              </div>

              <select
                value={filterProgressStatus}
                onChange={e => setFilterProgressStatus(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
              >
                <option value="ALL">Tất cả tiến độ</option>
                <option value="MET">Đã đạt chỉ tiêu</option>
                <option value="UNMET">Chưa đạt chỉ tiêu</option>
              </select>
            </div>
          </div>

          {/* Teacher Progress Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 rounded-l-xl">STT</th>
                  <th className="py-3 px-4">Giáo Viên</th>
                  <th className="py-3 px-4">Chức Vụ</th>
                  <th className="py-3 px-4 text-center">Tiết Dạy (Có phiếu / Chỉ tiêu)</th>
                  <th className="py-3 px-4 text-center">Tiết Dự (Đã đánh giá / Chỉ tiêu)</th>
                  <th className="py-3 px-4 text-center">Điểm TB Tiết Dạy</th>
                  <th className="py-3 px-4 text-center">Đánh Giá Tiến Độ</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredTeachersList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      Không tìm thấy giáo viên nào trong tổ phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredTeachersList.map((t, idx) => {
                    const stats = teacherStats[t.id] || {
                      taughtCount: 0,
                      taughtPlanCount: 0,
                      taughtSurpriseCount: 0,
                      observedCount: 0,
                      observedPlanCount: 0,
                      observedSurpriseCount: 0,
                      avgScore: null
                    };

                    const reqTaught = t.requiredTaught || 0;
                    const reqObserved = t.requiredObserved || 0;

                    const isMetTaught = reqTaught === 0 || stats.taughtCount >= reqTaught;
                    const isMetObserved = reqObserved === 0 || stats.observedCount >= reqObserved;
                    const isOverallMet = isMetTaught && isMetObserved;
                    const isExceeded = (reqTaught > 0 && stats.taughtCount > reqTaught) ||
                                       (reqObserved > 0 && stats.observedCount > reqObserved);

                    const taughtPct = reqTaught > 0 ? Math.min(100, Math.round((stats.taughtCount / reqTaught) * 100)) : 100;
                    const observedPct = reqObserved > 0 ? Math.min(100, Math.round((stats.observedCount / reqObserved) * 100)) : 100;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 ${getAvatarGradient(t.teacherName)}`}
                            >
                              {t.teacherName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{t.teacherName}</span>
                              <span className="text-[10px] text-slate-400">{t.teacherCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              t.position === "TTCM"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {t.position || "GV"}
                          </span>
                        </td>

                        {/* Tiết dạy */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`font-black text-sm ${
                                  isMetTaught ? "text-teal-700" : "text-amber-600"
                                }`}
                              >
                                {stats.taughtCount}
                              </span>
                              <span className="text-slate-400 text-[11px]">/ {reqTaught}</span>
                            </div>
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isMetTaught ? "bg-teal-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${taughtPct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              (KH: {stats.taughtPlanCount} • ĐX: {stats.taughtSurpriseCount})
                            </span>
                          </div>
                        </td>

                        {/* Tiết dự */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-1">
                              <span
                                className={`font-black text-sm ${
                                  isMetObserved ? "text-cyan-700" : "text-amber-600"
                                }`}
                              >
                                {stats.observedCount}
                              </span>
                              <span className="text-slate-400 text-[11px]">/ {reqObserved}</span>
                            </div>
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isMetObserved ? "bg-cyan-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${observedPct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              (KH: {stats.observedPlanCount} • ĐX: {stats.observedSurpriseCount})
                            </span>
                          </div>
                        </td>

                        {/* Điểm TB */}
                        <td className="py-3.5 px-4 text-center">
                          {stats.avgScore !== null ? (
                            <span className="font-black text-slate-800 text-sm">
                              {stats.avgScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>

                        {/* Trạng thái tiến độ */}
                        <td className="py-3.5 px-4 text-center">
                          {isExceeded ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              Vượt chỉ tiêu
                            </span>
                          ) : isOverallMet ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Đạt chỉ tiêu
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              Chưa đạt
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTeacherForDetail(t)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#008B82] hover:bg-teal-50 border border-teal-200/80 transition-all cursor-pointer"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SUB-TAB 2: BIỂU ĐỒ NĂNG LỰC TỔ CHUYÊN MÔN (RADAR CHART & 11 TIÊU CHÍ) */}
      {activeSubTab === "competency" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Radar Chart Visual */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-[#003B3A]">
                    Hồ Sơ Năng Lực Tổ Chuyên Môn
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Biểu đồ mạng nhện trung bình {isPreschool ? "5 tiêu chí Mầm non" : "11 tiêu chí K12"}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-black bg-teal-100 text-[#008B82] border border-teal-200">
                  {departmentCompetency.overallPct}% Đạt chuẩn
                </div>
              </div>

              {/* Spider / Radar Chart SVG */}
              <div className="w-full flex items-center justify-center py-6">
                {(() => {
                  const size = 340;
                  const center = size / 2;
                  const radius = center - 45;
                  const criteria = departmentCompetency.criteriaStats;
                  const count = criteria.length;

                  const levels = [0.25, 0.5, 0.75, 1.0];

                  const points = criteria.map((c, i) => {
                    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
                    const r = (c.pct / 100) * radius;
                    const x = center + r * Math.cos(angle);
                    const y = center + r * Math.sin(angle);
                    return { x, y, code: c.code, pct: c.pct, label: c.label };
                  });

                  const polygonPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

                  return (
                    <svg width={size} height={size} className="overflow-visible">
                      {/* Grid webs */}
                      {levels.map((lvl, lIdx) => {
                        const lvlPoints = Array.from({ length: count }).map((_, i) => {
                          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
                          const r = lvl * radius;
                          const x = center + r * Math.cos(angle);
                          const y = center + r * Math.sin(angle);
                          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                        }).join(" ") + " Z";

                        return (
                          <path
                            key={lIdx}
                            d={lvlPoints}
                            fill="none"
                            stroke="#E2E8F0"
                            strokeWidth="1"
                            strokeDasharray={lvl === 1.0 ? undefined : "2 2"}
                          />
                        );
                      })}

                      {/* Axes */}
                      {Array.from({ length: count }).map((_, i) => {
                        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
                        const x = center + radius * Math.cos(angle);
                        const y = center + radius * Math.sin(angle);
                        return (
                          <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={x}
                            y2={y}
                            stroke="#CBD5E1"
                            strokeWidth="1"
                          />
                        );
                      })}

                      {/* Data Polygon */}
                      <path
                        d={polygonPath}
                        fill="rgba(0, 139, 130, 0.25)"
                        stroke="#008B82"
                        strokeWidth="2.5"
                      />

                      {/* Data points & labels */}
                      {points.map((p, i) => {
                        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
                        const labelRadius = radius + 22;
                        const lx = center + labelRadius * Math.cos(angle);
                        const ly = center + labelRadius * Math.sin(angle);

                        return (
                          <g key={i}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4"
                              fill="#008B82"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                            />
                            <text
                              x={lx}
                              y={ly}
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="text-[11px] font-black fill-slate-700 select-none"
                            >
                              {p.code}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <span className="font-black text-slate-800 block">
                Tổng hợp chất lượng chuyên môn:
              </span>
              <p className="text-slate-600 font-medium">
                Điểm trung bình toàn tổ đạt{" "}
                <strong className="text-teal-700 font-bold">
                  {departmentCompetency.totalScoreSum.toFixed(1)} / {departmentCompetency.totalMaxPossible} điểm
                </strong>{" "}
                ({departmentCompetency.overallPct}%). Dữ liệu tổng hợp từ {departmentCompetency.evalCount} lượt đánh giá tiết dạy.
              </p>
            </div>
          </div>

          {/* Criteria Breakdown by Standards */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#003B3A]">
                Chi Tiết Tiêu Chí Đánh Giá Chuyên Môn
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Điểm trung bình và tỷ lệ % hoàn thành từng tiêu chí của cả tổ
              </p>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {departmentCompetency.criteriaStats.map(crit => {
                const isWarning = crit.lowCount > 0 || crit.pct < 85;

                return (
                  <div
                    key={crit.code}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isWarning
                        ? "bg-amber-50/40 border-amber-200/80"
                        : "bg-slate-50/60 border-slate-200/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 leading-snug">
                        {crit.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-black text-[#003B3A]">
                          {crit.avgScore.toFixed(2)}/{crit.maxScore}đ
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            crit.pct >= 90
                              ? "bg-emerald-100 text-emerald-800"
                              : crit.pct >= 80
                              ? "bg-teal-100 text-teal-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {crit.pct}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200/80 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          crit.pct >= 90
                            ? "bg-emerald-500"
                            : crit.pct >= 80
                            ? "bg-teal-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${crit.pct}%` }}
                      />
                    </div>

                    {crit.lowCount > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 mt-1.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>
                          Có {crit.lowCount} lượt đánh giá dưới mức mong đợi ({crit.lowPct}% số tiết)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 3: CẢNH BÁO TIÊU CHÍ CÓ TẦN SỐ XUẤT HIỆN NHIỀU NHẤT */}
      {activeSubTab === "warnings" && (
        <div className="space-y-6">
          {/* A. Department-level Warnings */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Cảnh Báo Tiêu Chí Xuất Hiện Hạn Chế Nhiều Nhất (Toàn Tổ)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Hệ thống tự động phát hiện các tiêu chí thường xuyên gặp vướng mắc để TTCM định hướng sinh hoạt chuyên môn
                </p>
              </div>
            </div>

            {warningAnalytics.departmentWeaknesses.length === 0 ? (
              <div className="py-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-200/80">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-black text-sm text-emerald-900">Chất Lượng Tiết Dạy Rất Tốt!</h4>
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  Không có tiêu chí nào trong tổ bị đánh giá hạn chế hoặc dưới ngưỡng chuẩn chuyên môn.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warningAnalytics.departmentWeaknesses.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.code}
                    className="p-4 rounded-2xl border bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 border-amber-200 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-600 text-white">
                          Cảnh báo #{idx + 1}
                        </span>
                        <span className="text-[11px] font-black text-amber-800">
                          Tần số: {item.lowCount} tiết ({item.lowPct}%)
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 mt-2 leading-snug">
                        {item.label}
                      </h4>

                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-amber-200/60 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-600 h-full rounded-full"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-black text-amber-900 shrink-0">
                          {item.pct}% (TB: {item.avgScore.toFixed(1)}/{item.maxScore}đ)
                        </span>
                      </div>
                    </div>

                    {/* Pedagogical action suggestion */}
                    <div className="p-3 bg-white/90 rounded-xl border border-amber-200/70 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 font-black text-amber-900">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Khuyến nghị cho TTCM:</span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {getPedagogicalAdvice(item.code)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. Teacher-Specific Warning Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#003B3A]">
                    Ma Trận Cảnh Báo Tiêu Chí Theo Từng Giáo Viên
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Nhận diện tiêu chí mà từng giáo viên hay gặp hạn chế nhất để TTCM bồi dưỡng chuyên môn đúng trọng tâm
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-xl">Giáo Viên</th>
                    <th className="py-3 px-4 text-center">Số Tiết Đã Đánh Giá</th>
                    <th className="py-3 px-4 text-center">Điểm TB</th>
                    <th className="py-3 px-4">Tiêu Chí Cảnh Báo Lặp Lại Nhiều Nhất</th>
                    <th className="py-3 px-4">Góp Ý Điển Hình Gần Nhất</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {warningAnalytics.teacherWarnings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                        Chưa có dữ liệu đánh giá nào cho các giáo viên trong tổ trong kỳ này.
                      </td>
                    </tr>
                  ) : (
                    warningAnalytics.teacherWarnings.map(tw => {
                      const topWeakness = tw.frequentWeaknesses[0];

                      return (
                        <tr key={tw.teacher.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[11px] shrink-0 ${getAvatarGradient(tw.teacher.teacherName)}`}
                              >
                                {tw.teacher.teacherName.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {tw.teacher.teacherName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {tw.teacher.teacherCode}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                            {tw.evalCount} tiết
                          </td>

                          <td className="py-3.5 px-4 text-center font-black text-slate-900">
                            {tw.avgScore !== null ? tw.avgScore.toFixed(1) : "-"}
                          </td>

                          <td className="py-3.5 px-4">
                            {topWeakness ? (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  {topWeakness.criterion} ({topWeakness.lowCount} lần)
                                </span>
                                <span className="text-slate-700 text-xs font-semibold line-clamp-1">
                                  {topWeakness.label}
                                </span>
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Không có cảnh báo
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            {tw.recentImprovements.length > 0 ? (
                              <span className="text-slate-600 text-xs italic line-clamp-1">
                                "{tw.recentImprovements[0]}"
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Chưa có ghi chú</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTeacherForDetail(tw.teacher)}
                              className="px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg cursor-pointer"
                            >
                              Xem
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 4: KẾT QUẢ XẾP LOẠI TIẾT DẠY */}
      {activeSubTab === "ratings" && (
        <div className="space-y-6">
          {/* Rating Distribution Overview */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#003B3A]">
                Phân Bố Kết Quả Xếp Loại Toàn Tổ
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thống kê các mức xếp loại qua {departmentEvaluations.length} phiếu đánh giá tiết dạy
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                <span className="text-[11px] font-black text-emerald-800 uppercase">Tốt / Giỏi</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-emerald-950">
                    {departmentKPIs.ratingDistribution["Tốt"] || 0}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {departmentEvaluations.length > 0
                      ? Math.round(((departmentKPIs.ratingDistribution["Tốt"] || 0) / departmentEvaluations.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
                <span className="text-[11px] font-black text-blue-800 uppercase">Khá</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-blue-950">
                    {departmentKPIs.ratingDistribution["Khá"] || 0}
                  </span>
                  <span className="text-xs font-bold text-blue-700">
                    {departmentEvaluations.length > 0
                      ? Math.round(((departmentKPIs.ratingDistribution["Khá"] || 0) / departmentEvaluations.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                <span className="text-[11px] font-black text-amber-800 uppercase">Đạt</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-950">
                    {departmentKPIs.ratingDistribution["Đạt"] || 0}
                  </span>
                  <span className="text-xs font-bold text-amber-700">
                    {departmentEvaluations.length > 0
                      ? Math.round(((departmentKPIs.ratingDistribution["Đạt"] || 0) / departmentEvaluations.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between">
                <span className="text-[11px] font-black text-rose-800 uppercase">Chưa Đạt</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-rose-950">
                    {departmentKPIs.ratingDistribution["Chưa đạt"] || 0}
                  </span>
                  <span className="text-xs font-bold text-rose-700">
                    {departmentEvaluations.length > 0
                      ? Math.round(((departmentKPIs.ratingDistribution["Chưa đạt"] || 0) / departmentEvaluations.length) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* List of Evaluated Lessons */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#003B3A]">
                Danh Sách Tiết Dạy Đã Đánh Giá Trong Tổ
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Bấm "Xem phiếu đánh giá" để tra cứu thang điểm chi tiết từng tiêu chí
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4 rounded-l-xl">Ngày & Tiết</th>
                    <th className="py-3 px-4">Giáo Viên Dạy</th>
                    <th className="py-3 px-4">Bài Dạy & Lớp</th>
                    <th className="py-3 px-4">Người Dự Giờ</th>
                    <th className="py-3 px-4 text-center">Điểm Đánh Giá</th>
                    <th className="py-3 px-4 text-center">Xếp Loại</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {departmentEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                        Chưa có tiết dạy nào được đánh giá trong kỳ này.
                      </td>
                    </tr>
                  ) : (
                    departmentEvaluations.map((item, idx) => {
                      const rating = item.evaluation.overallRating || "Đạt";
                      const ratingBadgeColor =
                        RATING_COLORS[rating] || "bg-teal-50 text-teal-800 border-teal-200";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            {new Date(item.slot.date).toLocaleDateString("vi-VN")}
                            <span className="block text-[10px] text-slate-400">
                              {item.slot.startTime} {item.slot.isDoublePeriod ? "(Tiết đôi)" : ""}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">
                              {item.hostTeacher?.teacherName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.hostTeacher?.teacherCode}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#003B3A] block line-clamp-1">
                              {item.slot.topic}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Môn: {item.slot.subjectName} • {item.slot.className || item.slot.grade}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block">
                              {item.observerTeacher?.teacherName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.observerTeacher?.position || "Người dự"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {item.evaluation.totalScore !== null &&
                            item.evaluation.totalScore !== undefined ? (
                              <span className="font-black text-slate-900 text-sm">
                                {item.evaluation.totalScore}
                                {!isPreschool && <span className="text-[10px] text-slate-400">/20</span>}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${ratingBadgeColor}`}
                            >
                              {rating}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEvalModal(item.registration, item.slot)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 hover:bg-teal-50 border border-teal-200 transition-all cursor-pointer"
                            >
                              Xem phiếu
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. SUB-TAB 5: GÓP Ý & NHẬN XÉT TIẾT DẠY */}
      {activeSubTab === "feedback" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-[#003B3A]">
              Tổng Hợp Góp Ý & Nhận Xét Tiết Dạy
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Toàn bộ ý kiến nhận xét, ưu điểm và điểm cần cải thiện từ các buổi dự giờ trong tổ
            </p>
          </div>

          <div className="space-y-4">
            {departmentEvaluations.filter(
              e => e.evaluation.strengths || e.evaluation.improvements || e.evaluation.generalComment
            ).length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                Chưa có nhận xét hoặc góp ý nào được ghi nhận trong kỳ này.
              </div>
            ) : (
              departmentEvaluations
                .filter(e => e.evaluation.strengths || e.evaluation.improvements || e.evaluation.generalComment)
                .map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-all space-y-3"
                  >
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#003B3A] text-sm">
                          {item.hostTeacher?.teacherName}
                        </span>
                        <span className="text-slate-400 text-xs font-bold">•</span>
                        <span className="text-slate-600 text-xs font-semibold">
                          Bài: {item.slot.topic} ({item.slot.subjectName})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          Người góp ý: <strong>{item.observerTeacher?.teacherName}</strong>
                        </span>
                        <span>•</span>
                        <span>{new Date(item.slot.date).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </div>

                    {/* Feedback content blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* 1. Strengths */}
                      <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Ưu điểm nổi bật
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {item.evaluation.strengths || "Chưa có ghi chú"}
                        </p>
                      </div>

                      {/* 2. Improvements */}
                      <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Tồn tại / Cần cải thiện
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {item.evaluation.improvements || "Chưa có ghi chú"}
                        </p>
                      </div>

                      {/* 3. General Comments */}
                      <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-blue-800 uppercase flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                          Ý kiến & Góp ý chung
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {item.evaluation.generalComment || "Chưa có ghi chú"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* 8. TEACHER DETAIL HISTORY MODAL */}
      {selectedTeacherForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm ${getAvatarGradient(selectedTeacherForDetail.teacherName)}`}
                >
                  {selectedTeacherForDetail.teacherName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-base leading-snug">
                    {selectedTeacherForDetail.teacherName}
                  </h3>
                  <p className="text-teal-200 text-xs font-medium">
                    Mã GV: {selectedTeacherForDetail.teacherCode} • Chức vụ: {selectedTeacherForDetail.position || "GV"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacherForDetail(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Teacher target summary cards */}
              {(() => {
                const s = teacherStats[selectedTeacherForDetail.id] || {
                  taughtCount: 0,
                  observedCount: 0,
                  avgScore: null,
                  taughtSlots: [],
                  observedSlots: []
                };

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-2xl text-center">
                        <span className="text-[10px] font-black text-teal-700 uppercase block">
                          Tiết Dạy (Có phiếu ĐG)
                        </span>
                        <span className="text-xl font-black text-[#003B3A]">
                          {s.taughtCount}
                          <span className="text-xs text-slate-400 font-bold">
                            /{selectedTeacherForDetail.requiredTaught || 0}
                          </span>
                        </span>
                      </div>
                      <div className="p-3 bg-cyan-50/60 border border-cyan-100 rounded-2xl text-center">
                        <span className="text-[10px] font-black text-cyan-700 uppercase block">
                          Tiết Dự (Hoàn thành ĐG)
                        </span>
                        <span className="text-xl font-black text-cyan-900">
                          {s.observedCount}
                          <span className="text-xs text-slate-400 font-bold">
                            /{selectedTeacherForDetail.requiredObserved || 0}
                          </span>
                        </span>
                      </div>
                      <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-2xl text-center">
                        <span className="text-[10px] font-black text-purple-700 uppercase block">
                          Điểm TB Tiết Dạy
                        </span>
                        <span className="text-xl font-black text-purple-900">
                          {s.avgScore !== null ? s.avgScore.toFixed(1) : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Section: Taught Slots */}
                    <div>
                      <h4 className="font-black text-sm text-[#003B3A] mb-2">
                        Các Tiết Dạy Có Phiếu Đánh Giá ({s.taughtSlots.length})
                      </h4>
                      {s.taughtSlots.length === 0 ? (
                        <p className="text-slate-400 italic py-2">Chưa có tiết dạy nào có phiếu đánh giá.</p>
                      ) : (
                        <div className="space-y-2">
                          {s.taughtSlots.map((slot: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {slot.topic}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {new Date(slot.date).toLocaleDateString("vi-VN")} • {slot.subjectName} • {slot.className || slot.grade}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-teal-100 text-teal-800">
                                {isSurpriseSlot(slot) ? "Đột xuất" : "Kế hoạch"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section: Observed Slots */}
                    <div>
                      <h4 className="font-black text-sm text-[#003B3A] mb-2">
                        Các Tiết Dự Giờ Đã Hoàn Thành Đánh Giá ({s.observedSlots.length})
                      </h4>
                      {s.observedSlots.length === 0 ? (
                        <p className="text-slate-400 italic py-2">Chưa có tiết dự giờ nào hoàn thành đánh giá.</p>
                      ) : (
                        <div className="space-y-2">
                          {s.observedSlots.map((item: any, oIdx: number) => (
                            <div
                              key={oIdx}
                              className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block">
                                  {item.slot.topic}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  GV dạy: <strong>{item.slot.teacher?.teacherName}</strong> • {new Date(item.slot.date).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-100 text-cyan-800">
                                Đã hoàn thành đánh giá
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeacherForDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
