import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const academicYearId = (formData.get("academicYearId") as string) || "";
    const semester = parseInt((formData.get("semester") as string) || "1", 10);
    const assessmentPeriod = (formData.get("assessmentPeriod") as string) || "CUOI_KY_1";

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn file Excel" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    const existingBatch = await prisma.importBatch.findFirst({
      where: { fileHash, status: "COMMITTED" },
      include: { importedBy: { select: { fullName: true } } },
    });

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "File Excel rỗng" }, { status: 400 });
    }

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const rowStr = rawRows[i].map((c) => String(c).toLowerCase()).join(" ");
      if (rowStr.includes("mã học sinh") || rowStr.includes("ma hoc sinh") || rowStr.includes("môn học") || rowStr.includes("mon hoc")) {
        headerRowIdx = i; break;
      }
    }

    const headers = rawRows[headerRowIdx].map((h) => String(h).trim());
    const dataRows = rawRows.slice(headerRowIdx + 1).filter((r) => r.some((c) => c !== "" && c !== null));

    const mapping: Record<string, string> = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes("năm học") || lower.includes("nam hoc")) mapping["academicYear"] = h;
      else if (lower.includes("mã học sinh") || lower.includes("ma hoc sinh") || lower === "ma_hs" || lower === "student_code") mapping["studentCode"] = h;
      else if (lower.includes("họ và tên") || lower.includes("ho va ten") || lower.includes("họ tên") || lower === "ho_ten") mapping["studentName"] = h;
      else if (lower.includes("lớp") || lower.includes("lop") || lower === "class") mapping["className"] = h;
      else if (lower.includes("môn học") || lower.includes("mon hoc") || lower === "mon") mapping["subjectName"] = h;
      else if (lower.includes("năng lực") || lower.includes("nang luc") || lower === "competency") mapping["competencyName"] = h;
      else if (lower.includes("tổng giá trị") || lower.includes("tong gia tri") || lower.includes("điểm đạt") || lower === "achieved") mapping["achievedScore"] = h;
      else if (lower.includes("tối đa") || lower.includes("toi da") || lower.includes("điểm tối đa") || lower === "max") mapping["maxScore"] = h;
      else if (lower.includes("%_thucte_radar") || lower.includes("thực tế radar") || lower.includes("radar") || lower.includes("%")) mapping["radarPercent"] = h;
    });

    const batchCode = "IMP_NL_" + Date.now().toString(36).toUpperCase();
    let activeYear = null;
    if (academicYearId) {
      activeYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
    } else {
      activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    }
    if (!activeYear) {
      activeYear = await prisma.academicYear.findFirst();
    }

    const batch = await prisma.importBatch.create({
      data: {
        batchCode,
        fileName: file.name,
        fileSize: file.size,
        fileHash,
        academicYearId: activeYear ? activeYear.id : "",
        semester,
        assessmentPeriod,
        importedById: user.id,
        status: "STAGED",
        totalRows: dataRows.length,
      },
    });

    const previewRows = dataRows.slice(0, 10).map((r, idx) => {
      const rowObj: Record<string, any> = { _rowNum: idx + 1 + headerRowIdx + 1 };
      headers.forEach((h, cIdx) => {
        rowObj[h] = r[cIdx] !== undefined ? r[cIdx] : "";
      });
      return rowObj;
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      batchCode: batch.batchCode,
      fileName: file.name,
      totalRows: dataRows.length,
      headers,
      mapping,
      previewRows,
      hasCommittedDuplicate: !!existingBatch,
      duplicateInfo: existingBatch
        ? {
            fileName: existingBatch.fileName,
            importedBy: existingBatch.importedBy?.fullName,
            createdAt: existingBatch.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xử lý file Excel" }, { status: 500 });
  }
}