"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Users, Save, CheckCircle2, CalendarDays, Layers, X } from "lucide-react";
import PsychologyAssessmentForm from "./PsychologyAssessmentForm";
import ChildDevStandardForm from "./ChildDevStandardForm";
import ThinkingSkillsForm from "./ThinkingSkillsForm";
import PreschoolEvaluationForm from "./PreschoolEvaluationForm";

export default function TeacherAssessmentsClient({ user }: { user: any }) {
    const [assignments, setAssignments] = useState<any[]>([]);
    
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
    const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
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

    useEffect(() => {
        fetch("/api/teacher-assessments?action=getAssignments")
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) {
                    setAssignments(data);
                if (data.length > 0) {
                        const firstPeriod = data[0].periodId;
                        setSelectedPeriodId(firstPeriod);
                        
                        const firstAssign = data.find((a: any) => a.periodId === firstPeriod);
                        if (firstAssign) setSelectedAssignmentId(firstAssign.id);
                    }
                } else {
                    console.error('API Error:', data);
                    setAssignments([]);
                }
                setLoading(false);
            });
    }, []);

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
        
        // Deduplicate and modify label for Child Dev Grade 1
        const unique = new Map();
        filtered.forEach(a => {
            const subNameNormalized = (a.subject?.name || "").toLowerCase().normalize("NFC");
            const subCode = (a.subject?.code || "").toLowerCase();
            const gradeVal = String(a.grade || "").replace("Khối ", "").trim();
            const isChildDev = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";
            
            if (isChildDev) {
                // Use a unique key based on subject and grade to deduplicate across systems
                const key = `${a.subjectId}-${gradeVal}`;
                if (!unique.has(key)) {
                    // Create a clone to safely modify the display property without mutating state
                    unique.set(key, { ...a, overrideSystemLabel: "Tất cả các hệ", overrideSystemCode: "" });
                }
            } else {
                unique.set(a.id, a);
            }
        });
        
        const list = Array.from(unique.values());
        
        const preschoolList = list.filter(a => a.isPreschool);
        const nonPreschool = list.filter(a => !a.isPreschool);
        
        // Inject a virtual "Tất cả các khối" consolidated option for Preschool teachers if they have multiple assignments
        let finalPreschoolList = [...preschoolList];
        if (preschoolList.length > 1) {
            const firstPre = preschoolList[0];
            const virtualAll = {
                ...firstPre,
                id: "preschool-all-grades",
                grade: "Tất cả",
                overrideSystemLabel: "Tất cả",
                subject: {
                    ...firstPre.subject,
                    name: "Đánh giá Mầm non"
                }
            };
            finalPreschoolList = [virtualAll, ...preschoolList];
        }
        
        // Group non-preschool assignments by subjectId to inject consolidated options
        const hsGroups = {};
        nonPreschool.forEach(a => {
            if (!hsGroups[a.subjectId]) {
                hsGroups[a.subjectId] = [];
            }
            hsGroups[a.subjectId].push(a);
        });
        
        const finalNonPreschoolList = [];
        Object.entries(hsGroups).forEach(([subjectId, group]) => {
            if (group.length > 1) {
                const firstAssign = group[0];
                const virtualAll = {
                    ...firstAssign,
                    id: `hs-all-grades-${subjectId}`,
                    grade: "Tất cả",
                    overrideSystemLabel: "Tất cả các hệ",
                    overrideSystemCode: ""
                };
                finalNonPreschoolList.push(virtualAll, ...group);
            } else {
                finalNonPreschoolList.push(...group);
            }
        });
        
        return [...finalPreschoolList, ...finalNonPreschoolList];
    }, [assignments, selectedPeriodId, selectedBatchId]);

    useEffect(() => {
        setSelectedBatchId("all");
    }, [selectedPeriodId]);

    // Handle cascading select
    useEffect(() => {
        if (!selectedPeriodId) return;
        if (!availableAssignments.find(a => a.id === selectedAssignmentId)) {
            if (availableAssignments.length > 0) setSelectedAssignmentId(availableAssignments[0].id);
            else setSelectedAssignmentId("");
        }
    }, [selectedPeriodId, availableAssignments]);

    useEffect(() => {
        if (!selectedAssignmentId) {
            setStudents([]);
            return;
        }
        const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
        if (!assignment) return;

        setLoading(true);
        const systemCode = assignment.overrideSystemCode !== undefined ? assignment.overrideSystemCode : (assignment.educationSystem || "");
        const grade = assignment.grade || "";
        
        // Dynamic batch parameter based on selected dropdown
        const batchQueryParam = selectedBatchId === "all" ? "" : selectedBatchId;
        
        fetch(`/api/teacher-assessments?action=getStudents&periodId=${assignment.periodId}&grade=${grade}&systemCode=${systemCode}&subjectId=${assignment.subjectId}&batchId=${batchQueryParam}`)
            .then(res => res.json())
            .then(data => {
                const enriched = data.map((st: any) => {
                    if (st.isPreschool) return st;
                    const sc = st.scores?.[0];
                    return {
                        ...st,
                        scoreVals: sc?.scores ? JSON.parse(sc.scores) : [],
                        commentVals: sc?.comments ? JSON.parse(sc.comments) : []
                    };
                });
                setStudents(enriched);
                setLoading(false);
            });
    }, [selectedAssignmentId, assignments, availableAssignments, selectedBatchId]);

    const handleScoreChange = (studentId: string, colIndex: number, val: string) => {
        const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
        if (assignment) {
            const subName = (assignment.subject?.name || "").toLowerCase();
            const numVal = parseFloat(val);
            if (!isNaN(numVal)) {
                if (subName.includes("vấn đáp") && numVal > 30) {
                    alert("Điểm Tiếng Anh (vấn đáp) tối đa là 30 đ!");
                    val = "30";
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
                commentVals: customComments || s.commentVals 
            } : s));

            setTimeout(() => setSaveStatus(prev => ({ ...prev, [st.id]: "" })), 2000);
            
            if (customScores) {
              setIsPsychModalOpen(false);
            }
        } else {
            setSaveStatus(prev => ({ ...prev, [st.id]: "error" }));
            if (customScores) alert("Có lỗi khi lưu kết quả!");
        }
    };

    if (loading && assignments.length === 0) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

    const currentAssignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
    
    // Detection logic for Psychology Grades 1-5
    const subName = (currentAssignment?.subject?.name || "").toLowerCase();
    const subCode = (currentAssignment?.subject?.code || "").toLowerCase();
    const subNameNormalized = subName.normalize("NFC");
    const gradeVal = String(currentAssignment?.grade || "").replace("Khối ", "").trim();
    const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");
    const isPreschoolSubject = currentAssignment?.isPreschool || currentAssignment?.subjectId === "preschool";
    const isChildDevSubject = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && (gradeVal === "1" || gradeVal === "Tất cả");
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
  const isPeriodLocked = currentAssignment?.period?.status !== "ACTIVE";
  const isBatchLocked = currentAssignment?.batch?.status === "LOCKED" || currentAssignment?.batch?.status === "CLOSED";
  const isLocked = (isPeriodLocked || isBatchLocked) && currentAssignment?.unlockRequestStatus !== "APPROVED";

    return (
        <div className="p-3 md:p-6 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
            
<div className="bg-[#00A19A] rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-black rounded-full mix-blend-overlay filter blur-3xl opacity-10"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div>
                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Nhập kết quả Khảo sát</h1>
                <p className="text-teal-50 font-medium mt-1">Xin chào giáo viên <span className="text-white font-bold">{user?.fullName || "ẩn danh"}</span>!</p>
            </div>
                        <p className="text-teal-50 mt-2 flex flex-wrap items-center gap-2 text-sm md:text-base font-medium opacity-90">
                            <span className="bg-white/20 backdrop-blur-md text-white font-bold px-3 py-1 rounded-full shadow-inner shadow-white/10 ring-1 ring-white/30 truncate max-w-[200px] md:max-w-none">
                                👋 {user?.name || "Thầy/Cô"}
                            </span>
                            <span>Cập nhật nhanh chóng, lưu trữ an toàn</span>
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0 flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 ring-1 ring-white/20 shadow-xl">
                            <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Môn học</div>
                            <div className="text-white font-black text-xl">{currentAssignment ? currentAssignment.subject.name : "..."}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="-mt-6 mx-auto w-[96%] max-w-[1200px] relative z-20 bg-white p-6 rounded-2xl shadow-lg ring-1 ring-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-slate-500 flex items-center gap-2 ml-1">
                        <CalendarDays className="w-3.5 h-3.5 text-[#00A19A]"/> Kỳ Khảo sát
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedPeriodId} 
                            onChange={e => setSelectedPeriodId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            {periods.length === 0 && <option value="">Không có kỳ KS nào</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#00A19A] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {batches.length > 0 && (
                    <div className="group">
                        <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-slate-500 flex items-center gap-2 ml-1">
                            <Layers className="w-3.5 h-3.5 text-[#00A19A]"/> Đợt khảo sát
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedBatchId} 
                                onChange={e => setSelectedBatchId(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                            >
                                <option value="all">Tất cả các đợt</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#00A19A] transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                )}

                <div className="group lg:col-span-1">
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-slate-500 flex items-center gap-2 ml-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#00A19A]"/> Môn Khảo sát
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedAssignmentId} 
                            onChange={e => setSelectedAssignmentId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-[#00A19A] focus:ring-4 focus:ring-[#00A19A]/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                        >
                            {availableAssignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.overrideSystemLabel || a.educationSystem || "Tất cả"})
                                </option>
                            ))}
                            {availableAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#00A19A] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

{currentAssignment && isEnglishAssignment && relatedEnglishAssignments.length > 0 && (
    <div className="-mt-6 mx-auto w-[92%] bg-white/70 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-300 mb-6 animate-in fade-in slide-in-from-top-4 flex flex-col gap-2 relative z-20">
        <div className="text-xs font-black text-indigo-400 uppercase tracking-widest pl-1">Danh sách Môn Tiếng Anh:</div>
        <div className="flex flex-wrap gap-2">
            {relatedEnglishAssignments.map(a => (
                <button 
                    key={a.id}
                    onClick={() => setSelectedAssignmentId(a.id)}
                    className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${selectedAssignmentId === a.id ? 'bg-indigo-600 text-white shadow-indigo-200 ring-2 ring-indigo-400 ring-offset-1' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
                >
                    <BookOpen className="w-4 h-4" />
                    {a.subject?.name}
                </button>
            ))}
        </div>
    </div>
)}
{currentAssignment && (
                <div className="bg-white rounded-xl shadow-md border-2 border-emerald-100 overflow-hidden mt-6">
                    <div className="px-6 py-4 border-b bg-[#F0FDFA] flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <Users className="w-5 h-5 text-[#00A19A]"/>
                                Form nhập kết quả: {currentAssignment.subject.name}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5"/> Khối: <span className="font-semibold text-slate-700">{currentAssignment.grade || "Tất cả"}</span> | 
                                Thuộc kỳ khảo sát: <span className="font-semibold text-slate-700">{currentAssignment.period.name} {currentAssignment.batch?.name ? ` - ${currentAssignment.batch.name}` : ""}</span>
                            </p>
                        </div>
                        {isLocked && <span className="text-sm font-bold bg-red-100 text-red-700 border border-red-200 px-4 py-1.5 rounded-full shadow-sm mr-2 flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> KHẢO SÁT ĐÃ KHÓA</span>}
                        <span className={"text-sm font-medium border px-4 py-1.5 rounded-full shadow-sm " + (isLocked ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-emerald-100/50 text-emerald-700 border-emerald-200")}>
                            {isPsychSubject ? (gradeVal ? `Mẫu chuyên biệt Tâm lý Khối ${gradeVal}` : `Đánh giá Tâm lý`) : isChildDevSubject ? "Cấu hình: 1 cột điểm, 1 cột nhận xét" : `Cấu hình: ${currentAssignment.subject.scoreColumns} cột điểm, ${currentAssignment.subject.commentColumns} cột nhận xét`}
                        </span>
                    </div>

                    {isLocked && (
                        <div className="px-5 py-4 bg-red-50 border-y border-red-100 flex items-start gap-3">
                            <div className="pt-0.5">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-red-800 mb-1">Hạng mục Khảo sát (Kỳ/Đợt) đã bị khóa điểm</h3>
                                <p className="text-sm text-red-700 leading-relaxed">
                                    Hạng mục khảo sát (Kỳ hoặc Đợt) này đã được thiết lập sang trạng thái <strong>KHÓA / KẾT THÚC</strong> nên mọi thao tác nhập liệu đều bị cấm. <br/>
                                    Trường hợp các thầy cô cần điều chỉnh điểm số, xin vui lòng liên hệ Người phụ trách đợt khảo sát: <strong>{currentAssignment.period.assignedUser?.fullName || "Admin"}</strong>.
                                </p>
                                {currentAssignment.unlockRequestStatus === "REJECTED" && (
                                    <div className="mt-3 bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg font-bold inline-block shadow-sm">
                                        ❌ Hệ thống không chấp nhận yêu cầu của bạn.
                                    </div>
                                )}
                                {currentAssignment.unlockRequestStatus === "PENDING" ? (
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm inline-flex items-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15"></path></svg>
                                            Yêu cầu Mở khóa đang chờ Admin duyệt...
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <button onClick={() => setIsUnlockRequestOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-md text-sm font-bold px-4 py-2.5 rounded-xl transition-all">Gửi Yêu cầu Cấp quyền Nhập Điểm</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto p-4 custom-scrollbar" style={{maxWidth: "100%", width: "100%"}}>
                        <table className="w-full text-sm text-left border-collapse min-w-max">
                            <thead className="bg-slate-50 border-b-2 border-slate-200">
    <tr>
        <th className="px-3 py-4 w-12 text-center font-bold text-slate-500 bg-[#F8FAFC] uppercase tracking-wider text-xs md:sticky md:left-0 z-20">STT</th>
        <th className="px-3 py-4 font-bold text-slate-500 bg-[#F8FAFC] uppercase tracking-wider text-xs whitespace-nowrap text-center">Mã HS KS</th>
          <th className="px-3 py-4 font-bold text-slate-500 bg-[#F8FAFC] uppercase tracking-wider text-xs whitespace-nowrap text-left">Họ và Tên</th>
          <th className="px-3 py-4 font-bold text-slate-500 bg-[#F8FAFC] uppercase tracking-wider text-xs whitespace-nowrap text-center">Khối</th>
          <th className="px-3 py-4 font-bold text-slate-500 bg-[#F8FAFC] uppercase tracking-wider text-xs whitespace-nowrap text-center">Giới tính</th>
          <th className="px-3 py-4 font-bold text-slate-500 bg-[#F8FAFC] uppercase tracking-wider text-xs whitespace-nowrap text-center">Ngày sinh</th>
          <th className="px-3 py-4 font-bold text-slate-500 bg-[#F8FAFC] uppercase tracking-wider text-xs whitespace-nowrap text-center">Hệ Khảo sát</th>
        <th className="px-4 py-4 font-bold text-[#00A19A] bg-[#F8FAFC] uppercase tracking-wider text-xs text-center">
            {isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject ? "Form Khảo sát" : (hideComments ? "Chi tiết Điểm" : "Chi tiết Điểm & Nhận xét")}
        </th>
        {(isChildDevSubject || isThinkingSkillsSubject) && (
            <th className="px-4 py-4 font-bold text-[#00A19A] bg-[#F8FAFC] uppercase tracking-wider text-xs text-left min-w-[250px]">Nhận xét chung</th>
        )}
        {isPsychSubject && (
            <>
                <th className="px-4 py-4 font-bold text-[#00A19A] bg-[#F8FAFC] uppercase tracking-wider text-xs text-left min-w-[200px]">Kết luận sơ bộ</th>
                <th className="px-4 py-4 font-bold text-[#00A19A] bg-[#F8FAFC] uppercase tracking-wider text-xs text-left min-w-[200px]">Khuyến nghị (Nếu có)</th>
            </>
        )}
        <th className="px-2 py-3 md:px-4 md:py-4 text-center font-bold text-[#00A19A] bg-[#F8FAFC] uppercase tracking-wider text-xs w-32 md:sticky md:right-0 z-20">Xác nhận</th>
    </tr>
</thead>
                            <tbody className="divide-y border-b">
                                {students.map((st, i) => (
                                    <tr key={st.id} className="hover:bg-slate-100/30 group border-b border-slate-100 last:border-none transition-colors">
                                        <td className="px-2 py-2 md:px-3 md:py-4 text-center text-slate-500 bg-transparent md:sticky md:left-0 z-10 font-medium text-sm">{i+1}</td>
                                        <td className="px-3 py-3 bg-transparent text-center">
                                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full text-xs">{st.studentCode}</span>
                                          </td>
                                          <td className="px-3 py-3 bg-transparent text-left">
                                              <span className="font-bold text-slate-700 text-sm whitespace-nowrap">{st.fullName}</span>
                                          </td>
                                          <td className="px-3 py-3 bg-transparent text-center">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{st.grade}</span>
          </td>
          <td className="px-3 py-3 bg-transparent text-center">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{st.gender === "M" || st.gender === "Nam" ? "Nam" : st.gender === "F" || st.gender === "Nữ" ? "Nữ" : st.gender || "—"}</span>
          </td>
                                          <td className="px-3 py-3 bg-transparent text-center">
                                              <span className="text-xs text-slate-500 whitespace-nowrap">{st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</span>
                                          </td>
                                          <td className="px-3 py-3 bg-transparent text-center">
                                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-slate-200 whitespace-nowrap uppercase">{st.surveyFormType || "—"}</span>
                                          </td>
                                        
                                        <td className="px-4 py-4 bg-transparent">
            {isPreschoolSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActivePreschoolStudent(st); setIsPreschoolModalOpen(true); }}
                    className="bg-pink-50 hover:bg-pink-600 text-pink-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs border border-pink-100"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    Mở Form Đánh giá
                  </button>
                  {st.scoredCount > 0 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-black text-pink-600 bg-pink-50/50 px-2 py-0.5 rounded-full border border-pink-100 w-fit uppercase tracking-wider">
                              Tiến độ: {st.scoredCount}/{st.totalCriteria} tiêu chí
                          </span>
                      </div>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>
            ) : isThinkingSkillsSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActiveThinkingSkillsStudent(st); setIsThinkingSkillsModalOpen(true); }}
                    className="bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    Mở Form Đánh giá
                  </button>
                  {st.scoreVals?.length >= 1 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 w-fit">Đã đánh giá</span>
                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Logic: {st.scoreVals[0] || "-"}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-[#00A19A]">L.Tưởng: {st.scoreVals[1] || "-"}</span>
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
              </div>
            ) : isChildDevSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
                    onClick={() => { setActiveChildDevStudent(st); setIsChildDevModalOpen(true); }}
                    className="bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> 
                    Mở Form Đánh giá
                  </button>
                  {st.scoreVals?.length >= 1 ? (
                      <div className="flex flex-col gap-1 items-center max-w-xs text-center mt-1">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 w-fit">Đã lưu điểm</span>
                          <div className="text-[11px] text-slate-600 flex gap-1.5 flex-wrap justify-center mt-0.5">
                              <span className="font-semibold text-emerald-600">Đạt: {st.scoreVals.filter((v: string) => v === "3").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-rose-500">K.Đạt: {st.scoreVals.filter((v: string) => v === "2").length}</span>
                              <span className="text-slate-300">|</span>
                              <span className="font-semibold text-slate-500">K.Làm: {st.scoreVals.filter((v: string) => v === "1").length}</span>
                          </div>
                          {st.commentVals && st.commentVals[0] && (
                              <div className="text-[11px] text-slate-500 line-clamp-2 italic px-2 bg-slate-50 rounded p-1 border border-slate-100">"{st.commentVals[0]}"</div>
                          )}
                      </div>
                  ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Chưa đánh giá</span>
                  )}
              </div>
            ) : isPsychSubject ? (
              <div className="flex flex-col items-center justify-center gap-2">
                  <button 
        onClick={() => { setActivePsychStudent(st); setIsPsychModalOpen(true); }}
        className="bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold py-2 px-5 rounded-full shadow-sm flex items-center gap-2 transition-all active:scale-95 text-xs"
    >
        <BookOpen className="w-3.5 h-3.5" /> 
        Mở Form Khối {st.grade || "Cơ bản"}
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
                {Array.from({length: (currentAssignment.subject.scoreColumns ?? 1)}).map((_, colIdx) => {
                    let cName = "Điểm " + (colIdx+1);
                    try { if(currentAssignment.subject.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.scores && p.scores[colIdx]) cName = p.scores[colIdx]; } } catch(e){}
                    const isTotal = cName.toLowerCase().includes("tổng");
                    const subNameLower = (currentAssignment.subject.name || "").toLowerCase();
                    let maxScoreStr = "";
                    if (subNameLower.includes("vấn đáp")) maxScoreStr = " (Max 30)";
                    else if (subNameLower.includes("viết")) maxScoreStr = " (Max 70)";
                    
                    return (
                        <div key={"sc-input-"+colIdx} className="flex flex-col gap-1.5 w-24 flex-none">
                            <span className="text-[10px] uppercase font-bold text-slate-600 truncate border-b border-slate-200 pb-1" title={cName + maxScoreStr}>{cName}{maxScoreStr && <span className="text-red-500 font-black ml-0.5">{maxScoreStr}</span>}</span>
                            {isTotal ? (
                                <div className="w-full bg-[#F0FDFA] border border-slate-300 rounded-lg py-2 text-center font-black text-[#00A19A] shadow-inner h-[42px] flex items-center justify-center">
                                    {(st.scoreVals || []).slice(0, colIdx).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0).toLocaleString("vi-VN", {maximumFractionDigits: 2})}
                                </div>
                            ) : (
                                <input 
                                    type="number"
                                    value={st.scoreVals?.[colIdx] || ""}
                                    onChange={e => handleScoreChange(st.id, colIdx, e.target.value)}
                                    disabled={isLocked}
                                    className={`w-full border border-slate-300 rounded-lg py-2 text-center font-bold shadow-sm outline-none transition-all h-[42px] ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white text-slate-800 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 placeholder-slate-300"}`}
                                    placeholder="-"
                                />
                            )}
                        </div>
                    );
                })}

                {!hideComments && Array.from({length: (currentAssignment.subject.commentColumns ?? 1)}).map((_, colIdx) => {
                    let cName = "Nhận xét " + (colIdx+1);
                    try { if(currentAssignment.subject.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.comments && p.comments[colIdx]) cName = p.comments[colIdx]; } } catch(e){}
                    return (
                        <div key={"cm-input-"+colIdx} className="flex flex-col gap-1.5 w-full min-w-[200px] flex-1">
                            <span className="text-[10px] uppercase font-bold text-slate-600 truncate border-b border-slate-200 pb-1" title={cName}>{cName}</span>
                            <input 
                                type="text"
                                value={st.commentVals?.[colIdx] || ""}
                                onChange={e => handleCommentChange(st.id, colIdx, e.target.value)}
                                disabled={isLocked}
                                className={`w-full border border-slate-300 rounded-lg py-2 px-3 text-sm font-medium shadow-sm outline-none transition-all h-[42px] ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white text-slate-700 focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/20 placeholder-slate-400"}`}
                                placeholder="..."
                            />
                        </div>
                    );
                })}
            </div>
            )}
        </td>
        {(isChildDevSubject || isThinkingSkillsSubject) && (
            <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium italic">
                    {st.commentVals?.[0] ? `"${st.commentVals[0]}"` : "-"}
                </div>
            </td>
        )}
        {isPsychSubject && (
            <>
                <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[0] || "-"}</div>
                </td>
                <td className="px-4 py-3 bg-transparent text-left align-top max-w-[250px]">
                    <div className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar font-medium">{st.commentVals?.[1] || "-"}</div>
                </td>
            </>
        )}
<td className="px-2 py-2 md:px-4 md:py-4 text-center bg-transparent md:sticky md:right-0 z-10 md:backdrop-blur-sm">
                                            <button 
                                                onClick={() => saveStudentScore(st)}
                                                disabled={isLocked || isPsychSubject || isChildDevSubject || isThinkingSkillsSubject || isPreschoolSubject}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center w-full gap-2 transition-all shadow-sm ${isLocked || isPsychSubject || isChildDevSubject || isThinkingSkillsSubject ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none" : 
                                                    saveStatus[st.id] === "saved" ? "bg-emerald-500 text-white" : 
                                                    saveStatus[st.id] === "saving" ? "bg-slate-200 text-slate-500" :
                                                    "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"}`}
                                            >
                                                {saveStatus[st.id] === "saved" ? <><CheckCircle2 className="w-4 h-4"/> <span className="hidden md:inline">Đã lưu</span></> : <><Save className="w-4 h-4" /> <span className="hidden md:inline">Lưu</span></>}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 bg-[#F8FAFC]">Chưa có dữ liệu học sinh nào thỏa mãn Khối/Hệ môn học này trong kỳ Khảo sát.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        
      {isUnlockRequestOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-lg text-slate-800">Yêu cầu Mở khóa Form</h3>
              <button onClick={() => setIsUnlockRequestOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do xin mở khóa bổ sung điểm:</label>
                <textarea 
                    value={unlockReason} 
                    onChange={e => setUnlockReason(e.target.value)} 
                    className="w-full border rounded-xl p-3 text-sm focus:border-[#00A19A] outline-none h-32 resize-none" 
                    placeholder="VD: Cần chỉnh sửa lại điểm cột Hành vi cho một số học sinh..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsUnlockRequestOpen(false)} className="px-5 py-2 hover:bg-slate-100 rounded-xl font-medium text-slate-600">Hủy</button>
                <button onClick={handleUnlockRequestSubmit} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700">Gửi Yêu Cầu</button>
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
              className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
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
            onSave={async (studentId, scores, comments) => {
              const res = await fetch("/api/preschool-dev-scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, scores, ...comments })
              });
              if (res.ok) {
                setIsPreschoolModalOpen(false);
                // Refetch student list to update scoredCount and totalCriteria progress
                const assignment = availableAssignments.find(a => a.id === selectedAssignmentId) || assignments.find(a => a.id === selectedAssignmentId);
                if (assignment) {
                  const systemCode = assignment.overrideSystemCode !== undefined ? assignment.overrideSystemCode : (assignment.educationSystem || "");
                  const grade = assignment.grade || "";
                  setLoading(true);
                  const batchQueryParam = selectedBatchId === "all" ? "" : selectedBatchId;
                  const response = await fetch(`/api/teacher-assessments?action=getStudents&periodId=${assignment.periodId}&grade=${grade}&systemCode=${systemCode}&subjectId=${assignment.subjectId}&batchId=${batchQueryParam}`);
                  if (response.ok) {
                    const data = await response.json();
                    setStudents(data);
                  }
                  setLoading(false);
                }
              } else {
                throw new Error("Lưu kết quả đánh giá mầm non thất bại");
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



