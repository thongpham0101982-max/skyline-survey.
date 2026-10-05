const fs = require('fs');
const path = require('path');

const k12Path = path.resolve(__dirname, '../src/app/admin/xet-duyet-ket-qua/k12-client.tsx');
let content = fs.readFileSync(k12Path, 'utf8');

const oldDecl = `let oralMaxScore = isGrade2 ? 10 : (studentNumGrade && studentNumGrade >= 7 ? 20 : 30);
                        let writtenMaxScore = (studentNumGrade && studentNumGrade >= 7 ? 80 : 70);`.replace(/\n/g, '\r\n');

const newDecl = `let oralMaxScore = isGrade2 ? 10 : (studentNumGrade && studentNumGrade >= 7 ? 20 : 30);
                        let writtenMaxScore = (studentNumGrade && studentNumGrade >= 7 ? 80 : 70);
                        let totalMaxScore = 100;`.replace(/\n/g, '\r\n');

content = content.replace(oldDecl, newDecl);

const oldBranch = `totalMaxScore = oralMaxScore;
                            if (oralScoreVal !== null) {
                              totalVal = oralScoreVal.toString();
                            }
                          } else if (!hasOralSubject && hasWrittenSubject) {
                            totalMaxScore = writtenMaxScore;
                            if (writtenScoreVal !== null) {
                              totalVal = writtenScoreVal.toString();
                            }`.replace(/\n/g, '\r\n');

const newBranch = `totalMaxScore = oralMaxScore;
                            if (oralScoreVal !== null) {
                              totalVal = String(oralScoreVal);
                            }
                          } else if (!hasOralSubject && hasWrittenSubject) {
                            totalMaxScore = writtenMaxScore;
                            if (writtenScoreVal !== null) {
                              totalVal = String(writtenScoreVal);
                            }`.replace(/\n/g, '\r\n');

content = content.replace(oldBranch, newBranch);

// Remove the inner declaration `let totalMaxScore = 100;` on line 7697
const innerDecl = `                          let totalVal = "—";
                          let totalMaxScore = 100;`.replace(/\n/g, '\r\n');
const innerNew = `                          let totalVal = "—";`.replace(/\n/g, '\r\n');

content = content.replace(innerDecl, innerNew);

fs.writeFileSync(k12Path, content, 'utf8');
console.log('Fixed totalMaxScore in k12-client.tsx');
