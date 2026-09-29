const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_76_deep_entrance_audit.json'), 'utf8'));

console.log('Auditing student scores and statuses:');

const updatedStudents = [];

ckdv.forEach((st, idx) => {
  const deep = audit[idx];
  
  // Extract all valid scores
  let math = null;
  let viet = null;
  let van = null;
  let engW = null;
  let engO = null;
  let ept = null;

  deep.records.forEach(r => {
    // 1. Direct fields in InputAssessmentStudent
    if (r.directScores.math != null && !isNaN(parseFloat(r.directScores.math))) {
      math = parseFloat(r.directScores.math);
    }
    if (r.directScores.lit != null && !isNaN(parseFloat(r.directScores.lit))) {
      const v = parseFloat(r.directScores.lit);
      if (deep.grade <= 5) viet = v;
      else van = v;
    }
    if (r.directScores.engW != null && !isNaN(parseFloat(r.directScores.engW))) {
      engW = parseFloat(r.directScores.engW);
    }
    if (r.directScores.engO != null && !isNaN(parseFloat(r.directScores.engO))) {
      engO = parseFloat(r.directScores.engO);
    }

    // 2. StudentAssessmentScore
    const sas = r.sasScores;
    if (sas['TOA'] && !isNaN(parseFloat(sas['TOA'].val))) {
      math = parseFloat(sas['TOA'].val);
    }
    if (sas['TVI'] && !isNaN(parseFloat(sas['TVI'].val))) {
      viet = parseFloat(sas['TVI'].val);
    }
    if (sas['NVA'] && !isNaN(parseFloat(sas['NVA'].val))) {
      if (deep.grade <= 5) viet = parseFloat(sas['NVA'].val);
      else van = parseFloat(sas['NVA'].val);
    }
    // Transition Grade 6: TVI is literature
    if (deep.grade >= 6 && sas['TVI'] && !isNaN(parseFloat(sas['TVI'].val)) && van == null) {
      van = parseFloat(sas['TVI'].val);
    }
    if (deep.grade <= 5 && sas['NVA'] && !isNaN(parseFloat(sas['NVA'].val)) && viet == null) {
      viet = parseFloat(sas['NVA'].val);
    }

    if (sas['TAv'] && !isNaN(parseFloat(sas['TAv'].val))) {
      engW = parseFloat(sas['TAv'].val);
    }
    if (sas['TAvd'] && !isNaN(parseFloat(sas['TAvd'].val))) {
      engO = parseFloat(sas['TAvd'].val);
    }
    if (sas['EPT'] && !isNaN(parseFloat(sas['EPT'].val))) {
      ept = parseFloat(sas['EPT'].val);
    }
  });

  // Calculate English total and scale 10
  let engTotal = null;
  let engScale10 = null;
  const isGrade1 = deep.grade === '1' || (st.className && st.className.startsWith('1.'));

  if (isGrade1) {
    if (engO != null) {
      // In grade 1, English interview is out of 30, scaled to 100 for total, or out of 30
      // Previous logic: total = (engO / 30) * 100, scale10 = (engO / 30) * 10
      // Or if oral is already the total test score:
      // Let's keep consistent: Total out of 100: Math.round((engO / 30) * 100 * 10) / 10
      // Scale 10: Math.round((engO / 30) * 10 * 10) / 10
      engTotal = Math.round((engO / 30) * 100 * 10) / 10;
      engScale10 = Math.round((engO / 30) * 10 * 10) / 10;
    }
  } else {
    if (ept != null && ept > 0) {
      engTotal = ept;
      engScale10 = +(ept / 10).toFixed(1);
    } else if (engW != null && engO != null) {
      engTotal = +(engW + engO).toFixed(1);
      engScale10 = +(engTotal / 10).toFixed(1);
    } else if (engW != null) {
      engTotal = engW;
      engScale10 = +(engW / 10).toFixed(1);
    } else if (engO != null) {
      if (engO <= 30) {
        engTotal = Math.round((engO / 30) * 100 * 10) / 10;
        engScale10 = Math.round((engO / 30) * 10 * 10) / 10;
      } else {
        engTotal = engO;
        engScale10 = +(engO / 10).toFixed(1);
      }
    }
  }

  // Vo Thi Anh Thu: Retest Math = 8.0
  if (st.fullName === 'Võ Thị Anh Thư') {
    math = 8.0;
  }

  // Check committed subjects and missing status
  const committed = Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || '');
  
  const missingCommitted = [];
  if (committed.includes('Toán') && math == null) missingCommitted.push('Toán');
  if (committed.includes('Tiếng Việt') && viet == null && (deep.grade <= 5 || van == null)) missingCommitted.push('Tiếng Việt');
  if (committed.includes('Ngữ Văn') && van == null && viet == null) missingCommitted.push('Ngữ Văn');
  if (committed.includes('Tiếng Anh') && engScale10 == null) missingCommitted.push('Tiếng Anh');

  // Status classification:
  let ksdvStatus = 'Đủ điểm';
  let missingReason = '';

  if (st.isPsychology) {
    ksdvStatus = 'Cam kết Tâm lý';
    missingReason = 'Chỉ cam kết theo dõi tâm lý lứa tuổi, không khảo sát văn hóa';
  } else if (math == null && viet == null && van == null && engScale10 == null) {
    ksdvStatus = 'Chưa có điểm KSĐV';
    if (st.fullName === 'Lê Nguyên Khang') {
      missingReason = 'Diện Tuyển thẳng (không phải thi khảo sát đầu vào)';
    } else if (st.fullName === 'Phan Hải Đăng') {
      missingReason = 'Cam kết theo dõi phát triển ngôn ngữ (chưa thi khảo sát văn hóa)';
    } else if (st.fullName === 'Nguyễn Thanh Thảo') {
      missingReason = 'Chưa cập nhật điểm bài thi Tiếng Anh trên hệ thống';
    } else {
      missingReason = 'Hồ sơ chưa có điểm bài thi khảo sát đầu vào';
    }
  } else if (missingCommitted.length > 0) {
    ksdvStatus = 'Thiếu môn CKĐV';
    if (st.fullName === 'Phan Anh Quân') {
      missingReason = 'Hệ Quốc tế (chỉ thi EPT 41/100, không thi Toán đề chung)';
    } else if (['Đoàn Ngọc Thảo Chloe', 'Govorushko Mikhail', 'Lecomte Mailys Mộc Yên', 'Nguyễn Daniil', 'Sangadziev Aron'].includes(st.fullName)) {
      missingReason = 'Học sinh nước ngoài / song ngữ (chưa qua khảo sát Tiếng Việt đầu vào)';
    } else if (st.fullName === 'Mai Huy Thắng') {
      missingReason = 'Được bảo lưu/miễn thi Toán (đã có điểm Văn 8.0, Anh 8.0)';
    } else if (st.fullName === 'Võ Thị Anh Thư') {
      missingReason = 'Thi lại Toán đạt 8.0; môn Tiếng Anh chưa nhập điểm trên hệ thống';
    } else if (['Trần Hoàng Anh', 'Trần Hoàng Anh ', 'Lê Khánh Hà', 'Nguyễn Ngọc Minh'].includes(st.fullName)) {
      missingReason = 'Môn Tiếng Anh chưa nhập điểm trên hệ thống (đã có điểm Toán, Văn)';
    } else {
      missingReason = `Chưa có điểm môn ${missingCommitted.join(', ')}`;
    }
  }

  updatedStudents.push({
    ...st,
    ksdvMath: math,
    ksdvViet: viet,
    ksdvVan: van,
    ksdvEngDetails: {
      written: engW,
      oral: engO,
      ept: ept,
      totalScore: engTotal,
      scale10: engScale10
    },
    ksdvEngScale10: engScale10,
    ksdvEngTotal: engTotal,
    ksdvStatus,
    missingCommitted,
    missingReason
  });
});

console.log('Processed', updatedStudents.length, 'students.');
const statusCounts = {};
updatedStudents.forEach(s => {
  statusCounts[s.ksdvStatus] = (statusCounts[s.ksdvStatus] || 0) + 1;
});
console.log('Status counts:', statusCounts);

fs.writeFileSync(path.join(__dirname, 'exact_commitment_table_updated.json'), JSON.stringify(updatedStudents, null, 2), 'utf8');
console.log('Saved to exact_commitment_table_updated.json');
