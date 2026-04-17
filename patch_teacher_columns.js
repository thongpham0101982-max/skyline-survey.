const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const regexScoresTh = /\{Array\.from\(\{length: currentAssignment\.subject\.scoreColumns \?\? 1\}\)\.map\(\(_, i\) => \(\s*<th key=\{`sc-\$\{i\}`\} className="px-3 py-3 text-center border-r font-semibold text-indigo-800 bg-indigo-50 min-w-\[90px\]">Điểm \{i\+1\}<\/th>\s*\)\)\}/;
const regexCommentsTh = /\{Array\.from\(\{length: currentAssignment\.subject\.commentColumns \?\? 1\}\)\.map\(\(_, i\) => \(\s*<th key=\{`cm-\$\{i\}`\} className="px-3 py-3 min-w-\[200px\] border-r font-semibold text-amber-800 bg-amber-50">Nhận xét \{i\+1\}<\/th>\s*\)\)\}/;

c = c.replace(regexScoresTh, `{Array.from({length: currentAssignment.subject.scoreColumns ?? 1}).map((_, i) => {
                                        let cName = "Điểm " + (i+1);
                                        try { if(currentAssignment.subject.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.scores && p.scores[i]) cName = p.scores[i]; } } catch(e){}
                                        return <th key={'sc-'+i} className="px-3 py-3 text-center border-r font-semibold text-indigo-800 bg-indigo-50 min-w-\\[90px\\]">{cName}</th>
                                    })}`);

c = c.replace(regexCommentsTh, `{Array.from({length: currentAssignment.subject.commentColumns ?? 1}).map((_, i) => {
                                        let cName = "Nhận xét " + (i+1);
                                        try { if(currentAssignment.subject.columnNames) { const p = JSON.parse(currentAssignment.subject.columnNames); if(p.comments && p.comments[i]) cName = p.comments[i]; } } catch(e){}
                                        return <th key={'cm-'+i} className="px-3 py-3 min-w-\\[200px\\] border-r font-semibold text-amber-800 bg-amber-50">{cName}</th>
                                    })}`);

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Teacher UI modified for custom column names');
