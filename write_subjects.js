const fs = require('fs');
const path = require('path');

const baseDir = process.argv[2];

const subjectDir = path.join(baseDir, 'src', 'app', 'admin', 'subjects');
fs.mkdirSync(subjectDir, { recursive: true });

fs.writeFileSync(path.join(subjectDir, 'page.tsx'), `"use server"
import { prisma } from "@/lib/db"
import { SubjectsClient } from "./client"

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { subjectCode: 'asc' }
  })
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý môn học</h1>
        <p className="text-slate-500 mt-1">Thêm mới, sửa và quản lý danh sách môn học trong trường.</p>
      </div>
      <SubjectsClient initialSubjects={subjects} />
    </div>
  )
}
`);

fs.writeFileSync(path.join(subjectDir, 'client.tsx'), `"use client"
import { useState } from "react"
import { Plus, Edit2, Trash2, CheckCircle2, X } from "lucide-react"
import { createSubject, updateSubject, deleteSubject } from "./actions"

export function SubjectsClient({ initialSubjects }: any) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [editingId, setEditingId] = useState("");
  const [formData, setFormData] = useState({ code: "", name: "", desc: "" });
  const [loading, setLoading] = useState(false);

  const startEdit = (s?: any) => {
    if (s) {
      setEditingId(s.id);
      setFormData({ code: s.subjectCode, name: s.subjectName, desc: s.description || "" });
    } else {
      setEditingId("new");
      setFormData({ code: "", name: "", desc: "" });
    }
  }

  const cancelEdit = () => {
    setEditingId("");
    setFormData({ code: "", name: "", desc: "" });
  }

  const handleSave = async () => {
    setLoading(true);
    let res;
    if (editingId === "new") {
      res = await createSubject(formData.code, formData.name, formData.desc);
    } else {
      res = await updateSubject(editingId, formData.code, formData.name, formData.desc);
    }
    
    if (res.success) {
      if (editingId === "new") setSubjects([...subjects, res.subject]);
      else setSubjects(subjects.map((s:any) => s.id === editingId ? res.subject : s));
      cancelEdit();
    } else {
      alert("Lỗi: " + res.error);
    }
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa môn học này?")) return;
    const res = await deleteSubject(id);
    if (res.success) setSubjects(subjects.filter((s:any) => s.id !== id));
    else alert("Lỗi: " + res.error);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-700">Danh sách môn học</h3>
        <button onClick={() => startEdit()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Thêm Môn học
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">Mã môn</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">Tên môn học</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm">Ghi chú</th>
              <th className="px-6 py-4 font-bold text-slate-600 text-sm text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {editingId === "new" && (
              <tr className="bg-indigo-50/50">
                <td className="px-4 py-3"><input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="w-full p-2 rounded border" placeholder="VD: TOAN"/></td>
                <td className="px-4 py-3"><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 rounded border" placeholder="VD: Toán học"/></td>
                <td className="px-4 py-3"><input value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} className="w-full p-2 rounded border" placeholder="Ghi chú..."/></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={handleSave} disabled={loading} className="p-2 text-green-600 hover:bg-green-100 rounded-lg mr-2"><CheckCircle2 className="w-5 h-5"/></button>
                  <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                </td>
              </tr>
            )}
            {subjects.map((s:any) => (
              editingId === s.id ? (
                <tr key={s.id} className="bg-indigo-50/50">
                  <td className="px-4 py-3"><input value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} className="w-full p-2 rounded border"/></td>
                  <td className="px-4 py-3"><input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full p-2 rounded border"/></td>
                  <td className="px-4 py-3"><input value={formData.desc} onChange={e=>setFormData({...formData, desc: e.target.value})} className="w-full p-2 rounded border"/></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={handleSave} disabled={loading} className="p-2 text-green-600 hover:bg-green-100 rounded-lg mr-2"><CheckCircle2 className="w-5 h-5"/></button>
                    <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5"/></button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-6 py-4 font-bold text-slate-700">{s.subjectCode}</td>
                  <td className="px-6 py-4 font-bold text-indigo-700">{s.subjectName}</td>
                  <td className="px-6 py-4 text-slate-500">{s.description || '---'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
`);

fs.writeFileSync(path.join(subjectDir, 'actions.ts'), `"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createSubject(code: string, name: string, desc: string) {
  try {
    const subject = await prisma.subject.create({
      data: { subjectCode: code, subjectName: name, description: desc }
    })
    revalidatePath('/admin/subjects')
    return { success: true, subject }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function updateSubject(id: string, code: string, name: string, desc: string) {
  try {
    const subject = await prisma.subject.update({
      where: { id },
      data: { subjectCode: code, subjectName: name, description: desc }
    })
    revalidatePath('/admin/subjects')
    return { success: true, subject }
  } catch (e: any) { return { success: false, error: e.message } }
}

export async function deleteSubject(id: string) {
  try {
    await prisma.subject.delete({ where: { id } })
    revalidatePath('/admin/subjects')
    return { success: true }
  } catch (e: any) { return { success: false, error: e.message } }
}
`);

console.log('Subjects module generated');
