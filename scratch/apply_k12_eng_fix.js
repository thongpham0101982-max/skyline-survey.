const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// 1. Update k12-client.tsx
const k12Path = path.resolve(__dirname, '../src/app/admin/xet-duyet-ket-qua/k12-client.tsx');
let k12Content = fs.readFileSync(k12Path, 'utf8');

// Replacement 1: summary table formatting
const target1 = `if (!isGrade1) {
                                              const sNameLower = sName.toLowerCase().normalize("NFC");
                                              if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                                                if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                                  val = firstVal !== undefined ? \`\${firstVal}/30\` : "—/30";
                                                } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                                  val = firstVal !== undefined ? \`\${firstVal}/70\` : "—/70";
                                                } else if (sc.id === "tong_diem_tieng_anh") {
                                                  val = firstVal !== undefined && firstVal !== "—" ? \`\${firstVal}/100\` : "—/100";
                                                }
                                              }
                                            }`.replace(/\n/g, '\r\n');

const repl1 = `const sNameLower = sName.toLowerCase().normalize("NFC");
                                            if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                                              if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                                val = firstVal !== undefined ? \`\${firstVal}/\${oralMaxScore}\` : \`—/\${oralMaxScore}\`;
                                              } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                                val = firstVal !== undefined ? \`\${firstVal}/\${writtenMaxScore}\` : \`—/\${writtenMaxScore}\`;
                                              } else if (sc.id === "tong_diem_tieng_anh") {
                                                val = firstVal !== undefined && firstVal !== "—" ? \`\${firstVal}/\${totalMaxScore}\` : \`—/\${totalMaxScore}\`;
                                              }
                                            }`.replace(/\n/g, '\r\n');

if (k12Content.includes(target1)) {
  k12Content = k12Content.replace(target1, repl1);
  console.log('Successfully replaced target1 in k12-client.tsx');
} else {
  console.log('Target1 not found in k12-client.tsx');
}

// Replacement 2: detail cards
const target2 = `<div className="text-lg font-black mt-1 leading-none text-slate-800">
                                                {oralScoreText !== "—" ? \`\${oralScoreText}/30\` : "—/30"}
                                              </div>
                                            </div>
                                            <div className="text-center shadow-sm flex flex-col justify-between text-slate-600 text-xs font-semibold">
                                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">Tiếng Anh (Viết)</span>
                                              <div className="text-lg font-black mt-1 leading-none text-slate-800">
                                                {writtenScoreText !== "—" ? \`\${writtenScoreText}/70\` : "—/70"}
                                              </div>
                                            </div>
                                            <div className="text-center shadow-sm flex flex-col justify-between text-indigo-700 text-xs font-semibold">
                                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">Tổng điểm</span>
                                              <div className="text-lg font-black mt-1 leading-none text-indigo-700">
                                                {totalVal !== "—" ? \`\${totalVal}/100\` : "—/100"}
                                              </div>`.replace(/\n/g, '\r\n');

const repl2 = `<div className="text-lg font-black mt-1 leading-none text-slate-800">
                                                {hasOralSubject ? (oralScoreText !== "—" ? \`\${oralScoreText}/\${oralMaxScore}\` : \`—/\${oralMaxScore}\`) : "Không khảo sát"}
                                              </div>
                                            </div>
                                            <div className="text-center shadow-sm flex flex-col justify-between text-slate-600 text-xs font-semibold">
                                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">Tiếng Anh (Viết)</span>
                                              <div className="text-lg font-black mt-1 leading-none text-slate-800">
                                                {hasWrittenSubject ? (writtenScoreText !== "—" ? \`\${writtenScoreText}/\${writtenMaxScore}\` : \`—/\${writtenMaxScore}\`) : "Không khảo sát"}
                                              </div>
                                            </div>
                                            <div className="text-center shadow-sm flex flex-col justify-between text-indigo-700 text-xs font-semibold">
                                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">Tổng điểm</span>
                                              <div className="text-lg font-black mt-1 leading-none text-indigo-700">
                                                {totalVal !== "—" ? \`\${totalVal}/\${totalMaxScore}\` : \`—/\${totalMaxScore}\`}
                                              </div>
                                              {totalVal !== "—" && totalMaxScore === 10 && (
                                                <span className="text-[8px] text-indigo-500 font-bold mt-1 block">
                                                  Quy đổi: {parseFloat(totalVal) * 10}/100
                                                </span>
                                              )}`.replace(/\n/g, '\r\n');

if (k12Content.includes(target2)) {
  k12Content = k12Content.replace(target2, repl2);
  console.log('Successfully replaced target2 in k12-client.tsx');
} else {
  console.log('Target2 not found in k12-client.tsx');
}

// Replacement 3: column detail
const target3 = `} else if (!isGrade1) {
                                                 const sNameLower = subName.toLowerCase().normalize("NFC");
                                                 if (sNameLower.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl")) {
                                                   if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || subCode.includes("speaking") || subCode.includes("oral") || subCode.includes("vd")) {
                                                     displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/30\` : "—/30";
                                                   } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                                     displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/70\` : "—/70";
                                                   }
                                                 }
                                               }`.replace(/\n/g, '\r\n');

const repl3 = `} else {
                                                 const sNameLower = subName.toLowerCase().normalize("NFC");
                                                 if (sNameLower.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl")) {
                                                   if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || subCode.includes("speaking") || subCode.includes("oral") || subCode.includes("vd")) {
                                                     displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/\${oralMaxScore}\` : \`—/\${oralMaxScore}\`;
                                                   } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                                     displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/\${writtenMaxScore}\` : \`—/\${writtenMaxScore}\`;
                                                   }
                                                 }
                                               }`.replace(/\n/g, '\r\n');

if (k12Content.includes(target3)) {
  k12Content = k12Content.replace(target3, repl3);
  console.log('Successfully replaced target3 in k12-client.tsx');
} else {
  console.log('Target3 not found in k12-client.tsx');
}

fs.writeFileSync(k12Path, k12Content, 'utf8');
console.log('Saved k12-client.tsx');

// 2. Update InputAssessmentStudent for HS105 in Database
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || ('file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')),
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function updateDb() {
  await client.execute({
    sql: "UPDATE InputAssessmentStudent SET oralEnglishScore = 4.0 WHERE studentCode = 'HS105' AND (oralEnglishScore IS NULL OR oralEnglishScore = '')",
    args: []
  });
  console.log('Updated HS105 oralEnglishScore = 4.0 in database');
}
updateDb().catch(console.error);
