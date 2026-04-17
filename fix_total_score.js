const fs = require('fs');
let c = fs.readFileSync('src/app/teacher/input-assessments/client.tsx', 'utf8');

const regexScoresTh = /(\{Array\.from\(\{length: currentAssignment\.subject\.scoreColumns \?\? 1\}\)\.map[\s\S]*?<\/th>\s*\}\)\})/;
c = c.replace(regexScoresTh, "$1\n                                    <th className=\"px-4 py-4 text-center border-b border-r font-black text-indigo-900 bg-indigo-100 uppercase tracking-wider min-w-[120px] align-middle shadow-inner\">TỔNG ĐIỂM</th>");

const regexScoresTd = /(\{Array\.from\(\{length: currentAssignment\.subject\.scoreColumns \?\? 1\}\)\.map[\s\S]*?<\/td>\s*\}\)\})/;
c = c.replace(regexScoresTd, "$1\n                                        <td className=\"px-3 py-3 text-center border-b border-r bg-indigo-50/50 shadow-inner font-black text-indigo-900 text-lg\">\n                                            {((st.scoreVals || []).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)).toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n                                        </td>");

fs.writeFileSync('src/app/teacher/input-assessments/client.tsx', c, 'utf8');
console.log('Total Score column added');
