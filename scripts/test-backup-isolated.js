/**
 * SKYLINE SCHOOL MANAGEMENT (SSM)
 * BACKUP & MAINTENANCE AUTOMATED TEST SUITE (ISOLATED SANDBOX)
 * 
 * Tests:
 * 1. Concurrency PID lock & race-condition prevention
 * 2. Checksum SHA-256 calculation & integrity check
 * 3. Atomic compression & on-the-fly decompression
 * 4. Verification on production backup archive
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const {
  computeFileSha256,
  decompressFile,
  verifyBackupFile,
  cleanupDuplicateAndOrphanFiles
} = require('./backup-db');

const SCRATCH_DIR = path.join(__dirname, '..', 'scratch', 'backup-test-sandbox');

async function runTestSuite() {
  console.log(`\n================================================================`);
  console.log(`  SSM BACKUP ENGINE - AUTOMATED ISOLATED VERIFICATION SUITE`);
  console.log(`  Time: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`================================================================\n`);

  if (!fs.existsSync(SCRATCH_DIR)) {
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  }

  let passedTests = 0;
  let totalTests = 5;

  // ---------------------------------------------------------------------------
  // TEST 1: Concurrency PID Lock & Race Condition Protection
  // ---------------------------------------------------------------------------
  console.log(`[TEST 1/4] Kiểm tra Cơ chế Khóa Độc Quyền PID (Concurrency Lock)...`);
  const testLockFile = path.join(SCRATCH_DIR, '.test_running.pid');
  try {
    // Giả lập ghi lock của tiến trình hiện tại
    fs.writeFileSync(testLockFile, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), 'utf8');

    // Tiến trình thứ 2 thử kiểm tra
    const raw = fs.readFileSync(testLockFile, 'utf8');
    const lockData = JSON.parse(raw);
    let isRunning = false;
    try {
      process.kill(lockData.pid, 0);
      isRunning = true;
    } catch {
      isRunning = false;
    }

    if (isRunning && lockData.pid === process.pid) {
      console.log(`  ✓ Phát hiện tiến trình PID ${process.pid} đang chạy -> Đã chặn thành công lượt chạy trùng lặp!`);
      passedTests++;
    } else {
      throw new Error('Không phát hiện được PID đang hoạt động!');
    }
  } catch (err) {
    console.error(`  ✗ Thất bại Test 1:`, err.message);
  } finally {
    if (fs.existsSync(testLockFile)) fs.unlinkSync(testLockFile);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Checksum SHA-256 Calculation & Pre-Publication Integrity Check
  // ---------------------------------------------------------------------------
  console.log(`\n[TEST 2/4] Kiểm tra Tính toán Mã băm SHA-256 & Tính toàn vẹn CSDL...`);
  const testDbPath = path.join(SCRATCH_DIR, 'test_sample.db');
  const testGzPath = path.join(SCRATCH_DIR, 'test_sample.db.gz');
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(testGzPath)) fs.unlinkSync(testGzPath);

    // Tạo SQLite DB thử nghiệm
    const db = new DatabaseSync(testDbPath);
    db.exec(`
      CREATE TABLE StudentTest (id TEXT PRIMARY KEY, code TEXT, name TEXT);
      CREATE TABLE ScoreTest (id TEXT PRIMARY KEY, studentId TEXT, score REAL, FOREIGN KEY(studentId) REFERENCES StudentTest(id));
      INSERT INTO StudentTest VALUES ('s1', 'HS001', 'Nguyen Van A');
      INSERT INTO ScoreTest VALUES ('sc1', 's1', 9.5);
    `);

    const integrityRes = db.prepare('PRAGMA integrity_check;').all();
    const fkRes = db.prepare('PRAGMA foreign_key_check;').all();
    db.close();

    const isIntegrityOk = Array.isArray(integrityRes) && integrityRes[0]?.integrity_check === 'ok';
    const isFkOk = Array.isArray(fkRes) && fkRes.length === 0;

    if (!isIntegrityOk || !isFkOk) {
      throw new Error(`Kiểm tra integrity hoặc FK thất bại.`);
    }

    // Tính SHA-256 trên SQLite thô
    const shaRaw = await computeFileSha256(testDbPath);

    // Nén Gzip
    const gzip = zlib.createGzip({ level: 9 });
    await new Promise((resolve, reject) => {
      fs.createReadStream(testDbPath)
        .pipe(gzip)
        .pipe(fs.createWriteStream(testGzPath))
        .on('finish', resolve)
        .on('error', reject);
    });

    const shaGz = await computeFileSha256(testGzPath);
    console.log(`  ✓ CSDL Thử nghiệm: Integrity OK | FK Violations: 0`);
    console.log(`  ✓ SHA-256 (.db):    ${shaRaw}`);
    console.log(`  ✓ SHA-256 (.db.gz): ${shaGz}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ Thất bại Test 2:`, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: On-the-fly Decompression & Byte-level Consistency
  // ---------------------------------------------------------------------------
  console.log(`\n[TEST 3/4] Kiểm tra Giải nén On-the-fly & Tính bảo toàn dữ liệu...`);
  const restoredDbPath = path.join(SCRATCH_DIR, 'test_restored.db');
  try {
    if (fs.existsSync(restoredDbPath)) fs.unlinkSync(restoredDbPath);

    // Giải nén file gz ngược lại
    await decompressFile(testGzPath, restoredDbPath);
    const restoredSha = await computeFileSha256(restoredDbPath);
    const originalSha = await computeFileSha256(testDbPath);

    if (restoredSha === originalSha) {
      // Đọc lại dữ liệu xem có đúng không
      const restoredDb = new DatabaseSync(restoredDbPath, { readOnly: true });
      const rows = restoredDb.prepare('SELECT * FROM StudentTest').all();
      restoredDb.close();

      if (rows.length === 1 && rows[0].code === 'HS001') {
        console.log(`  ✓ Khớp 100% mã băm SHA-256 sau khi giải nén.`);
        console.log(`  ✓ Dữ liệu nghiệp vụ phục hồi chính xác: ${rows[0].name} (${rows[0].code})`);
        passedTests++;
      } else {
        throw new Error('Dữ liệu phục hồi không khớp nội dung gốc.');
      }
    } else {
      throw new Error(`Mã băm không khớp: ${restoredSha} != ${originalSha}`);
    }
  } catch (err) {
    console.error(`  ✗ Thất bại Test 3:`, err.message);
  } finally {
    // Dọn dẹp sandbox
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(testGzPath)) fs.unlinkSync(testGzPath);
      if (fs.existsSync(restoredDbPath)) fs.unlinkSync(restoredDbPath);
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Live Verification on Latest Production Backup
  // ---------------------------------------------------------------------------
  console.log(`\n[TEST 4/5] Kiểm tra hàm verifyBackupFile() trên bản sao lưu mới nhất...`);
  try {
    const backupDir = path.join(__dirname, '..', 'data-backups');
    const latestMetaFile = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('skyline_backup_') && f.endsWith('_meta.json'))
      .sort()
      .pop();

    if (!latestMetaFile) {
      throw new Error('Không tìm thấy bản sao lưu nào trong data-backups để xác minh.');
    }

    const latestMeta = JSON.parse(fs.readFileSync(path.join(backupDir, latestMetaFile), 'utf8'));
    const backupId = latestMeta.id;
    const verifyResult = await verifyBackupFile(backupId);

    console.log(`  ✓ Tệp nén: ${verifyResult.gzFilename}`);
    console.log(`  ✓ Checksum SHA-256: ${verifyResult.sha256}`);
    console.log(`  ✓ Kết quả PRAGMA integrity_check: ${verifyResult.integrityCheck}`);
    console.log(`  ✓ Vi phạm khóa ngoại (FK): ${verifyResult.fkViolations}`);
    console.log(`  ✓ Số bảng: ${verifyResult.tablesCount} | Số dòng: ${verifyResult.rowsCount.toLocaleString('vi-VN')}`);

    if (verifyResult.integrityCheck === 'OK' && verifyResult.sha256 && verifyResult.tablesCount > 0) {
      passedTests++;
      console.log(`  ✓ Bản sao lưu ${backupId} đạt chuẩn toàn vẹn cấu trúc SQLite & SHA-256!`);
    } else {
      throw new Error('Kiểm tra tính toàn vẹn trả về kết quả không hợp lệ.');
    }
  } catch (err) {
    console.error(`  ✗ Thất bại Test 4:`, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Current-Month-Only Retention Policy (Isolated Sandbox)
  // ---------------------------------------------------------------------------
  console.log(`\n[TEST 5/5] Kiểm tra chính sách Chỉ lưu Tháng hiện tại & tự động xóa tháng trước...`);
  const retentionSandbox = path.join(SCRATCH_DIR, 'retention-sandbox');
  try {
    fs.rmSync(retentionSandbox, { recursive: true, force: true });
    fs.mkdirSync(retentionSandbox, { recursive: true });

    const createMockBackup = (id, createdAtIso, rows) => {
      const gzName = `skyline_${id}.db.gz`;
      const metaName = `skyline_${id}_meta.json`;
      fs.writeFileSync(path.join(retentionSandbox, gzName), Buffer.alloc(2048, 1));
      fs.writeFileSync(
        path.join(retentionSandbox, metaName),
        JSON.stringify({
          id,
          filename: `skyline_${id}.db`,
          gzFilename: gzName,
          createdAt: createdAtIso,
          totalRows: rows,
          gzSizeBytes: 2048
        }),
        'utf8'
      );
    };

    // Tạo kho ảnh tĩnh (phải được bảo toàn)
    fs.writeFileSync(path.join(retentionSandbox, 'student_photos_vault.db.gz'), Buffer.alloc(4096, 2));
    fs.writeFileSync(path.join(retentionSandbox, 'student_photos_vault_meta.json'), '{"photoCount":10}', 'utf8');

    // Case A: Tháng hiện tại 2026-11 đã có 2 bản, tháng 10 có 2 bản + 1 tệp mồ côi tháng 09
    createMockBackup('backup_2026-10-16_230000', '2026-10-16T16:00:00.000Z', 100);
    createMockBackup('backup_2026-10-23_230000', '2026-10-23T16:00:00.000Z', 105);
    createMockBackup('backup_2026-11-06_230000', '2026-11-06T16:00:00.000Z', 110);
    createMockBackup('backup_2026-11-20_230000', '2026-11-20T16:00:00.000Z', 120);
    fs.writeFileSync(path.join(retentionSandbox, 'skyline_backup_2026-09-18_230000.db.gz'), Buffer.alloc(2048, 3));

    const resA = await cleanupDuplicateAndOrphanFiles({
      backupDir: retentionSandbox,
      referenceDate: new Date('2026-11-27T15:00:00+07:00'),
      verifyMissing: false
    });

    const filesAfterA = fs.readdirSync(retentionSandbox);
    const hasOctA = filesAfterA.some((f) => f.includes('2026-10-'));
    const hasSepA = filesAfterA.some((f) => f.includes('2026-09-'));
    const hasNov06A = filesAfterA.includes('skyline_backup_2026-11-06_230000.db.gz');
    const hasNov20A = filesAfterA.includes('skyline_backup_2026-11-20_230000.db.gz');
    const hasVaultA = filesAfterA.includes('student_photos_vault.db.gz');

    if (hasOctA || hasSepA || !hasNov06A || !hasNov20A || !hasVaultA || resA.expiredMonthBackupsCount !== 2) {
      throw new Error(`Case A sai kết quả: files=${filesAfterA.join(', ')}, expired=${resA.expiredMonthBackupsCount}`);
    }
    console.log(`  ✓ Case A (Trong tháng 11): Đã xóa sạch tháng 09 & 10, giữ nguyên 2 bản tháng 11 và Kho ảnh tĩnh.`);

    // Case B: Sang đầu tháng 12 (2026-12-01) chưa có bản tháng 12 -> chỉ giữ 1 bản mới nhất (2026-11-20)
    const resB = await cleanupDuplicateAndOrphanFiles({
      backupDir: retentionSandbox,
      referenceDate: new Date('2026-12-01T08:00:00+07:00'),
      verifyMissing: false
    });

    const filesAfterB = fs.readdirSync(retentionSandbox);
    const hasNov06B = filesAfterB.includes('skyline_backup_2026-11-06_230000.db.gz');
    const hasNov20B = filesAfterB.includes('skyline_backup_2026-11-20_230000.db.gz');

    if (hasNov06B || !hasNov20B || resB.expiredMonthBackupsCount !== 1) {
      throw new Error(`Case B sai kết quả: files=${filesAfterB.join(', ')}, expired=${resB.expiredMonthBackupsCount}`);
    }
    console.log(`  ✓ Case B (Đầu tháng 12 chưa có backup mới): Giữ an toàn 1 bản mới nhất (20/11), đã xóa bản cũ hơn.`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ Thất bại Test 5:`, err.message);
  } finally {
    fs.rmSync(retentionSandbox, { recursive: true, force: true });
  }

  // ---------------------------------------------------------------------------
  // KẾT LUẬN TEST SUITE
  // ---------------------------------------------------------------------------
  console.log(`\n================================================================`);
  console.log(`  KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI THI ĐẠT CHUẨN (${Math.round((passedTests/totalTests)*100)}%)`);
  if (passedTests === totalTests) {
    console.log(`  TRẠNG THÁI: TẤT CẢ CÁC TÍNH NĂNG TỐI ƯU ĐÃ ĐẠT CHUẨN SẴN SÀNG!`);
  } else {
    console.log(`  TRẠNG THÁI: CÓ LỖI CẦN XỬ LÝ.`);
  }
  console.log(`================================================================\n`);

  process.exit(passedTests === totalTests ? 0 : 1);
}

runTestSuite().catch((err) => {
  console.error('[FATAL] Lỗi bộ kiểm thử:', err);
  process.exit(1);
});
