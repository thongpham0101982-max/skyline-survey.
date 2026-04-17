const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!c.includes('model StudentAssessmentScore')) {
    const studentScoreModel = `
model StudentAssessmentScore {
  id          String                @id @default(cuid())
  studentId   String
  subjectId   String
  scores      String?               // JSON string array of floats
  comments    String?               // JSON string array of strings
  updatedAt   DateTime              @updatedAt

  student     InputAssessmentStudent @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subject     AssessmentSubject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([studentId, subjectId])
}
`;

    c = c.replace(/model InputAssessmentStudent \{([^}]+)\}/, (match, p1) => {
        if(!p1.includes('StudentAssessmentScore')) {
             return match.replace(/}$/, '  scores              StudentAssessmentScore[]\n}')
        }
        return match;
    });

    c = c + studentScoreModel;
    fs.writeFileSync('prisma/schema.prisma', c, 'utf8');
}
console.log('Schema dynamically patched');
