import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  
  // Middleware should explicitly do nothing for these routes
  if (pathname.toLowerCase().includes('hocsinh')) {
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
    if (['TEACHER', 'GV_MN'].includes(role)) return NextResponse.redirect(new URL('/teacher/classes', req.nextUrl))
    return NextResponse.redirect(new URL('/admin', req.nextUrl))
  }

  // --- Strict Route Authorization and Protection ---
  if (isLoggedIn) {
    const role = (req.auth?.user as any)?.role || 'PARENT'
    
    // 1. Teacher paths protection (/teacher/...)
    if (pathname.startsWith('/teacher')) {
      const isTeacherOrStaff = ['TEACHER', 'GV_MN', 'ADMIN', 'SUPER_ADMIN', 'GDCS', 'BGH'].some(r => role.includes(r));
      if (!isTeacherOrStaff) {
        if (role === 'PARENT') return NextResponse.redirect(new URL('/parent', req.nextUrl))
        return NextResponse.redirect(new URL('/admin', req.nextUrl))
      }
    }
    
    // 2. Parent paths protection (/parent/...)
    if (pathname.startsWith('/parent')) {
      const isParent = role === 'PARENT';
      if (!isParent) {
        const isTeacher = ['TEACHER', 'GV_MN'].includes(role);
        if (isTeacher) return NextResponse.redirect(new URL('/teacher/classes', req.nextUrl))
        return NextResponse.redirect(new URL('/admin', req.nextUrl))
      }
    }
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|hocsinh|_next/static|_next/image|favicon.ico|logo.png|logo-skyline.png|vercel.svg|next.svg).*)'],
}
