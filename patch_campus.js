const fs = require("fs");
const file_path = "src/app/admin/input-assessments/client.tsx";
let content = fs.readFileSync(file_path, "utf-8");

const target = `<Field label="Người phụ trách">
              <select value={pForm.assignedUserId} onChange={e=>setPForm(f=>({...f,assignedUserId:e.target.value}))} className={inp}>
                 <option value="">-- Chưa gán --</option>
                 {examBoardUsers.map(u=><option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
           </Field>`;

const replacement = `<div className="grid grid-cols-2 gap-3">
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
           </div>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file_path, content, "utf-8");
    console.log("Successfully patched client.tsx for campus selector in Modal");
} else {
    console.log("Could not find target in client.tsx");
}
