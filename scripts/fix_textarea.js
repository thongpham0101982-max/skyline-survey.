const fs = require("fs");
const path = "src/app/teacher/input-assessments/ChildDevStandardForm.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  'placeholder="Ghi chú thêm..."\n                                                ></textarea>',
  'placeholder="Ghi chú thêm..."\n                                                />'
);
content = content.replace(
  'placeholder="Ghi chú thêm..."\n                                                </textarea>',
  'placeholder="Ghi chú thêm..."\n                                                />'
);

fs.writeFileSync(path, content);
