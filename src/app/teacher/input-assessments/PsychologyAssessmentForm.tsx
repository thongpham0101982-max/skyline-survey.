"use client"

import React, { useState, useEffect } from "react"
import { ClipboardCheck, Sparkles, Save, Info, BrainCircuit, User, MessageSquare, AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react"

interface Question {
    text: string
    options: string[]
}

interface Section {
    title: string
    questions: Question[]
}

interface QuestionsData {
    [key: string]: Section[]
}


const scaleOptions = ["0", "1", "2", "3", "4"]

const grades2to5Questions = [
    {
        title: "I. Cảm xúc & điều hòa cảm xúc (4 mục)",
        questions: [
            { text: "1. Khi bị điểm kém hoặc bị giáo viên nhắc nhở, con thường phản ứng như thế nào?", options: scaleOptions },
            { text: "2. Khi con và bạn có chuyện không vui (tranh giành đồ chơi, xích mích), con thường xử lý như thế nào?", options: scaleOptions },
            { text: "3. Khi bị từ chối hoặc không được chọn trong trò chơi, con cảm thấy thế nào?", options: scaleOptions },
            { text: "4. Trước giờ kiểm tra hoặc khi gặp một việc khó khăn, cảm xúc của con thường thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "II. Hành vi & tự kiểm soát (3 mục)",
        questions: [
            { text: "5. Khi cô dặn phải ngồi yên hoặc chờ đến lượt, con làm thế nào?", options: scaleOptions },
            { text: "6. Trong lớp, khi nhiều điều khiển con chú ý, con thường phản ứng thế nào?", options: scaleOptions },
            { text: "7. Khi con cảm thấy bực hoặc tức giận, con thường làm gì để bình tĩnh lại?", options: scaleOptions }
        ]
    },
    {
        title: "III. Giao tiếp & tương tác xã hội (3 mục)",
        questions: [
            { text: "8. Khi gặp bạn mới, con làm gì để làm quen?", options: scaleOptions },
            { text: "9. Khi chơi cùng bạn, con thường chia sẻ hoặc hợp tác như thế nào?", options: scaleOptions },
            { text: "10. Khi con bị bạn trêu chọc hoặc bị hiểu lầm, con sẽ làm gì?", options: scaleOptions }
        ]
    },
    {
        title: "IV. Chú ý & kỹ năng học tập nền (4 mục)",
        questions: [
            { text: "11. Khi cô hướng dẫn nhiều bước, con thường ghi nhớ và làm như thế nào?", options: scaleOptions },
            { text: "12. Khi nghe cô kể chuyện hoặc giảng bài, con nhớ lại điều gì sau đó?", options: scaleOptions },
            { text: "13. Khi làm bài tập, con bắt đầu và hoàn thành như thế nào?", options: scaleOptions },
            { text: "14. Khi trong lớp có tiếng ồn hoặc người khác làm việc, con phản ứng thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "V. Ngôn ngữ - tư duy - giải quyết vấn đề (3 mục)",
        questions: [
            { text: "15. Khi nhìn thấy các đồ vật học tập, con nghĩ mỗi món dùng để làm gì?", options: scaleOptions },
            { text: "16. Khi gặp tình huống thực tế (ví dụ: làm rơi đồ, bị bạn hiểu lầm), con thường làm gì?", options: scaleOptions },
            { text: "17. Khi xảy ra việc bất ngờ, con nghĩ ra cách giải quyết như thế nào?", options: scaleOptions }
        ]
    },
    {
        title: "VI. Động lực học tập & thái độ trường học (3 mục)",
        questions: [
            { text: "18. Khi đến trường, điều gì khiến con cảm thấy vui nhất?", options: scaleOptions },
            { text: "19. Khi cô giao bài, con thường bắt đầu như thế nào?", options: scaleOptions },
            { text: "20. Khi con gặp bài khó, con làm gì để vượt qua?", options: scaleOptions }
        ]
    }
]

const questionsData: QuestionsData = {
    "1": [
        {
            title: "CẢM XÚC VÀ ĐIỀU HÒA CẢM XÚC",
            questions: [
                { text: "Khả năng nhận diện và gọi tên các cảm xúc cơ bản của bản thân.", options: ["Hiếm khi", "Đôi khi", "Thường xuyên"] },
                { text: "Thể hiện cảm xúc phù hợp với hoàn cảnh.", options: ["Cần nhắc nhở nhiều", "Cần nhắc nhở ít", "Tự giác thực hiện"] },
                { text: "Khả năng kiềm chế cơn giận hoặc sự thất vọng.", options: ["Dễ bùng nổ", "Đôi khi mất kiểm soát", "Kiểm soát tốt"] },
                { text: "Sự tự tin khi trình bày ý kiến trước lớp.", options: ["Rất rụt rè", "Cần động viên", "Tự tin"] }
            ]
        },
        {
            title: "HÀNH VI - KIỂM SOÁT BẢN THÂN",
            questions: [
                { text: "Tuân thủ các quy tắc trong lớp học.", options: ["Hay vi phạm", "Đôi khi nhắc nhở", "Chấp hành tốt"] },
                { text: "Khả năng chờ đợi đến lượt mình.", options: ["Rất thiếu kiên nhẫn", "Cần nhắc nhở", "Kiên nhẫn chờ"] },
                { text: "Thực hiện các nhiệm vụ cá nhân (chuẩn bị đồ dùng, dọn dẹp).", options: ["Cần hỗ trợ nhiều", "Đôi khi cần nhắc", "Chủ động thực hiện"] }
            ]
        },
        {
            title: "QUAN HỆ XÃ HỘI & TƯƠNG TÁC NHÓM",
            questions: [
                { text: "Khả năng kết bạn và làm quen với bạn mới.", options: ["Khép kín", "Cần thời gian", "Cởi mở, thân thiện"] },
                { text: "Chia sẻ đồ dùng, đồ chơi với bạn bè.", options: ["Ít chia sẻ", "Đôi khi chia sẻ", "Luôn sẵn lòng"] },
                { text: "Hợp tác trong các hoạt động nhóm.", options: ["Thường làm việc riêng", "Mức độ trung bình", "Hợp tác tích cực"] }
            ]
        },
        {
            title: "HỌC TẬP & KHẢ NĂNG TỰ ĐỊNH HƯỚNG/ CHÚ Ý",
            questions: [
                { text: "Mức độ tập trung trong giờ học (15-20 phút).", options: ["Hay xao nhãng", "Cần nhắc nhở", "Tập trung tốt"] },
                { text: "Lắng nghe và thực hiện theo hướng dẫn của giáo viên.", options: ["Hay quên lệnh", "Cần nhắc lại", "Thực hiện nhanh"] },
                { text: "Khả năng hoàn thành bài tập đúng hạn.", options: ["Thường xuyên trễ", "Xong nhưng cần nhắc", "Luôn đúng hạn"] },
                { text: "Sự tò mò, ham học hỏi kiến thức mới.", options: ["Thụ động", "Bình thường", "Rất ham học hỏi"] }
            ]
        },
        {
            title: "TỰ NHẬN THỨC & NGÔN NGỮ - GIẢI QUYẾT VẤN ĐỀ",
            questions: [
                { text: "Khả năng dùng ngôn ngữ để diễn đạt nhu cầu bản thân.", options: ["Hạn chế", "Đủ dùng", "Linh hoạt, rõ ràng"] },
                { text: "Sử dụng các từ ngữ lịch sự (cảm ơn, xin lỗi).", options: ["Cần nhắc nhở", "Đôi khi quên", "Đã thành thói quen"] },
                { text: "Biết tìm sự giúp đỡ từ người lớn khi gặp khó khăn.", options: ["Im lặng/Khóc", "Cần nhắc", "Chủ động hỏi"] }
            ]
        },
        {
            title: "ĐỘNG LỰC & ĐỊNH HƯỚNG TƯƠNG LAI",
            questions: [
                { text: "Hào hứng khi đến trường.", options: ["Sợ hãi/Khóc", "Bình thường", "Rất hào hứng"] },
                { text: "Thể hiện sở thích cá nhân rõ rệt.", options: ["Chưa rõ", "Bắt đầu bộc lộ", "Rất rõ ràng"] },
                { text: "Có ý thức giữ gìn sách vở, đồ dùng học tập.", options: ["Hay làm mất/hỏng", "Đôi khi nhắc nhở", "Gìn giữ cẩn thận"] }
            ]
        }
    ],
    "2": grades2to5Questions,
    "3": grades2to5Questions,
    "4": grades2to5Questions,
    "5": grades2to5Questions
}

const defaultQuestions = [
    {
        title: "TỔNG QUAN TÂM LÝ & HÀNH VI (Dành cho mọi khối lớp)",
        questions: [
            { text: "Tinh thần thái độ khi bắt đầu khảo sát.", options: ["Rụt rè", "Bình thường", "Rất hào hứng"] },
            { text: "Mức độ tập trung trong suốt quá trình.", options: ["Dễ sao nhãng", "Tập trung trung bình", "Rất tập trung"] },
            { text: "Khả năng tương tác với giáo viên khảo sát.", options: ["Hạn chế", "Tạm được", "Linh hoạt, cởi mở"] },
            { text: "Sự tự lập khi thực hiện nhiệm vụ.", options: ["Cần nhắc nhở nhiều", "Cần nhắc nhở ít", "Hoàn toàn tự lập"] },
            { text: "Khả năng kiểm soát cảm xúc khi gặp thử thách.", options: ["Dễ nản chí", "Cần động viên", "Kiên trì nỗ lực"] }
        ]
    }
]

export default function PsychologyAssessmentForm({ student, onSave, isLocked }: any) {
    const rawGrade = student?.grade || ""
    const currentGrade = ["1", "2", "3", "4", "5"].includes(rawGrade) ? rawGrade : "default"
    const sections = questionsData[currentGrade] || defaultQuestions
    const isGrades2to5 = ["2", "3", "4", "5"].includes(currentGrade)

    const [scores, setScores] = useState<number[]>(Array(20).fill(-1))
    const [notes, setNotes] = useState<string[]>(Array(20).fill(""))
    const [conclusion, setConclusion] = useState("")
    const [recommendation, setRecommendation] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [activeSection, setActiveSection] = useState(0)

    useEffect(() => {
        const scoreData = student?.scores?.find((sc: any) => sc.subject?.code === 'TLY')
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

    const currentQuestions = sections[activeSection].questions
    let currentOffset = 0
    for (let i = 0; i < activeSection; i++) {
        currentOffset += sections[i].questions.length
    }

    const progress = Math.round((scores.filter(s => s >= 0).length / 20) * 100)

    return (
        <div className="bg-slate-50 min-h-screen p-3 md:p-6 font-sans text-slate-900 border-x">
            <div className="max-w-5xl mx-auto space-y-4">
                {/* Header Profile Section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-5 items-center relative overflow-hidden">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                        <User size={32} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex justify-center md:justify-start gap-2 items-center mb-1">
                            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded text-xs font-bold border border-indigo-200">Khối {rawGrade || "N/A"}</span>
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

                
                {isGrades2to5 && (
                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 shadow-sm text-sm">
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 overflow-x-auto custom-scrollbar flex gap-2">
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <ChevronRight size={16} className="text-indigo-500" />
                            {sections[activeSection].title}
                        </h2>
                        <div className="bg-indigo-100 px-3 py-1 rounded-md text-[11px] font-bold text-indigo-700">
                            Điểm phần này: {calculateSectionScore(activeSection)}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        {currentQuestions.map((q, qIdx) => {
                            const actualIdx = currentOffset + qIdx
                            return (
                                <div key={qIdx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-center p-4 md:p-5 border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                    <div className="lg:col-span-5 xl:col-span-6 flex items-start gap-3">
                                        <span className="text-slate-400 font-bold text-sm w-5 shrink-0 mt-0.5">{actualIdx + 1}.</span>
                                        <span className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">{q.text}</span>
                                    </div>
                                    <div className={`lg:col-span-7 xl:col-span-6 flex ${isGrades2to5 ? "gap-6 justify-start mt-2 lg:mt-0" : "gap-2"} w-full ml-8 lg:ml-0`}>
                                        {q.options.map((opt, oIdx) => {
                                            const optValue = q.options.length === 5 ? oIdx : oIdx + 1;
                                            return isGrades2to5 ? (
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
                                    {isGrades2to5 && (
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

                {isGrades2to5 && (
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 text-base mb-4">TỔNG HỢP:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-8 mb-4 text-sm font-medium text-slate-700">
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục I :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(0)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục III :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(2)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục V :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(4)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục II :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(1)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục IV :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(3)}</span></div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1"><span>Mục VI :</span> <span className="font-bold text-indigo-600">{calculateSectionScore(5)}</span></div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <span className="font-bold text-slate-800 text-sm">Tổng điểm:</span>
                            <span className="font-black text-indigo-600 border-b border-slate-400 min-w-[60px] inline-block text-center text-lg">{totalScore}</span>
                        </div>
                    </div>
                )}

                {/* Conclusion and Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="text-amber-500" />
                            <h3 className="font-bold text-slate-800 text-sm">{isGrades2to5 ? "C. KẾT LUẬN SƠ BỘ:" : "Kết luận chuyên môn"}</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={conclusion}
                            onChange={(e) => setConclusion(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-50 outline-none transition-all text-sm text-slate-700 resize-y"
                            placeholder="Nhận định tổng quát..."
                        ></textarea>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={18} className="text-emerald-500" />
                            <h3 className="font-bold text-slate-800 text-sm">{isGrades2to5 ? "D. KHUYẾN NGHỊ DÀNH CHO PHỤ HUYNH (NẾU CÓ):" : "Kiến nghị hỗ trợ"}</h3>
                        </div>
                        <textarea
                            disabled={isLocked}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            className="flex-1 w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 outline-none transition-all text-sm text-slate-700 resize-y"
                            placeholder="Gợi ý can thiệp, hỗ trợ..."
                        ></textarea>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 sticky bottom-4 z-10">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <AlertCircle size={14} className="text-indigo-500" />
                        Lưu ý kiểm tra kỹ trước khi Xác nhận
                    </div>
                    
                    {progress === 100 && !isLocked && (
                        <div className="hidden md:flex text-emerald-600 text-xs font-bold items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 size={14} /> Hoàn tất đánh giá
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving || isLocked}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Save size={16} />
                        )}
                        {isLocked ? "Form đã khóa" : "Lưu Kết Quả"}
                    </button>
                </div>
            </div>
        </div>
    )
}
