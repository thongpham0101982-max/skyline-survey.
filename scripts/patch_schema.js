const fs = require("fs");
const file_path = "prisma/schema.prisma";
let content = fs.readFileSync(file_path, "utf-8");

const target = `  period                           InputAssessmentPeriod              @relation(fields: [periodId], references: [id], onDelete: Cascade)
  students                         InputAssessmentStudent[]`;

const replacement = `  campusId                         String?
  campus                           Campus?                            @relation(fields: [campusId], references: [id])
  period                           InputAssessmentPeriod              @relation(fields: [periodId], references: [id], onDelete: Cascade)
  students                         InputAssessmentStudent[]`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file_path, content, "utf-8");
    console.log("Successfully patched schema.prisma");
} else {
    console.log("Could not find target in schema.prisma");
}
