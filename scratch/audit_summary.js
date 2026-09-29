const fs = require('fs');
const path = require('path');

const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_76_deep_entrance_audit.json'), 'utf8'));

console.log('=== AUDITING ENTRANCE SCORES ACROSS ALL 76 STUDENTS ===\n');

const studentsNoScore = [];
const studentsPartialScore = [];
const studentsFullScore = [];
const psychologyOnly = [];

audit.forEach(s => {
  const comm = Array.isArray(s.committed) ? s.committed.join(', ') : (s.committed || '');
  
  if (s.isPsychology) {
    psychologyOnly.push(s);
    return;
  }

  // Combine scores from all records of this student
  let math = null;
  let viet = null;
  let van = null;
  let engWritten = null;
  let engOral = null;
  let engEpt = null;
  let hasAnyScore = false;

  const notes = [];
  const criteriaList = [];

  s.records.forEach(r => {
    if (r.note) notes.push(r.note);
    if (r.criteria) criteriaList.push(r.criteria);

    // Direct
    if (r.directScores.math != null && !isNaN(parseFloat(r.directScores.math))) math = parseFloat(r.directScores.math);
    if (r.directScores.lit != null && !isNaN(parseFloat(r.directScores.lit))) {
      if (s.grade <= 5) viet = parseFloat(r.directScores.lit);
      else van = parseFloat(r.directScores.lit);
    }
    if (r.directScores.engW != null && !isNaN(parseFloat(r.directScores.engW))) engWritten = parseFloat(r.directScores.engW);
    if (r.directScores.engO != null && !isNaN(parseFloat(r.directScores.engO))) engOral = parseFloat(r.directScores.engO);

    // SAS
    const sas = r.sasScores;
    if (sas['TOA'] && !isNaN(parseFloat(sas['TOA'].val))) math = parseFloat(sas['TOA'].val);
    if (sas['TVI'] && !isNaN(parseFloat(sas['TVI'].val))) viet = parseFloat(sas['TVI'].val);
    if (sas['NVA'] && !isNaN(parseFloat(sas['NVA'].val))) {
      if (s.grade <= 5) viet = parseFloat(sas['NVA'].val);
      else van = parseFloat(sas['NVA'].val);
    }
    // Note: If Grade 6 student has TVI instead of NVA, map it to Ngữ Văn or Tiếng Việt!
    if (s.grade >= 6 && sas['TVI'] && !isNaN(parseFloat(sas['TVI'].val)) && van == null) {
      van = parseFloat(sas['TVI'].val);
    }
    if (s.grade <= 5 && sas['NVA'] && !isNaN(parseFloat(sas['NVA'].val)) && viet == null) {
      viet = parseFloat(sas['NVA'].val);
    }

    if (sas['TAv'] && !isNaN(parseFloat(sas['TAv'].val))) engWritten = parseFloat(sas['TAv'].val);
    if (sas['TAvd'] && !isNaN(parseFloat(sas['TAvd'].val))) engOral = parseFloat(sas['TAvd'].val);
    if (sas['EPT'] && !isNaN(parseFloat(sas['EPT'].val))) engEpt = parseFloat(sas['EPT'].val);
  });

  let engTotal = null;
  let engScale10 = null;
  if (engEpt != null) {
    engTotal = engEpt;
    engScale10 = +(engEpt / 10).toFixed(1);
  } else if (engWritten != null || engOral != null) {
    engTotal = (engWritten || 0) + (engOral || 0);
    engScale10 = +(engTotal / 10).toFixed(1);
  }

  // Check if has any academic score
  if (math != null || viet != null || van != null || engTotal != null) {
    hasAnyScore = true;
  }

  // Check missing committed subjects
  const missingSubs = [];
  if (comm.includes('Toán') && math == null) missingSubs.push('Toán');
  if (comm.includes('Tiếng Việt') && viet == null) missingSubs.push('Tiếng Việt');
  if (comm.includes('Ngữ Văn') && van == null) missingSubs.push('Ngữ Văn');
  if (comm.includes('Tiếng Anh') && engTotal == null) missingSubs.push('Tiếng Anh');

  const item = {
    stt: s.stt,
    name: s.name,
    campus: s.campus,
    grade: s.grade,
    className: s.className,
    committed: comm,
    math, viet, van, engTotal, engScale10,
    hasAnyScore,
    missingSubs,
    criteria: criteriaList.join('; '),
    notes: notes.join(' | ')
  };

  if (!hasAnyScore) {
    studentsNoScore.push(item);
  } else if (missingSubs.length > 0) {
    studentsPartialScore.push(item);
  } else {
    studentsFullScore.push(item);
  }
});

console.log(`1. Học sinh chỉ cam kết Tâm lý: ${psychologyOnly.length} em`);
console.log(`2. Học sinh ĐỦ ĐIỂM tất cả môn cam kết: ${studentsFullScore.length} em`);
console.log(`3. Học sinh CÓ ĐIỂM nhưng THIẾU môn cam kết: ${studentsPartialScore.length} em`);
console.log(`4. Học sinh HOÀN TOÀN CHƯA CÓ ĐIỂM KSĐV (môn nào cũng trống): ${studentsNoScore.length} em`);

console.log('\n--- CHI TIẾT NHÓM HOÀN TOÀN CHƯA CÓ ĐIỂM (Không có điểm bài thi nào) ---');
studentsNoScore.forEach(st => {
  console.log(`[STT ${st.stt}] ${st.name} | ${st.campus} | ${st.className} (Khối ${st.grade})`);
  console.log(`   Môn CK: ${st.committed}`);
  console.log(`   Tiêu chí: ${st.criteria} | Ghi chú: ${st.notes}`);
});

console.log('\n--- CHI TIẾT NHÓM THIẾU MÔN CAM KẾT (Có điểm một số môn, thiếu môn khác) ---');
studentsPartialScore.forEach(st => {
  console.log(`[STT ${st.stt}] ${st.name} | ${st.campus} | ${st.className} (Khối ${st.grade})`);
  console.log(`   Môn CK: ${st.committed}`);
  console.log(`   Môn thiếu: ${st.missingSubs.join(', ')}`);
  console.log(`   Điểm có: Toán=${st.math}, TV=${st.viet}, Văn=${st.van}, Anh=${st.engScale10} (Tổng ${st.engTotal})`);
  console.log(`   Ghi chú: ${st.notes}`);
});
