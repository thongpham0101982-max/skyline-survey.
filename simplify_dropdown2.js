const fs = require('fs');

const clientPath = 'src/app/teacher/input-assessments/client.tsx';
let code = fs.readFileSync(clientPath, 'utf8');

code = code.replace(/\{availableAssignments\.map\(a => \([\s\S]*?<option key=\{a\.id\} value=\{a\.id\}>[\s\S]*?\{a\.subject\?\.name\} - Khối \{a\.grade \|\| "Tất cả"\} \(\{a\.educationSystem \|\| "Tất cả"\}\) \{a\.batch\?\.name \? ` - \$\{a\.batch\.name\}` : ""\}[\s\S]*?<\/option>[\s\S]*?\)\)\}/g, 
`{uniqueAssignments.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.subject?.name}{a.batch?.name ? \` - \${a.batch.name}\` : ""}
                                </option>
                            ))}`);

code = code.replace(/\{availableAssignments\.length === 0 && <option value="">Vui lòng chọn kỳ KS\.\.\.<\/option>\}/g, 
`{uniqueAssignments.length === 0 && <option value="">Vui lòng chọn kỳ KS...</option>}`);

fs.writeFileSync(clientPath, code, 'utf8');
