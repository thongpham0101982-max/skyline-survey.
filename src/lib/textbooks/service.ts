import { prisma } from "@/lib/db";
import crypto from "crypto";

export interface TextbookFilterOptions {
  schoolYearId?: string;
  grade?: string;
  subjectId?: string;
  seriesId?: string;
  publisherId?: string;
  processingStatus?: string;
  search?: string;
  sourceType?: string;
}

/**
 * Tính mã SHA256 của file buffer để kiểm tra trùng lặp
 */
export function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Kiểm tra xem URL có thuộc whitelist domain được phê duyệt hay không (Mục VII)
 */
export async function validateSourceUrl(urlStr: string): Promise<{ valid: boolean; source?: any; reason?: string }> {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    const sources = await prisma.textbookSource.findMany({
      where: { status: "ACTIVE" }
    });

    for (const src of sources) {
      try {
        const allowed: string[] = JSON.parse(src.allowedDomains || "[]");
        const isMatch = allowed.some((domain) => {
          const d = domain.toLowerCase().trim();
          return hostname === d || hostname.endsWith(`.${d}`);
        });

        if (isMatch) {
          if (!src.downloadAllowed) {
            return { valid: false, reason: `Nguồn '${src.sourceName}' không cho phép tải file trực tiếp.` };
          }
          return { valid: true, source: src };
        }
      } catch (e) {
        // Skip invalid JSON domain configuration
      }
    }

    return {
      valid: false,
      reason: `Tên miền '${hostname}' không nằm trong danh mục Whitelist được phê duyệt.`
    };
  } catch (err: any) {
    return { valid: false, reason: "Định dạng URL không hợp lệ: " + err.message };
  }
}

/**
 * Kiểm tra trùng lặp SGK (Mục XXIII)
 */
export async function checkTextbookDuplicate(params: {
  subjectId: string;
  grade: string;
  seriesId: string;
  publisherId: string;
  volume?: string;
  editionYear?: number;
  fileHash?: string;
}): Promise<{ duplicate: boolean; existingTextbook?: any; message?: string }> {
  // 1. Kiểm tra tổ hợp metadata
  const existingMetadata = await prisma.textbook.findFirst({
    where: {
      subjectId: params.subjectId,
      grade: String(params.grade),
      seriesId: params.seriesId,
      publisherId: params.publisherId,
      volume: params.volume || "TAP_1",
      editionYear: params.editionYear || 2024
    },
    include: {
      subject: { select: { subjectName: true } },
      series: { select: { name: true } },
      publisher: { select: { name: true } }
    }
  });

  if (existingMetadata) {
    return {
      duplicate: true,
      existingTextbook: existingMetadata,
      message: `Đã tồn tại sách: ${existingMetadata.title} (Môn: ${existingMetadata.subject.subjectName}, Khối ${existingMetadata.grade}, Bộ: ${existingMetadata.series.name}).`
    };
  }

  // 2. Kiểm tra mã băm file SHA256 nếu có
  if (params.fileHash) {
    const existingHash = await prisma.textbook.findFirst({
      where: { fileHash: params.fileHash },
      include: {
        subject: { select: { subjectName: true } },
        series: { select: { name: true } }
      }
    });

    if (existingHash) {
      return {
        duplicate: true,
        existingTextbook: existingHash,
        message: `Tệp PDF này đã được tải lên trước đó cho sách: '${existingHash.title}'. Mã băm SHA256 trùng khớp.`
      };
    }
  }

  return { duplicate: false };
}

/**
 * Lấy danh sách SGK có lọc và phân trang
 */
