const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

async function verifyGzip(filePath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) return resolve(false);
    const readStream = fs.createReadStream(filePath);
    const gunzip = zlib.createGunzip();
    readStream.pipe(gunzip);
    gunzip.on('error', () => resolve(false));
    gunzip.on('end', () => resolve(true));
    gunzip.resume(); // Drain the stream to avoid backpressure
  });
}

async function main() {
  console.log('=== SSM SAFE CLEANUP: GROUP A (REDUNDANT BACKUP DB & TEMP FILES) ===');
  let totalFreedBytes = 0;

  // 1. Clean raw .db files in data-backups if .db.gz is valid
  const backupDir = path.resolve('data-backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    const rawDbFiles = files.filter(f => f.endsWith('.db') && !f.startsWith('.'));
    console.log(`Found ${rawDbFiles.length} raw .db files in data-backups:`);

    for (const rawFile of rawDbFiles) {
      const gzFile = rawFile + '.gz';
      const rawPath = path.join(backupDir, rawFile);
      const gzPath = path.join(backupDir, gzFile);

      if (fs.existsSync(gzPath)) {
        const isGzValid = await verifyGzip(gzPath);
        if (isGzValid) {
          const size = fs.statSync(rawPath).size;
          fs.unlinkSync(rawPath);
          totalFreedBytes += size;
          console.log(`  ✓ Removed raw ${rawFile} (Compressed ${gzFile} is valid) - Freed ${(size / (1024*1024)).toFixed(2)} MB`);
        } else {
          console.warn(`  ⚠ SKIPPED ${rawFile}: ${gzFile} failed gzip verification!`);
        }
      } else {
        console.log(`  ⚠ KEPT ${rawFile}: No corresponding .db.gz found`);
      }
    }
  }

  // 2. Clean scratch temporary extracted PNG images (6-8 MB each)
  const scratchDir = path.resolve('scratch');
  if (fs.existsSync(scratchDir)) {
    const scratchFiles = fs.readdirSync(scratchDir);
    const pngs = scratchFiles.filter(f => f.endsWith('.png') && (f.startsWith('page') || f.startsWith('real_page_')));
    console.log(`\nFound ${pngs.length} temporary extracted PNG files in scratch/:`);
    for (const p of pngs) {
      const pPath = path.join(scratchDir, p);
      const size = fs.statSync(pPath).size;
      fs.unlinkSync(pPath);
      totalFreedBytes += size;
      console.log(`  ✓ Removed ${p} - Freed ${(size / (1024*1024)).toFixed(2)} MB`);
    }
  }

  // 3. Clean root empty/old log and console text files
  const rootDir = path.resolve('.');
  const rootLogs = ['err.txt', 'log_err.txt', 'log_out.txt', 'out.txt', 'server_error.log'];
  console.log(`\nCleaning root temporary log/txt files:`);
  for (const logName of rootLogs) {
    const logPath = path.join(rootDir, logName);
    if (fs.existsSync(logPath)) {
      const size = fs.statSync(logPath).size;
      fs.unlinkSync(logPath);
      totalFreedBytes += size;
      console.log(`  ✓ Removed ${logName} - Freed ${(size / 1024).toFixed(2)} KB`);
    }
  }

  console.log(`\n============================================================`);
  console.log(`TOTAL FREED DISK SPACE: ${(totalFreedBytes / (1024*1024)).toFixed(2)} MB (${(totalFreedBytes / (1024*1024*1024)).toFixed(2)} GB)`);
  console.log(`============================================================\n`);
}

main().catch(console.error);
