const fs = require('fs');
const clientPath = 'src/app/admin/surveys/client.tsx';
let content = fs.readFileSync(clientPath, 'utf8');

content = content.replace(
  'export function AdminSurveysClient({ initialSurveys, years, createAction, updateAction, deleteAction }: any) {',
  'export function AdminSurveysClient({ initialSurveys, years, createAction, updateAction, deleteAction, deleteMultipleAction }: any) {'
);

content = content.replace(
  'const [surveys, setSurveys] = useState(initialSurveys)',
  'const [surveys, setSurveys] = useState(initialSurveys)\n  const [selectedIds, setSelectedIds] = useState<string[]>([])'
);

const handleFuncs = \
  const handleSelectAll = (e: any) => {
    if (e.target.checked) setSelectedIds(surveys.map((s: any) => s.id))
    else setSelectedIds([])
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id))
    else setSelectedIds([...selectedIds, id])
  }

  const handleDeleteMultiple = async () => {
    if (!selectedIds.length) return;
    if (!confirm('Ban co chac chan muon xoa ' + selectedIds.length + ' dot khao sat da chon?')) return;
    try {
      await deleteMultipleAction(selectedIds)
      setSurveys(surveys.filter((s: any) => !selectedIds.includes(s.id)))
      setSelectedIds([])
      setSuccessMsg("Da xoa thanh cong!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e) {}
  }

  const handleToggleStatus\;
content = content.replace('const handleToggleStatus', handleFuncs);

const deleteBtn = \{/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteMultiple}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Xoa {selectedIds.length} muc
            </button>
          )}
        </div>\;
content = content.replace('{/* Toolbar */}', deleteBtn);

content = content.replace(
  '<thead className="bg-slate-50 border-b border-slate-200">\\n            <tr>',
  '<thead className="bg-slate-50 border-b border-slate-200">\\n            <tr>\\n              <th className="px-4 py-4 w-10 text-center">\\n                <input \\n                  type="checkbox" \\n                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"\\n                  checked={surveys.length > 0 && selectedIds.length === surveys.length}\\n                  onChange={handleSelectAll}\\n                />\\n              </th>'
);

content = content.replace(
  /<tr key=\{s\.id\} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">/g,
  '<tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">\\n                  <td className="px-4 py-4 text-center">\\n                    <input \\n                      type="checkbox" \\n                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"\\n                      checked={selectedIds.includes(s.id)}\\n                      onChange={() => handleSelectOne(s.id)}\\n                    />\\n                  </td>'
);

content = content.replace('colSpan={6}', 'colSpan={7}');

fs.writeFileSync(clientPath, content);
console.log('client.tsx updated');
