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
  Star,
  ClipboardList
} from "lucide-react";
import { createForeignObservationWithEvaluation } from "./actions";
import { isSlotBelongsToForeignEsl, isExactWalkthroughForm } from "./utils";
import { ForeignObservationHistoryTab } from "./components/ForeignObservationHistoryTab";

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

const cleanStr = (s: string | null | undefined) => 
  (s || "")
   .toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/đ/g, "d")
   .replace(/Đ/g, "d");

export const ESL_INDICATORS: IndicatorConfig[] = [
  // SECTION A: LEARNING ENVIRONMENT & STUDENT ENGAGEMENT
  {
    id: 1,
    section: "A",
    sectionTitle: "A. LEARNING ENVIRONMENT & STUDENT ENGAGEMENT",
    label: "Indicator 1",
    text: "Students feel safe, respected and comfortable participating.",
    vnText: "Học sinh cảm thấy an toàn, được tôn trọng và thoải mái tham gia hoạt động.",
    quickEvidence: [
      "Welcoming and supportive classroom atmosphere",
      "Encouraging verbal & non-verbal praise",
      "Students unhesitant to take risks or speak up",
      "Safe and positive learning culture established"
    ],
    quickImpact: [
      "High level of student confidence and openness",
      "Zero anxiety observed when called upon",
      "Students actively volunteer to answer questions"
    ]
  },
  {
    id: 2,
    section: "A",
    sectionTitle: "A. LEARNING ENVIRONMENT & STUDENT ENGAGEMENT",
    label: "Indicator 2",
    text: "Classroom routines and behaviour support learning effectively.",
    vnText: "Nề nếp lớp học và kỷ luật hỗ trợ hiệu quả cho việc học.",
    quickEvidence: [
      "Clear, consistent classroom routines & signals",
      "Seamless transitions between activities",
      "Positive behaviour management strategies used",
      "Minimal downtime during lesson stages"
    ],
    quickImpact: [
      "Students follow routines promptly and smoothly",
      "Maximum on-task learning time maintained",
      "Well-regulated and focused learning space"
    ]
  },
  {
    id: 3,
    section: "A",
    sectionTitle: "A. LEARNING ENVIRONMENT & STUDENT ENGAGEMENT",
    label: "Indicator 3",
    text: "Students are actively engaged in the learning activities.",
    vnText: "Học sinh chủ động, tích cực tham gia vào các hoạt động học tập.",
    quickEvidence: [
      "Total physical response & interactive tasks",
      "High participation in whole-class and pair work",
      "Energetic, motivating pacing and variety",
      "Interactive games and meaningful tasks used"
    ],
    quickImpact: [
      "Sustained high attention and enthusiasm throughout",
      "Over 90% of students continuously engaged",
      "Active production of target language"
    ]
  },
  {
    id: 4,
    section: "A",
    sectionTitle: "A. LEARNING ENVIRONMENT & STUDENT ENGAGEMENT",
    label: "Indicator 4",
    text: "Students have opportunities to ask questions, express ideas and interact with others.",
    vnText: "Học sinh có cơ hội đặt câu hỏi, bày tỏ ý kiến và tương tác với bạn.",
    quickEvidence: [
      "Frequent pair-share and group collaboration",
      "Open-ended and inquiry prompts provided",
      "Student-to-student English interactions facilitated",
      "Teacher acts as facilitator, maximizing STT"
    ],
    quickImpact: [
      "Authentic peer-to-peer communication",
      "Learners express personal thoughts in English",
      "Collaborative problem-solving observed"
    ]
  },
  {
    id: 5,
    section: "A",
    sectionTitle: "A. LEARNING ENVIRONMENT & STUDENT ENGAGEMENT",
    label: "Indicator 5",
    text: "The teacher builds positive and respectful relationships with students.",
    vnText: "Giáo viên xây dựng mối quan hệ tôn trọng, tích cực và gần gũi với học sinh.",
    quickEvidence: [
      "Warm tone, empathetic listening & name recall",
      "Positive reinforcement and genuine care shown",
      "Inclusive rapport with every individual learner",
      "Respectful cultural & linguistic sensitivity"
    ],
    quickImpact: [
      "Strong teacher-student connection and mutual trust",
      "Students feel valued, motivated, and supported",
      "Joyful and productive learning environment"
    ]
  },

  // SECTION B: TEACHING & LEARNING
  {
    id: 6,
    section: "B",
    sectionTitle: "B. TEACHING & LEARNING",
    label: "Indicator 6",
    text: "Activities are aligned with the learning objectives and curriculum.",
    vnText: "Các hoạt động dạy học bám sát mục tiêu bài học và khung chương trình.",
    quickEvidence: [
      "Clear communicative aim stated and followed",
      "Structured staging (Warm-up -> PPP / TBL -> Production)",
      "All tasks directly reinforce core language targets",
      "Lesson plan aligns with syllabus progression"
    ],
    quickImpact: [
      "Students clearly understand the purpose of each task",
      "Systematic mastery of target vocabulary and grammar",
      "Coherent lesson flow leading to intended outcomes"
    ]
  },
  {
    id: 7,
    section: "B",
    sectionTitle: "B. TEACHING & LEARNING",
    label: "Indicator 7",
    text: "Instructions and explanations are clear and appropriate for students' level.",
    vnText: "Hướng dẫn và giải thích rõ ràng, phù hợp với trình độ của học sinh.",
    quickEvidence: [
      "Graded language with visual modeling / demonstrations",
      "Instruction Checking Questions (ICQs) used effectively",
      "Step-by-step task breakdown with clear examples",
      "Concise teacher talk without over-explaining"
    ],
    quickImpact: [
      "Zero confusion when transitioning into tasks",
      "Students begin pair/group work immediately",
      "Independent task execution with minimal hesitance"
    ]
  },
  {
    id: 8,
    section: "B",
    sectionTitle: "B. TEACHING & LEARNING",
    label: "Indicator 8",
    text: "Teaching strategies help students understand, practise and apply learning.",
    vnText: "Chiến lược dạy học giúp HS hiểu bài, luyện tập và vận dụng kiến thức.",
    quickEvidence: [
      "Communicative Language Teaching (CLT) applied",
      "Balanced scaffolding: controlled -> guided -> free practice",
      "Contextualized examples and real-life scenarios",
      "Varied modalities: visual, auditory, kinesthetic"
    ],
    quickImpact: [
      "Deep understanding rather than rote memorization",
      "Effective transfer to real communicative situations",
      "High rate of successful task completion"
    ]
  },
  {
    id: 9,
    section: "B",
    sectionTitle: "B. TEACHING & LEARNING",
    label: "Indicator 9",
    text: "The teacher checks students' understanding during the lesson.",
    vnText: "Giáo viên kiểm tra mức độ hiểu bài của học sinh trong suốt tiết dạy.",
    quickEvidence: [
      "Regular Concept Checking Questions (CCQs)",
      "Active teacher circulation and monitoring",
      "Quick diagnostic checks (mini-whiteboards/thumbs)",
      "Elicitation used instead of direct answers"
    ],
    quickImpact: [
      "Misunderstandings caught and addressed immediately",
      "Every learner held accountable for comprehension",
      "Timely pacing adjustments based on student responses"
    ]
  },
  {
    id: 10,
    section: "B",
    sectionTitle: "B. TEACHING & LEARNING",
    label: "Indicator 10",
    text: "Learning resources and technology are used purposefully.",
    vnText: "Học liệu, đồ dùng dạy học và công nghệ được sử dụng đúng mục đích, hiệu quả.",
    quickEvidence: [
      "Smartboard/projector integrated smoothly",
      "Engaging multimedia, slides, flashcards & realia",
      "Well-organized handouts and interactive games",
      "Technology directly enhances student learning"
    ],
    quickImpact: [
      "Visual & audio aids enhanced comprehension",
      "Increased learner motivation and focus",
      "Dynamic and modern classroom experience"
    ]
  },

  // SECTION C: DIFFERENTIATION & STUDENT SUPPORT
  {
    id: 11,
    section: "C",
    sectionTitle: "C. DIFFERENTIATION & STUDENT SUPPORT",
    label: "Indicator 11",
    text: "Tasks and support are appropriate for the range of student abilities.",
    vnText: "Nhiệm vụ và sự hỗ trợ phù hợp với các mức độ năng lực khác nhau của HS.",
    quickEvidence: [
      "Tiered tasks / extension activities for fast finishers",
      "Adapted speaking prompts for varying levels",
      "Strategic grouping / mixed-ability pairing",
      "Multi-level scaffolding options available"
    ],
    quickImpact: [
      "Advanced students are adequately challenged",
      "Lower-proficiency students remain fully included",
      "All students experience success at their level"
    ]
  },
  {
    id: 12,
    section: "C",
    sectionTitle: "C. DIFFERENTIATION & STUDENT SUPPORT",
    label: "Indicator 12",
    text: "Students who need additional support receive appropriate scaffolding.",
    vnText: "Học sinh cần hỗ trợ thêm nhận được sự trợ giúp, gợi mở phù hợp.",
    quickEvidence: [
      "Targeted individual guidance during independent work",
      "Sentence starters, word banks & visual cues provided",
      "Co-teacher / assistant effectively deployed",
      "Patient re-prompting and phonetic modeling"
    ],
    quickImpact: [
      "Struggling learners successfully produce key language",
      "Confidence restored for hesitant speakers",
      "Measurable progress within the lesson cycle"
    ]
  },
  {
    id: 13,
    section: "C",
    sectionTitle: "C. DIFFERENTIATION & STUDENT SUPPORT",
    label: "Indicator 13",
    text: "Students are encouraged to develop independence in learning.",
    vnText: "Khuyến khích học sinh phát triển tính tự chủ và chủ động trong học tập.",
    quickEvidence: [
      "Self-checking and peer-correction routines",
      "Students encouraged to use classroom reference charts",
      "Autonomous pair practice with minimal teacher intrusion",
      "Reflective self-assessment prompts"
    ],
    quickImpact: [
      "Learners take ownership of their learning process",
      "Reduced reliance on constant teacher validation",
      "Proactive problem-solving and critical thinking"
    ]
  },

  // SECTION D: CURRICULUM IMPLEMENTATION
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

  // SECTION E: ASSESSMENT & STUDENT PROGRESS
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
  }
];

