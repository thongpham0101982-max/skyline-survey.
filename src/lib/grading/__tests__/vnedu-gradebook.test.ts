import { describe, it, expect, vi, beforeEach } from "vitest"
import * as XLSX from "xlsx"
import {
  buildPrimaryVnEduDefaultConfig,
  buildSecondaryTt22VnEduDefaultConfig,
  calculateTt22SemesterAverage,
  findExactPeriodInternalOverrideConfig,
  getPrimaryEnglishVnEduPreset,
  getPrimaryPeriodMeta,
  getSubjectCurriculumGroup,
  isPrimaryGrade,
  isPrimarySubjectForGrade,
  isSecondaryOrHighGrade,
  isSecondarySubjectForGrade,
  isTt22CommentOnlySubject,
  normalizeGradeColumnDefs,
  normalizePrimaryXlInput,
  normalizeTt22DatInput,
  resolveGradeConfigForScope,
  shouldPrimarySubjectHaveKtColumn,
  validateColumnValue,
} from "../vnedu-config-types"
import { parseVnEduWorkbook, readCodeCellAsText, readSafeCellValue } from "../vnedu-excel-parser"
import {
  buildSheetPreview,
  formatDateYmd,
  mapExcelColumnsToConfig,
  parseExcelDobToYmd,
  recomputeCompositeForConfig,
  suggestTargetSubject,
} from "../vnedu-import-engine"

function buildSyntheticWorkbookBuffer(setup: (wb: XLSX.WorkBook) => void): Buffer {
  const wb = XLSX.utils.book_new()
  setup(wb)
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}

