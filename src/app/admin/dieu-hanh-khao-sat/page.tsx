import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEntranceProgressDashboardData } from "@/lib/entrance-progress/entranceProgressEngine";
import { EntranceOperationsDashboardClient } from "./client";

export const metadata = {
  title: "Điều hành & Tiến độ Khảo sát Đầu vào | Sky-Line SSM",
};

export const dynamic = "force-dynamic";

export default async function EntranceOperationsDashboardPage() {
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error in EntranceOperationsDashboardPage:", e);
  }

  const user = session?.user as any;
  let rolePermissions: any[] = [];
  try {
    if (user?.role) {
      rolePermissions = await prisma.permission.findMany({
        where: { roleCode: user.role },
      });
    }
  } catch {
    rolePermissions = [];
  }

  let initialData: any = null;
  try {
    initialData = await getEntranceProgressDashboardData({});
  } catch (err) {
    console.error("Initial dashboard data fetch error:", err);
  }

  return (
    <EntranceOperationsDashboardClient
      initialData={initialData}
      currentUser={{
        id: user?.id || "",
        fullName: user?.fullName || user?.name || "Cán bộ điều hành",
        role: user?.role || "ADMIN",
        email: user?.email || "",
        isSuperAdmin: Boolean(
          user?.isSuperAdmin || (user?.role || "").toUpperCase() === "ADMIN"
        ),
        campusIds: user?.campusIds || [],
      }}
      rolePermissions={rolePermissions}
    />
  );
}
