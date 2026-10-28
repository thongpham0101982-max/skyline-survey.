"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Users,
  Sparkles,
  Filter,
  FileSpreadsheet,
  Eye,
  GraduationCap,
  ChevronRight,
  X,
  AlertCircle,
  Info,
  CalendarRange,
  Zap,
  Activity,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import * as XLSX from "xlsx";

interface TeacherItem {
  id: string;
  teacherName: string;
  teacherCode?: string | null;
  position?: string | null;
  departmentId?: string | null;
  requiredTaught?: number;
  requiredObserved?: number;
}

interface ObservationMonthlyTimelineTabProps {
  slots: any[];
  teachers: TeacherItem[];
  department?: any;
  selectedMonth?: string; // e.g. "2026-10" or "all"
  availableMonths: { key: string; label: string }[];
  isPreschool?: boolean;
  openEvalModal?: (evalData: any, slot: any) => void;
  RATING_COLORS?: Record<string, string>;
}

// 4 Tuần trong tháng
const WEEKS_DEF = [
  { key: "W1", label: "Tuần 1 (01 - 07)", shortLabel: "Tuần 1", minDay: 1, maxDay: 7, desc: "Khởi động đầu tháng" },
  { key: "W2", label: "Tuần 2 (08 - 14)", shortLabel: "Tuần 2", minDay: 8, maxDay: 14, desc: "Triển khai trọng tâm" },
  { key: "W3", label: "Tuần 3 (15 - 21)", shortLabel: "Tuần 3", minDay: 15, maxDay: 21, desc: "Duy trì & Củng cố" },
  { key: "W4", label: "Tuần 4+ (22 - Cuối tháng)", shortLabel: "Tuần 4+", minDay: 22, maxDay: 31, desc: "Về đích & Tổng kết" },
];

// 3 Chặng trong tháng
const PHASES_DEF = [
  { key: "EARLY", label: "Đầu tháng (01 - 10)", shortLabel: "Đầu tháng", minDay: 1, maxDay: 10, color: "#00A19A" },
  { key: "MID", label: "Giữa tháng (11 - 20)", shortLabel: "Giữa tháng", minDay: 11, maxDay: 20, color: "#3B82F6" },
  { key: "LATE", label: "Cuối tháng (21 - Hết)", shortLabel: "Cuối tháng", minDay: 21, maxDay: 31, color: "#F59E0B" },
];

