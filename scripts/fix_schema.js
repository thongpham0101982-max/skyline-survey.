const fs = require("fs");
let content = fs.readFileSync("prisma/schema.prisma", "utf8");
// Fix the literal `r`n and add proper line breaks
content = content.replace("@updatedAt`r`n  @@unique", "@updatedAt\n  @@unique");
content = content.replace("periodId])`r`n  signatureName", "periodId])\n  signatureName");
// Also fix the studyPrograms default if it still has issues
content = content.replace(/@default\("HÃ.*?"\)/g, '@default("")');
fs.writeFileSync("prisma/schema.prisma", content, "utf8");