describe("1. Cấu hình Sổ điểm theo vnEdu & Đặc thù Tiếng Anh Tiểu học", () => {
  it("hỗ trợ cấu hình 0 cột điểm số cho Tiếng Anh Khối 3 - GK1 (XL GK1 + Nhận xét giữa kỳ)", () => {
    const preset = getPrimaryEnglishVnEduPreset("Khối 3", "GK1")
    expect(preset).not.toBeNull()
    expect(preset!.confirmationStatus).toBe("CONFIRMED")
    expect(preset!.hasCompositeColumn).toBe(false)
    expect(preset!.hasRatingColumn).toBe(true)
    expect(preset!.ratingColumnName).toBe("XL GK1")
    expect(preset!.hasRemarkColumn).toBe(true)
    expect(preset!.columns.filter(c => c.dataType === "NUMBER")).toHaveLength(0)

    // Không tự áp sang kỳ khác
    expect(getPrimaryEnglishVnEduPreset("Khối 3", "CK1")).toBeNull()
  })

  it("Tiếng Anh Khối 1 và Khối 2 mặc định UNCONFIRMED (Chưa xác nhận cấu hình vnEdu)", () => {
    const g1 = getPrimaryEnglishVnEduPreset("Khối 1", "GK1")
    const g2 = getPrimaryEnglishVnEduPreset("Khối 2", "CK1")
    expect(g1?.confirmationStatus).toBe("UNCONFIRMED")
    expect(g1?.statusMessage).toBe("Chưa xác nhận cấu hình vnEdu")
    expect(g1?.columns).toHaveLength(0)
    expect(g2?.confirmationStatus).toBe("UNCONFIRMED")
  })

  it("resolveGradeConfigForScope tách biệt VNEDU vs INTERNAL và không lấy cấu hình môn khác thay thế", () => {
    const configs = [
      { id: "c1", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: "sub_toan", evaluationPeriod: "GK1", configType: "INTERNAL", isActive: true },
      { id: "c2", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: "sub_toan", evaluationPeriod: "GK1", configType: "VNEDU", isActive: true },
    ]
    const vn = resolveGradeConfigForScope(configs, {
      academicYearId: "y1",
      program: "ALL",
      grade: "Khối 4",
      subjectId: "sub_toan",
      evaluationPeriod: "GK1",
      configType: "VNEDU",
    })
    expect(vn?.id).toBe("c2")

    // Thiếu môn Tiếng Việt -> trả về null, không fallback sang Toán hay mẫu chung
    const missing = resolveGradeConfigForScope(configs, {
      academicYearId: "y1",
      program: "ALL",
      grade: "Khối 4",
      subjectId: "sub_tv",
      evaluationPeriod: "GK1",
      configType: "VNEDU",
    })
    expect(missing).toBeNull()

    // Kỳ Khảo sát đầu năm (KSĐN) luôn lấy cấu hình các môn theo "2. Đánh giá nội bộ Sky-Line" (INTERNAL)
    const ksdnConfigs = [
      { id: "ksdn_int", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: "sub_toan", evaluationPeriod: "KSĐN", configType: "INTERNAL", isActive: true },
      { id: "ksdn_vn", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: "sub_toan", evaluationPeriod: "KSĐN", configType: "VNEDU", isActive: true },
    ]
    const resolvedKsdn = resolveGradeConfigForScope(ksdnConfigs, {
      academicYearId: "y1",
      program: "ALL",
      grade: "Khối 4",
      subjectId: "sub_toan",
      evaluationPeriod: "KSĐN",
      configType: "VNEDU",
    })
    expect(resolvedKsdn?.id).toBe("ksdn_int")
  })

  it("findExactPeriodInternalOverrideConfig tự động nhận cấu hình Tiếng Anh Khối 4, 5 cuối kỳ từ 2. ĐG nội bộ nhưng không lấy nhầm mẫu chung ALL/KSĐN", () => {
    const configs = [
      { id: "int_all", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: "sub_ta", evaluationPeriod: "ALL", configType: "INTERNAL", isActive: true, updatedAt: "2026-11-20T09:00:00Z" },
      { id: "int_ksdn", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: "sub_ta", evaluationPeriod: "KSĐN", configType: "INTERNAL", isActive: true, updatedAt: "2026-11-20T09:00:00Z" },
      { id: "int_null", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: null, evaluationPeriod: "CK1", configType: "INTERNAL", isActive: true, updatedAt: "2026-11-20T09:00:00Z" },
      { id: "int_g4_ck1", academicYearId: "y1", program: "ALL", grade: "Khối 4", subjectId: "sub_ta", evaluationPeriod: "CK1", configType: "INTERNAL", isActive: true, updatedAt: "2026-11-20T10:00:00Z" },
      { id: "int_g5_ck2", academicYearId: "y1", program: "ALL", grade: "Khối 5", subjectId: "sub_ta", evaluationPeriod: "CK2", configType: "INTERNAL", isActive: true, updatedAt: "2026-11-20T10:05:00Z" },
    ]

    // Khớp chính xác Tiếng Anh Khối 4 CK1 & Khối 5 CK2
    expect(
      findExactPeriodInternalOverrideConfig(configs, {
        academicYearId: "y1",
        program: "Hệ S",
        grade: "4S_CS4",
        subjectId: "sub_ta",
        evaluationPeriod: "CK1",
      })?.id
    ).toBe("int_g4_ck1")

    expect(
      findExactPeriodInternalOverrideConfig(configs, {
        academicYearId: "y1",
        program: "Hệ I",
        grade: "5I_CS1",
        subjectId: "sub_ta",
        evaluationPeriod: "CK2",
      })?.id
    ).toBe("int_g5_ck2")

    // Không lấy nhầm mẫu ALL / KSĐN / subjectId == null cho kỳ chưa cấu hình (vd: Khối 4 CK2)
    expect(
      findExactPeriodInternalOverrideConfig(configs, {
        academicYearId: "y1",
        program: "Hệ S",
        grade: "Khối 4",
        subjectId: "sub_ta",
        evaluationPeriod: "CK2",
      })
    ).toBeNull()
  })

  it("validateColumnValue giữ điểm 0 hợp lệ và không chuyển 'Đ' thành điểm số", () => {
    const numCol = normalizeGradeColumnDefs({
      columnsJson: JSON.stringify([{ key: "tx1", label: "TX1", group: "TX", dataType: "NUMBER", maxScore: 10 }]),
    })[0]
    expect(validateColumnValue(0, numCol)).toEqual({ valid: true, normalized: 0 })
    expect(validateColumnValue("0", numCol)).toEqual({ valid: true, normalized: 0 })
    expect(validateColumnValue("Đ", numCol).valid).toBe(false)

    const rateCol = normalizeGradeColumnDefs({
      columnsJson: JSON.stringify([{ key: "tx1", label: "TX1", group: "TX", dataType: "RATING", allowedCodes: ["Đ", "CĐ"] }]),
    })[0]
    expect(validateColumnValue("Đ", rateCol)).toEqual({ valid: true, normalized: "Đ" })
    expect(validateColumnValue("Đạt", rateCol)).toEqual({ valid: true, normalized: "Đ" })
  })
})

