const fs = require("fs");
let c = fs.readFileSync("src/app/admin/teachers/client.tsx", "utf8");
// Remove the academicYearId required check
c = c.replace(
  "    if (!newForm.academicYearId) {\n      setErrorMsg(\"Vui long chon Nam hoc!\"); return\n    }\n    ",
  "    "
);
// Also update the select to show active year pre-selected (no empty option)
// and change label to optional
c = c.replace(
  "<option value=\"\">-- Chon Nam hoc --</option>",
  "<option value=\"\">(Khong chon - dung nam hoc Active)</option>"
);
fs.writeFileSync("src/app/admin/teachers/client.tsx", c, "utf8");
console.log("Done. Length:", c.length);
