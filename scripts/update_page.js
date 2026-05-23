const fs = require('fs');
const content = `import { LoginClient } from "./client"

export const metadata = {
  title: "SQMS - He thong Quan tri Chat luong Truong hoc",
  description: "Dang nhap vao He thong Quan tri Chat luong Truong hoc (SQMS)"
}

export default function LoginPage() { return <LoginClient /> }
`;
fs.writeFileSync('src/app/login/page.tsx', content);
console.log('OK');
