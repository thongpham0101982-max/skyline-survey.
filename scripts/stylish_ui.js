const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const regexHeader = /<div className="flex items-center justify-between">[\s\S]*?<\/div>\s*<\/div>/;
const newHeader = `
<div className="bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Nhập điểm Khảo sát</h1>
                        <p className="text-indigo-100 mt-2 flex items-center flex-wrap gap-2 text-sm md:text-base font-medium opacity-90">
                            <span className="bg-white/20 backdrop-blur-md text-white font-bold px-3 py-1 rounded-full shadow-inner shadow-white/10 ring-1 ring-white/30 truncate max-w-[200px] md:max-w-none">
                                👋 {user?.name || "Thầy/Cô"}
                            </span>
                            <span>Cập nhật nhanh chóng, lưu trữ an toàn</span>
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0 flex gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 ring-1 ring-white/20 shadow-xl">
                            <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Môn học</div>
                            <div className="text-white font-black text-xl">{currentAssignment ? currentAssignment.subject.name : '...'}</div>
                        </div>
                    </div>
                </div>
            </div>
`;
c = c.replace(regexHeader, newHeader);

// Redesign Filters Box
const regexFilters = /<div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">[\s\S]*?(?=\{currentAssignment && \()/;

const newFilters = `
<div className="-mt-10 mx-auto w-[92%] relative z-20 bg-white/70 backdrop-blur-xl p-5 rounded-3xl shadow-xl shadow-indigo-900/5 ring-1 ring-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-500"/> Kỳ Khảo sát
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedPeriodId} 
                            onChange={e => setSelectedPeriodId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            {periods.length === 0 && <option value="">Không có kỳ KS nào</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="group">
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500"/> Phân công
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedAssignmentId} 
                            onChange={e => setSelectedAssignmentId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                        >
                            {availableAssignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    Khối {a.grade || "Tất cả"} • Hệ {a.systemCode || "Tất cả"}
                                </option>
                            ))}
                            {availableAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>
`;
c = c.replace(regexFilters, newFilters);

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('UI stylized');
