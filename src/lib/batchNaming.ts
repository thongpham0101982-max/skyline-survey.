export interface StandardBatchNameParams {
  campusCode?: string | null;
  campusName?: string | null;
  periodName?: string | null;
  periodCode?: string | null;
  batchNumber?: number | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  note?: string | null;
  isPreschool?: boolean;
}

const REDUNDANT_NOTE_PATTERNS = [
  /^ks[đd]v$/i,
  /^kt[đd]v$/i,
  /^khảo sát đầu vào$/i,
  /^khao sat dau vao$/i,
  /^kiểm tra đầu vào$/i,
  /^kiem tra dau vao$/i,
  /^khảo sát lẻ$/i,
  /^khao sat le$/i,
  /^ksl$/i,
  /^tên đợt ks$/i,
  /^ten dot ks$/i,
  /^đợt\s*\d+$/i,
  /^dot\s*\d+$/i,
  /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/,
];

/**
 * Chuẩn hóa mã kỳ khảo sát ngắn gọn, dễ đọc.
 */
export function normalizePeriodShortCode(
  periodName?: string | null,
  periodCode?: string | null,
  isPreschool?: boolean
): string {
  const n = (periodName || "").trim().toLowerCase().normalize("NFC");
  const c = (periodCode || "").trim().toLowerCase().normalize("NFC");

  if (isPreschool) {
    if (n.includes("khảo sát lẻ") || n.includes("khao sat le") || c === "ksl") {
      return "MN";
    }
    if (n.includes("open day") || n.includes("openday")) {
      return "MN-OpenDay";
    }
    return "MN";
  }

  if (n.includes("khảo sát lẻ") || n.includes("khao sat le") || c === "ksl" || c.includes("_ksl")) {
    return "KSL";
  }
  if (n.includes("open day") || n.includes("openday") || c.includes("_op") || c === "od") {
    return "OpenDay";
  }
  if (n.includes("chuyển hệ") || n.includes("chuyen he") || c.includes("chuyen_he") || c === "ch") {
    return "Chuyển hệ";
  }
  if (n.includes("học kỳ 2") || n.includes("hk2") || c.includes("hk2")) {
    return "HK2";
  }
  if (n.includes("học kỳ 1") || n.includes("hk1") || c.includes("hk1")) {
    return "HK1";
  }

  const raw = (periodName || periodCode || "KS").trim();
  return raw.length > 16 ? raw.slice(0, 16).trim() : raw;
}

/**
 * Chuẩn hóa mã cơ sở ngắn (CS1, CS2, ..., ALL).
 */
export function normalizeCampusShortCode(
  campusCode?: string | null,
  campusName?: string | null
): string {
  const rawCode = (campusCode || "").trim();
  if (rawCode && rawCode.length <= 12) return rawCode;

  const rawName = (campusName || "").trim();
  if (!rawName || rawName.toLowerCase() === "tất cả" || rawName.toLowerCase() === "all") {
    return "Tất cả";
  }

  const csMatch = rawName.match(/\b(CS\d+)\b/i);
  if (csMatch) return csMatch[1].toUpperCase();
  return rawName.length > 14 ? rawName.slice(0, 14).trim() : rawName;
}

/**
 * Định dạng ngày bắt đầu khảo sát dạng dd/MM.
 */
export function formatBatchShortDate(dateInput?: Date | string | null): string {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    // YYYY-MM-DD or ISO
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}`;
    }
    // dd/MM/yyyy or dd/MM
    const vnMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})/);
    if (vnMatch) {
      return `${vnMatch[1].padStart(2, "0")}/${vnMatch[2].padStart(2, "0")}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

/**
 * Trích xuất phần ghi chú/trọng tâm có ý nghĩa từ tên đợt cũ hoặc tên đã chuẩn hóa,
 * tự động loại bỏ các từ khóa thừa như KSĐV, KTĐV, ngày tháng, mã cơ sở/kỳ.
 */
