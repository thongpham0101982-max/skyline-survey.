"use client";

import { useState, useEffect, useMemo } from "react";
import { BookOpen, Users, Save, CheckCircle2, CalendarDays, Layers, X } from "lucide-react";
import PsychologyAssessmentForm from "./PsychologyAssessmentForm";

export default function TeacherAssessmentsClient({ user }: { user: any }) {
    const [assignments, setAssignments] = useState<any[]>([]);
    
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
    const [isUnlockRequestOpen, setIsUnlockRequestOpen] = useState(false);
    const [unlockReason, setUnlockReason] = useState("");
    
    // Psychology Form States
    const [isPsychModalOpen, setIsPsychModalOpen] = useState(false);
    const [activePsychStudent, setActivePsychStudent] = useState<any>(null);
    
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

    const availableAssignments = useMemo(() => {
        if (!Array.isArray(assignments)) return [];
        return assignments.filter(a => a.periodId === selectedPeriodId);
    }, [assignments, selectedPeriodId]);

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
        const assignment = assignments.find(a => a.id === selectedAssignmentId);
        if (!assignment) return;

        setLoading(true);
        const systemCode = assignment.educationSystem || "";
        const grade = assignment.grade || "";
        
        fetch(`/api/teacher-assessments?action=getStudents&periodId=${assignment.periodId}&grade=${grade}&systemCode=${systemCode}&subjectId=${assignment.subjectId}`)
            .then(res => res.json())
            .then(data => {
                const enriched = data.map((st: any) => {
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
    }, [selectedAssignmentId, assignments]);

    const handleScoreChange = (studentId: string, colIndex: number, val: string) => {
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
        const assignment = assignments.find(a => a.id === selectedAssignmentId);
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

    const currentAssignment = assignments.find(a => a.id === selectedAssignmentId);
    
    // Detection logic for Psychology Grades 1-5
    const subName = (currentAssignment?.subject?.name || "").toLowerCase();
    const subCode = (currentAssignment?.subject?.code || "").toLowerCase();
    const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");
    const gradeVal = String(currentAssignment?.grade || "").replace("Khối ", "").trim();
    const isPsychologyLevel = ["1", "2", "3", "4", "5"].includes(gradeVal);
    const isPsychologyForm = isPsychSubject && isPsychologyLevel;
  
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
  const isLocked = currentAssignment?.period?.status !== "ACTIVE" && currentAssignment?.unlockRequestStatus !== "APPROVED";

    return (
        <div className="p-3 md:p-6 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
            
<div className="bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div>
                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Nhập kết quả Khảo sát</h1>
                <p className="text-indigo-100 font-medium mt-1">Xin chào giáo viên <span className="text-white font-bold">{user?.fullName || "ẩn danh"}</span>!</p>
            </div>
                        <p className="text-indigo-100 mt-2 flex items-center flex-wrap gap-2 text-sm md:text-base font-medium opacity-90">
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

            <div className="-mt-10 mx-auto w-[92%] relative z-20 bg-white/70 backdrop-blur-xl p-5 rounded-3xl shadow-xl shadow-indigo-900/5 ring-1 ring-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-500"/> Kỳ Khảo sát
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedPeriodId} 
                            onChange={e => setSelectedPeriodId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            {periods.length === 0 && <option value="">Không có kỳ KS nào</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="group">
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500"/> Phân công
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedAssignmentId} 
                            onChange={e => setSelectedAssignmentId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                        >
                            {availableAssignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.educationSystem || "Tất cả"})
                                </option>
                            ))}
                            {availableAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>
{currentAssignment && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-white flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <Users className="w-5 h-5 text-indigo-600"/>
                                Form nhập kết quả: {currentAssignment.subject.name}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5"/> Khối: <span className="font-semibold text-slate-700">{currentAssignment.grade || "Tất cả"}</span> | 
                                Thuộc kỳ khảo sát: <span className="font-semibold text-slate-700">{currentAssignment.period.name}</span>
                            </p>
                        </div>
                        {isLocked && <span className="text-sm font-bold bg-red-100 text-red-700 border border-red-200 px-4 py-1.5 rounded-full shadow-sm mr-2 flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> KỲ KHẢO SÁT ĐÃ KHÓA</span>}
                        <span className={"text-sm font-medium border px-4 py-1.5 rounded-full shadow-sm " + (isLocked ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-emerald-100/50 text-emerald-700 border-emerald-200")}>
                            {isPsychologyForm ? `Mẫu chuyên biệt Tâm lý Khối ${gradeVal}` : `Cấu hình: ${currentAssignment.subject.scoreColumns} cột điểm, ${currentAssignment.subject.commentColumns} cột nhận xét`}
                        </span>
                    </div>

                    {isLocked && (
                        <div className="px-5 py-4 bg-red-50 border-y border-red-100 flex items-start gap-3">
                            <div className="pt-0.5">
                                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-red-800 mb-1">Kỳ khảo sát đã bị khóa điểm</h3>
                                <p className="text-sm text-red-700 leading-relaxed">
                                    Kỳ khảo sát này đã được thiết lập sang trạng thái <strong>KHÓA</strong> nên mọi thao tác nhập liệu đều bị cấm. <br/>
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
                            <thead className="bg-slate-100 text-slate-700 border-b">
    <tr>
        <th className="px-3 py-4 w-12 text-center border-b border-r font-bold text-slate-700 bg-slate-100 uppercase tracking-wider md:sticky md:left-0 z-20">STT</th>
        <th className="px-2 py-3 md:px-4 md:py-4 border-b border-r font-bold text-slate-700 bg-slate-100 uppercase tracking-wider md:sticky md:left-[48px] z-20 min-w-[280px] text-left">Thông tin Học sinh</th>
        <th className="px-4 py-4 border-b border-r font-bold text-amber-900 bg-amber-50 uppercase tracking-wider text-left">
            {isPsychologyForm ? `Đánh giá Sàng lọc Tâm lý - Khối ${gradeVal}` : "Chi tiết Điểm & Nhận xét"}
        </th>
        <th className="px-2 py-3 md:px-4 md:py-4 text-center border-b font-bold text-emerald-800 bg-emerald-50 uppercase tracking-wider w-32 md:sticky md:right-0 z-20">Xác nhận</th>
    </tr>
</thead>
                            <tbody className="divide-y border-b">
                                {students.map((st, i) => (
                                    <tr key={st.id} className="hover:bg-slate-50/50 group">
                                        <td className="px-2 py-2 md:px-3 md:py-3 text-center text-slate-500 border-b border-r bg-white md:sticky md:left-0 z-10">{i+1}</td>
                                        <td className="px-2 py-2 md:px-4 md:py-3 border-b border-r bg-white md:sticky md:left-[48px] z-10">
                <div className="flex flex-col gap-2">
                    {/* Tên và Khối */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-800 text-sm leading-tight">{st.fullName}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">Khối {st.grade}</span>
                    </div>
                    {/* Mã HS và Ngày sinh */}
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100">{st.studentCode}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3"/> {st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—"}
                        </span>
                    </div>
                    {/* Các trường danh mục */}
                    <div className="flex flex-wrap gap-1">
                        {st.admissionCriteria && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-none"/>Diện KS: {st.admissionCriteria}
                            </span>
                        )}
                        {st.surveyFormType && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-100 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-none"/>HT KS: {st.surveyFormType}
                            </span>
                        )}
                        {st.targetType && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-none"/>Loại TS: {st.targetType}
                            </span>
                        )}
                        {st.hocKy && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-none"/>Năm học TS: {st.hocKy}
                            </span>
                        )}
                        {st.kqgdTieuHoc && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-none"/>HS CT Bộ: {st.kqgdTieuHoc}
                            </span>
                        )}
                        {st.kqHocTap && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-none"/>HS CT QT: {st.kqHocTap}
                            </span>
                        )}
                        {st.kqRenLuyen && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-none"/>KQ Rèn luyện: {st.kqRenLuyen}
                            </span>
                        )}
                    </div>
                </div></td>
                                        
                                        <td className="px-4 py-4 border-b border-r bg-slate-50/20">
            {isPsychologyForm ? (
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { setActivePsychStudent(st); setIsPsychModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <BookOpen className="w-4 h-4" /> 
                    Mở Form Đánh giá Tâm lý
                  </button>
                  {st.scoreVals?.length >= 7 && (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-[1px] bg-slate-200"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đã chấm</span>
                        <span className="text-indigo-600 font-black text-lg">{st.scoreVals[6] || st.scoreVals[20] || '0'} <span className="text-xs text-slate-400 font-bold uppercase ml-1">Điểm</span></span>
                      </div>
                    </div>
                  )}
                  {(!st.scoreVals || st.scoreVals.length < 7) && (
                    <span className="text-xs text-slate-400 italic">Bấm để đánh giá →</span>
                  )}
              </div>
            ) : (
            <div className="flex flex-wrap gap-4 items-start">
                {Array.from({length: (currentAssignment.subject.scoreColumns ?? 1)}).map((_, colIdx) => {
                    let cName = "Điểm " + (colIdx+1);
                    try { if(currentAssignment.subject.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.scores && p.scores[colIdx]) cName = p.scores[colIdx]; } } catch(e){}
                    const isTotal = cName.toLowerCase().includes("tổng");
                    return (
                        <div key={"sc-input-"+colIdx} className="flex flex-col gap-1.5 w-24 flex-none">
                            <span className="text-[10px] uppercase font-bold text-indigo-700/80 truncate border-b border-indigo-100 pb-1" title={cName}>{cName}</span>
                            {isTotal ? (
                                <div className="w-full bg-indigo-50/80 border border-indigo-200 rounded-lg py-2 text-center font-black text-indigo-800 shadow-inner h-[42px] flex items-center justify-center">
                                    {(st.scoreVals || []).slice(0, colIdx).reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0).toLocaleString("vi-VN", {maximumFractionDigits: 2})}
                                </div>
                            ) : (
                                <input 
                                    type="number"
                                    value={st.scoreVals?.[colIdx] || ""}
                                    onChange={e => handleScoreChange(st.id, colIdx, e.target.value)}
                                    disabled={isLocked}
                                    className={`w-full border border-indigo-200 rounded-lg py-2 text-center font-bold shadow-sm outline-none transition-all h-[42px] ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 placeholder-slate-300"}`}
                                    placeholder="-"
                                />
                            )}
                        </div>
                    );
                })}

                {Array.from({length: (currentAssignment.subject.commentColumns ?? 1)}).map((_, colIdx) => {
                    let cName = "Nhận xét " + (colIdx+1);
                    try { if(currentAssignment.subject.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.comments && p.comments[colIdx]) cName = p.comments[colIdx]; } } catch(e){}
                    return (
                        <div key={"cm-input-"+colIdx} className="flex flex-col gap-1.5 w-full min-w-[200px] flex-1">
                            <span className="text-[10px] uppercase font-bold text-amber-700/80 truncate border-b border-amber-100 pb-1" title={cName}>{cName}</span>
                            <input 
                                type="text"
                                value={st.commentVals?.[colIdx] || ""}
                                onChange={e => handleCommentChange(st.id, colIdx, e.target.value)}
                                disabled={isLocked}
                                className={`w-full border border-amber-200 rounded-lg py-2 px-3 text-sm font-medium shadow-sm outline-none transition-all h-[42px] ${isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200" : "bg-white text-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 placeholder-slate-400"}`}
                                placeholder="..."
                            />
                        </div>
                    );
                })}
            </div>
            )}
        </td>
<td className="px-2 py-2 md:px-4 md:py-3 text-center border-b bg-emerald-50/50 md:sticky md:right-0 z-10 md:backdrop-blur-sm">
                                            <button 
                                                onClick={() => saveStudentScore(st)}
                                                disabled={isLocked || isPsychologyForm}
                                                className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center w-full gap-2 transition-all shadow-sm ${isLocked || isPsychologyForm ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none" : 
                                                    saveStatus[st.id] === "saved" ? "bg-emerald-500 text-white" : 
                                                    saveStatus[st.id] === "saving" ? "bg-slate-200 text-slate-500" :
                                                    "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"}`}
                                            >
                                                {saveStatus[st.id] === "saved" ? <><CheckCircle2 className="w-4 h-4"/> <span className="hidden md:inline">Đã lưu</span></> : <><Save className="w-4 h-4" /> <span className="hidden md:inline">Lưu</span></>}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-12 text-center text-slate-500 bg-slate-50/50">Chưa có dữ liệu học sinh nào thỏa mãn Khối/Hệ môn học này trong kỳ Khảo sát.</td>
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
            <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">Yêu cầu Mở khóa Form</h3>
              <button onClick={() => setIsUnlockRequestOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do xin mở khóa bổ sung điểm:</label>
                <textarea 
                    value={unlockReason} 
                    onChange={e => setUnlockReason(e.target.value)} 
                    className="w-full border rounded-xl p-3 text-sm focus:border-indigo-500 outline-none h-32 resize-none" 
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

      {isPsychologyForm && activePsychStudent && isPsychModalOpen && (
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
            onSave={(st, scores, comments) => saveStudentScore(st, scores, comments)}
            isLocked={isLocked}
          />
        </div>
      )}
        </div>
    );
}



