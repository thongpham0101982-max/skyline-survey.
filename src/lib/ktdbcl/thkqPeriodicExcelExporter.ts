import * as XLSX from "xlsx"
import {
  PeriodicReportRow,
  ScoreBucketDef,
  StudentReconciledItem,
  ThkqRateMode,
} from "./thkqPeriodicReportEngine"

export interface BuildPeriodicExcelOptions {
  reportData: {
    snapshotVersion: string
    generatedAt: string
    dataUpdatedAt: string | null
    cutoffTimestamp: string | null
    isProvisionalRoster: boolean
    rosterStatusNote: string
    header: {
      governingBody: string
      unitName: string
      nationalMottoLine1: string
      nationalMottoLine2: string
      reportMainTitle: string
      reportSubTitle: string
      subjectName: string
      subjectCode: string
      periodLabel: string
      academicYearName: string
    }
    appliedFilters: any
    rateFormulaMeta: {
      mode: ThkqRateMode
      shortName: string
      formulaText: string
      denominatorLabel: string
      secondaryFormulaText?: string
      verificationNote: string
    }
    aboveBuckets: ScoreBucketDef[]
    belowBuckets: ScoreBucketDef[]
    tableRows: PeriodicReportRow[]
    totalRow: PeriodicReportRow
    reconciliationSummary: any
    levelAndSystemAnalysis?: {
      byLevel: any[]
      bySystem: any[]
    }
  }
  includeProgressColumns?: boolean
  includeStudentDetails?: boolean
  canExportDetail?: boolean
  detailedStudents?: StudentReconciledItem[]
}

/**
 * Xây dựng Workbook Excel (.xlsx) chuẩn nghiệp vụ "Thống kê kết quả kiểm tra định kỳ"
 * (Đã lược bỏ các cột Nữ và tỷ lệ liên quan đến Nữ theo yêu cầu, chỉ giữ SL và TL = SL / TSHS KT)
 */
