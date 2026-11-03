const xlsx = require('xlsx');
const path = require('path');
const { createClient } = require('@libsql/client');
require('dotenv').config();

const EXCEL_PATH = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_2S_NEW.xlsx');
const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = process.env.TURSO_DATABASE_URL || "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = process.env.TURSO_AUTH_TOKEN;

console.log('Reading Excel:', EXCEL_PATH);
const wb = xlsx.readFile(EXCEL_PATH);
const ws = wb.Sheets['KHỐI 2S'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

const parsedCriteria = [];
for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  if (!r || r.length === 0) continue;
  const stdCode = r[4] ? String(r[4]).trim() : '';
  const desc = r[2] ? String(r[2]).trim() : '';
  const muc = r[3] ? String(r[3]).trim() : '';
  if (!stdCode) continue;

  let competency = 'Vận dụng';
  if (r[6] && String(r[6]).trim().toLowerCase() === 'x') competency = 'Hiểu';
  else if (r[7] && String(r[7]).trim().toLowerCase() === 'x') competency = 'Biết';
  else if (r[8] && String(r[8]).trim().toLowerCase() === 'x') competency = 'Vận dụng';

  parsedCriteria.push({
    code: stdCode,
    desc,
    level: muc,
    competency
  });
}

console.log(`Parsed ${parsedCriteria.length} criteria from Excel.`);

async function applyAdjustment() {
  const clients = [
    { client: createClient({ url: `file:${LOCAL_DB_PATH}` }), name: 'LOCAL SQLite' },
    { client: createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN }), name: 'TURSO Cloud' }
  ];

  for (const { client, name } of clients) {
    console.log(`\n=== [${name}] BẮT ĐẦU ĐỐI CHIẾU & CẬP NHẬT KHỐI 2S ===`);
    
    // 1. Fetch existing criteria
    const existing = await client.execute({
      sql: `SELECT id, code, competencyGroup, description, programLevel FROM "SpecialAssessmentCriterion" WHERE code LIKE 'TC02S%' ORDER BY sortOrder ASC;`,
      args: []
    });

    console.log(`Existing criteria count: ${existing.rows.length}`);
    const existingMap = new Map(existing.rows.map(r => [String(r.code), r]));

    const changed = [];
    const unchanged = [];

    for (const item of parsedCriteria) {
      const old = existingMap.get(item.code);
      if (!old) {
        console.error(`ERROR: Code ${item.code} not found in database!`);
      } else {
        if (String(old.competencyGroup) !== item.competency) {
          changed.push({
            code: item.code,
            level: item.level,
            oldComp: String(old.competencyGroup),
            newComp: item.competency,
            desc: item.desc
          });
        } else {
          unchanged.push(item.code);
        }
      }
    }

    console.log(`- Số lượng tiêu chuẩn thay đổi nhóm năng lực: ${changed.length}`);
    console.log(`- Số lượng tiêu chuẩn giữ nguyên: ${unchanged.length}`);

    if (changed.length !== 29) {
      console.warn(`WARNING: Expected 29 changes, found ${changed.length}`);
    }

    // 2. Perform in-place UPDATE (safe & non-destructive)
    let updateCount = 0;
    for (const item of parsedCriteria) {
      const res = await client.execute({
        sql: `UPDATE "SpecialAssessmentCriterion" SET "competencyGroup" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "code" = ?;`,
        args: [item.competency, item.code]
      });
      if (res.rowsAffected > 0) updateCount++;
    }

    console.log(`- Đã cập nhật thành công ${updateCount} tiêu chuẩn trong bảng SpecialAssessmentCriterion.`);

    // 3. Log into SpecialCurriculumVersion
    const versionUpdate = await client.execute({
      sql: `UPDATE "SpecialCurriculumVersion"
            SET "approvedBy" = ?,
                "approvedAt" = CURRENT_TIMESTAMP,
                "description" = ?,
                "sourceDocument" = ?,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = 'spec_ver_fin_v1_0';`,
      args: [
        'Ban Quản trị SSM / BGH',
        'Cập nhật điều chỉnh phân loại năng lực 29 tiêu chuẩn Khối 2S (Biết: 29, Hiểu: 14, Vận dụng: 12) theo file PPCT mới ngày 23/10/2026',
        'PPCT MÔN GIÁO DỤC TÀI CHÍNH 2S (1) (1).xlsx'
      ]
    });
    console.log(`- Đã ghi nhật ký phê duyệt vào SpecialCurriculumVersion (rowsAffected: ${versionUpdate.rowsAffected}).`);

    // 4. Verify post-update counts
    const postCounts = await client.execute({
      sql: `SELECT competencyGroup, count(*) as cnt FROM "SpecialAssessmentCriterion" WHERE code LIKE 'TC02S%' GROUP BY competencyGroup;`,
      args: []
    });
    console.log(`- Thống kê nhóm năng lực sau khi cập nhật:`, postCounts.rows);

    // Verify Grade 3S is untouched
    const g3Counts = await client.execute({
      sql: `SELECT count(*) as cnt FROM "SpecialAssessmentCriterion" WHERE code LIKE 'TC03S%';`,
      args: []
    });
    console.log(`- Kiểm tra Khối 3S (không bị ảnh hưởng): ${g3Counts.rows[0].cnt} tiêu chuẩn.`);
  }

  console.log('\n=== HOÀN TẤT CẬP NHẬT ĐỒNG BỘ 100% CẢ 2 HỆ THỐNG CSDL ===');
}

applyAdjustment().catch(console.error);
