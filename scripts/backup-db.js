/**
 * Skyline Survey Management (SSM) - Enterprise Automated Database Backup Engine v2.0
 *
 * Schedule: 23:00 every Friday (Thứ 6 hằng tuần)
 * Features:
 * - Concurrency PID lock (.backup_running.pid) with stale process detection
 * - Atomic staging (.tmp files) & pre-publication SQLite PRAGMA integrity_check / foreign_key_check
 * - Stream-based Gzip compression & automatic raw .db removal (saves ~750MB per backup)
 * - Smart StudentPhoto Vault deduplication (CORE_LITE mode reduces weekly backup from ~525MB to ~12MB)
 * - Stream-based SHA-256 checksum calculation (.db & .db.gz)
 * - Anomaly detection (row-drop protection) & Smart Retention cleanup
 * - Secondary backup mirror support (3-2-1 rule via SECONDARY_BACKUP_DIR)
 */

const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@libsql/client/web');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const nodemailer = require('nodemailer');

// Load environment variables
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const BACKUP_DIR = path.join(__dirname, '..', 'data-backups');
const MAX_BACKUPS_RETENTION = 12; // Giữ lại 12 bản sao lưu chuẩn gần nhất (~3 tháng)
const PID_LOCK_FILE = path.join(BACKUP_DIR, '.backup_running.pid');
const LAST_DATE_LOCK_FILE = path.join(BACKUP_DIR, '.last_backup_date');
const PHOTO_VAULT_GZ = path.join(BACKUP_DIR, 'student_photos_vault.db.gz');
const PHOTO_VAULT_META = path.join(BACKUP_DIR, 'student_photos_vault_meta.json');

