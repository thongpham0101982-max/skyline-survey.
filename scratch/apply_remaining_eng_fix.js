const fs = require('fs');
const path = require('path');

// 1. Update k12-client.tsx line 8256
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
  console.log('oldChunk not found in k12-client.tsx');
}

// 2. Update input-assessments/client.tsx
const inpPath = path.resolve(__dirname, '../src/app/admin/input-assessments/client.tsx');
let inpContent = fs.readFileSync(inpPath, 'utf8');

// Check line endings in input-assessments/client.tsx
const isCrlf = inpContent.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

// Replace 1 in input-assessments
const inpOld1 = `                                    if (true) {
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
                                    }`.replace(/\n/g, eol);

const inpNew1 = `                                    const sNameLower = sName.toLowerCase().normalize("NFC");
                                    if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                                      if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                        val = firstVal !== undefined ? \`\${firstVal}/\${oralMaxScore}\` : \`—/\${oralMaxScore}\`;
                                      } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                        val = firstVal !== undefined ? \`\${firstVal}/\${writtenMaxScore}\` : \`—/\${writtenMaxScore}\`;
                                      } else if (sc.id === "tong_diem_tieng_anh") {
                                        val = firstVal !== undefined && firstVal !== "—" ? \`\${firstVal}/\${totalMaxScore}\` : \`—/\${totalMaxScore}\`;
                                      }
                                    }`.replace(/\n/g, eol);

if (inpContent.includes(inpOld1)) {
  inpContent = inpContent.replace(inpOld1, inpNew1);
  console.log('Successfully updated input-assessments/client.tsx table scores');
} else {
  console.log('inpOld1 not found in input-assessments/client.tsx');
}

// Replace calculation block in input-assessments
const inpOldCalc = `                        let oralScoreVal = null;
                        let writtenScoreVal = null;
                        let oralScoreText = "—";
                        let writtenScoreText = "—";
                        
                        if (hasEnglish) {
                          scoresList.forEach((sc) => {
                            const sName = (sc.subject?.name || "").toLowerCase().normalize("NFC");
                            const sCode = (sc.subject?.code || "").toLowerCase();
                            if (sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                              let scoreVal = undefined;
                              try {
                                if (sc.scores) {
                                  const parsed = JSON.parse(sc.scores);
                                  const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                  scoreVal = vArr.find(x => x !== undefined && x !== "" && x !== null);
                                }
                              } catch {}
                              
                              if (sName.includes("vấn đáp") || sName.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                  oralScoreVal = parseFloat(scoreVal);
                                  oralScoreText = scoreVal.toString();
                                }
                              } else if (sName.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                  writtenScoreVal = parseFloat(scoreVal);
                                  writtenScoreText = scoreVal.toString();
                                }
                              }
                            }
                          });
                          
                          let totalVal = "—";
                          if (oralScoreVal !== null || writtenScoreVal !== null) {
                            totalVal = ((oralScoreVal || 0) + (writtenScoreVal || 0)).toString();
                          }`.replace(/\n/g, eol);

