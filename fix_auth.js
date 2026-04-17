const fs = require('fs');

// Fix page.tsx
let page = fs.readFileSync('src/app/teacher/input-assessments/page.tsx', 'utf8');
page = page.replace(/import \{ getServerSession \} from "next-auth\/next"/, 'import { auth } from "@/lib/auth"');
page = page.replace(/import \{ authOptions \} from "@\/app\/api\/auth\/\[\.\.\.nextauth\]\/route"\n/, '');
page = page.replace(/const session = await getServerSession\(authOptions\)/, 'const session = await auth()');
fs.writeFileSync('src/app/teacher/input-assessments/page.tsx', page, 'utf8');

// Fix route.ts
let route = fs.readFileSync('src/app/api/teacher-assessments/route.ts', 'utf8');
route = route.replace(/import \{ getServerSession \} from "next-auth\/next"/, 'import { auth } from "@/lib/auth"');
route = route.replace(/import \{ authOptions \} from "@\/app\/api\/auth\/\[\.\.\.nextauth\]\/route"\n/, '');
// Notice getServerSession was used twice in GET and POST
route = route.replace(/const session = await getServerSession\(authOptions\)/g, 'const session = await auth()');
fs.writeFileSync('src/app/api/teacher-assessments/route.ts', route, 'utf8');

console.log('Fixed Auth.js usage');
