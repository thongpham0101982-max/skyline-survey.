const fs = require('fs');

let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// 1. Add states
c = c.replace(/const \[reviewUnlockPeriod, setReviewUnlockPeriod\] = useState<any>\(null\);/, 
  "const [viewResultsGroup, setViewResultsGroup] = useState<any>(null);\n  const [viewResultsData, setViewResultsData] = useState<any>(null);\n  const [isFetchingResults, setIsFetchingResults] = useState(false);\n  const [reviewUnlockPeriod, setReviewUnlockPeriod] = useState<any>(null);");

// 2. Add the Eye button to the actions column
c = c.replace(/className="p-1\.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3\.5 h-3\.5"\/><\/button>/,
  `className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>
    <button onClick={() => { setViewResultsGroup(g); setViewResultsData(null); }} className="p-1.5 text-slate-400 hover:text-sky-500 rounded-lg hover:bg-sky-50" title="Xem kết quả"><BookOpen className="w-3.5 h-3.5"/></button>`);

// 3. Append the modal
const modalJSX = `
      {/* View Results Modal */}
      {viewResultsGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-sky-50">
              <h3 className="font-bold text-sky-900 text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5"/>
                Kết quả khảo sát - {teachers?.find((t:any) => t.userId === viewResultsGroup.userId)?.teacherName || "Giáo viên"}
              </h3>
              <button onClick={() => setViewResultsGroup(null)} className="text-sky-500 hover:text-sky-700 hover:bg-sky-100 p-1.5 rounded-lg"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
                {/* Left side: List of exact assignments */}
                <div className="w-1/3 border-r bg-slate-50 overflow-y-auto p-4 space-y-2">
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">Chọn Lớp/Môn:</h4>
                    {assignments.filter(a => viewResultsGroup.ids.includes(a.id)).map(a => (
                        <button key={a.id} onClick={async () => {
                            setIsFetchingResults(true); setViewResultsData({ assignment: a, students: [] });
                            try {
                                const res = await fetch(\`/api/teacher-assessments?action=getStudents&periodId=\${a.periodId}&grade=\${a.grade}&systemCode=\${a.educationSystem}&subjectId=\${a.subjectId}\`);
                                const data = await res.json();
                                setViewResultsData({ assignment: a, students: data });
                            } catch (e) {}
                            setIsFetchingResults(false);
                        }} className={\`w-full text-left p-3 rounded-xl border transition-all \${viewResultsData?.assignment?.id === a.id ? 'bg-sky-100 border-sky-300 shadow-sm' : 'bg-white hover:border-sky-300'}\`}>
                            <div className="font-semibold text-slate-800 text-sm">{a.subject?.name}</div>
                            <div className="text-xs text-slate-500 mt-1">Khối {a.grade} • Hệ {a.educationSystem}</div>
                        </button>
                    ))}
                </div>
                
                {/* Right side: Results table */}
                <div className="w-2/3 p-4 overflow-y-auto bg-white">
                    {!viewResultsData ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Vui lòng chọn một phân công bên trái.</div>
                    ) : isFetchingResults ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">Đang tải biểu điểm...</div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-800">{viewResultsData.assignment.subject?.name}</h4>
                                    <p className="text-sm text-slate-500">Khối {viewResultsData.assignment.grade} • Hệ {viewResultsData.assignment.educationSystem} ({viewResultsData.students.length} HS)</p>
                                </div>
                                <div>
                                   <div className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">Đã nhập: {viewResultsData.students.filter((s:any)=>s.scores[0]?.score).length}/{viewResultsData.students.length}</div>
                                </div>
                            </div>
                            <table className="w-full text-sm border">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-2 border-b border-r text-left w-12">STT</th>
                                        <th className="px-4 py-2 border-b border-r text-left">Họ tên HS</th>
                                        <th className="px-4 py-2 border-b text-center w-24">Điểm</th>
                                        <th className="px-4 py-2 border-b text-center w-24">Quy chuẩn</th>
                                        <th className="px-4 py-2 border-b text-left">Nhận xét</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewResultsData.students.map((s:any, i:number) => {
                                        const sc = s.scores[0];
                                        return (
                                        <tr key={s.id} className="border-b hover:bg-slate-50">
                                            <td className="px-4 py-2 border-r text-center text-slate-500">{i+1}</td>
                                            <td className="px-4 py-2 border-r font-medium text-slate-700">{s.fullName} {sc?.isAbsent ? <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded ml-2">VẮNG</span> : ''}</td>
                                            <td className="px-4 py-2 border-r text-center font-bold text-sky-700">{sc?.score || '-'}</td>
                                            <td className="px-4 py-2 border-r text-center font-semibold text-emerald-600">{sc?.score2 || '-'}</td>
                                            <td className="px-4 py-2 text-slate-600 text-xs truncate max-w-[150px]" title={sc?.comment || ''}>{sc?.comment || '-'}</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                            {viewResultsData.students.length === 0 && <div className="p-8 text-center text-slate-500">Chưa có danh sách học sinh.</div>}
                        </div>
                    )}
                </div>
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
console.log('Results modal built');