describe("2. Parser Excel vnEdu (cột ẩn, ô gộp, họ tên tách cột, thống kê, công thức, giữ số 0 đầu)", () => {
  it("đọc được cột Mã vnEdu bị ẩn, giữ số 0 đầu, ghép C+D thành họ tên và dừng trước dòng Thống kê", () => {
    const buf = buildSyntheticWorkbookBuffer((wb) => {
      const ws: XLSX.WorkSheet = {}
      const aoa: any[][] = [
        ["TRƯỜNG TIỂU HỌC SKY-LINE"],
        [],
        [],
        ["Môn: Toán học   Kỳ: GK1   Năm học: 2026-2027"],
        ["Lớp: 4/1_CS1"],
        [],
        ["STT", "Mã học sinh", "Họ và tên", "", "Nhận xét", "KT GK1", "XL GK1"],
        [1, "0602040330", "Nguyễn Văn", "An", "Hoàn thành tốt", 9.5, "T"],
        [2, 602040331, "Trần Thị", "Bình", "Cần cố gắng", 0, "C"],
        [3, "0602040332", "Lê", "Cường", "", "", ""],
        ["Thống kê", "Tổng số: 3", "", "", "", "", ""],
      ]
      XLSX.utils.sheet_add_aoa(ws, aoa, { origin: "A1" })
      ws["!merges"] = [{ s: { r: 6, c: 2 }, e: { r: 6, c: 3 } }] // C7:D7 merged "Họ và tên"
      ws["!cols"] = [{}, { hidden: true }] // Column B hidden!
      ws["!ref"] = "A1:G11"
      XLSX.utils.book_append_sheet(wb, ws, "4_1_CS1")
    })

    const parsed = parseVnEduWorkbook(buf, "so_diem_khoi_4_mon_toan.xls")
    expect(parsed.sheets).toHaveLength(1)
    const sh = parsed.sheets[0]
    expect(sh.detectedSubject).toBe("Toán học")
    expect(sh.detectedClass).toBe("4/1_CS1")
    expect(sh.detectedPeriod).toBe("GK1")
    expect(sh.skippedFooterStartRow).toBe(11)
    expect(sh.rows).toHaveLength(3)

    expect(sh.rows[0].vnEduCode).toBe("0602040330")
    expect(sh.rows[0].fullName).toBe("Nguyễn Văn An")
    expect(sh.rows[0].valuesByHeader["KT GK1"]).toBe("9.5")
    expect(sh.rows[1].vnEduCode).toBe("602040331") // integer without .0
    expect(sh.rows[1].valuesByHeader["KT GK1"]).toBe("0") // 0 preserved!
    expect(sh.rows[2].isEmptyResultRow).toBe(true)
  })

  it("đọc tiêu đề 2 tầng, nhận mức 'Đ' tại TX1/GK1 và báo lỗi ô công thức không có giá trị lưu sẵn", () => {
    const buf = buildSyntheticWorkbookBuffer((wb) => {
      const ws: XLSX.WorkSheet = {}
      const aoa: any[][] = [
        [],
        [],
        ["Môn: Giáo dục thể chất   Học kỳ: 1   Năm học: 2026-2027"],
        ["Lớp: 6/1_CS1"],
        [],
        ["STT", "Mã HS", "Họ và tên", "", "Ngày sinh", "ĐDGtx", "", "", "", "GK1", "CK1", "ĐTB", "Nhận xét"],
        ["", "", "", "", "", "TX1", "TX2", "TX3", "TX4", "", "", "", ""],
        [1, "06010001", "Phạm", "Dũng", "15/05/2015", "Đ", "", "Đ", "", "Đ", "", "", ""],
      ]
      XLSX.utils.sheet_add_aoa(ws, aoa, { origin: "A1" })
      ws["!merges"] = [
        { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } }, // Họ và tên
        { s: { r: 5, c: 5 }, e: { r: 5, c: 8 } }, // ĐDGtx spanning F..I
      ]
      ws["!cols"] = [{}, { hidden: true }, {}, {}, { hidden: true }]
      // Formula cell at L8 without cached value
      ws["L8"] = { t: "n", f: "AVERAGE(F8:I8)" }
      ws["!ref"] = "A1:M8"
      XLSX.utils.book_append_sheet(wb, ws, "GDTC")
    })

    const parsed = parseVnEduWorkbook(buf, "so_diem_cac_mon_lop_6_1_cs1.xls")
    const sh = parsed.sheets[0]
    expect(sh.rows).toHaveLength(1)
    expect(sh.rows[0].valuesByHeader["TX1"]).toBe("Đ")
    expect(sh.rows[0].valuesByHeader["TX2"]).toBe("")
    expect(sh.rows[0].valuesByHeader["TX3"]).toBe("Đ") // TX2 blank did not shift TX3!
    expect(sh.rows[0].valuesByHeader["GK1"]).toBe("Đ")

    // Verify uncached formula cell is flagged and never converted to 0
    const formulaRes = readSafeCellValue({ t: "n", f: "AVERAGE(F8:I8)" }, "ĐTB", 11)
    expect(formulaRes.value).toBe("")
    expect(formulaRes.formulaError?.message).toContain("chưa có giá trị lưu sẵn")
  })

  it("readCodeCellAsText không sinh .0 hay ký hiệu khoa học", () => {
    expect(readCodeCellAsText({ t: "s", v: "0602040330", w: "0602040330" })).toBe("0602040330")
    expect(readCodeCellAsText({ t: "n", v: 2601234567 })).toBe("2601234567")
  })
})

