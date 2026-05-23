const fs = require("fs");
const file_path = "src/app/api/input-assessments/route.ts";
let content = fs.readFileSync(file_path, "utf-8");

content = content.replace(
    /batchNumber: parseInt\(data\.batchNumber\),/g,
    "batchNumber: parseInt(data.batchNumber),\n             campusId: data.campusId || null,"
);

content = content.replace(
    /data: \{\n             name: data\.name,\n             startDate: new Date\(data\.startDate\),\n             endDate: new Date\(data\.endDate\),\n             status: data\.status\n          \}/g,
    "data: {\n             name: data.name,\n             startDate: new Date(data.startDate),\n             endDate: new Date(data.endDate),\n             status: data.status,\n             campusId: data.campusId || null\n          }"
);

fs.writeFileSync(file_path, content, "utf-8");
console.log("Patched route.ts correctly");
