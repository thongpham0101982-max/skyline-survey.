const fs = require("fs");
const path = "src/app/teacher/input-assessments/client.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  `    const subName = (currentAssignment?.subject?.name || "").toLowerCase();
    const subCode = (currentAssignment?.subject?.code || "").toLowerCase();
    const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");
    const isChildDevSubject = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";
    const subNameNormalized = subName.normalize("NFC");
    const hideComments = ["toa", "tvi", "nva"].some(c => subCode.includes(c)) || ["toán", "tiếng việt", "ngữ văn"].some(s => subNameNormalized.includes(s));
    const gradeVal = String(currentAssignment?.grade || "").replace("Khối ", "").trim();`,
  `    const subName = (currentAssignment?.subject?.name || "").toLowerCase();
    const subCode = (currentAssignment?.subject?.code || "").toLowerCase();
    const subNameNormalized = subName.normalize("NFC");
    const gradeVal = String(currentAssignment?.grade || "").replace("Khối ", "").trim();
    const isPsychSubject = subName.includes("tâm lý") || subCode.includes("tly");
    const isChildDevSubject = (subNameNormalized.includes("chuẩn phát triển trẻ em") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci")) && gradeVal === "1";
    const hideComments = ["toa", "tvi", "nva"].some(c => subCode.includes(c)) || ["toán", "tiếng việt", "ngữ văn"].some(s => subNameNormalized.includes(s));`
);

fs.writeFileSync(path, content);
