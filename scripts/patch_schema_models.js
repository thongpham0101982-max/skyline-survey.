const fs = require('fs');
const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

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

schema = schema.trimEnd() + '\n' + newModels;
fs.writeFileSync(schemaPath, schema);
console.log('Models added!');
