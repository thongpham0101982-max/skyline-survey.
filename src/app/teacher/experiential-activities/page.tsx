"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Calendar, MapPin, Users, ChevronRight, Activity } from 'lucide-react';

export default function ExperientialActivitiesList() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Mock data for display
  const activities = [
    { id: 'act-001', name: 'Tham quan bảo tàng Chăm', date: '2023-11-15', location: 'Bảo tàng Chăm Đà Nẵng', status: 'DRAFT', participants: 45 },
    { id: 'act-002', name: 'Trải nghiệm làm gốm Thanh Hà', date: '2023-10-20', location: 'Làng gốm Thanh Hà', status: 'APPROVED', participants: 120 },
    { id: 'act-003', name: 'Ngoại khoá kỹ năng sinh tồn', date: '2024-01-05', location: 'Khu du lịch sinh thái Tiên Sa', status: 'SUBMITTED', participants: 300 },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00A99D]/10 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-[#00A99D]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Hoạt động trải nghiệm</h1>
              <p className="text-slate-500 font-medium text-sm">Quản lý và nhập kết quả đánh giá học sinh</p>
            </div>
          </div>
          
          <button 
            onClick={() => router.push('/teacher/experiential-activities/create')}
            className="px-5 py-2.5 bg-[#00A99D] hover:bg-[#009085] text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4" /> Tạo hoạt động mới
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm tên hoạt động..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#00A99D] transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).map((act) => (
            <div 
              key={act.id} 
              className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-[#00A99D]/30 transition-all cursor-pointer group flex flex-col"
              onClick={() => router.push(`/teacher/experiential-activities/${act.id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div></div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#00A99D]/10 transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#00A99D]" />
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-4 line-clamp-2 leading-snug flex-1">
                {act.name}
              </h3>
              
              <div className="space-y-2 text-sm text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#00A99D]/70" />
                  {act.date}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00A99D]/70" />
                  <span className="truncate">{act.location}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-200/60">
                  <Users className="w-4 h-4 text-[#00A99D]/70" />
                  <span>{act.participants} học sinh</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}