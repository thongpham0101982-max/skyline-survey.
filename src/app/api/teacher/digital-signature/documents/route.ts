import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignatureService } from "@/lib/digital-signature/signature-service";
import { SignableFormType } from "@/lib/digital-signature/types";

export const dynamic = "force-dynamic";

/**
 * GET: Lấy danh sách hồ sơ cần ký của giáo viên hiện tại theo phân công giảng dạy
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const teacher = await (prisma as any).teacher.findUnique({
      where: { userId },
      include: {
        TeachingAssignment: {
          include: { class: true, subject: true },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ giáo viên" }, { status: 404 });
    }

    // Lớp chủ nhiệm (nếu có)
    const homeroomClasses = await (prisma as any).class.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacherId: { contains: teacher.id } },
        ],
      },
    }).catch(() => []);

    // Danh sách lớp và môn được phân công
    const assignedClassIds = Array.from(
      new Set([
        ...teacher.TeachingAssignment.map((a: any) => a.classId),
        ...homeroomClasses.map((c: any) => c.id),
      ])
    ).filter(Boolean);

    const assignedSubjectIds = Array.from(
      new Set(teacher.TeachingAssignment.map((a: any) => a.subjectId))
    ).filter(Boolean);

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const campusId = searchParams.get("campusId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const formType = searchParams.get("formType");
    const status = searchParams.get("status");
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    // Điều kiện lọc CSDL
    const where: any = {
      classId: { in: assignedClassIds.length > 0 ? assignedClassIds : ["NONE"] },
    };

    if (academicYearId) where.academicYearId = academicYearId;
    if (campusId) where.campusId = campusId;
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;
    if (formType) where.formType = formType;

    // Filter theo status: DRAFT, READY_TO_SIGN, SIGNED, REVISION_REQUIRED, FAILED
    if (status) {
      if (status === "SIGNED") {
        where.isCompleted = true;
      } else if (status === "READY_TO_SIGN") {
        where.isCompleted = false;
        where.contentStatus = "READY_TO_SIGN";
      } else if (status === "REVISION_REQUIRED") {
        where.contentStatus = "REVISION_REQUIRED";
      }
    }

    const documents = await (prisma as any).signableDocument.findMany({
      where,
      include: {
        student: true,
        class: true,
        academicYear: true,
        signatures: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    // Lọc theo search text (mã hoặc họ tên học sinh)
    const filteredDocs = search
      ? documents.filter(
          (d: any) =>
            d.student?.fullName?.toLowerCase().includes(search) ||
            d.student?.studentCode?.toLowerCase().includes(search) ||
            d.documentCode?.toLowerCase().includes(search)
        )
      : documents;

    // Thống kê nhanh theo 4 nhóm
    const allAssignedDocs = await (prisma as any).signableDocument.findMany({
      where: {
        classId: { in: assignedClassIds.length > 0 ? assignedClassIds : ["NONE"] },
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        signatures: true,
      },
    });

    let countPending = 0;
    let countSigned = 0;
    let countRevision = 0;
    let countFailed = 0;

    allAssignedDocs.forEach((d: any) => {
      const hasFailedSig = d.signatures.some((s: any) => s.requestStatus === "FAILED");
      if (hasFailedSig) {
        countFailed++;
      } else if (d.contentStatus === "REVISION_REQUIRED") {
        countRevision++;
      } else if (d.isCompleted) {
        countSigned++;
      } else {
        countPending++;
      }
    });

    // Định dạng dữ liệu trả về cho bảng Sổ cái học thuật
    const formattedDocs = filteredDocs.map((doc: any) => {
      const mySignature = doc.signatures.find((s: any) => s.signerId === teacher.id);
      const latestSignature = doc.signatures[0];

      // Xác định vai trò của giáo viên đối với tài liệu này
      const isHomeroom = homeroomClasses.some((c: any) => c.id === doc.classId);
      const roleText = isHomeroom ? "GVCN" : "GVBM";

      return {
        id: doc.id,
        documentCode: doc.documentCode,
        formType: doc.formType,
        title: doc.title,
        version: doc.version,
        term: doc.term || "Cả năm",
        studentId: doc.studentId,
        studentName: doc.student?.fullName || "Học sinh",
        studentCode: doc.student?.studentCode || "",
        classId: doc.classId,
        className: doc.class?.className || "",
        campusId: doc.campusId,
        academicYearId: doc.academicYearId,
        academicYearName: doc.academicYear?.name || "",
        subjectId: doc.subjectId,
        contentHash: doc.contentHash,
        contentStatus: doc.contentStatus,
        publicationStatus: doc.publicationStatus,
        isCompleted: doc.isCompleted,
        signerRole: roleText,
        mySignatureStatus: mySignature ? mySignature.requestStatus : "NOT_SIGNED",
        latestSignature: latestSignature
          ? {
              status: latestSignature.requestStatus,
              signerRole: latestSignature.signerRole,
              signerName: latestSignature.signerName,
              signedAt: latestSignature.signedAt,
              certificateSerial: latestSignature.certificateSerial,
              requestId: latestSignature.requestId,
              signedPdfPath: latestSignature.signedPdfPath,
            }
          : null,
        signaturesCount: doc.signatures.filter((s: any) => s.requestStatus === "SUCCESS").length,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    return NextResponse.json({
      stats: {
        pending: countPending,
        signed: countSigned,
        revisionRequired: countRevision,
        failed: countFailed,
        total: allAssignedDocs.length,
      },
      documents: formattedDocs,
      teacher: {
        id: teacher.id,
        teacherName: teacher.teacherName,
        teacherCode: teacher.teacherCode,
      },
    });
  } catch (err: any) {
    console.error("Lỗi khi tải hồ sơ chờ ký:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

/**
 * POST: Tạo tài liệu cần ký số từ form / sổ điểm (Hoàn thành và đưa vào danh sách ký số)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const teacher = await (prisma as any).teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });
    }

    const body = await req.json();
    const {
      studentId,
      academicYearId,
      classId,
      campusId,
      subjectId,
      formType,
      term,
      title,
      contentSnapshot,
    } = body;

    if (!studentId || !academicYearId || !classId || !formType || !title || !contentSnapshot) {
      return NextResponse.json(
        { error: "Thiếu các thông tin bắt buộc để khởi tạo tài liệu ký số." },
        { status: 400 }
      );
    }

    // 1. Kiểm tra phân công
    const assignCheck = await SignatureService.verifyTeacherAssignment(
      teacher.id,
      classId,
      subjectId,
      academicYearId
    );

    if (!assignCheck.isAssigned) {
      return NextResponse.json(
        { error: `Từ chối: ${assignCheck.reason}` },
        { status: 403 }
      );
    }

    // 2. Tạo hoặc cập nhật phiên bản tài liệu
    const signableDoc = await SignatureService.getOrCreateSignableDocument({
      studentId,
      academicYearId,
      classId,
      campusId,
      subjectId,
      formType: formType as SignableFormType,
      term,
      title,
      contentSnapshot,
    });

    return NextResponse.json({
      success: true,
      message: "Đã khởi tạo phiên bản tài liệu thành công.",
      document: signableDoc,
    });
  } catch (err: any) {
    console.error("Lỗi khi khởi tạo tài liệu ký:", err);
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
