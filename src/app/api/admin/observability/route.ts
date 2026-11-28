import { NextResponse } from "next/server"
import { requireApiAccess } from "@/lib/rbac-utils"
import { getObservabilitySnapshot } from "@/lib/observability"

export const dynamic = "force-dynamic"

export async function GET() {
  const access = await requireApiAccess({
    allowedRoles: ["ADMIN"],
    allowKtdbcl: true,
  })
  if (!access.ok) return access.response

  return NextResponse.json({
    success: true,
    snapshot: getObservabilitySnapshot(),
  })
}
