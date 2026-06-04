const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\components\\UserMenu.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'import { LogOut, KeyRound, ChevronDown, Bell, CheckCircle2 } from "lucide-react";',
  'import { LogOut, KeyRound, ChevronDown, Bell, CheckCircle2, X } from "lucide-react";'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed X import in UserMenu.tsx');
