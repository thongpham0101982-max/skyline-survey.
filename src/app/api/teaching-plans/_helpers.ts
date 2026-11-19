import { NextResponse } from "next/server"
import { TeachingPlanAccessError } from "@/lib/teaching-plan/rbac"

export function handleTeachingPlanError(err: unknown) {
  if (err instanceof TeachingPlanAccessError) {
    return NextResponse.json(
      { success: false, code: err.code, error: err.message },
      { status: err.status }
    )
  }
  console.error("[TeachingPlanAPI]", err)
  return NextResponse.json(
    {
      success: false,
      code: "INTERNAL_ERROR",
      error: err instanceof Error ? err.message : "Đã xảy ra lỗi hệ thống.",
    },
    { status: 500 }
  )
}
