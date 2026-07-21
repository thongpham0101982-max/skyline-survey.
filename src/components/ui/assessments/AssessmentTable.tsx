import React from 'react';

interface AssessmentTableProps {
  columns: any[];
  data: any[];
  isLoading?: boolean;
}

export function AssessmentTable({ columns, data, isLoading }: AssessmentTableProps) {
  if (isLoading) return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  
  return (
    <div className="table-container custom-scrollbar">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 font-semibold border-b border-slate-200">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">Không có dữ liệu</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-4 py-3">{col.cell ? col.cell(row) : row[col.accessorKey]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
