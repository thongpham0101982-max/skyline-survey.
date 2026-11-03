import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  
    if (
    pathname.toLowerCase().includes('hocsinh') ||
    pathname.startsWith('/alumni') ||
    pathname === '/offline' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/uploads/')
  ) {
    return NextResponse.next()
  }

  const isLoggedIn = !!req.auth
  const isOnApiAuthRoute = pathname.startsWith('/api/auth')
  const isOnLogin = pathname.startsWith('/login')
  
  if (isOnApiAuthRoute) return NextResponse.next()
  
  if (!isLoggedIn && !isOnLogin) {
    const loginUrl = new URL('/login', req.nextUrl)
    if (pathname.startsWith('/profile/verify/')) {
      loginUrl.searchParams.set('callbackUrl', pathname + req.nextUrl.search)
      loginUrl.searchParams.set('role', 'PARENT')
    }
    return NextResponse.redirect(loginUrl)
  }
  
  if (isLoggedIn && isOnLogin) {
    const cb = req.nextUrl.searchParams.get('callbackUrl')
    if (cb && cb.startsWith('/') && !cb.startsWith('//')) {
      return NextResponse.redirect(new URL(cb, req.nextUrl))
    }
    const role = (req.auth?.user as any)?.role || 'PARENT'
    if (role === 'PARENT') return NextResponse.redirect(new URL('/parent', req.nextUrl))
    if (['TEACHER', 'GV_MN'].includes(role)) return NextResponse.redirect(new URL('/teacher', req.nextUrl))
    return NextResponse.redirect(new URL('/admin', req.nextUrl))
  }

  if (isLoggedIn) {
    const role = (req.auth?.user as any)?.role || 'PARENT'
    
    if (pathname.startsWith('/teacher')) {
      const isTeacherOrStaff = ['TEACHER', 'GV_MN', 'ADMIN', 'ADMINISTRATOR', 'SUPER_ADMIN', 'GDCS', 'GD_CS', 'BGH', 'KT_DBCL', 'KTDBCL', 'GIAO_VU_CS', 'GIAO_VU'].some(r => role.toUpperCase().includes(r));
      if (!isTeacherOrStaff) {
        if (role === 'PARENT') return NextResponse.redirect(new URL('/parent', req.nextUrl))
        return NextResponse.redirect(new URL('/admin', req.nextUrl))
      }
    }
    
    if (pathname.startsWith('/parent')) {
      const isParent = role === 'PARENT';
      if (!isParent) {
        const isTeacher = ['TEACHER', 'GV_MN'].includes(role);
        if (isTeacher) return NextResponse.redirect(new URL('/teacher', req.nextUrl))
        return NextResponse.redirect(new URL('/admin', req.nextUrl))
      }
    }
  }
  
  const response = NextResponse.next()
    response.headers.set("X-Frame-Options", "SAMEORIGIN")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    return response
})

export const config = {
  matcher: ['/((?!api|hocsinh|alumni|offline|sw\.js|manifest\.webmanifest|manifest\.json|icons|images|uploads|_next/static|_next/image|favicon.ico|logo.png|logo-skyline.png|vercel.svg|next.svg).*)'],
}
