const fs = require("fs");
const file_path = "src/app/api/input-assessments/route.ts";
let content = fs.readFileSync(file_path, "utf-8");

content = content.replace(
    /batchNumber: parseInt\(data\.batchNumber\) \|\| 1,/g,
    "batchNumber: parseInt(data.batchNumber) || 1,\n             campusId: data.campusId || null,"
);

fs.writeFileSync(file_path, content, "utf-8");
console.log("Patched route.ts");
