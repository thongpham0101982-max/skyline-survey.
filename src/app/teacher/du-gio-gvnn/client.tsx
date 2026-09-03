"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  User,
  Users,
  Award,
  TrendingUp,
  Target,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
  Printer,
  Search,
  MessageSquare,
  HelpCircle,
  BarChart3,
  Layers,
  Check,
  Star
} from "lucide-react";
import { createForeignObservationWithEvaluation } from "./actions";

export interface IndicatorConfig {
  id: number;
  section: string;
  sectionTitle: string;
  label: string;
  text: string;
  vnText: string;
  quickEvidence: string[];
  quickImpact: string[];
}

const ESL_INDICATORS: IndicatorConfig[] = [
  {
    id: 14,
    section: "D",
    sectionTitle: "D. CURRICULUM IMPLEMENTATION",
    label: "Indicator 14",
    text: "The planned content is appropriate for the students' current level.",
    vnText: "Nội dung bài dạy phù hợp với trình độ hiện tại của học sinh.",
    quickEvidence: [
      "Appropriate lexical & grammar difficulty",
      "Well-graded target language tasks",
      "Visual & contextual scaffolding used",
      "Challenging yet accessible for learners"
    ],
    quickImpact: [
      "High comprehension rate across the class",
      "Students actively engaged without frustration",
      "Over 85% accurately completed core tasks"
    ]
  },
  {
    id: 15,
    section: "D",
    sectionTitle: "D. CURRICULUM IMPLEMENTATION",
    label: "Indicator 15",
    text: "The amount of curriculum content is realistic within the allocated teaching time.",
    vnText: "Khối lượng kiến thức phù hợp với thời lượng tiết dạy.",
    quickEvidence: [
      "Smooth lesson staging & balanced timing",
      "Sufficient time for free production/wrap-up",
      "Content was not rushed nor lagging",
      "Adequate practice for all main stages"
    ],
    quickImpact: [
      "Learners had ample time to practice & produce",
      "Students consolidated key targets effectively",
      "Pacing maintained steady student focus"
    ]
  },
  {
    id: 16,
    section: "D",
    sectionTitle: "D. CURRICULUM IMPLEMENTATION",
    label: "Indicator 16",
    text: "Teaching materials/resources support effective curriculum delivery.",
    vnText: "Tài liệu, học liệu hỗ trợ hiệu quả cho việc truyền tải bài học.",
    quickEvidence: [
      "Effective use of flashcards, slides & realia",
      "Engaging interactive digital games/media",
      "Clear, well-designed worksheets & props",
      "Audio/visual aids enhanced comprehension"
    ],
    quickImpact: [
      "Visual realia stimulated target language recall",
      "Increased student enthusiasm & participation",
      "Multi-sensory aids assisted struggling learners"
    ]
  },
  {
    id: 17,
    section: "D",
    sectionTitle: "D. CURRICULUM IMPLEMENTATION",
    label: "Indicator 17",
    text: "The teacher is able to implement the curriculum as intended.",
    vnText: "Giáo viên thực hiện đúng định hướng và mục tiêu chương trình.",
    quickEvidence: [
      "Aligned with unit syllabus & Cambridge/MoET standards",
      "Mastery of language structures demonstrated",
      "Consistent target language instruction",
      "Communicative Language Teaching (CLT) applied"
    ],
    quickImpact: [
      "Achieved targeted language outcomes for the unit",
      "Seamless progression toward term objectives",
      "Standardized English proficiency development"
    ]
  },
  {
    id: 18,
    section: "E",
    sectionTitle: "E. ASSESSMENT & STUDENT PROGRESS",
    label: "Indicator 18",
    text: "The teacher uses formative assessment/checks for understanding regularly.",
    vnText: "Thường xuyên đánh giá quá trình và kiểm tra mức độ hiểu bài.",
    quickEvidence: [
      "Systematic Concept Checking Questions (CCQs)",
      "Instruction Checking Questions (ICQs) before tasks",
      "Elicitation rather than teacher-led giving of answers",
      "Thumbs up/down, mini-whiteboards or quick polls"
    ],
    quickImpact: [
      "Misconceptions detected and corrected immediately",
      "Every student held accountable for understanding",
      "Zero ambiguity during independent pair practice"
    ]
  },
  {
    id: 19,
    section: "E",
    sectionTitle: "E. ASSESSMENT & STUDENT PROGRESS",
    label: "Indicator 19",
    text: "Students receive clear feedback that helps them improve.",
    vnText: "Học sinh nhận được phản hồi rõ ràng giúp tiến bộ.",
    quickEvidence: [
      "Constructive delayed error correction (DEC)",
      "Positive reinforcement & targeted praising",
      "Pronunciation & phonics modeling on the spot",
      "Peer-correction routines facilitated well"
    ],
    quickImpact: [
      "Students self-corrected with growing confidence",
      "Encouraging feedback boosted risk-taking in speaking",
      "Visible improvement within the same lesson cycle"
    ]
  },
  {
    id: 20,
    section: "E",
    sectionTitle: "E. ASSESSMENT & STUDENT PROGRESS",
    label: "Indicator 20",
    text: "Students who are not making expected progress are identified and supported.",
    vnText: "Học sinh chưa đạt tiến độ được nhận diện và hỗ trợ kịp thời.",
    quickEvidence: [
      "Proactive teacher monitoring during group work",
      "Tiered scaffolding for lower-proficiency students",
      "Strategic student pairing (stronger + developing)",
      "Individual check-ins and tailored prompts"
    ],
    quickImpact: [
      "Struggling students successfully produced target phrases",
      "Inclusive atmosphere; no learner left behind",
      "Clear documentation of students needing extra clinic"
    ]
  },
  {
    id: 1,
    section: "ABC",
    sectionTitle: "A-C. CLASSROOM INSTRUCTION & IMMERSION CLIMATE",
    label: "Indicator 1",
    text: "Clear learning intentions, staging, and structured transitions.",
    vnText: "Mục tiêu bài dạy rõ ràng, tiến trình chặt chẽ và chuyển giao mượt mà.",
    quickEvidence: [
      "Clear aim shared at the start of class",
      "Logical staging: Warm-up -> PPP / TBL -> Production",
      "Smooth, predictable transition routines"
    ],
    quickImpact: [
      "Learners were primed and aware of lesson goals",
      "Minimal downtime between activity shifts"
    ]
  },
  {
    id: 2,
    section: "ABC",
    sectionTitle: "A-C. CLASSROOM INSTRUCTION & IMMERSION CLIMATE",
    label: "Indicator 2",
    text: "Optimal Teacher Talk Time (TTT) vs. Student Talk Time (STT).",
    vnText: "Cân đối thời gian nói của GV và tối đa hóa thời gian nói của HS.",
    quickEvidence: [
      "TTT kept concise; teacher acted as facilitator",
      "Maximized pair work and communicative games",
      "Students spoke English throughout the main stages"
    ],
    quickImpact: [
      "High volume of authentic oral English output",
      "Learners took ownership of classroom conversations"
    ]
  },
  {
    id: 3,
    section: "ABC",
    sectionTitle: "A-C. CLASSROOM INSTRUCTION & IMMERSION CLIMATE",
    label: "Indicator 3",
    text: "Positive English immersion environment, strong rapport, and active engagement.",
    vnText: "Môi trường học tập tích cực, quan hệ sư phạm tốt và tạo hứng thú cao.",
    quickEvidence: [
      "High energy, encouraging tone, genuine rapport",
      "Consistent 100% English immersion atmosphere",
      "Motivating reward system and respectful culture"
    ],
    quickImpact: [
      "Students enthusiastic, confident, and joyful in speaking",
      "Zero reluctance to participate in front of peers"
    ]
  }
];

