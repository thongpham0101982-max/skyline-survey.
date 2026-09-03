const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio-gvnn', 'client.tsx');

const p2 = `
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

  // Observed Teacher State
  const [observedDeptId, setObservedDeptId] = useState<string>("ALL");
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

  const allTeachers = useMemo(() => {
    return props.teachers || [];
  }, [props.teachers]);

  // Comprehensive matching for Departments (Direct ID, Department Rel, Assignments, Teaching Grades, and Keywords)
  const filteredObservedTeachers = useMemo(() => {
    if (!observedDeptId || observedDeptId === "ALL") return allTeachers;

    const selectedDeptObj = (props.departments || []).find((d: any) => d.id === observedDeptId);
    const targetName = cleanStr(selectedDeptObj?.name || observedDeptId);

    return allTeachers.filter((t: any) => {
      // 1. Direct ID match
      if (t.departmentId === observedDeptId || t.departmentRel?.id === observedDeptId) return true;
      if (t.departmentAssignments && t.departmentAssignments.some((da: any) => da.departmentId === observedDeptId)) return true;

      // 2. Direct Name match
      if (selectedDeptObj) {
        if (t.department === selectedDeptObj.name || t.departmentRel?.name === selectedDeptObj.name) return true;
        if (t.departmentAssignments && t.departmentAssignments.some((da: any) => da.departmentName === selectedDeptObj.name)) return true;
      }

      // 3. Normalized text matching
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
  }, [allTeachers, observedDeptId, props.departments]);

  const selectedTeacher = useMemo(() => {
    return allTeachers.find((t: any) => t.id === teacherId);
  }, [allTeachers, teacherId]);

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
    const t = allTeachers.find((x: any) => x.id === tid);
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
          ? strengths.map(s => "• " + s).join("\\n")
          : "• Demonstrated strong classroom control and clear communicative staging.",
      keyChallenges:
        challenges.length > 0
          ? challenges.map(c => "• " + c).join("\\n")
          : "• Maintain tighter pacing during the final production/wrap-up stage.",
      studentProgressEvidence:
        impacts.length > 0
          ? impacts.map(imp => "• " + imp).join("\\n")
          : "• Over 80% of students actively produced target language during communicative activities.",
      agreedActions:
        prev.agreedActions ||
        "1. Prioritize concept-checking questions (CCQs) before independent pair work.\\n2. Allocate at least 5-7 minutes for structured consolidation and formative check."
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
`;

fs.appendFileSync(target, p2, 'utf8');
console.log('Part 2 appended');
