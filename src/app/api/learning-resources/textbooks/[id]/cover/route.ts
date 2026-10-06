import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET: Sinh ảnh bìa SVG chuẩn hóa chất lượng cao cho Sách giáo khoa
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const book = await prisma.textbook.findUnique({
      where: { id },
      include: {
        subject: { select: { subjectName: true } },
        series: { select: { name: true } },
        publisher: { select: { name: true } }
      }
    });

    const title = book?.title || "SÁCH GIÁO KHOA";
    const subjectName = book?.subject?.subjectName || "Môn học";
    const grade = book?.grade || "8";
    const seriesName = book?.series?.name || "Bộ sách chuẩn";
    const volName = book?.volume === "TAP_1" ? "TẬP MỘT" : book?.volume === "TAP_2" ? "TẬP HAI" : "TOÀN TẬP";

    // Dynamic brand colors depending on subject
    let startColor = "#003B3A";
    let midColor = "#005854";
    let endColor = "#00A19A";

    if (subjectName.toLowerCase().includes("toán")) {
      startColor = "#0f3a5d";
      midColor = "#1d4ed8";
      endColor = "#0284c7";
    } else if (subjectName.toLowerCase().includes("văn")) {
      startColor = "#701a75";
      midColor = "#a21caf";
      endColor = "#d946ef";
    }

    const svg = `<svg width="400" height="560" viewBox="0 0 400 560" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${startColor}" />
      <stop offset="50%" stop-color="${midColor}" />
      <stop offset="100%" stop-color="${endColor}" />
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="1" fill="#ffffff" fill-opacity="0.1" />
    </pattern>
  </defs>

  <!-- Book Cover Background -->
  <rect width="400" height="560" rx="16" fill="url(#bgGrad)" />
  <rect width="400" height="560" rx="16" fill="url(#grid)" />

  <!-- Top Series Bar -->
  <rect x="24" y="24" width="352" height="32" rx="8" fill="#ffffff" fill-opacity="0.15" />
  <text x="36" y="45" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" letter-spacing="1">
    ${seriesName.toUpperCase()}
  </text>

  <!-- Big Grade Number Watermark -->
  <text x="240" y="320" font-family="sans-serif" font-size="190" font-weight="900" fill="#ffffff" fill-opacity="0.08">
    ${grade}
  </text>

  <!-- Center Subject Name -->
  <text x="32" y="160" font-family="sans-serif" font-size="34" font-weight="900" fill="#ffffff">
    ${subjectName.toUpperCase()}
  </text>

  <!-- Grade Badge -->
  <rect x="32" y="180" width="80" height="42" rx="10" fill="#ffffff" />
  <text x="72" y="210" font-family="sans-serif" font-size="28" font-weight="900" fill="${startColor}" text-anchor="middle">
    ${grade}
  </text>

  <text x="124" y="210" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">
    ${volName}
  </text>

  <!-- Central Visual Illustration -->
  <circle cx="200" cy="360" r="64" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" />
  <path d="M170 360 Q200 330 230 360 Q200 390 170 360 Z" fill="#ffffff" fill-opacity="0.8" />
  <circle cx="200" cy="360" r="10" fill="${endColor}" />

  <!-- Bottom Publisher Bar -->
  <line x1="32" y1="480" x2="368" y2="480" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1" />
  <text x="200" y="520" font-family="sans-serif" font-size="13" font-weight="600" fill="#ffffff" text-anchor="middle" fill-opacity="0.9">
    HỆ THỐNG GIÁO DỤC SKY-LINE • SSM
  </text>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
      }
    });
  } catch (error: any) {
    return new NextResponse("Error generating cover", { status: 500 });
  }
}
