"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateActivityWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [catalogs, setCatalogs] = useState([]);
  
  // Step 1
  const [info, setInfo] = useState({ catalogId: '', date: '', semester: '1', academicYearId: '', level: '', format: '', organizer: '', inCharge: '', location: '' });
  // Step 2
  const [target, setTarget] = useState({ type: 'class', value: '' });
  // Step 3
  const [defaults, setDefaults] = useState({ allParticipate: true, defaultRole: 'Tham gia', defaultEval: 'Đạt' });
  // Step 4
  const [exceptions, setExceptions] = useState({ outstanding: [], absent: [], achievements: [] });
  // Step 5
  const [evidence, setEvidence] = useState({ photos: '', pdfs: '', oneDrive: '', gDrive: '', youtube: '', desc: '' });

  useEffect(() => {
    fetch('/api/activities/catalog')
      .then(res => res.json())
      .then(data => { if (data.success) setCatalogs(data.data); });
  }, []);

  const handleSubmit = async (isDraft: boolean) => {
    const payload = { info, target, defaults, exceptions, evidence, isDraft };
    alert('Submitting data: ' + JSON.stringify(payload, null, 2));
    // In a real implementation, this would POST to /api/activities/records
    router.push('/teacher');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-2">Tạo Hoạt động trải nghiệm</h1>
      
      {/* Stepper */}
      <div className="flex justify-between mb-8 text-sm font-medium text-gray-500 border-b pb-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`flex items-center ${step === i ? 'text-blue-600 font-bold' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${step === i ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {i}
            </div>
            Bước {i}
          </div>
        ))}
      </div>

      <div className="min-h-[400px]">
        {/* Step 1: Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Bước 1: Thông tin hoạt động</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Tên hoạt động (từ Danh mục)</label>
                <select className="w-full border p-2 rounded" value={info.catalogId} onChange={e => setInfo({...info, catalogId: e.target.value})}>
                  <option value="">Chọn hoạt động...</option>
                  {catalogs.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="block mb-1">Ngày tổ chức</label><input type="date" className="w-full border p-2 rounded" value={info.date} onChange={e => setInfo({...info, date: e.target.value})} /></div>
              <div><label className="block mb-1">Học kỳ</label><select className="w-full border p-2 rounded" value={info.semester} onChange={e => setInfo({...info, semester: e.target.value})}><option value="1">Học kỳ 1</option><option value="2">Học kỳ 2</option></select></div>
              <div><label className="block mb-1">Địa điểm</label><input type="text" className="w-full border p-2 rounded" value={info.location} onChange={e => setInfo({...info, location: e.target.value})} placeholder="Trong lớp, Hội trường..." /></div>
            </div>
          </div>
        )}

        {/* Step 2: Target */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Bước 2: Chọn đối tượng tham gia</h2>
            <div>
              <label className="block mb-1">Phạm vi đối tượng</label>
              <select className="w-full border p-2 rounded" value={target.type} onChange={e => setTarget({...target, type: e.target.value})}>
                <option value="class">Một lớp</option>
                <option value="multi-class">Nhiều lớp</option>
                <option value="grade">Một khối</option>
                <option value="school">Toàn trường</option>
                <option value="specific">Danh sách học sinh cụ thể</option>
              </select>
            </div>
            <div>
              <label className="block mb-1">Nhập chi tiết đối tượng (Tên lớp, khối...)</label>
              <input type="text" className="w-full border p-2 rounded" value={target.value} onChange={e => setTarget({...target, value: e.target.value})} />
            </div>
          </div>
        )}

        {/* Step 3: Defaults */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Bước 3: Thiết lập mặc định</h2>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="allPart" checked={defaults.allParticipate} onChange={e => setDefaults({...defaults, allParticipate: e.target.checked})} />
              <label htmlFor="allPart">Mặc định tất cả học sinh được chọn tham gia</label>
            </div>
            {defaults.allParticipate && (
              <>
                <div>
                  <label className="block mb-1">Vai trò mặc định</label>
                  <input type="text" className="w-full border p-2 rounded" value={defaults.defaultRole} onChange={e => setDefaults({...defaults, defaultRole: e.target.value})} placeholder="VD: Tham gia" />
                </div>
                <div>
                  <label className="block mb-1">Mức đánh giá mặc định</label>
                  <select className="w-full border p-2 rounded" value={defaults.defaultEval} onChange={e => setDefaults({...defaults, defaultEval: e.target.value})}>
                    <option value="Đạt">Đạt</option>
                    <option value="Tốt">Tốt</option>
                    <option value="Xuất sắc">Xuất sắc</option>
                    <option value="Chưa đạt">Chưa đạt</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Exceptions */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Bước 4: Nhập ngoại lệ</h2>
            <p className="text-sm text-gray-600">Phần này hỗ trợ upload danh sách Excel hoặc nhập tay các học sinh nổi bật, vắng mặt, hoặc có thành tích đặc biệt.</p>
            <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
              [Giao diện kéo thả/thêm học sinh ngoại lệ sẽ được tích hợp tại đây]
            </div>
          </div>
        )}

        {/* Step 5: Evidence */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Bước 5: Minh chứng và gửi duyệt</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block mb-1">Upload Ảnh/PDF</label><input type="file" multiple className="w-full border p-2 rounded" /></div>
              <div><label className="block mb-1">Link OneDrive</label><input type="url" className="w-full border p-2 rounded" value={evidence.oneDrive} onChange={e => setEvidence({...evidence, oneDrive: e.target.value})} /></div>
              <div><label className="block mb-1">Link Google Drive</label><input type="url" className="w-full border p-2 rounded" value={evidence.gDrive} onChange={e => setEvidence({...evidence, gDrive: e.target.value})} /></div>
              <div><label className="block mb-1">Link YouTube</label><input type="url" className="w-full border p-2 rounded" value={evidence.youtube} onChange={e => setEvidence({...evidence, youtube: e.target.value})} /></div>
            </div>
            <div>
              <label className="block mb-1">Mô tả minh chứng</label>
              <textarea className="w-full border p-2 rounded" rows={3} value={evidence.desc} onChange={e => setEvidence({...evidence, desc: e.target.value})}></textarea>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between pt-4 border-t">
        <button 
          onClick={() => setStep(step - 1)} 
          disabled={step === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Quay lại
        </button>
        <div className="space-x-2">
          {step === 5 ? (
            <>
              <button onClick={() => handleSubmit(true)} className="px-4 py-2 border border-blue-600 text-blue-600 rounded">Lưu nháp</button>
              <button onClick={() => handleSubmit(false)} className="px-4 py-2 bg-blue-600 text-white rounded">Gửi duyệt</button>
            </>
          ) : (
            <button onClick={() => setStep(step + 1)} className="px-4 py-2 bg-blue-600 text-white rounded">
              Tiếp tục
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
