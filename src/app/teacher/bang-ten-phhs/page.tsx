import React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NameplateGeneratorClient from './client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'In Bảng Tên Học Sinh – Họp PHHS | GVCN Sky-Line',
  description:
    'Thiết kế và in bảng tên học sinh gập chữ A kèm mã QR Hồ sơ học tập phục vụ Họp Phụ huynh học sinh',
};

export default async function TeacherNameplatesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return <NameplateGeneratorClient />;
}
