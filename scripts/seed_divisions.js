const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const mappings = [
  // BP Tiểu học
  { code: 'TO_1', divisionCode: 'BP_TIEU_HOC' },
  { code: 'TO_2', divisionCode: 'BP_TIEU_HOC' },
  { code: 'TO_3', divisionCode: 'BP_TIEU_HOC' },
  { code: 'TO_4', divisionCode: 'BP_TIEU_HOC' },
  { code: 'TO_5', divisionCode: 'BP_TIEU_HOC' },

  // BP Trung học
  { code: 'TO_TOAN', divisionCode: 'BP_TRUNG_HOC' },
  { code: 'TO_NGUVAN', divisionCode: 'BP_TRUNG_HOC' },
  { code: 'TO_KHTN', divisionCode: 'BP_TRUNG_HOC' },
  { code: 'TO_KHXH', divisionCode: 'BP_TRUNG_HOC' },
  { code: 'TO_TLHN', divisionCode: 'BP_TRUNG_HOC' },
  { code: 'TÔ_TD', divisionCode: 'BP_TRUNG_HOC' },
  { code: 'TO_AN', divisionCode: 'BP_TRUNG_HOC' },
  { code: 'TO_MT', divisionCode: 'BP_TRUNG_HOC' },

  // BP Mầm non
  { code: 'NHA_TRE', divisionCode: 'BP_MAM_NON' },
  { code: 'MGB', divisionCode: 'BP_MAM_NON' },
  { code: 'MGN', divisionCode: 'BP_MAM_NON' },
  { code: 'MGL', divisionCode: 'BP_MAM_NON' },
  { code: 'BGH MN', divisionCode: 'BP_MAM_NON' },

  // BP Stem-ICT
  { code: 'TO_STEM', divisionCode: 'BP_STEM_ICT' },
  { code: 'TO_ICT', divisionCode: 'BP_STEM_ICT' },

  // BP TA&CTQT
  { code: 'TO_TACTQ_TH.S', divisionCode: 'BP_TA_CTQT' },
  { code: 'TO_TACTQ_TRH.S', divisionCode: 'BP_TA_CTQT' },
  { code: 'TO_TACTQ_PT.G', divisionCode: 'BP_TA_CTQT' },
  { code: 'TO_TACTQ_MN.S', divisionCode: 'BP_TA_CTQT' },

  // BP HĐNG-CTHS
  { code: 'CTHS', divisionCode: 'BP_HDNG_CTHS' },
  { code: 'TVAN', divisionCode: 'BP_HDNG_CTHS' }
];

async function run() {
  console.log('Seeding divisionCode for departments...');
  for (const m of mappings) {
    const res = await client.execute({
      sql: 'UPDATE Department SET divisionCode = ? WHERE code = ?',
      args: [m.divisionCode, m.code]
    });
    console.log(`Updated ${m.code} -> ${m.divisionCode} (${res.rowsAffected} rows affected)`);
  }
  console.log('Done seeding divisionCode!');
}

run().catch(console.error);
