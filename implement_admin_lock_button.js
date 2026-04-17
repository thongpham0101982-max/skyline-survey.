const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

if (!c.includes('togglePeriodStatus')) {
    // 1. Add Lock, Unlock to lucide-react imports
    c = c.replace(/Download \} from "lucide-react"/, 'Download, Lock, Unlock } from "lucide-react"');

    // 2. Inject togglePeriodStatus function somewhere safe (e.g. before deletePeriod)
    const toggleFunc = `
  const togglePeriodStatus = async (p: any) => {
    const newStatus = p.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    if (!confirm(\`Bạn có chắc muốn \${newStatus === 'ACTIVE' ? 'MỞ KHÓA' : 'KHÓA'} đợt này?\`)) return;
    const payload = { 
       action: "UPDATE_PERIOD",
       id: p.id,
       data: {
         ...p,
         startDate: p.startDate,
         endDate: p.endDate,
         status: newStatus
       }
    };
    const r = await fetch("/api/input-assessments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) fetchPeriods();
    else alert((await r.json()).error || "Đã xảy ra lỗi");
  };
  const deletePeriod`;
    c = c.replace(/const deletePeriod/, toggleFunc);

    // 3. Inject the Lock/Unlock badge right next to the current campusName display, and the toggle button next to Sửa button.
    const regexHeader = /<span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2\.5 py-0\.5 rounded ml-2">\{p\.campus\?\.campusName\|\|'Tất cả CS'\}<\/span><\/h3>/;
    c = c.replace(regexHeader, `<span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded ml-2">{p.campus?.campusName||'Tất cả CS'}</span>{p.status !== 'ACTIVE' && <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded ml-2 flex items-center gap-1 inline-flex"><Lock className="w-3 h-3"/> KHÓA ĐIỂM</span>}</h3>`);

    const regexButtons = /<button onClick=\{\(\)=>deletePeriod\(p\.id\)\}/;
    const buttonsFix = `
    <button onClick={() => togglePeriodStatus(p)} className={\`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 shadow-sm border transition-colors \${p.status === 'ACTIVE' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 hover:text-amber-700' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}\`}>
        {p.status === 'ACTIVE' ? <><Lock className="w-3.5 h-3.5"/> Khóa điểm</> : <><Unlock className="w-3.5 h-3.5"/> Mở khóa</>}
    </button>
    <button onClick={()=>deletePeriod(p.id)}`.trim();
    c = c.replace(regexButtons, buttonsFix);

    fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
}
console.log('Admin UI locked configured');
