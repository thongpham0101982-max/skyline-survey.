import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDivisionByCode } from "@/config/divisions";
import { getAdminSession } from "@/lib/session";
import { z } from "zod";

async function checkDeptPermission() {
  const session = await getAdminSession();
  if (!session || !session.userId) {
    return { error: "Unauthorized: Vui lòng đăng nhập", status: 401 };
  }
  const canManage = session.isFullAccess || session.isSuperAdmin || session.isHeadOfAcademic || session.isGDCS || session.isTBP;
  if (!canManage) {
    return { error: "Forbidden: Bạn không có quyền quản lý cơ cấu tổ chức", status: 403 };
  }
  return { session };
}

const DepartmentInputSchema = z.object({
  code: z.string().trim().min(2, "Mã Tổ phải có ít nhất 2 ký tự").max(50, "Mã Tổ tối đa 50 ký tự"),
  name: z.string().trim().min(2, "Tên Tổ phải có ít nhất 2 ký tự").max(100, "Tên Tổ tối đa 100 ký tự"),
  description: z.string().trim().max(500).optional().nullable(),
  divisionCode: z.string().trim().optional().nullable(),
  blockCM: z.string().trim().optional().nullable(),
  teamsWebhookUrl: z.string().trim().url("Webhook URL không hợp lệ").optional().nullable().or(z.literal("")),
});

