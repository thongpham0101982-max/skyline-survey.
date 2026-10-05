const { normalizeSubjectForImport, parseCommittedSubjects } = require('../src/lib/subject-mapping.ts');

const testCases = [
  // 1. KSĐV & ĐBCL
  'DG_NLTD',
  'Năng lực tư duy',
  'nltd',
  'DG_TOAN',
  'Toán học',
  'TOA',
  'DG_TIENG_VIET',
  'Tiếng Việt',
  'DG_TIENG_ANH',
  'TAv',
  'TAvd',
  'EPT',
  'DG_TAM_LY',
  'Tâm lý',

  // 2. Song ngữ chuẩn INT-...
  'INT-ENG',
  'English',
  'ESL',
  'INT-MATH',
  'Mathematics',
  'Maths',
  'INT-SCI',
  'Science',
  'INT-READ',
  'Library Reading',
  'INT-GLOBAL',
  'Global Studies',
  'INT-AE',
  'Academic English',
  'INT-IELTS',
  'IELTS',
  'INT-SAT',
  'SAT',
  'INT-BUS',
  'Business',
  'INT-AR',
  'A.R',
  'INT-CORE',
  'Core Competencies',

  // 3. MOET
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Khoa học tự nhiên',
  'Lịch sử',
  'Địa lí',
  'GDCD',
  'Tin học / ICT',
  'Âm nhạc',
  'Mĩ thuật',
  'Giáo dục thể chất'
];

console.log('=== TEST RESOLVE CHUẨN HÓA MÔN HỌC FILE EXCEL ===\n');
testCases.forEach(tc => {
  const res = normalizeSubjectForImport(tc);
  if (res) {
    console.log(`✅ "${tc.padEnd(25)}" -> Mã: [${res.code.padEnd(10)}] | Tên: ${res.name.padEnd(35)} | Nhóm: ${res.category.padEnd(10)} | Eval: ${res.evaluationType}`);
  } else {
    console.log(`❌ "${tc}" -> KHÔNG NHẬN DIỆN ĐƯỢC`);
  }
});

console.log('\n=== TEST PHÂN TÁCH MÔN CAM KẾT (NLTD RIÊNG, KHÔNG GHÉP TOÁN) ===');
const sampleNote = 'Môn cam kết: [Năng lực tư duy, Toán, Tiếng Anh]';
console.log('Input:', sampleNote);
console.log('Output:', parseCommittedSubjects(sampleNote));