const RATING_OPTIONS = [
  { value: "4", label: "4 - Strong Practice", short: "4", badge: "bg-purple-600 text-white", desc: "Particularly effective; exemplary practice worth sharing." },
  { value: "3", label: "3 - Effective", short: "3", badge: "bg-emerald-600 text-white", desc: "Consistently meets expectations and good standard." },
  { value: "2", label: "2 - Developing", short: "2", badge: "bg-amber-500 text-white", desc: "Partially effective; needs refining and coaching." },
  { value: "1", label: "1 - Need support", short: "1", badge: "bg-rose-500 text-white", desc: "Clear challenge; requires immediate support / intervention." },
  { value: "NO", label: "NO - Not observed", short: "NO", badge: "bg-slate-400 text-white", desc: "Not observed / not applicable in this lesson." }
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
  teacherStats?: {
    taughtCount: number;
    observedCount: number;
    eslTaughtCount: number;
    eslObservedCount: number;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"walkthrough" | "schedule" | "evaluations" | "kpi">("walkthrough");
  const [slots, setSlots] = useState<any[]>(props.initialSlots || []);

  const mySlotsCount = useMemo(() => {
    return slots.filter(s => {
      if (!isExactWalkthroughForm(s)) return false;
      if (!props.currentTeacher?.id) return true;
      return (
        s.teacherId === props.currentTeacher?.id ||
        (s.registrations || []).some((r: any) => r.teacherId === props.currentTeacher?.id)
      );
    }).length;
  }, [slots, props.currentTeacher?.id]);

  React.useEffect(() => {
    if (props.initialSlots) {
      setSlots(props.initialSlots);
    }
  }, [props.initialSlots]);

  // Observed Teacher State
  const [observedDeptId, setObservedDeptId] = useState<string>("ALL");
  const [teacherId, setTeacherId] = useState("");

  const [campusId, setCampusId] = useState("");
  const [classId, setClassId] = useState("");
  const [className, setClassName] = useState("");
  const [subjectName, setSubjectName] = useState("Tiếng Anh (ESL)");
  const [numberOfStudents, setNumberOfStudents] = useState("");
  const [lessonDuration, setLessonDuration] = useState("40 phút");
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

  const allTeachers = useMemo(() => {
    return props.teachers || [];
  }, [props.teachers]);

  // Comprehensive matching for 4 English Departments
  const filteredObservedTeachers = useMemo(() => {
    if (!observedDeptId || observedDeptId === "ALL") return allTeachers;

    const targetName = cleanStr(observedDeptId);

    return allTeachers.filter((t: any) => {
      // 1. Direct ID / exact Name match
      if (t.departmentId === observedDeptId || t.departmentRel?.id === observedDeptId) return true;
      if (t.departmentAssignments && t.departmentAssignments.some((da: any) => da.departmentId === observedDeptId)) return true;
      if (t.department === observedDeptId || t.departmentRel?.name === observedDeptId) return true;
      if (t.departmentAssignments && t.departmentAssignments.some((da: any) => da.departmentName === observedDeptId)) return true;

      // 2. Normalized metadata matching
      const deptName = cleanStr(t.department || t.departmentRel?.name || "");
      const assignedNames = cleanStr((t.departmentAssignments || []).map((da: any) => da.departmentName || "").join(" "));
      const pos = cleanStr(t.position || "");
      const mainSub = cleanStr(t.mainSubject || "");
      const allCombined = (deptName + " " + assignedNames + " " + pos + " " + mainSub).toLowerCase();

      // Check classes taught by this teacher
      const hasPrimaryClass = t.classes && t.classes.some((c: any) => {
        const g = parseInt(c.class?.grade || c.class?.className || "0");
        const lvl = cleanStr(c.class?.level || "");
        return (g >= 1 && g <= 5) || lvl.includes("tieu hoc") || lvl.includes("pri");
      });

      const hasSecondaryClass = t.classes && t.classes.some((c: any) => {
        const g = parseInt(c.class?.grade || c.class?.className || "0");
        const lvl = cleanStr(c.class?.level || "");
        return (g >= 6 && g <= 12) || lvl.includes("thcs") || lvl.includes("thpt") || lvl.includes("sec") || lvl.includes("trung hoc");
      });

      const hasPreschoolClass = t.classes && t.classes.some((c: any) => {
        const lvl = cleanStr(c.class?.level || "");
        return lvl.includes("mam non") || lvl.includes("mn") || lvl.includes("pre");
      });

      const isEnglishTeacher = allCombined.includes("tieng anh") || allCombined.includes("ta") || allCombined.includes("english") || allCombined.includes("esl") || allCombined.includes("ngoai ngu") || allCombined.includes("gvnn") || allCombined.includes("expat");

      // Matching "Tổ Tiếng Anh Tiểu học"
      if (targetName.includes("tieu hoc") || targetName.includes("pri")) {
        if (allCombined.includes("tieu hoc") || allCombined.includes("pri") || hasPrimaryClass) {
          return isEnglishTeacher || allCombined.includes("tieu hoc");
        }
      }

      // Matching "Tổ Tiếng Anh Trung học"
      if (targetName.includes("trung hoc") || targetName.includes("thcs") || targetName.includes("thpt") || targetName.includes("sec")) {
        if (allCombined.includes("trung hoc") || allCombined.includes("thcs") || allCombined.includes("thpt") || allCombined.includes("sec") || hasSecondaryClass) {
          return isEnglishTeacher || allCombined.includes("trung hoc");
        }
      }

      // Matching "Tổ Tiếng Anh Mầm non"
      if (targetName.includes("mam non") || targetName.includes("mn") || targetName.includes("pre") || targetName.includes("kindergarten")) {
        if (allCombined.includes("mam non") || allCombined.includes("mn") || allCombined.includes("pre") || hasPreschoolClass) {
          return isEnglishTeacher || allCombined.includes("mam non");
        }
      }

      // Matching "Tổ Tiếng Anh Quốc tế & GVNN"
      if (targetName.includes("quoc te") || targetName.includes("gvnn") || targetName.includes("expat") || targetName.includes("international")) {
        return allCombined.includes("quoc te") || allCombined.includes("gvnn") || allCombined.includes("expat") || allCombined.includes("foreign") || allCombined.includes("international") || allCombined.includes("cambridge") || allCombined.includes("esl");
      }

      return false;
    });
  }, [allTeachers, observedDeptId]);

  const selectedTeacher = useMemo(() => {
    return allTeachers.find((t: any) => t.id === teacherId);
  }, [allTeachers, teacherId]);

  // Classes filtered strictly by selected Campus (and prioritizing Teacher's assigned classes in that Campus)
  const availableClasses = useMemo(() => {
    let list = props.classes || [];
    if (campusId) {
      list = list.filter((c: any) => c.campusId === campusId);
    }
    if (selectedTeacher) {
      if (selectedTeacher.classes && selectedTeacher.classes.length > 0) {
        const teacherAssigned = selectedTeacher.classes
          .map((c: any) => c.class)
          .filter((c: any) => Boolean(c) && (!campusId || c.campusId === campusId));
        if (teacherAssigned.length > 0) return teacherAssigned;
      }
    }
    return list;
  }, [props.classes, campusId, selectedTeacher]);

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value;
    setTeacherId(tid);
    const t = allTeachers.find((x: any) => x.id === tid);
    if (t && t.campusId) {
      setCampusId(t.campusId);
      const matchedClasses = (props.classes || []).filter((c: any) => c.campusId === t.campusId);
      if (matchedClasses.length > 0) {
        const assignedClass = t.classes && t.classes.length > 0
          ? t.classes.find((c: any) => c.class?.campusId === t.campusId)?.class
          : null;
        if (assignedClass) {
          setClassId(assignedClass.id);
          setClassName(assignedClass.className);
        } else {
          setClassId(matchedClasses[0].id);
          setClassName(matchedClasses[0].className);
        }
      } else {
        setClassId("");
        setClassName("");
      }
    }
  };

  const handleCampusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setCampusId(cid);
    const matchedClasses = (props.classes || []).filter((c: any) => !cid || c.campusId === cid);
    if (matchedClasses.length > 0) {
      setClassId(matchedClasses[0].id);
      setClassName(matchedClasses[0].className);
    } else {
      setClassId("");
      setClassName("");
    }
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setClassId(cid);
    const c = (props.classes || []).find((x: any) => x.id === cid);
    if (c) {
      setClassName(c.className);
      if (c.campusId && !campusId) setCampusId(c.campusId);
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
      const updated = current ? (current + "; " + tag) : tag;
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
            ? (ind.text + " (" + data.evidence + ")")
            : (ind.text + " was demonstrated with high proficiency.")
        );
      } else if (data.rating === "1" || data.rating === "2") {
        challenges.push(
          data.evidence
            ? (ind.text + " - Note: " + data.evidence)
            : (ind.text + " requires further scaffolding and refinement.")
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
          ? strengths.map(s => "• " + s).join("\n")
          : "• Demonstrated strong classroom control and clear communicative staging.",
      keyChallenges:
        challenges.length > 0
          ? challenges.map(c => "• " + c).join("\n")
          : "• Maintain tighter pacing during the final production/wrap-up stage.",
      studentProgressEvidence:
        impacts.length > 0
          ? impacts.map(imp => "• " + imp).join("\n")
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
      observerId: props.currentTeacher?.id,
      academicYearId: props.selectedYearId,
      teacherId,
      campusId,
      classId,
      className,
      subjectName: subjectName || "Tiếng Anh (ESL)",
      numberOfStudents,
      lessonDuration,
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
        router.refresh();
        setTimeout(() => {
          setActiveTab("evaluations");
        }, 1200);
      } else {
        showToast(res.error || "Failed to submit observation.", "error");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 text-slate-800">
      {toast && (
        <div
          className={"fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white font-medium text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-4 " +
            (toast.type === "success" ? "bg-emerald-600" : "bg-rose-600")
          }
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
                Evidence-based lesson observation framework for ESL and English Departments (Mầm non, Tiểu học, Trung học, Quốc tế & GVNN).
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 self-start md:self-auto shadow-inner">
              <button
                onClick={() => setActiveTab("walkthrough")}
                className={"flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all " +
                  (activeTab === "walkthrough"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50")
                }
              >
                <Sparkles className="w-4 h-4" />
                ⚡ Walkthrough Form
              </button>
              <button
                onClick={() => setActiveTab("evaluations")}
                className={"flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all " +
                  (activeTab === "evaluations"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50")
                }
              >
                <ClipboardList className="w-4 h-4" />
                📜 Lược sử đánh giá ({mySlotsCount})
              </button>
              <button
                onClick={() => setActiveTab("kpi")}
                className={"flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all " +
                  (activeTab === "kpi"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50")
                }
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
              <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-400/30">
                    1
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">CLASS OBSERVATION & TEACHING SUPPORT FORM</h2>
                    <p className="text-xs text-slate-300">
                      Purpose: To understand teaching effectiveness, student progress, curriculum implementation challenges, and support needed.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-bold uppercase tracking-wider border border-indigo-400/30 self-start sm:self-auto">
                  SY2026-2027 • Official Rubric
                </span>
              </div>

              <div className="p-6 space-y-5">
                {/* 2x4 Header Grid Matching PDF Table Structure */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  {/* Row 1: Teacher & Observer */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Teacher (Giáo viên được dự) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={observedDeptId}
                        onChange={e => {
                          setObservedDeptId(e.target.value);
                          setTeacherId("");
                        }}
                        className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none transition"
                      >
                        <option value="ALL">-- Tất cả Tổ CM ({allTeachers.length} GV) --</option>
                        <option value="Tổ Tiếng Anh Tiểu học">Tổ Tiếng Anh Tiểu học</option>
                        <option value="Tổ Tiếng Anh Trung học">Tổ Tiếng Anh Trung học</option>
                        <option value="Tổ Tiếng Anh Quốc tế & GVNN">Tổ Tiếng Anh Quốc tế & GVNN</option>
                        <option value="Tổ Tiếng Anh Mầm non">Tổ Tiếng Anh Mầm non</option>
                      </select>

                      <select
                        value={teacherId}
                        onChange={handleTeacherChange}
                        className="w-full bg-white border-2 border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none transition"
                      >
                        <option value="">-- Chọn Giáo Viên ({filteredObservedTeachers.length}) * --</option>
                        {filteredObservedTeachers.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.teacherName} ({t.teacherCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Observer */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      Observer (Người dự giờ)
                    </label>
                    <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-300 text-xs flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">{props.currentTeacher?.teacherName || "Current User"}</span>
                      <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {props.currentTeacher?.teacherCode || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Subject & Class */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Subject (Môn học)
                    </label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={e => setSubjectName(e.target.value)}
                      placeholder="e.g. English (ESL), Phonics, ELA"
                      className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Class (Lớp / Khối)
                    </label>
                    <select
                      value={classId}
                      onChange={handleClassChange}
                      className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition"
                    >
                      <option value="">
                        {campusId ? ("-- Chọn Lớp (" + availableClasses.length + " lớp) --") : "-- Chọn Cơ sở trước --"}
                      </option>
                      {availableClasses.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.className} {c.grade ? ("(Khối " + c.grade + ")") : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 3: Date & Lesson / Unit */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Date of Observation
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-600" />
                      Lesson / Unit (Chủ đề / Bài dạy)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. Unit 4: Food - Speaking Practice"
                      className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none transition"
                    />
                  </div>

                  {/* Row 4: Number of students & Lesson duration */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Number of students (Sĩ số)
                    </label>
                    <input
                      type="text"
                      value={numberOfStudents}
                      onChange={e => setNumberOfStudents(e.target.value)}
                      placeholder="e.g. 24 students"
                      className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      Lesson duration (Thời lượng)
                    </label>
                    <input
                      type="text"
                      value={lessonDuration}
                      onChange={e => setLessonDuration(e.target.value)}
                      placeholder="e.g. 40 minutes / 45 mins"
                      className="w-full bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none transition"
                    />
                  </div>

                  {/* Location & Period metadata */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Campus (Cơ sở) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={campusId}
                      onChange={handleCampusChange}
                      className="w-full bg-white border-2 border-indigo-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition"
                    >
                      <option value="">-- Chọn Cơ Sở * --</option>
                      {props.campuses?.map((cmp: any) => (
                        <option key={cmp.id} value={cmp.id}>
                          {cmp.campusName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      Period & Room (Tiết / Phòng)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-medium text-slate-800 outline-none"
                      >
                        {PERIOD_LIST.map(p => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={room}
                        onChange={e => setRoom(e.target.value)}
                        placeholder="Phòng"
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Target Skills */}
                <div className="pt-2 border-t border-slate-100">
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
                          className={"px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 " +
                            (isSelected
                              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                          }
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

            {/* Observation Approach & Rating Guide Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md space-y-3">
              <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-xs font-bold text-indigo-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Observation approach: Focus on evidence and impact on students.</span>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-black uppercase text-indigo-300 tracking-wider">
                  Rating Scale (Thang đánh giá 5 mức):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {RATING_OPTIONS.map(opt => (
                    <div key={opt.value} className="bg-white/10 rounded-xl p-2.5 border border-white/10 text-left">
                      <span className="font-extrabold text-xs block text-cyan-300">{opt.label}</span>
                      <span className="text-[11px] text-slate-300 leading-tight block mt-0.5">{opt.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: 20 Indicators organized across Sections A, B, C, D, E */}
            <div className="space-y-6">
              {["A", "B", "C", "D", "E"].map(sectionKey => {
                const sectionIndicators = ESL_INDICATORS.filter(i => i.section === sectionKey);
                const title = sectionIndicators[0]?.sectionTitle || `SECTION ${sectionKey}`;

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
                                      className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " +
                                        (isSelected
                                          ? (opt.badge + " shadow-sm scale-105")
                                          : "text-slate-600 hover:text-slate-900 hover:bg-white/80")
                                      }
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
                  <span className={"px-3 py-1 rounded-full text-xs font-extrabold " + stats.badgeColor}>
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

        {/* Tab: Evaluations History */}
        {activeTab === "evaluations" && (
          <ForeignObservationHistoryTab
            slots={slots}
            currentTeacher={props.currentTeacher}
            academicYears={props.academicYears}
            selectedYearId={props.selectedYearId}
            campuses={props.campuses}
            departments={props.departments}
            indicators={ESL_INDICATORS}
            onOpenWalkthroughForm={() => setActiveTab("walkthrough")}
          />
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                    Tiết Giảng Dạy (Host Teacher)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black">
                    {props.teacherStats?.eslTaughtCount || 0} tiết ESL
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {props.teacherStats?.taughtCount ?? 0}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    / {props.currentTeacher?.requiredTaught || 2} tiết chỉ tiêu
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round(((props.teacherStats?.taughtCount ?? 0) / (props.currentTeacher?.requiredTaught || 2)) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Tổng hợp từ tất cả các danh mục: Mầm non, K-12, và ESL.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
                    Tiết Đi Dự Giờ (Evaluator)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-black">
                    {props.teacherStats?.eslObservedCount || 0} tiết ESL
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {props.teacherStats?.observedCount ?? 0}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    / {props.currentTeacher?.requiredObserved || 10} tiết chỉ tiêu
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round(((props.teacherStats?.observedCount ?? 0) / (props.currentTeacher?.requiredObserved || 10)) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Đã hoàn thành đánh giá và nộp phiếu nhận xét.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
