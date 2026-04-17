const fs = require('fs');

// ============ 1. Patch page.tsx - Filter tasks for specific user ============
const pagePath = 'src/app/admin/tasks/page.tsx';
let page = fs.readFileSync(pagePath, 'utf8');

const oldPageFilter = `  let whereClause: any = {}
  if (role !== "ADMIN") {
    whereClause = {
      OR: [
        { assignedToRole: role },
        { assignedToUserId: userId }
      ]
    }
  }`;

const newPageFilter = `  let whereClause: any = {}
  if (role !== "ADMIN") {
    // KT_DBCL and other non-admin users only see:
    // 1. Tasks assigned specifically to them (by userId)
    // 2. Tasks assigned to their role group WITHOUT a specific user (whole-group tasks)
    whereClause = {
      OR: [
        { assignedToUserId: userId },
        { assignedToRole: role, assignedToUserId: null }
      ]
    }
  }`;

if (page.includes(oldPageFilter)) {
  page = page.replace(oldPageFilter, newPageFilter);
  fs.writeFileSync(pagePath, page);
  console.log('SUCCESS: page.tsx updated - tasks filtered by user');
} else {
  console.log('ERROR: Could not find target in page.tsx');
  const lines = page.split('\n');
  for (let i = 16; i < 26 && i < lines.length; i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
}

// ============ 2. Patch layout.tsx - Task count for specific user ============
const layoutPath = 'src/app/admin/layout.tsx';
let layout = fs.readFileSync(layoutPath, 'utf8');

const oldLayoutCount = `  // Count pending tasks for notification badge
  const taskCount = await prisma.workTask.count({
    where: {
      assignedToRole: roleCode,
      progress: { in: ["PENDING", "IN_PROGRESS"] }
    }
  })`;

const newLayoutCount = `  // Count pending tasks for notification badge (only tasks for this specific user)
  const currentUserId = (session?.user as any)?.id || ""
  const taskCount = await prisma.workTask.count({
    where: {
      OR: [
        { assignedToUserId: currentUserId, progress: { in: ["PENDING", "IN_PROGRESS"] } },
        { assignedToRole: roleCode, assignedToUserId: null, progress: { in: ["PENDING", "IN_PROGRESS"] } }
      ]
    }
  })`;

if (layout.includes(oldLayoutCount)) {
  layout = layout.replace(oldLayoutCount, newLayoutCount);
  fs.writeFileSync(layoutPath, layout);
  console.log('SUCCESS: layout.tsx updated - task count filtered by user');
} else {
  console.log('ERROR: Could not find target in layout.tsx');
  const lines = layout.split('\n');
  for (let i = 16; i < 25 && i < lines.length; i++) {
    console.log((i+1) + ': ' + lines[i]);
  }
}

console.log('\nAll patches complete!');
