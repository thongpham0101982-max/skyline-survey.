import { createHmac } from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SECRET = process.env.AUTH_SECRET || 'skyline-hs-2025'
const COOKIE = 'hs_token'

export interface StudentSession {
  studentId: string; studentCode: string; studentName: string
  classId: string; className: string; campusName: string; exp: number
}

export function signStudentToken(p: StudentSession): string {
  const b64 = Buffer.from(JSON.stringify(p)).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(b64).digest('base64url')
  return b64 + '.' + sig
}

export function verifyStudentToken(token: string): StudentSession | null {
  try {
    const [b64, sig] = token.split('.')
    const expected = createHmac('sha256', SECRET).update(b64).digest('base64url')
    if (sig !== expected) return null
    const p = JSON.parse(Buffer.from(b64, 'base64url').toString()) as StudentSession
    return p.exp < Date.now() ? null : p
  } catch { return null }
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  return token ? verifyStudentToken(token) : null
}

export async function requireStudentSession(): Promise<StudentSession> {
  const s = await getStudentSession()
  if (!s) redirect('/hocsinh/hs-khaosat')
  return s
}
