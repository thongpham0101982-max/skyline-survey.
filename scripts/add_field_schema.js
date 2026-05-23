const fs = require("fs");
let content = fs.readFileSync("prisma/schema.prisma", "utf8");

content = content.replace(/  kqRenLuyen          String\?\r?\n  psychologyScore     Float\?/g, '  kqRenLuyen          String?\n  hoSoCtQuocTe        String?\n  psychologyScore     Float?');

fs.writeFileSync("prisma/schema.prisma", content, "utf8");
console.log("Added hoSoCtQuocTe to schema");