export function buildPeriodicReportWorkbook(options: BuildPeriodicExcelOptions): XLSX.WorkBook {
  const {
    reportData,
    includeProgressColumns = false,
    includeStudentDetails = false,
    canExportDetail = false,
    detailedStudents = [],
  } = options

  const wb = XLSX.utils.book_new()
  const {
    header,
    appliedFilters,
    aboveBuckets,
    belowBuckets,
    tableRows,
    reconciliationSummary,
    levelAndSystemAnalysis,
  } = reportData

  // ============================================================================
  // SHEET 1: "Tổng hợp"
  // ============================================================================
  const baseFixedCols = ["STT", "Lớp", "TSHS", "TSHS KT"]
  const progressCols = includeProgressColumns
    ? ["Đủ ĐK dự KT", "Vắng/Chờ bù", "Chưa có điểm", "Được miễn"]
    : []
  const fixedColCount = baseFixedCols.length + progressCols.length

  // Mỗi mức điểm + cột Cộng gồm 2 cột con: SL | TL
  const aboveGroupColSpan = (aboveBuckets.length + 1) * 2
  const belowGroupColSpan = (belowBuckets.length + 1) * 2
  const totalCols = fixedColCount + aboveGroupColSpan + belowGroupColSpan

  const aoa: any[][] = []
  const merges: XLSX.Range[] = []

  const makeEmptyRow = () => new Array(totalCols).fill("")

  // Row 0 (Excel Row 1): Đơn vị chủ quản & Quốc hiệu
  const row0 = makeEmptyRow()
  row0[0] = header.governingBody
  const rightStartCol = Math.max(fixedColCount, Math.floor(totalCols / 2))
  row0[rightStartCol] = header.nationalMottoLine1
  aoa.push(row0)
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: rightStartCol - 1 } })
  merges.push({ s: { r: 0, c: rightStartCol }, e: { r: 0, c: totalCols - 1 } })

  // Row 1 (Excel Row 2): Tên trường & Tiêu ngữ
  const row1 = makeEmptyRow()
  row1[0] = header.unitName
  row1[rightStartCol] = header.nationalMottoLine2
  aoa.push(row1)
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: rightStartCol - 1 } })
  merges.push({ s: { r: 1, c: rightStartCol }, e: { r: 1, c: totalCols - 1 } })

  // Row 2: Dòng trống
  aoa.push(makeEmptyRow())

  // Row 3 (Excel Row 4): Tiêu đề chính báo cáo
  const row3 = makeEmptyRow()
  row3[0] = header.reportMainTitle
  aoa.push(row3)
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } })

  // Row 4 (Excel Row 5): Phụ đề Kỳ kiểm tra & Năm học
  const row4 = makeEmptyRow()
  row4[0] = header.reportSubTitle
  aoa.push(row4)
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } })

  // Row 5 (Excel Row 6): Thông tin bộ lọc & công thức TL
  const row5 = makeEmptyRow()
  row5[0] = `Phạm vi: ${appliedFilters.campusName || "Toàn trường"} | Cấp học: ${
    appliedFilters.level === "TIEU_HOC"
      ? "Tiểu học"
      : appliedFilters.level === "THCS"
      ? "THCS"
      : appliedFilters.level === "THPT"
      ? "THPT"
      : "Tất cả"
  } | Công thức tỷ lệ: TL = SL tại mức điểm / TSHS KT | Phiên bản: #${reportData.snapshotVersion}`
  aoa.push(row5)
  merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } })

  // Row 6: Dòng trống trước bảng
  aoa.push(makeEmptyRow())

  // Multi-tier Table Headers: Rows 7, 8, 9 (Excel Rows 8, 9, 10)
  const headerTier1 = makeEmptyRow()
  const headerTier2 = makeEmptyRow()
  const headerTier3 = makeEmptyRow()

  const allFixedHeaders = [...baseFixedCols, ...progressCols]
  allFixedHeaders.forEach((hLabel, idx) => {
    headerTier1[idx] = hLabel
    merges.push({ s: { r: 7, c: idx }, e: { r: 9, c: idx } })
  })

  // Nhóm 1: Điểm từ trung bình trở lên (≥ 5)
  const aboveStartCol = fixedColCount
  headerTier1[aboveStartCol] =
    appliedFilters.thresholdScore && appliedFilters.thresholdScore !== 5
      ? `Điểm từ ${appliedFilters.thresholdScore} trở lên`
      : "Điểm từ trung bình trở lên (≥ 5)"
  merges.push({
    s: { r: 7, c: aboveStartCol },
    e: { r: 7, c: aboveStartCol + aboveGroupColSpan - 1 },
  })

  const aboveColsWithTotal = [
    ...aboveBuckets.map((b) => ({ id: b.id, label: b.label })),
    { id: "ABOVE_TOTAL", label: "Cộng" },
  ]
  aboveColsWithTotal.forEach((colItem, bIdx) => {
    const startC = aboveStartCol + bIdx * 2
    headerTier2[startC] = colItem.label
    merges.push({ s: { r: 8, c: startC }, e: { r: 8, c: startC + 1 } })
    headerTier3[startC] = "SL"
    headerTier3[startC + 1] = "TL"
  })

  // Nhóm 2: Điểm dưới trung bình (< 5)
  const belowStartCol = aboveStartCol + aboveGroupColSpan
  headerTier1[belowStartCol] =
    appliedFilters.thresholdScore && appliedFilters.thresholdScore !== 5
      ? `Điểm dưới ${appliedFilters.thresholdScore}`
      : "Điểm dưới trung bình (< 5)"
  merges.push({
    s: { r: 7, c: belowStartCol },
    e: { r: 7, c: belowStartCol + belowGroupColSpan - 1 },
  })

  const belowColsWithTotal = [
    ...belowBuckets.map((b) => ({ id: b.id, label: b.label })),
    { id: "BELOW_TOTAL", label: "Cộng" },
  ]
  belowColsWithTotal.forEach((colItem, bIdx) => {
    const startC = belowStartCol + bIdx * 2
    headerTier2[startC] = colItem.label
    merges.push({ s: { r: 8, c: startC }, e: { r: 8, c: startC + 1 } })
    headerTier3[startC] = "SL"
    headerTier3[startC + 1] = "TL"
  })

  aoa.push(headerTier1, headerTier2, headerTier3)

  // Dữ liệu các hàng (bắt đầu từ rowIndex = 10 -> Excel Row 11)
  const dataStartRowIndex = 10
  tableRows.forEach((r, idx) => {
    const rowArr = makeEmptyRow()
    const isGroupOrTotal = r.rowType !== "CLASS"

    if (isGroupOrTotal) {
      rowArr[0] = r.label
      rowArr[1] = ""
      merges.push({
        s: { r: dataStartRowIndex + idx, c: 0 },
        e: { r: dataStartRowIndex + idx, c: 1 },
      })
    } else {
      rowArr[0] = r.stt ?? ""
      rowArr[1] = r.label
    }

    rowArr[2] = r.tshs
    rowArr[3] = r.tshsKt

    if (includeProgressColumns) {
      rowArr[4] = r.eligibleCount
      rowArr[5] = r.absentOrMakeupCount
      rowArr[6] = r.missingScoreCount
      rowArr[7] = r.exemptCount
    }

    const denom = r.tshsKt

    // Điền nhóm >= 5
    aboveBuckets.forEach((b, bIdx) => {
      const startC = aboveStartCol + bIdx * 2
      const cell = r.buckets[b.id] || { sl: 0 }
      rowArr[startC] = cell.sl
      rowArr[startC + 1] = denom > 0 ? cell.sl / denom : "—"
    })

    // Cột Cộng >= 5
    const aboveTotalStartC = aboveStartCol + aboveBuckets.length * 2
    rowArr[aboveTotalStartC] = r.aboveThreshold.sl
    rowArr[aboveTotalStartC + 1] = denom > 0 ? r.aboveThreshold.sl / denom : "—"

    // Điền nhóm < 5
    belowBuckets.forEach((b, bIdx) => {
      const startC = belowStartCol + bIdx * 2
      const cell = r.buckets[b.id] || { sl: 0 }
      rowArr[startC] = cell.sl
      rowArr[startC + 1] = denom > 0 ? cell.sl / denom : "—"
    })

    // Cột Cộng < 5
    const belowTotalStartC = belowStartCol + belowBuckets.length * 2
    rowArr[belowTotalStartC] = r.belowThreshold.sl
    rowArr[belowTotalStartC + 1] = denom > 0 ? r.belowThreshold.sl / denom : "—"

    aoa.push(rowArr)
  })

  // Dòng ghi chú chân bảng
  const footerStartRow = dataStartRowIndex + tableRows.length + 1
  aoa.push(makeEmptyRow())
  const noteRow1 = makeEmptyRow()
  noteRow1[0] =
    "Ghi chú công thức: TL = Số học sinh tại mức điểm (SL) / Tổng số học sinh có điểm hợp lệ (TSHS KT)."
  aoa.push(noteRow1)
  merges.push({ s: { r: footerStartRow, c: 0 }, e: { r: footerStartRow, c: totalCols - 1 } })

  const noteRow2 = makeEmptyRow()
  noteRow2[0] = `Nguồn dữ liệu: ${reportData.rosterStatusNote}. Kết xuất lúc: ${new Date(
    reportData.generatedAt
  ).toLocaleString("vi-VN")}.`
  aoa.push(noteRow2)
  merges.push({ s: { r: footerStartRow + 1, c: 0 }, e: { r: footerStartRow + 1, c: totalCols - 1 } })

  const wsSummary = XLSX.utils.aoa_to_sheet(aoa)
  wsSummary["!merges"] = merges

  // Gán công thức Excel và định dạng % ("0.00%") cho các ô TL có mẫu số > 0
  tableRows.forEach((r, idx) => {
    const excelRowNum = dataStartRowIndex + idx + 1 // 1-based Excel row
    const denomColLetter = XLSX.utils.encode_col(3) // Col D = TSHS KT
    const denomVal = r.tshsKt

    const applyFormulaToTlCol = (startC: number, slVal: number) => {
      const tlColIndex = startC + 1
      const cellRef = XLSX.utils.encode_cell({ r: dataStartRowIndex + idx, c: tlColIndex })
      if (denomVal <= 0) {
        wsSummary[cellRef] = { t: "s", v: "—" }
        return
      }
      const slColLetter = XLSX.utils.encode_col(startC)
      wsSummary[cellRef] = {
        t: "n",
        v: slVal / denomVal,
        f: `IF(${denomColLetter}${excelRowNum}>0,${slColLetter}${excelRowNum}/${denomColLetter}${excelRowNum},0)`,
        z: "0.00%",
      }
    }

    aboveBuckets.forEach((b, bIdx) => {
      const startC = aboveStartCol + bIdx * 2
      const cell = r.buckets[b.id] || { sl: 0 }
      applyFormulaToTlCol(startC, cell.sl)
    })
    applyFormulaToTlCol(aboveStartCol + aboveBuckets.length * 2, r.aboveThreshold.sl)

    belowBuckets.forEach((b, bIdx) => {
      const startC = belowStartCol + bIdx * 2
      const cell = r.buckets[b.id] || { sl: 0 }
      applyFormulaToTlCol(startC, cell.sl)
    })
    applyFormulaToTlCol(belowStartCol + belowBuckets.length * 2, r.belowThreshold.sl)
  })

  // Độ rộng cột & cố định hàng/cột (Freeze Panes)
  const colsConfig: XLSX.ColInfo[] = [
    { wch: 6 }, // STT
    { wch: 14 }, // Lớp
    { wch: 8 }, // TSHS
    { wch: 9 }, // TSHS KT
  ]
  if (includeProgressColumns) {
    colsConfig.push({ wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 10 })
  }
  const totalRateGroups = aboveBuckets.length + 1 + belowBuckets.length + 1
  for (let i = 0; i < totalRateGroups; i++) {
    colsConfig.push({ wch: 6 }, { wch: 8 })
  }
  wsSummary["!cols"] = colsConfig
  wsSummary["!views"] = [{ state: "frozen", xSplit: 2, ySplit: 10 }]
  wsSummary["!pageSetup"] = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0,
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng hợp")

  // ============================================================================
  // SHEET 2: "Thông tin"
  // ============================================================================
  const infoRows = [
    { "Hạng mục": "Tên báo cáo", "Giá trị / Nội dung": header.reportMainTitle },
    { "Hạng mục": "Năm học", "Giá trị / Nội dung": header.academicYearName },
    { "Hạng mục": "Kỳ kiểm tra", "Giá trị / Nội dung": header.periodLabel },
    { "Hạng mục": "Môn học", "Giá trị / Nội dung": `${header.subjectName} (${header.subjectCode})` },
    { "Hạng mục": "Đợt / Bài kiểm tra", "Giá trị / Nội dung": appliedFilters.testColumnLabel || "Chính thức" },
    { "Hạng mục": "Phạm vi Cơ sở", "Giá trị / Nội dung": appliedFilters.campusName || "Tất cả" },
    {
      "Hạng mục": "Cách nhóm dòng",
      "Giá trị / Nội dung":
        appliedFilters.groupBy === "CAMPUS_GRADE_CLASS"
          ? "Theo Cơ sở → Khối → Lớp (Quản trị Sky-Line)"
          : "Theo Khối → Lớp",
    },
    {
      "Hạng mục": "Công thức tính Tỷ lệ (TL)",
      "Giá trị / Nội dung": "TL = Số học sinh tại mức điểm (SL) / Tổng số học sinh có điểm hợp lệ (TSHS KT)",
    },
    { "Hạng mục": "Mẫu số TL", "Giá trị / Nội dung": "TSHS KT (Số học sinh có kết quả hợp lệ)" },
    {
      "Hạng mục": "Ngưỡng nhóm điểm",
      "Giá trị / Nội dung": `Từ ${appliedFilters.thresholdScore ?? 5.0} trở lên (≥ 5.0) và Dưới ${
        appliedFilters.thresholdScore ?? 5.0
      } (< 5.0)`,
    },
    {
      "Hạng mục": "Chuẩn chất lượng nội bộ Sky-Line",
      "Giá trị / Nội dung": "Tiểu học ≥ 7.0; THCS & THPT ≥ 6.0",
    },
    {
      "Hạng mục": "Chế độ chia mức điểm",
      "Giá trị / Nội dung":
        appliedFilters.scoreScaleMode === "DECIMAL"
          ? "Điểm thập phân không chồng lấn: [0,1), [1,2), ..., [9,10), 10"
          : `Điểm nguyên: 10, 9, 8, 7, 6, 5 và 4, 3, 2, 1${
              appliedFilters.includeZeroScore ? ", 0" : ""
            }`,
    },
    { "Hạng mục": "Nguồn dữ liệu", "Giá trị / Nội dung": "Sổ điểm / Khảo thí SSM (bao gồm dữ liệu vnEdu đã xác nhận)" },
    { "Hạng mục": "Mốc chốt sĩ số", "Giá trị / Nội dung": reportData.rosterStatusNote },
    {
      "Hạng mục": "Thời điểm kết xuất file",
      "Giá trị / Nội dung": new Date(reportData.generatedAt).toLocaleString("vi-VN"),
    },
    { "Hạng mục": "Mã phiên bản dữ liệu (Snapshot)", "Giá trị / Nội dung": reportData.snapshotVersion },
    { "Hạng mục": "Tổng sĩ số trong phạm vi (TSHS)", "Giá trị / Nội dung": reconciliationSummary?.totalStudentsInScope ?? 0 },
    { "Hạng mục": "Đủ điều kiện dự kiểm tra", "Giá trị / Nội dung": reconciliationSummary?.eligibleCount ?? 0 },
    { "Hạng mục": "Đã có kết quả hợp lệ (TSHS KT)", "Giá trị / Nội dung": reconciliationSummary?.validScoredCount ?? 0 },
    { "Hạng mục": "Vắng / Chờ kiểm tra bù", "Giá trị / Nội dung": reconciliationSummary?.absentOrMakeupCount ?? 0 },
    { "Hạng mục": "Chưa có điểm", "Giá trị / Nội dung": reconciliationSummary?.missingScoreCount ?? 0 },
    { "Hạng mục": "Được miễn kiểm tra", "Giá trị / Nội dung": reconciliationSummary?.exemptCount ?? 0 },
  ]
  const wsInfo = XLSX.utils.json_to_sheet(infoRows)
  wsInfo["!cols"] = [{ wch: 36 }, { wch: 85 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, "Thông tin")

  // ============================================================================
  // SHEET 3: "Phân tích Bậc - Hệ học"
  // ============================================================================
  if (levelAndSystemAnalysis) {
    const analysisRows: any[] = []
    ;(levelAndSystemAnalysis.byLevel || []).forEach((item: any) => {
      analysisRows.push({
        "Phân nhóm": "Theo Bậc học",
        "Đơn vị / Hệ đào tạo": item.levelName,
        "Số lớp": item.classCount,
        "TSHS": item.tshs,
        "TSHS KT": item.tshsKt,
        "Điểm TB": item.avgScore ?? "—",
        "Độ lệch chuẩn (σ)": item.stdDev ?? "—",
        "SL Đạt ≥ 5.0": item.passMoetCount,
        "TL Đạt ≥ 5.0": item.passMoetRateDisplay,
        "SL Dưới 5.0": item.belowMoetCount,
        "TL Dưới 5.0": item.belowMoetRateDisplay,
        "SL Đạt chuẩn Sky-Line": item.passSkylineCount,
        "TL Đạt chuẩn Sky-Line": item.passSkylineRateDisplay,
        "SL Khá - Giỏi (≥ 8.0)": item.goodExcellentCount,
        "TL Khá - Giỏi (≥ 8.0)": item.goodExcellentRateDisplay,
        "Đánh giá & Kế hoạch cải tiến": "Đối chuẩn chất lượng theo bậc học",
      })
    })
    ;(levelAndSystemAnalysis.bySystem || []).forEach((item: any) => {
      analysisRows.push({
        "Phân nhóm": "Theo Hệ học",
        "Đơn vị / Hệ đào tạo": item.systemName,
        "Số lớp": item.classCount,
        "TSHS": item.tshs,
        "TSHS KT": item.tshsKt,
        "Điểm TB": item.avgScore ?? "—",
        "Độ lệch chuẩn (σ)": item.stdDev ?? "—",
        "SL Đạt ≥ 5.0": item.passMoetCount,
        "TL Đạt ≥ 5.0": item.passMoetRateDisplay,
        "SL Dưới 5.0": item.belowMoetCount,
        "TL Dưới 5.0": item.belowMoetRateDisplay,
        "SL Đạt chuẩn Sky-Line": item.passSkylineCount,
        "TL Đạt chuẩn Sky-Line": item.passSkylineRateDisplay,
        "SL Khá - Giỏi (≥ 8.0)": item.goodExcellentCount,
        "TL Khá - Giỏi (≥ 8.0)": item.goodExcellentRateDisplay,
        "Đánh giá & Kế hoạch cải tiến": item.recommendation || "",
      })
    })

    if (analysisRows.length > 0) {
      const wsSys = XLSX.utils.json_to_sheet(analysisRows)
      wsSys["!cols"] = [
        { wch: 16 },
        { wch: 30 },
        { wch: 8 },
        { wch: 8 },
        { wch: 9 },
        { wch: 10 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 55 },
      ]
      XLSX.utils.book_append_sheet(wb, wsSys, "Phân tích Bậc - Hệ học")
    }
  }

  // ============================================================================
  // SHEET 4 (Tùy chọn): "Danh sách chi tiết"
  // ============================================================================
  if (includeStudentDetails && canExportDetail && detailedStudents.length > 0) {
    const detailRows = detailedStudents.map((st, idx) => ({
      STT: idx + 1,
      "Mã học sinh": st.studentCode,
      "Mã vnEdu": st.vnEduCode || "",
      "Họ và tên": st.studentName,
      "Lớp": st.classDisplayCode,
      "Khối": st.gradeLabel,
      "Cơ sở": st.campusName,
      "Hệ học": st.educationSystemLabel,
      "Trạng thái dự KT":
        st.statusInTest === "VALID_SCORE"
          ? "Đã có điểm"
          : st.statusInTest === "ABSENT_MAKEUP"
          ? "Vắng / Chờ bù"
          : st.statusInTest === "EXEMPT"
          ? "Được miễn"
          : st.statusInTest === "OUT_OF_RANGE"
          ? "Điểm ngoài thang"
          : "Chưa có điểm",
      "Điểm chính thức": st.officialScore !== null ? st.officialScore : st.rawScoreText || "",
      "Nhóm điểm": st.isAboveThreshold ? "Từ 5 trở lên" : st.officialScore !== null ? "Dưới 5" : "—",
      "Chuẩn Sky-Line": st.skylineBenchmark,
      "Đạt chuẩn Sky-Line": st.officialScore !== null ? (st.isAboveSkyline ? "Đạt" : "Chưa đạt") : "—",
      "Nguồn dữ liệu": st.configType === "VNEDU" ? "Sổ điểm vnEdu" : "Nội bộ SSM",
      "Ghi chú / Nhận xét": st.remark || "",
    }))
    const wsDetail = XLSX.utils.json_to_sheet(detailRows)
    wsDetail["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 14 },
      { wch: 24 },
      { wch: 12 },
      { wch: 10 },
      { wch: 18 },
      { wch: 24 },
      { wch: 15 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 30 },
    ]
    XLSX.utils.book_append_sheet(wb, wsDetail, "Danh sách chi tiết")
  }

  return wb
}