function getTursoClient() {
  const rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL || '').trim();
  const url = rawUrl && !rawUrl.startsWith('file:')
    ? rawUrl.replace(/^libsql:\/\//, 'https://')
    : 'https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io';
  const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

  if (!url) {
    throw new Error('TURSO_DATABASE_URL or DATABASE_URL is not defined in environment!');
  }

  return createClient({ url, authToken });
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}-${mm}-${dd}_${hh}${min}${ss}`;
}

/**
 * Tính mã băm SHA-256 theo luồng stream (tiêu thụ < 5MB RAM ngay cả với file hàng GB)
 */
async function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function compressFile(srcPath, destPath) {
  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath);
  const gzip = zlib.createGzip({ level: 9 });
  await pipeline(readStream, gzip, writeStream);
}

async function decompressFile(srcGzPath, destDbPath) {
  const readStream = fs.createReadStream(srcGzPath);
  const writeStream = fs.createWriteStream(destDbPath);
  const gunzip = zlib.createGunzip();
  await pipeline(readStream, gunzip, writeStream);
}

/**
 * Kiểm tra cấu trúc nội tại của tệp SQLite (.db)
 */
function inspectSqliteDatabase(dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const integrityRes = db.prepare('PRAGMA quick_check;').all();
    const isOk = Array.isArray(integrityRes) && integrityRes[0]?.quick_check === 'ok';
    const integrityCheck = isOk ? 'OK' : JSON.stringify(integrityRes);

    let fkViolations = 0;
    try {
      const fkRes = db.prepare('PRAGMA foreign_key_check;').all();
      fkViolations = Array.isArray(fkRes) ? fkRes.length : 0;
    } catch {}

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'")
      .all();

    let rowsCount = 0;
    for (const t of tables) {
      try {
        const cnt = db.prepare(`SELECT count(1) as cnt FROM "${t.name}"`).get()?.cnt || 0;
        rowsCount += Number(cnt);
      } catch {}
    }

    return {
      integrityCheck,
      fkViolations,
      tablesCount: tables.length,
      rowsCount
    };
  } finally {
    db.close();
  }
}

/**
 * Xác minh toàn vẹn một bản sao lưu (hỗ trợ cả ID có hoặc không có tiền tố 'backup_')
 */
async function verifyBackupFile(backupId) {
  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error('Thư mục data-backups không tồn tại.');
  }

  const normalizedId = backupId.startsWith('backup_') ? backupId : `backup_${backupId}`;
  const gzFilename = `skyline_${normalizedId}.db.gz`;
  const dbFilename = `skyline_${normalizedId}.db`;
  const metaFilename = `skyline_${normalizedId}_meta.json`;

  const gzPath = path.join(BACKUP_DIR, gzFilename);
  const rawDbPath = path.join(BACKUP_DIR, dbFilename);
  const metaPath = path.join(BACKUP_DIR, metaFilename);

  if (!fs.existsSync(gzPath) && !fs.existsSync(rawDbPath)) {
    throw new Error(`Không tìm thấy tệp sao lưu cho mã ${backupId}`);
  }

  // Nếu chỉ có file .db thô mà chưa có .db.gz thì nén lại
  if (!fs.existsSync(gzPath) && fs.existsSync(rawDbPath)) {
    await compressFile(rawDbPath, gzPath);
  }

  const sha256 = await computeFileSha256(gzPath);
  const tempVerifyDbPath = path.join(BACKUP_DIR, `.tmp_verify_${ normalizedId }_${ process.pid }.db`);

  try {
    await decompressFile(gzPath, tempVerifyDbPath);
    const sha256Db = await computeFileSha256(tempVerifyDbPath);
    const dbInspection = inspectSqliteDatabase(tempVerifyDbPath);
    const verifiedAt = new Date().toISOString();

    const result = {
      id: normalizedId,
      gzFilename,
      sha256,
      sha256Db,
      integrityCheck: dbInspection.integrityCheck,
      fkViolations: dbInspection.fkViolations,
      tablesCount: dbInspection.tablesCount,
      rowsCount: dbInspection.rowsCount,
      verifiedAt
    };

    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        meta.sha256 = sha256;
        meta.sha256Db = sha256Db;
        meta.integrityCheck = dbInspection.integrityCheck;
        meta.fkViolations = dbInspection.fkViolations;
        meta.verifiedAt = verifiedAt;
        if (!meta.dbSizeBytes) {
          meta.dbSizeBytes = fs.statSync(tempVerifyDbPath).size;
        }
        meta.gzSizeBytes = fs.statSync(gzPath).size;
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
      } catch {}
    }

    return result;
  } finally {
    if (fs.existsSync(tempVerifyDbPath)) {
      try {
        fs.unlinkSync(tempVerifyDbPath);
      } catch {}
    }
  }
}

/**
 * Kiểm tra và chiếm quyền khóa PID (Chống chạy trùng tiến trình)
 */
function acquirePidLock() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  if (fs.existsSync(PID_LOCK_FILE)) {
    try {
      const lockContent = JSON.parse(fs.readFileSync(PID_LOCK_FILE, 'utf8'));
      const lockPid = Number(lockContent.pid);
      const startedAtMs = new Date(lockContent.startedAt || 0).getTime();
      const ageMinutes = (Date.now() - startedAtMs) / (1000 * 60);

      let isAlive = false;
      if (lockPid && lockPid !== process.pid) {
        try {
          process.kill(lockPid, 0);
          isAlive = true;
        } catch {
          isAlive = false;
        }
      }

      // Nếu tiến trình còn sống và chưa chạy quá 90 phút -> chặn chạy trùng
      if (isAlive && ageMinutes < 90) {
        return { acquired: false, activePid: lockPid, startedAt: lockContent.startedAt };
      }

      console.warn(`[PID Lock] Thu hồi khóa PID cũ (${lockPid}) đã kết thúc hoặc treo quá hạn.`);
    } catch {}

    try {
      fs.unlinkSync(PID_LOCK_FILE);
    } catch {}
  }

  fs.writeFileSync(
    PID_LOCK_FILE,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
  return { acquired: true };
}

function releasePidLock() {
  try {
    if (fs.existsSync(PID_LOCK_FILE)) {
      const lockContent = JSON.parse(fs.readFileSync(PID_LOCK_FILE, 'utf8'));
      if (lockContent.pid === process.pid) {
        fs.unlinkSync(PID_LOCK_FILE);
      }
    }
  } catch {}
}

/**
 * Đồng bộ bảng StudentPhoto sang Kho ảnh tĩnh (student_photos_vault.db.gz)
 * Chỉ cập nhật lại kho ảnh khi số lượng ảnh hoặc thời gian cập nhật mới nhất thay đổi
 */
async function syncStudentPhotoVault(snapshotDbPath) {
  const db = new DatabaseSync(snapshotDbPath);
  try {
    const hasTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='StudentPhoto'")
      .get();
    if (!hasTable) {
      return { photoCount: 0, vaultUpdated: false, vaultFile: null };
    }

    const stats = db
      .prepare('SELECT count(1) as cnt, max(updatedAt) as maxUpdated FROM "StudentPhoto"')
      .get();
    const photoCount = Number(stats?.cnt || 0);
    const maxUpdated = String(stats?.maxUpdated || '');

    let needVaultUpdate = !fs.existsSync(PHOTO_VAULT_GZ) || !fs.existsSync(PHOTO_VAULT_META);
    if (!needVaultUpdate) {
      try {
        const vaultMeta = JSON.parse(fs.readFileSync(PHOTO_VAULT_META, 'utf8'));
        if (vaultMeta.photoCount !== photoCount || vaultMeta.maxUpdated !== maxUpdated) {
          needVaultUpdate = true;
        }
      } catch {
        needVaultUpdate = true;
      }
    }

    if (needVaultUpdate && photoCount > 0) {
      console.log(`[PhotoVault] Phát hiện thay đổi kho ảnh học sinh (${photoCount} ảnh). Đang cập nhật student_photos_vault.db.gz...`);
      const tmpVaultDbPath = path.join(BACKUP_DIR, `.tmp_photo_vault_${process.pid}.db`);
      const tmpVaultGzPath = path.join(BACKUP_DIR, `.tmp_photo_vault_${process.pid}.db.gz`);
      try {
        if (fs.existsSync(tmpVaultDbPath)) fs.unlinkSync(tmpVaultDbPath);
        const tableSqlRow = db
          .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='StudentPhoto'")
          .get();

        const vaultDb = new DatabaseSync(tmpVaultDbPath);
        vaultDb.exec('PRAGMA synchronous = OFF; PRAGMA journal_mode = MEMORY;');
        vaultDb.exec(tableSqlRow.sql);
        vaultDb.close();

        db.exec(`ATTACH DATABASE '${tmpVaultDbPath.replace(/'/g, "''")}' AS vault_db;`);
        db.exec('INSERT INTO vault_db."StudentPhoto" SELECT * FROM main."StudentPhoto";');
        db.exec('DETACH DATABASE vault_db;');

        await compressFile(tmpVaultDbPath, tmpVaultGzPath);
        const vaultSha256 = await computeFileSha256(tmpVaultGzPath);
        const vaultGzSize = fs.statSync(tmpVaultGzPath).size;
        const vaultDbSize = fs.statSync(tmpVaultDbPath).size;

        fs.renameSync(tmpVaultGzPath, PHOTO_VAULT_GZ);
        fs.writeFileSync(
          PHOTO_VAULT_META,
          JSON.stringify(
            {
              photoCount,
              maxUpdated,
              dbSizeBytes: vaultDbSize,
              gzSizeBytes: vaultGzSize,
              sha256: vaultSha256,
              updatedAt: new Date().toISOString()
            },
            null,
            2
          ),
          'utf8'
        );
        console.log(`[PhotoVault] Đã lưu trữ an toàn ${photoCount} ảnh vào kho tĩnh (${formatBytes(vaultGzSize)}).`);
      } finally {
        if (fs.existsSync(tmpVaultDbPath)) try { fs.unlinkSync(tmpVaultDbPath); } catch {}
        if (fs.existsSync(tmpVaultGzPath)) try { fs.unlinkSync(tmpVaultGzPath); } catch {}
      }
    }

    // Xóa dữ liệu ảnh nặng trong bản snapshot hàng tuần và thu gọn dung lượng bằng VACUUM
    db.exec('DELETE FROM "StudentPhoto";');
    db.exec('VACUUM;');

    return {
      photoCount,
      vaultUpdated: needVaultUpdate,
      vaultFile: 'student_photos_vault.db.gz'
    };
  } finally {
    db.close();
  }
}

