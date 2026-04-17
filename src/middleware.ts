import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isOnLogin = req.nextUrl.pathname.startsWith('/login')
  
  if (isOnApiAuthRoute) return
  
  if (!isLoggedIn && !isOnLogin) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
  
  if (isLoggedIn && isOnLogin) {
    const role = (req.auth?.user as any)?.role || 'PARENT'
    if (role === 'PARENT') return NextResponse.redirect(new URL('/parent', req.nextUrl))
    if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher', req.nextUrl))
    // Any other role goes to Admin dashboard
    return NextResponse.redirect(new URL('/admin', req.nextUrl))
  }

  if (isLoggedIn && !isOnLogin) {
    const role = (req.auth?.user as any)?.role
    const isStaff = role !== 'PARENT' && role !== 'TEACHER'
    
    // Non-staff trying to access /admin -> bounce
    if (req.nextUrl.pathname.startsWith('/admin') && !isStaff) return NextResponse.redirect(new URL('/login', req.nextUrl))
    
    // Only Teachers and Admins can access /teacher
    if (req.nextUrl.pathname.startsWith('/teacher') && role !== 'TEACHER' && !isStaff) return NextResponse.redirect(new URL('/login', req.nextUrl))
    
    // Anyone can technically access parent if needed, but let's restrict it to PARENT and Admins
    if (req.nextUrl.pathname.startsWith('/parent') && role !== 'PARENT' && !isStaff) return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
