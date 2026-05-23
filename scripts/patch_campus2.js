const fs = require("fs");
const file_path = "src/app/admin/input-assessments/client.tsx";
let lines = fs.readFileSync(file_path, "utf-8").split("\n");

let startLine = -1;
let endLine = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<Field label="Ng') && lines[i].includes('i ph') && lines[i].includes('tr') && lines[i].includes('ch">') && lines[i+1].includes('assignedUserId')) {
        startLine = i;
        endLine = i + 5;
        break;
    }
}

if (startLine !== -1) {
    const replacement = `           <div className="grid grid-cols-2 gap-3">
             <Field label="Cơ sở">
                <select value={pForm.campusId} onChange={e=>setPForm(f=>({...f,campusId:e.target.value}))} className={inp}>
                   <option value="">-- Chọn cơ sở --</option>
                   {campuses.map(c=><option key={c.id} value={c.id}>{c.campusName}</option>)}
                </select>
             </Field>
             <Field label="Người phụ trách">
                <select value={pForm.assignedUserId} onChange={e=>setPForm(f=>({...f,assignedUserId:e.target.value}))} className={inp}>
                   <option value="">-- Chưa gán --</option>
                   {examBoardUsers.map(u=><option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
             </Field>
           </div>`.split("\n");
           
    lines.splice(startLine, 6, ...replacement);
    fs.writeFileSync(file_path, lines.join("\n"));
    console.log("Patched successfully");
} else {
    console.log("Could not find lines to replace");
}
