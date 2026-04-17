const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

content = content.replace(/"KQGD Bậc Tiểu học"/g, '"Hồ sơ CT Bộ"');
content = content.replace(/"KQ Học tập \(Trung học\)"/g, '"Hồ sơ CT Quốc tế"');

content = content.replace(/>KQGD Tiểu học<\/label>/g, '>Hồ sơ CT Bộ</label>');
content = content.replace(/>KQ Học tập<\/label>/g, '>Hồ sơ CT Quốc tế</label>');

content = content.replace(/>Tiểu học:<\/span>/g, '>CT Bộ:</label>'); // Wait, what was the exact HTML? let's just use regex for "Tiểu học:"
content = content.replace(/>Tiểu học:<\/span>/g, '>CT Bộ:</span>');
content = content.replace(/>Học tập:<\/span>/g, '>Quốc tế:</span>');
content = content.replace(/className="text-xs text-slate-500 w-16"/g, 'className="text-xs text-slate-500 w-14"');

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Patched UI labels for Ho so CT Bo and Quoc Te");
