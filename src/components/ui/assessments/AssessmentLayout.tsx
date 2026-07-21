import React from 'react';

interface AssessmentLayoutProps {
  title: string;
  description: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function AssessmentLayout({ title, description, headerActions, children }: AssessmentLayoutProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-full overflow-x-hidden p-2 md:p-6 pb-24">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {headerActions}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {children}
      </div>
    </div>
  );
}
