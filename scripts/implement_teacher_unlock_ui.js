const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

if (!c.includes('isUnlockRequestOpen')) {
    // 1. Add states
    c = c.replace(/const \[isLocked, setIsLocked\] = useState\(false\);/, 'const [isLocked, setIsLocked] = useState(false);\n  const [isUnlockRequestOpen, setIsUnlockRequestOpen] = useState(false);\n  const [unlockReason, setUnlockReason] = useState("");');

    // Add submit function
    const funcStr = `
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
    `;
    c = c.replace(/const handleScoreChange/, funcStr + "\n  const handleScoreChange");

    // Modify isLocked logic
    c = c.replace(/const isLocked = currentAssignment\?\.period\?\.status !== 'ACTIVE';/, "const isLocked = currentAssignment?.period?.status !== 'ACTIVE' && currentAssignment?.unlockRequestStatus !== 'APPROVED';");

    // Add buttons inside the Locked Banner
    const unlockUIInfo = `
                                </p>
                                {currentAssignment.unlockRequestStatus === 'REJECTED' && (
                                    <div className="mt-3 bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg font-medium inline-block shadow-sm">
                                        ❌ Admin đã từ chối yêu cầu mở khóa của bạn.
                                    </div>
                                )}
                                {currentAssignment.unlockRequestStatus === 'PENDING' ? (
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm inline-flex items-center gap-2">
                                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                            Yêu cầu Mở khóa đang chờ Admin duyệt...
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <button onClick={() => setIsUnlockRequestOpen(true)} className="bg-red-600 hover:bg-red-700 text-white shadow-md text-sm font-bold px-4 py-2.5 rounded-xl transition-all">Gửi Yêu cầu Cấp quyền Nhập Điểm</button>
                                    </div>
                                )}
    `;

    c = c.replace(/<\/p>\s*<\/div>\s*<\/div>\s*<\/div>/, unlockUIInfo + "</div>\n                        </div>\n                    </div>");

    // Add the Unlock Request Modal
    c = c.replace(/\{\/\* COLUMN CONFIG MODAL \*\/\}/, `
      {isUnlockRequestOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">Yêu cầu Mở khóa Form</h3>
              <button onClick={() => setIsUnlockRequestOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
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
    {/* COLUMN CONFIG MODAL */}`);

    fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
}
console.log('Teacher Unlock Request UI integrated');
