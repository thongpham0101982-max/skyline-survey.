const fs = require("fs");
const file_path = "prisma/schema.prisma";
let lines = fs.readFileSync(file_path, "utf-8").split("\n");

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('model Campus {')) {
        for (let j = i; j < i + 20; j++) {
            if (lines[j].includes('}')) {
                lines.splice(j, 0, '  inputAssessmentBatches InputAssessmentBatch[]');
                break;
            }
        }
        break;
    }
}

fs.writeFileSync(file_path, lines.join("\n"));
console.log("Patched Campus model");
