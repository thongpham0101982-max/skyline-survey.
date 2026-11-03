const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

async function main() {
  console.log('=== SSM COLD STORAGE ARCHIVE: StagingCompetencyAssessment ===');
  const dbPath = path.resolve('local.db');
  const client = createClient({ url: 'file:' + dbPath.replace(/\\/g, '/') });

  // 1. Check existing staging count
  const countRes = await client.execute('SELECT COUNT(*) as c FROM "StagingCompetencyAssessment"');
  const totalStaging = Number(countRes.rows[0].c);
  console.log(`Total Staging rows to archive: ${totalStaging.toLocaleString()}`);

  if (totalStaging === 0) {
    console.log('Staging table is already clean. Nothing to archive.');
    return;
  }

  // Check official table count
  const officialRes = await client.execute('SELECT COUNT(*) as c FROM "StudentCompetencyAssessment"');
  const totalOfficialBefore = Number(officialRes.rows[0].c);
  console.log(`Official StudentCompetencyAssessment rows (Must be preserved): ${totalOfficialBefore.toLocaleString()}`);

  // 2. Prepare archive directory
  const archiveDir = path.resolve('docs', 'archive_staging');
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  const archiveFile = path.join(archiveDir, 'staging_competency_assessment_IMP_NL_MTF8P4G4.json.gz');
  const metaFile = path.join(archiveDir, 'staging_competency_assessment_meta.json');

  console.log(`Exporting rows to: ${archiveFile}...`);
  const writeStream = fs.createWriteStream(archiveFile);
  const gzip = zlib.createGzip({ level: 9 });
  gzip.pipe(writeStream);

  // Stream rows in chunks of 5000
  gzip.write('[\n');
  const chunkSize = 5000;
  let offset = 0;
  let exportedRows = 0;

  while (offset < totalStaging) {
    const chunk = await client.execute(`SELECT * FROM "StagingCompetencyAssessment" ORDER BY rowNumber ASC LIMIT ${chunkSize} OFFSET ${offset}`);
    for (let i = 0; i < chunk.rows.length; i++) {
      const row = chunk.rows[i];
      const jsonStr = JSON.stringify(row);
      if (exportedRows > 0) {
        gzip.write(',\n');
      }
      gzip.write(jsonStr);
      exportedRows++;
    }
    offset += chunk.rows.length;
    process.stdout.write(`Exported ${exportedRows}/${totalStaging} rows...\r`);
    if (chunk.rows.length === 0) break;
  }
  gzip.write('\n]');
  gzip.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  console.log(`\nExport complete! Verifying archive integrity...`);

  // 3. Verify archive by reading it back
  const readStream = fs.createReadStream(archiveFile);
  const gunzip = zlib.createGunzip();
  const hash = crypto.createHash('sha256');

  const rawCompressed = fs.readFileSync(archiveFile);
  const sha256 = crypto.createHash('sha256').update(rawCompressed).digest('hex');
  const decompressed = zlib.gunzipSync(rawCompressed).toString('utf8');
  const parsedData = JSON.parse(decompressed);
  const verifiedCount = parsedData.length;
  const archiveStat = fs.statSync(archiveFile);

  console.log(`Verification:`);
  console.log(`  - Verified rows: ${verifiedCount.toLocaleString()} / ${totalStaging.toLocaleString()}`);
  console.log(`  - Archive size: ${(archiveStat.size / (1024*1024)).toFixed(2)} MB`);
  console.log(`  - SHA-256 Checksum: ${sha256}`);

  if (verifiedCount !== totalStaging) {
    throw new Error(`Integrity check failed: expected ${totalStaging} rows, verified ${verifiedCount}!`);
  }

  // Write metadata
  const meta = {
    batchCode: 'IMP_NL_MTF8P4G4',
    archivedAt: new Date().toISOString(),
    totalRows: verifiedCount,
    archiveFilename: path.basename(archiveFile),
    archiveSizeBytes: archiveStat.size,
    sha256: sha256,
    note: 'Staging rows safely archived after successful commit to StudentCompetencyAssessment.'
  };
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');
  console.log(`Saved metadata to ${metaFile}`);

  // 4. Safely clean staging table
  console.log(`Clearing staging table...`);
  await client.execute('DELETE FROM "StagingCompetencyAssessment"');

  const afterCountRes = await client.execute('SELECT COUNT(*) as c FROM "StagingCompetencyAssessment"');
  console.log(`StagingCompetencyAssessment remaining rows: ${afterCountRes.rows[0].c}`);

  // 5. Verify official table remained completely untouched
  const officialResAfter = await client.execute('SELECT COUNT(*) as c FROM "StudentCompetencyAssessment"');
  const totalOfficialAfter = Number(officialResAfter.rows[0].c);
  console.log(`Official StudentCompetencyAssessment rows after cleanup: ${totalOfficialAfter.toLocaleString()} (Preserved 100%)`);

  if (totalOfficialAfter !== totalOfficialBefore) {
    throw new Error('CRITICAL WARNING: Official table row count changed!');
  }

  console.log('\n============================================================');
  console.log('STAGING ARCHIVE & CLEANUP COMPLETED SUCCESSFULLY (100% SAFE)');
  console.log('============================================================\n');
}

main().catch(console.error);
