const fs = require('fs');
const path = require('path');

const ckdvPath = path.join(__dirname, 'exact_commitment_table.json');
const ckdv = JSON.parse(fs.readFileSync(ckdvPath, 'utf8'));

const khang = ckdv.find(s => s.fullName === 'Lê Nguyên Khang');
if (khang) {
  khang.ksdvEngScale10 = 4;
  khang.ksdvEng = 4;
  khang.ksdvEngDetails = {
    written: null,
    oral: 4,
    totalScore: 4,
    scale10: 4
  };
  khang.ksdvStatus = 'Đủ điểm';
  khang.missingCommitted = [];
  khang.missingReason = '';
  khang.allEntranceSubjects = {
    math: null,
    viet: null,
    van: null,
    engScale10: 4,
    engTotal: 4
  };
  console.log('Successfully updated Lê Nguyên Khang:', JSON.stringify(khang, null, 2));
} else {
  console.log('Could not find Lê Nguyên Khang');
}

fs.writeFileSync(ckdvPath, JSON.stringify(ckdv, null, 2), 'utf8');

// Also update exact_report_data.json
const repPath = path.join(__dirname, 'exact_report_data.json');
if (fs.existsSync(repPath)) {
  const rep = JSON.parse(fs.readFileSync(repPath, 'utf8'));
  if (rep.ckdvData) {
    const kRep = rep.ckdvData.find(s => s.fullName === 'Lê Nguyên Khang');
    if (kRep) {
      kRep.ksdvEngScale10 = 4;
      kRep.ksdvEng = 4;
      kRep.ksdvEngDetails = { written: null, oral: 4, totalScore: 4, scale10: 4 };
      kRep.ksdvStatus = 'Đủ điểm';
      kRep.missingCommitted = [];
      kRep.missingReason = '';
    }
    fs.writeFileSync(repPath, JSON.stringify(rep, null, 2), 'utf8');
  }
}
