const fs = require('fs');
let client = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

if (!client.includes('campuses: any[]')) {
    client = client.replace(
        'export function InputAssessmentsClient({ academicYears }: { academicYears: any[] }) {',
        'export function InputAssessmentsClient({ academicYears, campuses }: { academicYears: any[], campuses: any[] }) {'
    );
}

// Global replace state
client = client.split('description: "", startDate: "", endDate: ""').join('description: "", startDate: "", endDate: "", campusId: ""');

// Edit button parameter update
client = client.split('endDate: formatDateForInput(period.endDate) }).set').join('endDate: formatDateForInput(period.endDate), campusId: period.campusId || "" }).set');
client = client.split('endDate: formatDateForInput(period.endDate) }').join('endDate: formatDateForInput(period.endDate), campusId: period.campusId || "" }');

const campusUI = "              <div><label className=\"block text-sm font-semibold text-slate-700 mb-1.5\">Cõ s? (Campus)</label><select value={periodForm.campusId} onChange={e => setPeriodForm({...periodForm, campusId: e.target.value})} className=\"w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 bg-white\"><option value=\"\">-- T?T C? / KHÔNG QUY Ð?NH --</option>{campuses.map(c => (<option key={c.id} value={c.id}>{c.campusName}</option>))}</select></div>\n";

if(!client.includes('periodForm.campusId')) {
    client = client.replace(
        '<div><label className=\"block text-sm font-semibold text-slate-700 mb-1.5\">Tên K? kh?o sát *</label>',
        campusUI + '              <div><label className=\"block text-sm font-semibold text-slate-700 mb-1.5\">Tên K? kh?o sát *</label>'
    );
}

if(!client.includes('period.campus?.campusName')) {
    client = client.replace(
        '{period.code}</span>',
        '{period.code}</span>\n                     <span className=\"text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded ml-2\">{period.campus?.campusName || \"Không quy ð?nh cõ s?\"}</span>'
    );
}

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', client, 'utf8');
console.log('Client UI fixed!');
