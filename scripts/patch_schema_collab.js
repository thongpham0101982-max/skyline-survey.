const fs = require('fs');
const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Add relations to WorkTask model
const oldWorkTask = `  academicYear     AcademicYear? @relation(fields: [academicYearId], references: [id])
  assignedBy       User          @relation("TaskAssigner", fields: [assignedById], references: [id])
  assignedToUser   User?         @relation("TaskAssignee", fields: [assignedToUserId], references: [id])
}`;

const newWorkTask = `  academicYear     AcademicYear? @relation(fields: [academicYearId], references: [id])
  assignedBy       User          @relation("TaskAssigner", fields: [assignedById], references: [id])
  assignedToUser   User?         @relation("TaskAssignee", fields: [assignedToUserId], references: [id])
  comments         TaskComment[]
  attachments      TaskAttachment[]
}`;

if (schema.includes(oldWorkTask)) {
  schema = schema.replace(oldWorkTask, newWorkTask);
  console.log('OK: WorkTask relations added');
} else {
  console.log('WARN: WorkTask block not found exactly, trying alternate');
}

// 2. Add new models at the end
const newModels = `

model TaskComment {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  content   String
  createdAt DateTime @default(now())
  task      WorkTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User     @relation("TaskComments", fields: [userId], references: [id])
}

model TaskAttachment {
  id           String   @id @default(cuid())
  taskId       String
  userId       String
  fileName     String
  fileData     String
  fileSize     Int      @default(0)
  contentType  String   @default("")
  createdAt    DateTime @default(now())
  task         WorkTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user         User     @relation("TaskAttachments", fields: [userId], references: [id])
}
`;

if (!schema.includes('TaskComment')) {
  schema = schema.trimEnd() + '\n' + newModels;
  console.log('OK: TaskComment and TaskAttachment models added');
} else {
  console.log('SKIP: Models already exist');
}

// 3. Add User relations for comments and attachments
const oldUserEnd = `  assignedTasks WorkTask[]     @relation("TaskAssigner")
  receivedTasks WorkTask[]     @relation("TaskAssignee")
}`;

const newUserEnd = `  assignedTasks WorkTask[]     @relation("TaskAssigner")
  receivedTasks WorkTask[]     @relation("TaskAssignee")
  taskComments  TaskComment[]  @relation("TaskComments")
  taskAttachments TaskAttachment[] @relation("TaskAttachments")
}`;

if (schema.includes(oldUserEnd) && !schema.includes('taskComments')) {
  schema = schema.replace(oldUserEnd, newUserEnd);
  console.log('OK: User relations added');
} else {
  console.log('SKIP: User relations already exist or not found');
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema file saved!');
