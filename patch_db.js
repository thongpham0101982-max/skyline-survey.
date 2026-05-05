const { createClient } = require('@libsql/client');

const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
const tursoAuthToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

async function main() {
  try {
    await client.execute("ALTER TABLE `InputAssessmentBatch` ADD COLUMN `campusId` TEXT");
    console.log("Successfully added campusId to InputAssessmentBatch");
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log("Column already exists");
    } else {
      console.error("Error:", error);
    }
  }

  // Also check InputAssessmentPeriod just in case
  try {
    await client.execute("ALTER TABLE `InputAssessmentPeriod` ADD COLUMN `campusId` TEXT");
    console.log("Successfully added campusId to InputAssessmentPeriod");
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log("Column already exists in InputAssessmentPeriod");
    } else {
      console.error("Error:", error);
    }
  }
}

main().catch(console.error);
