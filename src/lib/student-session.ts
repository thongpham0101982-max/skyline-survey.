import { createHmac } from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Use a fixed hardcoded secret for students to avoid environment-sync issues on Vercel
const SECRET = 'skyline-student-survey-secure-key-2025'
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
    if (!b64 || !sig) return null
    const expected = createHmac('sha256', SECRET).update(b64).digest('base64url')
    if (sig !== expected) return null
    const p = JSON.parse(Buffer.from(b64, 'base64url').toString()) as StudentSession
    return p.exp < Date.now() ? null : p
  } catch (e) { 
    return null 
  }
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  return verifyStudentToken(token)
}

export async function requireStudentSession(): Promise<StudentSession> {
  const s = await getStudentSession()
  // Redirect to the MAIN login if session fails
  if (!s) redirect('/login')
  return s
}
