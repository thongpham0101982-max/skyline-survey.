#!/usr/bin/env node
/**
 * Công cụ tự động đối chiếu, đổi tên, nén và tải ảnh học sinh hàng loạt lên SSM Sky-Line (Turso DB).
 *
 * Cách dùng:
 *   node scripts/bulk-upload-student-photos.mjs --dir "D:\AnhHocSinh" [tùy chọn]
 *
 * Tùy chọn:
 *   --dir <path>         Thư mục chứa ảnh học sinh (quét cả thư mục con) [Bắt buộc]
 *   --dry-run            Chỉ quét, đối chiếu & thống kê (KHÔNG ghi lên CSDL)
 *   --overwrite          Ghi đè cả những học sinh đã có ảnh (mặc định: bỏ qua HS đã có ảnh)
 *   --map <file.xlsx>    File Excel ánh xạ (cột 1: Tên file hoặc Họ tên, cột 2: Mã HS)
 *   --export-renamed     Xuất bản sao ảnh đã nén & đặt tên chuẩn <MaHS>.jpg vào thư mục _DA_CHUAN_HOA
 *   --max-size <px>      Kích thước cạnh dài tối đa (mặc định: 600)
 *   --quality <1-100>    Chất lượng nén JPEG (mặc định: 82)
 *   --batch-size <n>     Số ảnh đẩy mỗi lượt batch (mặc định: 20)
 *   --target <mode>      Đích ghi DB: both (mặc định: local.db + Turso), local, hoặc cloud
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// --- 1. Đọc tham số dòng lệnh ---
function parseArgs(argv) {
  const opts = {
    dir: "",
    dryRun: false,
    overwrite: false,
    mapFile: "",
    exportRenamed: false,
    maxSize: 600,
    quality: 82,
    batchSize: 20,
    target: "both",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dir" && argv[i + 1]) opts.dir = argv[++i];
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--overwrite") opts.overwrite = true;
    else if (arg === "--map" && argv[i + 1]) opts.mapFile = argv[++i];
    else if (arg === "--export-renamed") opts.exportRenamed = true;
    else if (arg === "--max-size" && argv[i + 1]) opts.maxSize = Math.max(150, parseInt(argv[++i], 10) || 600);
    else if (arg === "--quality" && argv[i + 1]) opts.quality = Math.min(98, Math.max(40, parseInt(argv[++i], 10) || 82));
    else if (arg === "--batch-size" && argv[i + 1]) opts.batchSize = Math.min(50, Math.max(1, parseInt(argv[++i], 10) || 20));
    else if (arg === "--target" && argv[i + 1]) opts.target = String(argv[++i]).toLowerCase();
    else if (!arg.startsWith("--") && !opts.dir) opts.dir = arg;
  }
  return opts;
}

// --- 2. Đọc biến môi trường từ .env và .env.local (giống thứ tự Next.js) ---
function loadEnvFile(envPath, target) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    target[key] = val;
  }
}

function loadEnv(projectRoot) {
  const fileEnv = {};
  loadEnvFile(path.join(projectRoot, ".env"), fileEnv);
  loadEnvFile(path.join(projectRoot, ".env.local"), fileEnv);
  return { ...fileEnv, ...process.env };
}

// --- 3. Chuẩn hóa chuỗi tiếng Việt để khớp tên ---
function normalizeVi(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeClassToken(str) {
  return normalizeVi(str).replace(/\s+/g, "");
}

// --- 4. Quét đệ quy file ảnh ---
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"]);

function scanImages(rootDir) {
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "_DA_CHUAN_HOA") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTS.has(ext)) {
          results.push({
            fullPath,
            fileName: entry.name,
            baseName: path.basename(entry.name, ext).trim(),
            ext,
            parentDirName: path.basename(path.dirname(fullPath)),
            sizeBytes: fs.statSync(fullPath).size,
          });
        }
      }
    }
  }
  walk(rootDir);
  return results;
}

// --- 5. Đọc file Excel mapping (tùy chọn) ---
function loadExcelMap(mapFilePath) {
  const map = new Map();
  if (!mapFilePath) return map;
  if (!fs.existsSync(mapFilePath)) {
    throw new Error(`Không tìm thấy file Excel ánh xạ: ${mapFilePath}`);
  }
  const wb = XLSX.readFile(mapFilePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const colA = String(row[0] ?? "").trim();
    const colB = String(row[1] ?? "").trim();
    if (!colA || !colB) continue;
    // Bỏ qua dòng tiêu đề nếu có
    if (i === 0 && /ten|file|name|stt/i.test(normalizeVi(colA)) && /ma|code|id/i.test(normalizeVi(colB))) {
      continue;
    }
    const baseKey = colA.replace(/\.[^.]+$/, "").trim();
    map.set(colA.toLowerCase(), colB);
    map.set(baseKey.toLowerCase(), colB);
    map.set(normalizeVi(baseKey), colB);
  }
  return map;
}

// --- 6. Tạo CUID-like ID ---
function makeId() {
  return "sp_" + Date.now().toString(36) + "_" + crypto.randomBytes(6).toString("hex");
}

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// --- 7. Main ---
async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.dir) {
    console.log(`
Cách dùng:
  node scripts/bulk-upload-student-photos.mjs --dir "D:\\DuongDan\\ThuMucAnh" [tùy chọn]

Tùy chọn:
  --dry-run          Chỉ đối chiếu & xem trước, KHÔNG ghi lên hệ thống
  --overwrite        Ghi đè cả học sinh đã có ảnh (mặc định bỏ qua HS đã có ảnh)
  --map <file.xlsx>  File Excel ánh xạ (Cột A: Tên file / Họ tên -> Cột B: Mã HS)
  --export-renamed   Lưu thêm bản sao ảnh đã nén & đổi tên <MaHS>.jpg vào thư mục _DA_CHUAN_HOA
  --max-size 600     Kích thước cạnh dài tối đa (px)
  --quality 82       Chất lượng JPEG (40-98)
`);
    process.exit(1);
  }

  const targetDir = path.resolve(opts.dir.replace(/^"+|"+$/g, ""));
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.error(`[LỖI] Thư mục không tồn tại: ${targetDir}`);
    process.exit(1);
  }

  const env = loadEnv(PROJECT_ROOT);
  const localDbPath = path.resolve(PROJECT_ROOT, "local.db");
  const localUrl = env.LOCAL_DATABASE_URL || (fs.existsSync(localDbPath) ? `file:${localDbPath.replace(/\\/g, "/")}` : "");
  const cloudUrl = (env.TURSO_DATABASE_URL || "").replace(/^libsql:\/\//i, "https://");
  const authToken = env.TURSO_AUTH_TOKEN;

  const useLocal = (opts.target === "both" || opts.target === "local") && Boolean(localUrl);
  const useCloud = (opts.target === "both" || opts.target === "cloud") && Boolean(cloudUrl);

  if (!useLocal && !useCloud) {
    console.error("[LỖI] Không tìm thấy cấu hình LOCAL_DATABASE_URL hoặc TURSO_DATABASE_URL trong .env / .env.local");
    process.exit(1);
  }

  const localClient = useLocal ? createClient({ url: localUrl }) : null;
  const cloudClient = useCloud ? createClient({ url: cloudUrl, authToken: authToken || undefined }) : null;
  const primaryClient = localClient || cloudClient;
  const targetLabel = useLocal && useCloud ? "CẢ HAI (local.db + Turso Cloud)" : useLocal ? "LOCAL (local.db)" : "CLOUD (Turso)";
  const closeClients = () => {
    try { localClient?.close(); } catch {}
    try { cloudClient?.close(); } catch {}
  };

  console.log("=================================================================");
  console.log("  SSM SKY-LINE - CÔNG CỤ TẢI ẢNH HỌC SINH HÀNG LOẠT SIÊU TỐC");
  console.log("=================================================================");
  console.log(`• Thư mục nguồn : ${targetDir}`);
  console.log(`• Đích CSDL     : ${targetLabel}`);
  console.log(`• Chế độ        : ${opts.dryRun ? "XEM TRƯỚC (DRY-RUN - Chỉ đọc, không ghi DB)" : "ĐẨY THẲNG LÊN HỆ THỐNG"}`);
  console.log(`• Ảnh đã tồn tại: ${opts.overwrite ? "Ghi đè toàn bộ (--overwrite)" : "Bỏ qua HS đã có ảnh (Mặc định)"}`);
  console.log(`• Chuẩn nén ảnh : Max ${opts.maxSize}px | JPEG Quality ${opts.quality}`);
  if (opts.mapFile) console.log(`• Excel ánh xạ  : ${opts.mapFile}`);
  console.log("-----------------------------------------------------------------");

  const startTime = Date.now();

  // Bước 1: Quét thư mục ảnh
  console.log("[1/4] Đang quét thư mục ảnh...");
  const files = scanImages(targetDir);
  if (files.length === 0) {
    console.log("Không tìm thấy tệp ảnh nào (.jpg, .jpeg, .png, .webp, .bmp, .gif) trong thư mục.");
    closeClients();
    process.exit(0);
  }
  const totalRawBytes = files.reduce((s, f) => s + f.sizeBytes, 0);
  console.log(`      -> Tìm thấy ${files.length} ảnh (Tổng dung lượng gốc: ${formatMB(totalRawBytes)})`);

  // Đọc Excel map nếu có
  const excelMap = loadExcelMap(opts.mapFile);
  if (opts.mapFile) {
    console.log(`      -> Đã nạp ${excelMap.size} khóa ánh xạ từ Excel.`);
  }

  // Bước 2: Tải danh sách học sinh & ảnh hiện có từ CSDL chính (ưu tiên local.db)
  console.log(`[2/4] Đang kết nối cơ sở dữ liệu (${useLocal ? "local.db" : "Turso Cloud"}) để đối chiếu danh sách học sinh...`);

  const [studentsRes, photosRes] = await Promise.all([
    primaryClient.execute(`
      SELECT s.id, s.studentCode, s.studentName, c.className, cp.campusName, ay.startDate
      FROM Student s
      LEFT JOIN Class c ON s.classId = c.id
      LEFT JOIN Campus cp ON s.campusId = cp.id
      LEFT JOIN AcademicYear ay ON s.academicYearId = ay.id
    `),
    primaryClient.execute(`SELECT studentId FROM StudentPhoto`),
  ]);

  // Nếu đồng bộ thêm sang Turso Cloud, lấy map studentCode -> studentIds của Cloud để tránh lệch ID/FK
  const cloudIdsByCode = new Map();
  if (useLocal && cloudClient && !opts.dryRun) {
    try {
      const cloudStudentsRes = await cloudClient.execute(`SELECT id, studentCode FROM Student`);
      for (const r of cloudStudentsRes.rows) {
        const code = String(r.studentCode || "").trim();
        const id = String(r.id);
        if (!code) continue;
        if (!cloudIdsByCode.has(code)) cloudIdsByCode.set(code, []);
        cloudIdsByCode.get(code).push(id);
      }
    } catch (e) {
      console.warn("      [CẢNH BÁO] Không kết nối được Turso Cloud để đồng bộ phụ (sẽ vẫn ghi vào local.db):", e?.message || e);
    }
  }

  const existingPhotoStudentIds = new Set(photosRes.rows.map((r) => String(r.studentId)));

  // Gom theo studentCode (1 HS có thể có nhiều bản ghi qua các năm học)
  const byCode = new Map(); // studentCode -> { studentCode, studentName, className, campusName, latestStart, allIds: [], hasPhoto: bool }
  const byNormName = new Map(); // normalizedName -> Set<studentCode>
  const byNameAndClass = new Map(); // `${normalizedName}|${normClass}` -> Set<studentCode>

  for (const r of studentsRes.rows) {
    const id = String(r.id);
    const code = String(r.studentCode || "").trim();
    if (!code) continue;
    const name = String(r.studentName || "").trim();
    const className = String(r.className || "").trim();
    const campusName = String(r.campusName || "").trim();
    const startTs = r.startDate ? new Date(String(r.startDate)).getTime() : 0;
    const hasPhoto = existingPhotoStudentIds.has(id);

    let entry = byCode.get(code);
    if (!entry) {
      entry = {
        studentCode: code,
        studentName: name,
        className,
        campusName,
        latestStart: startTs,
        allIds: [id],
        hasPhoto,
      };
      byCode.set(code, entry);
    } else {
      entry.allIds.push(id);
      if (hasPhoto) entry.hasPhoto = true;
      if (startTs >= entry.latestStart) {
        entry.latestStart = startTs;
        entry.studentName = name;
        entry.className = className;
        entry.campusName = campusName;
      }
    }

    const normName = normalizeVi(name);
    if (normName) {
      if (!byNormName.has(normName)) byNormName.set(normName, new Set());
      byNormName.get(normName).add(code);

      if (className) {
        const key = `${normName}|${normalizeClassToken(className)}`;
        if (!byNameAndClass.has(key)) byNameAndClass.set(key, new Set());
        byNameAndClass.get(key).add(code);
      }
    }
  }

  console.log(`      -> Đã tải ${byCode.size} mã học sinh từ CSDL (${Array.from(byCode.values()).filter((e) => e.hasPhoto).length} em đã có ảnh).`);

  // Bước 3: Đối chiếu từng ảnh với danh sách học sinh
  const matchedToUpload = [];
  const skippedExisting = [];
  const unmatched = [];
  const duplicateInFolder = [];
  const seenCodes = new Set();
  const reportRows = [];

  function resolveStudent(file) {
    const base = file.baseName;
    const lowerFile = file.fileName.toLowerCase();
    const lowerBase = base.toLowerCase();
    const normBase = normalizeVi(base);

    // Tầng 1a: Trùng khít Mã HS
    if (byCode.has(base)) {
      return { entry: byCode.get(base), method: "Trùng Mã HS" };
    }

    // Tầng 1b: File Excel ánh xạ (nếu truyền --map)
    if (excelMap.size > 0) {
      const mappedCode = excelMap.get(lowerFile) || excelMap.get(lowerBase) || excelMap.get(normBase);
      if (mappedCode && byCode.has(mappedCode)) {
        return { entry: byCode.get(mappedCode), method: "Ánh xạ Excel" };
      }
    }

    // Tầng 1c: Trích chuỗi số/mã nằm trong tên file (VD: "0601020382_NguyenVanA" hoặc "1A1 - 0601020382")
    const tokens = base.split(/[\s_\-\.\(\)\[\]]+/).filter(Boolean);
    for (const tok of tokens) {
      if (tok.length >= 5 && byCode.has(tok)) {
        return { entry: byCode.get(tok), method: "Tách Mã HS từ tên file" };
      }
    }

    // Tầng 2: Khớp theo Họ tên + Tên lớp (thư mục cha)
    if (normBase) {
      const parentClass = normalizeClassToken(file.parentDirName);
      if (parentClass) {
        const key = `${normBase}|${parentClass}`;
        const set = byNameAndClass.get(key);
        if (set && set.size === 1) {
          const code = Array.from(set)[0];
          return { entry: byCode.get(code), method: `Khớp Tên + Lớp (${file.parentDirName})` };
        }
      }

      // Tầng 3: Khớp duy nhất theo Họ tên toàn trường
      const setByName = byNormName.get(normBase);
      if (setByName && setByName.size === 1) {
        const code = Array.from(setByName)[0];
        return { entry: byCode.get(code), method: "Khớp Họ tên duy nhất" };
      }
      if (setByName && setByName.size > 1) {
        return { error: `Trùng họ tên (${setByName.size} HS cùng tên, cần đặt theo Mã HS hoặc chia thư mục theo tên lớp)` };
      }
    }

    return { error: "Không tìm thấy Mã HS / Họ tên tương ứng trong CSDL" };
  }

  for (const file of files) {
    const res = resolveStudent(file);
    if (!res.entry) {
      unmatched.push({ file, reason: res.error });
      reportRows.push({
        file: path.relative(targetDir, file.fullPath),
        studentCode: "",
        studentName: "",
        className: "",
        method: "",
        status: "KHONG_KHOP",
        note: res.error,
      });
      continue;
    }

    const entry = res.entry;
    if (seenCodes.has(entry.studentCode)) {
      duplicateInFolder.push({ file, entry });
      reportRows.push({
        file: path.relative(targetDir, file.fullPath),
        studentCode: entry.studentCode,
        studentName: entry.studentName,
        className: entry.className,
        method: res.method,
        status: "TRUNG_TRONG_THU_MUC",
        note: "Đã có 1 ảnh khác của học sinh này trong cùng thư mục",
      });
      continue;
    }
    seenCodes.add(entry.studentCode);

    if (entry.hasPhoto && !opts.overwrite) {
      skippedExisting.push({ file, entry, method: res.method });
      reportRows.push({
        file: path.relative(targetDir, file.fullPath),
        studentCode: entry.studentCode,
        studentName: entry.studentName,
        className: entry.className,
        method: res.method,
        status: "BO_QUA_DA_CO_ANH",
        note: "Học sinh đã có ảnh trên hệ thống",
      });
      continue;
    }

    matchedToUpload.push({ file, entry, method: res.method });
  }

  console.log("\n------------------ KẾT QUẢ ĐỐI CHIẾU ------------------");
  console.log(`• Sẵn sàng tải lên          : ${matchedToUpload.length} ảnh`);
  console.log(`• Bỏ qua (đã có ảnh)        : ${skippedExisting.length} ảnh`);
  console.log(`• Không khớp / lỗi tên      : ${unmatched.length} ảnh`);
  if (duplicateInFolder.length > 0) {
    console.log(`• Trùng mã trong thư mục    : ${duplicateInFolder.length} ảnh`);
  }
  console.log("-------------------------------------------------------");

  if (unmatched.length > 0) {
    console.log("\nMột số tệp chưa khớp (tối đa 10 dòng đầu):");
    for (const u of unmatched.slice(0, 10)) {
      console.log(`  - ${path.relative(targetDir, u.file.fullPath)} -> ${u.reason}`);
    }
    if (unmatched.length > 10) {
      console.log(`  ... và ${unmatched.length - 10} tệp khác (xem chi tiết trong ket-qua-upload-anh.csv)`);
    }
  }

  const writeReport = () => {
    const csvPath = path.join(targetDir, "ket-qua-upload-anh.csv");
    const header = ["TepAnh", "MaHocSinh", "HoTen", "Lop", "CachKhop", "TrangThai", "GhiChu"];
    const lines = [
      header.join(","),
      ...reportRows.map((r) =>
        [r.file, r.studentCode, r.studentName, r.className, r.method, r.status, r.note].map(csvEscape).join(",")
      ),
    ];
    fs.writeFileSync(csvPath, "\uFEFF" + lines.join("\r\n"), "utf8");
    console.log(`\n• Đã xuất báo cáo chi tiết: ${csvPath}`);
  };

  if (opts.dryRun) {
    for (const item of matchedToUpload) {
      reportRows.push({
        file: path.relative(targetDir, item.file.fullPath),
        studentCode: item.entry.studentCode,
        studentName: item.entry.studentName,
        className: item.entry.className,
        method: item.method,
        status: "SAN_SANG_TAI_LEN",
        note: item.entry.hasPhoto ? "Sẽ ghi đè ảnh cũ" : "Ảnh mới",
      });
    }
    writeReport();
    console.log("\n[DRY-RUN HOÀN TẤT] Chưa có dữ liệu nào bị thay đổi trên hệ thống.");
    closeClients();
    process.exit(0);
  }

  if (matchedToUpload.length === 0) {
    writeReport();
    console.log("\nKhông có ảnh mới nào cần tải lên.");
    closeClients();
    process.exit(0);
  }

  // Bước 3: Nén & chuẩn hóa ảnh hàng loạt qua 1 tiến trình PowerShell .NET System.Drawing
  console.log(`\n[3/4] Đang nén & chuẩn hóa ${matchedToUpload.length} ảnh (max ${opts.maxSize}px, JPEG ${opts.quality}%)...`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ssm-photos-"));
  const exportDir = opts.exportRenamed ? path.join(targetDir, "_DA_CHUAN_HOA") : null;
  if (exportDir && !fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

  const toCompress = [];
  const directWebp = [];

  for (const item of matchedToUpload) {
    if (item.file.ext === ".webp") {
      directWebp.push(item);
    } else {
      const dstPath = path.join(tmpDir, `${item.entry.studentCode}.jpg`);
      item.compressedPath = dstPath;
      toCompress.push({ src: item.file.fullPath, dst: dstPath });
    }
  }

  if (toCompress.length > 0) {
    const manifestPath = path.join(tmpDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(toCompress), "utf8");
    const psScript = path.join(__dirname, "compress-images.ps1");
    const ps = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        psScript,
        "-ManifestPath",
        manifestPath,
        "-MaxSize",
        String(opts.maxSize),
        "-Quality",
        String(opts.quality),
      ],
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    );

    if (ps.status !== 0) {
      console.error("[LỖI NÉN ẢNH]", ps.stderr || ps.stdout);
      fs.rmSync(tmpDir, { recursive: true, force: true });
      closeClients();
      process.exit(1);
    }
  }

  let totalCompressedBytes = 0;
  let totalRawMatchedBytes = 0;
  const readyItems = [];

  for (const item of matchedToUpload) {
    totalRawMatchedBytes += item.file.sizeBytes;
    if (item.file.ext === ".webp") {
      const buf = fs.readFileSync(item.file.fullPath);
      totalCompressedBytes += buf.length;
      readyItems.push({ ...item, buffer: buf, contentType: "image/webp" });
      if (exportDir) fs.copyFileSync(item.file.fullPath, path.join(exportDir, `${item.entry.studentCode}.webp`));
    } else if (item.compressedPath && fs.existsSync(item.compressedPath)) {
      const buf = fs.readFileSync(item.compressedPath);
      totalCompressedBytes += buf.length;
      readyItems.push({ ...item, buffer: buf, contentType: "image/jpeg" });
      if (exportDir) fs.copyFileSync(item.compressedPath, path.join(exportDir, `${item.entry.studentCode}.jpg`));
    } else {
      reportRows.push({
        file: path.relative(targetDir, item.file.fullPath),
        studentCode: item.entry.studentCode,
        studentName: item.entry.studentName,
        className: item.entry.className,
        method: item.method,
        status: "LOI_NEN_ANH",
        note: "Không đọc hoặc nén được tệp ảnh (tệp có thể bị hỏng)",
      });
    }
  }

  const ratio = totalRawMatchedBytes > 0 ? ((1 - totalCompressedBytes / totalRawMatchedBytes) * 100).toFixed(1) : "0";
  console.log(
    `      -> Đã nén ${readyItems.length} ảnh: ${formatMB(totalRawMatchedBytes)} -> ${formatMB(totalCompressedBytes)} (Giảm ${ratio}%)`
  );
  if (exportDir) {
    console.log(`      -> Đã lưu bản sao ảnh chuẩn tên <MaHS>.jpg tại: ${exportDir}`);
  }

  // Bước 4: Đẩy batch thẳng lên CSDL chính (và đồng bộ thêm Turso Cloud nếu bật)
  console.log(`\n[4/4] Đang đẩy ${readyItems.length} ảnh lên ${targetLabel} (mỗi lượt ${opts.batchSize} ảnh)...`);
  let uploadedStudents = 0;
  let failedStudents = 0;

  const UPSERT_SQL = `
    INSERT INTO StudentPhoto (id, studentId, photoData, contentType, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(studentId) DO UPDATE SET
      photoData = excluded.photoData,
      contentType = excluded.contentType,
      updatedAt = excluded.updatedAt
  `;

  for (let i = 0; i < readyItems.length; i += opts.batchSize) {
    const chunk = readyItems.slice(i, i + opts.batchSize);
    const nowIso = new Date().toISOString();
    const statements = [];
    const cloudStatements = [];

    for (const item of chunk) {
      const base64Data = item.buffer.toString("base64");
      for (const sId of item.entry.allIds) {
        statements.push({
          sql: UPSERT_SQL,
          args: [makeId(), sId, base64Data, item.contentType, nowIso, nowIso],
        });
      }
      if (useLocal && cloudClient && cloudIdsByCode.size > 0) {
        const cIds = cloudIdsByCode.get(item.entry.studentCode) || [];
        for (const cId of cIds) {
          cloudStatements.push({
            sql: UPSERT_SQL,
            args: [makeId(), cId, base64Data, item.contentType, nowIso, nowIso],
          });
        }
      }
    }

    let ok = false;
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await primaryClient.batch(statements, "write");
        ok = true;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }

    if (ok && cloudStatements.length > 0 && cloudClient) {
      try {
        await cloudClient.batch(cloudStatements, "write");
      } catch (cloudErr) {
        // Không làm fail tiến trình local nếu Cloud tạm nghẽn
      }
    }

    if (ok) {
      uploadedStudents += chunk.length;
      for (const item of chunk) {
        reportRows.push({
          file: path.relative(targetDir, item.file.fullPath),
          studentCode: item.entry.studentCode,
          studentName: item.entry.studentName,
          className: item.entry.className,
          method: item.method,
          status: "THANH_CONG",
          note: `Đã lưu (${(item.buffer.length / 1024).toFixed(0)} KB, đồng bộ ${item.entry.allIds.length} hồ sơ năm học)`,
        });
      }
    } else {
      // Fallback: đẩy từng ảnh trong chunk lỗi để không làm mất cả batch
      for (const item of chunk) {
        const base64Data = item.buffer.toString("base64");
        try {
          const singleStmts = item.entry.allIds.map((sId) => ({
            sql: UPSERT_SQL,
            args: [makeId(), sId, base64Data, item.contentType, nowIso, nowIso],
          }));
          await primaryClient.batch(singleStmts, "write");
          uploadedStudents++;
          reportRows.push({
            file: path.relative(targetDir, item.file.fullPath),
            studentCode: item.entry.studentCode,
            studentName: item.entry.studentName,
            className: item.entry.className,
            method: item.method,
            status: "THANH_CONG",
            note: `Đã lưu lẻ (${(item.buffer.length / 1024).toFixed(0)} KB)`,
          });
        } catch (err2) {
          failedStudents++;
          reportRows.push({
            file: path.relative(targetDir, item.file.fullPath),
            studentCode: item.entry.studentCode,
            studentName: item.entry.studentName,
            className: item.entry.className,
            method: item.method,
            status: "LOI_UPLOAD",
            note: err2?.message || lastErr?.message || "Lỗi ghi CSDL",
          });
        }
      }
    }

    const done = Math.min(i + chunk.length, readyItems.length);
    const pct = Math.round((done / readyItems.length) * 100);
    process.stdout.write(`\r      -> Tiến độ: ${done}/${readyItems.length} ảnh (${pct}%)   `);
  }

  console.log("");

  // Dọn thư mục tạm
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  writeReport();

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n=================================================================");
  console.log(`  HOÀN TẤT TRONG ${elapsedSec} GIÂY!`);
  console.log(`  • Đích CSDL       : ${targetLabel}`);
  console.log(`  • Thành công      : ${uploadedStudents} ảnh`);
  console.log(`  • Bỏ qua (có sẵn) : ${skippedExisting.length} ảnh`);
  console.log(`  • Không khớp      : ${unmatched.length} ảnh`);
  if (failedStudents > 0) console.log(`  • Lỗi tải lên     : ${failedStudents} ảnh`);
  console.log("=================================================================");

  closeClients();
}

main().catch((err) => {
  console.error("\n[LỖI NGHIÊM TRỌNG]", err?.message || err);
  process.exit(1);
});
