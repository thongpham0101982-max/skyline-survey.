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
    if (role === 'TEACHER' || role === 'GV_MN') return NextResponse.redirect(new URL('/teacher/classes', req.nextUrl))
    return NextResponse.redirect(new URL('/admin', req.nextUrl))
  }

  // --- Strict Route Authorization and Protection ---
  if (isLoggedIn) {
    const role = (req.auth?.user as any)?.role || 'PARENT'
    
    // 1. Teacher paths protection (/teacher/...)
    if (pathname.startsWith('/teacher')) {
      const isTeacher = role === 'TEACHER' || role === 'GV_MN';
      if (!isTeacher) {
        // Redirect unauthorized users to their correct home page
        if (role === 'PARENT') return NextResponse.redirect(new URL('/parent', req.nextUrl))
        return NextResponse.redirect(new URL('/admin', req.nextUrl))
      }
    }
    
    // 2. Admin paths protection (/admin/...)
    if (pathname.startsWith('/admin')) {
      const isTeacher = role === 'TEACHER' || role === 'GV_MN';
      const isParent = role === 'PARENT';
      if (isTeacher) {
        return NextResponse.redirect(new URL('/teacher/classes', req.nextUrl))
      }
      if (isParent) {
        return NextResponse.redirect(new URL('/parent', req.nextUrl))
      }
    }
    
    // 3. Parent paths protection (/parent/...)
    if (pathname.startsWith('/parent')) {
      const isParent = role === 'PARENT';
      if (!isParent) {
        const isTeacher = role === 'TEACHER' || role === 'GV_MN';
        if (isTeacher) return NextResponse.redirect(new URL('/teacher/classes', req.nextUrl))
        return NextResponse.redirect(new URL('/admin', req.nextUrl))
      }
    }
  }
  
  return NextResponse.next()
})

// REMOVED 'hocsinh' FROM MATCHER - Middleware will not even trigger for student pages
export const config = {
  matcher: ['/((?!api|hocsinh|_next/static|_next/image|favicon.ico|logo.png|logo-skyline.png|vercel.svg|next.svg).*)'],
}
