const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('inputAssessmentPeriods InputAssessmentPeriod[] @relation("PeriodAssignee")')) {
    schema = schema.replace(
        'weeklyReports WeeklyReport[]',
        'weeklyReports WeeklyReport[]\n  inputAssessmentPeriods InputAssessmentPeriod[] @relation("PeriodAssignee")'
    );
}

if (!schema.includes('assignedUserId String?')) {
    let periodMatch = schema.match(/model InputAssessmentPeriod \{[\s\S]*?\}/);
    if (periodMatch) {
       let block = periodMatch[0].replace(
           'campusId       String?',
           'campusId       String?\n  assignedUserId String?\n  assignedUser   User?   @relation("PeriodAssignee", fields: [assignedUserId], references: [id])'
       );
       schema = schema.replace(periodMatch[0], block);
    }
}

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('Schema assign updated.');
