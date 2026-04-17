const fs = require('fs');
const clientPath = 'src/app/admin/parents/client.tsx';
let content = fs.readFileSync(clientPath, 'utf8');

// Add handleDeleteAll function
const handleDeleteAllFunc = \
  const handleDeleteAllInClass = async () => {
    if (!selectedClassId) return;
    const studentIdsWithAccounts = students.filter(s => s.parents.length > 0).map(s => s.id);
    if (studentIdsWithAccounts.length === 0) {
      alert("L?p này chýa có tài kho?n nào ð? hu?.");
      return;
    }
    if (!confirm('B?n có ch?c ch?n mu?n hu? (xoá) TOÀN B? ' + studentIdsWithAccounts.length + ' tài kho?n ph? huynh trong l?p này?')) return;
    setDeleting(true);
    const res = await deleteParentAccountsAction(studentIdsWithAccounts);
    setDeleting(false);
    if (res.success) {
      alert("Ð? hu? toàn b? tài kho?n thành công!");
      fetchStudents(selectedClassId);
    } else {
      alert("L?i: " + (res.error || ""));
    }
  }

  const currentYearName\;

content = content.replace('const currentYearName', handleDeleteAllInClass);

// Find the toolbar buttons section
const buttonsDiv = \          <div className="flex items-center gap-3 mt-4 md:mt-6">
            {selectedStudentIds.length > 0 && (
              <button onClick={handleDeleteMany} disabled={deleting}
                 className="flex items-center text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-semibold py-3.5 px-5 rounded-xl border border-red-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                 <Trash2 className="w-5 h-5 mr-2" /> {deleting ? "Ðang xoá..." : \\Xoá \\ tài kho?n\\}
              </button>
            )}

            {selectedClassId && students.some(s => s.parents.length > 0) && (
              <button 
                onClick={handleDeleteAllInClass} 
                disabled={deleting || loading}
                className="flex items-center text-red-600 hover:text-red-700 bg-white hover:bg-red-50 font-semibold py-3.5 px-5 rounded-xl border-2 border-red-200 transition shadow-sm disabled:opacity-50"
              >
                <X className="w-5 h-5 mr-2" /> H?y t?o tài kho?n
              </button>
            )}

            <button
              onClick={handleGenerate}
              disabled={!selectedClassId || generating || loading}
              className="flex items-center justify-center px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >\;

content = content.replace(/<div className="flex items-center gap-3 mt-4 md:mt-6">[\\s\\S]+?<button\\s+onClick=\{handleGenerate\}/, buttonsDiv);

// Import X icon
content = content.replace(
  'import { Users, KeyRound, UserCheck, AlertCircle, RefreshCw, CalendarDays, Trash2 } from "lucide-react"',
  'import { Users, KeyRound, UserCheck, AlertCircle, RefreshCw, CalendarDays, Trash2, X } from "lucide-react"'
);

fs.writeFileSync(clientPath, content);
console.log('parents/client.tsx updated');
