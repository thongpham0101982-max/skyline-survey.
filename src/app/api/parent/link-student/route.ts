import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST() {
  return NextResponse.json(
    { error: "Chức năng tự liên kết học sinh đã được tắt. Vui lòng liên hệ Văn phòng Nhà trường hoặc Giáo viên Chủ nhiệm để được hỗ trợ cập nhật hồ sơ con em." },
    { status: 403 }
  )
}
