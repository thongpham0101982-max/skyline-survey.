const fs = require("fs");
let s = fs.readFileSync("prisma/schema.prisma", "utf8");

// 1) Add mainTeachers to Subject model - before closing brace after line 321
// Target: line with "  assignments   TeachingAssignment[]\n}"
s = s.replace(
  "  assignments   TeachingAssignment[]\n}",
  "  assignments   TeachingAssignment[]\n  mainTeachers  Teacher[]           @relation(\"teacherMainSubject\")\n}"
);

// 2) Add teachers to Department model - after updatedAt before closing brace
s = s.replace(
  "  updatedAt   DateTime @updatedAt\n}\r\n",
  "  updatedAt   DateTime @updatedAt\n  teachers    Teacher[]\n}\r\n"
);

fs.writeFileSync("prisma/schema.prisma", s, "utf8");
console.log("Done");
