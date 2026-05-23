const fs = require('fs');
let client = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// 1. Update component signature
if (!client.includes('campuses: any[]')) {
    client = client.replace(
        'export function InputAssessmentsClient({ academicYears }: { academicYears: any[] }) {',
        'export function InputAssessmentsClient({ academicYears, campuses }: { academicYears: any[], campuses: any[] }) {'
    );
}

// 2. Update state default
client = client.replace(
    'setPeriodForm({ code: "", name: "", description: "", startDate: "", endDate: "" });',
    'setPeriodForm({ code: "", name: "", description: "", startDate: "", endDate: "", campusId: "" });'
);
client = client.replace(
    'const [periodForm, setPeriodForm] = useState({ code: "", name: "", description: "", startDate: "", endDate: "" });',
    'const [periodForm, setPeriodForm] = useState({ code: "", name: "", description: "", startDate: "", endDate: "", campusId: "" });'
);

// 3. Update Edit button handler
client = client.replace(
    'description: period.description || "", startDate: formatDateForInput(period.startDate), endDate: formatDateForInput(period.endDate)',
    'description: period.description || "", startDate: formatDateForInput(period.startDate), endDate: formatDateForInput(period.endDate), campusId: period.campusId || ""'
);

// 4. Add Campus <select> to Period Form
const campusUI = 
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cõ s? (Campus)</label>
                <select value={periodForm.campusId} onChange={e => setPeriodForm({...periodForm, campusId: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 bg-white">
                  <option value="">-- Ch?n Cõ s? --</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName}</option>
                  ))}
                </select>
              </div>
;

if(!client.includes('periodForm.campusId')) {
    client = client.replace(
        '<div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên K? kh?o sát *</label>',
        campusUI + '\n              <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên K? kh?o sát *</label>'
    );
}

// 5. Render Campus inside Periodic display
if(!client.includes('{period.campus?.campusName || \\'T?t c? cõ s?\\'}')) {
    client = client.replace(
        '{period.code}</span>',
        '{period.code}</span>\n                     <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded ml-2">{period.campus?.campusName || \\'Không ch? ð?nh Cõ s?\\'}</span>'
    );
}

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', client, 'utf8');
console.log('Client updated with Campus field.');
