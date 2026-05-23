const fs = require('fs');
const pagePath = 'src/app/admin/tasks/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

// Replace using a regex approach to handle different line endings
const oldPattern = /let whereClause: any = \{\}\r?\n\s+if \(role !== "ADMIN"\) \{\r?\n\s+whereClause = \{\r?\n\s+OR: \[\r?\n\s+\{ assignedToRole: role \},\r?\n\s+\{ assignedToUserId: userId \}\r?\n\s+\]\r?\n\s+\}\r?\n\s+\}/;

const match = page.match(oldPattern);
if (match) {
  const replacement = `let whereClause: any = {}
  if (role !== "ADMIN") {
    // KT_DBCL and other non-admin users only see:
    // 1. Tasks assigned specifically to them (by userId)
    // 2. Tasks assigned to their role group WITHOUT a specific user (whole-group tasks)
    whereClause = {
      OR: [
        { assignedToUserId: userId },
        { assignedToRole: role, assignedToUserId: null }
      ]
    }
  }`;
  page = page.replace(oldPattern, replacement);
  fs.writeFileSync(pagePath, page);
  console.log('SUCCESS: page.tsx updated');
} else {
  console.log('ERROR: Pattern not found');
}
