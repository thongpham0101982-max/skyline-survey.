const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\admin\\tasks\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('import { Suspense } from "react"')) {
  content = 'import { Suspense } from "react"\n' + content;
}

content = content.replace(
`<TasksClient
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        years={years}
        roles={roles}
        currentRole={role}
        currentUserId={userId}
      />`,
`<Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải...</div>}>
        <TasksClient
          initialTasks={JSON.parse(JSON.stringify(tasks))}
          years={years}
          roles={roles}
          currentRole={role}
          currentUserId={userId}
        />
      </Suspense>`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added Suspense to page.tsx');