describe("3. Gợi ý môn học, Mapping kết quả & Xem trước", () => {
  const subjects = [
    { id: "s_toan", subjectCode: "TOAN", subjectName: "Toán học" },
    { id: "s_ta", subjectCode: "TA", subjectName: "Tiếng Anh" },
    { id: "s_khtn", subjectCode: "KHTN", subjectName: "Khoa học tự nhiên" },
  ]

  it("không tự gộp Ngoại ngữ -> Tiếng Anh, Maths -> Toán học, Science -> KHTN", () => {
    expect(suggestTargetSubject("Ngoại ngữ", subjects).suggestedSubjectId).toBeNull()
    expect(suggestTargetSubject("Maths", subjects).suggestedSubjectId).toBeNull()
    expect(suggestTargetSubject("Science", subjects).suggestedSubjectId).toBeNull()
    // Tên trùng vẫn chỉ là gợi ý, không tự xác nhận
    expect(suggestTargetSubject("Toán học", subjects).suggestedSubjectId).toBe("s_toan")
  })

  it("chặn trùng giá trị mâu thuẫn, sai lớp, thiếu mã và giữ TX3 đúng cột khi TX2 trống", () => {
    const config = {
      id: "cfg1",
      version: 1,
      hasCompositeColumn: true,
      hasRatingColumn: false,
      hasRemarkColumn: true,
      formula: "AVERAGE",
      roundingRule: "ROUND_1",
      columnsJson: JSON.stringify([
        { key: "tx1", label: "TX1", group: "TX", attempt: 1, dataType: "NUMBER", maxScore: 10, aliases: ["TX1"] },
        { key: "tx2", label: "TX2", group: "TX", attempt: 2, dataType: "NUMBER", maxScore: 10, aliases: ["TX2"] },
        { key: "tx3", label: "TX3", group: "TX", attempt: 3, dataType: "NUMBER", maxScore: 10, aliases: ["TX3"] },
      ]),
    }

    const buf = buildSyntheticWorkbookBuffer((wb) => {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Môn: Toán học   Kỳ: HK1"],
        ["Lớp: 6/1"],
        ["STT", "Mã HS", "Họ và tên", "TX1", "TX2", "TX3", "ĐTB", "Cột lạ"],
        [1, "VN001", "Nguyễn Văn An", 8, "", 9, 8.5, "ABC"],
        [2, "VN001", "Nguyễn Văn An", 7, "", 9, 8.0, ""], // Trùng VN001 khác giá trị TX1!
        [3, "VN002", "Trần Thị Bình", 8, 8, 8, 8.0, ""],   // Sai lớp!
        [4, "", "Lê Văn Cường", 7, 7, 7, 7.0, ""],         // Thiếu mã!
      ])
      XLSX.utils.book_append_sheet(wb, ws, "Toan")
    })
    const parsed = parseVnEduWorkbook(buf, "test.xlsx").sheets[0]

    const preview = buildSheetPreview({
      sheet: parsed,
      targetClass: { id: "cls_61", className: "6/1" },
      confirmedSubject: { id: "s_toan", subjectCode: "TOAN", subjectName: "Toán học" },
      config,
      studentsInYear: [
        { id: "st1", studentCode: "HS001", vnEduCode: "VN001", studentName: "Nguyễn Văn An", classId: "cls_61", className: "6/1" },
        { id: "st2", studentCode: "HS002", vnEduCode: "VN002", studentName: "Trần Thị Bình", classId: "cls_62", className: "6/2" },
      ],
      existingEntries: [],
      mode: "FILL_EMPTY",
    })

    expect(preview.colMapping.extraColumns.map(e => e.excelHeader)).toEqual(["Cột lạ"])
    expect(preview.colMapping.compositeRefColumns.map(e => e.excelHeader)).toEqual(["ĐTB"])

    const st1Tx1 = preview.previewItems.find(i => i.rowIndex === 4 && i.fieldKey === "tx1")
    const st1Tx3 = preview.previewItems.find(i => i.rowIndex === 4 && i.fieldKey === "tx3")
    expect(st1Tx1?.status).toBe("ADD")
    expect(st1Tx3?.status).toBe("ADD")
    expect(preview.previewItems.find(i => i.rowIndex === 4 && i.fieldKey === "tx2")).toBeUndefined()

    const conflictItem = preview.previewItems.find(i => i.rowIndex === 5 && i.fieldKey === "tx1")
    expect(conflictItem?.status).toBe("CONFLICT")

    const wrongClass = preview.previewItems.find(i => i.rowIndex === 6)
    expect(wrongClass?.status).toBe("ERROR")
    expect(wrongClass?.reason).toContain("Sai lớp")

    const missingCode = preview.previewItems.find(i => i.rowIndex === 7)
    expect(missingCode?.status).toBe("ERROR")
    expect(missingCode?.reason).toContain("Thiếu Mã vnEdu")

    // Recompute composite uses config formula, not source ĐTB
    expect(recomputeCompositeForConfig({ tx1: "8", tx3: "9" }, config)).toBe(8.5)
  })

  it("chuẩn hóa Sổ nhận xét vnEdu Tiểu học (Thông tư 27): phím tắt 2/1/0 -> T/H/C, cột Nhận xét cuối kỳ + KT CK1 + XL CK1", () => {
    expect(isPrimaryGrade("1S_CS4")).toBe(true)
    expect(isPrimaryGrade("Khối 5")).toBe(true)
    expect(isPrimaryGrade("Khối 6")).toBe(false)

    expect(normalizePrimaryXlInput("2")).toBe("T")
    expect(normalizePrimaryXlInput("t")).toBe("T")
    expect(normalizePrimaryXlInput("1")).toBe("H")
    expect(normalizePrimaryXlInput("h")).toBe("H")
    expect(normalizePrimaryXlInput("0")).toBe("C")
    expect(normalizePrimaryXlInput("c")).toBe("C")

    const metaCk1 = getPrimaryPeriodMeta("CK1")
    expect(metaCk1.remarkColumnLabel).toBe("Nhận xét cuối kỳ")
    expect(metaCk1.ktColumnLabel).toBe("KT CK1")
    expect(metaCk1.xlColumnLabel).toBe("XL CK1")

    expect(shouldPrimarySubjectHaveKtColumn("Tiếng Việt", "Khối 1", "CK1")).toBe(true)
    expect(shouldPrimarySubjectHaveKtColumn("Đạo đức", "Khối 1", "CK1")).toBe(false)
    expect(shouldPrimarySubjectHaveKtColumn("Toán", "Khối 4", "GK1")).toBe(true)
    expect(shouldPrimarySubjectHaveKtColumn("Khoa học", "Khối 4", "GK1")).toBe(false)
    expect(shouldPrimarySubjectHaveKtColumn("Khoa học", "Khối 4", "CK1")).toBe(true)

    const primaryCfg = buildPrimaryVnEduDefaultConfig({
      grade: "Khối 1",
      subjectName: "Tiếng Việt",
      evaluationPeriod: "CK1",
    })
    expect(primaryCfg.hasCompositeColumn).toBe(false)
    expect(primaryCfg.hasRatingColumn).toBe(true)
    expect(primaryCfg.ratingColumnName).toBe("XL CK1")
    expect(primaryCfg.hasRemarkColumn).toBe(true)

    const defs = normalizeGradeColumnDefs(primaryCfg)
    expect(defs.map(d => d.label)).toEqual(["KT CK1", "XL CK1", "Nhận xét"])

    // Lọc đúng danh mục môn Tiểu học theo từng Khối (Thông tư 27 / CT GDPT 2018)
    expect(isPrimarySubjectForGrade({ subjectName: "Tiếng Việt", subjectCode: "TVI" }, "Khối 1")).toBe(true)
    expect(isPrimarySubjectForGrade({ subjectName: "Tự nhiên và Xã hội", subjectCode: "TNXH" }, "Khối 2")).toBe(true)
    expect(isPrimarySubjectForGrade({ subjectName: "Tự nhiên và Xã hội", subjectCode: "TNXH" }, "Khối 4")).toBe(false)
    expect(isPrimarySubjectForGrade({ subjectName: "Khoa học", subjectCode: "KH" }, "Khối 4")).toBe(true)
    expect(isPrimarySubjectForGrade({ subjectName: "Khoa học", subjectCode: "KH" }, "Khối 2")).toBe(false)
    expect(isPrimarySubjectForGrade({ subjectName: "Tin học và Công nghệ", subjectCode: "THCN" }, "Khối 3")).toBe(true)
    expect(isPrimarySubjectForGrade({ subjectName: "Vật lí", subjectCode: "VLI" }, "Khối 4")).toBe(false)
    expect(isPrimarySubjectForGrade({ subjectName: "Ngữ văn", subjectCode: "NVA" }, "Khối 5")).toBe(false)
  })

  it("chuẩn hóa Sổ điểm THCS & THPT theo Thông tư 22/2021/TT-BGDĐT (Môn tính điểm ĐĐGtx+ĐĐGgk+ĐĐGck+ĐTBmhk & Môn nhận xét Đ/CĐ)", () => {
    expect(isSecondaryOrHighGrade("6S_CS4")).toBe(true)
    expect(isSecondaryOrHighGrade("Khối 9")).toBe(true)
    expect(isSecondaryOrHighGrade("Khối 12")).toBe(true)
    expect(isSecondaryOrHighGrade("Khối 4")).toBe(false)

    // Phân loại môn nhận xét Đ/CĐ vs môn tính điểm theo Điều 5 Thông tư 22
    expect(isTt22CommentOnlySubject("Giáo dục thể chất")).toBe(true)
    expect(isTt22CommentOnlySubject("Nghệ thuật")).toBe(true)
    expect(isTt22CommentOnlySubject("Âm nhạc")).toBe(true)
    expect(isTt22CommentOnlySubject("Mỹ thuật")).toBe(true)
    expect(isTt22CommentOnlySubject("Hoạt động trải nghiệm, hướng nghiệp")).toBe(true)
    expect(isTt22CommentOnlySubject("Nội dung giáo dục của địa phương")).toBe(true)

    // Các môn tính điểm kết hợp nhận xét (bao gồm GDQP&AN ở THPT)
    expect(isTt22CommentOnlySubject("Toán học")).toBe(false)
    expect(isTt22CommentOnlySubject("Ngữ văn")).toBe(false)
    expect(isTt22CommentOnlySubject("Khoa học tự nhiên")).toBe(false)
    expect(isTt22CommentOnlySubject("Giáo dục quốc phòng và an ninh")).toBe(false)

    // Quy tắc vnEdu: chỉ tính ĐTBmhk sau khi có ĐĐGck
    expect(
      calculateTt22SemesterAverage(
        { txValues: ["8", "9", "8.5", "9.5"], gkValue: "8.5", ckValue: "" },
        false
      )
    ).toBe("")

    // Khi có ĐĐGck: ĐTBmhk = (sum(TX) + 2*GK + 3*CK) / (count(TX) + 5)
    // (8 + 9 + 8.5 + 9.5 + 2*8.5 + 3*9.0) / (4 + 5) = (35 + 17 + 27) / 9 = 79 / 9 = 8.777... -> 8.8
    expect(
      calculateTt22SemesterAverage(
        { txValues: ["8", "9", "8.5", "9.5"], gkValue: "8.5", ckValue: "9.0" },
        false
      )
    ).toBe("8.8")

    // Môn nhận xét Đ/CĐ
    expect(normalizeTt22DatInput("1")).toBe("Đ")
    expect(normalizeTt22DatInput("d")).toBe("Đ")
    expect(normalizeTt22DatInput("0")).toBe("CĐ")
    expect(normalizeTt22DatInput("c")).toBe("CĐ")
    expect(
      calculateTt22SemesterAverage(
        { txValues: ["Đ", "Đ"], gkValue: "Đ", ckValue: "Đ" },
        true
      )
    ).toBe("Đ")

    // Cấu hình mặc định TT22 cho Toán học Khối 6
    const mathCfg = buildSecondaryTt22VnEduDefaultConfig({
      grade: "Khối 6",
      subjectName: "Toán học",
      evaluationPeriod: "CK1",
    })
    expect(mathCfg.hasCompositeColumn).toBe(true)
    expect(mathCfg.compositeColumnName).toBe("ĐTBmhk")
    expect(JSON.parse(mathCfg.columnNames as any)).toEqual(["TX1", "TX2", "TX3", "TX4", "ĐĐGgk", "ĐĐGck"])

    // Cấu hình Học kỳ Cả năm (CN) cho Khối 12 - Môn Toán học
    const cnCfg = buildSecondaryTt22VnEduDefaultConfig({
      grade: "Khối 12",
      subjectName: "Toán học",
      evaluationPeriod: "CN",
    })
    expect(cnCfg.hasCompositeColumn).toBe(true)
    expect(cnCfg.compositeColumnName).toBe("TB Cả năm")
    expect(JSON.parse(cnCfg.columnNames as any)).toEqual(["TBHK 1", "TBHK 2", "Điểm thi lại", "Ghi chú"])

    // Phân loại Danh mục Môn học Bộ GD&ĐT (MOET) vs Đặc thù Sky-Line (SKL)
    expect(getSubjectCurriculumGroup({ subjectName: "Toán học", subjectCode: "TOA", category: "MOET" })).toBe("MOET")
    expect(getSubjectCurriculumGroup({ subjectName: "Giáo dục Cảm xúc xã hội", subjectCode: "GCX", category: "SKL" })).toBe("SKL")
    expect(getSubjectCurriculumGroup({ subjectName: "Tâm lý", subjectCode: "TLY" })).toBe("SKL")
    expect(getSubjectCurriculumGroup({ subjectName: "STEM / Công nghệ", subjectCode: "STE", category: "SKL" })).toBe("SKL")

    // Lọc môn theo cấp THCS vs THPT
    expect(isSecondarySubjectForGrade({ subjectName: "Khoa học tự nhiên", subjectCode: "KHTN" }, "Khối 6")).toBe(true)
    expect(isSecondarySubjectForGrade({ subjectName: "Giáo dục công dân", subjectCode: "GDCD" }, "Khối 8")).toBe(true)
    expect(isSecondarySubjectForGrade({ subjectName: "Giáo dục kinh tế và pháp luật", subjectCode: "GDKTPL" }, "Khối 10")).toBe(true)
    expect(isSecondarySubjectForGrade({ subjectName: "Tiếng Việt", subjectCode: "TVI" }, "Khối 6")).toBe(false)
  })

  it("đọc và đối chiếu chuẩn xác file Excel nhiều sheet mỗi sheet 1 môn (so_diem_cac_mon_lop_6_1_cs1.xls)", () => {
    const buf = buildSyntheticWorkbookBuffer((wb) => {
      // Sheet 1: cong_nghe_6_1_cs1 (giống hệt ảnh thực tế: Họ và tên gộp 4 cột B..E, tiêu đề xuống dòng ĐĐGg\nk, không có cột Mã HS)
      const ws1: XLSX.WorkSheet = {}
      const aoa1: any[][] = [
        ["SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. ĐÀ NẴNG"],
        ["TRƯỜNG TH,THCS&THPT SKY-LINE"],
        ["BẢNG ĐIỂM CHI TIẾT - MÔN CÔNG NGHỆ - HỌC KỲ 1 - NĂM HỌC 2026 2027"],
        ["Khối 6 - Lớp 6/1_CS1"],
        [],
        ["STT", "Họ và tên", "", "", "", "ĐĐGtx", "", "", "", "ĐĐGg\nk", "ĐĐGc\nk", "ĐTB\nmhk", "Nhận xét"],
        ["", "", "", "", "", "TX1", "TX2", "TX3", "TX4", "", "", "", ""],
        [1, "Châu Mỹ", "", "An", "", "", "", "", "", "9,7", "", "9,7", ""],
        [2, "Lê Đình Sĩ", "", "Phú", "", "", "", "", "", "9,5", "", "9,5", "Tích cực"],
        [],
        ["THỐNG KÊ HỌC KỲ 1", "", "", "Tốt", 24, "-", "100%"],
      ]
      XLSX.utils.sheet_add_aoa(ws1, aoa1, { origin: "A1" })
      ws1["!merges"] = [
        { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }, // A6:A7 STT
        { s: { r: 5, c: 1 }, e: { r: 6, c: 4 } }, // B6:E7 Họ và tên (4 cột!)
        { s: { r: 5, c: 5 }, e: { r: 5, c: 8 } }, // F6:I6 ĐĐGtx
        { s: { r: 5, c: 9 }, e: { r: 6, c: 9 } }, // J6:J7 ĐĐGgk
        { s: { r: 5, c: 10 }, e: { r: 6, c: 10 } }, // K6:K7 ĐĐGck
        { s: { r: 5, c: 11 }, e: { r: 6, c: 11 } }, // L6:L7 ĐTBmhk
        { s: { r: 5, c: 12 }, e: { r: 6, c: 12 } }, // M6:M7 Nhận xét
      ]
      ws1["!ref"] = "A1:M11"
      XLSX.utils.book_append_sheet(wb, ws1, "cong_nghe_6_1_cs1")

      // Sheet 2: khoa_hoc_tu_nhien_6_1_cs1
      const ws2: XLSX.WorkSheet = {}
      const aoa2: any[][] = [
        ["SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. ĐÀ NẴNG"],
        ["TRƯỜNG TH,THCS&THPT SKY-LINE"],
        ["BẢNG ĐIỂM CHI TIẾT - MÔN KHOA HỌC TỰ NHIÊN - HỌC KỲ 1 - NĂM HỌC 2026-2027"],
        ["Khối 6 - Lớp 6/1_CS1"],
        [],
        ["STT", "Họ và tên", "", "", "", "ĐĐGtx", "", "", "", "ĐĐGgk", "ĐĐGck", "ĐTBmhk", "Nhận xét"],
        ["", "", "", "", "", "TX1", "TX2", "TX3", "TX4", "", "", "", ""],
        [1, "Châu Mỹ", "", "An", "", "9,0", "9,5", "", "", "9,2", "", "", "Học tốt"],
      ]
      XLSX.utils.sheet_add_aoa(ws2, aoa2, { origin: "A1" })
      ws2["!merges"] = [
        { s: { r: 5, c: 1 }, e: { r: 6, c: 4 } },
        { s: { r: 5, c: 5 }, e: { r: 5, c: 8 } },
      ]
      ws2["!ref"] = "A1:M8"
      XLSX.utils.book_append_sheet(wb, ws2, "khoa_hoc_tu_nhien_6_1_cs1")
    })

    const parsed = parseVnEduWorkbook(buf, "so_diem_cac_mon_lop_6_1_cs1.xls")
    expect(parsed.sheets).toHaveLength(2)

    const shCn = parsed.sheets[0]
    expect(shCn.detectedSubject.toLowerCase()).toBe("công nghệ")
    expect(shCn.detectedClass).toBe("6/1_CS1")
    expect(shCn.detectedPeriod).toBe("HK1")
    expect(shCn.detectedAcademicYear).toBe("2026-2027")
    expect(shCn.rows).toHaveLength(2)
    expect(shCn.rows[0].fullName).toBe("Châu Mỹ An")
    expect(shCn.rows[1].fullName).toBe("Lê Đình Sĩ Phú")

    const ssmSubjects = [
      { id: "sub_cn", subjectCode: "CNG", subjectName: "Công nghệ" },
      { id: "sub_khtn", subjectCode: "KHTN", subjectName: "Khoa học tự nhiên" },
    ]
    expect(suggestTargetSubject(shCn.detectedSubject, ssmSubjects).suggestedSubjectId).toBe("sub_cn")
    expect(suggestTargetSubject(parsed.sheets[1].detectedSubject, ssmSubjects).suggestedSubjectId).toBe("sub_khtn")

    const tt22Cfg = buildSecondaryTt22VnEduDefaultConfig({
      grade: "Khối 6",
      subjectId: "sub_cn",
      subjectName: "Công nghệ",
      evaluationPeriod: "HK1",
    })

    const preview = buildSheetPreview({
      sheet: shCn,
      targetClass: { id: "cls_61_cs1", className: "6_1_CS1" },
      confirmedSubject: ssmSubjects[0],
      config: tt22Cfg,
      studentsInYear: [
        { id: "st_an", studentCode: "HS01", vnEduCode: "0601812881", studentName: "Châu Mỹ An", classId: "cls_61_cs1", className: "6_1_CS1" },
        { id: "st_phu", studentCode: "HS08", vnEduCode: "2606569868", studentName: "Lê Đình Sỹ Phú", classId: "cls_61_cs1", className: "6_1_CS1" },
      ],
      existingEntries: [],
      mode: "FILL_EMPTY",
    })

    expect(preview.colMapping.extraColumns).toHaveLength(0)
    expect(preview.studentIssues).toHaveLength(0)

    const anGk = preview.previewItems.find(i => i.studentId === "st_an" && i.fieldLabel === "ĐĐGgk")
    expect(anGk?.status).toBe("ADD")
    expect(anGk?.newValue).toBe("9.7")

    const phuGk = preview.previewItems.find(i => i.studentId === "st_phu" && i.fieldLabel === "ĐĐGgk")
    expect(phuGk?.status).toBe("ADD")
    expect(phuGk?.newValue).toBe("9.5")
  })

  it("không bị lệch 1 ngày sinh do múi giờ UTC+7 khi đối chiếu ngày sinh học sinh SSM với file vnEdu", () => {
    // Khi ngày sinh 15/05/2015 được tạo theo giờ địa phương Việt Nam (new Date(2015, 4, 15) -> 2015-05-14T17:00:00.000Z)
    const vnLocalMidnightDob = new Date("2015-05-14T17:00:00.000Z")
    // Hoặc khi được lưu ở UTC midnight (2015-05-15T00:00:00.000Z)
    const utcMidnightDob = new Date("2015-05-15T00:00:00.000Z")

    expect(formatDateYmd(vnLocalMidnightDob)).toBe("2015-05-15")
    expect(formatDateYmd(utcMidnightDob)).toBe("2015-05-15")
    expect(parseExcelDobToYmd("15/05/2015")).toBe("2015-05-15")

    const buf = buildSyntheticWorkbookBuffer((wb) => {
      const ws = XLSX.utils.aoa_to_sheet([
        ["BẢNG ĐIỂM CHI TIẾT - MÔN LỊCH SỬ VÀ ĐỊA LÍ - HỌC KỲ 1 - NĂM HỌC 2026-2027"],
        ["Khối 6 - Lớp 6/1_CS1"],
        ["STT", "Mã HS", "Họ và tên", "Ngày sinh", "TX1", "ĐĐGgk"],
        [1, "2101057481", "Khương Gia Hân", "15/05/2015", 9, 9.5],
        [2, "2007375741", "Trương Nhã Hân", "22/08/2015", 8.5, 9.0],
        [3, "2101057492", "Nguyễn Ngọc Gia Khiêm", "11/10/2015", 8.0, 8.5],
        [4, "1900562182", "Nguyễn Anh Hà My", "21/12/2015", 9.0, 9.0],
      ])
      XLSX.utils.book_append_sheet(wb, ws, "lich_su_va_dia_li_6_1_cs1")
    })

    const sh = parseVnEduWorkbook(buf, "so_diem_6_1_cs1.xls").sheets[0]
    const tt22Cfg = buildSecondaryTt22VnEduDefaultConfig({
      grade: "Khối 6",
      subjectId: "sub_lsdl",
      subjectName: "Lịch sử và Địa lí",
      evaluationPeriod: "HK1",
    })

    const preview = buildSheetPreview({
      sheet: sh,
      targetClass: { id: "cls_61", className: "6.1_CS1" },
      confirmedSubject: { id: "sub_lsdl", subjectCode: "LSDL", subjectName: "Lịch sử và Địa lí" },
      config: tt22Cfg,
      studentsInYear: [
        { id: "s1", studentCode: "0601011317", vnEduCode: "2101057481", studentName: "Khương Gia Hân", dateOfBirth: new Date("2015-05-14T17:00:00.000Z"), classId: "cls_61", className: "6.1_CS1" },
        { id: "s2", studentCode: "0601011265", vnEduCode: "2007375741", studentName: "Trương Nhã Hân", dateOfBirth: new Date("2015-08-21T17:00:00.000Z"), classId: "cls_61", className: "6.1_CS1" },
        { id: "s3", studentCode: "0601011325", vnEduCode: "2101057492", studentName: "Nguyễn Ngọc Gia Khiêm", dateOfBirth: new Date("2015-10-10T17:00:00.000Z"), classId: "cls_61", className: "6.1_CS1" },
        { id: "s4", studentCode: "0501030015", vnEduCode: "1900562182", studentName: "Nguyễn Anh Hà My", dateOfBirth: new Date("2015-12-20T00:00:00.000Z"), classId: "cls_61", className: "6.1_CS1" },
      ],
      existingEntries: [],
      mode: "FILL_EMPTY",
    })

    expect(preview.studentIssues).toHaveLength(0)
    expect(preview.previewItems.filter(i => i.status === "ERROR")).toHaveLength(0)
    expect(preview.previewItems.filter(i => i.status === "ADD")).toHaveLength(8)
  })
})
