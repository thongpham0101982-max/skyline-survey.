"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Users, Save, CheckCircle2, CalendarDays, Layers, X, Clock, SlidersHorizontal, ShieldCheck, GraduationCap, TrendingUp, AlertCircle } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import PsychologyAssessmentForm from "./PsychologyAssessmentForm";
import ChildDevStandardForm from "./ChildDevStandardForm";
import ThinkingSkillsForm from "./ThinkingSkillsForm";
import PreschoolEvaluationForm from "./PreschoolEvaluationForm";

export default function TeacherAssessmentsClient({ user }: { user: any }) {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [activeChartTab, setActiveChartTab] = useState<"grade" | "class">("grade");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
    const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
    const [latestBatchInfo, setLatestBatchInfo] = useState<any>(null);

    useEffect(() => {
        if (Array.isArray(assignments) && assignments.length > 0 && !selectedPeriodId) {
            const allBatchesMap = new Map();
            assignments.forEach(a => {
                if (a && a.batch && a.period) {
                    allBatchesMap.set(a.batchId, {
                        ...a.batch,
                        periodId: a.periodId,
                        periodName: a.period.name,
                        periodCode: a.period.code
                    });
                }
            });
            const allBatches = Array.from(allBatchesMap.values());
            
            if (allBatches.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                let activeBatch = allBatches.find((b: any) => {
                    if (!b.startDate || !b.endDate) return false;
                    const start = new Date(b.startDate);
                    const end = new Date(b.endDate);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    return today >= start && today <= end;
                });
                
                if (!activeBatch) {
                    const todayTime = today.getTime();
                    const sorted = [...allBatches].sort((a, b) => {
                        const dateA = new Date(a.endDate || a.startDate || 0).getTime();
                        const dateB = new Date(b.endDate || b.startDate || 0).getTime();
                        return Math.abs(dateA - todayTime) - Math.abs(dateB - todayTime);
                    });
                    activeBatch = sorted[0];
                }
                
                if (activeBatch) {
                    setSelectedPeriodId(activeBatch.periodId);
                    setSelectedBatchId(activeBatch.id);
                }
            }
        }
    }, [assignments, selectedPeriodId]);

    useEffect(() => {
        if (!Array.isArray(assignments) || assignments.length === 0) {
            setLatestBatchInfo(null);
            return;
        }

        const allBatchesMap = new Map();
        assignments.forEach(a => {
            if (a && a.batch && a.period && (!selectedPeriodId || a.periodId === selectedPeriodId)) {
                allBatchesMap.set(a.batchId, {
                    ...a.batch,
                    periodId: a.periodId,
                    periodName: a.period.name,
                    periodCode: a.period.code
                });
            }
        });
        const allBatches = Array.from(allBatchesMap.values());
        
        if (allBatches.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const activeBatch = allBatches.find((b: any) => {
                if (!b.startDate || !b.endDate) return false;
                const start = new Date(b.startDate);
                const end = new Date(b.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return today >= start && today <= end;
            });
            
            setLatestBatchInfo(activeBatch || null);
        } else {
            setLatestBatchInfo(null);
        }
    }, [assignments, selectedPeriodId]);
    const latestBatchStats = useMemo(() => {
        if (!latestBatchInfo || !Array.isArray(assignments)) return [];
        
        const batchAssignments = assignments.filter(a => a.batchId === latestBatchInfo.id);
        const groups = new Map();
        
        batchAssignments.forEach(a => {
            const grade = a.grade || "Mầm non";
            let system = a.educationSystem || "Mầm non";
            if (a.isPreschool) {
                system = "Mầm non";
            }
            
            const key = grade + "__" + system;
            const count = a.studentCount || 0;
            
            if (!groups.has(key)) {
                groups.set(key, { grade, system, count });
            } else {
                const grp = groups.get(key);
                grp.count = Math.max(grp.count, count);
            }
        });
        
        return Array.from(groups.values()).filter(g => g.count > 0);
    }, [assignments, latestBatchInfo]);

    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("all");
    const [selectedSystemCode, setSelectedSystemCode] = useState<string>("all");
    const [isUnlockRequestOpen, setIsUnlockRequestOpen] = useState(false);
    const [unlockReason, setUnlockReason] = useState("");
    
    // Psychology Form States
    const [isPsychModalOpen, setIsPsychModalOpen] = useState(false);
    const [activePsychStudent, setActivePsychStudent] = useState<any>(null);
    const [isChildDevModalOpen, setIsChildDevModalOpen] = useState(false);
    const [isPreschoolModalOpen, setIsPreschoolModalOpen] = useState(false);
    const [activePreschoolStudent, setActivePreschoolStudent] = useState<any>(null);
    const [isThinkingSkillsModalOpen, setIsThinkingSkillsModalOpen] = useState(false);
    const [activeThinkingSkillsStudent, setActiveThinkingSkillsStudent] = useState<any>(null);
    const [activeChildDevStudent, setActiveChildDevStudent] = useState<any>(null);
    
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});
    const [stats, setStats] = useState<any>(null);
    const [evaluationTab, setEvaluationTab] = useState<"pending" | "evaluated">("pending");
    const [currentPage, setCurrentPage] = useState<number>(1);


    const [academicYear, setAcademicYear] = useState<string | null>(null);

    useEffect(() => {
        const handleYearChange = () => {
            setAcademicYear(localStorage.getItem("selectedAcademicYear"));
        };
        window.addEventListener("academicYearChanged", handleYearChange);
        handleYearChange();
        return () => window.removeEventListener("academicYearChanged", handleYearChange);
    }, []);

    useEffect(() => {
        if (academicYear === null) return;
        fetch(`/api/teacher-assessments?action=getStats&academicYearId=${academicYear}`)
            .then(res => res.json())
            .then(data => {
                if (data && typeof data.total === 'number') {
                    setStats(data);
                } else {
                    setStats(null);
                }
            })
            .catch(() => setStats(null));
    }, [academicYear]);

    useEffect(() => {
        if (academicYear === null) return;
        setLoading(true);
        fetch(`/api/teacher-assessments?action=getAssignments&academicYearId=${academicYear}`)
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) {
                    setAssignments(data);
                    setSelectedPeriodId("");
                    setSelectedBatchId("");
                    setSelectedAssignmentId("");
                    setStudents([]);
                } else {
                    console.error('API Error:', data);
                    setAssignments([]);
                    setSelectedPeriodId("");
                    setSelectedAssignmentId("");
                    setStudents([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setAssignments([]);
                setSelectedPeriodId("");
                setSelectedAssignmentId("");
                setStudents([]);
                setLoading(false);
            });
    }, [academicYear]);

    // Filtered lists
    const periods = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const pMap = new Map();
        assignments.forEach(a => { if (a && a.period) pMap.set(a.periodId, a.period) });
        return Array.from(pMap.values());
    }, [assignments]);

    const batches = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const bMap = new Map();
        assignments.forEach(a => {
            if (a.periodId === selectedPeriodId && a.batch) {
                bMap.set(a.batchId, a.batch);
            }
        });
        return Array.from(bMap.values());
    }, [assignments, selectedPeriodId]);

    
    const availableAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        const filtered = assignments.filter(a => a.periodId === selectedPeriodId && (selectedBatchId === "all" || !a.batchId || a.batchId === selectedBatchId));
        
        // Group by subjectId to consolidate the dropdown
        const unique = new Map();
        filtered.forEach(a => {
            const subNameNormalized = (a.subject?.name || "").toLowerCase().normalize("NFC");
            const subCode = (a.subject?.code || "").toLowerCase();
            const gradeVal = String(a.grade || "").replace("Khối ", "").trim();
            const isChildDev = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";
            
            if (isChildDev) {
                const key = a.subjectId; // Group ALL Child Dev into one subject
                if (!unique.has(key)) {
                    unique.set(key, { ...a, overrideSystemLabel: "", overrideSystemCode: "", grade: "" });
                }
            } else if (a.isPreschoolProbation) {
                const key = "preschool-probation";
                if (!unique.has(key)) {
                    unique.set(key, { ...a, id: "preschool-probation-all", grade: "", overrideSystemLabel: "", subject: { ...a.subject, name: "Đánh giá Học thử (Mầm non)" } });
                }
            } else if (a.isPreschool) {
                const key = "preschool";
                if (!unique.has(key)) {
                    unique.set(key, { ...a, id: "preschool-all", grade: "", overrideSystemLabel: "", subject: { ...a.subject, name: "Đánh giá Mầm non" } });
                }
            } else {
                const key = a.subjectId;
                if (!unique.has(key)) {
                    unique.set(key, { ...a, overrideSystemLabel: "", overrideSystemCode: "", grade: "" });
                }
            }
        });
        
        return Array.from(unique.values());
    }, [assignments, selectedPeriodId, selectedBatchId]);


    // Tinh toan danh sach khoi co san dua tren mon dang chon va ky/dot (chi hien voi Pho thong)
    const availableGradeOptions = useMemo(() => {
        if (!selectedAssignmentId || !Array.isArray(assignments)) return [];
        const currentAssign = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
        if (!currentAssign) return [];
        const subjectId = currentAssign.subjectId;
        if (!subjectId || subjectId === "preschool" || currentAssign.isPreschool) return [];
        
        const relatedAssignments = assignments.filter(a =>
            a.subjectId === subjectId &&
            a.periodId === selectedPeriodId &&
            (selectedBatchId === "all" || !a.batchId || a.batchId === selectedBatchId)
        );
        
        const gradeMap = new Map<string, { grade: string; educationSystem: string }>();
        relatedAssignments.forEach(a => {
            const g = (a.grade || "").trim();
            const sys = (a.educationSystem || "").trim();
            if (g) {
                const key = `${g}__${sys}`;
                gradeMap.set(key, { grade: g, educationSystem: sys });
            }
        });
        
        return Array.from(gradeMap.values());
    }, [selectedAssignmentId, assignments, selectedPeriodId, selectedBatchId, availableAssignments]);

    const uniqueGrades = useMemo(() => {
        const grades = new Set();
        availableGradeOptions.forEach(opt => {
            if (opt.grade) grades.add(opt.grade);
        });
        return Array.from(grades).sort((a, b) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a).localeCompare(String(b));
        });
    }, [availableGradeOptions]);

    const uniqueSystems = useMemo(() => {
        const systems = new Set();
        availableGradeOptions.forEach(opt => {
            if (opt.educationSystem) systems.add(opt.educationSystem);
        });
        return Array.from(systems).sort();
    }, [availableGradeOptions]);

    // Reset grade/system when period changes
    useEffect(() => {
        setSelectedGrade("all");
        setSelectedSystemCode("all");
    }, [selectedPeriodId]);

    // Auto-select batch and subject when period changes
    useEffect(() => {
        if (!selectedPeriodId || !Array.isArray(assignments) || assignments.length === 0) return;

        // Find batches under the selected period
        const bMap = new Map();
        assignments.forEach(a => {
            if (a.periodId === selectedPeriodId && a.batch) {
                bMap.set(a.batchId, a.batch);
            }
        });
        const periodBatches = Array.from(bMap.values());

        let targetBatchId = "all";
        if (periodBatches.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Try to find active batch first
            const activeBatch = periodBatches.find((b: any) => {
                if (!b.startDate || !b.endDate) return false;
                const start = new Date(b.startDate);
                const end = new Date(b.endDate);
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return today >= start && today <= end;
            });
            
            if (activeBatch) {
                targetBatchId = activeBatch.id;
            } else {
                targetBatchId = periodBatches[0].id;
            }
        }
        
        setSelectedBatchId(targetBatchId);
    }, [selectedPeriodId, assignments]);

    // Auto-select assignment (subject) when availableAssignments changes
    useEffect(() => {
        if (availableAssignments.length > 0) {
            const currentValid = availableAssignments.some(a => a.id === selectedAssignmentId);
            if (!currentValid) {
                setSelectedAssignmentId(availableAssignments[0].id);
            }
        } else {
            setSelectedAssignmentId("");
        }
    }, [availableAssignments, selectedAssignmentId]);

    // Reset tab and page when any filter changes
    useEffect(() => {
        setEvaluationTab("pending");
        setCurrentPage(1);
    }, [selectedAssignmentId, selectedBatchId, selectedGrade, selectedSystemCode]);

    // Reset/auto-select grade khi doi mon hoac dot
     
    useEffect(() => {
        // Nếu chỉ có 1 khối/hệ được phân công -> tự động chọn
        if (availableGradeOptions.length === 1) {
            setSelectedGrade(availableGradeOptions[0].grade);
            setSelectedSystemCode(availableGradeOptions[0].educationSystem || "all");
        } else {
            setSelectedGrade("all");
            setSelectedSystemCode("all");
        }
    // availableGradeOptions is intentionally excluded - we read its current value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAssignmentId, selectedBatchId]);

    useEffect(() => {
        if (!selectedAssignmentId) {
            setStudents([]);
            return;
        }
        const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
        if (!assignment) return;

        setLoading(true);
        // Truyen grade va systemCode de loc dung khoi/he khi giao vien chon
        const gradeParam = selectedGrade !== "all" ? selectedGrade : "";
        const systemParam = selectedSystemCode !== "all" ? selectedSystemCode : "";
        
        // Dynamic batch parameter based on selected dropdown
        const batchQueryParam = selectedBatchId === "all" ? "" : selectedBatchId;
        
        fetch(`/api/teacher-assessments?action=getStudents&periodId=${assignment.periodId}&grade=${encodeURIComponent(gradeParam)}&systemCode=${encodeURIComponent(systemParam)}&subjectId=${assignment.subjectId}&batchId=${batchQueryParam}&_t=${Date.now()}`, { cache: "no-store" })
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    console.error('API getStudents error:', data);
                    setStudents([]);
                    setLoading(false);
                    return;
                }
                const enriched = data.map((st: any) => {
                    if (st.isPreschool) return st;
                    const sc = st.scores?.[0];
                    let scoreVals = [];
                    let commentVals = [];
                    try {
                        if (sc?.scores) scoreVals = JSON.parse(sc.scores);
                    } catch (e) {
                        console.error("Error parsing scoreVals:", e);
                    }
                    try {
                        if (sc?.comments) commentVals = JSON.parse(sc.comments);
                    } catch (e) {
                        console.error("Error parsing commentVals:", e);
                    }
                    return {
                        ...st,
                        scoreVals,
                        commentVals
                    };
                });
                setStudents(enriched);
                setLoading(false);
            })
            .catch(err => {
                console.error('Fetch students error:', err);
                setStudents([]);
                setLoading(false);
            });
    }, [selectedAssignmentId, assignments, availableAssignments, selectedBatchId, selectedGrade, selectedSystemCode]);

    const handleScoreChange = (studentId: string, colIndex: number, val: string) => {
        const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
        if (assignment) {
            const subName = (assignment.subject?.name || "").toLowerCase();
            const numVal = parseFloat(val);
            if (!isNaN(numVal)) {
                const student = students.find(s => s.id === studentId);
                const isGrade1 = student && String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim() === "1";
                
                if (subName.includes("vấn đáp")) {
                    const maxScore = isGrade1 ? 10 : 30;
                    if (numVal > maxScore) {
                        alert(`Điểm Tiếng Anh (vấn đáp) tối đa là ${maxScore} đ!`);
                        val = String(maxScore);
                    }
                } else if (subName.includes("viết") && numVal > 70) {
                    alert("Điểm Tiếng Anh (viết) tối đa là 70 đ!");
                    val = "70";
                } else if (numVal > 10 && !subName.includes("tiếng anh") && !subName.includes("tâm lý")) {
                    // Standard max score for other subjects might be 10, but we just enforce English for now
                }
            }
        }
        setStudents(prev => prev.map(st => {
            if (st.id === studentId) {
                const newScores = [...(st.scoreVals || [])];
                newScores[colIndex] = val;
                return { ...st, scoreVals: newScores };
            }
            return st;
        }));
    };

    const handleCommentChange = (studentId: string, colIndex: number, val: string) => {
        setStudents(prev => prev.map(st => {
            if (st.id === studentId) {
                const newComments = [...(st.commentVals || [])];
                newComments[colIndex] = val;
                return { ...st, commentVals: newComments };
            }
            return st;
        }));
    };

    
      const saveStudentScore = async (st: any, customScores?: any[], customComments?: any[]) => {
        const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
        if (!assignment) return;

        setSaveStatus(prev => ({ ...prev, [st.id]: "saving" }));
        
        try {
            const payload = {
                studentId: st.id,
                subjectId: assignment.subjectId,
                scores: customScores || st.scoreVals || [],
                comments: customComments || st.commentVals || []
            };

            const res = await fetch("/api/teacher-assessments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSaveStatus(prev => ({ ...prev, [st.id]: "saved" }));
                
                // Update local state for this student
                setStudents(prev => prev.map(s => s.id === st.id ? { 
                    ...s, 
                    scoreVals: customScores || s.scoreVals, 
                    commentVals: customComments || s.commentVals,
                    scores: s.scores?.length > 0 ? s.scores : [{ id: "temp", scores: JSON.stringify(customScores || s.scoreVals) }]
                } : s));

                setTimeout(() => setSaveStatus(prev => ({ ...prev, [st.id]: "" })), 2000);
                
                if (customScores) {
                    setIsPsychModalOpen(false);
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                setSaveStatus(prev => ({ ...prev, [st.id]: "error" }));
                if (customScores) alert("Có lỗi khi lưu kết quả: " + (errData?.error || res.statusText));
            }
        } catch (err: any) {
            console.error('saveStudentScore error:', err);
            setSaveStatus(prev => ({ ...prev, [st.id]: "error" }));
            if (customScores) alert("Có lỗi kết nối khi lưu kết quả!");
        }
    };

    // Early return moved below hook definitions to prevent React Rules of Hooks violation

    const currentAssignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
    
    // Detection logic for Psychology Grades 1-5
    const subName = (currentAssignment?.subject?.name || "").toLowerCase();
    const subCode = (currentAssignment?.subject?.code || "").toLowerCase();
    const subNameNormalized = subName.normalize("NFC");
    const gradeVal = String(currentAssignment?.grade || "").replace("Khối ", "").trim();
    const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");
    const isPreschoolSubject = currentAssignment?.isPreschool || currentAssignment?.subjectId === "preschool" || currentAssignment?.subjectId === "preschool-probation" || currentAssignment?.isPreschoolProbation;
    const isPreschoolProbationSubject = currentAssignment?.isPreschoolProbation || currentAssignment?.subjectId === "preschool-probation" || subName.includes("học thử") || subCode.includes("probation");
    const isChildDevSubject = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && (gradeVal === "1" || gradeVal === "Tất cả" || gradeVal === "" || gradeVal === "");
        const isThinkingSkillsSubject = (subNameNormalized.includes("năng lực tư duy") || subCode.includes("nltd")) && (gradeVal === "1" || gradeVal === "Tất cả");
    const hideComments = ["toa", "tvi", "nva"].some(c => subCode.includes(c)) || ["toán", "tiếng việt", "ngữ văn"].some(s => subNameNormalized.includes(s));

    // English grouping logic for tabs
    const isEnglishAssignment = subName.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl");
    const relatedEnglishAssignments = isEnglishAssignment ? availableAssignments.filter(a => 
        (a.subject?.name?.toLowerCase().includes("tiếng anh") || a.subject?.code?.toLowerCase().includes("eng") || a.subject?.code?.toLowerCase().includes("esl")) &&
        a.grade === currentAssignment.grade &&
        a.educationSystem === currentAssignment.educationSystem &&
        a.batchId === currentAssignment.batchId &&
        a.periodId === currentAssignment.periodId
    ).sort((a,b) => (a.subject?.name || "").localeCompare(b.subject?.name || "")) : [];
  
    const fetchAssignments = () => {
        fetch("/api/teacher-assessments?action=getAssignments")
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) setAssignments(data);
                else setAssignments([]);
            });
    };
    const handleUnlockRequestSubmit = async () => {
    if (!unlockReason.trim()) { alert("Vui lòng nhập lý do."); return; }
    const r = await fetch("/api/teacher-assessments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "requestUnlock", assignmentId: selectedAssignmentId, reason: unlockReason }) });
    if (r.ok) {
        setIsUnlockRequestOpen(false);
        setUnlockReason("");
        fetchAssignments();
        alert("Đã gửi yêu cầu mở khóa thành công!");
    } else alert("Lỗi: " + (await r.json()).error);
  };
  const isPeriodLocked = currentAssignment?.period ? currentAssignment.period.status !== "ACTIVE" : false;
  const isBatchLocked = currentAssignment?.batch ? (currentAssignment.batch.status === "LOCKED" || currentAssignment.batch.status === "CLOSED") : false;
  const isLocked = currentAssignment ? (isPeriodLocked || isBatchLocked) && currentAssignment.unlockRequestStatus !== "APPROVED" : false;

  // Helper to determine if a student is evaluated/saved
  const isStudentSaved = (st: any) => {
    const isCustomSubject = isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject;
    if (isCustomSubject) {
      if (isPreschoolSubject) {
        return st.scoredCount > 0;
      }
      if (isThinkingSkillsSubject) {
        return st.scoreVals?.length >= 1;
      }
      if (isChildDevSubject) {
        return st.scoreVals?.length >= 1;
      }
      if (isPsychSubject) {
        return st.scoreVals?.length >= 7;
      }
      return false;
    }
    return (st.scores && st.scores.length > 0) || saveStatus[st.id] === "saved";
  };

  const gradeChartData = useMemo(() => {
    if (!stats?.grades) return [];
    return Object.entries(stats.grades)
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([grade, count]) => ({
        grade,
        count
      }));
  }, [stats]);

  const classChartData = useMemo(() => {
    if (!students || students.length === 0) return [];
    const classMap: Record<string, { className: string, total: number, evaluated: number, pending: number }> = {};
    
    students.forEach(st => {
      let cls = st.className;
      if (!cls || cls.trim() === "") {
        const gradePart = st.grade ? `Khối ${st.grade}` : "K.Rõ";
        const sysPart = st.surveyFormType || "Hệ Khác";
        cls = `${gradePart} - ${sysPart}`;
      }
      
      if (!classMap[cls]) {
        classMap[cls] = { className: cls, total: 0, evaluated: 0, pending: 0 };
      }
      classMap[cls].total++;
      if (isStudentSaved(st)) {
        classMap[cls].evaluated++;
      } else {
        classMap[cls].pending++;
      }
    });
    
    return Object.values(classMap).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  }, [students]);


  const pendingStudents = useMemo(() => {
    return students.filter(st => !isStudentSaved(st));
  }, [students, isPsychSubject, isChildDevSubject, isThinkingSkillsSubject, isPreschoolSubject, saveStatus]);

  const evaluatedStudents = useMemo(() => {
    return students.filter(st => isStudentSaved(st));
  }, [students, isPsychSubject, isChildDevSubject, isThinkingSkillsSubject, isPreschoolSubject, saveStatus]);

  const currentTabStudents = useMemo(() => {
    return evaluationTab === "pending" ? pendingStudents : evaluatedStudents;
  }, [evaluationTab, pendingStudents, evaluatedStudents]);

  const totalPages = Math.ceil(currentTabStudents.length / 10) || 1;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const paginatedStudents = useMemo(() => {
    const start = (safeCurrentPage - 1) * 10;
    return currentTabStudents.slice(start, start + 10);
  }, [currentTabStudents, safeCurrentPage]);

  if (loading && assignments.length === 0) {
    return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
  }

    return (
        <div className="p-3 md:p-6 max-w-[1400px] mx-auto space-y-5 md:space-y-6">
            
            
            {/* Premium Welcome Greeting Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#003B3A] via-[#005650] to-[#48BFE3] rounded-[2rem] p-6 text-white shadow-xl shadow-teal-950/10 animate-fade-in">
                {/* Background ambient details */}
                <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-[#48BFE3]/20 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4.5">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-[#48BFE3] flex items-center justify-center shadow-inner">
                            <GraduationCap className="w-8 h-8 text-teal-100" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black tracking-widest text-teal-200 uppercase block mb-1">CỔNG THÔNG TIN GV</span>
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Nhập kết quả Khảo sát đầu vào</h1>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-teal-100/90 font-medium">Giáo viên phụ trách:</span>
                                <span className="text-xs font-black text-white bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-lg backdrop-blur-sm">
                                    {user?.fullName || user?.name || "Giáo viên"}
                                </span>
                                <a 
                                    href="/admin/xet-duyet-ket-qua" 
                                    className="inline-flex items-center gap-1.5 bg-[#48BFE3] hover:bg-[#3baecf] text-white px-3 py-1 rounded-xl text-xs font-extrabold shadow-md shadow-teal-900/20 transition-all border border-white/20 ml-2 active:scale-95"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Xét duyệt kết quả (BGH MN)</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {currentAssignment && (
                        <div className="md:max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-inner animate-in fade-in slide-in-from-right-4">
                            <div className="flex gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-xs text-teal-50/95 leading-relaxed font-semibold">
                                    Thân chào thầy/cô. Bạn được phân công <strong className="text-white font-black">{currentAssignment?.batch?.name || "các đợt"}</strong> trong kỳ khảo sát <strong className="text-white font-black">{currentAssignment?.period?.name}</strong>. Vui lòng hoàn thành theo đúng tiến độ.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>



            {/* Premium Charts Panel */}
            {stats && stats.total > 0 && (
                <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm flex flex-col gap-6 transition-all duration-300 hover:shadow-md animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#48BFE3]/10 text-[#48BFE3] flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-[#48BFE3]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Biểu đồ Phân tích Khảo sát</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trực quan hóa số lượng và so sánh giữa các khối, các lớp</p>
                            </div>
                        </div>
                        
                        {/* Tab Switchers for Charts */}
                        <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50 shadow-inner self-start">
                            <button
                                onClick={() => setActiveChartTab("grade")}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeChartTab === "grade" ? "bg-white text-[#48BFE3] shadow-xs border border-slate-200/50 scale-[1.01]" : "text-slate-500 hover:text-slate-700 cursor-pointer"}`}
                            >
                                Phân bổ theo Khối
                            </button>
                            <button
                                onClick={() => setActiveChartTab("class")}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeChartTab === "class" ? "bg-white text-[#48BFE3] shadow-xs border border-slate-200/50 scale-[1.01]" : "text-slate-500 hover:text-slate-700 cursor-pointer"}`}
                            >
                                So sánh giữa các Lớp
                            </button>
                        </div>
                    </div>

                    <div className="h-80 w-full text-xs">
                        {!isMounted ? (
                            <div className="flex items-center justify-center h-full">
                                <span className="text-xs text-slate-400 font-bold">Đang tải biểu đồ...</span>
                            </div>
                        ) : activeChartTab === "grade" ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={gradeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#48BFE3" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#48BFE3" stopOpacity={0.2}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="grade" 
                                        stroke="#64748b" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        dy={8} 
                                        className="font-semibold" 
                                    />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} className="font-semibold" />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', fontSize: '11px', fontWeight: 'bold' }}
                                        cursor={{ fill: 'rgba(0, 169, 157, 0.04)' }}
                                    />
                                    <Bar dataKey="count" name="Sĩ số khảo sát" fill="url(#colorCount)" radius={[10, 10, 0, 0]} barSize={40} />
                                    <Line type="monotone" dataKey="count" name="Đường xu hướng" stroke="#003B3A" strokeWidth={3} dot={{ fill: '#003B3A', strokeWidth: 2, r: 4 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            students.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                    <Layers className="w-8 h-8 opacity-40 text-slate-400 animate-pulse" />
                                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Chưa chọn Kỳ, Đợt và Môn khảo sát</span>
                                    <span className="text-[9px] font-medium text-slate-400">Biểu đồ so sánh lớp chỉ hiển thị khi đã tải danh sách học sinh</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#48BFE3" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#48BFE3" stopOpacity={0.2}/>
                                            </linearGradient>
                                            <linearGradient id="colorEvaluated" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="className" 
                                            stroke="#64748b" 
                                            fontSize={10} 
                                            tickLine={false} 
                                            axisLine={false} 
                                            dy={8} 
                                            className="font-semibold" 
                                        />
                                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} className="font-semibold" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', fontSize: '11px', fontWeight: 'bold' }}
                                            cursor={{ fill: 'rgba(0, 169, 157, 0.04)' }}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        <Bar dataKey="total" name="Sĩ số khảo sát" fill="url(#colorTotal)" radius={[10, 10, 0, 0]} barSize={24} />
                                        <Bar dataKey="evaluated" name="Đã đánh giá" fill="url(#colorEvaluated)" radius={[10, 10, 0, 0]} barSize={16} />
                                        <Line type="monotone" dataKey="total" name="Sĩ số (Đường so sánh)" stroke="#003B3A" strokeWidth={3} dot={{ fill: '#003B3A', strokeWidth: 2, r: 4 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )
                        )}
                    </div>
                </div>
            )}


            {latestBatchInfo && (
                <div className="no-print relative overflow-hidden p-4 rounded-2xl shadow-md animate-in fade-in slide-in-from-top-4 duration-500 mb-6 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/60 border border-amber-200/80 ring-1 ring-amber-900/5 group hover:shadow-lg transition-all">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                
                <div className="relative flex items-start sm:items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-amber-200/70 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform duration-300">
                <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[13px] font-semibold text-slate-700 leading-relaxed flex flex-wrap items-center gap-y-1.5 gap-x-1">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600 uppercase tracking-widest text-xs py-0.5 px-2.5 rounded-lg bg-white/80 border border-amber-200/50 shadow-sm mr-2 flex items-center gap-1.5">
                Thông báo
                </span>
                <span className="opacity-90">Đợt khảo sát mới nhất:</span> 
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold shadow-md shadow-amber-900/10 mx-0.5 text-xs tracking-wide">
                {latestBatchInfo.name}
                </span> 
                <span className="opacity-90 mx-1">thuộc Kỳ khảo sát</span> 
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-black border border-orange-200/60 shadow-sm mx-0.5 text-xs">
                {latestBatchInfo.periodName}
                </span>
                <span className="opacity-90 ml-0.5">. Vui lòng tiến hành đánh giá.</span>
                </div>
                {latestBatchStats && latestBatchStats.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-amber-200/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 font-medium animate-in fade-in duration-300">
                        <span className="font-bold text-slate-600">Số lượng học sinh phân công:</span>
                        {latestBatchStats.map((stat, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-900 px-2 py-0.5 rounded-md text-[11px] font-bold border border-amber-500/10">
                                {stat.grade} ({stat.system}): {stat.count} HS
                            </span>
                        ))}
                    </div>
                )}
                </div>
                </div>
                </div>
            )}

            {/* Unified Filter Card */}
            <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden p-6 transition-all duration-300 hover:shadow-md animate-in fade-in">
                <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-[#48BFE3]/10 text-[#48BFE3] flex items-center justify-center">
                        <SlidersHorizontal className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Bộ lọc Khảo sát</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lọc kết quả theo các tiêu chí dưới đây</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Kỳ Khảo sát */}
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5 group-hover:text-[#48BFE3] transition-colors">
                            <CalendarDays className="w-3.5 h-3.5 text-[#48BFE3]"/> Kỳ Khảo sát
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedPeriodId} 
                                onChange={e => {
                                    setSelectedPeriodId(e.target.value);
                                    setSelectedBatchId("");
                                    setSelectedAssignmentId("");
                                    setSelectedGrade("all");
                                    setSelectedSystemCode("all");
                                }}
                                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:bg-white focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/10 appearance-none font-bold text-slate-700 shadow-xs transition-all cursor-pointer"
                            >
                                <option value="">-- Chọn Kỳ khảo sát --</option>
                                {periods.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#48BFE3] transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Đợt khảo sát */}
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5 group-hover:text-[#48BFE3] transition-colors">
                            <Layers className="w-3.5 h-3.5 text-[#48BFE3]"/> Đợt khảo sát
                        </label>
                        <div className="relative">
                            <select 
                                disabled={!selectedPeriodId || batches.length === 0}
                                value={selectedBatchId} 
                                onChange={e => {
                                    setSelectedBatchId(e.target.value);
                                    setSelectedAssignmentId("");
                                }}
                                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:bg-white focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/10 appearance-none font-bold text-slate-700 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="">-- Chọn Đợt khảo sát --</option>
                                {selectedPeriodId && <option value="all">Tất cả các đợt</option>}
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#48BFE3] transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Môn Khảo sát */}
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5 group-hover:text-[#48BFE3] transition-colors">
                            <BookOpen className="w-3.5 h-3.5 text-[#48BFE3]"/> Môn Khảo sát
                        </label>
                        <div className="relative">
                            <select 
                                disabled={!selectedPeriodId}
                                value={selectedAssignmentId} 
                                onChange={e => setSelectedAssignmentId(e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:bg-white focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/10 appearance-none font-bold text-slate-700 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="">-- Chọn Môn khảo sát --</option>
                                {availableAssignments.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.subject?.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#48BFE3] transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Lọc theo Khối */}
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5 group-hover:text-[#48BFE3] transition-colors">
                            <GraduationCap className="w-3.5 h-3.5 text-[#48BFE3]"/> Khối lớp
                        </label>
                        <div className="relative">
                            <select
                                disabled={availableGradeOptions.length === 0}
                                value={selectedGrade}
                                onChange={e => setSelectedGrade(e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:bg-white focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/10 appearance-none font-bold text-slate-700 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="all">Tất cả các Khối</option>
                                {uniqueGrades.map(g => (
                                    <option key={g} value={g}>Khối {g}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#48BFE3] transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Lọc theo Hệ đào tạo */}
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5 group-hover:text-[#48BFE3] transition-colors">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#48BFE3]"/> Hệ đào tạo
                        </label>
                        <div className="relative">
                            <select
                                disabled={availableGradeOptions.length === 0}
                                value={selectedSystemCode}
                                onChange={e => setSelectedSystemCode(e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:bg-white focus:border-[#48BFE3] focus:ring-4 focus:ring-[#48BFE3]/10 appearance-none font-bold text-slate-700 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="all">Tất cả các Hệ</option>
                                {uniqueSystems.map(sys => (
                                    <option key={sys} value={sys}>Hệ {sys}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#48BFE3] transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

{currentAssignment && isEnglishAssignment && relatedEnglishAssignments.length > 0 && (
    <div className="-mt-6 mx-auto w-[92%] bg-white/70 backdrop-blur-md p-3 rounded-lg shadow-sm border border-slate-300 mb-6 animate-in fade-in slide-in-from-top-4 flex flex-col gap-2 relative z-20">
        <div className="text-xs font-black text-indigo-400 uppercase tracking-widest pl-1">Danh sách Môn Tiếng Anh:</div>
        <div className="flex flex-wrap gap-2">
            {relatedEnglishAssignments.map(a => (
                <button 
                    key={a.id}
                    onClick={() => setSelectedAssignmentId(a.id)}
                    className={`flex-1 min-w-[150px] py-2 px-4 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${selectedAssignmentId === a.id ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-400 ring-offset-1' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
                >
                    <BookOpen className="w-4 h-4" />
                    {a.subject?.name}
                </button>
            ))}
        </div>
    </div>
)}
{currentAssignment && (
                <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-md overflow-hidden mt-6 transition-all duration-300 hover:shadow-lg">
                    {/* Premium Form Header */}
                    <div className="px-6 py-5 bg-gradient-to-r from-teal-50/20 via-white to-slate-50/30 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#48BFE3] flex items-center justify-center">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                    Danh sách Khảo sát: <span className="text-[#48BFE3] font-extrabold">{currentAssignment?.subject?.name}</span>
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    Hệ đào tạo: {currentAssignment?.educationSystem} | Khối: {selectedGrade !== "all" ? `Khối ${selectedGrade}` : availableGradeOptions.length === 1 ? `Khối ${availableGradeOptions[0]?.grade}` : (availableGradeOptions.length > 1 ? availableGradeOptions.map(o => `${o.grade}`).join(", ") : "Tất cả")}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {isLocked ? (
                                <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                                    🔒 Đã khóa điểm
                                </span>
                            ) : (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                                    🔓 Đang mở nhập điểm
                                </span>
                            )}
                            <span className="text-[10px] font-black border px-3 py-1.5 rounded-xl shadow-xs bg-[#48BFE3]/5 text-[#48BFE3] border-[#48BFE3]/15">
                                {isPsychSubject ? (gradeVal ? `Mẫu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : isChildDevSubject ? "Cấu hình: 1 cột điểm, 1 cột nhận xét" : `Cấu hình: ${currentAssignment?.subject?.scoreColumns ?? 1} cột điểm, ${currentAssignment?.subject?.commentColumns ?? 1} cột nhận xét`}
                            </span>
                        </div>
                    </div>

                    {/* Evaluation Tabs */}
                    <div className="bg-slate-50/40 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
                        <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
                            <button
                                onClick={() => { setEvaluationTab("pending"); setCurrentPage(1); }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${evaluationTab === "pending" ? "bg-white text-[#48BFE3] shadow-md border border-slate-200/50 scale-[1.01]" : "text-slate-500 hover:text-slate-700 hover:bg-white/40"}`}
                            >
                                <Clock className="w-4 h-4" />
                                <span>Đang chờ đánh giá</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${evaluationTab === "pending" ? "bg-[#48BFE3] text-white" : "bg-slate-200 text-slate-600"}`}>
                                    {pendingStudents.length}
                                </span>
                            </button>
                            <button
                                onClick={() => { setEvaluationTab("evaluated"); setCurrentPage(1); }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${evaluationTab === "evaluated" ? "bg-white text-emerald-600 shadow-md border border-slate-200/50 scale-[1.01]" : "text-slate-500 hover:text-emerald-700 hover:bg-white/40"}`}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Xác nhận Đã đánh giá</span>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${evaluationTab === "evaluated" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                                    {evaluatedStudents.length}
                                </span>
                            </button>
                        </div>
                        
                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            Tổng danh sách: <span className="text-slate-700 font-black">{students.length}</span> học sinh
                        </div>
                    </div>

                    {isLocked ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center gap-4 border-t border-slate-100 bg-slate-50/30">
                            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-sm font-black text-rose-800 mb-2 uppercase tracking-wide">Đợt khảo sát đã bị khóa điểm</h3>
                                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                                    Đợt hoặc kỳ khảo sát này đã được thiết lập sang trạng thái <strong>KHÓA / KẾT THÚC</strong> nên form nhập liệu đã được ẩn đi. <br/>
                                    Để điều chỉnh thông tin, vui lòng liên hệ Người phụ trách: <strong>{currentAssignment?.period?.assignedUser?.fullName || "Ban Khảo thí"}</strong>.
                                </p>
                            </div>
                            {currentAssignment?.unlockRequestStatus === "REJECTED" && (
                                <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl font-bold border border-red-100 shadow-xs">
                                    ❌ Yêu cầu mở khóa của thầy/cô đã bị từ chối.
                                </div>
                            )}
                            {currentAssignment?.unlockRequestStatus === "PENDING" ? (
                                <div className="text-amber-600 text-xs font-black shadow-xs inline-flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15"></path></svg>
                                    Yêu cầu mở khóa đang chờ duyệt...
                                </div>
                            ) : (
                                <button onClick={() => setIsUnlockRequestOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-rose-600/20 active:scale-95 text-xs">
                                    Gửi yêu cầu cấp quyền nhập điểm
                                </button>
                            )}
                        </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto p-4 custom-scrollbar" style={{maxWidth: "100%", width: "100%"}}>
                        <table className="w-full text-xs text-left border-collapse min-w-max">
                            <thead className="text-xs font-semibold">
    <tr>
        <th className="px-2 py-2 w-12 text-center font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs md:sticky md:left-0 z-20">STT</th>
        <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs whitespace-nowrap text-center">Mã HS KS</th>
          <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs whitespace-nowrap text-left">Họ và Tên</th>
          <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs whitespace-nowrap text-center">Khối</th>
          <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs whitespace-nowrap text-center">Giới tính</th>
          <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs whitespace-nowrap text-center">Ngày sinh</th>
          <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs whitespace-nowrap text-center">Hệ Khảo sát</th>
        <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs text-center">
            {isPreschoolProbationSubject ? "Form ĐG Học thử" : (isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết Điểm" : "Chi tiết Điểm & Nhận xét"))}
        </th>
        {(isChildDevSubject || isThinkingSkillsSubject) && (
            <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs text-left min-w-[250px]">Nhận xét chung</th>
        )}
        {isPsychSubject && (
            <>
                <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>
                <th className="px-2 py-2 font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>
            </>
        )}
        <th className="px-2 py-2 md:px-4 md:py-4 text-center font-bold text-[#48BFE3] bg-[#48BFE3]/5 border-[#48BFE3]/20 uppercase tracking-wider text-xs w-32 md:sticky md:right-0 z-20">Xác nhận</th>
    </tr>
</thead>
                            <tbody className="divide-y divide-slate-100 border-b border-slate-100">
                                {paginatedStudents.map((st, idx) => {
                                    const serialNumber = (safeCurrentPage - 1) * 10 + idx + 1;
                                    return (
                                        <tr key={st.id} className="hover:bg-[#48BFE3]/5 transition-colors border-b border-slate-100 last:border-none">
                                            <td className="p-2 p-2 md:p-2 md:p-2 text-center text-slate-500 bg-transparent md:sticky md:left-0 z-10 font-medium text-xs border border-slate-200">{serialNumber}</td>
                                        <td className="p-2 p-2 bg-transparent text-center border border-slate-200">
                                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full text-xs">{st.studentCode}</span>
                                          </td>
                                          <td className="p-2 p-2 bg-transparent text-left border border-slate-200">
                                              <span className="font-bold text-slate-700 text-xs whitespace-nowrap">{st.fullName}</span>
                                          </td>
                                          <td className="p-2 p-2 bg-transparent text-center border border-slate-200">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{st.grade}</span>
          </td>
          <td className="p-2 p-2 bg-transparent text-center border border-slate-200">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{st.gender === "M" || st.gender === "Nam" ? "Nam" : st.gender === "F" || st.gender === "Nữ" ? "Nữ" : st.gender || "—"}</span>
          </td>
                                          <td className="p-2 p-2 bg-transparent text-center border border-slate-200">
                                              <span className="text-xs text-slate-500 whitespace-nowrap">{st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</span>
                                          </td>
                                          <td className="p-2 p-2 bg-transparent text-center border border-slate-200">
                                              <span className="text-[10px] font-bold text-amber-700 whitespace-nowrap uppercase text-xs font-semibold">{st.surveyFormType || "—"}</span>
                                          </td>
                                        
                                        <td className="p-2 p-2 bg-transparent border border-slate-200">            {isPreschoolSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActivePreschoolStudent(st); setIsPreschoolModalOpen(true); }}
                    className={st.scoredCount > 0 
                      ? "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                      : "bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs border border-pink-100"
                    }
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    {st.scoredCount > 0 ? "Xem lại Đánh giá" : "Mở Form Đánh giá"}
                  </button>
                  {st.scoredCount > 0 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-black text-pink-600 w-fit uppercase tracking-wider text-xs font-semibold">
                              Tiến độ: {st.scoredCount}/{st.totalCriteria} tiêu chí
                          </span>
                      </div>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>            ) : isThinkingSkillsSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActiveThinkingSkillsStudent(st); setIsThinkingSkillsModalOpen(true); }}
                    className={st.scoreVals?.length >= 1
                      ? "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                      : "bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                    }
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    {st.scoreVals?.length >= 1 ? "Xem lại Đánh giá" : "Mở Form Đánh giá"}
                  </button>
                  {st.scoreVals?.length >= 1 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 w-fit text-xs font-semibold">Đã đánh giá</span>
                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Logic: {st.scoreVals[0] || "-"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-[#48BFE3]">L.Tưởng: {st.scoreVals[1] || "-"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-rose-500">P.Biện: {st.scoreVals[2] || "-"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-amber-500">GQ.VĐ: {st.scoreVals[3] || "-"}</span>
                          </div>
                          <div className="text-[11px] font-bold text-sky-600 mt-0.5">HT Thử thách: {st.scoreVals[4] || "0"}%</div>
                      </div>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>            ) : isChildDevSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}
                    className={st.scoreVals?.length >= 1
                      ? "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                      : "bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                    }
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    {st.scoreVals?.length >= 1 ? "Xem lại Đánh giá" : "Mở Form Đánh giá"}
                  </button>
                  {st.scoreVals?.length >= 1 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 w-fit text-xs font-semibold">Đã lưu điểm</span>
                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Đạt: {st.scoreVals.filter((v: string) => v === "3").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-rose-500">K.Đạt: {st.scoreVals.filter((v: string) => v === "2").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-slate-500">K.Làm: {st.scoreVals.filter((v: string) => v === "1").length}</span>
                          </div>
                          {st.commentVals && st.commentVals[0] && (
                              <div className="text-[11px] text-slate-500 line-clamp-2 italic p-1 text-xs font-semibold">"{st.commentVals[0]}"</div>
                          )}
                      </div>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>            ) : isPsychSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActivePsychStudent(st); setIsPsychModalOpen(true); }}
                    className={st.scoreVals?.length >= 7
                      ? "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                      : "bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold py-1 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                    }
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    {st.scoreVals?.length >= 7 ? `Xem lại Form Khối ${st.grade || "Cơ bản"}` : `Mở Form Khối ${st.grade || "Cơ bản"}`}
                  </button>
                  {st.scoreVals?.length >= 7 && (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-[1px] bg-slate-200"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đã chấm</span>
                        <span className="text-indigo-600 font-black text-lg">{st.scoreVals[6] || st.scoreVals[20] || '0'} <span className="text-xs text-slate-400 font-bold uppercase ml-1">Điểm</span></span>
                      </div>
                      {(() => {
                          const normalizedGrade = String(st.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
                          if (!["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(normalizedGrade)) return null;
                          const score = parseFloat(st.scoreVals[6] || st.scoreVals[20] || '0');
                          let level = ""; let color = "";
                          if (score <= 15) { level = "Bình thường"; color = "text-emerald-700 bg-emerald-50 border-emerald-200"; }
                          else if (score <= 31) { level = "Dấu hiệu nhẹ"; color = "text-blue-700 bg-blue-50 border-blue-200"; }
                          else if (score <= 47) { level = "Dấu hiệu vừa"; color = "text-amber-700 bg-amber-50 border-slate-300"; }
                          else if (score <= 63) { level = "Nguy cơ cao"; color = "text-orange-700 bg-orange-50 border-orange-200"; }
                          else { level = "Nguy cơ rất cao"; color = "text-red-700 bg-red-50 border-red-200"; }
                          return (
                              <div className={`ml-2 px-3 py-1.5 rounded-xl border font-bold text-[11px] uppercase tracking-wide shadow-sm ${color}`}>
                                  {level}
                              </div>
                          );
                      })()}
                    </div>
                  )}
                  {(!st.scoreVals || st.scoreVals.length < 7) && (
                    <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>
            ) : (
            <div className="flex flex-wrap gap-4 items-start">
                {Array.from({length: (currentAssignment?.subject?.scoreColumns ?? 1)}).map((_, colIdx) => {
                    let cName = "Điểm " + (colIdx+1);
                    try { if(currentAssignment?.subject?.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.scores && p.scores[colIdx]) cName = p.scores[colIdx]; } } catch(e){}
                    const isTotal = cName.toLowerCase().includes("tổng");
                    const subNameLower = (currentAssignment?.subject?.name || "").toLowerCase();
                    let maxScoreStr = "";
                    if (subNameLower.includes("vấn đáp")) {
                        const isGrade1 = String(st.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim() === "1";
                        maxScoreStr = isGrade1 ? " (Max 10)" : " (Max 30)";
                    } else if (subNameLower.includes("viết")) {
                        maxScoreStr = " (Max 70)";
                    }
                    
                    return (
                        <div key={"sc-input-"+colIdx} className="flex flex-col gap-1.5 w-24 flex-none">
                            <span className="text-[10px] uppercase font-bold text-slate-600 truncate border-b border-slate-200 pb-1" title={cName + maxScoreStr}>{cName}{maxScoreStr && <span className="text-red-500 font-black ml-0.5">{maxScoreStr}</span>}</span>
                            {isTotal ? (
                                <div className="w-full bg-[#F0FDFA] border border-slate-300 rounded-lg py-1 text-center font-black text-[#48BFE3] shadow-inner h-[30px] text-[12px] text-[13px] flex items-center justify-center">
                                    {(st.scoreVals || []).slice(0, colIdx).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0).toLocaleString("vi-VN", {maximumFractionDigits: 2})}
                                </div>
                            ) : (
                                <input 
                                    type="number"
                                    value={st.scoreVals?.[colIdx] || ""}
                                    onChange={e => handleScoreChange(st.id, colIdx, e.target.value)}
                                    disabled={isLocked}
                                    className={`w-full border border-slate-300 rounded-lg py-1 text-center font-bold shadow-sm outline-none transition-all h-[30px] text-[12px] text-[13px] ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white text-slate-800 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/20 placeholder-slate-300"}`}
                                    placeholder="-"
                                />
                            )}
                        </div>
                    );
                })}

                {!hideComments && Array.from({length: (currentAssignment?.subject?.commentColumns ?? 1)}).map((_, colIdx) => {
                    let cName = "Nhận xét " + (colIdx+1);
                    try { if(currentAssignment?.subject?.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.comments && p.comments[colIdx]) cName = p.comments[colIdx]; } } catch(e){}
                    return (
                        <div key={"cm-input-"+colIdx} className="flex flex-col gap-1.5 w-full min-w-[200px] flex-1">
                            <span className="text-[10px] uppercase font-bold text-slate-600 truncate border-b border-slate-200 pb-1" title={cName}>{cName}</span>
                            <textarea 
                                value={st.commentVals?.[colIdx] || ""}
                                onChange={e => handleCommentChange(st.id, colIdx, e.target.value)}
                                disabled={isLocked}
                                rows={2}
                                className={`w-full border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-medium shadow-sm outline-none transition-all resize-y min-h-[50px] max-h-[120px] text-[12px] text-[13px] leading-relaxed custom-scrollbar ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white text-slate-700 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/20 placeholder-slate-400"}`}
                                placeholder="Nhập nhận xét..."
                            />
                        </div>
                    );
                })}
            </div>
            )}
        </td>
        {(isChildDevSubject || isThinkingSkillsSubject) && (
            <td className="p-2 p-2 bg-transparent text-left align-top max-w-[250px] border border-slate-200">
                <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium italic">
                    {st.commentVals?.[0] ? `"${st.commentVals[0]}"` : "-"}
                </div>
            </td>
        )}
        {isPsychSubject && (
            <>
                <td className="p-2 p-2 bg-transparent text-left align-top max-w-[250px] border border-slate-200">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[0] || "-"}</div>
                </td>
                <td className="p-2 p-2 bg-transparent text-left align-top max-w-[250px] border border-slate-200">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[1] || "-"}</div>
                </td>
            </>
        )}
<td className="p-2 p-2 md:p-2 md:p-2 text-center bg-transparent md:sticky md:right-0 z-10 md:backdrop-blur-sm border border-slate-200">
                                            {(() => {
                                                const isCustomSubject = isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject;
                                                
                                                if (isCustomSubject) {
                                                    const isCompleted = (() => {
                                                        if (isPreschoolSubject) {
                                                            return st.scoredCount > 0;
                                                        }
                                                        if (isThinkingSkillsSubject) {
                                                            return st.scoreVals?.length >= 1;
                                                        }
                                                        if (isChildDevSubject) {
                                                            return st.scoreVals?.length >= 1;
                                                        }
                                                        if (isPsychSubject) {
                                                            return st.scoreVals?.length >= 7;
                                                        }
                                                        return false;
                                                    })();

                                                    if (isCompleted) {
                                                        return (
                                                            <div className="px-3 py-1 rounded-xl text-xs font-bold flex items-center justify-center w-full gap-2 bg-emerald-500 text-white shadow-sm cursor-default">
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                <span className="hidden md:inline">Đã lưu</span>
                                                            </div>
                                                        );
                                                    } else {
                                                        return (
                                                            <button
                                                                disabled={true}
                                                                className="px-3 py-1 rounded-xl text-xs font-bold flex items-center justify-center w-full gap-2 bg-slate-100 border border-slate-250 text-slate-400 cursor-not-allowed shadow-none"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                                <span className="hidden md:inline">Lưu</span>
                                                            </button>
                                                        );
                                                    }
                                                }

                                                return (
                                                    <button 
                                                        onClick={() => saveStudentScore(st)}
                                                        disabled={isLocked}
                                                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center justify-center w-full gap-2 transition-all shadow-sm ${isLocked ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none" : 
                                                            saveStatus[st.id] === "saved" ? "bg-emerald-500 text-white" : 
                                                            saveStatus[st.id] === "saving" ? "bg-slate-200 text-slate-500" :
                                                            "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"}`}
                                                    >
                                                        {saveStatus[st.id] === "saved" ? <><CheckCircle2 className="w-4 h-4"/> <span className="hidden md:inline">Đã lưu</span></> : <><Save className="w-4 h-4" /> <span className="hidden md:inline">Lưu</span></>}
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                    );
                                })}
                                {paginatedStudents.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-16 text-center text-slate-400 bg-slate-50/50">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Users className="w-10 h-10 text-slate-300 animate-pulse" />
                                                <span className="text-xs font-bold text-slate-500">
                                                    {evaluationTab === "pending" 
                                                        ? "Tất cả học sinh trong danh sách đã được đánh giá hoàn thành!" 
                                                        : "Chưa có học sinh nào được đánh giá trong danh mục này."}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-500 font-semibold">
                                Hiển thị <span className="font-bold text-slate-700">{(safeCurrentPage - 1) * 10 + 1}</span> - <span className="font-bold text-slate-700">{Math.min(safeCurrentPage * 10, currentTabStudents.length)}</span> trên tổng số <span className="font-bold text-slate-700">{currentTabStudents.length}</span> học sinh
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <button
                                    disabled={safeCurrentPage === 1}
                                    onClick={() => setCurrentPage(1)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    title="Trang đầu"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                                </button>
                                
                                <button
                                    disabled={safeCurrentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    title="Trang trước"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                
                                {(() => {
                                    const pages = [];
                                    const maxVisible = 5;
                                    let start = Math.max(1, safeCurrentPage - Math.floor(maxVisible / 2));
                                    const end = Math.min(totalPages, start + maxVisible - 1);
                                    if (end - start + 1 < maxVisible) {
                                        start = Math.max(1, end - maxVisible + 1);
                                    }
                                    for (let p = start; p <= end; p++) {
                                        pages.push(p);
                                    }
                                    return pages.map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${p === safeCurrentPage ? "bg-[#48BFE3] border-[#48BFE3] text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
                                        >
                                            {p}
                                        </button>
                                    ));
                                })()}
                                
                                <button
                                    disabled={safeCurrentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    title="Trang sau"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                                
                                <button
                                    disabled={safeCurrentPage === totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    title="Trang cuối"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                                </button>
                            </div>
                        </div>
                    )}
                      </>
                    )}
                </div>
            )}
        
      {isUnlockRequestOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-[#48BFE3]/5 border-[#48BFE3]/20">
              <h3 className="font-bold text-lg text-slate-800">Yêu cầu Mở khóa Form</h3>
              <button onClick={() => setIsUnlockRequestOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Lý do xin mở khóa bổ sung điểm:</label>
                <textarea 
                    value={unlockReason} 
                    onChange={e => setUnlockReason(e.target.value)} 
                    className="w-full border rounded-xl p-3 text-xs focus:border-[#48BFE3] outline-none h-32 resize-none" 
                    placeholder="VD: Cần chỉnh sửa lại điểm cột Hành vi cho một số học sinh..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsUnlockRequestOpen(false)} className="px-5 py-1 hover:bg-slate-100 rounded-xl font-medium text-slate-600">Hủy</button>
                <button onClick={handleUnlockRequestSubmit} className="text-white font-medium shadow-sm hover:bg-indigo-700 text-xs font-semibold">Gửi Yêu Cầu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPsychSubject && activePsychStudent && isPsychModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-6 py-4 flex justify-between items-center shadow-sm">
            <h3 className="font-bold text-slate-800">Phiếu Đánh giá Tâm lý Chi tiết</h3>
            <button 
              onClick={() => setIsPsychModalOpen(false)}
              className="hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold transition-all flex items-center gap-2 text-xs font-semibold"
            >
              <X className="w-5 h-5" /> Đóng lại
            </button>
          </div>
          <PsychologyAssessmentForm 
            student={activePsychStudent}
            onSave={async (st: any, scores: any[], comments: any[]) => { await saveStudentScore(st, scores, comments); }}
            isLocked={isLocked}
          />
        </div>
      )}

      {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <ChildDevStandardForm 
            student={activeChildDevStudent}
            onSave={async (st: any, scores: any[], comments: any[]) => {
              saveStudentScore(st, scores, comments);
              setIsChildDevModalOpen(false);
            }}
            isLocked={isLocked}
            onClose={() => setIsChildDevModalOpen(false)}
          />
        </div>
      )}
      {isThinkingSkillsSubject && activeThinkingSkillsStudent && isThinkingSkillsModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <ThinkingSkillsForm 
            student={activeThinkingSkillsStudent}
            onSave={async (st: any, scores: any[], comments: any[]) => {
              saveStudentScore(st, scores, comments);
              setIsThinkingSkillsModalOpen(false);
            }}
            onClose={() => setIsThinkingSkillsModalOpen(false)}
            isLocked={isLocked}
          />
        </div>
      )}
      {isPreschoolSubject && activePreschoolStudent && isPreschoolModalOpen && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <PreschoolEvaluationForm 
            student={activePreschoolStudent}
            user={user}
            onSave={async (studentId, scores, comments) => {
              try {
                const isProb = activePreschoolStudent.isPreschoolProbation;
                const endpoint = isProb ? "/api/preschool-probationary-assessment" : "/api/preschool-dev-scores";
                
                let body: any = {};
                if (isProb) {
                  body = {
                    studentId,
                    probationaryScoreText: JSON.stringify(scores),
                    probationaryResult: comments.probationaryResult,
                    probationaryComment: comments.probationaryComment,
                    probationaryPeriod: comments.probationaryPeriod,
                    probationaryClass: comments.probationaryClass,
                    probationaryTeacher: comments.probationaryTeacher,
                    probationaryBghStatus: comments.probationaryBghStatus,
                    probationaryBghComment: comments.probationaryBghComment
                  };
                } else {
                  body = { studentId, scores, ...comments };
                }

                const res = await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body)
                });
                if (res.ok) {
                  setIsPreschoolModalOpen(false);
                  // Refetch student list to update scoredCount and totalCriteria progress
                  const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
                  if (assignment) {
                    const gradeParam = selectedGrade !== "all" ? selectedGrade : "";
                    const systemParam = selectedSystemCode !== "all" ? selectedSystemCode : "";
                    setLoading(true);
                    const batchQueryParam = selectedBatchId === "all" ? "" : selectedBatchId;
                    const response = await fetch(`/api/teacher-assessments?action=getStudents&periodId=${assignment.periodId}&grade=${encodeURIComponent(gradeParam)}&systemCode=${encodeURIComponent(systemParam)}&subjectId=${assignment.subjectId}&batchId=${batchQueryParam}&_t=${Date.now()}`, { cache: "no-store" });
                    if (response.ok) {
                      const data = await response.json();
                      if (Array.isArray(data)) setStudents(data);
                    }
                    setLoading(false);
                  }
                } else {
                  const errData = await res.json().catch(() => ({}));
                  throw new Error(errData?.error || "Lưu kết quả đánh giá mầm non thất bại");
                }
              } catch (err: any) {
                console.error('Preschool save error:', err);
                throw err;
              }
            }}
            onClose={() => setIsPreschoolModalOpen(false)}
            isLocked={isLocked}
          />
        </div>
      )}
        </div>
    );
}



