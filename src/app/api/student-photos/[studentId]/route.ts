// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const codeParam = req.nextUrl.searchParams.get("code")?.trim() || "";

    if (!studentId && !codeParam) {
      return new NextResponse("Missing studentId or code", { status: 400 });
    }

    // 1. Try direct find by studentId
    let photo = null;
    if (studentId) {
      photo = await prisma.studentPhoto.findUnique({
        where: { studentId },
      });
    }

    // 2. If not found, find matching student records by id or studentCode
    if (!photo) {
      const searchTerms = [studentId, codeParam].filter(Boolean);
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { id: { in: searchTerms } },
            { studentCode: { in: searchTerms } },
          ],
        },
        select: { id: true, studentCode: true },
      });

      if (student?.studentCode) {
        // Find ALL student records that share this studentCode across all years/campuses
        const allStudentsWithCode = await prisma.student.findMany({
          where: { studentCode: student.studentCode },
          select: { id: true },
        });
        const allIds = Array.from(new Set([student.id, ...allStudentsWithCode.map((s) => s.id)]));

        photo = await prisma.studentPhoto.findFirst({
          where: { studentId: { in: allIds } },
          orderBy: { updatedAt: "desc" },
        });
      }
    }

    // 3. Return photo if found in DB
    if (photo && photo.photoData) {
      let cleanBase64 = photo.photoData;
      let contentType = photo.contentType || "image/jpeg";

      if (cleanBase64.includes(",")) {
        const parts = cleanBase64.split(",");
        const header = parts[0];
        cleanBase64 = parts[1];
        if (header.includes("image/png")) contentType = "image/png";
        else if (header.includes("image/webp")) contentType = "image/webp";
        else if (header.includes("image/jpeg") || header.includes("image/jpg")) contentType = "image/jpeg";
      }

      const buffer = Buffer.from(cleanBase64, "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    // 4. Fallback: check filesystem uploads
    try {
      const candidates = [
        studentId,
        codeParam,
      ].filter(Boolean);

      for (const idOrCode of candidates) {
        for (const ext of ["jpg", "jpeg", "png", "webp"]) {
          const localPath = path.join(process.cwd(), "public", "uploads", "students", `${idOrCode}.${ext}`);
          if (fs.existsSync(localPath)) {
            const fileBuffer = fs.readFileSync(localPath);
            const ct = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
            return new NextResponse(fileBuffer, {
              headers: {
                "Content-Type": ct,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
              },
            });
          }
        }
      }
    } catch (e) {}

    return new NextResponse("Photo not found", { status: 404 });
  } catch (error: any) {
    console.error("Serve Student Photo Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    let base64Data = "";
    let contentType = "image/jpeg";

    const reqContentType = req.headers.get("content-type") || "";

    if (reqContentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Chỉ cho phép tải lên tệp hình ảnh (JPG, PNG, WebP)" }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Dung lượng ảnh vượt quá giới hạn 5MB" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      contentType = file.type || "image/jpeg";
      base64Data = `data:${contentType};base64,${buffer.toString("base64")}`;
    } else {
      const body = await req.json();
      if (!body.photoData) {
        return NextResponse.json({ error: "Missing photoData" }, { status: 400 });
      }
      base64Data = body.photoData;
      contentType = body.contentType || "image/jpeg";
    }

    // Find student to get studentCode
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { studentCode: studentId }
        ]
      },
      select: { id: true, studentCode: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Học sinh không tồn tại trong hệ thống" }, { status: 404 });
    }

    // Find all student IDs with same studentCode to sync avatar across all school years
    const matchingStudents = await prisma.student.findMany({
      where: { studentCode: student.studentCode },
      select: { id: true },
    });

    const targetIds = Array.from(new Set([student.id, studentId, ...matchingStudents.map((s) => s.id)]));

    for (const sId of targetIds) {
      await prisma.studentPhoto.upsert({
        where: { studentId: sId },
        create: {
          studentId: sId,
          photoData: base64Data,
          contentType,
        },
        update: {
          photoData: base64Data,
          contentType,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, count: targetIds.length });
  } catch (error: any) {
    console.error("Save Student Photo Error:", error);
    return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = await params;
    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { studentCode: studentId }
        ]
      },
      select: { id: true, studentCode: true },
    });

    if (student?.studentCode) {
      const matchingStudents = await prisma.student.findMany({
        where: { studentCode: student.studentCode },
        select: { id: true },
      });
      const allIds = Array.from(new Set([student.id, studentId, ...matchingStudents.map((s) => s.id)]));
      await prisma.studentPhoto.deleteMany({
        where: { studentId: { in: allIds } },
      });
    } else {
      await prisma.studentPhoto.deleteMany({
        where: { studentId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Student Photo Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
