const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
const retestAudited = JSON.parse(fs.readFileSync(path.join(__dirname, 'retest_audited_76.json'), 'utf8'));

// Map audited retest data to ckdv
let updatedCount = 0;

ckdv.forEach(st => {
  const aud = retestAudited.find(a => a.id === st.id || a.fullName === st.fullName);
  if (!aud) return;

  const m = aud.mergedScores;

  // Update Math
  if (m.math != null) {
    st.ksdvMath = m.math;
  }

  // Update Literature / Vietnamese
  if (m.van != null) {
    st.ksdvVan = m.van;
  }
  if (m.viet != null) {
    st.ksdvViet = m.viet;
  }

  // Update English
  // For Vo Thi Anh Thu: engScale10 is 2.5, engTotal is 25 (18 written + 7 oral)
  if (st.fullName === 'Võ Thị Anh Thư') {
    st.ksdvEngScale10 = 2.5;
    st.ksdvEngDetails = { written: 18, oral: 7, total: 25, scale10: 2.5 };
    st.ksdvStatus = 'Đủ điểm';
    st.missingCommitted = [];
    st.missingReason = '';
    updatedCount++;
  } else if (st.fullName === 'Mai Huy Thắng') {
    st.ksdvMath = 4.5;
    st.ksdvStatus = 'Đủ điểm';
    st.missingCommitted = [];
    st.missingReason = '';
    updatedCount++;
  } else if (st.fullName.trim() === 'Trần Hoàng Anh') {
    st.ksdvEngScale10 = 2.0;
    st.ksdvEngDetails = { written: 18, oral: 2, total: 20, scale10: 2.0 };
    st.ksdvStatus = 'Đủ điểm';
    st.missingCommitted = [];
    st.missingReason = '';
    updatedCount++;
  } else if (st.fullName === 'Lê Khánh Hà') {
    st.ksdvEngScale10 = 1.2;
    st.ksdvEngDetails = { written: 4, oral: 8, total: 12, scale10: 1.2 };
    st.ksdvStatus = 'Đủ điểm';
    st.missingCommitted = [];
    st.missingReason = '';
    updatedCount++;
  } else if (st.fullName === 'Nguyễn Ngọc Minh') {
    st.ksdvEngScale10 = 2.3;
    st.ksdvEngDetails = { written: 18, oral: 5, total: 23, scale10: 2.3 };
    st.ksdvStatus = 'Đủ điểm';
    st.missingCommitted = [];
    st.missingReason = '';
    updatedCount++;
  }

  // Also record all tested entrance subjects in a structured field
  st.allEntranceSubjects = {
    math: st.ksdvMath,
    viet: st.ksdvViet,
    van: st.ksdvVan,
    engScale10: st.ksdvEngScale10,
    engTotal: st.ksdvEngDetails ? st.ksdvEngDetails.total : null
  };
});

console.log(`Updated ${updatedCount} students with merged retest and full entrance scores.`);

// Save back to exact_commitment_table.json
fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(ckdv, null, 2), 'utf8');

// Also update exact_report_data.json if it contains the commitment table
const reportDataPath = path.join(__dirname, 'exact_report_data.json');
if (fs.existsSync(reportDataPath)) {
  const reportData = JSON.parse(fs.readFileSync(reportDataPath, 'utf8'));
  if (reportData.ckdvData) {
    reportData.ckdvData = ckdv;
    fs.writeFileSync(reportDataPath, JSON.stringify(reportData, null, 2), 'utf8');
  }
}

console.log('Successfully synced exact_commitment_table.json and exact_report_data.json');
