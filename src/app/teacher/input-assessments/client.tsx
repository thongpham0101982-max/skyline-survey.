/* eslint-disable */
"use client"
// @ts-nocheck

import { useState, useEffect, useMemo } from "react";
import { 
    BookOpen, Users, Save, CheckCircle2, CalendarDays, Layers, X, Clock, 
    SlidersHorizontal, ShieldCheck, GraduationCap, TrendingUp, AlertCircle, 
    Search, ChevronDown, ChevronUp, Sparkles, Filter, Check, RotateCcw, 
    HelpCircle, FileSpreadsheet, ShieldAlert, Award
} from "lucide-react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import PsychologyAssessmentForm from "./PsychologyAssessmentForm";
import ChildDevStandardForm from "./ChildDevStandardForm";
import ThinkingSkillsForm from "./ThinkingSkillsForm";
import PreschoolEvaluationForm from "./PreschoolEvaluationForm";
import DeadlineCountdownBanner from "@/components/shared/DeadlineCountdownBanner";
import ReportExportDrawer from "@/components/testing/ReportExportDrawer";

const QUICK_REMARKS = [
    "Tiếp thu bài nhanh, tự tin và hoàn thành tốt yêu cầu.",
    "Nắm vững kiến thức cơ bản, thao tác bài làm cẩn thận.",
    "Tư duy logic nhạy bén, phản xạ tốt trong các tình huống.",
    "Cần rèn luyện thêm kỹ năng tính toán và chú ý trình bày.",
    "Cần tập trung hơn trong giờ học và chủ động tương tác.",
    "Diễn đạt lưu loát, ngôn từ phong phú, phát âm rõ ràng.",
    "Có tiến bộ trong quá trình làm bài, thái độ tích cực.",
    "Cần củng cố thêm các kiến thức nền tảng của môn học."
];

