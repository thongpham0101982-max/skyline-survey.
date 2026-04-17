const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

content = content.replace(/>CT Bộ:<\/label>/g, '>CT Bộ:</span>');

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Fixed HTML");
