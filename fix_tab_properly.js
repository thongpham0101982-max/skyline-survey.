const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// 1. Add "reports" to activeTab states.
c = c.replace(/useState<"periods"\|"categories"\|"subjects"\|"mapping"\|"students"\|"assignments">/, 'useState<"periods"|"categories"|"subjects"|"mapping"|"students"|"assignments"|"reports">');

// 2. Add to Tab Array
c = c.replace(/\{key:"assignments",label:"Phân công GV",icon:UserCheck\}/, '{key:"assignments",label:"Phân công GV",icon:UserCheck},{key:"reports",label:"Tổng hợp KQ",icon:BarChart}');

// 3. Add BarChart to valid icons from lucide-react
if (!c.includes('BarChart')) {
    c = c.replace(/import \{ Plus, Pencil, UserCheck, /, 'import { BarChart, Plus, Pencil, UserCheck, ');
}

// 4. Add the Tab Component Area
const tabArea = `
      {/* TAB: TỔNG HỢP KẾT QUẢ */}
      {activeTab === "reports" && (
        <div className="space-y-5">
            <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                <span className="font-semibold text-slate-800 text-sm">Kỳ KS:</span>
                <select className="border rounded-lg px-3 py-1.5 outline-none text-sm font-medium bg-slate-50 min-w-[200px]" onChange={async (e) => {
                    const periodId = e.target.value;
                    if (!periodId) return setViewResultsData(null);
                    setViewResultsData({ loading: true });
                    try {
                        const res = await fetch(\`/api/teacher-assessments?action=getReport&periodId=\${periodId}\`);
                        const students = await res.json();
                        setViewResultsData({ loading: false, students });
                    } catch(err) {
                        setViewResultsData({ loading: false, students: [] });
                    }
                }}>
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={() => {
                        const wb = XLSX.utils.book_new();
                        const ws = XLSX.utils.json_to_sheet((viewResultsData?.students || []).map((s:any, i:number) => {
                            const row: any = { "STT": i+1, "Họ và tên": s.fullName, "Ngày sinh": s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : '', "Khối KS": s.grade, "Hệ": s.surveySystem };
                            s.scores.forEach((sc:any) => {
                                let scoresArr = [];
                                try { scoresArr = JSON.parse(sc.scores) } catch(e){}
                                row[sc.subject?.name || 'Môn'] = scoresArr[0] || '';
                            });
                            return row;
                        }));
                        XLSX.utils.book_append_sheet(wb, ws, "Tong_Hop_KQ");
                        XLSX.writeFile(wb, "Tong_Hop_Ket_Qua_KS.xlsx");
                    }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm transition-colors">
                    <Download className="w-4 h-4"/> Xuất Excel
                </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {!viewResultsData ? (
                    <div className="p-8 text-center text-slate-400">Vui lòng chọn Kỳ Khảo sát để xem dữ liệu.</div>
                ) : viewResultsData.loading ? (
                    <div className="p-8 text-center text-slate-400">Đang tải dữ liệu báo cáo...</div>
                ) : viewResultsData.students?.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Không có dữ liệu học sinh trong Kỳ này.</div>
                ) : (
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 shadow-sm whitespace-nowrap">
                                <tr>
                                    <th className="px-4 py-3 border-b border-r text-center">STT</th>
                                    <th className="px-4 py-3 border-b border-r">Họ và tên</th>
                                    <th className="px-4 py-3 border-b border-r text-center">Ngày sinh</th>
                                    <th className="px-4 py-3 border-b border-r text-center">Khối</th>
                                    <th className="px-4 py-3 border-b border-r text-center">Hệ</th>
                                    {Array.from(new Set(viewResultsData.students.flatMap((s:any) => s.scores.map((sc:any) => sc.subject?.name)))).filter(Boolean).map((subj:any) => (
                                        <th key={subj} className="px-4 py-3 border-b border-r text-center bg-indigo-50 text-indigo-700">{subj}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {viewResultsData.students.map((s:any, i:number) => {
                                    const allUniqueSubjects = Array.from(new Set(viewResultsData.students.flatMap((st:any) => st.scores.map((sc:any) => sc.subject?.name)))).filter(Boolean);
                                    return (
                                    <tr key={s.id} className="border-b hover:bg-slate-50 transition-colors whitespace-nowrap">
                                        <td className="px-4 py-2 border-r text-center text-slate-500">{i+1}</td>
                                        <td className="px-4 py-2 border-r font-medium text-slate-800">{s.fullName}</td>
                                        <td className="px-4 py-2 border-r text-center text-slate-600">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : ''}</td>
                                        <td className="px-4 py-2 border-r text-center text-slate-600 font-bold">K{s.grade}</td>
                                        <td className="px-4 py-2 border-r text-center text-slate-600">{s.surveySystem}</td>
                                        {allUniqueSubjects.map((subj:any) => {
                                            const sc = s.scores.find((x:any) => x.subject?.name === subj);
                                            let scoreStr = '-';
                                            if (sc && sc.scores) {
                                                try {
                                                    const scoresArr = JSON.parse(sc.scores);
                                                    scoreStr = scoresArr[0] || '-';
                                                } catch(e) {}
                                            }
                                            return <td key={subj} className="px-4 py-2 border-r text-center font-bold text-sky-700 bg-slate-50/50">{scoreStr}</td>
                                        })}
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      )}`;

// We can just append it before the final </div>
const pos = c.lastIndexOf('</div>');
if (pos > -1) {
    c = c.substring(0, pos) + tabArea + c.substring(pos);
}

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed exactly!');