const RATING_OPTIONS = [
  { value: "4", label: "4 - Strong Practice", short: "4", badge: "bg-emerald-600 text-white", desc: "Particularly effective; worth sharing." },
  { value: "3", label: "3 - Effective", short: "3", badge: "bg-sky-600 text-white", desc: "Consistently meets expectations." },
  { value: "2", label: "2 - Developing", short: "2", badge: "bg-amber-500 text-white", desc: "Partially effective; needs refining." },
  { value: "1", label: "1 - Needs Support", short: "1", badge: "bg-rose-500 text-white", desc: "Clear challenge; requires intervention." },
  { value: "N/O", label: "N/O - Not Observed", short: "N/O", badge: "bg-slate-400 text-white", desc: "Not enough evidence / not applicable." }
];

const SKILL_OPTIONS = [
  "Speaking & Fluency",
  "Phonics & Pronunciation",
  "Listening Comprehension",
  "Reading & Vocabulary",
  "Grammar & Structure",
  "Writing & Composition",
  "CLIL / Integrated Skills"
];

const PERIOD_LIST = [
  { name: "Tiết 1", time: "07:30 - 08:15" },
  { name: "Tiết 2", time: "08:20 - 09:05" },
  { name: "Tiết 3", time: "09:20 - 10:05" },
  { name: "Tiết 4", time: "10:10 - 10:55" },
  { name: "Tiết 5", time: "13:30 - 14:15" },
  { name: "Tiết 6", time: "14:20 - 15:05" },
  { name: "Tiết 7", time: "15:10 - 15:55" },
  { name: "Tiết 8", time: "15:55 - 16:40" }
];
export function ForeignObservationClient(props: {
  currentTeacher: any;
  departments: any[];
  teachers: any[];
  campuses: any[];
  classes: any[];
  academicYears: any[];
  selectedYearId?: string;
  initialSlots?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"walkthrough" | "schedule" | "evaluations" | "kpi">("walkthrough");

  const [teacherId, setTeacherId] = useState("");
  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [className, setClassName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [period, setPeriod] = useState("Tiết 1");
  const [room, setRoom] = useState("Phòng học");
  const [topic, setTopic] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["Speaking & Fluency"]);

  const [indicatorData, setIndicatorData] = useState<
    Record<number, { rating: string; evidence: string; studentImpact: string }>
  >(() => {
    const init: Record<number, { rating: string; evidence: string; studentImpact: string }> = {};
    ESL_INDICATORS.forEach(ind => {
      init[ind.id] = { rating: "3", evidence: "", studentImpact: "" };
    });
    return init;
  });

  const [teacherVoice, setTeacherVoice] = useState({
    workingWell: "",
    challenges: "",
    curriculumAdjustments: "",
    supportNeeded: ""
  });

  const [summary, setSummary] = useState({
    keyStrengths: "",
    keyChallenges: "",
    studentProgressEvidence: "",
    studentsNeedingSupport: "",
    curriculumChallenges: "",
    teacherSuggestedFocus: "",
    supportRequired: "",
    agreedActions: ""
  });

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const englishTeachers = useMemo(() => {
    return props.teachers || [];
  }, [props.teachers]);

  const selectedTeacher = useMemo(() => {
    return englishTeachers.find((t: any) => t.id === teacherId);
  }, [englishTeachers, teacherId]);

  const teacherClasses = useMemo(() => {
    if (!selectedTeacher) return props.classes || [];
    if (selectedTeacher.classes && selectedTeacher.classes.length > 0) {
      const cls = selectedTeacher.classes.map((c: any) => c.class).filter(Boolean);
      if (cls.length > 0) return cls;
    }
    if (selectedTeacher.campusId) {
      return props.classes.filter((c: any) => c.campusId === selectedTeacher.campusId);
    }
    return props.classes || [];
  }, [selectedTeacher, props.classes]);

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value;
    setTeacherId(tid);
    const t = englishTeachers.find((x: any) => x.id === tid);
    if (t) {
      if (t.campusId) setCampusId(t.campusId);
      const avail = props.classes.filter((c: any) => c.campusId === t.campusId);
      if (avail.length > 0) {
        setClassId(avail[0].id);
        setClassName(avail[0].className);
      }
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setClassId(cid);
    const c = props.classes.find((x: any) => x.id === cid);
    if (c) {
      setClassName(c.className);
      if (c.campusId) setCampusId(c.campusId);
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleRatingChange = (id: number, rating: string) => {
    setIndicatorData(prev => ({
      ...prev,
      [id]: { ...prev[id], rating }
    }));
  };

  const handleEvidenceChange = (id: number, text: string) => {
    setIndicatorData(prev => ({
      ...prev,
      [id]: { ...prev[id], evidence: text }
    }));
  };

  const handleImpactChange = (id: number, text: string) => {
    setIndicatorData(prev => ({
      ...prev,
      [id]: { ...prev[id], studentImpact: text }
    }));
  };

  const appendQuickTag = (id: number, field: "evidence" | "studentImpact", tag: string) => {
    setIndicatorData(prev => {
      const current = prev[id]?.[field] || "";
      const updated = current ? `${current}; ${tag}` : tag;
      return {
        ...prev,
        [id]: { ...prev[id], [field]: updated }
      };
    });
  };

  const stats = useMemo(() => {
    let count4 = 0;
    let count3 = 0;
    let count2 = 0;
    let count1 = 0;
    let countNO = 0;
    let numericSum = 0;
    let numericCount = 0;

    Object.values(indicatorData).forEach(item => {
      if (item.rating === "4") {
        count4++;
        numericSum += 4;
        numericCount++;
      } else if (item.rating === "3") {
        count3++;
        numericSum += 3;
        numericCount++;
      } else if (item.rating === "2") {
        count2++;
        numericSum += 2;
        numericCount++;
      } else if (item.rating === "1") {
        count1++;
        numericSum += 1;
        numericCount++;
      } else {
        countNO++;
      }
    });

    const avg = numericCount > 0 ? numericSum / numericCount : 0;
    let suggestedRating = "Effective Practice";
    let badgeColor = "bg-sky-600 text-white";

    if (count1 > 0 || (count2 >= 3 && count4 === 0)) {
      suggestedRating = "Needs Support / Developing";
      badgeColor = "bg-rose-500 text-white";
    } else if (count4 >= 5 && count2 === 0 && count1 === 0) {
      suggestedRating = "Strong Practice (Exemplary)";
      badgeColor = "bg-emerald-600 text-white";
    } else if (count4 >= 3 && count1 === 0) {
      suggestedRating = "Proficient / Strong Practice";
      badgeColor = "bg-teal-600 text-white";
    }

    return {
      count4,
      count3,
      count2,
      count1,
      countNO,
      avg: avg.toFixed(2),
      suggestedRating,
      badgeColor
    };
  }, [indicatorData]);

  const handleAutoGenerateSummary = () => {
    const strengths: string[] = [];
    const challenges: string[] = [];
    const impacts: string[] = [];

    ESL_INDICATORS.forEach(ind => {
      const data = indicatorData[ind.id];
      if (!data) return;

      if (data.rating === "4") {
        strengths.push(
          data.evidence
            ? `${ind.text} (${data.evidence})`
            : `${ind.text} was demonstrated with high proficiency.`
        );
      } else if (data.rating === "1" || data.rating === "2") {
        challenges.push(
          data.evidence
            ? `${ind.text} - Note: ${data.evidence}`
            : `${ind.text} requires further scaffolding and refinement.`
        );
      }

      if (data.studentImpact) {
        impacts.push(data.studentImpact);
      }
    });

    setSummary(prev => ({
      ...prev,
      keyStrengths:
        strengths.length > 0
          ? strengths.map(s => `• ${s}`).join("\n")
          : "• Demonstrated strong classroom control and clear communicative staging.",
      keyChallenges:
        challenges.length > 0
          ? challenges.map(c => `• ${c}`).join("\n")
          : "• Maintain tighter pacing during the final production/wrap-up stage.",
      studentProgressEvidence:
        impacts.length > 0
          ? impacts.map(imp => `• ${imp}`).join("\n")
          : "• Over 80% of students actively produced target language during communicative activities.",
      agreedActions:
        prev.agreedActions ||
        "1. Prioritize concept-checking questions (CCQs) before independent pair work.\n2. Allocate at least 5-7 minutes for structured consolidation and formative check."
    }));

    showToast("Summary & Action Plan auto-generated from indicators!", "success");
  };

  const handleSubmit = (isDraft: boolean = false) => {
    if (!teacherId) {
      showToast("Please select the Observed Teacher first.", "error");
      return;
    }

    const payloadIndicators: Record<string, { rating: string; evidence: string; studentImpact: string }> = {};
    Object.entries(indicatorData).forEach(([k, v]) => {
      payloadIndicators[k] = v;
    });

    const payload = {
      teacherId,
      campusId,
      classId,
      className,
      date,
      period,
      room,
      topic: topic || "ESL Classroom Observation",
      targetSkills: selectedSkills,
      indicators: payloadIndicators,
      teacherVoice,
      summary,
      overallRating: stats.suggestedRating,
      totalScore: parseFloat(stats.avg),
      isDraft
    };

    startTransition(async () => {
      const res = await createForeignObservationWithEvaluation(payload);
      if (res.success) {
        showToast(res.message || "Submitted successfully!", "success");
      } else {
        showToast(res.error || "Failed to submit observation.", "error");
      }
    });
  };
  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 text-slate-800">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white font-medium text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide border border-indigo-400/30 uppercase mb-2">
                <Globe className="w-3.5 h-3.5" />
                Foreign English Teacher & Department Peer Observation
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                Class Observation & Teaching Support
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                Evidence-based lesson observation framework for ESL and English Departments.
                Focused on instructional coaching, student growth, and curriculum implementation.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 self-start md:self-auto shadow-inner">
              <button
                onClick={() => setActiveTab("walkthrough")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "walkthrough"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                ⚡ Walkthrough Form
              </button>
              <button
                onClick={() => setActiveTab("kpi")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === "kpi"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                📊 Quota & KPI
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {activeTab === "walkthrough" && (
          <>
            {/* Section 1: Administrative Information */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-base">General Information & Context</h2>
                    <p className="text-xs text-slate-500">Auto-filled based on logged-in observer and selected teacher</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200">
                  Subject: ESL (Locked)
                </span>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    Observer (Evaluator)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={props.currentTeacher?.teacherName || "Current User"}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Observed Teacher <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={teacherId}
                    onChange={handleTeacherChange}
                    className="w-full bg-white border-2 border-indigo-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none transition"
                  >
                    <option value="">-- Select English Teacher --</option>
                    {englishTeachers.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.teacherName} ({t.teacherCode}) - {t.departmentRel?.name || t.position || "English"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    Class / Grade
                  </label>
                  <select
                    value={classId}
                    onChange={handleClassChange}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  >
                    <option value="">-- Select Class --</option>
                    {teacherClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.grade || c.level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Campus
                  </label>
                  <select
                    value={campusId}
                    onChange={e => setCampusId(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  >
                    <option value="">-- Select Campus --</option>
                    {props.campuses?.map((cmp: any) => (
                      <option key={cmp.id} value={cmp.id}>
                        {cmp.campusName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Date of Observation
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Teaching Period
                  </label>
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  >
                    {PERIOD_LIST.map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({p.time})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Room
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                    placeholder="e.g. Room 302 / Smart Lab"
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-600" />
                    Lesson Topic / Unit
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Unit 4: Food - Speaking Practice"
                    className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-4 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Target Skills & Language Focus
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map(skill => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Rating Guide Info Box */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-white/10 text-indigo-300 flex-shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-sm text-indigo-200 uppercase tracking-wider">
                      Evaluation Philosophy & Rating Scale:
                    </span>
                    <span className="text-xs text-slate-300">
                      Focus on evidence and student impact. Do not use primarily to rank teachers.
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {RATING_OPTIONS.map(opt => (
                      <div key={opt.value} className="bg-white/10 rounded-lg p-2 border border-white/10">
                        <span className="font-bold text-xs block text-indigo-300">{opt.label}</span>
                        <span className="text-[11px] text-slate-300 leading-tight block mt-0.5">{opt.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Section 2: Indicators */}
            <div className="space-y-6">
              {["D", "E", "ABC"].map(sectionKey => {
                const sectionIndicators = ESL_INDICATORS.filter(i => i.section === sectionKey);
                const title = sectionIndicators[0]?.sectionTitle;

                return (
                  <div
                    key={sectionKey}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider">{title}</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {sectionIndicators.length} Pedagogical Indicators
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {sectionIndicators.map(ind => {
                        const currentData = indicatorData[ind.id] || { rating: "3", evidence: "", studentImpact: "" };

                        return (
                          <div key={ind.id} className="p-5 sm:p-6 space-y-4 hover:bg-slate-50/40 transition">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="space-y-1 max-w-3xl">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase">
                                    {ind.label}
                                  </span>
                                  <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                                    {ind.text}
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 italic pl-1">{ind.vnText}</p>
                              </div>

                              <div className="flex items-center gap-1.5 self-start bg-slate-100 p-1 rounded-xl border border-slate-200">
                                {RATING_OPTIONS.map(opt => {
                                  const isSelected = currentData.rating === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => handleRatingChange(ind.id, opt.value)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        isSelected
                                          ? opt.badge + " shadow-sm scale-105"
                                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                                      }`}
                                    >
                                      {opt.short}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Evidence / Examples Observed (Minh chứng)
                                </label>
                                <textarea
                                  rows={2}
                                  value={currentData.evidence}
                                  onChange={e => handleEvidenceChange(ind.id, e.target.value)}
                                  placeholder="Describe specific teacher actions, lesson pacing, or instructional tasks observed..."
                                  className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-lg p-2.5 text-xs text-slate-800 outline-none resize-none transition"
                                />
                                {ind.quickEvidence && ind.quickEvidence.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Quick-Insert Evidence Tags:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ind.quickEvidence.map(tag => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => appendQuickTag(ind.id, "evidence", tag)}
                                          className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Student Impact / Progress (Tác động HS)
                                </label>
                                <textarea
                                  rows={2}
                                  value={currentData.studentImpact}
                                  onChange={e => handleImpactChange(ind.id, e.target.value)}
                                  placeholder="Describe how students responded, produced target language, or overcame difficulties..."
                                  className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-lg p-2.5 text-xs text-slate-800 outline-none resize-none transition"
                                />
                                {ind.quickImpact && ind.quickImpact.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Quick-Insert Impact Tags:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {ind.quickImpact.map(tag => (
                                        <button
                                          key={tag}
                                          type="button"
                                          onClick={() => appendQuickTag(ind.id, "studentImpact", tag)}
                                          className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition"
                                        >
                                          + {tag}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
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
            {/* Section 3: Teacher Voice & Reflective Feedback (Section F) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                    F
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      Teacher Voice & Curriculum Feedback (Post-Lesson Discussion)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Reflective questions completed during debrief with the observed teacher
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    1. What is working well in this class at the moment?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Những điểm đang vận hành tốt và hiệu quả ở lớp học này hiện tại?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.workingWell}
                    onChange={e => setTeacherVoice({ ...teacherVoice, workingWell: e.target.value })}
                    placeholder="e.g. Students show great enthusiasm for speaking games; routine is well established..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    2. What challenges are you experiencing in teaching this class or implementing the curriculum?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Những khó khăn/thách thức đang gặp phải khi giảng dạy lớp này?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.challenges}
                    onChange={e => setTeacherVoice({ ...teacherVoice, challenges: e.target.value })}
                    placeholder="e.g. Mixed proficiency levels; a few students require more phonics support..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    3. Is there anything in the curriculum, materials, assessment, timetable or class context that should be adjusted?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Có nội dung nào trong giáo trình, học liệu, đánh giá, TKB cần điều chỉnh không?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.curriculumAdjustments}
                    onChange={e => setTeacherVoice({ ...teacherVoice, curriculumAdjustments: e.target.value })}
                    placeholder="e.g. Unit 4 reading text is too long for a single period; suggest splitting into 2 sessions..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 leading-snug">
                    4. What support would help you teach this class more effectively?
                  </label>
                  <span className="text-[11px] text-slate-400 block mb-1">
                    (Nhà trường / Tổ bộ môn cần hỗ trợ điều gì để giúp GV giảng dạy hiệu quả hơn?)
                  </span>
                  <textarea
                    rows={3}
                    value={teacherVoice.supportNeeded}
                    onChange={e => setTeacherVoice({ ...teacherVoice, supportNeeded: e.target.value })}
                    placeholder="e.g. Supplementary phonics worksheets; co-teacher assistance during pair work..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Observation Summary & Actions (Section G) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                    G
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      Observation Summary & Action Plan (Quick Record)
                    </h3>
                    <p className="text-xs text-slate-500">Agreed outcomes and support commitments</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoGenerateSummary}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 hover:opacity-95 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  ⚡ Auto-Generate Summary
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-emerald-600" />
                    Key Strengths Observed (Điểm mạnh nổi bật)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.keyStrengths}
                    onChange={e => setSummary({ ...summary, keyStrengths: e.target.value })}
                    placeholder="Bullet points of strongest pedagogical execution..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Key Teaching / Learning Challenges (Khó khăn & Thách thức)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.keyChallenges}
                    onChange={e => setSummary({ ...summary, keyChallenges: e.target.value })}
                    placeholder="Bullet points of areas requiring growth or scaffolding..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Evidence of Student Progress (Tiến bộ học sinh)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.studentProgressEvidence}
                    onChange={e => setSummary({ ...summary, studentProgressEvidence: e.target.value })}
                    placeholder="Specific student learning gains demonstrated in the lesson..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Students Needing Support (HS cần bổ trợ)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.studentsNeedingSupport}
                    onChange={e => setSummary({ ...summary, studentsNeedingSupport: e.target.value })}
                    placeholder="Names or specific groups of students needing clinic/follow-up..."
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    Agreed Actionable Steps & Commitments (Kế hoạch hành động thống nhất)
                  </label>
                  <textarea
                    rows={3}
                    value={summary.agreedActions}
                    onChange={e => setSummary({ ...summary, agreedActions: e.target.value })}
                    placeholder="1. Action item 1\n2. Action item 2..."
                    className="w-full bg-indigo-50/50 border border-indigo-200 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-800 outline-none resize-none transition font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suggested Rating:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${stats.badgeColor}`}>
                    {stats.suggestedRating}
                  </span>
                </div>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-600 font-semibold">
                  Indicators: {stats.count4} (★4) • {stats.count3} (★3) • {stats.count2} (★2) • {stats.count1} (★1)
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSubmit(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSubmit(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
                >
                  <Send className="w-4 h-4" />
                  {isPending ? "Submitting..." : "Submit Evaluation"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Quota & KPI */}
        {activeTab === "kpi" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">ESL Observation Quota & Progress</h3>
              <p className="text-xs text-slate-500">
                Live synchronization with Academic Year targets for both Observed Lessons (Host) and Observation Credits (Evaluator).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                  Observed as Host Teacher (Tiết Dạy)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {props.currentTeacher?.requiredTaught || 0}
                  </span>
                  <span className="text-xs text-slate-500">/ target per term</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full w-3/4 rounded-full" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3">
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
                  Observation Credits as Evaluator (Tiết Đi Dự)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {props.currentTeacher?.requiredObserved || 0}
                  </span>
                  <span className="text-xs text-slate-500">/ target per term</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-full w-4/5 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
