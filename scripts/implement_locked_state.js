const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

// 1. Add isLocked variable 
c = c.replace(/const currentAssignment = assignments\.find\(a => a\.id === selectedAssignmentId\);/,
  "const currentAssignment = assignments.find(a => a.id === selectedAssignmentId);\n    const isLocked = currentAssignment?.period?.status !== 'ACTIVE';");

// 2. Add visual warning for Locked state in the header
c = c.replace(/<span className="text-sm font-medium bg-emerald-100\/50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-full shadow-sm">/,
  `{isLocked && <span className="text-sm font-bold bg-red-100 text-red-700 border border-red-200 px-4 py-1.5 rounded-full shadow-sm mr-2 flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg> KỲ KHẢO SÁT ĐÃ KHÓA</span>}\n                        <span className={"text-sm font-medium border px-4 py-1.5 rounded-full shadow-sm " + (isLocked ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-emerald-100/50 text-emerald-700 border-emerald-200")}>`);

// 3. Disable Score inputs
c = c.replace(/onChange=\{e => handleScoreChange(.*)\}/,
  "onChange={e => handleScoreChange$1}\n                                                        disabled={isLocked}");

c = c.replace(/className="w-full border border-indigo-200 bg-white rounded-lg py-2.5 text-center font-bold text-indigo-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 placeholder-slate-300 transition-all"/,
  "className={`w-full border border-indigo-200 rounded-lg py-2.5 text-center font-bold shadow-sm outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 placeholder-slate-300'}`}");

// 4. Disable Comment inputs
c = c.replace(/onChange=\{e => handleCommentChange(.*)\}/g,
  "onChange={e => handleCommentChange$1}\n                                                    disabled={isLocked}");

c = c.replace(/className="w-full border border-amber-200 bg-white rounded-lg py-2.5 px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 placeholder-slate-400 transition-all"/g,
  "className={`w-full border border-amber-200 rounded-lg py-2.5 px-3 text-sm shadow-sm outline-none transition-all ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 placeholder-slate-400'}`}");

// 5. Disable Save button
c = c.replace(/<button\s*onClick=\{\(\) => saveStudentScore\(st\)\}/,
  "<button \n                                                onClick={() => saveStudentScore(st)}\n                                                disabled={isLocked}");

c = c.replace(/className=\{`px-3 py-2\.5 rounded-xl text-sm font-bold flex items-center justify-center w-full gap-2 transition-all shadow-sm \$\{/,
  "className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center w-full gap-2 transition-all shadow-sm ${isLocked ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-none' : ");
  
c = c.replace(/'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'\s*\}`\}\s*>/,
  "'bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'}`}\n                                            >");

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Locked state applied correctly to inputs and buttons');
