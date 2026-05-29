import { createClient } from '@libsql/client';

async function main() {
  const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
  const tursoAuthToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });

  try {
    console.log("Altering table PreschoolDevArea...");
    await client.execute(`ALTER TABLE PreschoolDevArea ADD COLUMN type TEXT DEFAULT 'INPUT' NOT NULL`);
    console.log("Successfully added column 'type'");
  } catch (error) {
    if (error.message.includes("duplicate column name")) {
      console.log("Column 'type' already exists.");
    } else {
      console.error("Error:", error.message);
    }
  }

  // Also apply to local db
  try {
    const localClient = createClient({ url: "file:./dev.db" });
    await localClient.execute(`ALTER TABLE PreschoolDevArea ADD COLUMN type TEXT DEFAULT 'INPUT' NOT NULL`);
    console.log("Successfully added column 'type' to local dev.db");
  } catch (err) {
      if (err.message.includes("duplicate column name")) {
        console.log("Column 'type' already exists locally.");
      } else {
        console.error("Local Error:", err.message);
      }
  }
}

main().catch(console.error);
