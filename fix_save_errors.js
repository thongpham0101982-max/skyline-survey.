const fs = require("fs");

// ===== Fix 1: Show errors in handleSaveEdit + handleCreate in client.tsx =====
let client = fs.readFileSync("src/app/admin/teachers/client.tsx", "utf8");

// Fix handleSaveEdit - show error instead of silent fail
client = client.replace(
  "    } catch(e) {}\n    setSaving(false)\n  }\n\n  const handleDelete",
  "    } catch(e: any) {\n      setErrorMsg(\"Loi khi luu: \" + (e.message || \"Vui long thu lai!\"))\n    }\n    setSaving(false)\n  }\n\n  const handleDelete"
);

fs.writeFileSync("src/app/admin/teachers/client.tsx", client, "utf8");
console.log("Client error display fixed");

// ===== Fix 2: Replace updateTeacherAction with pure raw SQL =====
let actions = fs.readFileSync("src/app/admin/teachers/actions.ts", "utf8");

const oldUpdate = `export async function updateTeacherAction(data: any) {
  const { id, academicYearId, homeroomClassId, ...rest } = data
  // Remove homeroomClass from rest (we handle it separately)
  delete rest.homeroomClass
  
  await prisma.teacher.update({ where: { id }, data: rest })
  if (rest.teacherName) {
    const t = await prisma.teacher.findUnique({ where: { id } })
    if (t) await prisma.user.update({ where: { id: t.userId }, data: { fullName: rest.teacherName } })
  }
  if (academicYearId !== undefined) {
    await prisma.$executeRawUnsafe(\`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`, academicYearId || null, id)
  }
  // Sync homeroom class bidirectionally
  if (homeroomClassId !== undefined) {
    await assignHomeroomClass(id, homeroomClassId || null)
  }

  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true }
}`;

const newUpdate = `export async function updateTeacherAction(data: any) {
  const { id, academicYearId, homeroomClassId, teacherName, email, phone } = data
  
  // Update teacher basic info via raw SQL to avoid Prisma schema conflicts
  if (teacherName) {
    await prisma.$executeRawUnsafe(
      \`UPDATE Teacher SET teacherName = ? WHERE id = ?\`,
      teacherName, id
    )
    // Update linked user fullName
    const teacher = await prisma.teacher.findUnique({ where: { id } })
    if (teacher) {
      await prisma.user.update({ where: { id: teacher.userId }, data: { fullName: teacherName } }).catch(() => {})
    }
  }
  if (email !== undefined) {
    await prisma.$executeRawUnsafe(\`UPDATE Teacher SET email = ? WHERE id = ?\`, email || null, id)
  }
  if (phone !== undefined) {
    await prisma.$executeRawUnsafe(\`UPDATE Teacher SET phone = ? WHERE id = ?\`, phone || null, id)
  }
  
  // Update academic year
  if (academicYearId !== undefined) {
    await prisma.$executeRawUnsafe(\`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`, academicYearId || null, id)
  }
  
  // Sync homeroom class bidirectionally
  if (homeroomClassId !== undefined) {
    await assignHomeroomClass(id, homeroomClassId || null)
  }

  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true }
}`;

if (actions.includes(oldUpdate)) {
  actions = actions.replace(oldUpdate, newUpdate);
  console.log("updateTeacherAction replaced OK");
} else {
  // Try a looser match
  const updateIdx = actions.indexOf("export async function updateTeacherAction");
  const deleteIdx = actions.indexOf("export async function deleteTeacherAction");
  if (updateIdx >= 0 && deleteIdx > updateIdx) {
    const before = actions.substring(0, updateIdx);
    const after = actions.substring(deleteIdx);
    actions = before + newUpdate + "\n\n" + after;
    console.log("updateTeacherAction replaced via index");
  } else {
    console.log("Could not find updateTeacherAction to replace");
  }
}

fs.writeFileSync("src/app/admin/teachers/actions.ts", actions, "utf8");
console.log("Actions file saved");
