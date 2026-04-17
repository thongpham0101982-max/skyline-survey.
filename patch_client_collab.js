const fs = require('fs');
const clientPath = 'src/app/admin/tasks/client.tsx';
let client = fs.readFileSync(clientPath, 'utf8');

// 1. Add import for TaskDetailPanel
const oldImport = 'import { createTask, updateTask, deleteTask, remindTask, updateTaskProgress, getUsersByRole, respondToTask } from "./actions"';
const newImport = `import { createTask, updateTask, deleteTask, remindTask, updateTaskProgress, getUsersByRole, respondToTask } from "./actions"
import { TaskDetailPanel } from "./TaskDetailPanel"`;

if (client.includes(oldImport) && !client.includes('TaskDetailPanel')) {
  client = client.replace(oldImport, newImport);
  console.log('OK: Import added');
} else {
  console.log('SKIP: Import');
}

// 2. Add state for detail panel (after respondNote state)
const oldState = '  const [submitting, setSubmitting] = useState(false)';
const newState = `  const [submitting, setSubmitting] = useState(false)
  const [detailTask, setDetailTask] = useState<any>(null)`;

if (client.includes(oldState) && !client.includes('detailTask')) {
  client = client.replace(oldState, newState);
  console.log('OK: State added');
} else {
  console.log('SKIP: State');
}

// 3. Add a click handler on the task title to open detail panel 
// Replace the title display with a clickable version
const oldTitle = '{t.title}</div>';
const newTitle = '{t.title}</div>';
// Actually, let me target the specific line with the title
const oldTitleLine = '<div className={"font-semibold " + (isOverdue ? "text-red-800" : "text-slate-800")}>{t.title}</div>';
const newTitleLine = '<div className={"font-semibold cursor-pointer hover:text-indigo-600 transition-colors " + (isOverdue ? "text-red-800" : "text-slate-800")} onClick={() => setDetailTask(t)}>{t.title}</div>';

if (client.includes(oldTitleLine)) {
  client = client.replace(oldTitleLine, newTitleLine);
  console.log('OK: Title click handler added');
} else {
  console.log('WARN: Title line not found, trying alternate');
  // Try with escaped quotes
  const altOld = `className={"font-semibold " + (isOverdue ? "text-red-800" : "text-slate-800")}>{t.title}`;
  if (client.includes(altOld)) {
    client = client.replace(altOld, `className={"font-semibold cursor-pointer hover:text-indigo-600 transition-colors " + (isOverdue ? "text-red-800" : "text-slate-800")} onClick={() => setDetailTask(t)}>{t.title}`);
    console.log('OK: Title click handler added (alt)');
  } else {
    console.log('ERROR: Could not find title line');
  }
}

// 4. Add TaskDetailPanel component before the closing </div> of the main return
// Find the last closing </div> of the component
const closingPattern = '    </div>\n  )\n}';
const panelJSX = `      {/* Task Detail Panel */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setDetailTask(null)}
        />
      )}
    </div>
  )
}`;

if (client.includes(closingPattern) && !client.includes('TaskDetailPanel')) {
  // Only replace the LAST occurrence
  const lastIdx = client.lastIndexOf(closingPattern);
  client = client.substring(0, lastIdx) + panelJSX + client.substring(lastIdx + closingPattern.length);
  console.log('OK: TaskDetailPanel JSX added');
} else {
  console.log('WARN: Could not add panel JSX');
}

fs.writeFileSync(clientPath, client);
console.log('Client updated!');
