"use client"

import React, { useState, useEffect } from "react"
import { ClipboardCheck, Save, User, AlertCircle, CheckCircle2, X } from "lucide-react"

const indicators = [
    "Chỉ số 65. Có thói quen chào hỏi, cảm ơn, xin phép và xưng hô lễ phép với người lớn",
    "Chỉ số 74. Tập trung chú ý thực hiện nhiệm vụ và hoạt động.",
    "Chỉ số 16. Nhận biết về tên gọi, đặc điểm bên ngoài, giới tính, sở thích, điểm mạnh, điểm yếu của bản thân.",
    "Chỉ số 14. Nhận ra tình huống nguy hiểm và biết cách xử lý phù hợp.",
    "Chỉ số 33. Sử dụng lời nói, hành vi lịch sự trong giao tiẽp.",
    "Chỉ số 31. Nghe và phản hồi thông tin đơn giản.",
    "Chỉ số 48. Gọi tên các ngày trong tuần theo thữ tự.",
    "Chỉ số 47. Xác định được vị trí (trong, ngoài, trên, dưới, sau, phải, trái) của một vật so với một vật khác.",
    "Chỉ số 51. Phân loại một số sự vật thành nhóm theo đặc điểm chung và gỏi tên nhóm.",
    "Chỉ số 45. Xác định một sọ hình phẳng và hình khối đơn giản trong cuộc sống xung quanh.",
    "Chỉ số 42,43. Tách, gộp số lượng trong phạm vi 10; so sánh, thêm bớt số lượng trong phạm vi 10.",
    "Chỉ số 38. Nhận biết và gọi tên chữ cái trong bảng chữ cái Tiếng Việt.",
    "Chỉ số 41. Bắt chước hành vi “viết”",
    "Chỉ số 9. Thực hiện các việc tự phục vụ không cần sự giúp đỡ.",
    "Chỉ số 60. Thể hiện ý tưởng, cảm xúc của bản thân thông qua hát, vận động theo nhạc.",
    "Chỉ số 61. Tô màu kín, không chờm ra ngoài đường viền các hình có chi tiết nhỏ."
]

const scaleOptions = [
    { label: "Đạt", value: "3", color: "text-emerald-700 bg-emerald-50 border-emerald-500 hover:bg-emerald-100", activeColor: "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-200" },
    { label: "Không đạt", value: "2", color: "text-red-700 bg-red-50 border-red-500 hover:bg-red-100", activeColor: "bg-red-500 text-white border-red-600 shadow-md shadow-red-200" },
    { label: "Không làm", value: "1", color: "text-slate-600 bg-slate-50 border-slate-400 hover:bg-slate-100", activeColor: "bg-slate-500 text-white border-slate-600 shadow-md shadow-slate-200" }
]

