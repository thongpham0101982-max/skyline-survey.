const fs = require("fs");
const file_path = "prisma/schema.prisma";
let lines = fs.readFileSync(file_path, "utf-8").split("\n");

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('model InputAssessmentBatch {')) {
        // Find the period relation line
        for (let j = i; j < i + 20; j++) {
            if (lines[j].includes('period') && lines[j].includes('InputAssessmentPeriod')) {
                // insert campusId before it
                lines.splice(j, 0, '  campusId                         String?', '  campus                           Campus?                            @relation(fields: [campusId], references: [id])');
                break;
            }
        }
        break;
    }
}

fs.writeFileSync(file_path, lines.join("\n"));
console.log("Patched schema");
