import { handlers } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest, ctx: any) {
  return handlers.GET(req, ctx)
}

export async function POST(req: NextRequest, ctx: any) {
  return handlers.POST(req, ctx)
}
