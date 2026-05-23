const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

// 1. We replace the table layout classes to make it scroll horizontally and cleanly.
c = c.replace(/<div className="overflow-x-auto p-4">/g, 
  '<div className="overflow-x-auto p-4 custom-scrollbar" style={{maxWidth: "100%", width: "100%"}}>');

c = c.replace(/<table className="w-full text-sm text-left border rounded-lg overflow-hidden border-collapse">/,
  '<table className="w-full text-sm text-left border-collapse min-w-max">');

// 2. STT, Ho Ten, Khối, Hệ sticky
c = c.replaceAll(/<th className="px-3 py-3 w-12 text-center border-r font-semibold">STT<\/th>/g, 
  '<th className="px-3 py-4 w-12 text-center border-b border-r font-bold text-slate-700 bg-slate-100 uppercase tracking-wider sticky left-0 z-20">STT</th>');
c = c.replaceAll(/<th className="px-3 py-3 border-r font-semibold">Họ và Tên HS<\/th>/g,
  '<th className="px-4 py-4 border-b border-r font-bold text-slate-700 bg-slate-100 uppercase tracking-wider sticky left-[48px] z-20 min-w-[180px]">Họ và Tên HS</th>');

c = c.replaceAll(/<td className="px-3 py-2 text-center text-slate-500 border-r">\{i\+1\}<\/td>/g,
  '<td className="px-3 py-3 text-center text-slate-500 border-b border-r bg-white sticky left-0 z-10">{i+1}</td>');
c = c.replaceAll(/<td className="px-3 py-2 font-bold text-slate-800 border-r">\{st\.fullName\}<\/td>/g,
  '<td className="px-4 py-3 font-bold text-slate-800 border-b border-r bg-white sticky left-[48px] z-10">{st.fullName}</td>');

// Give Ngay Sinh, Khoi, Nam/He standard classes with border-b
c = c.replaceAll(/<th className="px-3 py-3 text-center border-r font-semibold">/g, '<th className="px-3 py-4 text-center border-b border-r font-bold text-slate-700 bg-slate-100 uppercase tracking-wider min-w-[100px]">');

c = c.replaceAll(/<td className="px-3 py-2 text-center text-slate-600 border-r">/g, '<td className="px-3 py-3 text-center text-slate-600 border-b border-r">');
c = c.replaceAll(/<td className="px-3 py-2 text-center font-medium bg-slate-50 border-r text-indigo-700">/g, '<td className="px-3 py-3 text-center font-medium bg-slate-50/50 border-b border-r text-indigo-700">');
c = c.replaceAll(/<td className="px-3 py-2 text-center text-slate-600 border-r text-xs">/g, '<td className="px-3 py-3 text-center text-slate-600 border-b border-r text-sm">');

// 3. Fix Score Columns Header & inputs
const thRegexSc = /return <th[^>]+>\{cName\}<\/th>/;
c = c.replace(thRegexSc, `return <th key={'sc-'+i} title={cName} className="px-4 py-4 text-center border-b border-r font-bold text-indigo-900 bg-indigo-50/80 uppercase tracking-wider min-w-[140px] max-w-[200px] align-middle" style={{wordBreak: 'break-word'}}>{cName}</th>`);

const tdRegexSc = /<td key=\{`sc-input-\$\{colIdx\}`\} className="px-2 py-2 border-r bg-indigo-50\/20 group-hover:bg-indigo-50\/60">/;
c = c.replace(tdRegexSc, `<td key={'sc-input-'+colIdx} className="px-3 py-3 border-b border-r bg-indigo-50/10 group-hover:bg-indigo-50/40 transition-colors">`);

const inputRegexSc = /className="w-full border-b border-indigo-200 bg-transparent py-1 text-center font-semibold text-indigo-900 outline-none focus:border-indigo-500 focus:bg-white placeholder-slate-300 transition-colors"/;
c = c.replace(inputRegexSc, `className="w-full border border-indigo-200 bg-white rounded-lg py-2.5 text-center font-bold text-indigo-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 placeholder-slate-300 transition-all"`);


// 4. Fix Comment Columns Header & inputs
const thRegexCm = /return <th[^>]+>\{cName\}<\/th>/;
c = c.replace(thRegexCm, `return <th key={'cm-'+i} title={cName} className="px-4 py-4 border-b border-r font-bold text-amber-900 bg-amber-50/80 uppercase tracking-wider min-w-[240px] max-w-[300px] align-middle" style={{wordBreak: 'break-word'}}>{cName}</th>`);

const tdRegexCm = /<td key=\{`cm-input-\$\{colIdx\}`\} className="px-2 py-2 border-r bg-amber-50\/20 group-hover:bg-amber-50\/60">/;
c = c.replace(tdRegexCm, `<td key={'cm-input-'+colIdx} className="px-3 py-3 border-b border-r bg-amber-50/10 group-hover:bg-amber-50/40 transition-colors">`);

const inputRegexCm = /className="w-full border-b border-amber-200 bg-transparent py-1 px-2 text-sm text-slate-700 outline-none focus:border-amber-500 focus:bg-white placeholder-slate-300 transition-colors"/;
c = c.replace(inputRegexCm, `className="w-full border border-amber-200 bg-white rounded-lg py-2.5 px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 placeholder-slate-400 transition-all"`);


// 5. Fix Save button column
c = c.replace(/<th className="px-3 py-3 text-center w-24 font-semibold text-emerald-800 bg-emerald-50">Lưu<\/th>/,
  '<th className="px-4 py-4 text-center border-b font-bold text-emerald-800 bg-emerald-50 uppercase tracking-wider w-28 sticky right-0 z-20">Xác nhận</th>');

c = c.replace(/<td className="px-3 py-2 text-center bg-emerald-50\/10">/,
  '<td className="px-4 py-3 text-center border-b bg-emerald-50/50 sticky right-0 z-10 backdrop-blur-sm">');

c = c.replace(/className=\{`p-2 rounded-xl text-xs font-semibold flex items-center justify-center w-full gap-2 transition-all shadow-sm \$\{/,
  'className={`px-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center w-full gap-2 transition-all shadow-sm ${');


fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Polished Teacher UI for usability');
