const fs = require('fs');
const path = require('path');

const k12Path = path.resolve(__dirname, '../src/app/admin/xet-duyet-ket-qua/k12-client.tsx');
let k12Content = fs.readFileSync(k12Path, 'utf8');

const oldChunk = `} else if (!isGrade1) {
                                                const sNameLower = subName.toLowerCase().normalize("NFC");
                                                if (sNameLower.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl")) {
                                                  if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || subCode.includes("speaking") || subCode.includes("oral") || subCode.includes("vd")) {
                                                    displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/30\` : "—/30";
                                                  } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                                    displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/70\` : "—/70";
                                                  }
                                                }
                                              }`.replace(/\n/g, '\r\n');

const newChunk = `} else {
                                                const sNameLower = subName.toLowerCase().normalize("NFC");
                                                if (sNameLower.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl")) {
                                                  if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || subCode.includes("speaking") || subCode.includes("oral") || subCode.includes("vd")) {
                                                    displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/\${oralMaxScore}\` : \`—/\${oralMaxScore}\`;
                                                  } else if (sNameLower.includes("viết") || subCode.includes("writing") || subCode.includes("written") || subCode.includes("vt")) {
                                                    displayVal = val !== undefined && val !== "" && val !== null ? \`\${val}/\${writtenMaxScore}\` : \`—/\${writtenMaxScore}\`;
                                                  }
                                                }
                                              }`.replace(/\n/g, '\r\n');

if (k12Content.includes(oldChunk)) {
  k12Content = k12Content.replace(oldChunk, newChunk);
  fs.writeFileSync(k12Path, k12Content, 'utf8');
  console.log('Successfully updated k12-client.tsx line 8256');
} else {
  // Try finding position
  const p = k12Content.indexOf('displayVal = val !== undefined && val !== "" && val !== null ? `${val}/30` : "—/30";');
  console.log('Found /30 pos in k12:', p);
}
