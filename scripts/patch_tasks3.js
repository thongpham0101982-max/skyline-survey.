const fs = require('fs');
const actionsPath = 'src/app/admin/tasks/actions.ts';
let actions = fs.readFileSync(actionsPath, 'utf8');

// Patch createTask to send notification to the assigned user
const oldCreate = /export async function createTask\(data: any\) \{\r?\n\s+try \{\r?\n\s+const session = await auth\(\)\r?\n\s+if \(!session\?\.user\) return \{ success: false, error: "Chua dang nhap" \}\r?\n\s+await prisma\.workTask\.create\(\{/;

const match = actions.match(oldCreate);
if (match) {
  const replacement = `export async function createTask(data: any) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chua dang nhap" }
    const task = await prisma.workTask.create({`;
  actions = actions.replace(oldCreate, replacement);
  
  // Now add notification after the task is created
  const oldRevalidate = /revalidatePath\("\/admin\/tasks"\)\r?\n\s+return \{ success: true \}\r?\n\s+\} catch/;
  const revalidateMatch = actions.match(oldRevalidate);
  if (revalidateMatch) {
    // Replace only the first occurrence (createTask function)
    const idx = actions.indexOf(revalidateMatch[0]);
    const before = actions.substring(0, idx);
    const after = actions.substring(idx + revalidateMatch[0].length);
    
    const newBlock = `// Send notification to the assigned user(s)
    const adminName = (session.user as any).name || (session.user as any).email || "Admin"
    if (data.assignedToUserId) {
      // Notify specific user
      await prisma.notification.create({
        data: {
          userId: data.assignedToUserId,
          title: "[Giao viec] " + data.title,
          message: adminName + " da giao cong viec cho ban. Han chot: " + new Date(data.endDate).toLocaleDateString("vi-VN"),
          isRead: false
        }
      })
    } else {
      // Notify all users in the role group
      const roleUsers = await prisma.user.findMany({
        where: { role: data.assignedToRole || "KT_DBCL", status: "ACTIVE" },
        select: { id: true }
      })
      for (const u of roleUsers) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            title: "[Giao viec] " + data.title,
            message: adminName + " da giao cong viec cho nhom ban. Han chot: " + new Date(data.endDate).toLocaleDateString("vi-VN"),
            isRead: false
          }
        })
      }
    }
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch`;
    
    actions = before + newBlock + after;
    fs.writeFileSync(actionsPath, actions);
    console.log('SUCCESS: actions.ts updated - createTask now sends notifications');
  } else {
    console.log('ERROR: Could not find revalidatePath in createTask');
  }
} else {
  console.log('ERROR: Could not find createTask pattern');
}