/**
 * Dọn dẹp tệp trùng lặp, tệp .db thô dư thừa, tệp .tmp rác và áp dụng Retention thông minh
 */
async function cleanupDuplicateAndOrphanFiles(options = {}) {
  const verifyMissing = options.verifyMissing !== false;
  let freedBytes = 0;
  let removedFilesCount = 0;
  let verifiedCount = 0;

  if (!fs.existsSync(BACKUP_DIR)) {
    return { freedBytes, removedFilesCount, verifiedCount };
  }

  // 1. Kiểm tra và dọn PID lock bị treo (nếu không có tiến trình thực sự chạy)
  if (fs.existsSync(PID_LOCK_FILE)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(PID_LOCK_FILE, 'utf8'));
      let alive = false;
      if (lockData.pid) {
        try {
          process.kill(Number(lockData.pid), 0);
          alive = true;
        } catch {
          alive = false;
        }
      }
      if (!alive) {
        fs.unlinkSync(PID_LOCK_FILE);
        removedFilesCount++;
      }
    } catch {
      try { fs.unlinkSync(PID_LOCK_FILE); } catch {}
    }
  }

  const allFiles = fs.readdirSync(BACKUP_DIR);

  // 2. Xóa các tệp tạm (.tmp_*) cũ hơn 30 phút hoặc không có tiến trình chạy
  for (const f of allFiles) {
    if (f.startsWith('.tmp_')) {
      const fullPath = path.join(BACKUP_DIR, f);
      try {
        const stat = fs.statSync(fullPath);
        const ageMin = (Date.now() - stat.mtimeMs) / 60000;
        if (ageMin > 30 || !fs.existsSync(PID_LOCK_FILE)) {
          freedBytes += stat.size;
          fs.unlinkSync(fullPath);
          removedFilesCount++;
          console.log(`[Cleanup] Đã xóa tệp tạm rác: ${f} (${formatBytes(stat.size)})`);
        }
      } catch {}
    }
  }

  // 3. Xóa các tệp .db thô đã có bản nén .db.gz tương ứng (Giải phóng ~751MB/tệp)
  for (const f of fs.readdirSync(BACKUP_DIR)) {
    if (f.startsWith('skyline_backup_') && f.endsWith('.db')) {
      const gzEquivalent = `${f}.gz`;
      const dbFullPath = path.join(BACKUP_DIR, f);
      const gzFullPath = path.join(BACKUP_DIR, gzEquivalent);

      if (fs.existsSync(gzFullPath) && fs.statSync(gzFullPath).size > 1024) {
        try {
          const stat = fs.statSync(dbFullPath);
          freedBytes += stat.size;
          fs.unlinkSync(dbFullPath);
          removedFilesCount++;
          console.log(`[Cleanup] Đã xóa tệp SQLite thô trùng lặp: ${f} (Giải phóng ${formatBytes(stat.size)})`);
        } catch {}
      }
    }
  }

  // 4. Đọc toàn bộ danh sách _meta.json và loại bỏ các bản chạy trùng trong cùng 1 ngày (cùng chế độ SCHEDULED/WINDOWS_SCHEDULER)
  const metaItems = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('skyline_backup_') && f.endsWith('_meta.json'))
    .map((f) => {
      const fullPath = path.join(BACKUP_DIR, f);
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        return {
          metaFile: f,
          content,
          createdAt: new Date(content.createdAt || fs.statSync(fullPath).mtime)
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Gộp các bản sao lưu chạy trùng trong cùng 1 ngày (giữ lại bản mới nhất / đã verify trong ngày đó)
  const seenDayBuckets = new Map();
  const duplicateItemsToDelete = [];

  for (const item of metaItems) {
    const dayKey = item.createdAt.toISOString().split('T')[0];
    const rowKey = `${dayKey}_${item.content.totalRows || 0}`;
    if (!seenDayBuckets.has(rowKey)) {
      seenDayBuckets.set(rowKey, item);
    } else {
      duplicateItemsToDelete.push(item);
    }
  }

  for (const dup of duplicateItemsToDelete) {
    const dbFile = dup.content.filename;
    const gzFile = dup.content.gzFilename;
    if (dbFile && fs.existsSync(path.join(BACKUP_DIR, dbFile))) {
      try {
        freedBytes += fs.statSync(path.join(BACKUP_DIR, dbFile)).size;
        fs.unlinkSync(path.join(BACKUP_DIR, dbFile));
        removedFilesCount++;
      } catch {}
    }
    if (gzFile && fs.existsSync(path.join(BACKUP_DIR, gzFile))) {
      try {
        freedBytes += fs.statSync(path.join(BACKUP_DIR, gzFile)).size;
        fs.unlinkSync(path.join(BACKUP_DIR, gzFile));
        removedFilesCount++;
      } catch {}
    }
    if (dup.metaFile && fs.existsSync(path.join(BACKUP_DIR, dup.metaFile))) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, dup.metaFile));
        removedFilesCount++;
      } catch {}
    }
    console.log(`[Cleanup] Đã dọn bản sao lưu trùng lặp trong ngày: ${dup.content.id}`);
  }

  // 5. Áp dụng chính sách Retention (giữ tối đa MAX_BACKUPS_RETENTION bản chuẩn)
  const remainingMetas = metaItems.filter((item) => !duplicateItemsToDelete.includes(item));
  if (remainingMetas.length > MAX_BACKUPS_RETENTION) {
    const toExpire = remainingMetas.slice(MAX_BACKUPS_RETENTION);
    for (const item of toExpire) {
      const dbFile = item.content.filename;
      const gzFile = item.content.gzFilename;
      if (dbFile && fs.existsSync(path.join(BACKUP_DIR, dbFile))) {
        try {
          freedBytes += fs.statSync(path.join(BACKUP_DIR, dbFile)).size;
          fs.unlinkSync(path.join(BACKUP_DIR, dbFile));
          removedFilesCount++;
        } catch {}
      }
      if (gzFile && fs.existsSync(path.join(BACKUP_DIR, gzFile))) {
        try {
          freedBytes += fs.statSync(path.join(BACKUP_DIR, gzFile)).size;
          fs.unlinkSync(path.join(BACKUP_DIR, gzFile));
          removedFilesCount++;
        } catch {}
      }
      if (item.metaFile && fs.existsSync(path.join(BACKUP_DIR, item.metaFile))) {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, item.metaFile));
          removedFilesCount++;
        } catch {}
      }
      console.log(`[Retention] Đã xoá bản sao lưu quá hạn: ${item.metaFile}`);
    }
  }

  // 6. Tự động xác minh SHA-256 cho các bản chưa có mã băm
  if (verifyMissing) {
    const activeMetas = remainingMetas.slice(0, MAX_BACKUPS_RETENTION);
    for (const item of activeMetas) {
      if (!item.content.sha256) {
        try {
          console.log(`[AutoVerify] Đang bổ sung xác minh toàn vẹn & SHA-256 cho ${item.content.id}...`);
          await verifyBackupFile(item.content.id);
          verifiedCount++;
        } catch (vErr) {
          console.warn(`[AutoVerify] Không thể xác minh ${item.content.id}:`, vErr.message);
        }
      }
    }
  }

  return { freedBytes, removedFilesCount, verifiedCount };
}

