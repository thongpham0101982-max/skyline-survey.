import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasModulePermission } from "@/lib/permissions";
import { getAdminSession } from "@/lib/session";
import DepartmentsClient from "./client";

export const metadata = { title: "Quản lý Tổ & Bộ Phận Chuyên Môn | Admin Portal" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as any)?.role || "";
  const adminSession = await getAdminSession();
  const hasPerm =
    adminSession.isFullAccess ||
    adminSession.isSuperAdmin ||
    adminSession.isHeadOfAcademic ||
    adminSession.isGDCS ||
    adminSession.isTBP ||
    adminSession.isTTCM ||
    (await hasModulePermission(role, "DEPARTMENTS", "canRead"));

  if (!hasPerm) {
    redirect("/admin");
  }

  return <DepartmentsClient currentSession={adminSession} />;
}
