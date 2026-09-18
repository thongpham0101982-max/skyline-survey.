import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Endpoint decommissioned for security and schema consistency.
 * Database DDL must be managed strictly via Prisma migrations.
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Endpoint decommissioned for security' },
    { status: 404 }
  )
}
