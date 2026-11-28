import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isManagementRole } from "@/lib/rbac-utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Vui lòng đăng nhập" },
        { status: 401 }
      );
    }

    const role = String((session.user as any)?.role || "");
    const includeManagerPii = isManagementRole(role);

    const rawCampuses = await prisma.campus.findMany({
      include: includeManagerPii
        ? {
            manager: {
              select: { id: true, fullName: true, email: true }
            }
          }
        : undefined,
      orderBy: { campusName: 'asc' }
    });

    const activeCampuses = rawCampuses.filter(c => c.status === 'ACTIVE' || !c.status);
    const result = activeCampuses.length > 0 ? activeCampuses : rawCampuses;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching campuses:", error);
    return NextResponse.json({ error: "Failed to fetch campuses" }, { status: 500 });
  }
}