export async function GET() {
  try {
    const [departments, divisionAssignments] = await Promise.all([
      prisma.department.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              teachers: true,
              teacherAssignments: true
            }
          }
        }
      }),
      (prisma as any).teacherDivisionAssignment?.findMany({
        include: {
          teacher: {
            select: {
              id: true,
              teacherCode: true,
              teacherName: true,
              email: true,
              phone: true,
              campus: { select: { campusName: true } }
            }
          }
        }
      }).catch(() => [])
    ]);

    return NextResponse.json({
      departments,
      divisionAssignments: divisionAssignments || []
    });
  } catch (error: any) {
    console.error("Error fetching departments:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const perm = await checkDeptPermission();
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const body = await req.json();
    const { action, code, name, description, blockCM, divisionCode, teamsWebhookUrl, departmentIds, teacherId, targetDivisionCode } = body;

    // Batch Assign Departments to Division
    if (action === "batchAssignDivision" || action === "batchAssign") {
      if (!targetDivisionCode || !Array.isArray(departmentIds) || departmentIds.length === 0) {
        return NextResponse.json({ error: "Vui lòng chọn Bộ Phận và ít nhất 1 Tổ chuyên môn" }, { status: 400 });
      }
      const divMeta = getDivisionByCode(targetDivisionCode);
      const autoBlockCM = divMeta?.defaultBlockCM || null;

      await prisma.department.updateMany({
        where: { id: { in: departmentIds } },
        data: {
          divisionCode: targetDivisionCode,
          ...(autoBlockCM ? { blockCM: autoBlockCM } : {})
        }
      });

      return NextResponse.json({ success: true, count: departmentIds.length });
    }

    // Assign Head of Division (TBP)
    if (action === "assignDivisionHead" || action === "assignTBP") {
      if (!targetDivisionCode || !teacherId) {
        return NextResponse.json({ error: "Thiếu mã Bộ phận hoặc ID Giáo viên" }, { status: 400 });
      }

      const pAny = prisma as any;
      if (pAny.teacherDivisionAssignment) {
        await pAny.teacherDivisionAssignment.upsert({
          where: {
            teacherId_divisionCode: {
              teacherId,
              divisionCode: targetDivisionCode
            }
          },
          create: {
            teacherId,
            divisionCode: targetDivisionCode,
            roleInDivision: "TBP"
          },
          update: {
            roleInDivision: "TBP"
          }
        });
      }

      return NextResponse.json({ success: true });
    }

    // Remove Head of Division
    if (action === "removeDivisionHead" || action === "removeTBP") {
      const pAny = prisma as any;
      if (pAny.teacherDivisionAssignment) {
        await pAny.teacherDivisionAssignment.deleteMany({
          where: {
            divisionCode: targetDivisionCode,
            ...(teacherId ? { teacherId } : {})
          }
        });
      }
      return NextResponse.json({ success: true });
    }

    // Standard Create Department with Zod validation
    const parsed = DepartmentInputSchema.safeParse({
      code,
      name,
      description,
      divisionCode,
      blockCM,
      teamsWebhookUrl
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const trimmedCode = parsed.data.code.toUpperCase();
    const trimmedName = parsed.data.name;

    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { code: trimmedCode },
          { name: trimmedName }
        ]
      }
    });

    if (existing) {
      if (existing.code === trimmedCode) {
        return NextResponse.json({ error: `Mã Tổ "${trimmedCode}" đã tồn tại.` }, { status: 400 });
      }
      return NextResponse.json({ error: `Tên Tổ "${trimmedName}" đã tồn tại.` }, { status: 400 });
    }

    const divMeta = parsed.data.divisionCode ? getDivisionByCode(parsed.data.divisionCode) : undefined;
    const finalBlockCM = parsed.data.blockCM || (divMeta?.defaultBlockCM || null);

    const department = await prisma.department.create({
      data: {
        code: trimmedCode,
        name: trimmedName,
        description: parsed.data.description || null,
        divisionCode: parsed.data.divisionCode || null,
        blockCM: finalBlockCM,
        teamsWebhookUrl: parsed.data.teamsWebhookUrl || null,
        status: "ACTIVE"
      }
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error: any) {
    console.error("Error creating department:", error);
    return NextResponse.json({ error: error.message || "Failed to create department" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const perm = await checkDeptPermission();
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const body = await req.json();
    const { id, code, name, description, blockCM, divisionCode, teamsWebhookUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID Tổ chuyên môn" }, { status: 400 });
    }

    const parsed = DepartmentInputSchema.safeParse({
      code,
      name,
      description,
      divisionCode,
      blockCM,
      teamsWebhookUrl
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const trimmedCode = parsed.data.code.toUpperCase();
    const trimmedName = parsed.data.name;

    const duplicate = await prisma.department.findFirst({
      where: {
        id: { not: id },
        OR: [
          { code: trimmedCode },
          { name: trimmedName }
        ]
      }
    });

    if (duplicate) {
      if (duplicate.code === trimmedCode) {
        return NextResponse.json({ error: `Mã Tổ "${trimmedCode}" đã được sử dụng ở tổ khác.` }, { status: 400 });
      }
      return NextResponse.json({ error: `Tên Tổ "${trimmedName}" đã được sử dụng ở tổ khác.` }, { status: 400 });
    }

    const divMeta = parsed.data.divisionCode ? getDivisionByCode(parsed.data.divisionCode) : undefined;
    const finalBlockCM = parsed.data.blockCM || (divMeta?.defaultBlockCM || null);

    const department = await prisma.department.update({
      where: { id },
      data: {
        code: trimmedCode,
        name: trimmedName,
        description: parsed.data.description || null,
        divisionCode: parsed.data.divisionCode || null,
        blockCM: finalBlockCM,
        teamsWebhookUrl: parsed.data.teamsWebhookUrl || null
      }
    });

    return NextResponse.json(department);
  } catch (error: any) {
    console.error("Error updating department:", error);
    return NextResponse.json({ error: error.message || "Failed to update department" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const perm = await checkDeptPermission();
    if (perm.error) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");

    let idList: string[] = [];
    if (ids) {
      idList = ids.split(",").map(i => i.trim()).filter(Boolean);
    } else if (id) {
      idList = [id.trim()];
    }

    if (idList.length === 0) {
      return NextResponse.json({ error: "Thiếu ID để xóa" }, { status: 400 });
    }

    // Unlink teachers referencing these departments
    await prisma.teacher.updateMany({
      where: { departmentId: { in: idList } },
      data: { departmentId: null }
    });

    // Delete departments (cascade will clean up assignments)
    await prisma.department.deleteMany({
      where: { id: { in: idList } }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting department:", error);
    return NextResponse.json({ error: error.message || "Failed to delete department" }, { status: 500 });
  }
}
