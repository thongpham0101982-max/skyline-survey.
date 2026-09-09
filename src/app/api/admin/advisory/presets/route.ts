import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

const DEFAULT_PRESETS = [
  // Khối 1 (Học tập 50%, Sức khỏe 20%, Sở thích 15%, Phẩm chất 15%)
  { gradeGroup: "K1", category: "HOC_TAP", goalText: "Em tập trung lắng nghe Thầy Cô giảng bài và hoàn thành bài tập trên lớp", actionPreset: "Giơ tay phát biểu ý kiến, tự giác chuẩn bị sách vở", sortOrder: 1 },
  { gradeGroup: "K1", category: "SUC_KHOE", goalText: "Em tự xếp hàng ngay ngắn, giữ gìn vệ sinh cá nhân, ăn ngủ đúng giờ và vận động", actionPreset: "Rửa tay trước khi ăn, cất đồ dùng học tập ngăn nắp", sortOrder: 2 },
  { gradeGroup: "K1", category: "SO_THICH", goalText: "Em yêu thích tham gia vẽ tranh, kể chuyện, ca hát và các trò chơi vận động", actionPreset: "Tích cực tham gia các hoạt động ngoại khóa, câu lạc bộ sở thích", sortOrder: 3 },
  { gradeGroup: "K1", category: "PHAM_CHAT", goalText: "Em lễ phép chào hỏi Thầy Cô, người lớn, trung thực và biết giúp đỡ bạn bè", actionPreset: "Nói lời cảm ơn, xin lỗi và chia sẻ cùng bạn bè trong lớp", sortOrder: 4 },
        
  // Khối 2 (Học tập 50%, Kỹ năng 20%, Sức khỏe 10%, Sở thích 10%, Phẩm chất 10%)
  { gradeGroup: "K2", category: "HOC_TAP", goalText: "Em rèn luyện chữ viết đẹp và hoàn thành các bài toán hàng ngày", actionPreset: "Viết nắn nót từng câu chữ, kiểm tra bài trước khi nộp", sortOrder: 1 },
  { gradeGroup: "K2", category: "KY_NANG", goalText: "Em rèn luyện sự tự tin khi đứng trước lớp trình bày ý kiến và tự phục vụ cá nhân", actionPreset: "Tích cực phát biểu, tự sắp xếp đồ dùng cá nhân gọn gàng", sortOrder: 2 },
  { gradeGroup: "K2", category: "SUC_KHOE", goalText: "Em ngủ trước 21h30 và thức dậy đúng giờ, ăn đủ bữa và tập thể dục", actionPreset: "Đặt báo thức cá nhân, hạn chế xem TV và đồ điện tử", sortOrder: 3 },
  { gradeGroup: "K2", category: "SO_THICH", goalText: "Em phát huy sở trường đọc sách, vẽ tranh và rèn luyện môn thể thao yêu thích", actionPreset: "Dành 20 phút mỗi ngày cho hoạt động năng khiếu", sortOrder: 4 },
  { gradeGroup: "K2", category: "PHAM_CHAT", goalText: "Em biết kiềm chế cảm xúc giận dỗi, vâng lời Thầy Cô và giúp đỡ bạn học", actionPreset: "Hít thở sâu khi tức giận, lắng nghe lời Thầy Cô khuyên bảo", sortOrder: 5 },

  // Khối 3 (Học tập 50%, Kỹ năng 20%, Sức khỏe 10%, Sở thích 10%, Phẩm chất 10%)
  { gradeGroup: "K3", category: "HOC_TAP", goalText: "Em đạt kết quả tốt các môn Toán, Tiếng Việt và Tiếng Anh", actionPreset: "Học thuộc từ vựng Tiếng Anh mỗi ngày, làm thêm bài tập tư duy", sortOrder: 1 },
  { gradeGroup: "K3", category: "KY_NANG", goalText: "Em chủ động kết bạn, giao tiếp tự tin và tham gia làm việc nhóm hiệu quả", actionPreset: "Tôn trọng ý kiến bạn bè, phân công công việc rõ ràng", sortOrder: 2 },
  { gradeGroup: "K3", category: "SUC_KHOE", goalText: "Em rèn luyện thể lực mỗi ngày, giữ gìn vệ sinh thân thể và ăn uống lành mạnh", actionPreset: "Uống đủ nước, tập thể dục buổi sáng và ngủ đúng giờ", sortOrder: 3 },
  { gradeGroup: "K3", category: "SO_THICH", goalText: "Em nuôi dưỡng đam mê khám phá thế giới qua sách báo và khoa học", actionPreset: "Mỗi tuần đọc 1 cuốn sách khám phá khoa học hoặc kỹ năng", sortOrder: 4 },
  { gradeGroup: "K3", category: "PHAM_CHAT", goalText: "Em trung thực trong học tập, đoàn kết và có trách nhiệm với tập thể", actionPreset: "Tự giác làm bài, tích cực tham gia các phong trào của lớp", sortOrder: 5 },

  // Khối 4 - 5 (Học tập 50%, Sức khỏe 20%, Sở thích 15%, Phẩm chất 15%)
  { gradeGroup: "K4_K5", category: "HOC_TAP", goalText: "Nâng cao năng lực tự học, đạt danh hiệu Học sinh Xuất sắc và hoàn thành tốt các kỳ thi", actionPreset: "Lập sổ tay ghi chép kiến thức trọng tâm, giải đề ôn tập tuần", sortOrder: 1 },
  { gradeGroup: "K4_K5", category: "SUC_KHOE", goalText: "Rèn luyện thể lực, tập thể thao đều đặn và cân bằng thời gian nghỉ ngơi", actionPreset: "Tham gia CLB thể thao nhà trường, chạy bộ hoặc bơi lội", sortOrder: 2 },
  { gradeGroup: "K4_K5", category: "SO_THICH", goalText: "Phát triển sở trường năng khiếu và kỹ năng sáng tạo cá nhân", actionPreset: "Tham gia dự án nghệ thuật, CLB STEM hoặc ngoại khóa", sortOrder: 3 },
  { gradeGroup: "K4_K5", category: "PHAM_CHAT", goalText: "Rèn luyện lòng biết ơn, tinh thần trách nhiệm và sẵn sàng chuẩn bị chuyển cấp", actionPreset: "Giúp đỡ gia đình, chủ động chia sẻ và hỗ trợ bạn bè", sortOrder: 4 },

  // Khối 6 - 8 (Học tập 50%, Thói quen 15%, Kỹ năng cảm xúc 15%, Định hướng 20%)
  { gradeGroup: "K6_K8", category: "HOC_TAP", goalText: "Đạt Điểm Trung Bình Môn từ 8.5 trở lên, chinh phục chứng chỉ Tiếng Anh", actionPreset: "Ôn tập theo phương pháp sơ đồ tư duy Mindmap, luyện đề định kỳ", sortOrder: 1 },
  { gradeGroup: "K6_K8", category: "THOI_QUEN", goalText: "Cân bằng giữa học tập, sinh hoạt cá nhân và sử dụng mạng xã hội", actionPreset: "Giới hạn thời gian dùng điện thoại dưới 1 giờ/ngày", sortOrder: 2 },
  { gradeGroup: "K6_K8", category: "KY_NANG_CAM_XUC", goalText: "Rèn luyện tư duy phản biện, kỹ năng thuyết trình và quản trị cảm xúc", actionPreset: "Tích cực tranh luận học thuật, hỗ trợ các thành viên trong nhóm", sortOrder: 3 },
  { gradeGroup: "K6_K8", category: "DINH_HUONG", goalText: "Khám phá thế mạnh bản thân và định hướng ngành nghề yêu thích", actionPreset: "Tham gia các buổi tham vấn hướng nghiệp và trải nghiệm thực tế", sortOrder: 4 },

  // Khối 9 - 12 (Học tập 50%, Thói quen 15%, Kỹ năng cảm xúc 15%, Định hướng 20%)
  { gradeGroup: "K9_K12", category: "HOC_TAP", goalText: "Thi đậu nguyện vọng 1 Trường THPT Chuyên / Đại học Top đầu", actionPreset: "Lập lộ trình ôn luyện chuyên sâu, làm bài thi thử theo tuần", sortOrder: 1 },
  { gradeGroup: "K9_K12", category: "THOI_QUEN", goalText: "Duy trì năng lượng tích cực, quản lý áp lực thi cử khoa học", actionPreset: "Tập thiền tĩnh tâm 10 phút, đảm bảo giấc ngủ phục hồi", sortOrder: 2 },
  { gradeGroup: "K9_K12", category: "KY_NANG_CAM_XUC", goalText: "Xây dựng tư duy lãnh đạo, tinh thần trách nhiệm và bản lĩnh cá nhân", actionPreset: "Đảm nhận vị trí Trưởng ban/Chủ nhiệm CLB dự án học đường", sortOrder: 3 },
  { gradeGroup: "K9_K12", category: "DINH_HUONG", goalText: "Hoàn thiện hồ sơ du học / xét tuyển Đại học và chuẩn bị hành trang tương lai", actionPreset: "Viết bài luận cá nhân, thi chứng chỉ IELTS/SAT/JLPT", sortOrder: 4 }
]

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const gradeGroup = searchParams.get("gradeGroup")
    const seed = searchParams.get("seed")

    // Check count and seed defaults if empty or requested
    const count = await prisma.goalPreset.count()
    if (count === 0 || seed === "true") {
      if (seed === "true") {
        await prisma.goalPreset.deleteMany({})
      }
      for (const p of DEFAULT_PRESETS) {
        await prisma.goalPreset.create({ data: p })
      }
    }

    const where: any = {}
    if (gradeGroup) where.gradeGroup = gradeGroup

    const presets = await prisma.goalPreset.findMany({
      where,
      orderBy: [{ gradeGroup: 'asc' }, { category: 'asc' }, { sortOrder: 'asc' }]
    })

    return jsonResponse(presets)
  } catch (e: any) {
    console.error("GET /api/admin/advisory/presets error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const body = await req.json()
    if (body.items && Array.isArray(body.items)) {
      const createdList = []
      let baseOrder = Number(body.sortOrder) || 1
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i]
        if (item.goalText && item.goalText.trim()) {
          const created = await prisma.goalPreset.create({
            data: {
              gradeGroup: body.gradeGroup,
              category: body.category,
              goalText: item.goalText.trim(),
              actionPreset: item.actionPreset ? item.actionPreset.trim() : "",
              sortOrder: baseOrder + i,
              status: body.status || "ACTIVE"
            }
          })
          createdList.push(created)
        }
      }
      return jsonResponse({ success: true, data: createdList })
    }

    const { gradeGroup, category, goalText, actionPreset, sortOrder, status } = body

    if (!gradeGroup || !category || !goalText) {
      return jsonResponse({ error: "Vui lòng nhập đầy đủ Khối, Nhóm mục tiêu và Nội dung mục tiêu mẫu" }, 400)
    }

    const created = await prisma.goalPreset.create({
      data: {
        gradeGroup,
        category,
        goalText,
        actionPreset: actionPreset || "",
        sortOrder: Number(sortOrder) || 1,
        status: status || "ACTIVE"
      }
    })

    return jsonResponse({ success: true, data: created })
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const body = await req.json()
    const { id, gradeGroup, category, goalText, actionPreset, sortOrder, status } = body

    if (!id || !goalText) {
      return jsonResponse({ error: "Thiếu ID hoặc Nội dung mục tiêu mẫu" }, 400)
    }

    const updated = await prisma.goalPreset.update({
      where: { id },
      data: {
        gradeGroup,
        category,
        goalText,
        actionPreset,
        sortOrder: Number(sortOrder) || 1,
        status
      }
    })

    return jsonResponse({ success: true, data: updated })
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return jsonResponse({ error: "Thiếu ID mục tiêu mẫu" }, 400)

    await prisma.goalPreset.delete({ where: { id } })
    return jsonResponse({ success: true })
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500)
  }
}
