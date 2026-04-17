import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function Home() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  const role = (session.user as any)?.role || 'PARENT'
  
  if (role === 'TEACHER') {
    redirect('/teacher')
  } else if (role === 'PARENT') {
    redirect('/parent')
  } else if (role === 'KT_DBCL') {
    redirect('/admin/surveys')
  } else {
    // ADMIN and other staff roles
    redirect('/admin')
  }
}
