const fs = require('fs');
let client = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

client = client.replace(
    'setPeriodForm({ code: "", name: "", description: ""',
    'setPeriodForm({ code: "", name: "", description: "", startDate: "", endDate: ""'
);

client = client.replace(
    'const [periodForm, setPeriodForm] = useState({ code: "", name: "", description: "" });',
    'const [periodForm, setPeriodForm] = useState({ code: "", name: "", description: "", startDate: "", endDate: "" });'
);

client = client.replace(
    'setPeriodForm({ code: period.code, name: period.name, description: period.description || "" });',
    'setPeriodForm({ code: period.code, name: period.name, description: period.description || "", startDate: formatDateForInput(period.startDate), endDate: formatDateForInput(period.endDate) });'
);

const newInputs = "              <div className=\"grid grid-cols-2 gap-4\">\n                <div>\n                  <label className=\"block text-sm font-semibold text-slate-700 mb-1.5\">Th?i gian b?t ð?u *</label>\n                  <input type=\"datetime-local\" required value={periodForm.startDate} onChange={e => setPeriodForm({...periodForm, startDate: e.target.value})} className=\"w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500\" />\n                </div>\n                <div>\n                  <label className=\"block text-sm font-semibold text-slate-700 mb-1.5\">Th?i gian k?t thúc *</label>\n                  <input type=\"datetime-local\" required value={periodForm.endDate} onChange={e => setPeriodForm({...periodForm, endDate: e.target.value})} className=\"w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500\" />\n                </div>\n              </div>\n";

if(!client.includes('periodForm.startDate')) {
    client = client.replace(
        '<div><label className=\"block text-sm font-semibold text-slate-700 mb-1.5\">Mô t?</label>',
        newInputs + '              <div><label className=\"block text-sm font-semibold text-slate-700 mb-1.5\">Mô t?</label>'
    );
}

const displayLogic = "                   <div className=\"flex gap-4 mt-2 mb-2 text-sm\">\n                     <div className=\"flex gap-1.5 items-center\"><span className=\"text-slate-400\">B?t ð?u:</span> <span className=\"font-medium text-slate-700\">{period.startDate ? new Date(period.startDate).toLocaleString('vi-VN') : 'Chýa ð?nh ngh?a'}</span></div>\n                     <div className=\"flex gap-1.5 items-center\"><span className=\"text-slate-400\">K?t thúc:</span> <span className=\"font-medium text-slate-700\">{period.endDate ? new Date(period.endDate).toLocaleString('vi-VN') : 'Chýa ð?nh ngh?a'}</span></div>\n                   </div>\n";

if(!client.includes('period.endDate ? new Date')) {
    client = client.replace(
        '<p className=\"text-sm text-slate-500 mt-1\">{period.description}</p>',
        '<p className=\"text-sm text-slate-500 mt-1\">{period.description}</p>\n' + displayLogic
    );
}

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', client, 'utf8');
console.log('UI updated with Period start/end dates');