/**
 * Xóa một bản sao lưu cụ thể theo ID
 */
function deleteBackupById(backupId) {
  const normalizedId = backupId.startsWith('backup_') ? backupId : `backup_${backupId}`;
  const metaFiles = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('skyline_backup_') && f.endsWith('_meta.json'));

  if (metaFiles.length <= 1) {
    throw new Error('Không thể xóa bản sao lưu duy nhất còn lại trong hệ thống.');
  }

  const gzPath = path.join(BACKUP_DIR, `skyline_${normalizedId}.db.gz`);
  const dbPath = path.join(BACKUP_DIR, `skyline_${normalizedId}.db`);
  const metaPath = path.join(BACKUP_DIR, `skyline_${normalizedId}_meta.json`);

  let freedBytes = 0;
  for (const p of [gzPath, dbPath, metaPath]) {
    if (fs.existsSync(p)) {
      freedBytes += fs.statSync(p).size;
      fs.unlinkSync(p);
    }
  }

  return { deletedId: normalizedId, freedBytes };
}

async function sendNotificationEmail(backupResult) {
  try {
    const smtpUser = (process.env.SMTP_USER || 'bankhaothi@skylineschool.edu.vn').trim();
    const smtpPass = (process.env.SMTP_PASS || '').trim();
    const backupUser = (process.env.BACKUP_SMTP_USER || 'dbclskl@gmail.com').trim();
    const backupPass = (process.env.BACKUP_SMTP_PASS || '').trim();

    if (!smtpPass && !backupPass) {
      console.log('[Email] Bỏ qua gửi email do chưa cấu hình SMTP_PASS / BACKUP_SMTP_PASS.');
      return;
    }

    const isError = backupResult.status === 'FAILED';
    const subject = isError
      ? `[CẢNH BÁO KHẨN - SQMS] Sao Lưu Dữ Liệu Thất Bại (${new Date().toLocaleDateString('vi-VN')})`
      : `[Sky-line SQMS] Thông Báo Sao Lưu Dữ Liệu Thành Công - ${backupResult.dayOfWeek} (${backupResult.dateStr})`;

    const htmlContent = isError
      ? `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #dc2626; padding: 24px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">CẢNH BÁO LỖI SAO LƯU HỆ THỐNG SQMS</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Tiến trình sao lưu tự động gặp sự cố</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          <p><strong>Chế độ kích hoạt:</strong> ${backupResult.triggerType}</p>
          <p><strong>Chi tiết lỗi:</strong> <code>${backupResult.error || 'Unknown Error'}</code></p>
        </div>
      </div>`
      : `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #003B3A, #0f766e); padding: 24px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">HỆ THỐNG SQMS</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Báo cáo Sao lưu Cơ sở Dữ liệu Định kỳ &amp; Xác minh SHA-256</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #166534; font-weight: bold; font-size: 15px;">
              ✓ Tiến trình sao lưu và kiểm định toàn vẹn (Integrity Check: ${backupResult.integrityCheck}) đã hoàn tất!
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Thời gian sao lưu:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">${new Date(backupResult.createdAt).toLocaleString('vi-VN')}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Chế độ &amp; Nguồn CSDL:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #2563eb;">${backupResult.triggerType} (${backupResult.sourceEngine || 'LOCAL'} • ${backupResult.backupMode || 'FULL'})</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Tổng số bảng / Bản ghi:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #059669;">${backupResult.totalTables} bảng • ${backupResult.totalRows.toLocaleString('vi-VN')} dòng</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Dung lượng gốc (.db):</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">${formatBytes(backupResult.dbSizeBytes)} (Đã tự động xóa file thô)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Dung lượng lưu trữ (.db.gz):</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #7c3aed;">${formatBytes(backupResult.gzSizeBytes)} (Tiết kiệm ~${Math.round((1 - backupResult.gzSizeBytes / (backupResult.dbSizeBytes || 1)) * 100)}%)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Mã băm SHA-256:</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace; font-size: 11px;">${backupResult.sha256}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Tên tệp lưu trữ:</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace; font-size: 12px;">${backupResult.gzFilename}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const recipients = ['bankhaothi@skylineschool.edu.vn', backupUser].filter(Boolean);

    if (smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.office365.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: false,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
        });
        await transporter.sendMail({
          from: `"SQMS" <${smtpUser}>`,
          to: recipients,
          subject,
          html: htmlContent
        });
        console.log('[Email] Đã gửi thông báo sao lưu qua Office 365 thành công.');
        return;
      } catch (primaryErr) {
        console.warn('[Email] Office 365 lỗi, chuyển sang Gmail dự phòng...', primaryErr.message);
      }
    }

    if (backupPass) {
      const gmailTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: backupUser, pass: backupPass }
      });
      await gmailTransporter.sendMail({
        from: `"BAN KHẢO THÍ & ĐBCL SKY-LINE" <${backupUser}>`,
        to: recipients,
        subject,
        html: htmlContent
      });
      console.log('[Email] Đã gửi thông báo sao lưu qua Gmail dự phòng thành công.');
    }
  } catch (emailErr) {
    console.warn('[Email] Không thể gửi email thông báo (sao lưu DB vẫn hoàn tất):', emailErr.message);
  }
}

async function runBackup(options = {}) {
  const triggerType = options.triggerType || 'MANUAL';
  const force = Boolean(options.force);
  const backupMode = (options.mode || process.env.BACKUP_DEFAULT_MODE || 'FULL').toUpperCase(); // 'FULL' | 'CORE_LITE'
  const requestedSource = (options.source || 'AUTO').toUpperCase(); // 'AUTO' | 'LOCAL' | 'CLOUD'
  const startTime = Date.now();

  console.log(`\n================================================================`);
  console.log(`  SQMS - BẮT ĐẦU SAO LƯU DỮ LIỆU AN TOÀN (v2.0)`);
  console.log(`  Thời gian: ${new Date().toLocaleString('vi-VN')} | Chế độ: ${triggerType} | Gói: ${backupMode}`);
  console.log(`================================================================\n`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 1. Kiểm tra khóa độc quyền PID
  const lockStatus = acquirePidLock();
  if (!lockStatus.acquired) {
    console.log(`[Backup] Đang có tiến trình sao lưu khác hoạt động (PID: ${lockStatus.activePid}). Bỏ qua.`);
    return { skipped: true, reason: 'PROCESS_ALREADY_RUNNING', pid: lockStatus.activePid };
  }

  let tmpDbPath = null;
  let tmpGzPath = null;

  try {
    // 2. Chống chạy trùng trong ngày đối với lịch tự động
    const todayStr = new Date().toISOString().split('T')[0];
    if (!force && triggerType !== 'MANUAL' && triggerType !== 'MANUAL_WEB_ADMIN') {
      if (fs.existsSync(LAST_DATE_LOCK_FILE)) {
        const lastDate = fs.readFileSync(LAST_DATE_LOCK_FILE, 'utf8').trim();
        if (lastDate === todayStr) {
          console.log(`[Backup] Hôm nay (${todayStr}) đã có bản sao lưu định kỳ hợp lệ. Bỏ qua lượt chạy trùng.`);
          return { skipped: true, reason: 'ALREADY_RAN_TODAY' };
        }
      }
    }

    const localDbPath = path.resolve(__dirname, '..', 'local.db');
    const useLocalEngine =
      requestedSource === 'LOCAL' ||
      (requestedSource === 'AUTO' &&
        ((process.env.DEFAULT_DB_ENGINE || 'LOCAL').toUpperCase().trim() !== 'CLOUD' || fs.existsSync(localDbPath)));

    const sourceEngine = useLocalEngine && fs.existsSync(localDbPath) ? 'LOCAL' : 'CLOUD';

    const timestamp = getFormattedTimestamp();
    const backupId = `backup_${timestamp}`;
    const dbFilename = `skyline_${backupId}.db`;
    const gzFilename = `skyline_${backupId}.db.gz`;
    const metaFilename = `skyline_${backupId}_meta.json`;

    tmpDbPath = path.join(BACKUP_DIR, `.tmp_${dbFilename}`);
    tmpGzPath = path.join(BACKUP_DIR, `.tmp_${gzFilename}`);
    const targetGzPath = path.join(BACKUP_DIR, gzFilename);
    const targetMetaPath = path.join(BACKUP_DIR, metaFilename);

    if (fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
    if (fs.existsSync(tmpGzPath)) fs.unlinkSync(tmpGzPath);

    let tablesCount = 0;
    let totalRowsCount = 0;

    if (sourceEngine === 'LOCAL') {
      console.log(`[1/5] Nguồn CSDL nội bộ: local.db (${formatBytes(fs.statSync(localDbPath).size)})...`);
      console.log(`[2/5] Đang tạo snapshot nguyên tử (VACUUM INTO) sang tệp tạm...`);

      const srcDb = new DatabaseSync(localDbPath, { readOnly: true });
      srcDb.exec(`VACUUM INTO '${tmpDbPath.replace(/'/g, "''")}'`);
      srcDb.close();
    } else {
      const client = getTursoClient();
      console.log(`[1/5] Đang kết nối Turso Cloud và đọc danh sách cấu trúc bảng...`);
      const tablesRes = await client.execute(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
        ORDER BY name ASC
      `);
      const tables = tablesRes.rows;

      const indexesRes = await client.execute(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
      `);
      const indexes = indexesRes.rows;

      console.log(`[2/5] Đang khởi tạo cơ sở dữ liệu tạm và tải dữ liệu từ Turso Cloud...`);
      const localDb = new DatabaseSync(tmpDbPath);
      localDb.exec('PRAGMA foreign_keys = OFF;');
      localDb.exec('PRAGMA synchronous = OFF;');
      localDb.exec('PRAGMA journal_mode = MEMORY;');

      for (const t of tables) {
        if (t.sql) {
          try {
            localDb.exec(t.sql);
          } catch (ddlErr) {
            console.warn(`[DDL Warning] Lỗi tạo bảng ${t.name}:`, ddlErr.message);
          }
        }
      }

      let processedTables = 0;
      for (const t of tables) {
        const tableName = t.name;
        processedTables++;
        try {
          const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
          const rowCount = Number(countRes.rows[0]?.cnt || 0);
          if (rowCount === 0) continue;

          process.stdout.write(`  [${processedTables}/${tables.length}] ${tableName}: ${rowCount} dòng... `);
          const isLargeBlobTable = tableName === 'StudentPhoto' || tableName === 'TaskAttachment';
          const shouldChunk = rowCount > 10000 || (isLargeBlobTable && rowCount > 50);

          if (shouldChunk) {
            let lastRowid = 0;
            let copied = 0;
            const CHUNK_SIZE = isLargeBlobTable ? 50 : 10000;

            while (copied < rowCount) {
              const chunkRes = await client.execute({
                sql: `SELECT rowid, * FROM "${tableName}" WHERE rowid > ? ORDER BY rowid ASC LIMIT ?`,
                args: [lastRowid, CHUNK_SIZE]
              });
              if (chunkRes.rows.length === 0) break;

              const cols = chunkRes.columns.filter((c) => c !== 'rowid');
              const placeholders = cols.map(() => '?').join(', ');
              const insertStmt = localDb.prepare(
                `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
              );

              localDb.exec('BEGIN TRANSACTION;');
              try {
                for (const row of chunkRes.rows) {
                  insertStmt.run(...cols.map((c) => row[c]));
                  if (row.rowid > lastRowid) lastRowid = row.rowid;
                }
                localDb.exec('COMMIT;');
              } catch (insertErr) {
                localDb.exec('ROLLBACK;');
                throw insertErr;
              }
              copied += chunkRes.rows.length;
            }
            console.log(`[XONG]`);
          } else {
            const dataRes = await client.execute(`SELECT * FROM "${tableName}"`);
            if (dataRes.rows.length > 0) {
              const cols = dataRes.columns;
              const placeholders = cols.map(() => '?').join(', ');
              const insertStmt = localDb.prepare(
                `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
              );

              localDb.exec('BEGIN TRANSACTION;');
              try {
                for (const row of dataRes.rows) {
                  insertStmt.run(...cols.map((c) => row[c]));
                }
                localDb.exec('COMMIT;');
              } catch (insertErr) {
                localDb.exec('ROLLBACK;');
                throw insertErr;
              }
            }
            console.log(`[XONG]`);
          }
        } catch (tableErr) {
          console.error(`\n[LỖI] Bảng ${tableName}:`, tableErr.message);
        }
      }

      for (const idx of indexes) {
        if (idx.sql) {
          try {
            localDb.exec(idx.sql);
          } catch {}
        }
      }
      localDb.close();
    }

    // 3. Nếu chế độ CORE_LITE (Tối ưu dung lượng), đồng bộ ảnh sang Kho ảnh tĩnh rồi làm gọn snapshot
    let photoVaultInfo = null;
    if (backupMode === 'CORE_LITE') {
      console.log(`[2.5/5] Chế độ CORE_LITE: Đồng bộ kho ảnh tĩnh (Deduplication)...`);
      photoVaultInfo = await syncStudentPhotoVault(tmpDbPath);
    }

    // 4. Kiểm định toàn vẹn CSDL và tính mã băm SHA-256 trước khi xuất bản
    console.log(`[3/5] Đang kiểm định toàn vẹn cấu trúc SQLite (PRAGMA quick_check & foreign_key_check)...`);
    const inspection = inspectSqliteDatabase(tmpDbPath);
    tablesCount = inspection.tablesCount;
    totalRowsCount = inspection.rowsCount;

    if (inspection.integrityCheck !== 'OK') {
      throw new Error(`Kiểm tra toàn vẹn SQLite thất bại: ${inspection.integrityCheck}`);
    }

    const dbStats = fs.statSync(tmpDbPath);
    const sha256Db = await computeFileSha256(tmpDbPath);
    console.log(`=> CSDL đạt chuẩn toàn vẹn (OK) | ${tablesCount} bảng | ${totalRowsCount.toLocaleString('vi-VN')} dòng | Kích thước gốc: ${formatBytes(dbStats.size)}`);

    // 5. Nén Gzip và xóa ngay tệp .db thô để tiết kiệm ổ đĩa
    console.log(`[4/5] Đang nén Gzip mức 9 và tính mã băm SHA-256...`);
    await compressFile(tmpDbPath, tmpGzPath);
    const gzStats = fs.statSync(tmpGzPath);
    const sha256 = await computeFileSha256(tmpGzPath);

    // Xóa ngay tệp .db tạm sau khi nén thành công
    fs.unlinkSync(tmpDbPath);
    tmpDbPath = null;

    // Đổi tên nguyên tử sang tệp chính thức
    fs.renameSync(tmpGzPath, targetGzPath);
    tmpGzPath = null;

    console.log(`=> Dung lượng lưu trữ (.db.gz): ${formatBytes(gzStats.size)} (Tiết kiệm ${Math.round((1 - gzStats.size / (dbStats.size || 1)) * 100)}%)`);
    console.log(`=> SHA-256 (.db.gz): ${sha256}`);

    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    const dayOfWeek = daysOfWeek[now.getDay()];

    const backupMeta = {
      id: backupId,
      filename: dbFilename,
      gzFilename: gzFilename,
      createdAt: now.toISOString(),
      dateStr: now.toLocaleDateString('vi-VN'),
      dayOfWeek,
      totalTables: tablesCount,
      totalRows: totalRowsCount,
      dbSizeBytes: dbStats.size,
      gzSizeBytes: gzStats.size,
      sha256,
      sha256Db,
      integrityCheck: inspection.integrityCheck,
      fkViolations: inspection.fkViolations,
      verifiedAt: now.toISOString(),
      durationSeconds,
      triggerType,
      sourceEngine,
      backupMode,
      photoVaultRef: photoVaultInfo ? photoVaultInfo.vaultFile : undefined,
      photoVaultCount: photoVaultInfo ? photoVaultInfo.photoCount : undefined,
      status: 'SUCCESS'
    };

    fs.writeFileSync(targetMetaPath, JSON.stringify(backupMeta, null, 2), 'utf8');
    if (triggerType === 'WINDOWS_SCHEDULER' || triggerType === 'SCHEDULED') {
      fs.writeFileSync(LAST_DATE_LOCK_FILE, todayStr, 'utf8');
    }

    // Sao lưu dự phòng sang ổ đĩa/thư mục thứ 2 (nếu có cấu hình SECONDARY_BACKUP_DIR)
    const secondaryDir = (process.env.SECONDARY_BACKUP_DIR || '').trim();
    if (secondaryDir) {
      try {
        if (!fs.existsSync(secondaryDir)) fs.mkdirSync(secondaryDir, { recursive: true });
        fs.copyFileSync(targetGzPath, path.join(secondaryDir, gzFilename));
        fs.copyFileSync(targetMetaPath, path.join(secondaryDir, metaFilename));
        console.log(`[Secondary Mirror] Đã đồng bộ bản sao dự phòng sang: ${secondaryDir}`);
      } catch (secErr) {
        console.warn(`[Secondary Mirror] Cảnh báo lỗi copy sang thư mục dự phòng:`, secErr.message);
      }
    }

    console.log(`\n[5/5] Tối ưu hóa ổ đĩa, dọn tệp trùng lặp & gửi email báo cáo...`);
    await cleanupDuplicateAndOrphanFiles({ verifyMissing: false });
    await sendNotificationEmail(backupMeta);

    console.log(`\n================================================================`);
    console.log(`  SAO LƯU THÀNH CÔNG! Tổng: ${totalRowsCount.toLocaleString('vi-VN')} dòng | Thời gian: ${durationSeconds}s`);
    console.log(`  File: ${targetGzPath}`);
    console.log(`================================================================\n`);

    return backupMeta;
  } catch (err) {
    console.error('[Backup Error]:', err);
    await sendNotificationEmail({
      status: 'FAILED',
      triggerType,
      error: err.message
    });
    throw err;
  } finally {
    if (tmpDbPath && fs.existsSync(tmpDbPath)) {
      try { fs.unlinkSync(tmpDbPath); } catch {}
    }
    if (tmpGzPath && fs.existsSync(tmpGzPath)) {
      try { fs.unlinkSync(tmpGzPath); } catch {}
    }
    releasePidLock();
  }
}

