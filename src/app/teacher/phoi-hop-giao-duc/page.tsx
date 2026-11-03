import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HomeroomCoordinationClient from './client';

export const metadata = {
  title: 'Phối hợp Giáo dục (GVCN) | Sổ Giáo viên - SSM Sky-Line',
  description: 'Hệ thống Phối hợp Giáo dục & Chất lượng Phản hồi dành cho Giáo viên Chủ nhiệm',
};

export default async function HomeroomCoordinationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <HomeroomCoordinationClient user={session.user} />;
}
