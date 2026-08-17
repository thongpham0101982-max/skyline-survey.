"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  FileText, Upload, Settings, Play, RefreshCw, 
  CheckCircle2, AlertCircle, Search, Trash2, Info
} from "lucide-react"
import * as XLSX from "xlsx"

interface ImportMappingClientProps {
  academicYears: any[]
  activeYearId: string
}

export function ImportMappingClient({
  academicYears,
  activeYearId
}: ImportMappingClientProps) {
  const [selectedYearId, setSelectedYearId] = useState(activeYearId)
  
  // File upload state
  const [parsing, setParsing] = useState(false)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState("")
  
  // Parsed columns mapping config
  const [columns, setColumns] = useState<string[]>([])
  const [dbCodeCol, setDbCodeCol] = useState<number>(-1)
  const [markCodeCol, setMarkCodeCol] = useState<number>(-1)
  const [nameCol, setNameCol] = useState<number>(-1)
  const [classCol, setClassCol] = useState<number>(-1)
  const [campusCol, setCampusCol] = useState<number>(-1)
  const [dobCol, setDobCol] = useState<number>(-1)
  const [genderCol, setGenderCol] = useState<number>(-1)
  
  // Preview data list
  const [parsedRows, setParsedRows] = useState<any[]>([])
  
  // Import Execution States
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    successCount: number
    errors: string[]
  } | null>(null)
  
  // Existing database mappings
  const [existingMappings, setExistingMappings] = useState<any[]>([])
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [existingSearch, setExistingSearch] = useState("")

  // Load existing mappings from DB
  const loadExistingMappings = async () => {
    if (!selectedYearId) return
    setLoadingExisting(true)
    try {
      const res = await fetch(`/api/admin/ktdbcl/import-mapping?academicYearId=${selectedYearId}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.mappings)) {
        setExistingMappings(data.mappings)
      }
    } catch (err) {
      console.error("Lỗi tải danh sách ánh xạ hiện có:", err)
    } finally {
      setLoadingExisting(false)
    }
  }

  useEffect(() => {
    loadExistingMappings()
  }, [selectedYearId])

  // Handle Drag/Drop File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    setWorkbook(null)
    setSheetNames([])
    setParsedRows([])
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true })
        setWorkbook(wb)
        setSheetNames(wb.SheetNames)
        
        const firstSheet = wb.SheetNames[0]
        setActiveSheet(firstSheet)
        processSheet(wb, firstSheet)
      } catch (err: any) {
        alert("Lỗi đọc tệp Excel: " + err.message)
        setParsing(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  // Process sheet columns and detect indices
  const processSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]
    
    if (rawRows.length === 0) {
      setParsing(false)
      return
    }

    // Scan first 10 rows to find header row containing keywords
    let headerRowIdx = 0
    let cols: string[] = []
    
    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const row = rawRows[r]
      const textLine = row.join(" ").toLowerCase()
      if (textLine.includes("mã học sinh") || textLine.includes("mã hs") || textLine.includes("họ tên") || textLine.includes("họ và tên") || textLine.includes("mã sở")) {
        headerRowIdx = r
        cols = row.map((c, i) => String(c || `Cột ${i + 1}`).trim())
        break
      }
    }

    if (cols.length === 0) {
      // Default to row 0 if no headers found
      cols = (rawRows[0] || []).map((c, i) => String(c || `Cột ${i + 1}`).trim())
    }

    setColumns(cols)
    setParsing(false)

    // Detect column indexes by keywords
    let detectedDbCode = -1
    let detectedMarkCode = -1
    let detectedName = -1

    cols.forEach((colName, idx) => {
      const nameLower = colName.toLowerCase()
      if (nameLower.includes("họ tên") || nameLower.includes("họ và tên") || nameLower === "họ tên học sinh" || nameLower === "họ và tên học sinh" || nameLower === "tên học sinh") {
        detectedName = idx
      } else if (nameLower === "mã học sinh" || nameLower === "mã hs" || nameLower === "ma hoc sinh" || nameLower === "ma hs") {
        // "Mã học sinh" is the database student code
        detectedDbCode = idx
      } else if (nameLower.includes("mã skl") || nameLower.includes("mã sở") || nameLower.includes("mã csdl") || nameLower.includes("mã sở gd") || nameLower.includes("mã định danh")) {
        // "Mã SKL" / "Mã CSDL Sở" is the mark file code
        detectedMarkCode = idx
      }
    })

    // Fallback based on column position if names don't match
    if (detectedDbCode === -1 && cols.length > 5) detectedDbCode = 5 // column F
    if (detectedMarkCode === -1 && cols.length > 6) detectedMarkCode = 6 // column G
    if (detectedName === -1 && cols.length > 7) detectedName = 7 // column H

    // Detect Class, Campus, DOB, Gender cols
    let detectedClass = -1
    let detectedCampus = -1
    let detectedDob = -1
    let detectedGender = -1

    cols.forEach((colName, idx) => {
      const nameLower = colName.toLowerCase()
      if (nameLower.includes("lớp") || nameLower === "lop") {
        detectedClass = idx
      } else if (nameLower.includes("cơ sở") || nameLower.includes("co so") || nameLower === "cs" || nameLower === "campus") {
        detectedCampus = idx
      } else if (nameLower.includes("ngày sinh") || nameLower.includes("ngay sinh") || nameLower === "ns") {
        detectedDob = idx
      } else if (nameLower.includes("giới tính") || nameLower.includes("gioi tinh") || nameLower === "gt" || nameLower === "giới") {
        detectedGender = idx
      }
    })

    // Fallbacks
    if (detectedClass === -1 && cols.length > 4) detectedClass = 4
    if (detectedCampus === -1 && cols.length > 1) detectedCampus = 1
    if (detectedDob === -1 && cols.length > 9) detectedDob = 9
    if (detectedGender === -1 && cols.length > 8) detectedGender = 8

    setDbCodeCol(detectedDbCode)
    setMarkCodeCol(detectedMarkCode)
    setNameCol(detectedName)
    setClassCol(detectedClass)
    setCampusCol(detectedCampus)
    setDobCol(detectedDob)
    setGenderCol(detectedGender)
  }

  // Re-parse sheet rows when column selectors change
  useEffect(() => {
    if (!workbook || !activeSheet) return

    const ws = workbook.Sheets[activeSheet]
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][]
    
    // Find first student row starting after header
    let startRow = 0
    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const row = rawRows[r]
      const textLine = row.join(" ").toLowerCase()
      if (textLine.includes("mã học sinh") || textLine.includes("mã hs") || textLine.includes("họ tên") || textLine.includes("họ và tên") || textLine.includes("mã sở")) {
        startRow = r + 1
        break
      }
    }
    if (startRow === 0) startRow = 1

    const rowsList: any[] = []
    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r]
      if (!row || row.length === 0) continue

      const dbCode = dbCodeCol !== -1 ? String(row[dbCodeCol] || "").trim() : ""
      const markCode = markCodeCol !== -1 ? String(row[markCodeCol] || "").trim() : ""
      const studentName = nameCol !== -1 ? String(row[nameCol] || "").trim() : ""
      const className = classCol !== -1 ? String(row[classCol] || "").trim() : ""
      const campusName = campusCol !== -1 ? String(row[campusCol] || "").trim() : ""
      const dobVal = dobCol !== -1 ? row[dobCol] : ""
      const gender = genderCol !== -1 ? String(row[genderCol] || "").trim() : ""

      // Skip signature/empty footer lines
      if (!dbCode && !markCode) continue
      if (studentName.toLowerCase().includes("giáo viên") || studentName.toLowerCase().includes("hiệu trưởng") || studentName.toLowerCase().includes("duyệt")) {
        break
      }

      let dobStr = "—"
      if (dobVal) {
        if (dobVal instanceof Date) {
          dobStr = dobVal.toLocaleDateString("vi-VN")
        } else {
          dobStr = String(dobVal).trim()
        }
      }

      let status = "VALID"
      let errorMsg = ""

      if (!dbCode) {
        status = "ERROR"
        errorMsg = "Thiếu Mã HS"
      } else if (!markCode) {
        status = "ERROR"
        errorMsg = "Thiếu Mã vnEdu"
      }

      rowsList.push({
        stt: r - startRow + 1,
        studentName,
        databaseCode: dbCode,
        markFileCode: markCode,
        className,
        campusName,
        dateOfBirth: dobStr,
        gender,
        status,
        errorMsg
      })
    }

    setParsedRows(rowsList)
  }, [workbook, activeSheet, dbCodeCol, markCodeCol, nameCol, classCol, campusCol, dobCol, genderCol])

  // Run bulk import API
  const runImport = async () => {
    if (parsedRows.length === 0 || importing) return

    const validRows = parsedRows.filter(r => r.status === "VALID")
    if (validRows.length === 0) {
      alert("Không có hàng dữ liệu nào hợp lệ để import.")
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const res = await fetch("/api/admin/ktdbcl/import-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          mappings: validRows.map(r => ({
            databaseCode: r.databaseCode,
            markFileCode: r.markFileCode
          }))
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setImportResult({
          successCount: data.successCount,
          errors: data.errors || []
        })
        // Reload dashboard
        loadExistingMappings()
      } else {
        alert("Có lỗi xảy ra: " + (data.error || "Không rõ nguyên nhân"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setImporting(false)
    }
  }

  // Filter existing mappings list
  const filteredExisting = useMemo(() => {
    const q = existingSearch.trim().toLowerCase()
    if (!q) return existingMappings
    return existingMappings.filter(m => 
      m.databaseCode.toLowerCase().includes(q) || 
      m.markFileCode.toLowerCase().includes(q) ||
      (m.studentName || "").toLowerCase().includes(q) ||
      (m.classCode || "").toLowerCase().includes(q)
    )
  }, [existingMappings, existingSearch])

  return (
    <div className="space-y-6">
      {/* 1. Configuration Panel */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-805 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#36E08F]" />
              Thiết lập Cấu hình Ánh xạ
            </h3>
            <p className="text-slate-400 text-xs font-semibold">Chọn năm học và tải lên file Excel chứa danh sách ánh xạ mã.</p>
          </div>
          <div>
            <select 
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#36E08F]"
            >
              {academicYears.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mt-6 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-[#36E08F]/60 transition-colors bg-slate-50/50">
          <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">Kéo thả hoặc Click chọn tệp Excel danh sách đối chiếu</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Định dạng hỗ trợ: .xls, .xlsx, .csv</p>
          <input 
            type="file" 
            accept=".xlsx,.xls,.csv" 
            onChange={handleFileUpload}
            className="hidden" 
            id="excel-mapping-upload" 
          />
          <label 
            htmlFor="excel-mapping-upload"
            className="mt-4 inline-flex bg-[#36E08F] hover:bg-[#008d83] text-white text-xs font-bold py-2 px-6 rounded-xl shadow-xs cursor-pointer"
          >
            Chọn File Excel
          </label>
        </div>
      </div>

      {/* 2. Excel Columns Mapping View */}
      {workbook && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Cấu hình Cột Excel</h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">Xác nhận đúng cột chứa mã CSDL và mã File điểm của bạn.</p>
            </div>
            {sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Sheet hoạt động:</span>
                <select 
                  value={activeSheet}
                  onChange={(e) => {
                    setActiveSheet(e.target.value)
                    processSheet(workbook, e.target.value)
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  {sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cột chứa Họ & Tên</label>
              <select 
                value={nameCol}
                onChange={(e) => setNameCol(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="-1">-- Không chọn --</option>
                {columns.map((c, i) => <option key={i} value={i}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cột chứa Mã HS (e.g. 22..., 23...)</label>
              <select 
                value={dbCodeCol}
                onChange={(e) => setDbCodeCol(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none border-[#36E08F]/40"
              >
                <option value="-1">-- Chọn cột --</option>
                {columns.map((c, i) => <option key={i} value={i}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cột chứa Mã vnEdu (e.g. 06...)</label>
              <select 
                value={markCodeCol}
                onChange={(e) => setMarkCodeCol(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none border-[#36E08F]/40"
              >
                <option value="-1">-- Chọn cột --</option>
                {columns.map((c, i) => <option key={i} value={i}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Preview list */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden mt-6">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Xem trước dữ liệu ánh xạ ({parsedRows.length} hàng)</span>
              <span className="text-[#36E08F]">Chỉ hàng Hợp lệ mới được lưu</span>
            </div>
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 sticky top-0 z-10">
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3 w-32">Mã HS</th>
                    <th className="p-3 w-32">Mã vnEdu</th>
                    <th className="p-3 w-20">Lớp</th>
                    <th className="p-3 w-20">Cơ sở</th>
                    <th className="p-3 w-24">Ngày sinh</th>
                    <th className="p-3 w-20">Giới tính</th>
                    <th className="p-3 w-24 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center text-slate-400 font-medium">{r.stt}</td>
                      <td className="p-3 font-semibold text-slate-700">{r.studentName || "—"}</td>
                      <td className="p-3 font-bold text-indigo-700 font-mono">{r.databaseCode || "—"}</td>
                      <td className="p-3 font-bold text-slate-800 font-mono">{r.markFileCode || "—"}</td>
                      <td className="p-3 text-slate-600">{r.className || "—"}</td>
                      <td className="p-3 text-slate-600">{r.campusName || "—"}</td>
                      <td className="p-3 text-slate-500 font-mono">{r.dateOfBirth || "—"}</td>
                      <td className="p-3 text-slate-600">{r.gender || "—"}</td>
                      <td className="p-3 text-center">
                        {r.status === "VALID" ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">Hợp lệ</span>
                        ) : (
                          <span title={r.errorMsg} className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold cursor-help">Lỗi</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={runImport}
              disabled={importing}
              className="bg-[#36E08F] hover:bg-[#008d83] text-white text-xs font-bold py-2.5 px-8 rounded-xl flex items-center justify-center gap-2 shadow-md disabled:bg-slate-300"
            >
              <Play className="w-4 h-4" />
              Lưu Ánh xạ Mã Học sinh
            </button>
          </div>
        </div>
      )}

      {/* 3. Import Results Summary Report */}
      {importResult && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm animate-in zoom-in-95 duration-200">
          <h3 className="text-sm font-bold text-slate-850 flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Báo cáo kết quả hoàn thành Ánh xạ
          </h3>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cập nhật mã ánh xạ thành công</label>
            <div className="text-2xl font-black text-slate-800">{importResult.successCount} cặp mã học sinh</div>
          </div>
          {importResult.errors.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-red-600 mb-2">Danh sách lỗi xảy ra ({importResult.errors.length}):</label>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-40 overflow-y-auto text-red-805 font-mono text-[10px] space-y-1">
                {importResult.errors.map((err, idx) => <div key={idx}>{idx + 1}. {err}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Existing Mappings Dashboard Table */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-805">Danh sách Ánh xạ đang cấu hình</h3>
            <p className="text-slate-400 text-xs font-semibold">Hiển thị toàn bộ cấu hình ánh xạ hiện tại của năm học.</p>
          </div>
          
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm kiếm Mã HS hoặc Mã vnEdu..."
              value={existingSearch}
              onChange={(e) => setExistingSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-700 outline-none focus:border-[#36E08F]"
            />
          </div>
        </div>

        {loadingExisting ? (
          <div className="text-center py-12">
            <RefreshCw className="w-6 h-6 text-[#36E08F] animate-spin mx-auto mb-2" />
            <span className="text-xs font-semibold text-slate-400">Đang tải danh sách ánh xạ...</span>
          </div>
        ) : filteredExisting.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-1">
            <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-xs font-bold">Chưa có ánh xạ nào</div>
            <div className="text-[10px]">Tải file Excel lên để thêm cấu hình ánh xạ đầu tiên.</div>
          </div>
        ) : (
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-505 font-bold border-b border-slate-100 sticky top-0 z-10">
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3 w-40">Họ và tên</th>
                    <th className="p-3">Mã HS</th>
                    <th className="p-3">Mã vnEdu</th>
                    <th className="p-3 w-20">Lớp</th>
                    <th className="p-3 w-24">Cơ sở</th>
                    <th className="p-3 w-24">Ngày sinh</th>
                    <th className="p-3 w-20">Giới tính</th>
                    <th className="p-3 w-28 text-center">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredExisting.map((m, idx) => {
                    let dobStr = "—"
                    if (m.dateOfBirth) {
                      dobStr = new Date(m.dateOfBirth).toLocaleDateString("vi-VN")
                    }
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3 font-extrabold text-slate-800">{m.studentName}</td>
                        <td className="p-3 text-indigo-700 font-bold font-mono">{m.databaseCode}</td>
                        <td className="p-3 text-slate-800 font-bold font-mono">{m.markFileCode}</td>
                        <td className="p-3 text-slate-600">{m.classCode || "—"}</td>
                        <td className="p-3 text-slate-600">{m.campusName || "—"}</td>
                        <td className="p-3 text-slate-500 font-mono">{dobStr}</td>
                        <td className="p-3 text-slate-600">{m.gender || "—"}</td>
                        <td className="p-3 text-center text-slate-400 font-medium">{new Date(m.createdAt).toLocaleDateString("vi-VN")}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
