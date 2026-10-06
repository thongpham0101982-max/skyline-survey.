import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

/**
 * POST: Hỏi AI theo Sách giáo khoa (Mục XIX, XX)
 * Bắt buộc trích dẫn nguồn chuẩn xác: Tên SGK, Chương, Bài, Trang.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const question = String(body.question || "").trim();
    const filterChapterId = body.chapterId;
    const filterLessonId = body.lessonId;

    if (!question) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi cần tra cứu." }, { status: 400 });
    }

    // 1. Lấy thông tin sách và các chunks liên quan
    const textbook = await prisma.textbook.findUnique({
      where: { id },
      include: {
        subject: true,
        series: true,
        publisher: true,
        chapters: {
          include: {
            lessons: true
          }
        }
      }
    });

    if (!textbook) {
      return NextResponse.json({ error: "Không tìm thấy sách giáo khoa." }, { status: 404 });
    }

    // 2. Tìm kiếm chunks ngữ cảnh
    const chunkWhere: any = { textbookId: id };
    if (filterLessonId) {
      chunkWhere.lessonId = filterLessonId;
    } else if (filterChapterId) {
      chunkWhere.chapterId = filterChapterId;
    }

    let chunks = await prisma.textbookChunk.findMany({
      where: chunkWhere,
      take: 10
    });

    // Nếu không có chunk cụ thể, tìm kiếm theo từ khóa trong câu hỏi
    const cleanTokens = question.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);
    let matchedLessons = textbook.chapters.flatMap((c) =>
      c.lessons.filter((l) =>
        cleanTokens.some((tok: string) => l.title.toLowerCase().includes(tok) || (l.summary && l.summary.toLowerCase().includes(tok)))
      ).map((l) => ({ ...l, chapterNumber: c.chapterNumber, chapterTitle: c.title }))
    );

    // Xác định bài học mục tiêu gần nhất
    const primaryLesson = matchedLessons[0] || textbook.chapters[0]?.lessons[0] || null;
    const primaryChapter = textbook.chapters.find((c) => c.lessons.some((l) => l.id === primaryLesson?.id)) || textbook.chapters[0];

    const contextText = textbook.chapters
      .map(
        (c) =>
          `[${c.chapterNumber}: ${c.title}]\n` +
          c.lessons
            .map(
              (l) =>
                `- ${l.lessonNumber}: ${l.title} (Trang ${l.pageStart} - ${l.pageEnd}). Tóm tắt: ${l.summary || ""}`
            )
            .join("\n")
      )
      .join("\n\n");

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // 3. Nếu có Gemini API Key: Gọi Gemini 2.5 Flash
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: `Bạn là Trợ lý Học thuật Sách giáo khoa số của Hệ thống Giáo dục Sky-Line (SSM).
Nhiệm vụ: Trả lời câu hỏi của Thầy/Cô và Học sinh CHỈ DỰA TRÊN nội dung cuốn sách sau đây:
- Tên sách: ${textbook.title}
- Môn học: ${textbook.subject.subjectName} | Khối: ${textbook.grade} | Bộ sách: ${textbook.series.name}

QUY TẮC BẮT BUỘC:
1. KHÔNG được bịa đặt kiến thức ngoài sách. Nếu nội dung không có trong mục lục/sách, hãy thông báo lịch sự rằng không tìm thấy trong cuốn sách này.
2. LUÔN LUÔN kết thúc câu trả lời bằng phần trích dẫn nguồn chuẩn xác ở cuối với định dạng:
---
📖 **Nguồn tham chiếu:**
- Sách: ${textbook.title}
- Chương: [Tên chương cụ thể]
- Bài học: [Tên bài học cụ thể]
- Trang: [Khoảng trang cụ thể trong sách]`
        });

        const prompt = `[DỮ LIỆU NỘI DUNG SÁCH]:\n${contextText}\n\n[CÂU HỎI]: ${question}`;
        const result = await model.generateContent(prompt);
        const answerText = result.response.text();

        return NextResponse.json({
          success: true,
          answer: answerText,
          citation: {
            bookTitle: textbook.title,
            chapter: primaryChapter ? `${primaryChapter.chapterNumber}: ${primaryChapter.title}` : "Chương I",
            lesson: primaryLesson ? `${primaryLesson.lessonNumber}: ${primaryLesson.title}` : "Bài 1",
            pageStart: primaryLesson?.pageStart || 1,
            pageEnd: primaryLesson?.pageEnd || 10
          }
        });
      } catch (err: any) {
        console.warn("Gemini call error, falling back to internal engine:", err);
      }
    }

    // 4. Fallback Deterministic Engine (Không phụ thuộc API bên ngoài)
    let fallbackAnswer = "";
    if (primaryLesson) {
      fallbackAnswer = `Dựa trên nội dung cuốn **${textbook.title}**, câu hỏi của Thầy/Cô liên quan trực tiếp đến **${primaryLesson.lessonNumber}: ${primaryLesson.title}** thuộc **${primaryChapter?.chapterNumber}: ${primaryChapter?.title}**.\n\n` +
        `**Kiến thức trọng tâm ghi nhận:**\n` +
        `- ${primaryLesson.summary || `Nội dung bài học ${primaryLesson.title}`}\n` +
        `- Vị trí nội dung: Nằm từ **trang ${primaryLesson.pageStart} đến trang ${primaryLesson.pageEnd}** của sách.\n\n` +
        `Thầy/Cô có thể bấm vào nút **[Xem nội dung SGK]** bên dưới để chuyển trực tiếp đến trang ${primaryLesson.pageStart} và xem toàn văn bài học.`;
    } else {
      fallbackAnswer = `Hệ thống đã tra cứu toàn bộ cuốn sách **${textbook.title}**. Để xem chi tiết các chủ đề bài học, Thầy/Cô vui lòng tra cứu theo danh mục Mục lục ở bảng bên trái hoặc xem trực tiếp các chương tương ứng.`;
    }

    return NextResponse.json({
      success: true,
      answer: fallbackAnswer,
      citation: {
        bookTitle: textbook.title,
        chapter: primaryChapter ? `${primaryChapter.chapterNumber}: ${primaryChapter.title}` : "Chương I",
        lesson: primaryLesson ? `${primaryLesson.lessonNumber}: ${primaryLesson.title}` : "Bài 1",
        pageStart: primaryLesson?.pageStart || 1,
        pageEnd: primaryLesson?.pageEnd || 10
      }
    });
  } catch (error: any) {
    console.error("Ask AI Textbook Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
