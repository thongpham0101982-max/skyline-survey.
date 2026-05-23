const fs = require('fs');

// 1. Update API
let apiC = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');
apiC = apiC.replace(/campus: true,/, 'campus: true,\n        assignments: { select: { unlockRequestStatus: true } },');
fs.writeFileSync('src/app/api/input-assessments/route.ts', apiC, 'utf8');

// 2. Update Client UI
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

const injection = `
    const pendingCount = p.assignments?.filter((a: any) => a.unlockRequestStatus === 'PENDING').length || 0;
    return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
               {pendingCount > 0 && (
                   <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex justify-between items-center cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => { setActiveTab('assignments'); setAssignPeriodId(p.id); }}>
                       <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                           <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>
                           Có {pendingCount} yêu cầu xin Mở khóa điểm đang chờ duyệt!
                       </div>
                       <button className="text-xs font-semibold px-3 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg shadow-sm hover:bg-amber-50">Xem & Duyệt ngay →</button>
                   </div>
               )}
              <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center">
`;

c = c.replace(/<div key=\{p\.id\} className="bg-white rounded-xl shadow-sm border overflow-hidden">\s*<div className="p-5 border-b bg-slate-50\/50 flex justify-between items-center">/, injection);
fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');

console.log('Notice added');
