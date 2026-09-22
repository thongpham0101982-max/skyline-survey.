/**
 * Skyline Survey Management (SSM) - Automated Database Backup Engine
 * 
 * Schedule: 23:00 every Friday (Thứ 6 hằng tuần)
 * Dual support: Windows Task Scheduler & In-App Cron
 */

const { DatabaseSync } = require('node:sqlite');
const { createClient } = require('@libsql/client/web');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
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
const MAX_BACKUPS_RETENTION = 12; // Giữ lại 12 bản sao lưu gần nhất (~3 tháng)

function getTursoClient() {
  const rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL || '').trim();
  const url = rawUrl ? rawUrl.replace(/^libsql:\/\//, 'https://') : 'https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io';
  const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

  if (!url) {
    throw new Error('TURSO_DATABASE_URL or DATABASE_URL is not defined in environment!');
  }

  return createClient({ url, authToken });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
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

async function compressFile(srcPath, destPath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(srcPath);
    const writeStream = fs.createWriteStream(destPath);
    const gzip = zlib.createGzip({ level: 9 });

    readStream
      .pipe(gzip)
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });
}

function cleanupOldBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs.readdirSync(BACKUP_DIR);
    const metaFiles = files
      .filter(f => f.startsWith('skyline_backup_') && f.endsWith('_meta.json'))
      .map(f => {
        const filePath = path.join(BACKUP_DIR, f);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          return {
            metaFile: f,
            createdAt: new Date(content.createdAt || fs.statSync(filePath).mtime),
            id: content.id,
            dbFile: content.filename,
            gzFile: content.gzFilename
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (metaFiles.length > MAX_BACKUPS_RETENTION) {
      const toDelete = metaFiles.slice(MAX_BACKUPS_RETENTION);
      console.log(`[Retention] Dọn dẹp ${toDelete.length} bản sao lưu cũ hơn ${MAX_BACKUPS_RETENTION} bản...`);
      for (const item of toDelete) {
        if (item.dbFile && fs.existsSync(path.join(BACKUP_DIR, item.dbFile))) {
          fs.unlinkSync(path.join(BACKUP_DIR, item.dbFile));
        }
        if (item.gzFile && fs.existsSync(path.join(BACKUP_DIR, item.gzFile))) {
          fs.unlinkSync(path.join(BACKUP_DIR, item.gzFile));
        }
        if (item.metaFile && fs.existsSync(path.join(BACKUP_DIR, item.metaFile))) {
          fs.unlinkSync(path.join(BACKUP_DIR, item.metaFile));
        }
        console.log(`[Retention] Đã xoá: ${item.metaFile}`);
      }
    }
  } catch (err) {
    console.warn('[Retention] Lỗi khi dọn dẹp sao lưu cũ:', err.message);
  }
}

async function sendNotificationEmail(backupResult) {
  try {
    const smtpUser = (process.env.SMTP_USER || 'bankhaothi@skylineschool.edu.vn').trim();
    const smtpPass = (process.env.SMTP_PASS || 'tpcynmmfltbbjfsz').trim();
    const backupUser = (process.env.BACKUP_SMTP_USER || 'dbclskl@gmail.com').trim();
    const backupPass = (process.env.BACKUP_SMTP_PASS || 'xhzihnqyiqqmdhat').trim();

    const subject = `[Sky-line SMS] Thông Báo Sao Lưu Dữ Liệu Thành Công - ${backupResult.dayOfWeek} (${backupResult.dateStr})`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 24px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0 0 8px 0; font-size: 22px;">HỆ THỐNG SQMS</h2>
          <p style="margin: 0; font-size: 14px; opacity: 0.9;">Báo cáo Sao lưu Cơ sở Dữ liệu Định kỳ (23h00 Thứ 6)</p>
        </div>
        <div style="padding: 24px; color: #334155; line-height: 1.6;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #166534; font-weight: bold; font-size: 15px;">
              ✓ Tiến trình sao lưu toàn bộ cơ sở dữ liệu đã hoàn tất thành công!
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Thời gian sao lưu:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">${new Date(backupResult.createdAt).toLocaleString('vi-VN')}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Chế độ kích hoạt:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #2563eb;">${backupResult.triggerType}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Tổng số bảng dữ liệu:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">${backupResult.totalTables} bảng</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Tổng số bản ghi (rows):</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #059669;">${backupResult.totalRows.toLocaleString('vi-VN')} dòng</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Dung lượng SQLite (.db):</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">${formatBytes(backupResult.dbSizeBytes)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Dung lượng nén (.db.gz):</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #7c3aed;">${formatBytes(backupResult.gzSizeBytes)} (Tiết kiệm ~${Math.round((1 - backupResult.gzSizeBytes / (backupResult.dbSizeBytes || 1)) * 100)}%)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Thời gian xử lý:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: 600;">${backupResult.durationSeconds} giây</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Tên tệp lưu trữ:</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace; font-size: 12px;">${backupResult.gzFilename}</td>
              </tr>
            </tbody>
          </table>
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; font-size: 12px; color: #475569;">
            Tệp sao lưu được lưu trữ an toàn tại máy chủ: <code>d:\\SSM\\skyline-survey\\data-backups\\</code>.<br/>
            Quản trị viên có thể xem và tải về tại: <strong>Hệ thống &gt; Sao lưu &amp; Bảo trì</strong> trên Portal.
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Skyline School Management - Ban Khảo thí & ĐBCL Giáo dục
        </div>
      </div>
    `;

    const recipients = ['bankhaothi@skylineschool.edu.vn', backupUser].filter(Boolean);

    let transporter;
    try {
      transporter = nodemailer.createTransport({
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
      console.log('[Email] Đã gửi thông báo sao lưu qua Office 365 thành công tới:', recipients.join(', '));
    } catch (primaryErr) {
      console.warn('[Email] Office 365 lỗi, chuyển sang Gmail dự phòng...', primaryErr.message);
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
  const force = options.force || false;
  const startTime = Date.now();

  console.log(`\n================================================================`);
  console.log(`  SQMS - BẮT ĐẦU SAO LƯU DỮ LIỆU`);
  console.log(`  Thời gian: ${new Date().toLocaleString('vi-VN')} | Chế độ: ${triggerType}`);
  console.log(`================================================================\n`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Check today lock if scheduled to avoid duplicate runs
  const todayStr = new Date().toISOString().split('T')[0];
  const lockFile = path.join(BACKUP_DIR, '.last_backup_date');
  if (!force && triggerType !== 'MANUAL' && fs.existsSync(lockFile)) {
    const lastDate = fs.readFileSync(lockFile, 'utf8').trim();
    if (lastDate === todayStr) {
      console.log(`[Backup] Hôm nay (${todayStr}) đã được sao lưu rồi. Bỏ qua lượt chạy này.`);
      return { skipped: true, reason: 'ALREADY_RAN_TODAY' };
    }
  }

  const client = getTursoClient();
  const timestamp = getFormattedTimestamp();
  const backupId = `backup_${timestamp}`;
  const dbFilename = `skyline_${backupId}.db`;
  const gzFilename = `skyline_${backupId}.db.gz`;
  const metaFilename = `skyline_${backupId}_meta.json`;

  const targetDbPath = path.join(BACKUP_DIR, dbFilename);
  const targetGzPath = path.join(BACKUP_DIR, gzFilename);
  const targetMetaPath = path.join(BACKUP_DIR, metaFilename);

  if (fs.existsSync(targetDbPath)) fs.unlinkSync(targetDbPath);

  console.log(`[1/5] Đang kết nối Turso Cloud và đọc danh sách cấu trúc bảng...`);
  const tablesRes = await client.execute(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
    ORDER BY name ASC
  `);
  const tables = tablesRes.rows;
  console.log(`=> Đã tìm thấy ${tables.length} bảng dữ liệu.`);

  const indexesRes = await client.execute(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
  `);
  const indexes = indexesRes.rows;
  console.log(`=> Đã tìm thấy ${indexes.length} chỉ mục (indexes).`);

  console.log(`\n[2/5] Đang khởi tạo cơ sở dữ liệu SQLite cục bộ: ${dbFilename}...`);
  const localDb = new DatabaseSync(targetDbPath);
  localDb.exec('PRAGMA foreign_keys = OFF;');
  localDb.exec('PRAGMA synchronous = OFF;');
  localDb.exec('PRAGMA journal_mode = MEMORY;');

  // Tạo các bảng
  for (const t of tables) {
    if (t.sql) {
      try {
        localDb.exec(t.sql);
      } catch (ddlErr) {
        console.warn(`[DDL Warning] Lỗi tạo bảng ${t.name}:`, ddlErr.message);
      }
    }
  }

  console.log(`\n[3/5] Đang sao chép dữ liệu các bảng từ Turso về máy chủ...`);
  let totalRowsCount = 0;
  let processedTables = 0;

  for (const t of tables) {
    const tableName = t.name;
    processedTables++;
    try {
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
      const rowCount = Number(countRes.rows[0]?.cnt || 0);

      if (rowCount === 0) {
        continue;
      }

      totalRowsCount += rowCount;
      process.stdout.write(`  [${processedTables}/${tables.length}] ${tableName}: ${rowCount} dòng... `);

      // Phân đoạn đối với các bảng có dung lượng lớn hoặc số dòng lớn
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

          const cols = chunkRes.columns.filter(c => c !== 'rowid');
          const placeholders = cols.map(() => '?').join(', ');
          const insertStmt = localDb.prepare(`INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`);

          localDb.exec('BEGIN TRANSACTION;');
          try {
            for (const row of chunkRes.rows) {
              insertStmt.run(...cols.map(c => row[c]));
              if (row.rowid > lastRowid) lastRowid = row.rowid;
            }
            localDb.exec('COMMIT;');
          } catch (insertErr) {
            localDb.exec('ROLLBACK;');
            throw insertErr;
          }

          copied += chunkRes.rows.length;
          process.stdout.write(`${Math.min(copied, rowCount)}/`);
        }
        console.log(`[XONG]`);
      } else {
        const dataRes = await client.execute(`SELECT * FROM "${tableName}"`);
        if (dataRes.rows.length > 0) {
          const cols = dataRes.columns;
          const placeholders = cols.map(() => '?').join(', ');
          const insertStmt = localDb.prepare(`INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`);

          localDb.exec('BEGIN TRANSACTION;');
          try {
            for (const row of dataRes.rows) {
              insertStmt.run(...cols.map(c => row[c]));
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

  // Tạo các indexes
  for (const idx of indexes) {
    if (idx.sql) {
      try {
        localDb.exec(idx.sql);
      } catch {}
    }
  }

  localDb.close();

  const dbStats = fs.statSync(targetDbPath);
  console.log(`\n=> Kích thước SQLite .db hoàn tất: ${formatBytes(dbStats.size)}`);

  console.log(`\n[4/5] Đang nén tệp sao lưu thành định dạng ${gzFilename}...`);
  await compressFile(targetDbPath, targetGzPath);
  const gzStats = fs.statSync(targetGzPath);
  console.log(`=> Dung lượng sau nén: ${formatBytes(gzStats.size)} (Tiết kiệm ${Math.round((1 - gzStats.size / dbStats.size) * 100)}%)`);

  const durationSeconds = Math.round((Date.now() - startTime) / 1000);
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
    totalTables: tables.length,
    totalRows: totalRowsCount,
    dbSizeBytes: dbStats.size,
    gzSizeBytes: gzStats.size,
    durationSeconds,
    triggerType,
    status: 'SUCCESS'
  };

  fs.writeFileSync(targetMetaPath, JSON.stringify(backupMeta, null, 2), 'utf8');
  fs.writeFileSync(lockFile, todayStr, 'utf8');

  console.log(`\n[5/5] Áp dụng chính sách lưu trữ & gửi email báo cáo...`);
  cleanupOldBackups();
  await sendNotificationEmail(backupMeta);

  console.log(`\n================================================================`);
  console.log(`  SAO LƯU THÀNH CÔNG! Tổng: ${totalRowsCount.toLocaleString()} dòng | Thời gian: ${durationSeconds}s`);
  console.log(`  File: ${targetGzPath}`);
  console.log(`================================================================\n`);

  return backupMeta;
}

// Chạy trực tiếp từ dòng lệnh
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const triggerArg = args.find(a => a.startsWith('--trigger='));
  const triggerType = triggerArg ? triggerArg.split('=')[1] : 'CLI_MANUAL';

  const checkScheduled = args.includes('--check-scheduled');
  if (checkScheduled) {
    const now = new Date();
    // Thứ 6 là getDay() === 5, giờ 23
    const isFriday = now.getDay() === 5;
    const isHour23 = now.getHours() === 23;
    if (!isFriday || !isHour23) {
      console.log(`[Scheduled Check] Hiện tại không phải Thứ 6 lúc 23h (${now.toLocaleTimeString()}). Bỏ qua.`);
      process.exit(0);
    }
  }

  runBackup({ triggerType, force })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[FATAL ERROR] Sao lưu thất bại:', err);
      process.exit(1);
    });
}

module.exports = { runBackup, getFormattedTimestamp, formatBytes };
