const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

// 1. Remove the hardcoded TỔNG ĐIỂM th and td I injected previously
c = c.replace(/<th className="px-4 py-4 text-center border-b border-r font-black text-indigo-900 bg-indigo-100 uppercase tracking-wider min-w-\[120px\] align-middle shadow-inner">TỔNG ĐIỂM<\/th>\s*/, '');
c = c.replace(/<td className="px-3 py-3 text-center border-b border-r bg-indigo-50\/50 shadow-inner font-black text-indigo-900 text-lg">\s*\{\(\(st\.scoreVals \|\| \[\]\)\.reduce[^\}]+\}\s*<\/td>\s*/, '');

// 2. Modify Score th to add slightly different style if it's a Total column
const regexScoresTh = /(\{Array\.from\(\{length: currentAssignment\.subject\.scoreColumns \?\? 1\}\)\.map\(\(_, i\) => \{\s*let cName = "Điểm " \+ \(i\+1\);\s*try \{ if\(currentAssignment\.subject\.columnNames\) \{ const p = JSON\.parse\(currentAssignment\.subject\.columnNames\); if\(p\.scores && p\.scores\[i\]\) cName = p\.scores\[i\]; \} \} catch\(e\)\{\}\s*)(return <th key=\{'sc-'\+i\} title=\{cName\} className="px-4 py-4 text-center border-b border-r font-bold text-indigo-900 bg-indigo-50\/80 uppercase tracking-wider min-w-\[140px\] max-w-\[200px\] align-middle" style=\{\{wordBreak: 'break-word'\}\}>\{cName\}<\/th>)/;
c = c.replace(regexScoresTh, "$1 const isTotal = cName.toLowerCase().includes('tổng'); return <th key={'sc-'+i} title={cName} className={`px-4 py-4 text-center border-b border-r font-bold uppercase tracking-wider min-w-[140px] max-w-[200px] align-middle ${isTotal ? 'bg-indigo-100 text-indigo-900 shadow-inner' : 'text-indigo-900 bg-indigo-50/80'}`} style={{wordBreak: 'break-word'}}>{cName}</th>");

// 3. Modify Score td to render auto sum if it's a Total column
const tdRegexSc = /<td key=\{'sc-input-'\+colIdx\} className="px-3 py-3 border-b border-r bg-indigo-50\/10 group-hover:bg-indigo-50\/40 transition-colors">\s*<input[^>]+>\s*<\/td>/s;
const tdReplaceStr = `<td key={'sc-input-'+colIdx} className={\`px-3 py-3 border-b border-r transition-colors \${isTotal ? 'bg-indigo-50/60 shadow-inner text-center font-black text-indigo-800 text-lg' : 'bg-indigo-50/10 group-hover:bg-indigo-50/40'}\`}>
                                                {isTotal ? (
                                                    (st.scoreVals || []).slice(0, colIdx).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString('vi-VN', {maximumFractionDigits: 2})
                                                ) : (
                                                    <input 
                                                        type="number"
                                                        value={st.scoreVals?.[colIdx] || ""}
                                                        onChange={e => handleScoreChange(st.id, colIdx, e.target.value)}
                                                        className="w-full border border-indigo-200 bg-white rounded-lg py-2.5 text-center font-bold text-indigo-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 placeholder-slate-300 transition-all"
                                                        placeholder="-"
                                                    />
                                                )}
                                            </td>`;

const regexScoresTd = /(\{Array\.from\(\{length: currentAssignment\.subject\.scoreColumns \?\? 1\}\)\.map\(\(_, colIdx\) => \{\s*let cName = "Điểm " \+ \(colIdx\+1\);\s*try \{ if\(currentAssignment\.subject\.columnNames\) \{ const p = JSON\.parse\(currentAssignment\.subject\.columnNames\); if\(p\.scores && p\.scores\[colIdx\]\) cName = p\.scores\[colIdx\]; \} \} catch\(e\)\{\})/s;
// Let's manually replace the map for TD so we ensure exact code injection
// I'll rewrite the entire TD block for strictly safe string replacement

let fixBlock = `
{Array.from({length: currentAssignment.subject.scoreColumns ?? 1}).map((_, colIdx) => {
    let cName = "Điểm " + (colIdx+1);
    try { if(currentAssignment.subject.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.scores && p.scores[colIdx]) cName = p.scores[colIdx]; } } catch(e){}
    const isTotal = cName.toLowerCase().includes('tổng');
    return (
        <td key={'sc-input-'+colIdx} className={\`px-3 py-3 border-b border-r transition-colors \${isTotal ? 'bg-indigo-50/60 shadow-inner text-center font-black text-indigo-800 text-lg' : 'bg-indigo-50/10 group-hover:bg-indigo-50/40'}\`}>
            {isTotal ? (
                (st.scoreVals || []).slice(0, colIdx).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString('vi-VN', {maximumFractionDigits: 2})
            ) : (
                <input 
                    type="number"
                    value={st.scoreVals?.[colIdx] || ""}
                    onChange={e => handleScoreChange(st.id, colIdx, e.target.value)}
                    className="w-full border border-indigo-200 bg-white rounded-lg py-2.5 text-center font-bold text-indigo-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 placeholder-slate-300 transition-all"
                    placeholder="-"
                />
            )}
        </td>
    );
})}
`.trim()

const extractRegex = /\{Array\.from\(\{length: currentAssignment\.subject\.scoreColumns \?\? 1\}\)\.map\(\(_, colIdx\) =>\s*\(.*?<\/td>\s*\)\)\}/s;
c = c.replace(extractRegex, fixBlock);
fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');

console.log('Dynamic Total Score calculation based on column name matched');
