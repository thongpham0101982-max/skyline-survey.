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
  let resolvedIp = ipAddress;
  if (!resolvedIp) {
    try {
      const { headers } = require('next/headers');
      const reqHeaders = await headers();
      resolvedIp = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
    } catch (e) {
      resolvedIp = '127.0.0.1';
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || "SYSTEM",
        userEmail: userEmail || "SYSTEM",
        action,
        targetTable: targetTable || "System",
        targetId: targetId || "SYSTEM",
        oldValues: oldValues ? (typeof oldValues === "string" ? oldValues : JSON.stringify(oldValues)) : null,
        newValues: newValues ? (typeof newValues === "string" ? newValues : JSON.stringify(newValues)) : null,
        ipAddress: resolvedIp
      }
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
