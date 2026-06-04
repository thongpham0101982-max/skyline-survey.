const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\admin\\tasks\\client.tsx';
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('useSearchParams')) {
  content = content.replace('import { useState, useEffect } from "react"', 'import { useState, useEffect, Suspense } from "react"\nimport { useSearchParams } from "next/navigation"');
}

if (!content.includes('const searchParams = useSearchParams()')) {
  // Instead of replacing inside TasksClient, which is a bit messy, let's wrap it or add it.
  // Actually, we can just find 'const isAdmin = currentRole === "ADMIN"' and insert before it:
  // But wait, `useSearchParams` MUST be inside a component. TasksClient is the component.
  content = content.replace('export function TasksClient({ initialTasks, years, roles, currentRole, currentUserId }: any) {', 
`export function TasksClient({ initialTasks, years, roles, currentRole, currentUserId }: any) {
  const searchParams = useSearchParams()`);
}

if (!content.includes('// Auto open task details if taskId is in URL')) {
  content = content.replace('const isAdmin = currentRole === "ADMIN"',
`const isAdmin = currentRole === "ADMIN"

  useEffect(() => {
    const taskId = searchParams?.get("taskId")
    if (taskId && tasks.length > 0) {
      const task = tasks.find((t: any) => t.id === taskId)
      if (task) {
        setDetailTask(task)
      }
    }
  }, [searchParams, tasks])`);
}

// Ensure the page component export is wrapped in Suspense if it uses useSearchParams in Next.js 14
// Wait, client.tsx is just the client component. The parent is page.tsx which is a Server Component.
// Wait, Next.js requires useSearchParams to be wrapped in Suspense in the parent or inside.
// We can just rely on the existing page structure if it doesn't break, or wrap TasksClient in page.tsx if needed. Let's try without modifying page.tsx first.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added URL param handler to client.tsx');
