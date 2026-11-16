import React from 'react';

interface AssessmentTableProps {
  columns: any[];
  data: any[];
  isLoading?: boolean;
}

export function AssessmentTable({ columns, data, isLoading }: AssessmentTableProps) {
  if (isLoading) return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left table-auto border-collapse tabular-nums">
          <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
            <tr className="text-[11px] font-semibold whitespace-nowrap">
              {columns.map((col, idx) => (
                <th key={idx} className="py-3 px-3.5 font-semibold text-teal-100 first:text-white last:text-white whitespace-nowrap">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">Không có dữ liệu</td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="py-3 px-3.5 align-middle">{col.cell ? col.cell(row) : row[col.accessorKey]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
