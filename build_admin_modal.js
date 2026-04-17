const fs = require('fs');

let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// 1. Add state for the review modal
c = c.replace(/const \[isAssignTeacherModalOpen, setIsAssignTeacherModalOpen\] = useState\(false\);/,
  "const [isAssignTeacherModalOpen, setIsAssignTeacherModalOpen] = useState(false);\n  const [reviewUnlockPeriod, setReviewUnlockPeriod] = useState<any>(null);");

// 2. Change the yellow banner's onClick to open the modal
c = c.replace(/onClick=\{.. \=\> \{ setActiveTab\('assignments'\); setAssignPeriodId\(p.id\); \}\}/, 
  "onClick={() => setReviewUnlockPeriod(p)}");

// 3. Add the Modal JSX at the end of the file
const modalJSX = `
      {/* Review Unlock Request Modal */}
      {reviewUnlockPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-amber-50">
              <h3 className="font-bold text-amber-900 text-lg flex items-center gap-2">
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>
                Xét duyệt Yêu cầu Mở Khóa Điểm
              </h3>
              <button onClick={() => setReviewUnlockPeriod(null)} className="text-amber-500 hover:text-amber-700 hover:bg-amber-100 p-1.5 rounded-lg"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {reviewUnlockPeriod.InputAssessmentTeacherAssignment?.filter((a:any) => a.unlockRequestStatus === 'PENDING').map((a:any) => (
                <div key={a.id} className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 text-base">{a.user?.fullName || "Giáo viên ẩn danh"}</div>
                      <div className="mt-2 text-sm text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100/50">
                        <span className="font-semibold text-amber-800">Lý do xin mở:</span> {a.unlockReason || "Không có lý do cụ thể."}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <button onClick={async () => {
                      const res = await fetch("/api/input-assessment-assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "RESOLVE_UNLOCK", id: a.id, status: "APPROVED" }) });
                      if(res.ok) { alert("Đã mở khóa thành công!"); setReviewUnlockPeriod(null); window.location.reload(); }
                    }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg text-sm shadow-sm transition-colors">Đồng ý Mở khóa</button>
                    <button onClick={async () => {
                      const res = await fetch("/api/input-assessment-assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "RESOLVE_UNLOCK", id: a.id, status: "REJECTED" }) });
                      if(res.ok) { alert("Đã từ chối thành công."); setReviewUnlockPeriod(null); window.location.reload(); }
                    }} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-2 rounded-lg text-sm shadow-sm transition-colors">Từ chối</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end">
              <button onClick={() => setReviewUnlockPeriod(null)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg text-sm">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
`;

c = c.replace(/    <\/div>\n  \)\n\}\n$/, modalJSX);
fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Done building modal');
