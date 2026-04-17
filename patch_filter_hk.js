const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

const tTarget = `const hkOptions=configsList.filter(c=>c.categoryType==="HOC_KY");`;

const tReplace = `const selPeriodYearId = periods.find((p:any) => p.id === studentPeriodId)?.academicYearId;\n  const hkOptions=configsList.filter((c:any)=>c.categoryType==="HOC_KY" && (!selPeriodYearId || c.academicYearId===selPeriodYearId));`;

content = content.replace(tTarget, tReplace);

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Patched hkOptions filter");
