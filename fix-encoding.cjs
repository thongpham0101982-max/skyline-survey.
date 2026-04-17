const fs = require("fs");
const path = require("path");

const replacements = [
  { from: /B\?n c ch\?c mu\?n/g, to: "B?n có ch?c mu?n" },
  { from: /\?NG \?/g, to: "Ð?NG ?" },
  { from: /yu c\?u ny\?/g, to: "yêu c?u này?" },
  { from: /Vui l\?ng ch\?n/g, to: "Vui l?ng ch?n" },
  { from: /Phn cng thnh cng!/g, to: "Phân công thành công!" },
  { from: /L\?i/g, to: "L?i" },
  { from: /Khng xc \?nh/g, to: "Không xác ð?nh" },
  { from: /H\? h\?c/g, to: "H? h?c" },
  { from: /Mn KS/g, to: "Môn KS" },
  { from: /Gi\?o vi\?n/g, to: "Giáo viên" }
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git") {
        walk(fullPath);
      }
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts") || fullPath.endsWith(".prisma")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let originalContent = content;
      replacements.forEach(r => {
        content = content.replace(r.from, r.to);
      });
      if (content !== originalContent) {
        console.log(`Fixed encoding in: ${fullPath}`);
        fs.writeFileSync(fullPath, content, "utf8");
      }
    }
  });
}

walk(".");