export default function ChildDevStandardForm({ student, onSave, isLocked, onClose }: any) {
    const [scores, setScores] = useState<string[]>(Array(16).fill(""))
    const [notes, setNotes] = useState<string[]>(Array(16).fill(""))
    const [teacherSample, setTeacherSample] = useState("")
    const [studentCopy, setStudentCopy] = useState("")
    const [conclusion, setConclusion] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (student?.scores) {
            const scoreVals = student.scoreVals || [];
            const commentVals = student.commentVals || [];
            if (scoreVals.length > 0) {
                const loadedScores = Array(16).fill("");
                for (let i = 0; i < 16; i++) {
                    if (scoreVals[i]) loadedScores[i] = scoreVals[i];
                }
                setScores(loadedScores);
            }
            if (commentVals.length > 0) {
                setConclusion(commentVals[0] || "");
                setTeacherSample(commentVals[1] || "");
                setStudentCopy(commentVals[2] || "");
                if (commentVals.length > 3) {
                    const loadedNotes = Array(16).fill("");
                    for (let i = 0; i < 16; i++) {
                        if (commentVals[3 + i]) loadedNotes[i] = commentVals[3 + i];
                    }
                    setNotes(loadedNotes);
                }
            }
        }
    }, [student])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const finalScores = [...scores];
            const finalComments = [conclusion, teacherSample, studentCopy, ...notes];
            await onSave(student, finalScores, finalComments)
        } catch (e) {
            alert("Lỗi khi lưu kết quả.")
        } finally {
            setIsSaving(false)
        }
    }

    const progress = Math.round((scores.filter(s => s !== "").length / 16) * 100)
    const numDat = scores.filter(s => s === "3").length
    const numKhongDat = scores.filter(s => s === "2").length
    const numKhongLam = scores.filter(s => s === "1").length

    return (
        <div className="min-h-screen font-sans text-slate-900 flex flex-col text-xs font-semibold">
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-3 shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="font-black text-lg md:text-xl text-slate-800 flex items-center gap-2">
                        <ClipboardCheck className="text-sky-500 w-6 h-6" />
                        Phiếu Khảo sát Lớp 1
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 hidden md:block">
                        Bộ chuẩn phát triển trẹg em 5-6 tuỗi (Theo Quyết định 4222/QĄ-BGDĄT)
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tiến độ đánh giá</span>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full transition-all duration-300 text-xs font-semibold" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-sky-700">{progress}%</span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 md:px-4 md:py-2 rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                        <X className="w-5 h-5" /> <span className="hidden md:inline">Đóng</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 p-3 md:p-6 max-w-5xl mx-auto w-full space-y-6 pb-24">
                <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-100 flex flex-col sm:flex-row gap-5 items-center relative overflow-hidden">
                    <div className="w-16 h-16 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                        <User size={32} />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex justify-center sm:justify-start gap-2 items-center mb-1">
                            <span className="text-slate-500 text-xs font-medium">Mã HS: <span className="font-bold text-slate-700">{student?.studentCode}</span></span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 text-xs font-medium">Khối: <span className="font-bold text-slate-700">{student?.grade || "1"}</span></span>
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900">{student?.fullName}</h1>
                        <div className="mt-2 flex gap-3 justify-center sm:justify-start">
                            <span className="text-xs font-medium text-emerald-700 text-xs font-semibold">
                                Đạt: <strong>{numDat}</strong>
                            </span>
                            <span className="text-xs font-medium text-red-700 text-xs font-semibold">
                                Không đạt: <strong>{numKhongDat}</strong>
                            </span>
                            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                                Không làm: <strong>{numKhongLam}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs font-semibold">
                                <tr>
                                    <th className="p-2 p-2 w-12 text-center font-bold text-slate-600 uppercase text-xs border border-slate-200">STT</th>
                                    <th className="p-2 p-2 font-bold text-slate-600 uppercase text-xs min-w-[250px] border border-slate-200">Chỉ số đánh giá</th>
                                    <th className="p-2 p-2 w-64 font-bold text-center text-slate-600 uppercase text-xs border border-slate-200">Kết quả</th>
                                    <th className="p-2 p-2 w-48 font-bold text-slate-600 uppercase text-xs border border-slate-200">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {indicators.map((indicator, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className="hover:bg-sky-50/30 transition-colors text-xs font-semibold">
                                            <td className="p-2 p-2 text-center font-bold text-slate-400 align-top pt-5 border border-slate-200">{idx + 1}</td>
                                            <td className="p-2 p-2 align-top border border-slate-200">
                                                <div className="text-slate-800 font-medium leading-relaxed mb-2">
                                                    {indicator}
                                                </div>
                                                
                                                {idx === 12 && (
                                                    <div className="mt-3 p-3 w-full lg:w-3/4 text-xs font-semibold">
                                                        <table className="w-full text-sm bg-white border border-sky-200 rounded-lg overflow-hidden border-collapse">
                                                            <thead>
                                                                <tr className="bg-sky-100/50">
                                                                    <th className="px-3 py-2 text-sky-800 font-bold border-b border-r border-sky-200 w-1/2">Giáo viên viết mẫu</th>
                                                                    <th className="px-3 py-2 text-sky-800 font-bold border-b border-sky-200 w-1/2">Thí sinh viết theo</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    <td className="p-0 border-r border-sky-200">
                                                                        <textarea 
                                                                            value={teacherSample}
                                                                            onChange={(e) => setTeacherSample(e.target.value)}
                                                                            disabled={isLocked}
                                                                            className="w-full p-2 h-16 resize-none outline-none focus:bg-sky-50 transition-colors text-slate-700 text-xs font-semibold"
                                                                            placeholder="Nhập nội dung mẫu..."
                                                                        />
                                                                    </td>
                                                                    <td className="p-2 border border-slate-200">
                                                                        <textarea 
                                                                            value={studentCopy}
                                                                            onChange={(e) => setStudentCopy(e.target.value)}
                                                                            disabled={isLocked}
                                                                            className="w-full p-2 h-16 resize-none outline-none focus:bg-sky-50 transition-colors text-slate-700 text-xs font-semibold"
                                                                            placeholder="Nhận xét chữ viết..."
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                                
                                                {
                                                idx === 15 && (
                                                    <div className="mt-3 flex flex-col gap-2 p-3 w-full lg:w-2/3 text-xs font-semibold">
                                                        <span className="font-bold text-slate-600 text-xs uppercase tracking-wider">Sản phẩm:</span>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-24 h-24 bg-white border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24." stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 text-xs text-slate-500 italic">
                                                                * Đính kèm hình ảnh/sản phẩm bông hoa đã tô màu của học sinh (Nếu có trên giấy).
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                                }
                                            </td>
                                            <td className="p-2 p-2 align-top pt-4 border border-slate-200">
                                                <div className="flex flex-col gap-2">
                                                    {scaleOptions.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            disabled={isLocked}
                                                            onClick={() => {
                                                                const newScores = [...scores];
                                                                newScores[idx] = opt.value;
                                                                setScores(newScores);
                                                            }}
                                                            className={`py-1.5 px-3 text-xs font-bold rounded-lg border transition-all text-center w-full ${
                                                                scores[idx] === opt.value
                                                                    ? opt.activeColor
                                                                    : `bg-white ${opt.color}`
                                                            }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-2 p-2 align-top pt-4 border border-slate-200">
                                                <textarea
                                                    value={notes[idx] || ""}
                                                    onChange={(e) => {
                                                        const newNotes = [...notes];
                                                        newNotes[idx] = e.target.value;
                                                        setNotes(newNotes);
                                                    }}
                                                    disabled={isLocked}
                                                    className="w-full p-2 h-[100px] text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-white transition-all resize-none placeholder-slate-400 text-xs font-semibold"
                                                    placeholder="Ghi chú thêm..."
                                                />
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            }
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-100">
                    <h3 className="font-bold text-slate-800 text-sm mb-3 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-6 inline-block text-xs font-semibold"></span>
                        Nhận xét chung
                    </h3>
                    <textarea
                        value={conclusion}
                        onChange={(e) => setConclusion(e.target.value)}
                        disabled={isLocked}
                        className="w-full p-4 h-32 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white transition-all resize-none placeholder-slate-400 text-xs font-semibold"
                        placeholder="Nhập nhận xét tổng quát về học sinh..."
                    />
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <AlertCircle className="w-5 h-5 text-sky-500" />
                        <span className="hidden sm:inline">Kiểm tra thông tin trước khi lưu. Form tự động cập nhật tiến độ.</span>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLocked}
                        className="flex items-center gap-2 px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow-md shadow-sky-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {isLocked ? "Form đã khóa" : "Lưu Kẽt Quả"}
                    </button>
                </div>
            </div>
        </div>
    )
}
