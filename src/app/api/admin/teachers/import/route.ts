import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

// Helper to parse date from DD/MM/YYYY or MM/DD/YYYY
function parseDateString(dateStr) {
  if (!dateStr) return undefined;
  // If it's an excel serial date:
  if (!isNaN(dateStr) && typeof dateStr === 'number') {
     const jsDate = new Date((dateStr - 25569) * 86400 * 1000);
     return isNaN(jsDate.getTime()) ? undefined : jsDate.toISOString();
  }
  
  const parts = String(dateStr).split(/[-/]/);
  if (parts.length === 3) {
    let day, month, year;
    // Assuming DD/MM/YYYY
    if (parts[0].length <= 2 && parts[2].length === 4) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } 
    // Assuming YYYY-MM-DD
    else if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
    const jsDate = new Date(year, month, day);
    return isNaN(jsDate.getTime()) ? undefined : jsDate.toISOString();
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const wb = XLSX.read(buffer, { type: "buffer" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    // We use raw: true by default, dates might be JS Date objects or numbers if parsed, 
    // but without cellDates: true they are numbers or text.
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][]

    const dataRows = rows.filter(r => r.length > 0)
    const result = []
    for (const row of dataRows) {
      const firstCell = String(row[0] || "").trim()
      if (firstCell.toLowerCase() === "stt" || firstCell.toLowerCase() === "ma gv" || firstCell.toLowerCase() === "mã gv") continue
      
      const teacherCode = String(row[1] || "").trim()
      const teacherName = String(row[2] || "").trim()
      const dateOfBirthStr = row[3];
      const department = String(row[4] || "").trim()
      const mainSubject = String(row[5] || "").trim()

      if (!teacherCode || !teacherName) continue
      
      const dateOfBirth = parseDateString(dateOfBirthStr);

      result.push({
        teacherCode,
        teacherName,
        dateOfBirth,
        department: department || undefined,
        mainSubject: mainSubject || undefined
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
