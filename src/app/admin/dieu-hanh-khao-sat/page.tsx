import { auth } from "@/lib/auth";
import { getRolePermissions } from "@/lib/permissions";
import {
  getEntranceProgressDashboardData,
  resolveEntranceViewerScope,
} from "@/lib/entrance-progress/entranceProgressEngine";
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
      rolePermissions = await getRolePermissions(user.role);
    }
  } catch {
    rolePermissions = [];
  }

  const viewerScope = await resolveEntranceViewerScope(user);

  let initialData: any = null;
  try {
    initialData = await getEntranceProgressDashboardData({
      viewerRole: viewerScope.viewerRole,
      isSuperAdmin: viewerScope.isSuperAdmin,
      allowedCampusCodes: viewerScope.allowedCampusCodes,
    });
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
        isSuperAdmin: viewerScope.isSuperAdmin,
        campusIds: viewerScope.liveCampusIds,
      }}
      rolePermissions={rolePermissions}
    />
  );
}