const inpNewCalc = `                        const getNumericGrade = (g) => {
                          if (!g) return null;
                          const match = g.toString().match(/\\d+/);
                          return match ? parseInt(match[0], 10) : null;
                        };
                        const studentNumGrade = getNumericGrade(selectedReportStudent?.grade);
                        const isGrade1 = studentNumGrade === 1;
                        const isGrade2 = studentNumGrade === 2;
                        
                        const parseMaxFromComment = (commentVal) => {
                          if (!commentVal) return null;
                          let text = "";
                          if (Array.isArray(commentVal)) {
                            text = commentVal.join(" ");
                          } else if (typeof commentVal === "string") {
                            try {
                              const p = JSON.parse(commentVal);
                              text = Array.isArray(p) ? p.join(" ") : String(p || "");
                            } catch {
                              text = commentVal;
                            }
                          }
                          const m = text.match(/(?:Note:\\s*)?(?:\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)/i);
                          if (m && m[1]) {
                            const num = parseFloat(m[1]);
                            if (!isNaN(num) && num > 0) return num;
                          }
                          return null;
                        };
                        
                        let hasOralSubject = false;
                        let hasWrittenSubject = false;
                        let oralScoreVal = null;
                        let writtenScoreVal = null;
                        let oralScoreText = "—";
                        let writtenScoreText = "—";
                        let oralMaxScore = isGrade2 ? 10 : (studentNumGrade && studentNumGrade >= 7 ? 20 : 30);
                        let writtenMaxScore = (studentNumGrade && studentNumGrade >= 7 ? 80 : 70);
                        
                        if (hasEnglish) {
                          scoresList.forEach((sc) => {
                            const sName = (sc.subject?.name || "").toLowerCase().normalize("NFC");
                            const sCode = (sc.subject?.code || "").toLowerCase();
                            if (sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                              let scoreVal = undefined;
                              try {
                                if (sc.scores) {
                                  const parsed = JSON.parse(sc.scores);
                                  const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                  scoreVal = vArr.find(x => x !== undefined && x !== "" && x !== null);
                                }
                              } catch {}
                              
                              const maxFromCmt = parseMaxFromComment(sc.comments);
                              
                              if (sName.includes("vấn đáp") || sName.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                hasOralSubject = true;
                                if (maxFromCmt) {
                                  oralMaxScore = maxFromCmt;
                                } else if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                  const num = parseFloat(scoreVal);
                                  if (!isNaN(num) && num <= 10 && (isGrade1 || isGrade2 || (studentNumGrade && studentNumGrade <= 5))) {
                                    oralMaxScore = 10;
                                  }
                                }
                                if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                  oralScoreVal = parseFloat(scoreVal);
                                  oralScoreText = scoreVal.toString();
                                }
                              } else if (sName.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                hasWrittenSubject = true;
                                if (maxFromCmt) {
                                  writtenMaxScore = maxFromCmt;
                                }
                                if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                  writtenScoreVal = parseFloat(scoreVal);
                                  writtenScoreText = scoreVal.toString();
                                }
                              }
                            }
                          });
                          
                          let totalVal = "—";
                          let totalMaxScore = 100;
                          
                          if (hasOralSubject && hasWrittenSubject) {
                            if (oralScoreVal !== null || writtenScoreVal !== null) {
                              const sum = (oralScoreVal || 0) + (writtenScoreVal || 0);
                              totalVal = (Math.round(sum * 10) / 10).toString();
                              totalMaxScore = oralMaxScore + writtenMaxScore;
                            }
                          } else if (hasOralSubject && !hasWrittenSubject) {
                            totalMaxScore = oralMaxScore;
                            if (oralScoreVal !== null) {
                              totalVal = oralScoreVal.toString();
                            }
                          } else if (!hasOralSubject && hasWrittenSubject) {
                            totalMaxScore = writtenMaxScore;
                            if (writtenScoreVal !== null) {
                              totalVal = writtenScoreVal.toString();
                            }
                          } else if (oralScoreVal !== null || writtenScoreVal !== null) {
                            const sum = (oralScoreVal || 0) + (writtenScoreVal || 0);
                            totalVal = (Math.round(sum * 10) / 10).toString();
                            totalMaxScore = (oralScoreVal !== null ? oralMaxScore : 0) + (writtenScoreVal !== null ? writtenMaxScore : 0) || 100;
                          }`.replace(/\n/g, eol);

if (inpContent.includes(inpOldCalc)) {
  inpContent = inpContent.replace(inpOldCalc, inpNewCalc);
  console.log('Successfully updated input-assessments/client.tsx calculation block');
} else {
  console.log('inpOldCalc not found in input-assessments/client.tsx');
}

fs.writeFileSync(inpPath, inpContent, 'utf8');
console.log('Saved input-assessments/client.tsx');
