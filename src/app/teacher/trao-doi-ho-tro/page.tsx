import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SubjectTeacherSupportClient from './client';

export const metadata = {
  title: 'Trao đổi & Hỗ trợ Học sinh (GVBM) | Sổ Giáo viên - SSM Sky-Line',
  description: 'Phân hệ Trao đổi PHHS, Phối hợp GVCN & Theo dõi Hỗ trợ Học sinh theo Phân công Giảng dạy',
};

export default async function SubjectTeacherSupportPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <SubjectTeacherSupportClient user={session.user} />;
}
