import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ParentCoordinationClient from './client';

export const metadata = {
  title: 'Trao đổi & Đồng hành | Cổng Phụ huynh - SSM Sky-Line',
  description: 'Kênh kết nối Phụ huynh với Giáo viên Chủ nhiệm, Giáo viên Bộ môn và Khảo sát Chất lượng Giáo dục',
};

export default async function ParentCoordinationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <ParentCoordinationClient user={session.user} />;
}
