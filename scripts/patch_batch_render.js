const fs = require("fs");
const file_path = "src/app/admin/input-assessments/client.tsx";
let content = fs.readFileSync(file_path, "utf-8");

content = content.replace(
    /<p className="text-\[10px\] font-bold text-slate-400 mt-0\.5">\{b\.startDate\?\.slice\(0,10\)\} - \{b\.endDate\?\.slice\(0,10\)\}<\/p>/g,
    '<p className="text-[10px] font-bold text-slate-400 mt-0.5">{b.startDate?.slice(0,10)} - {b.endDate?.slice(0,10)}{b.campusId ? ` • ${campuses.find(c=>c.id===b.campusId)?.campusName||""}` : ""}</p>'
);

fs.writeFileSync(file_path, content, "utf-8");
console.log("Patched client.tsx for batch campus render");
