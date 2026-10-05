import React from 'react';
import { describe, it } from 'vitest';
import { renderToString } from 'react-dom/server';

let currentParams = 'tab=tong-hop';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => '/admin/tong-hop-du-gio',
  useSearchParams: () => new URLSearchParams(currentParams),
}));

vi.mock('@/app/teacher/du-gio/actions', () => ({
  updateTeacherObservationTargets: async () => ({ success: true }),
}));

import { AdminTongHopClient } from '../src/app/admin/tong-hop-du-gio/client';

describe('AdminTongHopClient all tabs', () => {
  const depts = [
    { id: 'd1', name: 'Tổ Toán', code: 'TOAN', blockCM: 'Phổ thông' },
    { id: 'd2', name: 'Nhà Trẻ', code: 'NT', blockCM: 'Mầm Non' },
    { id: 'd3', name: 'GĐCS', code: 'GDCS', blockCM: 'Điều hành' },
    { id: 'd4', name: 'BGHMN', code: 'BGHMN', blockCM: 'Điều hành' }
  ];

  const teachers = [
    { id: 't1', teacherName: 'Nguyễn Văn A', teacherCode: 'GV001', departmentId: 'd1', campusId: 'c1', position: 'TTCM' },
    { id: 't2', teacherName: 'Trần Thị B', teacherCode: 'GV002', departmentId: 'd2', campusId: 'c1', position: 'TTCM' },
    { id: 't3', teacherName: 'Lê Văn C', teacherCode: 'GV003', departmentId: 'd3', campusId: 'c1', position: 'GĐCS' },
  ];

  const slots = [
    {
      id: 's1',
      teacherId: 't1',
      date: '2026-09-15',
      registrations: [
        {
          teacherId: 't2',
          isApproved: true,
          evaluation: { totalScore: 18, overallRating: 'Giỏi', reEvaluationStatus: 'FINAL' }
        }
      ]
    }
  ];

  const props = {
    initialSlots: slots,
    currentTeacher: teachers[0] as any,
    subjects: [{ id: 'sub1', subjectCode: 'TOAN', subjectName: 'Toán' }],
    departments: depts,
    divisions: [],
    teachers: teachers,
    campuses: [{ id: 'c1', campusCode: 'CS1', campusName: 'Cơ sở 1' }],
    classes: [],
    initialFilters: { level: 'all', period: 'all', grade: 'all', date: '', campusId: 'all', deptId: 'all' },
    isTTCM: false,
    isSuperAdmin: true,
  };

  it('renders tab=tong-hop', () => {
    currentParams = 'tab=tong-hop';
    const html = renderToString(<AdminTongHopClient {...props} />);
    console.log('tong-hop length:', html.length);
  });

  it('renders tab=ma-tran', () => {
    currentParams = 'tab=ma-tran';
    const html = renderToString(<AdminTongHopClient {...props} />);
    console.log('ma-tran length:', html.length);
  });

  it('renders tab=bang-ke', () => {
    currentParams = 'tab=bang-ke';
    const html = renderToString(<AdminTongHopClient {...props} />);
    console.log('bang-ke length:', html.length);
  });

  it('renders tab=dbcl', () => {
    currentParams = 'tab=dbcl';
    const html = renderToString(<AdminTongHopClient {...props} />);
    console.log('dbcl length:', html.length);
  });

  it('renders block=dieuhan', () => {
    currentParams = 'block=dieuhan';
    const html = renderToString(<AdminTongHopClient {...props} />);
    console.log('block=dieuhan length:', html.length);
  });
});