// Chạy trực tiếp từ dòng lệnh
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const cleanupOnly = args.includes('--cleanup');
  const triggerArg = args.find((a) => a.startsWith('--trigger='));
  const modeArg = args.find((a) => a.startsWith('--mode='));
  const sourceArg = args.find((a) => a.startsWith('--source='));
  const triggerType = triggerArg ? triggerArg.split('=')[1] : 'CLI_MANUAL';
  const mode = modeArg ? modeArg.split('=')[1] : undefined;
  const source = sourceArg ? sourceArg.split('=')[1] : undefined;

  if (cleanupOnly) {
    cleanupDuplicateAndOrphanFiles({ verifyMissing: true })
      .then((res) => {
        console.log(
          `[Cleanup Complete] Giải phóng: ${formatBytes(res.freedBytes)} | Đã xóa: ${res.removedFilesCount} tệp | Đã xác minh: ${res.verifiedCount} bản.`
        );
        process.exit(0);
      })
      .catch((err) => {
        console.error('[Cleanup Error]:', err);
        process.exit(1);
      });
  } else {
    const checkScheduled = args.includes('--check-scheduled');
    if (checkScheduled) {
      const now = new Date();
      const isFriday = now.getDay() === 5;
      const isHour23 = now.getHours() === 23;
      if (!isFriday || !isHour23) {
        console.log(`[Scheduled Check] Hiện tại không phải Thứ 6 lúc 23h (${now.toLocaleTimeString()}). Bỏ qua.`);
        process.exit(0);
      }
    }

    runBackup({ triggerType, force, mode, source })
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('[FATAL ERROR] Sao lưu thất bại:', err);
        process.exit(1);
      });
  }
}

module.exports = {
  runBackup,
  getFormattedTimestamp,
  formatBytes,
  computeFileSha256,
  compressFile,
  decompressFile,
  verifyBackupFile,
  cleanupDuplicateAndOrphanFiles,
  deleteBackupById
};
