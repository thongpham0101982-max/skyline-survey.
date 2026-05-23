const fs = require("fs");
const file = "src/app/teacher/input-assessments/client.tsx";
let code = fs.readFileSync(file, "utf8");

const oldUI = `                <div className="group">
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
                                    {a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.educationSystem || "Tất cả"}) {a.batch?.name ? \` - \${a.batch.name}\` : ""}
                                </option>
                            ))}
                            {availableAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>`;

const newUI = `                {batches.length > 0 && (
                    <div className="group">
                        <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                            <Layers className="w-3.5 h-3.5 text-indigo-500"/> Đợt khảo sát
                        </label>
                        <div className="relative">
                            <select 
                                value={selectedBatchId} 
                                onChange={e => setSelectedBatchId(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                            >
                                <option value="all">Tất cả các đợt</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                )}

                <div className="group lg:col-span-1">
                    <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500"/> Môn Khảo sát
                    </label>
                    <div className="relative">
                        <select 
                            value={selectedAssignmentId} 
                            onChange={e => setSelectedAssignmentId(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                        >
                            {availableAssignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject?.name} - Khối {a.grade || "Tất cả"} ({a.educationSystem || "Tất cả"})
                                </option>
                            ))}
                            {availableAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>`;

code = code.replace(oldUI, newUI);

// change grid cols
code = code.replace('grid-cols-1 md:grid-cols-2 gap-4 md:gap-6', 'grid-cols-1 md:grid-cols-3 gap-4 md:gap-6');

fs.writeFileSync(file, code);
console.log("UI patched");
