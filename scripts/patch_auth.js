const fs = require('fs');
const path = 'src/lib/auth.ts';
const content = fs.readFileSync(path, 'utf8');

const oldBlock = "        // 3. If not found yet, try finding via Parent code\n        if (!user) {\n          const parent = await prisma.parent.findUnique({\n            where: { parentCode: identifier },\n            include: { user: true },\n          })\n          if (parent?.user) user = parent.user\n        }\n\n        if (!user || user.status !== \"ACTIVE\") return null";

const newBlock = "        // 3. If not found yet, try finding via Parent code\n        if (!user) {\n          const parent = await prisma.parent.findUnique({\n            where: { parentCode: identifier },\n            include: { user: true },\n          })\n          if (parent?.user) user = parent.user\n        }\n\n        // 4. If still not found, try finding by fullName (for KT_DBCL users)\n        if (!user) {\n          const byName = await prisma.user.findFirst({\n            where: { fullName: identifier },\n          })\n          if (byName) user = byName\n        }\n\n        if (!user || user.status !== \"ACTIVE\") return null";

if (content.includes(oldBlock)) {
  const newContent = content.replace(oldBlock, newBlock);
  fs.writeFileSync(path, newContent);
  console.log('SUCCESS: auth.ts updated');
} else {
  console.log('ERROR: Target block not found');
  const lines = content.split('\n');
  for (let i = 30; i < 48 && i < lines.length; i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
}
