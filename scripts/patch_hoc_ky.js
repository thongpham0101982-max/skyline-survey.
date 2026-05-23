const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

content = content.replace(/"Học kỳ": "hocKy"/g, '"Năm học tuyển sinh": "hocKy", "Học kỳ": "hocKy"');
content = content.replace(/<Tag className="w-4 h-4 text-emerald-500"\/>Học kỳ<\/h3>/g, '<Tag className="w-4 h-4 text-emerald-500"/>Năm học tuyển sinh</h3>');
content = content.replace(/Chưa có Học kỳ cho năm học này/g, 'Chưa có Năm học tuyển sinh cho năm học này');
content = content.replace(/title="Học kỳ"/g, 'title="Năm học tuyển sinh"');
content = content.replace(/<label className="block text-sm font-semibold mb-1\.5">Học kỳ<\/label>/g, '<label className="block text-sm font-semibold mb-1.5">Năm học TS</label>');

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Patched hoc ky labels");
