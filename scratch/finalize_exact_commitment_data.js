const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

// Ground-truth verified scores directly from Turso SAS notes & test max scores
const specificUpdates = {
  // 1. Phan Anh Quân: Committed [EPT], SAS EPT score is 41/100 -> 4.1
  'Phan Anh Quân': {
    ksdvEngScale10: 4.1,
    ksdvEng: 4.1
  },
  // 2. Lê Nguyên Khang: Teacher Note 4/10 in SAS
  'Lê Nguyên Khang': {
    ksdvEngScale10: 4.0,
    ksdvEng: 4.0
  },
  // 3. Hà Đặng Phước Huy (Grade 1): Note 10/30 in SAS -> 3.3
  'Hà Đặng Phước Huy': {
    ksdvEngScale10: 3.3,
    ksdvEng: 3.3
  },
  // 4. Đỗ An Nhiên (Grade 1): Note 3/30 in SAS -> 1.0
  'Đỗ An Nhiên ': {
    ksdvEngScale10: 1.0,
    ksdvEng: 1.0
  },
  // 5. Vũ Đức Thịnh (Grade 1): Note 3/30 in SAS -> 1.0
  'Vũ Đức Thịnh': {
    ksdvEngScale10: 1.0,
    ksdvEng: 1.0
  },
  // 6. Phạm Nguyễn Minh Anh (Grade 10): 8/20 + 19/80 = 27/100 -> 2.7
  'Phạm Nguyễn Minh Anh': {
    ksdvEngScale10: 2.7,
    ksdvEng: 2.7
  },
  // 7. Đỗ Thành Nguyên (Grade 10): 10/20 + 0/80 = 10/100 -> 1.0
  'Đỗ Thành Nguyên': {
    ksdvEngScale10: 1.0,
    ksdvEng: 1.0
  },
  // 8. Lê Nguyễn Hoàng Bảo (Grade 7): 5/20 + 12/80 = 17/100 -> 1.7
  'Lê Nguyễn Hoàng Bảo': {
    ksdvEngScale10: 1.7,
    ksdvEng: 1.7
  },
  // 9. Võ Thị Anh Thư (Grade 7): 7/20 + 18/80 = 25/100 -> 2.5
  'Võ Thị Anh Thư': {
    ksdvEngScale10: 2.5,
    ksdvEng: 2.5
  },
  // 10. Phạm Kiều Anh (Grade 6): SAS TVI score is 4
  'Phạm Kiều Anh': {
    ksdvVan: 4.0,
    ksdvViet: 4.0
  },
  // 11. Nguyễn Gia Bảo (Grade 9 CS1): 10/100 -> 1.0
  'Nguyễn Gia Bảo': {
    ksdvEngScale10: 1.0,
    ksdvEng: 1.0
  },
  // 12. Phạm Gia Bảo (Grade 9 CS1): 10/100 -> 1.0
  'Phạm Gia Bảo': {
    ksdvEngScale10: 1.0,
    ksdvEng: 1.0,
    ksdnMath: 3.75,
    ksdnVan: 3.5,
    ksdnEng: 3.6,
    className: '9.3_CS1'
  },
  // 13. Nguyễn Minh Anh (Grade 6 CS5): className 6.5_CS5
  'Nguyễn Minh Anh': {
    className: '6.5_CS5',
    ksdnMath: 6.75,
    ksdnVan: 8.25,
    ksdnEng: 5.2
  },
  // 14. Lê Đình Sỹ Phú (Grade 6 CS1): className 6.1_CS1
  'LÊ ĐÌNH SĨ PHÚ': {
    className: '6.1_CS1',
    fullName: 'Lê Đình Sỹ Phú',
    ksdnMath: 6.0,
    ksdnVan: 6.25,
    ksdnEng: 5.1
  },
  // 15. Phạm Gia Hưng (Grade 7 CS1): className 7.3_CS1
  'Phạm Gia Hưng': {
    className: '7.3_CS1',
    ksdnMath: 5.0,
    ksdnVan: 4.5,
    ksdnEng: 0.7
  },
  // 16. Nguyễn Quỳnh Như (Grade 6 CS1): className 6.1_CS1
  'Nguyễn Quỳnh Như': {
    className: '6.1_CS1',
    ksdnMath: 5.0,
    ksdnVan: 7.0,
    ksdnEng: 4.0
  },
  // 17. Nguyễn Đặng Bảo Trâm: Chung / Theo dõi (Section 3)
  'Nguyễn Đặng Bảo Trâm ': {
    committedSubjects: ['Chung / Theo dõi'],
    isPsychology: false // Ensure she is ONLY in Section 3
  }
};

data.forEach(st => {
  const norm = st.fullName.trim();
  const up = specificUpdates[norm] || specificUpdates[st.fullName];
  if (up) {
    Object.assign(st, up);
  }
});

// Save updated exact_commitment_table.json
fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(data, null, 2), 'utf8');
console.log('Saved 100% database-grounded exact_commitment_table.json!');
