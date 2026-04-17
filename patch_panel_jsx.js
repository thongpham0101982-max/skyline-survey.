const fs = require('fs');
const clientPath = 'src/app/admin/tasks/client.tsx';
let client = fs.readFileSync(clientPath, 'utf8');

// Find the pattern with \r\n line endings
const pattern = '    </div>\r\n  )\r\n}\r\n';
const lastIdx = client.lastIndexOf(pattern);
if (lastIdx === -1) {
  // Try without \r
  const pattern2 = '    </div>\n  )\n}\n';
  const lastIdx2 = client.lastIndexOf(pattern2);
  if (lastIdx2 === -1) {
    console.log('ERROR: Cannot find closing pattern');
    // Show last 50 chars
    console.log('Last 100 chars:', JSON.stringify(client.slice(-100)));
  } else {
    const replacement = `      {/* Task Detail / Collaboration Panel */}
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
}
`;
    client = client.substring(0, lastIdx2) + replacement;
    fs.writeFileSync(clientPath, client);
    console.log('OK: Panel JSX added (unix endings)');
  }
} else {
  const replacement = `      {/* Task Detail / Collaboration Panel */}\r\n      {detailTask && (\r\n        <TaskDetailPanel\r\n          task={detailTask}\r\n          currentUserId={currentUserId}\r\n          isAdmin={isAdmin}\r\n          onClose={() => setDetailTask(null)}\r\n        />\r\n      )}\r\n    </div>\r\n  )\r\n}\r\n`;
  client = client.substring(0, lastIdx) + replacement;
  fs.writeFileSync(clientPath, client);
  console.log('OK: Panel JSX added (windows endings)');
}
