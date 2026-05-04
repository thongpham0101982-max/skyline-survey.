import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, BrainCircuit } from "lucide-react";

interface ThinkingSkillsFormProps {
    student: any;
    onClose: () => void;
    onSave: (student: any, scores: string[], comments: string[]) => Promise<void>;
}

export default function ThinkingSkillsForm({ student, onClose, onSave }: ThinkingSkillsFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    
    // States for the 5 criteria
    const [logic, setLogic] = useState("");
    const [lienTuong, setLienTuong] = useState("");
    const [phanBien, setPhanBien] = useState("");
    const [giaiQuyet, setGiaiQuyet] = useState("");
    const [percent, setPercent] = useState("");

    const isLocked = false; // Add actual lock logic if needed

    useEffect(() => {
        if (student && student.scoreVals) {
            setLogic(student.scoreVals[0] || "");
            setLienTuong(student.scoreVals[1] || "");
            setPhanBien(student.scoreVals[2] || "");
            setGiaiQuyet(student.scoreVals[3] || "");
            setPercent(student.scoreVals[4] || "");
        }
    }, [student]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const finalScores = [logic, lienTuong, phanBien, giaiQuyet, percent];
            await onSave(student, finalScores, []);
            onClose();
        } catch (e) {
            alert("Lỗi khi lưu kết quả.");
        } finally {
            setIsSaving(false);
        }
    };

    const criteria = [
        { id: "logic", label: "Khả năng suy luận logic", value: logic, setter: setLogic },
        { id: "lienTuong", label: "Khả năng liên tưởng", value: lienTuong, setter: setLienTuong },
        { id: "phanBien", label: "Kĩ năng phản biện", value: phanBien, setter: setPhanBien },
        { id: "giaiQuyet", label: "Khả năng giải quyết vấn đề", value: giaiQuyet, setter: setGiaiQuyet },
    ];

    const options = ["A", "B", "C", "D"];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <BrainCircuit className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black mb-1">Đánh giá Năng lực tư duy</h2>
                            <p className="text-indigo-100 text-sm font-medium">Học sinh: {student?.fullName} - Lớp: Khối {student?.grade}</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50">
                    <div className="space-y-6 max-w-lg mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        
                        {criteria.map((item, idx) => (
                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <label className="text-sm font-bold text-slate-700">- {item.label}</label>
                                <div className="flex gap-2">
                                    {options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => item.setter(opt)}
                                            disabled={isLocked}
                                            className={`w-10 h-10 rounded-xl font-bold transition-all border-2 flex items-center justify-center \${
                                                item.value === opt 
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 scale-105" 
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="pt-4 mt-2 border-t-2 border-dashed border-slate-200">
                            <label className="block text-sm font-bold text-slate-700 mb-3">Mức độ hoàn thành các thử thách của giáo viên đặt ra (%)</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={percent}
                                    onChange={(e) => setPercent(e.target.value)}
                                    disabled={isLocked}
                                    className="w-full text-center text-xl font-black text-indigo-700 p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all bg-slate-50 focus:bg-white"
                                    placeholder="Ví dụ: 95"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">%</div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium px-2">
                        <AlertCircle className="w-4 h-4 text-indigo-500" />
                        <span>Hãy kiểm tra kỹ thông tin trước khi lưu.</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors text-sm">Hủy bỏ</button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLocked}
                            className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50 text-sm"
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                            Lưu Kết Quả
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
