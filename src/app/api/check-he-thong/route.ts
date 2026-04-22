import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const totalStudents = await prisma.student.count();
    const specificStudent = await prisma.student.findUnique({
      where: { studentCode: '0602040008' },
      include: { class: true }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        total_students_in_db: totalStudents,
        target_student_found: !!specificStudent,
        student_details: specificStudent ? {
          name: specificStudent.studentName,
          status: specificStudent.status,
          className: specificStudent.class?.className
        } : "NOT_FOUND_IN_DB"
      }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
