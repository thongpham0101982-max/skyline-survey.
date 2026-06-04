const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\prisma\\schema.prisma';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '  isRead    Boolean  @default(false)\r\n  createdAt DateTime @default(now())',
  '  isRead    Boolean  @default(false)\r\n  link      String?\r\n  createdAt DateTime @default(now())'
);
// Also handle \n case if \r\n fails
content = content.replace(
  '  isRead    Boolean  @default(false)\n  createdAt DateTime @default(now())',
  '  isRead    Boolean  @default(false)\n  link      String?\n  createdAt DateTime @default(now())'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added link field to schema.prisma');
