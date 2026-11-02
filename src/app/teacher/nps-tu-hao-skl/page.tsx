import React from 'react';
import TeacherReflectionPrideClient from './client';

export const metadata = {
  title: 'NPS Tự hào Học sinh SKL & Tự đánh giá 5 Phẩm chất | Lớp Học sinh | SSM Sky-Line',
  description:
    'Phân hệ dành cho Giáo viên Chủ nhiệm (GVCN) theo dõi tiến độ, xem kết quả tự đánh giá 5 phẩm chất (KPI IP2.1), đối chiếu ĐGNL định kỳ, xem Pride NPS ẩn danh lớp và đồng hành CVHT.',
};

export default function TeacherReflectionPridePage() {
  return <TeacherReflectionPrideClient />;
}
