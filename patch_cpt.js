const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `const isChildDevSubject = subName.includes("chuẩn phát triển trẻ em") || subName.includes("bộ chuẩn phát triển") || subCode.includes("cpt");`,
  `const isChildDevSubject = subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");`
);

fs.writeFileSync(path, content);
