const fs = require('fs');
const path = require('path');

const schemaPath = path.join(process.argv[2], 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// The error is probably missing back-relations in Teacher, Class, AcademicYear.
if (!schemaContent.includes('TeachingAssignment[]')) {
  // Wait, I did add `assignments TeachingAssignment[]` to Subject.
  // I need to add to Teacher, Class, AcademicYear.
}

schemaContent = schemaContent.replace(/model Teacher \{[\s\S]*?classes     TeacherClassAssignment\[\]\n\}/, (match) => {
  if (!match.includes('teachingAssignments TeachingAssignment[]')) {
    return match.replace(/classes     TeacherClassAssignment\[\]\n\}/, 'classes     TeacherClassAssignment[]\n  teachingAssignments TeachingAssignment[]\n}');
  }
  return match;
});

schemaContent = schemaContent.replace(/model Class \{[\s\S]*?summaries    SummaryByClass\[\]\n\}/, (match) => {
  if (!match.includes('teachingAssignments TeachingAssignment[]')) {
    return match.replace(/summaries    SummaryByClass\[\]\n\}/, 'summaries    SummaryByClass[]\n  teachingAssignments TeachingAssignment[]\n}');
  }
  return match;
});

schemaContent = schemaContent.replace(/model AcademicYear \{[\s\S]*?surveyForms   SurveyForm\[\]\n\}/, (match) => {
  if (!match.includes('teachingAssignments TeachingAssignment[]')) {
    return match.replace(/surveyForms   SurveyForm\[\]\n\}/, 'surveyForms   SurveyForm[]\n  teachingAssignments TeachingAssignment[]\n}');
  }
  return match;
});

fs.writeFileSync(schemaPath, schemaContent);
console.log('schema.prisma back-relations patched');