export default function TeacherAssessmentsClient({ user }: { user: any }) {
    const [assignments, setAssignments] = useState<any[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [activeChartTab, setActiveChartTab] = useState<"grade" | "class">("grade");
    const [isChartCollapsed, setIsChartCollapsed] = useState<boolean>(true);

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
    const [evaluationTab, setEvaluationTab] = useState<"pending" | "evaluated" | "all">("pending");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [isExportDrawerOpen, setIsExportDrawerOpen] = useState<boolean>(false);

    // Productivity & Teacher UX states
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [dirtyStudentIds, setDirtyStudentIds] = useState<Set<string>>(new Set<string>());
    const [isBulkSaving, setIsBulkSaving] = useState<boolean>(false);
    const [quickCommentTarget, setQuickCommentTarget] = useState<{ studentId: string; colIndex: number } | null>(null);

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
                const key = a.subjectId;
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
        const grades = new Set<string>();
        availableGradeOptions.forEach(opt => {
            if (opt.grade) grades.add(opt.grade);
        });
        return Array.from(grades).sort((a: string, b: string) => {
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    }, [availableGradeOptions]);

    const uniqueSystems = useMemo(() => {
        const systems = new Set<string>();
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

    // Reset tab, search, and page when filters change
    useEffect(() => {
        setEvaluationTab("pending");
        setCurrentPage(1);
        setSearchQuery("");
        setDirtyStudentIds(new Set<string>());
    }, [selectedAssignmentId, selectedBatchId, selectedGrade, selectedSystemCode]);

    useEffect(() => {
        if (availableGradeOptions.length === 1) {
            setSelectedGrade(availableGradeOptions[0].grade);
            setSelectedSystemCode(availableGradeOptions[0].educationSystem || "all");
        } else {
            setSelectedGrade("all");
            setSelectedSystemCode("all");
        }
    }, [selectedAssignmentId, selectedBatchId]);

    useEffect(() => {
        if (!selectedAssignmentId) {
            setStudents([]);
            return;
        }
        const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
        if (!assignment) return;

        setLoading(true);
        const gradeParam = selectedGrade !== "all" ? selectedGrade : "";
        const systemParam = selectedSystemCode !== "all" ? selectedSystemCode : "";
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
                    const maxScore = 30;
                    if (numVal > maxScore) {
                        alert(`Điểm Tiếng Anh (vấn đáp) tối đa là ${maxScore} đ!`);
                        val = String(maxScore);
                    }
                } else if (subName.includes("viết")) {
                    if (isGrade1) {
                        alert("Khối 1 không có bài thi Tiếng Anh (viết)!");
                        val = "";
                    } else if (numVal > 70) {
                        alert("Điểm Tiếng Anh (viết) tối đa là 70 đ!");
                        val = "70";
                    }
                }
            }
        }
        setDirtyStudentIds(prev => new Set(prev).add(studentId));
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
        setDirtyStudentIds(prev => new Set(prev).add(studentId));
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
                setDirtyStudentIds(prev => {
                    const next = new Set(prev);
                    next.delete(st.id);
                    return next;
                });
                
                setStudents(prev => prev.map(s => s.id === st.id ? { 
                    ...s, 
                    scoreVals: customScores || s.scoreVals, 
                    commentVals: customComments || s.commentVals,
                    scores: s.scores?.length > 0 ? s.scores : [{ id: "temp", scores: JSON.stringify(customScores || s.scoreVals) }]
                } : s));

                setTimeout(() => setSaveStatus(prev => ({ ...prev, [st.id]: "" })), 2500);
                
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

    const handleBulkSave = async () => {
        if (dirtyStudentIds.size === 0) return;
        setIsBulkSaving(true);
        try {
            const studentList = students.filter(s => dirtyStudentIds.has(s.id));
            for (const st of studentList) {
                await saveStudentScore(st);
            }
            setDirtyStudentIds(new Set<string>());
        } catch (err) {
            console.error("Bulk save error:", err);
            alert("Đã xảy ra lỗi trong quá trình lưu dữ liệu hàng loạt.");
        } finally {
            setIsBulkSaving(false);
        }
    };

    const currentAssignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
    
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
        const r = await fetch("/api/teacher-assessments", { 
            method: "PUT", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ action: "requestUnlock", assignmentId: selectedAssignmentId, reason: unlockReason }) 
        });
        if (r.ok) {
            setIsUnlockRequestOpen(false);
            setUnlockReason("");
            fetchAssignments();
            alert("Đã gửi yêu cầu mở khóa thành công!");
        } else {
            alert("Lỗi: " + (await r.json()).error);
        }
    };

    const isPeriodLocked = currentAssignment?.period ? currentAssignment.period.status !== "ACTIVE" : false;
    const isBatchLocked = currentAssignment?.batch ? (currentAssignment.batch.status === "LOCKED" || currentAssignment.batch.status === "CLOSED") : false;
    const isLocked = currentAssignment ? (isPeriodLocked || isBatchLocked) && currentAssignment.unlockRequestStatus !== "APPROVED" : false;

    const isStudentSaved = (st: any) => {
        const isCustomSubject = isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject;
        if (isCustomSubject) {
            if (isPreschoolSubject) return st.scoredCount > 0;
            if (isThinkingSkillsSubject) return st.scoreVals?.length >= 1;
            if (isChildDevSubject) return st.scoreVals?.length >= 1;
            if (isPsychSubject) return st.scoreVals?.length >= 7;
            return false;
        }
        return (st.scores && st.scores.length > 0) || saveStatus[st.id] === "saved";
    };

    // Overall class statistics (before search filtering)
    const totalClassStudents = students.length;
    const totalEvaluatedStudents = useMemo(() => {
        return students.filter(st => isStudentSaved(st)).length;
    }, [students, isPsychSubject, isChildDevSubject, isThinkingSkillsSubject, isPreschoolSubject, saveStatus]);
    const totalPendingStudents = totalClassStudents - totalEvaluatedStudents;
    const completionPercentage = totalClassStudents > 0 ? Math.round((totalEvaluatedStudents / totalClassStudents) * 100) : 0;

    // Filter students by search term
    const searchedStudents = useMemo(() => {
        if (!students || students.length === 0) return [];
        if (!searchQuery.trim()) return students;
        const q = searchQuery.toLowerCase().trim();
        return students.filter(st => 
            (st.fullName || "").toLowerCase().includes(q) ||
            (st.studentCode || "").toLowerCase().includes(q) ||
            (st.className || "").toLowerCase().includes(q)
        );
    }, [students, searchQuery]);

    const pendingStudents = useMemo(() => {
        return searchedStudents.filter(st => !isStudentSaved(st));
    }, [searchedStudents, isPsychSubject, isChildDevSubject, isThinkingSkillsSubject, isPreschoolSubject, saveStatus]);

    const evaluatedStudents = useMemo(() => {
        return searchedStudents.filter(st => isStudentSaved(st));
    }, [searchedStudents, isPsychSubject, isChildDevSubject, isThinkingSkillsSubject, isPreschoolSubject, saveStatus]);

    const currentTabStudents = useMemo(() => {
        if (evaluationTab === "all") return searchedStudents;
        return evaluationTab === "pending" ? pendingStudents : evaluatedStudents;
    }, [evaluationTab, searchedStudents, pendingStudents, evaluatedStudents]);

    const totalPages = Math.ceil(currentTabStudents.length / 10) || 1;
    const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
    const paginatedStudents = useMemo(() => {
        const start = (safeCurrentPage - 1) * 10;
        return currentTabStudents.slice(start, start + 10);
    }, [currentTabStudents, safeCurrentPage]);

    const gradeChartData = useMemo(() => {
        if (!stats?.grades) return [];
        return Object.entries(stats.grades)
            .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
            .map(([grade, count]) => ({ grade, count }));
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

    if (loading && assignments.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-3 border-[#00A19A] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-[#005854]">Đang tải dữ liệu phân công khảo sát...</span>
            </div>
        );
    }

    return (
        <div className="p-3 md:p-6 max-w-[1440px] mx-auto space-y-5 md:space-y-6">
            
            {/* 1. Header Banner & Context */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#003B3A] via-[#005854] to-[#00A19A] rounded-2xl md:rounded-[2rem] p-6 text-white shadow-xl shadow-teal-950/10">
                <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-[#99F6E4]/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-teal-100 flex items-center justify-center shadow-inner shrink-0 mt-1 sm:mt-0">
                            <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black tracking-widest text-[#99F6E4] uppercase bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                                    CỔNG ĐÁNH GIÁ KHẢO SÁT HỌC SINH
                                </span>
                                {academicYear && (
                                    <span className="text-[10px] font-bold text-teal-100/80 bg-teal-900/40 px-2 py-0.5 rounded-md">
                                        Niên khóa {academicYear}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                                Nhập Kết Quả Khảo Sát Đầu Vào
                            </h1>
                            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                                <span className="text-teal-100/90 font-medium">Giáo viên phụ trách:</span>
                                <span className="font-extrabold text-white bg-white/15 border border-white/20 px-2.5 py-0.5 rounded-lg backdrop-blur-sm">
                                    {user?.fullName || user?.name || "Giáo viên"}
                                </span>
                                {["ADMIN", "BGH_MN", "BGH MN", "BGH"].includes(user?.role) && (
                                    <a 
                                        href="/admin/xet-duyet-ket-qua" 
                                        className="inline-flex items-center gap-1.5 bg-[#008B85] hover:bg-[#00736E] text-white px-3 py-1 rounded-xl text-xs font-bold shadow-md shadow-teal-950/20 transition-all border border-white/20 ml-1 active:scale-95"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Xét duyệt kết quả (BGH MN)</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Progress Card in Hero */}
                    {students.length > 0 && (
                        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-md shadow-inner flex flex-col gap-2 min-w-[280px] sm:min-w-[320px]">
                            <div className="flex items-center justify-between text-xs font-bold text-teal-100">
                                <span>Tiến độ đợt khảo sát:</span>
                                <span className="text-sm font-black text-white">{completionPercentage}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#5EEAD4] to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
                                    style={{ width: `${completionPercentage}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-teal-100/90 pt-1 border-t border-white/10">
                                <span>Đã đánh giá: <strong className="text-white font-black">{totalEvaluatedStudents}</strong>/{totalClassStudents} HS</span>
                                <span>Chưa chấm: <strong className="text-amber-200 font-black">{totalPendingStudents}</strong> HS</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Notification Banner for Latest Batch */}
            {latestBatchInfo && (
                <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-200/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="text-xs text-slate-700 leading-relaxed">
                                <span className="font-extrabold uppercase text-[10px] tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300 mr-2">
                                    Đợt Khảo Sát Mới Nhất
                                </span>
                                <strong>{latestBatchInfo.name}</strong> thuộc <strong>{latestBatchInfo.periodName}</strong>. Vui lòng hoàn thành theo tiến độ quy định.
                            </div>
                        </div>

                        {latestBatchStats && latestBatchStats.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                                <span className="text-[11px] font-bold text-slate-500 mr-1">Phân công:</span>
                                {latestBatchStats.map((stat, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-100/80 text-amber-900 text-[11px] font-bold border border-amber-200">
                                        {stat.grade} ({stat.system}): {stat.count} HS
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. Survey Filter Control Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 md:p-6 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A19A] flex items-center justify-center">
                            <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Bộ Lọc Khảo Sát</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lựa chọn đợt và môn học để tiến hành đánh giá</p>
                        </div>
                    </div>

                    {currentAssignment && (
                        <div className="text-xs font-semibold text-[#00736E] bg-[#F0FDFA] px-3 py-1 rounded-xl border border-teal-100 self-start sm:self-auto">
                            Đang xem: <strong className="font-extrabold text-[#005854]">{currentAssignment?.subject?.name}</strong> {selectedGrade !== "all" ? `(Khối ${selectedGrade})` : ""}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* Kỳ Khảo sát */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-[#00A19A]"/> Kỳ Khảo sát
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
                                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs outline-none focus:bg-white focus:border-[#00A19A] focus:ring-3 focus:ring-[#00A19A]/15 font-bold text-slate-700 transition-all cursor-pointer"
                            >
                                <option value="">-- Chọn Kỳ khảo sát --</option>
                                {periods.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Đợt khảo sát */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#00A19A]"/> Đợt khảo sát
                        </label>
                        <div className="relative">
                            <select 
                                disabled={!selectedPeriodId || batches.length === 0}
                                value={selectedBatchId} 
                                onChange={e => {
                                    setSelectedBatchId(e.target.value);
                                    setSelectedAssignmentId("");
                                }}
                                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs outline-none focus:bg-white focus:border-[#00A19A] focus:ring-3 focus:ring-[#00A19A]/15 font-bold text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="">-- Chọn Đợt khảo sát --</option>
                                {selectedPeriodId && <option value="all">Tất cả các đợt</option>}
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Môn Khảo sát */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-[#00A19A]"/> Môn Khảo sát
                        </label>
                        <div className="relative">
                            <select 
                                disabled={!selectedPeriodId}
                                value={selectedAssignmentId} 
                                onChange={e => setSelectedAssignmentId(e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs outline-none focus:bg-white focus:border-[#00A19A] focus:ring-3 focus:ring-[#00A19A]/15 font-bold text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="">-- Chọn Môn khảo sát --</option>
                                {availableAssignments.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.subject?.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Khối lớp */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-[#00A19A]"/> Khối lớp
                        </label>
                        <div className="relative">
                            <select
                                disabled={availableGradeOptions.length === 0}
                                value={selectedGrade}
                                onChange={e => setSelectedGrade(e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs outline-none focus:bg-white focus:border-[#00A19A] focus:ring-3 focus:ring-[#00A19A]/15 font-bold text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="all">Tất cả các Khối</option>
                                {uniqueGrades.map(g => (
                                    <option key={g} value={g}>Khối {g}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Hệ đào tạo */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#00A19A]"/> Hệ đào tạo
                        </label>
                        <div className="relative">
                            <select
                                disabled={availableGradeOptions.length === 0}
                                value={selectedSystemCode}
                                onChange={e => setSelectedSystemCode(e.target.value)}
                                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-xs outline-none focus:bg-white focus:border-[#00A19A] focus:ring-3 focus:ring-[#00A19A]/15 font-bold text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <option value="all">Tất cả các Hệ</option>
                                {uniqueSystems.map(sys => (
                                    <option key={sys} value={sys}>Hệ {sys}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* English Components Switcher (if applicable) */}
                {currentAssignment && isEnglishAssignment && relatedEnglishAssignments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black text-indigo-500 uppercase tracking-wider mr-1">Hạng mục Tiếng Anh:</span>
                        {relatedEnglishAssignments.map(a => (
                            <button 
                                key={a.id}
                                onClick={() => setSelectedAssignmentId(a.id)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                                    selectedAssignmentId === a.id 
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                                }`}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>{a.subject?.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Collapsible Analytics Chart */}
            {stats && stats.total > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
                    <button
                        onClick={() => setIsChartCollapsed(!isChartCollapsed)}
                        className="w-full px-6 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#00A19A] flex items-center justify-center">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-800">Biểu Đồ Phân Tích Khảo Sát</h3>
                                <p className="text-[10px] text-slate-400 font-semibold">Thống kê số lượng học sinh theo Khối và Lớp</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-[#00736E]">
                            <span>{isChartCollapsed ? "Mở rộng biểu đồ" : "Thu gọn"}</span>
                            {isChartCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </div>
                    </button>

                    {!isChartCollapsed && (
                        <div className="p-6 border-t border-slate-100 flex flex-col gap-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl self-start">
                                <button
                                    onClick={() => setActiveChartTab("grade")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeChartTab === "grade" ? "bg-white text-[#005854] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                    Phân bổ theo Khối
                                </button>
                                <button
                                    onClick={() => setActiveChartTab("class")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeChartTab === "class" ? "bg-white text-[#005854] shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                    So sánh giữa các Lớp
                                </button>
                            </div>

                            <div className="h-72 w-full text-xs">
                                {!isMounted ? (
                                    <div className="flex items-center justify-center h-full text-slate-400">Đang tải biểu đồ...</div>
                                ) : activeChartTab === "grade" ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={gradeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="grade" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '11px', fontWeight: 'bold' }} />
                                            <Bar dataKey="count" name="Sĩ số khảo sát" fill="#00A19A" radius={[8, 8, 0, 0]} barSize={36} />
                                            <Line type="monotone" dataKey="count" name="Đường xu hướng" stroke="#003B3A" strokeWidth={2.5} dot={{ fill: '#003B3A', strokeWidth: 2, r: 4 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    students.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-1">
                                            <Layers className="w-7 h-7 text-slate-300" />
                                            <span className="text-xs font-medium">Vui lòng chọn môn để xem so sánh lớp</span>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="className" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                                                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '11px', fontWeight: 'bold' }} />
                                                <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                                <Bar dataKey="total" name="Sĩ số" fill="#00A19A" radius={[6, 6, 0, 0]} barSize={22} />
                                                <Bar dataKey="evaluated" name="Đã đánh giá" fill="#10B981" radius={[6, 6, 0, 0]} barSize={16} />
                                                <Line type="monotone" dataKey="total" name="Đường so sánh" stroke="#003B3A" strokeWidth={2.5} dot={{ fill: '#003B3A', r: 3.5 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 5. Main Assessment Table Section */}
            {currentAssignment && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
                    
                    {/* Header Bar */}
                    <div className="px-6 py-4.5 bg-gradient-to-r from-teal-50/40 via-white to-slate-50/50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#00A19A] text-white flex items-center justify-center shadow-sm">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm md:text-base font-extrabold text-slate-800">
                                        Danh Sách Khảo Sát: <span className="text-[#00736E] font-black">{currentAssignment?.subject?.name}</span>
                                    </h3>
                                    {isLocked ? (
                                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                                            🔒 Đã khóa điểm
                                        </span>
                                    ) : (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1">
                                            🔓 Đang mở nhập điểm
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    Hệ đào tạo: <strong className="text-slate-700">{currentAssignment?.educationSystem || "HNS"}</strong> | Khối: <strong className="text-slate-700">{selectedGrade !== "all" ? `Khối ${selectedGrade}` : (availableGradeOptions.length > 0 ? availableGradeOptions.map(o => o.grade).join(", ") : "Tất cả")}</strong>
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[11px] font-bold border px-3 py-1.5 rounded-xl shadow-2xs bg-[#F0FDFA] text-[#00736E] border-teal-200">
                                {isPsychSubject ? (gradeVal ? `Mẫu Chuyên Biệt Tâm Lý Khối ${gradeVal}` : `Mẫu Đánh Giá Tâm Lý`) : isChildDevSubject ? "Cấu hình: 1 cột điểm, 1 nhận xét" : `Cấu hình: ${currentAssignment?.subject?.scoreColumns ?? 1} cột điểm, ${currentAssignment?.subject?.commentColumns ?? 1} cột nhận xét`}
                            </span>

                            {dirtyStudentIds.size > 0 && !isLocked && (
                                <button
                                    onClick={handleBulkSave}
                                    disabled={isBulkSaving}
                                    className="bg-gradient-to-r from-[#00A19A] to-[#008B85] hover:from-[#008B85] hover:to-[#00736E] text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-md shadow-teal-900/15 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                                >
                                    {isBulkSaving ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Đang lưu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5" />
                                            <span>Lưu tất cả ({dirtyStudentIds.size})</span>
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setIsExportDrawerOpen(true)}
                                className="text-xs font-bold border border-slate-700 px-3.5 py-1.5 rounded-xl shadow-2xs bg-[#003B3A] text-white hover:bg-[#005854] transition-all flex items-center gap-1.5 cursor-pointer"
                                aria-label="Mở báo cáo chuẩn hóa Bộ GD&ĐT và Cambridge"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-[#5EEAD4]" />
                                <span>Xuất Báo Cáo Chuẩn</span>
                            </button>
                        </div>
                    </div>

                    {/* Deadline Ribbon */}
                    {currentAssignment?.batch?.endDate && (
                        <div className="px-6 pt-3">
                            <DeadlineCountdownBanner
                                deadlineDate={currentAssignment.batch.endDate}
                                batchName={currentAssignment.batch.name || "Đợt khảo sát"}
                                pendingCount={totalPendingStudents}
                                totalCount={totalClassStudents}
                                isPendingFiltered={evaluationTab === "pending"}
                                onToggleFilterPending={() => {
                                    setEvaluationTab(evaluationTab === "pending" ? "evaluated" : "pending");
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    )}

                    {/* Toolbar: Tabs & Search Input */}
                    <div className="px-6 py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex bg-slate-200/70 p-1 rounded-xl shadow-inner self-start">
                            <button
                                onClick={() => { setEvaluationTab("pending"); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    evaluationTab === "pending" 
                                        ? "bg-white text-[#00736E] shadow-xs" 
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Chờ đánh giá</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                    evaluationTab === "pending" ? "bg-[#00A19A] text-white" : "bg-slate-300 text-slate-700"
                                }`}>
                                    {totalPendingStudents}
                                </span>
                            </button>
                            <button
                                onClick={() => { setEvaluationTab("evaluated"); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    evaluationTab === "evaluated" 
                                        ? "bg-white text-emerald-700 shadow-xs" 
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã đánh giá</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                    evaluationTab === "evaluated" ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                                }`}>
                                    {totalEvaluatedStudents}
                                </span>
                            </button>
                            <button
                                onClick={() => { setEvaluationTab("all"); setCurrentPage(1); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    evaluationTab === "all" 
                                        ? "bg-white text-slate-800 shadow-xs" 
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <span>Tất cả ({totalClassStudents})</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                placeholder="Tìm theo tên hoặc mã HS..."
                                className="w-full pl-8.5 pr-8 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 text-slate-800 placeholder-slate-400 shadow-2xs"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {isLocked ? (
                        <div className="p-10 flex flex-col items-center justify-center text-center gap-4 bg-slate-50/50">
                            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner">
                                <ShieldAlert className="w-7 h-7" />
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-sm font-black text-rose-800 uppercase tracking-wide">
                                    Đợt khảo sát đã bị khóa điểm
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Đợt khảo sát này đã chuyển sang trạng thái kết thúc. Để điều chỉnh hoặc nhập bổ sung, thầy/cô vui lòng gửi yêu cầu mở khóa đến Người phụ trách: <strong>{currentAssignment?.period?.assignedUser?.fullName || "Ban Khảo Thí"}</strong>.
                                </p>
                            </div>
                            {currentAssignment?.unlockRequestStatus === "REJECTED" && (
                                <div className="bg-rose-50 text-rose-700 text-xs px-4 py-2 rounded-xl font-bold border border-rose-200">
                                    ❌ Yêu cầu mở khóa của thầy/cô đã bị từ chối.
                                </div>
                            )}
                            {currentAssignment?.unlockRequestStatus === "PENDING" ? (
                                <div className="text-amber-700 text-xs font-black inline-flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                                    <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                    Yêu cầu mở khóa đang chờ duyệt...
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsUnlockRequestOpen(true)} 
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-md shadow-rose-600/20 active:scale-95 text-xs cursor-pointer"
                                >
                                    Gửi yêu cầu cấp quyền nhập điểm
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Table Container */}
                            <div className="overflow-x-auto custom-scrollbar" style={{ maxWidth: "100%", width: "100%" }}>
                                <table className="w-full text-xs text-left border-collapse min-w-max">
                                    {/* Table Head: Solid Opaque Background to Prevent Text Bleed */}
                                    <thead>
                                        <tr className="border-b border-teal-100 bg-[#F0FDFA]">
                                            {/* STT: Sticky Left with Solid Background */}
                                            <th className="px-3 py-3 w-14 min-w-[56px] text-center font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs md:sticky md:left-0 z-20 shadow-[2px_0_6px_rgba(0,0,0,0.03)]">
                                                STT
                                            </th>
                                            <th className="px-3 py-3 w-28 min-w-[110px] font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-center whitespace-nowrap">
                                                Mã HS KS
                                            </th>
                                            <th className="px-3 py-3 min-w-[170px] font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-left whitespace-nowrap">
                                                Họ và Tên
                                            </th>
                                            <th className="px-3 py-3 w-16 min-w-[64px] font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-center whitespace-nowrap">
                                                Khối
                                            </th>
                                            <th className="px-3 py-3 w-20 min-w-[72px] font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-center whitespace-nowrap">
                                                Giới tính
                                            </th>
                                            <th className="px-3 py-3 w-28 min-w-[100px] font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-center whitespace-nowrap">
                                                Ngày sinh
                                            </th>
                                            <th className="px-3 py-3 w-24 min-w-[90px] font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-center whitespace-nowrap">
                                                Hệ KS
                                            </th>

                                            {/* Form Column */}
                                            <th className="px-4 py-3 min-w-[240px] font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-center">
                                                {isPreschoolProbationSubject ? "Form ĐG Học Thử" : (isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject ? "Form Khảo Sát" : (hideComments ? "Chi Tiết Điểm" : "Chi Tiết Điểm & Nhận Xét"))}
                                            </th>

                                            {/* Specialized Columns */}
                                            {(isChildDevSubject || isThinkingSkillsSubject) && (
                                                <th className="px-4 py-3 font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-left min-w-[240px]">
                                                    Nhận xét chung
                                                </th>
                                            )}

                                            {isPsychSubject && (
                                                <>
                                                    <th className="px-4 py-3 font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-left min-w-[200px]">
                                                        Kết luận sơ bộ
                                                    </th>
                                                    <th className="px-4 py-3 font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs text-left min-w-[200px]">
                                                        Khuyến nghị (Nếu có)
                                                    </th>
                                                </>
                                            )}

                                            {/* Sticky Right: Action/Status with Solid Background and Left Shadow Barrier */}
                                            <th className="px-4 py-3 w-36 min-w-[140px] text-center font-bold text-[#005854] bg-[#F0FDFA] uppercase tracking-wider text-xs md:sticky md:right-0 z-20 shadow-[-4px_0_8px_rgba(0,0,0,0.06)]">
                                                Trạng Thái & Lưu
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedStudents.map((st, idx) => {
                                            const serialNumber = (safeCurrentPage - 1) * 10 + idx + 1;
                                            const isSaved = isStudentSaved(st);
                                            const isDirty = dirtyStudentIds.has(st.id);

                                            return (
                                                <tr key={st.id} className="hover:bg-teal-50/25 transition-colors group">
                                                    {/* Sticky Left: STT */}
                                                    <td className="px-3 py-3 text-center text-slate-600 bg-white md:sticky md:left-0 z-10 font-bold text-xs border-b border-slate-100 shadow-[2px_0_6px_rgba(0,0,0,0.03)] group-hover:bg-[#F0FDFA]/70 transition-colors">
                                                        {serialNumber}
                                                    </td>

                                                    {/* Mã HS KS */}
                                                    <td className="px-3 py-3 text-center border-b border-slate-100">
                                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] border border-slate-200/60">
                                                            {st.studentCode}
                                                        </span>
                                                    </td>

                                                    {/* Họ và Tên */}
                                                    <td className="px-3 py-3 text-left border-b border-slate-100">
                                                        <div className="font-bold text-slate-800 text-xs whitespace-nowrap">
                                                            {st.fullName}
                                                        </div>
                                                        {st.className && (
                                                            <div className="text-[10px] text-slate-400 font-medium">{st.className}</div>
                                                        )}
                                                    </td>

                                                    {/* Khối */}
                                                    <td className="px-3 py-3 text-center border-b border-slate-100">
                                                        <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                                            {st.grade || "—"}
                                                        </span>
                                                    </td>

                                                    {/* Giới tính */}
                                                    <td className="px-3 py-3 text-center border-b border-slate-100">
                                                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                                                            {st.gender === "M" || st.gender === "Nam" ? "Nam" : st.gender === "F" || st.gender === "Nữ" ? "Nữ" : st.gender || "—"}
                                                        </span>
                                                    </td>

                                                    {/* Ngày sinh */}
                                                    <td className="px-3 py-3 text-center border-b border-slate-100">
                                                        <span className="text-xs text-slate-500 whitespace-nowrap">
                                                            {st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—"}
                                                        </span>
                                                    </td>

                                                    {/* Hệ Khảo sát */}
                                                    <td className="px-3 py-3 text-center border-b border-slate-100">
                                                        <span className="text-[11px] font-bold text-amber-800 whitespace-nowrap uppercase bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                                            {st.surveyFormType || "HNS"}
                                                        </span>
                                                    </td>

                                                    {/* Form / Điểm & Nhận xét */}
                                                    <td className="px-4 py-3 border-b border-slate-100">
                                                        {isPreschoolSubject ? (
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                <button 
                                                                    onClick={() => { setActivePreschoolStudent(st); setIsPreschoolModalOpen(true); }}
                                                                    className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer ${
                                                                        st.scoredCount > 0 
                                                                            ? "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200" 
                                                                            : "bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white border border-pink-200"
                                                                    }`}
                                                                >
                                                                    <BookOpen className="w-3.5 h-3.5" /> 
                                                                    <span>{st.scoredCount > 0 ? "Xem lại Đánh giá" : "Mở Form Đánh giá"}</span>
                                                                </button>
                                                                {st.scoredCount > 0 ? (
                                                                    <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">
                                                                        Tiến độ: {st.scoredCount}/{st.totalCriteria || 15} tiêu chí
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                                                                )}
                                                            </div>
                                                        ) : isThinkingSkillsSubject ? (
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                <button 
                                                                    onClick={() => { setActiveThinkingSkillsStudent(st); setIsThinkingSkillsModalOpen(true); }}
                                                                    className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer ${
                                                                        st.scoreVals?.length >= 1
                                                                            ? "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200"
                                                                            : "bg-teal-50 hover:bg-[#00A19A] text-[#00736E] hover:text-white border border-teal-200"
                                                                    }`}
                                                                >
                                                                    <BookOpen className="w-3.5 h-3.5" /> 
                                                                    <span>{st.scoreVals?.length >= 1 ? "Xem lại Đánh giá" : "Mở Form Đánh giá"}</span>
                                                                </button>
                                                                {st.scoreVals?.length >= 1 ? (
                                                                    <div className="flex flex-col items-center gap-0.5">
                                                                        <div className="text-[10px] text-slate-600 flex gap-1 flex-wrap justify-center font-bold">
                                                                            <span className="text-emerald-700">Logic: {st.scoreVals[0] || "-"}</span>
                                                                            <span className="text-slate-300">|</span>
                                                                            <span className="text-teal-700">L.Tưởng: {st.scoreVals[1] || "-"}</span>
                                                                            <span className="text-slate-300">|</span>
                                                                            <span className="text-rose-600">P.Biện: {st.scoreVals[2] || "-"}</span>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-sky-700">HT Thử thách: {st.scoreVals[4] || "0"}%</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                                                                )}
                                                            </div>
                                                        ) : isChildDevSubject ? (
                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                <button 
                                                                    onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}
                                                                    className={`px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer ${
                                                                        st.scoreVals?.length >= 1
                                                                            ? "bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200"
                                                                            : "bg-teal-50 hover:bg-[#00A19A] text-[#00736E] hover:text-white border border-teal-200"
                                                                    }`}
                                                                >
                                                                    <BookOpen className="w-3.5 h-3.5" /> 
                                                                    <span>{st.scoreVals?.length >= 1 ? "Xem lại Đánh giá" : "Mở Form Đánh giá"}</span>
                                                                </button>
                                                                {st.scoreVals?.length >= 1 ? (
                                                                    <div className="text-[10px] text-slate-600 flex gap-1.5 font-bold">
                                                                        <span className="text-emerald-700">Đạt: {st.scoreVals.filter((v: string) => v === "3").length}</span>
                                                                        <span className="text-slate-300">|</span>
                                                                        <span className="text-rose-600">K.Đạt: {st.scoreVals.filter((v: string) => v === "2").length}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                                                                )}
                                                            </div>
                                                        ) : isPsychSubject ? (
                                                            // Specialized Psychology Display
                                                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                                                                {st.scoreVals?.length >= 7 ? (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-extrabold text-xs text-[#005854] bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
                                                                                {st.scoreVals[6] || st.scoreVals[20] || '0'} <span className="text-[9px] text-teal-600 font-bold uppercase">Điểm</span>
                                                                            </span>
                                                                            {(() => {
                                                                                const score = parseFloat(st.scoreVals[6] || st.scoreVals[20] || '0');
                                                                                let level = "Bình thường"; 
                                                                                let badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
                                                                                if (score <= 15) { level = "Bình thường"; badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200"; }
                                                                                else if (score <= 31) { level = "Dấu hiệu nhẹ"; badgeColor = "text-blue-700 bg-blue-50 border-blue-200"; }
                                                                                else if (score <= 47) { level = "Dấu hiệu vừa"; badgeColor = "text-amber-800 bg-amber-50 border-amber-200"; }
                                                                                else if (score <= 63) { level = "Nguy cơ cao"; badgeColor = "text-orange-800 bg-orange-50 border-orange-200"; }
                                                                                else { level = "Nguy cơ rất cao"; badgeColor = "text-rose-700 bg-rose-50 border-rose-200"; }
                                                                                return (
                                                                                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                                                                                        {level}
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => { setActivePsychStudent(st); setIsPsychModalOpen(true); }}
                                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00736E] hover:text-[#005854] hover:underline cursor-pointer"
                                                                        >
                                                                            <BookOpen className="w-3 h-3" />
                                                                            <span>Xem lại & Sửa Form (Khối {st.grade || "5"})</span>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <button 
                                                                            onClick={() => { setActivePsychStudent(st); setIsPsychModalOpen(true); }}
                                                                            className="bg-gradient-to-r from-[#00A19A] to-[#008B85] hover:from-[#008B85] hover:to-[#00736E] text-white font-bold py-1.5 px-4 rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95 text-xs cursor-pointer"
                                                                        >
                                                                            <BookOpen className="w-3.5 h-3.5" /> 
                                                                            <span>Mở Form Khối {st.grade || "5"}</span>
                                                                        </button>
                                                                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" /> Chưa làm bài
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            // General Subjects: Quick Inputs & Comments
                                                            <div className="flex flex-wrap gap-3 items-start">
                                                                {Array.from({length: (currentAssignment?.subject?.scoreColumns ?? 1)}).map((_, colIdx) => {
                                                                    let cName = "Điểm " + (colIdx+1);
                                                                    try { if(currentAssignment?.subject?.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.scores && p.scores[colIdx]) cName = p.scores[colIdx]; } } catch(e){}
                                                                    const isTotal = cName.toLowerCase().includes("tổng");
                                                                    const subNameLower = (currentAssignment?.subject?.name || "").toLowerCase();
                                                                    const isGrade1 = String(st.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim() === "1";
                                                                    let maxScoreStr = "";
                                                                    if (subNameLower.includes("vấn đáp")) {
                                                                        maxScoreStr = " (Max 30)";
                                                                    } else if (subNameLower.includes("viết")) {
                                                                        maxScoreStr = isGrade1 ? " (K1: Không thi)" : " (Max 70)";
                                                                    }
                                                                    const isWrittenDisabled = isGrade1 && subNameLower.includes("viết");

                                                                    return (
                                                                        <div key={"sc-input-"+colIdx} className="flex flex-col gap-1 w-22 flex-none">
                                                                            <span className="text-[10px] uppercase font-bold text-slate-500 truncate" title={cName + maxScoreStr}>
                                                                                {cName}{maxScoreStr && <span className="text-rose-600 font-bold ml-0.5">{maxScoreStr}</span>}
                                                                            </span>
                                                                            {isTotal ? (
                                                                                <div className="w-full bg-[#F0FDFA] border border-teal-200 rounded-lg py-1 text-center font-black text-[#005854] shadow-inner h-[32px] text-xs flex items-center justify-center">
                                                                                    {(st.scoreVals || []).slice(0, colIdx).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0).toLocaleString("vi-VN", {maximumFractionDigits: 2})}
                                                                                </div>
                                                                            ) : (
                                                                                <input 
                                                                                    id={`score-input-${idx}-${colIdx}`}
                                                                                    type="number"
                                                                                    disabled={isWrittenDisabled || isLocked}
                                                                                    placeholder={isWrittenDisabled ? "Không thi" : "-"}
                                                                                    value={isWrittenDisabled ? "" : (st.scoreVals?.[colIdx] || "")}
                                                                                    onChange={e => handleScoreChange(st.id, colIdx, e.target.value)}
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === "Enter" || e.key === "ArrowDown") {
                                                                                            e.preventDefault();
                                                                                            const nextEl = document.getElementById(`score-input-${idx + 1}-${colIdx}`);
                                                                                            if (nextEl) nextEl.focus();
                                                                                        } else if (e.key === "ArrowUp") {
                                                                                            e.preventDefault();
                                                                                            const prevEl = document.getElementById(`score-input-${idx - 1}-${colIdx}`);
                                                                                            if (prevEl) prevEl.focus();
                                                                                        }
                                                                                    }}
                                                                                    className={`w-full border rounded-lg py-1 text-center font-bold text-xs shadow-2xs outline-none transition-all h-[32px] ${
                                                                                        isWrittenDisabled 
                                                                                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" 
                                                                                            : isLocked 
                                                                                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" 
                                                                                            : "bg-white text-slate-800 border-slate-300 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20"
                                                                                    }`}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}

                                                                {!hideComments && Array.from({length: (currentAssignment?.subject?.commentColumns ?? 1)}).map((_, colIdx) => {
                                                                    let cName = "Nhận xét " + (colIdx+1);
                                                                    try { if(currentAssignment?.subject?.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.comments && p.comments[colIdx]) cName = p.comments[colIdx]; } } catch(e){}
                                                                    const isQuickOpen = quickCommentTarget?.studentId === st.id && quickCommentTarget?.colIndex === colIdx;

                                                                    return (
                                                                        <div key={"cm-input-"+colIdx} className="flex flex-col gap-1 w-full min-w-[200px] flex-1 relative">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[10px] uppercase font-bold text-slate-500 truncate" title={cName}>{cName}</span>
                                                                                {!isLocked && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => setQuickCommentTarget(isQuickOpen ? null : { studentId: st.id, colIndex: colIdx })}
                                                                                        className="text-[10px] font-bold text-[#00736E] hover:text-[#005854] flex items-center gap-0.5 cursor-pointer"
                                                                                    >
                                                                                        <Sparkles className="w-3 h-3 text-[#00A19A]" />
                                                                                        <span>Mẫu gợi ý</span>
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            <textarea 
                                                                                value={st.commentVals?.[colIdx] || ""}
                                                                                onChange={e => handleCommentChange(st.id, colIdx, e.target.value)}
                                                                                disabled={isLocked}
                                                                                rows={2}
                                                                                className={`w-full border rounded-lg py-1.5 px-3 text-xs font-medium shadow-2xs outline-none transition-all resize-y min-h-[46px] max-h-[110px] leading-relaxed custom-scrollbar ${
                                                                                    isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white text-slate-700 border-slate-300 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 placeholder-slate-400"
                                                                                }`}
                                                                                placeholder="Nhập nhận xét..."
                                                                            />

                                                                            {/* Quick Remarks Popover */}
                                                                            {isQuickOpen && (
                                                                                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-teal-200 rounded-xl shadow-xl p-2.5 flex flex-col gap-1 animate-in fade-in zoom-in-95">
                                                                                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-[10px] font-bold text-[#005854] uppercase">
                                                                                        <span>Chọn nhận xét nhanh:</span>
                                                                                        <button onClick={() => setQuickCommentTarget(null)} className="text-slate-400 hover:text-slate-600">
                                                                                            <X className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    </div>
                                                                                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pt-1">
                                                                                        {QUICK_REMARKS.map((remark, rIdx) => (
                                                                                            <button
                                                                                                key={rIdx}
                                                                                                onClick={() => {
                                                                                                    handleCommentChange(st.id, colIdx, remark);
                                                                                                    setQuickCommentTarget(null);
                                                                                                }}
                                                                                                className="w-full text-left text-xs font-medium text-slate-700 hover:bg-[#F0FDFA] hover:text-[#00736E] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                                                                                            >
                                                                                                • {remark}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Nhận xét chung cho Chuẩn phát triển / Tư duy */}
                                                    {(isChildDevSubject || isThinkingSkillsSubject) && (
                                                        <td className="px-4 py-3 text-left align-top max-w-[240px] border-b border-slate-100">
                                                            <div className="text-xs text-slate-700 leading-relaxed font-medium italic bg-slate-50 p-2 rounded-lg border border-slate-200/60 max-h-[90px] overflow-y-auto custom-scrollbar">
                                                                {st.commentVals?.[0] ? `"${st.commentVals[0]}"` : <span className="text-slate-400 italic">Chưa có nhận xét</span>}
                                                            </div>
                                                        </td>
                                                    )}

                                                    {/* Kết luận & Khuyến nghị cho Tâm lý (Clean and non-overlapping) */}
                                                    {isPsychSubject && (
                                                        <>
                                                            <td className="px-4 py-3 text-left align-top max-w-[210px] border-b border-slate-100">
                                                                {st.commentVals?.[0] ? (
                                                                    <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-2 rounded-lg border border-slate-200/60 line-clamp-3 hover:line-clamp-none transition-all">
                                                                        {st.commentVals[0]}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 text-xs italic">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-left align-top max-w-[210px] border-b border-slate-100">
                                                                {st.commentVals?.[1] ? (
                                                                    <div className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-2 rounded-lg border border-slate-200/60 line-clamp-3 hover:line-clamp-none transition-all">
                                                                        {st.commentVals[1]}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 text-xs italic">—</span>
                                                                )}
                                                            </td>
                                                        </>
                                                    )}

                                                    {/* Sticky Right: Trạng thái & Xác nhận - Solid Background & Shadow */}
                                                    <td className="px-4 py-3 text-center bg-white md:sticky md:right-0 z-10 border-b border-slate-100 shadow-[-4px_0_8px_rgba(0,0,0,0.06)] group-hover:bg-[#F0FDFA]/70 transition-colors">
                                                        {(() => {
                                                            const isCustomSubject = isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject;

                                                            if (isCustomSubject) {
                                                                if (isSaved) {
                                                                    return (
                                                                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold w-full">
                                                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                            <span>Đã hoàn thành</span>
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (isPsychSubject) { setActivePsychStudent(st); setIsPsychModalOpen(true); }
                                                                                else if (isPreschoolSubject) { setActivePreschoolStudent(st); setIsPreschoolModalOpen(true); }
                                                                                else if (isThinkingSkillsSubject) { setActiveThinkingSkillsStudent(st); setIsThinkingSkillsModalOpen(true); }
                                                                                else if (isChildDevSubject) { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }
                                                                            }}
                                                                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold w-full transition-colors cursor-pointer"
                                                                        >
                                                                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                                            <span>Chờ điền form</span>
                                                                        </button>
                                                                    );
                                                                }
                                                            }

                                                            // Regular subjects: Save Button
                                                            return (
                                                                <button 
                                                                    onClick={() => saveStudentScore(st)}
                                                                    disabled={isLocked}
                                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center w-full gap-1.5 transition-all shadow-2xs ${
                                                                        isLocked 
                                                                            ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none" 
                                                                            : saveStatus[st.id] === "saved" 
                                                                            ? "bg-emerald-600 text-white" 
                                                                            : saveStatus[st.id] === "saving" 
                                                                            ? "bg-slate-200 text-slate-600" 
                                                                            : isDirty 
                                                                            ? "bg-[#00A19A] hover:bg-[#008B85] text-white shadow-teal-900/15" 
                                                                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                                                    }`}
                                                                >
                                                                    {saveStatus[st.id] === "saved" ? (
                                                                        <>
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            <span>Đã lưu</span>
                                                                        </>
                                                                    ) : saveStatus[st.id] === "saving" ? (
                                                                        <>
                                                                            <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                                                                            <span>Lưu...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Save className="w-3.5 h-3.5" />
                                                                            <span>{isDirty ? "Lưu điểm" : "Lưu"}</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {paginatedStudents.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={12} className="px-6 py-14 text-center text-slate-400 bg-slate-50/50">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Users className="w-9 h-9 text-slate-300" />
                                                        <span className="text-xs font-bold text-slate-600">
                                                            {searchQuery 
                                                                ? `Không tìm thấy học sinh nào khớp với từ khóa "${searchQuery}"`
                                                                : evaluationTab === "pending" 
                                                                ? "Tất cả học sinh trong danh sách đã được đánh giá hoàn thành!" 
                                                                : "Chưa có học sinh nào được đánh giá trong danh mục này."
                                                            }
                                                        </span>
                                                        {searchQuery && (
                                                            <button 
                                                                onClick={() => setSearchQuery("")} 
                                                                className="text-xs font-bold text-[#00736E] hover:underline mt-1 cursor-pointer"
                                                            >
                                                                Xóa bộ lọc tìm kiếm
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Bar */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-xs text-slate-500 font-semibold">
                                        Hiển thị <span className="font-bold text-slate-700">{(safeCurrentPage - 1) * 10 + 1}</span> - <span className="font-bold text-slate-700">{Math.min(safeCurrentPage * 10, currentTabStudents.length)}</span> trên tổng số <span className="font-bold text-slate-700">{currentTabStudents.length}</span> học sinh
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={safeCurrentPage === 1}
                                            onClick={() => setCurrentPage(1)}
                                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            title="Trang đầu"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                                        </button>
                                        
                                        <button
                                            disabled={safeCurrentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                        p === safeCurrentPage 
                                                            ? "bg-[#00A19A] border-[#00A19A] text-white shadow-2xs" 
                                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ));
                                        })()}
                                        
                                        <button
                                            disabled={safeCurrentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            title="Trang sau"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                        </button>
                                        
                                        <button
                                            disabled={safeCurrentPage === totalPages}
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

            {/* Modals & Drawers */}
            {isUnlockRequestOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-5 border-b flex justify-between items-center bg-[#F0FDFA] border-teal-100">
                            <h3 className="font-extrabold text-base text-[#005854]">Yêu Cầu Mở Khóa Form Nhập Điểm</h3>
                            <button onClick={() => setIsUnlockRequestOpen(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Lý do xin mở khóa bổ sung điểm:</label>
                                <textarea 
                                    value={unlockReason} 
                                    onChange={e => setUnlockReason(e.target.value)} 
                                    className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 outline-none h-32 resize-none" 
                                    placeholder="VD: Cần điều chỉnh lại điểm cho học sinh do có kết quả phúc khảo..."
                                />
                            </div>
                            <div className="flex justify-end gap-2.5 pt-2">
                                <button 
                                    onClick={() => setIsUnlockRequestOpen(false)} 
                                    className="px-4 py-2 hover:bg-slate-100 rounded-xl font-bold text-slate-600 text-xs cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={handleUnlockRequestSubmit} 
                                    className="bg-[#00A19A] hover:bg-[#008B85] text-white font-bold px-5 py-2 rounded-xl shadow-sm text-xs cursor-pointer"
                                >
                                    Gửi Yêu Cầu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Psychology Assessment Modal */}
            {isPsychSubject && activePsychStudent && isPsychModalOpen && (
                <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in">
                    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#00A19A] flex items-center justify-center font-bold">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm text-slate-800">
                                    Phiếu Đánh Giá Tâm Lý Chi Tiết - {activePsychStudent.fullName}
                                </h3>
                                <p className="text-[11px] text-slate-500">Mã HS: {activePsychStudent.studentCode} | Khối {activePsychStudent.grade || "5"}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsPsychModalOpen(false)}
                            className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer"
                        >
                            <X className="w-4 h-4" /> Đóng lại
                        </button>
                    </div>
                    <PsychologyAssessmentForm 
                        student={activePsychStudent}
                        onSave={async (st: any, scores: any[], comments: any[]) => { await saveStudentScore(st, scores, comments); }}
                        isLocked={isLocked}
                    />
                </div>
            )}

            {/* Child Dev Standard Modal */}
            {isChildDevSubject && activeChildDevStudent && isChildDevModalOpen && (
                <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in">
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

            {/* Thinking Skills Modal */}
            {isThinkingSkillsSubject && activeThinkingSkillsStudent && isThinkingSkillsModalOpen && (
                <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in">
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

            {/* Preschool Evaluation Modal */}
            {isPreschoolSubject && activePreschoolStudent && isPreschoolModalOpen && (
                <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in">
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

            {/* Standard Report Drawer */}
            <ReportExportDrawer
                isOpen={isExportDrawerOpen}
                onClose={() => setIsExportDrawerOpen(false)}
                assignmentInfo={{
                    subjectName: currentAssignment?.subject?.name,
                    className: currentAssignment?.class?.name || (selectedGrade !== "all" ? `Khối ${selectedGrade}` : "Tất cả"),
                    grade: selectedGrade,
                    periodName: currentAssignment?.period?.name,
                    academicYear: academicYear || "2026-2027"
                }}
                studentsWithScores={students.map(s => {
                    const studentScore = s.scores?.[0]?.score;
                    return {
                        id: s.id,
                        studentCode: s.studentCode || s.code || "",
                        studentName: s.fullName || s.studentName || s.name || "",
                        score: studentScore !== undefined && studentScore !== null ? studentScore : "",
                        comment: s.scores?.[0]?.comment || ""
                    };
                })}
            />
        </div>
    );
}
