"use client"
// @ts-nocheck

import React, { useState, useEffect } from "react"
import { 
    ClipboardCheck, 
    Sparkles, 
    Save, 
    Info, 
    BrainCircuit, 
    User, 
    MessageSquare, 
    AlertCircle, 
    ChevronRight, 
    CheckCircle2,
    Mail,
    Send,
    Building2,
    Check,
    X,
    ShieldAlert,
    ShieldCheck,
    Award,
    Printer,
    Download,
    Brain
} from "lucide-react"

import { 
    questionsData, 
    defaultQuestions, 
    scaleOptions, 
    Question, 
    Section, 
    QuestionsData,
    grade1Questions,
    grades2to5Questions,
    grades6to9Questions,
    grades10to12Questions
} from "@/lib/orientation/psychologyQuestions"

export { questionsData, defaultQuestions }


export default function PsychologyAssessmentForm({ student, onSave, isLocked, onPrintPsychologyPdf }: any) {
    const handlePrintOrExport = (isPdf = false) => {
        if (typeof onPrintPsychologyPdf === "function") {
            onPrintPsychologyPdf(student, {
                scores,
                notes,
                sectionScores,
                totalScore,
                evaluation,
                conclusion,
                recommendation,
                digitalSignature
            });
            return;
        }
        window.print();
    };
    
    const rawGrade = String(student?.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim()
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default"

    const sections = questionsData[currentGrade] || defaultQuestions
    const isGrades1to5 = ["1", "2", "3", "4", "5"].includes(currentGrade)
    const isGrades6to12 = ["6", "7", "8", "9", "10", "11", "12"].includes(currentGrade)
    const isScoredForm = isGrades1to5 || isGrades6to12
    const [scores, setScores] = useState<number[]>(Array(20).fill(-1))
    const [notes, setNotes] = useState<string[]>(Array(20).fill(""))
    const [conclusion, setConclusion] = useState("")
    const [recommendation, setRecommendation] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [activeSection, setActiveSection] = useState(0)

    // Lược sử đánh giá
    const [historyList, setHistoryList] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

    // Trạng thái Báo Cáo & Gửi Email cho GĐCS
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [gdcsList, setGdcsList] = useState<any[]>([])
    const [selectedGdcsEmail, setSelectedGdcsEmail] = useState("")
    const [selectedGdcsName, setSelectedGdcsName] = useState("")
    const [selectedCampusCode, setSelectedCampusCode] = useState("")
    const [messageToGdcs, setMessageToGdcs] = useState("")
    const [sendingReport, setSendingReport] = useState(false)
    const [reportSentInfo, setReportSentInfo] = useState<any>(null)
    const [digitalSignature, setDigitalSignature] = useState<any>(null)

    // Tải danh sách GĐCS và kiểm tra lịch sử đã gửi email GĐCS
    useEffect(() => {
        const fetchGdcsInfo = async () => {
            try {
                const sId = student?.id || ""
                const url = sId 
                    ? `/api/admin/orientation/psychology-referral?studentId=${sId}`
                    : `/api/admin/orientation/psychology-referral?action=getGdcsList`
                
                const res = await fetch(url)
                if (res.ok) {
                    const data = await res.json()
                    const list = data.gdcsList || []
                    setGdcsList(list)

                    // Kiểm tra xem đã từng gửi báo cáo GĐCS chưa
                    if (data.psychologyData?.reportedToGdcs) {
                        setReportSentInfo(data.psychologyData.reportedToGdcs)
                        if (data.psychologyData.reportedToGdcs.messageToGdcs) {
                            setMessageToGdcs(data.psychologyData.reportedToGdcs.messageToGdcs)
                        }
                    if (data.psychologyData?.digitalSignature) {
                        setDigitalSignature(data.psychologyData.digitalSignature);
                    } else if (student?.signatureName) {
                        setDigitalSignature({
                            isSigned: true,
                            signedBy: student.signatureName,
                            signerRole: "Giáo viên Tâm lý học đường",
                            signedAtFormatted: student.updatedAt ? new Date(student.updatedAt).toLocaleString("vi-VN") : "",
                            signatureHash: `SQMS-SIGN-TLY-${student.studentCode || String(student.id || '').slice(0, 8)}`,
                            status: "VERIFIED"
                        });
                    }
                    }

                    // Tự động chọn GĐCS tương ứng với cơ sở của học sinh
                    const stCampus = String(student?.admissionCampus || student?.campusCode || student?.registeredCampus || "").toUpperCase()
                    let matched = list.find((g: any) => {
                        const cCode = String(g.campusCode || "").toUpperCase()
                        const cName = String(g.campusName || "").toUpperCase()
                        return stCampus.includes(cCode) || (cCode === "CS5" && stCampus.includes("HỘI AN")) || (cCode === "CS1" && stCampus.includes("RIVERSIDE")) || (cCode === "CS2" && stCampus.includes("CENTRAL")) || (cCode === "CS3" && stCampus.includes("INTERNATIONAL")) || (cCode === "CS4" && stCampus.includes("BEACH"))
                    })
                    if (!matched && list.length > 0) matched = list[0]

                    if (matched) {
                        setSelectedCampusCode(matched.campusCode)
                        setSelectedGdcsName(matched.managerName || matched.gdcsName || "")
                        setSelectedGdcsEmail(matched.managerEmail || matched.gdcsEmail || "")
                    }
                }
            } catch (err) {
                console.error("Lỗi khi tải danh sách GĐCS:", err)
            }
        }

        fetchGdcsInfo()
    }, [student])

    useEffect(() => {
        if (!student?.studentCode) return
        setLoadingHistory(true)
        fetch(`/api/teacher-assessments?action=getRetestHistory&studentCode=${encodeURIComponent(student.studentCode)}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setHistoryList(data)
                }
                setLoadingHistory(false)
            })
            .catch(err => {
                console.error("Error fetching student history:", err)
                setLoadingHistory(false)
            })
    }, [student])

    useEffect(() => {
        const scoreData = student?.scores?.find((sc: any) => sc.subject?.code === 'TLY') || student?.scores?.[0]
        if (scoreData) {
            try {
                const parsedScores = JSON.parse(scoreData.scores || "[]")
                // In the new system, we store 7 results (6 sections + total) at index 0-6
                // and 20 raw items at index 7-26
                if (parsedScores.length >= 27) {
                    setScores(parsedScores.slice(7, 27).map(Number))
                } else if (parsedScores.length === 20) {
                    // Legacy support
                    setScores(parsedScores.map(Number))
                }
                
                const parsedComments = JSON.parse(scoreData.comments || "[]")
                if (parsedComments.length >= 2) {
                    
                    setConclusion(parsedComments[0] || "")
                    setRecommendation(parsedComments[1] || "")
                
                    if (parsedComments.length >= 22) {
                        setNotes(parsedComments.slice(2, 22))
                    }
                }
            } catch (e) {
                console.error("Error parsing psychology scores", e)
            }
        }
    }, [student])

    const calculateSectionScore = (sectionIdx: number) => {
        let questionOffset = 0
        for (let i = 0; i < sectionIdx; i++) {
            questionOffset += sections[i].questions.length
        }
        const sectionQuestions = sections[sectionIdx].questions
        const sectionTotal = scores.slice(questionOffset, questionOffset + sectionQuestions.length).reduce((a, b) => a + b, 0)
        return sectionTotal
    }

    const totalScore = scores.reduce((a, b) => a + b, 0)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Reorder for Admin Report: 
            // 0-5: Sections, 6: TOTAL, 7-26: Raw Questions
            const sectionScores = sections.map((_, i) => calculateSectionScore(i))
            const finalScores = [...sectionScores, totalScore, ...scores]
            
            // Map comments to the expected array structure: [Conclusion, Recommendation]
            const finalComments = [conclusion, recommendation, ...notes]
            
            await onSave(student, finalScores, finalComments)
            alert("Lưu kết quả Tâm lý thành công!")
        } catch (e) {
            alert("Lỗi khi lưu kết quả.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleSendEmailToGdcs = async () => {
        if (!selectedGdcsEmail) {
            alert("Vui lòng chọn Giám Đốc Cơ Sở để gửi email báo cáo.");
            return;
        }
        setSendingReport(true);
        try {
            // 1. Lưu kết quả vào form trước
            const sectionScores = sections.map((_, i) => calculateSectionScore(i));
            const finalScores = [...sectionScores, totalScore, ...scores];
            const finalComments = [conclusion, recommendation, ...notes];
            await onSave(student, finalScores, finalComments);

            // 2. Gửi API báo cáo GĐCS & gửi Email
            const res = await fetch("/api/admin/orientation/psychology-referral", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reportToGdcs",
                    studentId: student?.id,
                    gdcsName: selectedGdcsName,
                    gdcsEmail: selectedGdcsEmail,
                    campusCode: selectedCampusCode,
                    scores: scores,
                    sectionScores: sectionScores,
                    totalScore: totalScore,
                    evaluation: evaluation || {},
                    conclusion: conclusion,
                    recommendation: recommendation,
                    notes: notes,
                    messageToGdcs: messageToGdcs
                })
            });

            const data = await res.json();
            if (data.success) {
                const newSentInfo = {
                    gdcsName: selectedGdcsName,
                    gdcsEmail: selectedGdcsEmail,
                    campusCode: selectedCampusCode,
                    reportedAt: new Date().toISOString(),
                    messageToGdcs: messageToGdcs
                };
                setReportSentInfo(newSentInfo);
                setIsReportModalOpen(false);
                alert(`Đã gửi Email báo cáo kết quả Tâm lý đến GĐCS ${selectedGdcsName} (${selectedGdcsEmail}) thành công và đồng bộ lên Phiếu Định Hướng!`);
            } else {
                alert("Lỗi khi gửi báo cáo: " + (data.error || "Không xác định"));
            }
        } catch (e: any) {
            alert("Lỗi khi gửi email: " + e.message);
        } finally {
            setSendingReport(false);
        }
    };

    const currentQuestions = sections[activeSection].questions
    let currentOffset = 0
    for (let i = 0; i < activeSection; i++) {
        currentOffset += sections[i].questions.length
    }

    const progress = Math.round((scores.filter(s => s >= 0).length / 20) * 100)

    const getEvaluation = (score: number) => {
        if (isGrades6to12) {
            if (score <= 15) return { level: "Bình thường", suggestion: "Ổn định, thích nghi tốt", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
            if (score <= 31) return { level: "Dấu hiệu nhẹ", suggestion: "Theo dõi - hỗ trợ tâm lý học đường", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
            if (score <= 47) return { level: "Dấu hiệu vừa", suggestion: "Quan sát sâu, tư vấn cá nhân", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
            if (score <= 63) return { level: "Nguy cơ cao", suggestion: "Đánh giá chuyên sâu, can thiệp định kỳ", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
            return { level: "Nguy cơ rất cao", suggestion: "Cần can thiệp chuyên môn, phối hợp phụ huynh", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
        }
        
        // Grades 1-5 default
        if (score <= 15) return { level: "Bình thường", suggestion: "Có thể theo học bình thường", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
        if (score <= 31) return { level: "Dấu hiệu nhẹ", suggestion: "Theo dõi - hỗ trợ thích nghi", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
        if (score <= 47) return { level: "Dấu hiệu vừa", suggestion: "Quan sát sâu, can thiệp nhẹ nếu cần", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
        if (score <= 63) return { level: "Nguy cơ cao", suggestion: "Cần đánh giá chuyên sâu và can thiệp", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
        return { level: "Nguy cơ rất cao", suggestion: "Cần can thiệp chuyên môn sớm (bảo đảm an toàn và hỗ trợ)", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    };

    const evaluation = isScoredForm ? getEvaluation(totalScore) : null;

    return (
        <div className="min-h-screen p-3 md:p-6 font-sans text-slate-900 text-xs font-semibold">
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Header Profile Section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-violet-100 flex flex-col md:flex-row gap-5 items-center relative overflow-hidden">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                        <User size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex justify-center md:justify-start gap-2 items-center mb-1">
                            <span className="text-indigo-700 text-xs font-bold text-xs font-semibold">Khối {rawGrade || "N/A"}</span>
                            <span className="text-slate-500 text-xs font-medium">ID: {student?.studentCode}</span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">{student?.fullName}</h1>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full"><Sparkles size={12} className="text-amber-500"/> Phiếu đánh giá Tâm lý</span>
                    </div>
                                        <div className="flex flex-col items-center md:items-end gap-1 mt-2 md:mt-0">
                        <div className="text-3xl font-black text-indigo-600 flex items-baseline gap-1">
                            {totalScore} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Điểm</span>
                        </div>
                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Tiến độ: {progress}%</div>
                    </div>
                </div>

                {/* Render Lược sử điểm đánh giá */}
                {(() => {
                    const pastAssessments = historyList.filter((h: any) => h.id !== student.id);
                    if (pastAssessments.length === 0) return null;
                    return (
                        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-100 space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b">
                                <ClipboardCheck size={18} className="text-indigo-600" />
                                <h3 className="font-bold text-slate-800 text-sm">Lược sử điểm đánh giá các đợt trước</h3>
                                <span className="text-[10px] font-bold text-indigo-700 text-xs font-semibold">{pastAssessments.length} đợt</span>
                            </div>
                            {loadingHistory ? (
                                <div className="text-xs text-slate-500 py-2">Đang tải lược sử...</div>
                            ) : (
                                <div className="space-y-3">
                                    {pastAssessments.map((histRec: any) => {
                                        const scoreData = histRec.scores?.find((sc: any) => sc.subject?.code === 'TLY' || sc.subject?.code?.toLowerCase() === 'tly');
                                        const scoreVal = (() => {
                                            if (histRec.psychologyScore !== null && histRec.psychologyScore !== undefined) {
                                                return histRec.psychologyScore;
                                            }
                                            if (!scoreData) return null;
                                            try {
                                                const parsed = JSON.parse(scoreData.scores || "[]");
                                                if (parsed.length >= 7) return Number(parsed[6]);
                                                if (parsed.length > 0) return parsed.reduce((sum, val) => sum + (Number(val) || 0), 0);
                                            } catch (e) {}
                                            return null;
                                        })();

                                        const comments = (() => {
                                            if (!scoreData) return [];
                                            try {
                                                return JSON.parse(scoreData.comments || "[]");
                                            } catch (e) { return []; }
                                        })();

                                        const concl = comments[0] || "—";
                                        const recom = comments[1] || "—";

                                        if (scoreVal === null) return null;

                                        const isExpanded = expandedHistoryId === histRec.id;
                                        const evalInfo = getEvaluation(scoreVal);

                                        return (
                                            <div key={histRec.id} className="overflow-hidden shadow-sm transition-all hover:shadow-md text-xs font-semibold">
                                                <div 
                                                    onClick={() => setExpandedHistoryId(isExpanded ? null : histRec.id)}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer gap-3 bg-white"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-2 h-2 mt-2 shrink-0 text-xs font-semibold"></div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{histRec.period?.name || "Kỳ khảo sát"}</h4>
                                                            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                                                                Đợt: <span className="font-semibold">{histRec.batch?.name || "Khảo sát lẻ"}</span> | 
                                                                Ngày đánh giá: <span className="font-semibold">{histRec.createdAt ? new Date(histRec.createdAt).toLocaleDateString("vi-VN") : "—"}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <span className="text-lg font-black text-indigo-600">{scoreVal}</span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase block -mt-1">Điểm</span>
                                                        </div>
                                                        {evalInfo && (
                                                            <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wide shadow-sm ${evalInfo.bg} ${evalInfo.border} ${evalInfo.color}`}>
                                                                {evalInfo.level}
                                                            </div>
                                                        )}
                                                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-4 space-y-3 text-xs font-semibold">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                            <div className="bg-white p-3 rounded-lg border border-amber-100">
                                                                <h5 className="font-bold text-amber-800 mb-1">Kết luận sơ bộ:</h5>
                                                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{concl}</p>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                                                <h5 className="font-bold text-emerald-800 mb-1">Khuyến nghị dành cho phụ huynh:</h5>
                                                                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{recom}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                
                {isScoredForm && (
                    <div className="p-4 shadow-sm text-sm text-xs font-semibold">
                        <h3 className="font-bold text-indigo-800 mb-2">5. Thang điểm chung cho mỗi câu hỏi:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-4">
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">0</span> <span className="text-slate-700">Không bao giờ / Không có biểu hiện</span></div>
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">1</span> <span className="text-slate-700">Hiếm khi / Biểu hiện rất nhẹ</span></div>
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">2</span> <span className="text-slate-700">Thỉnh thoảng / Biểu hiện nhẹ</span></div>
                            <div className="flex gap-2"><span className="font-bold text-indigo-600 w-4">3</span> <span className="text-slate-700">Thường xuyên / Biểu hiện rõ</span></div>
                            <div className="flex gap-2 md:col-span-2"><span className="font-bold text-indigo-600 w-4">4</span> <span className="text-slate-700">Rất thường xuyên / Ảnh hưởng rõ đến sinh hoạt hoặc học tập</span></div>
                        </div>
                        <h2 className="font-black text-indigo-900 text-lg uppercase">B. THANG ĐO SÀNG LỌC TÂM LÝ:</h2>
                    </div>
                )}

                {/* Section Navigation */}
                <div className="bg-white rounded-xl shadow-sm border-2 border-rose-100 p-2 overflow-x-auto custom-scrollbar flex gap-2">
                    {sections.map((section, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveSection(idx)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${
                                activeSection === idx
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                                    : "bg-transparent text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${activeSection === idx ? "bg-indigo-500" : "bg-slate-300"}`}></span>
                                {section.title}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Question List (Compact Layout) */}
                <div className="bg-white rounded-2xl shadow-sm border-2 border-teal-100 overflow-hidden">
                    <div className="flex justify-between items-center text-xs font-semibold">
                        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <ChevronRight size={16} className="text-indigo-500" />
                            {sections[activeSection].title}
                        </h2>
                        <div className="text-[11px] font-bold text-indigo-700 text-xs font-semibold">
                            Điểm phần này: {calculateSectionScore(activeSection)}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        {currentQuestions.map((q, qIdx) => {
                            const actualIdx = currentOffset + qIdx
                            return (
                                <div key={qIdx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-center p-4 md:p-5 hover:bg-slate-50/80 transition-colors text-xs font-semibold">
                                    <div className="lg:col-span-5 xl:col-span-6 flex items-start gap-3">
                                        <span className="text-slate-400 font-bold text-sm w-5 shrink-0 mt-0.5">{actualIdx + 1}.</span>
                                        <span className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">{q.text.replace(/^\d+\.\s*/, "")}</span>
                                    </div>
                                    <div className={`lg:col-span-7 xl:col-span-6 flex ${isScoredForm ? "gap-6 justify-start mt-2 lg:mt-0" : "gap-2"} w-full ml-8 lg:ml-0`}>
                                        {q.options.map((opt, oIdx) => {
                                            const optValue = q.options.length === 5 ? oIdx : oIdx + 1;
                                            return isScoredForm ? (
                                                <label key={oIdx} className="flex items-center gap-1.5 cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        disabled={isLocked}
                                                        name={`question-${actualIdx}`}
                                                        checked={scores[actualIdx] === optValue}
                                                        onChange={() => {
                                                            const newScores = [...scores];
                                                            newScores[actualIdx] = optValue;
                                                            setScores(newScores);
                                                        }}
                                                        className="w-4 h-4 border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                                    />
                                                    <span className={`font-bold ${scores[actualIdx] === optValue ? "text-indigo-700" : "text-slate-600 group-hover:text-indigo-600"}`}>{opt}</span>
                                                </label>
                                            ) : (
                                            <button
                                                key={oIdx}
                                                disabled={isLocked}
                                                onClick={() => {
                                                    const newScores = [...scores]
                                                    newScores[actualIdx] = optValue
                                                    setScores(newScores)
                                                }}
                                                className={`flex-1 py-2.5 px-2 text-[11px] md:text-xs font-bold rounded-lg border transition-all ${
                                                    scores[actualIdx] === optValue
                                                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]"
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30"
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        )})}
                                    </div>
                                    {isScoredForm && (
                                        <div className="lg:col-span-12 w-full mt-1.5 ml-8 lg:ml-0 flex items-end gap-2">
                                            <span className="text-[13px] font-semibold text-slate-700 whitespace-nowrap mb-0.5">Ghi chú quan sát:</span>
                                            <input
                                                type="text"
                                                value={notes[actualIdx] || ""}
                                                onChange={(e) => {
                                                    const newNotes = [...notes]
                                                    newNotes[actualIdx] = e.target.value
                                                    setNotes(newNotes)
                                                }}
                                                disabled={isLocked}
                                                className="flex-1 text-[13px] border-b border-slate-300 border-dashed bg-transparent outline-none focus:border-indigo-500 transition-all text-slate-800 px-1 py-0.5"
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {isScoredForm && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-100">
                        <h3 className="font-bold text-slate-800 text-base mb-4">TỔNG HỢP:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-8 mb-4 text-sm font-medium text-slate-700">
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục I :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(0)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục III :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(2)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục V :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(4)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục II :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(1)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục IV :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(3)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục VI :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(5)}</span></div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 mt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-slate-800 text-sm">Tổng điểm:</span>
                                <span className="font-black text-indigo-600 border-b border-slate-400 min-w-[60px] inline-block text-center text-lg">{totalScore}</span>
                            </div>
                            
                            {progress === 100 && evaluation && (
                                <div className={`flex-1 p-3 rounded-xl border ${evaluation.bg} ${evaluation.border}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mức độ:</span>
                                        <span className={`font-black ${evaluation.color} uppercase`}>{evaluation.level}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Gợi ý đánh giá:</span>
                                        <span className={`text-sm font-semibold ${evaluation.color}`}>{evaluation.suggestion}</span>
                                    </div>
                                </div>
                            )}
                            {progress < 100 && (
                                <div className="flex-1 p-3 text-center sm:text-left text-xs font-semibold">
                                    <span className="text-xs font-medium text-slate-500 italic">Vui lòng đánh giá đủ 20 câu hỏi để xem kết quả phân tích mức độ tự động.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Conclusion and Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-amber-100 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="text-amber-500" />
                            <h3 className="font-bold text-slate-800 text-sm">{isScoredForm ? "C. KẾT LUẬN SƠ BỘ:" : "Kết luận chuyên môn"}</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={conclusion}
                            onChange={(e) => setConclusion(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-50 outline-none transition-all text-sm text-slate-700 resize-y text-xs font-semibold"
                            placeholder="Nhận định tổng quát..."
                        ></textarea>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-100 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={18} className="text-emerald-500" />
                            <h3 className="font-bold text-slate-800 text-sm">{isScoredForm ? "D. KHUYẾN NGHỊ DÀNH CHO PHỤ HUYNH (NẾU CÓ):" : "Kiến nghị hỗ trợ"}</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 outline-none transition-all text-sm text-slate-700 resize-y text-xs font-semibold"
                            placeholder="Gợi ý can thiệp, hỗ trợ..."
                        ></textarea>
                    </div>
                </div>

                {/* KHỐI CHỨNG NHẬN CHỮ KÝ ĐIỆN TỬ GIÁO VIÊN BỘ MÔN (BƯỚC 4) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-teal-200 overflow-hidden relative">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-teal-100">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#00A19A] shrink-0">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 className="font-extrabold text-[#003B3A] text-xs uppercase tracking-wide flex items-center gap-2">
                                    <span>Chứng Nhận Chữ Ký Điện Tử Giáo Viên Bộ Môn</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        {digitalSignature?.isSigned || student?.signatureName ? "Đã Ký Điện Tử (B4)" : "Tự động gán khi hoàn thành B4"}
                                    </span>
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    Hệ thống xác thực chữ ký điện tử học thuật Sky-Line (SQMS Standard)
                                </p>
                            </div>
                        </div>
                        {digitalSignature?.signatureHash && (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md border border-slate-200">
                                {digitalSignature.signatureHash}
                            </span>
                        )}
                    </div>

                    <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Giáo viên đánh giá &amp; Ký xác nhận:</span>
                            <div className="font-black text-[#003B3A] text-sm">
                                {digitalSignature?.signedBy || student?.signatureName || student?.currentTeacherName || "Giáo viên Tâm lý"}
                            </div>
                            <div className="text-[10.5px] text-teal-700 font-semibold mt-0.5">
                                {digitalSignature?.signerRole || "Giáo viên Khảo sát & Đánh giá Tâm lý"}
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Thời gian xác thực chữ ký:</span>
                            <div className="font-bold text-slate-800 tabular-nums">
                                {digitalSignature?.signedAtFormatted || (student?.updatedAt ? new Date(student.updatedAt).toLocaleString("vi-VN") : "Đang cập nhật")}
                            </div>
                            <div className="text-[10.5px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Hợp lệ &amp; Đồng bộ CSDL
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#F0FDFA] border border-teal-200 flex flex-col justify-center">
                            <span className="text-[10px] font-bold uppercase text-[#00736E] block mb-0.5">Quy trình công đoạn:</span>
                            <div className="font-extrabold text-[#003B3A] text-[11.5px]">
                                Bước 4 — Hoàn tất Khảo sát Chuyên môn
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                Tự động gán chữ ký vào Mẫu Phiếu &amp; Báo cáo A4
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-4 z-10">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                            <AlertCircle size={14} className="text-indigo-500" />
                            Lưu ý kiểm tra kỹ trước khi Xác nhận
                        </div>
                        {reportSentInfo && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-bold">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Đã gửi Email GĐCS: <strong>{reportSentInfo.gdcsName}</strong> ({reportSentInfo.reportedAt ? new Date(reportSentInfo.reportedAt).toLocaleDateString("vi-VN") : ""})</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                                                {/* NÚT LƯU PDF / IN PHIẾU TÂM LÝ */}
                        <button
                            type="button"
                            onClick={() => handlePrintOrExport(true)}
                            disabled={isSaving}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50"
                            title="Chỉ lưu PDF kết quả khảo sát tâm lý và ký tên"
                        >
                            <Printer size={15} />
                            <span>Lưu PDF &amp; In Phiếu</span>
                        </button>

                        {/* NÚT GỬI EMAIL BÁO CÁO GĐCS */}
                        <button
                            type="button"
                            onClick={() => setIsReportModalOpen(true)}
                            disabled={isSaving || sendingReport}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                            title="Chọn Giám Đốc Cơ Sở để gửi Email chi tiết kết quả đánh giá tâm lý"
                        >
                            <Mail size={15} />
                            <span>{reportSentInfo ? "Gửi Lại Email Cho GĐCS" : "Gửi Email Cho GĐCS"}</span>
                        </button>

                        {/* NÚT LƯU KẾT QUẢ */}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || isLocked}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Save size={15} />
                            )}
                            {isLocked ? "Form đã khóa" : "Lưu Kết Quả"}
                        </button>
                    </div>
                </div>

                {/* MODAL GỬI EMAIL BÁO CÁO KẾT QUẢ TÂM LÝ CHO GĐCS */}
                {isReportModalOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800">
                                            Gửi Email Báo Cáo Cho Giám Đốc Cơ Sở (GĐCS)
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            Chọn GĐCS phụ trách cơ sở để gửi chi tiết kết quả đánh giá tâm lý
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* CHỌN GĐCS */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                    1. Chọn Giám Đốc Cơ Sở (GĐCS) Tiếp Nhận Báo Cáo <span className="text-rose-500">*</span>:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {gdcsList.map((g: any) => {
                                        const isSelected = selectedGdcsEmail === (g.managerEmail || g.gdcsEmail);
                                        return (
                                            <button
                                                key={g.campusCode || g.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCampusCode(g.campusCode);
                                                    setSelectedGdcsName(g.managerName || g.gdcsName || "");
                                                    setSelectedGdcsEmail(g.managerEmail || g.gdcsEmail || "");
                                                }}
                                                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                                                        : "bg-slate-50/50 border-slate-200 hover:bg-slate-100/70"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md uppercase">
                                                        {g.campusCode} - {g.campusName?.replace("Sky-Line", "").trim() || g.campusCode}
                                                    </span>
                                                    {isSelected && <Check size={14} className="text-indigo-600" />}
                                                </div>
                                                <div className="text-xs font-bold text-slate-900">{g.managerName || g.gdcsName}</div>
                                                <div className="text-[11px] text-slate-500 truncate">{g.managerEmail || g.gdcsEmail}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* TÓM TẮT KẾT QUẢ ĐÍNH KÈM */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-700 uppercase text-[11px] flex items-center gap-1.5">
                                        <Award size={14} className="text-indigo-600" />
                                        2. Tóm tắt kết quả đính kèm trong Email:
                                    </span>
                                    <span className="text-indigo-700 font-extrabold text-sm">{totalScore} Điểm</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                                        <span className="text-slate-400 block text-[10px]">Học sinh:</span>
                                        <strong className="text-slate-800">{student?.fullName} (Khối {rawGrade})</strong>
                                    </div>
                                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                                        <span className="text-slate-400 block text-[10px]">Mức độ nhận diện:</span>
                                        <strong className="text-indigo-700">{evaluation?.level || "Đang đánh giá"}</strong>
                                    </div>
                                    <div className="p-2 bg-white rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                                        <span className="text-slate-400 block text-[10px]">Gợi ý can thiệp:</span>
                                        <strong className="text-slate-800 truncate block">{evaluation?.suggestion || "Ổn định"}</strong>
                                    </div>
                                </div>
                                {conclusion && (
                                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px]">
                                        <span className="text-slate-400 block text-[10px] font-semibold">Kết luận chuyên môn:</span>
                                        <p className="text-slate-700 italic mt-0.5 line-clamp-2">&quot;{conclusion}&quot;</p>
                                    </div>
                                )}
                            </div>

                            {/* TIN NHẮN / ĐỀ XUẤT CỦA GV TÂM LÝ GỬI GĐCS */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                    3. Ghi chú & Đề xuất phương án gửi Giám Đốc Cơ Sở (Nội dung email):
                                </label>
                                <textarea
                                    rows={3}
                                    value={messageToGdcs}
                                    onChange={(e) => setMessageToGdcs(e.target.value)}
                                    placeholder="Ví dụ: Đề xuất GĐCS xem xét phương án Ủy quyền GV đồng hành trong 4 tuần đầu, hoặc hẹn gặp trực tiếp phụ huynh để làm rõ kế hoạch can thiệp..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-none"
                                />
                            </div>

                            {/* MODAL ACTIONS */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsReportModalOpen(false)}
                                    disabled={sendingReport}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendEmailToGdcs}
                                    disabled={sendingReport || !selectedGdcsEmail}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {sendingReport ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Đang gửi email đến GĐCS...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={15} />
                                            <span>Xác Nhận & Gửi Email Đến GĐCS</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
