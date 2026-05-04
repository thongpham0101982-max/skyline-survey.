const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `const isChildDevSubject = subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");\n    const subNameNormalized = subName.normalize("NFC");`,
  `const subNameNormalized = subName.normalize("NFC");\n    const isChildDevSubject = subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");`
);

fs.writeFileSync(path, content);
