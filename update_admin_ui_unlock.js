const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

if (!c.includes('resolveUnlockRequest')) {
// 1. Add api call function
const resolveFunction = `
  const resolveUnlockRequest = async (assignmentId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!confirm(\`Bạn có chắc muốn \${status === 'APPROVED' ? 'ĐỒNG Ý' : 'TỪ CHỐI'} yêu cầu này?\`)) return;
    const r = await fetch("/api/input-assessment-assignments", { 
        method: "PUT", headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ action: "RESOLVE_UNLOCK", id: assignmentId, status }) 
    });
    if (r.ok) {
        fetchAssignments();
    } else {
        alert("Lỗi server");
    }
  };
  const handleAssignSubmit = `;

c = c.replace(/const handleAssignSubmit = /, resolveFunction);

// 2. Add header
c = c.replace(/<th className="py-3 px-4 text-left">Hệ học<\/th>/, '<th className="py-3 px-4 text-left">Hệ học</th>\n                        <th className="py-3 px-4 text-left">Yêu cầu Mở form</th>');

// 3. Map aggregation
c = c.replace(/entry\.edusSet\.add\(a\.educationSystem\);/, 
  "entry.edusSet.add(a.educationSystem);\n                            if (a.unlockRequestStatus === 'PENDING') { entry.pendingRequests = entry.pendingRequests || []; entry.pendingRequests.push({ id: a.id, reason: a.unlockReason || 'Không có lý do' }); }");

c = c.replace(/map\.set\(key, \{ \.\.\.a, subjectNames:/,
  "map.set(key, { ...a, pendingRequests: a.unlockRequestStatus === 'PENDING' ? [{ id: a.id, reason: a.unlockReason || 'Không có lý do' }] : [], subjectNames:");


// 4. Render Table Data
const tdInjection = `
                           <td className="py-3 px-4">
                                {Array.from(g.edusSet).map((es:any) => <span key={es} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border text-xs mr-1">{es}</span>)}
                           </td>
                           <td className="py-3 px-4">
                                {g.pendingRequests && g.pendingRequests.length > 0 ? (
                                    <div className="flex flex-col gap-2 bg-red-50 p-2 rounded-lg border border-red-200 shadow-inner">
                                        <div className="text-xs font-bold text-red-700">🛑 GV báo lỗi / Xin mở:</div>
                                        <div className="text-xs text-red-600 bg-white p-2 rounded border border-red-100 italic">{g.pendingRequests[0].reason}</div>
                                        <div className="flex gap-1.5 mt-1">
                                            <button onClick={() => resolveUnlockRequest(g.pendingRequests[0].id, 'APPROVED')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1 rounded">Chấp nhận</button>
                                            <button onClick={() => resolveUnlockRequest(g.pendingRequests[0].id, 'REJECTED')} className="flex-1 bg-slate-500 hover:bg-slate-600 text-white text-[10px] font-bold py-1 rounded">Từ chối</button>
                                        </div>
                                        {g.pendingRequests.length > 1 && <div className="text-[10px] text-slate-500 mt-1">Và {g.pendingRequests.length - 1} y/c khác...</div>}
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Không có</span>
                                )}
                           </td>
`;

c = c.replace(/<td className="py-3 px-4">\s*\{Array\.from\(g\.edusSet\)\.map.*<\/span>\)\}\s*<\/td>/s, tdInjection);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
}
console.log('Admin Approval logic built');
