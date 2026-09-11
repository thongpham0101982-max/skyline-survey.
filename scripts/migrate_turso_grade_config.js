const { createClient } = require('@libsql/client');

const url = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const client = createClient({ url, authToken });

async function run() {
  try {
    console.log("Checking table info for SubjectGradeConfig in Turso...");
    const tableInfo = await client.execute("PRAGMA table_info(SubjectGradeConfig)");
    console.log("Current columns:", tableInfo.rows.map(r => r.name));

    const existingCols = new Set(tableInfo.rows.map(r => r.name));

    const columnsToAdd = [
      { name: "columnMaxScores", def: "TEXT DEFAULT '[]'" },
      { name: "hasCompositeColumn", def: "BOOLEAN DEFAULT 1" },
      { name: "compositeColumnName", def: "TEXT DEFAULT 'Điểm thành phần'" },
      { name: "hasRemarkColumn", def: "BOOLEAN DEFAULT 1" },
      { name: "formula", def: "TEXT DEFAULT 'AVERAGE'" },
      { name: "formulaCustom", def: "TEXT" },
      { name: "weights", def: "TEXT" },
      { name: "roundingRule", def: "TEXT DEFAULT 'ROUND_1'" },
      { name: "columnTypes", def: "TEXT DEFAULT '[]'" }
    ];

    for (const col of columnsToAdd) {
      if (!existingCols.has(col.name)) {
        console.log(`Adding column: ${col.name}...`);
        await client.execute(`ALTER TABLE SubjectGradeConfig ADD COLUMN ${col.name} ${col.def}`);
        console.log(`Added column ${col.name} successfully!`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }

    console.log("\nVerifying updated table info:");
    const updatedInfo = await client.execute("PRAGMA table_info(SubjectGradeConfig)");
    console.log("Updated columns:", updatedInfo.rows.map(r => r.name));

    // Also check ObservationEvaluation if needed
    const obsInfo = await client.execute("PRAGMA table_info(ObservationEvaluation)");
    const obsCols = new Set(obsInfo.rows.map(r => r.name));
    const obsColumnsToAdd = [
      { name: "teacherAcknowledgedAt", def: "DATETIME" },
      { name: "teacherFeedback", def: "TEXT" },
      { name: "teacherFeedbackAt", def: "DATETIME" }
    ];
    for (const col of obsColumnsToAdd) {
      if (!obsCols.has(col.name)) {
        console.log(`Adding column to ObservationEvaluation: ${col.name}...`);
        await client.execute(`ALTER TABLE ObservationEvaluation ADD COLUMN ${col.name} ${col.def}`);
        console.log(`Added column ${col.name} to ObservationEvaluation successfully!`);
      }
    }

    console.log("\nAll schema updates on Turso completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.close();
  }
}

run();
