const fs = require('fs');
let s = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Append models using simple string concatenation
const models = `
model WeeklyReport {
  id             String   @id @default(cuid())
  userId         String
  weekNumber     Int
  month          Int
  year           Int
  academicYearId String?
  status         String   @default("DRAFT")
  managerComment String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id])
  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id])
  items          WeeklyReportItem[]
}

model WeeklyReportItem {
  id               String   @id @default(cuid())
  reportId         String
  mainTask         String
  workContent      String
  progress         String   @default("NOT_STARTED")
  proposedSolution String?
  managerNote      String?
  createdAt        DateTime @default(now())
  report           WeeklyReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
}
`;

// Make sure we don't add duplicates
if (!s.includes('model WeeklyReport')) {
  s = s + models;
  // Remove BOM
  if (s.charCodeAt(0) === 0xFEFF) s = s.substring(1);
  fs.writeFileSync('prisma/schema.prisma', s);
  console.log('OK: Models appended to schema');
} else {
  console.log('Models already exist');
}
