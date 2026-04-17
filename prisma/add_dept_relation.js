const fs = require("fs");
let s = fs.readFileSync("prisma/schema.prisma", "utf8");
// The Department model ends with:  updatedAt   DateTime @updatedAt\n}
// We need to find Department model specifically (last model in file)
const deptModelStart = s.lastIndexOf("model Department {");
if (deptModelStart === -1) { console.log("ERROR: Department not found"); process.exit(1); }
const deptClose = s.indexOf("\n}", deptModelStart);
if (deptClose === -1) { console.log("ERROR: Department closing brace not found"); process.exit(1); }
// Insert teachers relation before the closing }
s = s.substring(0, deptClose) + "\n  teachers    Teacher[]" + s.substring(deptClose);
fs.writeFileSync("prisma/schema.prisma", s, "utf8");
console.log("Department.teachers added at char", deptClose);
