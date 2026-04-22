import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  
  // CRITICAL: Always allow everything under /hocsinh and /api/hocsinh to pass through middleware
  // Students use their own JWT session, not NextAuth session.
  if (pathname.toLowerCase().startsWith('/hocsinh') || pathname.toLowerCase().startsWith('/api/hocsinh')) {
    return NextResponse.next()
  }

  const isLoggedIn = !!req.auth
  const isOnApiAuthRoute = pathname.startsWith('/api/auth')
  const isOnLogin = pathname.startsWith('/login')
  
  if (isOnApiAuthRoute) return NextResponse.next()
  
  if (!isLoggedIn && !isOnLogin) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
  
  if (isLoggedIn && isOnLogin) {
    const role = (req.auth?.user as any)?.role || 'PARENT'
    if (role === 'PARENT') return NextResponse.redirect(new URL('/parent', req.nextUrl))
    if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', req.nextUrl))
    return NextResponse.redirect(new URL('/admin', req.nextUrl))
  }

  if (isLoggedIn && !isOnLogin) {
    const role = (req.auth?.user as any)?.role
    const isStaff = role !== 'PARENT' && role !== 'TEACHER'
    if (pathname.startsWith('/admin') && !isStaff) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (pathname.startsWith('/teacher') && role !== 'TEACHER' && !isStaff) return NextResponse.redirect(new URL('/login', req.nextUrl))
    if (pathname.startsWith('/parent') && role !== 'PARENT' && !isStaff) return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
