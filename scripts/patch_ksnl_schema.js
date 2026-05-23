const fs = require('fs');
const path = 'prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('InputAssessmentPeriod')) {
    content = content.replace('  weeklyReports      WeeklyReport[]\n}', '  weeklyReports      WeeklyReport[]\n  inputAssessmentPeriods    InputAssessmentPeriod[]\n}');
    
    const newModels = 
model InputAssessmentPeriod {
  id             String                 @id @default(cuid())
  code           String                 @unique
  name           String
  academicYearId String
  description    String?
  status         String                 @default("ACTIVE")
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
  academicYear   AcademicYear           @relation(fields: [academicYearId], references: [id])
  batches        InputAssessmentBatch[]
}

model InputAssessmentBatch {
  id          String                @id @default(cuid())
  periodId    String
  batchNumber Int
  name        String
  startDate   DateTime
  endDate     DateTime
  status      String                @default("ACTIVE")
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  period      InputAssessmentPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade)

  @@unique([periodId, batchNumber])
}
;
    content = content.replace('model WeeklyReport {', newModels + '\nmodel WeeklyReport {');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Schema updated successfully');
} else {
    console.log('Schema already contains InputAssessmentPeriod');
}
