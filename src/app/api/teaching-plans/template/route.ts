import { NextRequest, NextResponse } from "next/server"
import { getTeachingPlanAuthContext } from "@/lib/teaching-plan/rbac"
import { generateTeachingPlanTemplateBuffer } from "@/lib/teaching-plan/excelService"
import { handleTeachingPlanError } from "../_helpers"

export async function GET(req: NextRequest) {
  try {
    await getTeachingPlanAuthContext()
    const sp = req.nextUrl.searchParams
    const buf = generateTeachingPlanTemplateBuffer({
      academicYearName: sp.get("academicYearName") || undefined,
      grade: sp.get("grade") || undefined,
      subjectName: sp.get("subjectName") || undefined,
      programName: sp.get("programName") || undefined,
      scopeLabel: sp.get("scopeLabel") || undefined,
    })

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Mau_Excel_Ke_hoach_day_hoc_SSM.xlsx"',
      },
    })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
