import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        academicYear: { select: { name: true } },
        importedBy: { select: { fullName: true, email: true } },
        _count: { select: { finalRecords: true } },
      },
    });

    return NextResponse.json({ success: true, batches });
  } catch (error: any) {
    console.error("History fetch error:", error);
    return NextResponse.json({ error: error.message || "Lỗi tải lịch sử" }, { status: 500 });
  }
}