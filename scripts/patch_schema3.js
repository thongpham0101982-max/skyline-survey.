const fs = require('fs');
const path = require('path');

const schemaPath = path.join(process.argv[2], 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Insert Teacher teachingAssignments
schemaContent = schemaContent.replace(/model Teacher \{[\s\S]*?classes     TeacherClassAssignment\[\]\n\}/, (match) => {
  if (!match.includes('teachingAssignments TeachingAssignment[]')) {
    return match.replace(/classes     TeacherClassAssignment\[\]\n\}/, 'classes     TeacherClassAssignment[]\n  teachingAssignments TeachingAssignment[]\n}');
  }
  return match;
});

// Remove onDelete: Cascade from TeachingAssignment subject and academicYear to be safe
schemaContent = schemaContent.replace(/subject      Subject      @relation\(fields: \[subjectId\], references: \[id\], onDelete: Cascade\)/g, 'subject      Subject      @relation(fields: [subjectId], references: [id])');
schemaContent = schemaContent.replace(/academicYear AcademicYear @relation\(fields: \[academicYearId\], references: \[id\], onDelete: Cascade\)/g, 'academicYear AcademicYear @relation(fields: [academicYearId], references: [id])');
schemaContent = schemaContent.replace(/teacher      Teacher      @relation\(fields: \[teacherId\], references: \[id\], onDelete: Cascade\)/g, 'teacher      Teacher      @relation(fields: [teacherId], references: [id])');
schemaContent = schemaContent.replace(/class        Class        @relation\(fields: \[classId\], references: \[id\], onDelete: Cascade\)/g, 'class        Class        @relation(fields: [classId], references: [id])');


fs.writeFileSync(schemaPath, schemaContent);
console.log('schema patched');