const DAY_OF_WEEK_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function ObservationMonthlyTimelineTab({
  slots = [],
  teachers = [],
  department,
  selectedMonth: initialSelectedMonth = "all",
  availableMonths = [],
  isPreschool = false,
  openEvalModal,
  RATING_COLORS
}: ObservationMonthlyTimelineTabProps) {
  // Determine initial month: if passed "all", pick the latest month with data or first available
  const defaultMonth = useMemo(() => {
    if (initialSelectedMonth && initialSelectedMonth !== "all") {
      return initialSelectedMonth;
    }
    // Find latest month in slots
    let latest = "";
    slots.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        if (!isNaN(d.getTime())) {
          const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!latest || mKey > latest) latest = mKey;
        }
      }
    });
    if (latest) return latest;
    if (availableMonths.length > 0) return availableMonths[availableMonths.length - 1].key;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, [initialSelectedMonth, slots, availableMonths]);

  const [activeMonthKey, setActiveMonthKey] = useState<string>(defaultMonth);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "TAUGHT" | "OBSERVED">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PLAN" | "SURPRISE">("ALL");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [selectedDetailDay, setSelectedDetailDay] = useState<number | null>(null);
  const [selectedDetailWeek, setSelectedDetailWeek] = useState<string | null>(null);
  const [modalSlotList, setModalSlotList] = useState<{ title: string; slots: any[] } | null>(null);

  // Sync if parent month changes
  React.useEffect(() => {
    if (initialSelectedMonth && initialSelectedMonth !== "all") {
      setActiveMonthKey(initialSelectedMonth);
    }
  }, [initialSelectedMonth]);

  // Parse active month year & month
  const [curYear, curMonth] = useMemo(() => {
    const parts = activeMonthKey.split("-");
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    return [y, m];
  }, [activeMonthKey]);

  // Days in month
  const daysInMonth = useMemo(() => {
    return new Date(curYear, curMonth, 0).getDate();
  }, [curYear, curMonth]);

  // Filter slots for the active month
  const monthSlots = useMemo(() => {
    return slots.filter(s => {
      if (!s.date) return false;
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (y !== curYear || m !== curMonth) return false;

      // Filter by type (Plan vs Surprise)
      const isSurprise = s.requestOrigin === "SURPRISE" || s.requestOrigin === "ADMIN_REQUEST";
      if (typeFilter === "PLAN" && isSurprise) return false;
      if (typeFilter === "SURPRISE" && !isSurprise) return false;

      // Filter by specific teacher if selected
      if (selectedTeacherId !== "all") {
        const isHost = s.teacherId === selectedTeacherId;
        const isObserver = (s.registrations || []).some((r: any) => r.teacherId === selectedTeacherId);
        if (!isHost && !isObserver) return false;
      }

      return true;
    });
  }, [slots, curYear, curMonth, typeFilter, selectedTeacherId]);

  // Pre-calculate teacher participation items (both host and observer)
  const participationItems = useMemo(() => {
    const items: Array<{
      slot: any;
      role: "HOST" | "OBSERVER";
      teacherId: string;
      teacherName: string;
      day: number;
      dayOfWeek: number;
      isSurprise: boolean;
      evaluation?: any;
    }> = [];

    monthSlots.forEach(s => {
      const d = new Date(s.date);
      const day = d.getDate();
      const dayOfWeek = d.getDay();
      const isSurprise = s.requestOrigin === "SURPRISE" || s.requestOrigin === "ADMIN_REQUEST";

      // Host teacher
      if (s.teacherId) {
        if (roleFilter === "ALL" || roleFilter === "TAUGHT") {
          if (selectedTeacherId === "all" || s.teacherId === selectedTeacherId) {
            items.push({
              slot: s,
              role: "HOST",
              teacherId: s.teacherId,
              teacherName: s.teacher?.teacherName || "Giáo viên dạy",
              day,
              dayOfWeek,
              isSurprise,
              evaluation: s.registrations?.[0]?.evaluation
            });
          }
        }
      }

      // Observer teachers
      if (roleFilter === "ALL" || roleFilter === "OBSERVED") {
        (s.registrations || []).forEach((r: any) => {
          if (r.teacherId) {
            if (selectedTeacherId === "all" || r.teacherId === selectedTeacherId) {
              items.push({
                slot: s,
                role: "OBSERVER",
                teacherId: r.teacherId,
                teacherName: r.teacher?.teacherName || "Giáo viên dự",
                day,
                dayOfWeek,
                isSurprise,
                evaluation: r.evaluation
              });
            }
          }
        });
      }
    });

    return items;
  }, [monthSlots, roleFilter, selectedTeacherId]);

  // Total unique slots & participation count
  const totalSlotsCount = monthSlots.length;
  const hostCount = participationItems.filter(i => i.role === "HOST").length;
  const observerCount = participationItems.filter(i => i.role === "OBSERVER").length;
  const surpriseCount = monthSlots.filter(s => s.requestOrigin === "SURPRISE" || s.requestOrigin === "ADMIN_REQUEST").length;

  // 1. Phân bổ theo 4 Tuần
  const weekStats = useMemo(() => {
    return WEEKS_DEF.map(w => {
      const wSlots = monthSlots.filter(s => {
        const d = new Date(s.date);
        const day = d.getDate();
        return day >= w.minDay && day <= Math.min(w.maxDay, daysInMonth);
      });

      const wItems = participationItems.filter(i => {
        return i.day >= w.minDay && i.day <= Math.min(w.maxDay, daysInMonth);
      });

      const taught = wItems.filter(i => i.role === "HOST").length;
      const observed = wItems.filter(i => i.role === "OBSERVER").length;
      const surprise = wSlots.filter(s => s.requestOrigin === "SURPRISE" || s.requestOrigin === "ADMIN_REQUEST").length;
      const total = wSlots.length;

      return {
        key: w.key,
        name: w.shortLabel,
        fullName: w.label,
        desc: w.desc,
        minDay: w.minDay,
        maxDay: Math.min(w.maxDay, daysInMonth),
        totalSlots: total,
        taught,
        observed,
        surprise,
        pct: totalSlotsCount > 0 ? Math.round((total / totalSlotsCount) * 100) : 0,
        slots: wSlots
      };
    });
  }, [monthSlots, participationItems, daysInMonth, totalSlotsCount]);

  // 2. Phân bổ theo 3 Chặng (Đầu tháng, Giữa tháng, Cuối tháng)
  const phaseStats = useMemo(() => {
    return PHASES_DEF.map(p => {
      const pSlots = monthSlots.filter(s => {
        const d = new Date(s.date);
        const day = d.getDate();
        return day >= p.minDay && day <= Math.min(p.maxDay, daysInMonth);
      });

      const pItems = participationItems.filter(i => {
        return i.day >= p.minDay && i.day <= Math.min(p.maxDay, daysInMonth);
      });

      const total = pSlots.length;
      const pct = totalSlotsCount > 0 ? Math.round((total / totalSlotsCount) * 100) : 0;

      return {
        key: p.key,
        name: p.shortLabel,
        fullName: p.label,
        minDay: p.minDay,
        maxDay: Math.min(p.maxDay, daysInMonth),
        totalSlots: total,
        taught: pItems.filter(i => i.role === "HOST").length,
        observed: pItems.filter(i => i.role === "OBSERVER").length,
        pct,
        color: p.color,
        slots: pSlots
      };
    });
  }, [monthSlots, participationItems, daysInMonth, totalSlotsCount]);

  // 3. Phân bổ chi tiết từng ngày (1 -> 31)
  const dayTimelineData = useMemo(() => {
    const list = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(curYear, curMonth - 1, day);
      const dowIndex = dayDate.getDay();
      const dowName = DAY_OF_WEEK_LABELS[dowIndex];
      const isWeekend = dowIndex === 0 || dowIndex === 6;

      const dSlots = monthSlots.filter(s => {
        const d = new Date(s.date);
        return d.getDate() === day;
      });

      const dItems = participationItems.filter(i => i.day === day);
      const taught = dItems.filter(i => i.role === "HOST").length;
      const observed = dItems.filter(i => i.role === "OBSERVER").length;
      const surprise = dSlots.filter(s => s.requestOrigin === "SURPRISE" || s.requestOrigin === "ADMIN_REQUEST").length;

      list.push({
        day,
        label: `N${day}`,
        fullDateStr: `${String(day).padStart(2, "0")}/${String(curMonth).padStart(2, "0")}`,
        dayOfWeek: dowName,
        isWeekend,
        totalSlots: dSlots.length,
        taught,
        observed,
        surprise,
        slots: dSlots
      });
    }
    return list;
  }, [monthSlots, participationItems, daysInMonth, curYear, curMonth]);

  // 4. Phân bổ theo Thứ trong tuần (T2 -> T7, CN)
  const dayOfWeekStats = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    monthSlots.forEach(s => {
      const d = new Date(s.date);
      const dow = d.getDay();
      counts[dow] = (counts[dow] || 0) + 1;
    });

    // Sắp xếp từ Thứ 2 đến Chủ nhật
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map(dow => ({
      dow,
      name: DAY_OF_WEEK_LABELS[dow],
      count: counts[dow],
      pct: totalSlotsCount > 0 ? Math.round((counts[dow] / totalSlotsCount) * 100) : 0
    }));
  }, [monthSlots, totalSlotsCount]);

  // 5. Cảnh báo thông minh: Đánh giá nhịp độ & Dồn lịch cuối tháng
  const clumpingAnalysis = useMemo(() => {
    const latePhase = phaseStats.find(p => p.key === "LATE");
    const lateSlots = latePhase?.totalSlots || 0;
    const latePct = latePhase?.pct || 0;

    const week4 = weekStats.find(w => w.key === "W4");
    const week4Pct = week4?.pct || 0;

    const earlyPhase = phaseStats.find(p => p.key === "EARLY");
    const earlyPct = earlyPhase?.pct || 0;

    // Peak day
    let peakDay = { day: 0, count: 0, dateStr: "" };
    dayTimelineData.forEach(d => {
      if (d.totalSlots > peakDay.count) {
        peakDay = { day: d.day, count: d.totalSlots, dateStr: d.fullDateStr };
      }
    });

    // Peak week
    let peakWeek = weekStats[0];
    weekStats.forEach(w => {
      if (w.totalSlots > (peakWeek?.totalSlots || 0)) {
        peakWeek = w;
      }
    });

    // Đánh giá nhịp độ
    let status: "BALANCED" | "MILD_LATE" | "SEVERE_LATE" | "EARLY_HEAVY" | "LOW_ACTIVITY" = "BALANCED";
    let message = "";
    let alertClass = "";

    if (totalSlotsCount === 0) {
      status = "LOW_ACTIVITY";
      message = "Chưa có tiết dự giờ nào diễn ra trong tháng này.";
      alertClass = "bg-slate-50 border-slate-200 text-slate-600";
    } else if (latePct >= 60 || week4Pct >= 60) {
      status = "SEVERE_LATE";
      message = `Cảnh báo dồn lịch cuối tháng: Có tới ${latePct}% số tiết (${lateSlots}/${totalSlotsCount} tiết) tập trung từ ngày 21 trở đi. Cần chủ động phân bổ từ đầu tháng để tránh áp lực chuyên môn.`;
      alertClass = "bg-rose-50 border-rose-200 text-rose-800";
    } else if (latePct >= 45 || week4Pct >= 45) {
      status = "MILD_LATE";
      message = `Hơi lệch về cuối tháng: ${latePct}% số tiết diễn ra ở chặng cuối tháng. Khuyến khích giáo viên mở tiết đều đặn hơn ở các tuần 1 và 2.`;
      alertClass = "bg-amber-50 border-amber-200 text-amber-800";
    } else if (earlyPct >= 50) {
      status = "EARLY_HEAVY";
      message = `Tập trung hoàn thành sớm: ${earlyPct}% số tiết được thực hiện ngay trong 10 ngày đầu tháng. Tiến độ rất tích cực.`;
      alertClass = "bg-sky-50 border-sky-200 text-sky-800";
    } else {
      status = "BALANCED";
      message = `Phân bổ nhịp độ rất tốt: Tiến độ dự giờ được rải đều qua các tuần trong tháng, đảm bảo tính liên tục và chất lượng sinh hoạt chuyên môn.`;
      alertClass = "bg-emerald-50 border-emerald-200 text-emerald-800";
    }

    return {
      status,
      message,
      alertClass,
      latePct,
      earlyPct,
      week4Pct,
      peakDay,
      peakWeek
    };
  }, [phaseStats, weekStats, totalSlotsCount, dayTimelineData]);

  // 6. Ma trận nhịp độ từng giáo viên trong tháng
  const teacherPaceMatrix = useMemo(() => {
    return teachers.map(t => {
      // Find all activities of this teacher in month
      const tItems = participationItems.filter(i => i.teacherId === t.id);
      const taughtItems = tItems.filter(i => i.role === "HOST");
      const observedItems = tItems.filter(i => i.role === "OBSERVER");

      const w1Count = tItems.filter(i => i.day >= 1 && i.day <= 7).length;
      const w2Count = tItems.filter(i => i.day >= 8 && i.day <= 14).length;
      const w3Count = tItems.filter(i => i.day >= 15 && i.day <= 21).length;
      const w4Count = tItems.filter(i => i.day >= 22).length;
      const totalActivities = tItems.length;

      // Đánh giá nhịp độ giáo viên
      let paceEvaluation: {
        label: string;
        badgeClass: string;
        type: "BALANCED" | "LATE" | "EARLY" | "NONE";
      };

      if (totalActivities === 0) {
        paceEvaluation = {
          label: "Chưa có tiết",
          badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
          type: "NONE"
        };
      } else if (w4Count === totalActivities || (totalActivities >= 2 && w4Count / totalActivities >= 0.75)) {
        paceEvaluation = {
          label: "Dồn tuần cuối",
          badgeClass: "bg-rose-100 text-rose-800 border-rose-200 font-black animate-pulse",
          type: "LATE"
        };
      } else if (w1Count + w2Count === totalActivities) {
        paceEvaluation = {
          label: "Xong sớm đầu tháng",
          badgeClass: "bg-teal-100 text-teal-800 border-teal-200 font-bold",
          type: "EARLY"
        };
      } else {
        paceEvaluation = {
          label: "Phân bổ đều",
          badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold",
          type: "BALANCED"
        };
      }

      return {
        teacher: t,
        taughtCount: taughtItems.length,
        observedCount: observedItems.length,
        totalActivities,
        w1Count,
        w2Count,
        w3Count,
        w4Count,
        paceEvaluation,
        items: tItems
      };
    }).sort((a, b) => {
      // Sắp xếp: có hoạt động lên trước, dồn tuần cuối lên đầu để tiện nhắc nhở
      if (a.paceEvaluation.type === "LATE" && b.paceEvaluation.type !== "LATE") return -1;
      if (b.paceEvaluation.type === "LATE" && a.paceEvaluation.type !== "LATE") return 1;
      return b.totalActivities - a.totalActivities;
    });
  }, [teachers, participationItems]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const [y, m] = activeMonthKey.split("-");
      const deptName = department?.name || "ToChuyenMon";

      // Sheet 1: Tổng hợp phân bổ theo tuần
      const sheet1Data = weekStats.map((w, idx) => ({
        "STT": idx + 1,
        "Tuần trong tháng": w.fullName,
        "Mô tả": w.desc,
        "Từ ngày - Đến ngày": `Ngày ${w.minDay} đến ${w.maxDay}`,
        "Tổng số tiết": w.totalSlots,
        "Tiết trực tiếp dạy": w.taught,
        "Tiết đi dự giờ": w.observed,
        "Tiết đột xuất": w.surprise,
        "Tỷ lệ % tháng": `${w.pct}%`
      }));

      // Sheet 2: Nhịp độ từng giáo viên
      const sheet2Data = teacherPaceMatrix.map((row, idx) => ({
        "STT": idx + 1,
        "Mã GV": row.teacher.teacherCode || "",
        "Họ và tên": row.teacher.teacherName,
        "Chức vụ": row.teacher.position || "Giáo viên",
        "Tuần 1 (1-7)": row.w1Count,
        "Tuần 2 (8-14)": row.w2Count,
        "Tuần 3 (15-21)": row.w3Count,
        "Tuần 4+ (22-hết)": row.w4Count,
        "Tổng tiết dạy": row.taughtCount,
        "Tổng tiết dự": row.observedCount,
        "Tổng hoạt động": row.totalActivities,
        "Đánh giá nhịp độ": row.paceEvaluation.label
      }));

      // Sheet 3: Danh sách chi tiết các tiết trong tháng
      const sheet3Data = monthSlots.map((s, idx) => {
        const d = new Date(s.date);
        return {
          "STT": idx + 1,
          "Ngày": d.toLocaleDateString("vi-VN"),
          "Thứ": DAY_OF_WEEK_LABELS[d.getDay()],
          "Giờ / Tiết": s.startTime || "",
          "Môn học": s.subjectName || "",
          "Lớp": s.className || "",
          "Phòng": s.room || "",
          "Chủ đề / Bài dạy": s.topic || "",
          "Giáo viên dạy": s.teacher?.teacherName || "",
          "Hình thức": s.requestOrigin === "SURPRISE" ? "Đột xuất" : "Kế hoạch",
          "Số người đi dự": (s.registrations || []).length,
          "Danh sách người dự": (s.registrations || []).map((r: any) => r.teacher?.teacherName).filter(Boolean).join(", ")
        };
      });

      const workbook = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
      const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
      const ws3 = XLSX.utils.json_to_sheet(sheet3Data);

      XLSX.utils.book_append_sheet(workbook, ws1, "Phân Bổ Theo Tuần");
      XLSX.utils.book_append_sheet(workbook, ws2, "Nhịp Độ Giáo Viên");
      XLSX.utils.book_append_sheet(workbook, ws3, "Danh Sách Tiết Trong Tháng");

      XLSX.writeFile(workbook, `BaoCao_NhipDo_DuGio_${deptName}_Thang_${m}_${y}.xlsx`);
    } catch (err) {
      console.error("Export Excel Error:", err);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & MONTH TIMELINE FILTER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#003B3A] via-[#00A19A] to-[#01A49D] text-white flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0">
              <CalendarRange className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-[#003B3A] uppercase tracking-tight">
                  Theo Dõi Phân Bổ Thời Gian Dự Giờ Trong Tháng
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-100 text-[#003B3A] border border-teal-200">
                  Tháng {curMonth}/{curYear}
                </span>
                {clumpingAnalysis.status === "SEVERE_LATE" && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200 animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Cảnh báo dồn lịch
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Phân tích nhịp độ tổ chức dự giờ theo 4 tuần, 3 chặng tiến độ và biểu đồ mật độ 31 ngày trong tháng.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
              title="Xuất bảng nhịp độ ra file Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel Nhịp Độ</span>
            </button>
          </div>
        </div>

        {/* Month Quick Selector Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              Chọn tháng theo dõi:
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">
              Tổng số {totalSlotsCount} tiết trong tháng
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {availableMonths.map(m => {
              const isSelected = activeMonthKey === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setActiveMonthKey(m.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-[#003B3A] to-[#00A19A] text-white shadow-md shadow-teal-900/20 scale-[1.02]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter sub-bar: Role, Type, Teacher */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Vai trò */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">
              Góc nhìn hoạt động
            </label>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setRoleFilter("ALL")}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  roleFilter === "ALL" ? "bg-white text-teal-800 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cả Dạy & Dự
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("TAUGHT")}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  roleFilter === "TAUGHT" ? "bg-white text-teal-800 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tiết dạy
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("OBSERVED")}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  roleFilter === "OBSERVED" ? "bg-white text-teal-800 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tiết đi dự
              </button>
            </div>
          </div>

          {/* Hình thức */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">
              Hình thức tiết dạy
            </label>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  typeFilter === "ALL" ? "bg-white text-teal-800 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("PLAN")}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  typeFilter === "PLAN" ? "bg-white text-teal-800 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Kế hoạch
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("SURPRISE")}
                className={`flex-1 py-1 px-2 rounded-lg font-bold text-center transition cursor-pointer ${
                  typeFilter === "SURPRISE" ? "bg-white text-amber-800 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đột xuất
              </button>
            </div>
          </div>

          {/* Giáo viên cụ thể */}
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-wider">
              Lọc theo Giáo viên
            </label>
            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">Toàn bộ giáo viên ({teachers.length} GV)</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS & SMART ALERT */}
      <div className="space-y-4">
        {/* Smart Clumping Alert Banner */}
        <div className={`p-4 rounded-2xl border flex items-start sm:items-center gap-3.5 transition-all shadow-2xs ${clumpingAnalysis.alertClass}`}>
          <div className="p-2 rounded-xl bg-white/80 shrink-0 shadow-2xs">
            {clumpingAnalysis.status === "SEVERE_LATE" ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
            ) : clumpingAnalysis.status === "BALANCED" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Info className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide">
                Đánh giá nhịp độ chuyên môn Tháng {curMonth}/{curYear}:
              </h4>
              <span className="text-[11px] font-bold opacity-80">
                (Cao điểm: {clumpingAnalysis.peakWeek?.fullName || "Tuần 1"} • {clumpingAnalysis.peakDay.dateStr ? `Ngày cao nhất: ${clumpingAnalysis.peakDay.dateStr} (${clumpingAnalysis.peakDay.count} tiết)` : "Chưa có tiết"})
              </span>
            </div>
            <p className="text-xs font-semibold mt-0.5 leading-relaxed">
              {clumpingAnalysis.message}
            </p>
          </div>
        </div>

        {/* 4 Cards Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Tổng tiết */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">
                Tổng Tiết Trong Tháng
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <CalendarRange className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#003B3A]">
                  {totalSlotsCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">tiết dạy</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-slate-500">
                <span className="text-teal-700">{hostCount} lượt dạy</span>
                <span>•</span>
                <span className="text-sky-700">{observerCount} lượt dự</span>
              </div>
            </div>
          </div>

          {/* Card 2: Chặng Cuối Tháng (21 - Hết) */}
          <div className={`bg-white rounded-3xl border p-5 shadow-2xs flex flex-col justify-between ${
            clumpingAnalysis.latePct >= 60 ? "border-rose-300 ring-2 ring-rose-200" : "border-slate-200/80"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">
                Tỷ Lệ Cuối Tháng (21 - Hết)
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                clumpingAnalysis.latePct >= 60 ? "bg-rose-100 text-rose-700" : "bg-amber-50 text-amber-700"
              }`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black ${
                  clumpingAnalysis.latePct >= 60 ? "text-rose-600" : "text-amber-600"
                }`}>
                  {clumpingAnalysis.latePct}%
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  ({phaseStats.find(p => p.key === "LATE")?.totalSlots || 0} tiết)
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500">
                {clumpingAnalysis.latePct >= 60 ? (
                  <span className="text-rose-600 font-black">⚠️ Dồn lịch cao điểm</span>
                ) : (
                  <span className="text-slate-500">Ngưỡng an toàn (&lt; 50%)</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Tuần Cao Điểm Nhất */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">
                Tuần Cao Điểm Nhất
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-lg sm:text-xl font-black text-indigo-900">
                  {clumpingAnalysis.peakWeek?.shortLabel || "Chưa có"}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  ({clumpingAnalysis.peakWeek?.totalSlots || 0} tiết)
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500 truncate">
                {clumpingAnalysis.peakWeek?.fullName} ({clumpingAnalysis.peakWeek?.pct || 0}%)
              </div>
            </div>
          </div>

          {/* Card 4: Số Tiết Đột Xuất */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">
                Tiết Dự Giờ Đột Xuất
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-600">
                  {surpriseCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  / {totalSlotsCount} tiết
                </span>
              </div>
              <div className="mt-1.5 text-[11px] font-bold text-slate-500">
                Chiếm {totalSlotsCount > 0 ? Math.round((surpriseCount / totalSlotsCount) * 100) : 0}% tổng số tiết
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. VISUAL CHARTS (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART 1: TIẾN ĐỘ THEO 4 TUẦN (GROUPED / STACKED BAR CHART) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Biểu Đồ Phân Bổ Tiến Độ Theo 4 Tuần Trong Tháng
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                So sánh số lượng tiết diễn ra giữa các tuần (Nhấp vào cột tuần để xem chi tiết)
              </p>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 self-start sm:self-auto">
              Tháng {curMonth}/{curYear}
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekStats}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const item = e.activePayload[0].payload;
                    setSelectedDetailWeek(item.key);
                    setModalSlotList({
                      title: `Danh sách tiết trong ${item.fullName} (${item.totalSlots} tiết)`,
                      slots: item.slots || []
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: "#64748B" }}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[200px]">
                          <div className="font-black text-teal-300 border-b border-slate-700 pb-1 flex items-center justify-between">
                            <span>{data.fullName}</span>
                            <span className="text-[10px] bg-teal-500/20 px-1.5 py-0.5 rounded-sm">{data.pct}%</span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-medium">{data.desc}</div>
                          <div className="pt-1 space-y-1 text-[11px]">
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-300">Tổng số tiết:</span>
                              <span className="text-white">{data.totalSlots} tiết</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-300">Tiết dạy:</span>
                              <span>{data.taught}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sky-300">Tiết đi dự:</span>
                              <span>{data.observed}</span>
                            </div>
                            {data.surprise > 0 && (
                              <div className="flex justify-between text-amber-300 font-bold">
                                <span>Tiết đột xuất:</span>
                                <span>{data.surprise}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", fontWeight: 700, paddingTop: "10px" }}
                />
                <Bar dataKey="taught" name="Tiết dạy" fill="#003B3A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="observed" name="Tiết đi dự" fill="#00A19A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="surprise" name="Đột xuất" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Week cards row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            {weekStats.map(w => (
              <button
                key={w.key}
                type="button"
                onClick={() => {
                  setModalSlotList({
                    title: `Danh sách tiết trong ${w.fullName} (${w.totalSlots} tiết)`,
                    slots: w.slots || []
                  });
                }}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 transition text-left cursor-pointer group"
              >
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-teal-700">
                  {w.shortLabel}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg font-black text-slate-800 group-hover:text-teal-900">
                    {w.totalSlots}
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    w.pct >= 50 ? "bg-rose-100 text-rose-800" : "bg-slate-200/70 text-slate-700"
                  }`}>
                    {w.pct}%
                  </span>
                </div>
                <div className="text-[9.5px] text-slate-400 mt-0.5 truncate">
                  Ngày {w.minDay}-{w.maxDay}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CHART 2: TỶ LỆ 3 CHẶNG TRONG THÁNG (DONUT / PIE CHART) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Tỷ Lệ 3 Chặng Trong Tháng
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Đầu tháng (1-10) vs Giữa tháng (11-20) vs Cuối tháng (21-hết)
            </p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {totalSlotsCount === 0 ? (
              <div className="text-center text-slate-400 text-xs font-bold py-12">
                Chưa có dữ liệu tiết dự giờ
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={phaseStats}
                    dataKey="totalSlots"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {phaseStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-1">
                            <div className="font-black text-teal-300">{data.fullName}</div>
                            <div className="flex justify-between gap-4 font-bold">
                              <span>Số tiết:</span>
                              <span>{data.totalSlots} ({data.pct}%)</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Phase breakdown legends */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {phaseStats.map(p => (
              <div
                key={p.key}
                onClick={() => {
                  setModalSlotList({
                    title: `Danh sách tiết trong ${p.fullName} (${p.totalSlots} tiết)`,
                    slots: p.slots || []
                  });
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-bold text-slate-700">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900">{p.totalSlots} tiết</span>
                  <span className="text-[10.5px] font-black text-slate-500 w-10 text-right">
                    {p.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHART 3: MẬT ĐỘ TỪNG NGÀY TRONG THÁNG (AREA / HISTOGRAM CHART 1 -> 31) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              Đường Mật Độ Dự Giờ Từng Ngày Trong Tháng (Ngày 01 đến {daysInMonth})
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Phát hiện chính xác các đỉnh điểm cao độ (Peaks) trong tháng. Nhấp vào ngày bất kỳ để xem danh sách tiết.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-3 rounded-md bg-teal-600 inline-block" /> Tiết dạy
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-3 rounded-md bg-teal-300 inline-block" /> Tiết dự
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dayTimelineData}
              margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  const d = e.activePayload[0].payload;
                  if (d.totalSlots > 0) {
                    setModalSlotList({
                      title: `Danh sách tiết ngày ${d.fullDateStr} (${d.dayOfWeek}) - ${d.totalSlots} tiết`,
                      slots: d.slots || []
                    });
                  }
                }
              }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A19A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00A19A" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTaught" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#003B3A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#003B3A" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fontWeight: 700, fill: "#475569" }}
                interval={daysInMonth > 20 ? 1 : 0}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fontWeight: 600, fill: "#64748B" }}
                axisLine={{ stroke: "#CBD5E1" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 min-w-[190px]">
                        <div className="font-black text-teal-300 border-b border-slate-700 pb-1 flex items-center justify-between">
                          <span>{data.fullDateStr} ({data.dayOfWeek})</span>
                          {data.isWeekend && <span className="text-[10px] text-amber-400">Cuối tuần</span>}
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-300">Tổng số tiết:</span>
                            <span className="text-white">{data.totalSlots} tiết</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-teal-300">Tiết trực tiếp dạy:</span>
                            <span>{data.taught}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sky-300">Tiết đi dự giờ:</span>
                            <span>{data.observed}</span>
                          </div>
                          {data.surprise > 0 && (
                            <div className="flex justify-between text-amber-300 font-bold">
                              <span>Đột xuất:</span>
                              <span>{data.surprise}</span>
                            </div>
                          )}
                        </div>
                        {data.totalSlots > 0 && (
                          <div className="pt-1 border-t border-slate-800 text-[10px] text-teal-400 text-center font-bold">
                            Nhấp để xem {data.totalSlots} tiết chi tiết
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="totalSlots"
                name="Tổng tiết"
                stroke="#00A19A"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="taught"
                name="Tiết dạy"
                stroke="#003B3A"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTaught)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Day of Week Summary Pills (T2 -> CN) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
            Phân bố theo ngày trong tuần:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {dayOfWeekStats.map(d => (
              <div
                key={d.dow}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                  d.count > 0 ? "bg-teal-50 border-teal-200 text-teal-900 font-black" : "bg-slate-50 border-slate-200 text-slate-400 font-semibold"
                }`}
              >
                <span>{d.name}:</span>
                <span className="font-black">{d.count} tiết</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TEACHER PACE MATRIX TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#003B3A] to-[#00A19A] text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-slate-900 text-base uppercase tracking-tight">
                  Bảng Theo Dõi Nhịp Độ Từng Giáo Viên Trong Tháng
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700">
                  {teacherPaceMatrix.length} Giáo viên
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Đánh giá mức độ rải đều qua các tuần hay bị dồn vào tuần cuối của từng giáo viên trong tổ.
              </p>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#003B3A] text-white font-black uppercase text-[10.5px] tracking-wider">
                <th className="p-3 text-center w-12 border-r border-teal-900/40">TT</th>
                <th className="p-3 border-r border-teal-900/40 min-w-[200px]">Giáo Viên</th>
                <th className="p-3 text-center border-r border-teal-900/40 w-24">
                  <div>Tuần 1</div>
                  <div className="text-[9px] font-normal text-teal-200/80">01 - 07</div>
                </th>
                <th className="p-3 text-center border-r border-teal-900/40 w-24">
                  <div>Tuần 2</div>
                  <div className="text-[9px] font-normal text-teal-200/80">08 - 14</div>
                </th>
                <th className="p-3 text-center border-r border-teal-900/40 w-24">
                  <div>Tuần 3</div>
                  <div className="text-[9px] font-normal text-teal-200/80">15 - 21</div>
                </th>
                <th className="p-3 text-center border-r border-teal-900/40 w-28">
                  <div>Tuần 4+</div>
                  <div className="text-[9px] font-normal text-teal-200/80">22 - Cuối</div>
                </th>
                <th className="p-3 text-center border-r border-teal-900/40 w-28">
                  <div>Tổng Tiết</div>
                  <div className="text-[9px] font-normal text-teal-200/80">Dạy • Dự</div>
                </th>
                <th className="p-3 text-center border-r border-teal-900/40 min-w-[150px]">
                  Đánh Giá Nhịp Độ
                </th>
                <th className="p-3 text-center w-28">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {teacherPaceMatrix.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                    Không tìm thấy dữ liệu giáo viên trong tổ chuyên môn này.
                  </td>
                </tr>
              ) : (
                teacherPaceMatrix.map((row, idx) => (
                  <tr
                    key={row.teacher.id}
                    className="hover:bg-teal-50/40 transition group"
                  >
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 border-r border-slate-100">
                      <div className="font-black text-slate-900 group-hover:text-teal-800 transition">
                        {row.teacher.teacherName}
                      </div>
                      <div className="text-[10.5px] text-slate-400 font-medium">
                        {row.teacher.position || "Giáo viên"} {row.teacher.teacherCode ? `• ${row.teacher.teacherCode}` : ""}
                      </div>
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                        row.w1Count > 0 ? "bg-teal-100 text-teal-900" : "text-slate-300"
                      }`}>
                        {row.w1Count > 0 ? row.w1Count : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                        row.w2Count > 0 ? "bg-teal-100 text-teal-900" : "text-slate-300"
                      }`}>
                        {row.w2Count > 0 ? row.w2Count : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                        row.w3Count > 0 ? "bg-teal-100 text-teal-900" : "text-slate-300"
                      }`}>
                        {row.w3Count > 0 ? row.w3Count : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        row.w4Count > 0
                          ? row.w4Count >= 2
                            ? "bg-rose-100 text-rose-800 border border-rose-200 font-black"
                            : "bg-teal-100 text-teal-900"
                          : "text-slate-300"
                      }`}>
                        {row.w4Count > 0 ? row.w4Count : "—"}
                      </span>
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <div className="font-black text-slate-900 text-sm">
                        {row.totalActivities}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {row.taughtCount} dạy • {row.observedCount} dự
                      </div>
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] border font-black ${row.paceEvaluation.badgeClass}`}>
                        {row.paceEvaluation.label}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const tSlots = monthSlots.filter(s => {
                            return s.teacherId === row.teacher.id || (s.registrations || []).some((r: any) => r.teacherId === row.teacher.id);
                          });
                          setModalSlotList({
                            title: `Lịch sử dự giờ Tháng ${curMonth}/${curYear} - ${row.teacher.teacherName}`,
                            slots: tSlots
                          });
                        }}
                        disabled={row.totalActivities === 0}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Chi tiết ({row.totalActivities})
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL: POPUP VIEW SLOTS */}
      {modalSlotList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setModalSlotList(null)}
        >
          <div
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <CalendarRange className="w-5 h-5 text-teal-300" />
                <h4 className="font-black text-sm sm:text-base leading-snug">
                  {modalSlotList.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalSlotList(null)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {modalSlotList.slots.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs">
                  Không có tiết dự giờ nào trong mục đã chọn.
                </div>
              ) : (
                modalSlotList.slots.map((s, idx) => {
                  const d = new Date(s.date);
                  const isSurprise = s.requestOrigin === "SURPRISE" || s.requestOrigin === "ADMIN_REQUEST";
                  const regCount = (s.registrations || []).length;
                  const firstEval = s.registrations?.[0]?.evaluation;

                  return (
                    <div
                      key={s.id || idx}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-teal-300 bg-slate-50/60 hover:bg-teal-50/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-teal-800 text-sm">
                            {s.topic || "Tiết dạy chuyên môn"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                            {s.subjectName || "Môn học"}
                          </span>
                          {isSurprise && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                              Đột xuất
                            </span>
                          )}
                        </div>

                        <div className="text-slate-500 font-medium flex items-center gap-3 flex-wrap text-[11.5px]">
                          <span>
                            📅 {d.toLocaleDateString("vi-VN")} ({DAY_OF_WEEK_LABELS[d.getDay()]})
                          </span>
                          <span>⏰ {s.startTime || "Tiết học"}</span>
                          <span>🏫 {s.className || "Lớp"}</span>
                          <span>📍 Phòng {s.room || "—"}</span>
                        </div>

                        <div className="text-[11px] text-slate-600 font-semibold pt-1">
                          GV Dạy: <strong className="text-slate-900">{s.teacher?.teacherName}</strong>
                          {" • "}
                          Người dự: <span className="text-teal-700 font-bold">{regCount} thầy cô</span>
                        </div>
                      </div>

                      {/* Modal Action: Open Eval if available */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {firstEval && openEvalModal ? (
                          <button
                            type="button"
                            onClick={() => {
                              openEvalModal(firstEval, s);
                              setModalSlotList(null);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-white hover:bg-teal-100 border border-teal-200 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem phiếu ĐG</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium px-2 py-1">
                            {s.status === "COMPLETED" ? "Đã hoàn thành" : "Đã đăng ký"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
              <span>Tổng số: {modalSlotList.slots.length} tiết</span>
              <button
                type="button"
                onClick={() => setModalSlotList(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer font-bold"
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
