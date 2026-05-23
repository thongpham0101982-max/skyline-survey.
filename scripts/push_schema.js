const { createClient } = require("@libsql/client");
const { execSync } = require("child_process");

const client = createClient({
  url: "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"
});

var buf = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", { maxBuffer: 20*1024*1024 });
var sql = buf.toString("utf8").replace(/^\uFEFF/, "").replace(/\0/g, "");
if (!sql.includes("CREATE")) {
  sql = buf.toString("utf16le").replace(/^\uFEFF/, "");
}
// Strip comment lines, keep only real SQL
var cleanSql = sql.replace(/^--[^\n]*\n?/gm, "");
var stmts = cleanSql.split(";").map(function(s){ return s.replace(/\r?\n/g, " ").trim(); }).filter(function(s){ return s.length > 5; });
console.log("Found", stmts.length, "statements. First:", stmts[0] ? stmts[0].substring(0,60) : "none");

(async function(){
  var ok = 0;
  for (var i = 0; i < stmts.length; i++) {
    try {
      await client.execute(stmts[i]);
      ok++;
      if (ok % 10 === 0) console.log("Applied", ok, "...");
    } catch(e) {
      if (e.message && e.message.indexOf("already exists") === -1) {
        console.log("Skip err:", e.message.substring(0,80));
      }
    }
  }
  console.log("Done! Applied", ok, "of", stmts.length);
})().catch(function(e){ console.error("Fatal:", e.message); process.exit(1); });