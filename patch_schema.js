const fs = require("fs");
let src = fs.readFileSync("prisma/schema.prisma", "utf8");

// Find the corrupted section start
const junkIdx = src.indexOf("\n\n      param($m)");
const start = junkIdx > -1 ? junkIdx : src.indexOf("model Teacher {");

// Find where the proper schema should restart: "model Campus {"  comes after Teacher
const campusIdx = src.indexOf("model Campus {");

const before = junkIdx > -1 ? src.substring(0, junkIdx) : src.substring(0, src.indexOf("model Teacher {"));
const after = src.substring(campusIdx);

const teModel = `

model Teacher {
  id                 String                   @id @default(cuid())
  userId             String                   @unique
  teacherCode        String                   @unique
  teacherName        String
  email              String?
  phone              String?
  homeroomClass      String?
  campusId           String
  status             String                   @default("ACTIVE")
  dateOfBirth        DateTime?
  departmentId       String?
  mainSubjectId      String?
  campus             Campus                   @relation(fields: [campusId], references: [id])
  user               User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  departmentRel      Department?              @relation(fields: [departmentId], references: [id])
  mainSubjectRel     Subject?                 @relation("teacherMainSubject", fields: [mainSubjectId], references: [id])
  classes            TeacherClassAssignment[]
  TeachingAssignment TeachingAssignment[]
}

`;

fs.writeFileSync("prisma/schema.prisma", before + teModel + after, "utf8");
console.log("Done. Lines:", (before + teModel + after).split("\n").length);
