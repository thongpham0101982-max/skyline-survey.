import { prisma } from "./db";

export async function logActivity(
  userId: string,
  userEmail: string,
  action: string,
  targetTable: string,
  targetId: string,
  oldValues?: any,
  newValues?: any,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || "SYSTEM",
        userEmail: userEmail || "SYSTEM",
        action,
        targetTable,
        targetId,
        oldValues: oldValues ? (typeof oldValues === "string" ? oldValues : JSON.stringify(oldValues)) : null,
        newValues: newValues ? (typeof newValues === "string" ? newValues : JSON.stringify(newValues)) : null,
        ipAddress: ipAddress || "N/A"
      }
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
