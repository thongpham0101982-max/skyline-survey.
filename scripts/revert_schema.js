const fs = require("fs");
let schema = fs.readFileSync("prisma/schema.prisma", "utf8");

// Remove academicYear relation + academicYearId from Teacher model 
schema = schema.replace(
  "  homeroomClass   String?\n  campusId        String\n  academicYearId  String?\n  status          String  @default(\"ACTIVE\")\n\n  user         User                     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  campus       Campus                   @relation(fields: [campusId], references: [id])\n  academicYear AcademicYear?            @relation(fields: [academicYearId], references: [id])\n  classes      TeacherClassAssignment[]",
  "  homeroomClass String?\n  campusId      String\n  status        String  @default(\"ACTIVE\")\n\n  user    User                     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  campus  Campus                   @relation(fields: [campusId], references: [id])\n  classes TeacherClassAssignment[]"
);

// Remove academicYear relation + academicYearId from Parent model
schema = schema.replace(
  "  academicYearId String?\n  status         String  @default(\"ACTIVE\")\n\n  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)\n  academicYear AcademicYear?       @relation(fields: [academicYearId], references: [id])\n  students     ParentStudentLink[]\n  surveyForms  SurveyForm[]",
  "  status      String  @default(\"ACTIVE\")\n\n  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)\n  students    ParentStudentLink[]\n  surveyForms SurveyForm[]"
);

// Remove teachers and parents from AcademicYear
schema = schema.replace(
  "  classes       Class[]\n  students      Student[]\n  surveyPeriods SurveyPeriod[]\n  surveyForms   SurveyForm[]\n  teachers      Teacher[]\n  parents       Parent[]",
  "  classes       Class[]\n  students      Student[]\n  surveyPeriods SurveyPeriod[]\n  surveyForms   SurveyForm[]"
);

fs.writeFileSync("prisma/schema.prisma", schema, "utf8");
console.log("Schema reverted to original (no new relations)");
// Verify
const check = fs.readFileSync("prisma/schema.prisma", "utf8");
console.log("Teacher model:", check.match(/model Teacher \{[\s\S]*?\}/)?.[0]?.substring(0, 200));
