const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Undo the unintended replacements in Student
// Remove campusId and campus that were injected under academicYearId String in Student
// Wait, Student already HAS campusId and campus relation somewhere.
// Let's just restore from git or just fix manually
