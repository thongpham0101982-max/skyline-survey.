import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminQualityCoordinationClient from './client';

export const metadata = {
  title: 'Chất lượng Phối hợp Giáo dục | Ban KT&ĐBCL - SSM Sky-Line',
  description: 'Hệ thống Giám sát SLA, Quản lý Yêu cầu Phản ánh, Khảo sát NPS GVCN/GVBM & Cải tiến Chất lượng Liên tục',
};

export default async function AdminQualityCoordinationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <AdminQualityCoordinationClient user={session.user} />;
}
