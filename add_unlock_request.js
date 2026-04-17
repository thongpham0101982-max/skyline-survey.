const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

c = c.replace(
  /educationSystem String\s*\n\s*createdAt\s*DateTime/s,
  `educationSystem String
  unlockRequestStatus String @default("NONE")
  unlockReason        String?
  createdAt       DateTime`
);

fs.writeFileSync('prisma/schema.prisma', c, 'utf8');
console.log('Schema updated with unlock request fields');