export async function getTextbooks(filters: TextbookFilterOptions) {
  const where: any = {};

  if (filters.grade && filters.grade !== "ALL") {
    where.grade = String(filters.grade);
  }
  if (filters.subjectId && filters.subjectId !== "ALL") {
    where.subjectId = filters.subjectId;
  }
  if (filters.seriesId && filters.seriesId !== "ALL") {
    where.seriesId = filters.seriesId;
  }
  if (filters.publisherId && filters.publisherId !== "ALL") {
    where.publisherId = filters.publisherId;
  }
  if (filters.processingStatus && filters.processingStatus !== "ALL") {
    where.processingStatus = filters.processingStatus;
  }
  if (filters.sourceType && filters.sourceType !== "ALL") {
    where.sourceType = filters.sourceType;
  }
  if (filters.schoolYearId && filters.schoolYearId !== "ALL") {
    where.schoolYearId = filters.schoolYearId;
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim();
    where.OR = [
      { title: { contains: term } },
      { isbn: { contains: term } },
      { subject: { subjectName: { contains: term } } },
      { series: { name: { contains: term } } }
    ];
  }

  return prisma.textbook.findMany({
    where,
    include: {
      subject: { select: { id: true, subjectCode: true, subjectName: true } },
      series: { select: { id: true, code: true, name: true } },
      publisher: { select: { id: true, code: true, name: true } },
      schoolYear: { select: { id: true, name: true } },
      source: { select: { id: true, sourceName: true } },
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" }
          }
        }
      },
      _count: {
        select: {
          chapters: true,
          pages: true,
          chunks: true
        }
      }
    },
    orderBy: [
      { grade: "asc" },
      { subjectId: "asc" },
      { createdAt: "desc" }
    ]
  });
}

/**
 * Lấy danh sách SGK phù hợp với giáo viên theo phân công giảng dạy (Mục XIII)
 */
export async function getTeacherMyTextbooks(teacherId: string, academicYearId?: string) {
  // 1. Lấy phân công giảng dạy của giáo viên
  const assignmentWhere: any = { teacherId };
  if (academicYearId) {
    assignmentWhere.academicYearId = academicYearId;
  }

  const assignments = await prisma.teachingAssignment.findMany({
    where: assignmentWhere,
    include: {
      subject: { select: { id: true, subjectName: true, subjectCode: true } },
      class: { select: { id: true, className: true, grade: true } }
    }
  });

  if (assignments.length === 0) {
    // Nếu chưa có phân công, thử lấy môn chính của GV (mainSubjectId)
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { mainSubjectId: true }
    });

    if (teacher?.mainSubjectId) {
      return prisma.textbook.findMany({
        where: { subjectId: teacher.mainSubjectId, processingStatus: "READY" },
        include: {
          subject: { select: { id: true, subjectCode: true, subjectName: true } },
          series: { select: { id: true, name: true } },
          publisher: { select: { id: true, name: true } },
          chapters: { include: { lessons: true } }
        },
        orderBy: [{ grade: "asc" }]
      });
    }
    return [];
  }

  // 2. Trích xuất các cặp [subjectId, grade]
  const subjectGradePairs = new Set<string>();
  const subjectIds = new Set<string>();
  const grades = new Set<string>();

  assignments.forEach((a) => {
    if (a.subjectId) {
      subjectIds.add(a.subjectId);
      if (a.class?.grade) {
        grades.add(String(a.class.grade));
        subjectGradePairs.add(`${a.subjectId}__${a.class.grade}`);
      }
    }
  });

  // 3. Tìm sách giáo khoa khớp môn và khối
  const textbooks = await prisma.textbook.findMany({
    where: {
      subjectId: { in: Array.from(subjectIds) },
      grade: { in: Array.from(grades) },
      processingStatus: { in: ["READY", "REVIEW_REQUIRED"] }
    },
    include: {
      subject: { select: { id: true, subjectCode: true, subjectName: true } },
      series: { select: { id: true, name: true } },
      publisher: { select: { id: true, name: true } },
      chapters: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { orderBy: { sortOrder: "asc" } } }
      }
    },
    orderBy: [{ grade: "asc" }, { title: "asc" }]
  });

  // Gắn nhãn các lớp đang dạy tương ứng với sách
  return textbooks.map((book) => {
    const teachingClasses = assignments
      .filter((a) => a.subjectId === book.subjectId && String(a.class?.grade) === String(book.grade))
      .map((a) => a.class.className);

    return {
      ...book,
      teachingClasses: Array.from(new Set(teachingClasses))
    };
  });
}