export function extractMeaningfulBatchNote(rawName?: string | null): string {
  if (!rawName) return "";
  const trimmed = rawName.trim();
  if (!trimmed) return "";

  // 1. Nếu đã ở định dạng chuẩn mới: "CS1 · KSL #091 · 12/09 (Ghi chú)"
  if (trimmed.includes(" · ") && trimmed.includes("#")) {
    const parenMatch = trimmed.match(/\(([^()]+)\)\s*$/);
    if (parenMatch) {
      const inner = parenMatch[1].trim();
      return isRedundantNote(inner) ? "" : inner;
    }
    return "";
  }

  // 2. Định dạng cũ tách bằng " _ "
  if (trimmed.includes(" _ ")) {
    const parts = trimmed.split(" _ ").map(p => p.trim()).filter(Boolean);
    let candidate = "";
    if (parts.length >= 6 && /^ks[đd]v$/i.test(parts[3])) {
      candidate = parts[4];
    } else if (parts.length === 5) {
      candidate = parts[3];
    } else if (parts.length >= 4) {
      // Lấy phần tử không phải ngày, không phải "Đợt X", không phải mã cơ sở/kỳ
      candidate = parts.slice(3).find(p => !isRedundantNote(p)) || "";
    }
    return cleanCandidateNote(candidate);
  }

  // 3. Định dạng "KSĐV_CS1 _ Đợt 1" hoặc "Đợt 1 - Nội dung | ..."
  const dashMatch = trimmed.match(/Đợt\s*\d+\s*-\s*([^|]+)/i);
  if (dashMatch) {
    return cleanCandidateNote(dashMatch[1]);
  }

  if (/^ks[đd]v_/i.test(trimmed)) {
    return "";
  }

  return cleanCandidateNote(trimmed);
}

function isRedundantNote(val: string): boolean {
  const s = val.trim();
  if (!s) return true;
  return REDUNDANT_NOTE_PATTERNS.some(re => re.test(s));
}

function cleanCandidateNote(val: string): string {
  const s = val.trim();
  if (!s || isRedundantNote(s)) return "";
  // Chuyển dạng "Nguyễn Văn A_6HNS" -> "Nguyễn Văn A - K6"
  const quickMatch = s.match(/^(.+?)_(\d{1,2})([A-Za-z0-9]+)?$/);
  if (quickMatch) {
    const studentName = quickMatch[1].trim();
    const grade = quickMatch[2];
    const sys = quickMatch[3] ? `-${quickMatch[3].toUpperCase()}` : "";
    return `${studentName} - K${grade}${sys}`;
  }
  return s;
}

/**
 * Tạo tên Đợt khảo sát theo quy chuẩn thống nhất toàn hệ thống Sky-Line:
 * [Cơ sở] · [Loại kỳ] #[STT] · [Ngày KS dd/MM] [(Ghi chú)]
 */
export function formatStandardBatchName(params: StandardBatchNameParams): string {
  const campus = normalizeCampusShortCode(params.campusCode, params.campusName);
  const periodShort = normalizePeriodShortCode(
    params.periodName,
    params.periodCode,
    params.isPreschool
  );
  const num = Math.max(1, parseInt(String(params.batchNumber || "1"), 10) || 1);
  const padDigits = periodShort === "KSL" ? 3 : 2;
  const paddedNum = String(num).padStart(padDigits, "0");

  // Ưu tiên ngày bắt đầu khảo sát (startDate), fallback sang endDate
  const dateStr =
    formatBatchShortDate(params.startDate) || formatBatchShortDate(params.endDate);

  const cleanNote = params.note ? cleanCandidateNote(params.note) : "";

  const segments = [campus, `${periodShort} #${paddedNum}`];
  if (dateStr) segments.push(dateStr);

  const base = segments.join(" · ");
  return cleanNote ? `${base} (${cleanNote})` : base;
}
