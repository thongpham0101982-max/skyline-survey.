const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio-gvnn', 'client.tsx');

const p1 = `"use client";

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
  // SECTION D: CURRICULUM IMPLEMENTATION (From Excel)
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

  // SECTION E: ASSESSMENT & STUDENT PROGRESS (From Excel)
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

  // SECTIONS A-C: CLASSROOM INSTRUCTION & IMMERSION CLIMATE
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

const STANDARD_ENGLISH_DEPARTMENTS = [
  { id: "ALL", name: "Tất cả các Tổ Tiếng Anh & GVNN (All English Depts)" },
  { id: "TO_TA_MAM_NON", name: "Tổ Tiếng Anh Mầm non (Preschool English)" },
  { id: "TO_TA_TIEU_HOC", name: "Tổ Tiếng Anh Tiểu học (Primary English)" },
  { id: "TO_TA_TRUNG_HOC", name: "Tổ Tiếng Anh Trung học (Secondary & High School English)" },
  { id: "TO_TA_QUOC_TE", name: "Tổ Tiếng Anh Quốc tế & GVNN (International / ESL / Expat)" }
];

function matchTeacherDepartmentGroup(teacher: any, deptKey: string): boolean {
  if (deptKey === "ALL") return true;

  const deptName = (teacher.departmentRel?.name || "").toLowerCase();
  const deptCode = (teacher.departmentRel?.code || "").toLowerCase();
  const assignedDepts = (teacher.departmentAssignments || []).map((da: any) => 
    (da.department?.name || "") + " " + (da.department?.code || "") + " " + (da.departmentId || "")
  ).join(" ").toLowerCase();
  const pos = (teacher.position || "").toLowerCase();
  const role = (teacher.user?.role || "").toLowerCase();
  const mainSub = (teacher.mainSubjectRel?.subjectName || "").toLowerCase();
  const combined = (deptName + " " + deptCode + " " + assignedDepts + " " + pos + " " + role + " " + mainSub).toLowerCase();

  // If deptKey matches an exact DB department ID
  if (teacher.departmentId === deptKey || teacher.departmentRel?.id === deptKey) return true;
  if (teacher.departmentAssignments?.some((da: any) => da.departmentId === deptKey || da.department?.id === deptKey)) return true;

  if (deptKey === "TO_TA_MAM_NON") {
    return combined.includes("mầm non") || combined.includes("mam non") || combined.includes("mn") || combined.includes("preschool") || combined.includes("kindergarten") || role.includes("gv_mn");
  }
  if (deptKey === "TO_TA_TIEU_HOC") {
    return (combined.includes("tiểu học") || combined.includes("tieu hoc") || combined.includes("pri") || combined.includes("to_4") || combined.includes("to_5")) && !combined.includes("mầm non");
  }
  if (deptKey === "TO_TA_TRUNG_HOC") {
    return combined.includes("trung học") || combined.includes("trung hoc") || combined.includes("thcs") || combined.includes("thpt") || combined.includes("sec") || combined.includes("cấp 2") || combined.includes("cấp 3");
  }
  if (deptKey === "TO_TA_QUOC_TE") {
    return combined.includes("quốc tế") || combined.includes("quoc te") || combined.includes("gvnn") || combined.includes("expat") || combined.includes("foreign") || combined.includes("international") || combined.includes("cambridge") || combined.includes("esl");
  }

  return true;
}
`;

fs.writeFileSync(target, p1, 'utf8');
console.log('Part 1 written');
