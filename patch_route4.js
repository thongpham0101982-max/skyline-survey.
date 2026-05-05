const fs = require("fs");
const file_path = "src/app/api/input-assessments/route.ts";
let lines = fs.readFileSync(file_path, "utf-8").split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('else if (action === "UPDATE_BATCH") {')) {
        for (let j = i; j < i + 15; j++) {
            if (lines[j].includes('status: data.status')) {
                // If it doesn't already have campusId, add it below
                if (!lines[j+1].includes('campusId')) {
                    lines[j] = lines[j] + ",";
                    lines.splice(j + 1, 0, '             campusId: data.campusId || null');
                    console.log("Patched UPDATE_BATCH");
                    break;
                }
            }
        }
        break;
    }
}

fs.writeFileSync(file_path, lines.join("\n"));
console.log("Done");
