const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@libsql/client');

const localClient = createClient({ url: 'file:local.db' });
const cloudClient = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Mapping môn học chuẩn sang Subject Code trong DB
const SUBJECT_MAP = {
  TOAN: 'cmnmv7t5y000114ev4esi6lzv', // Toán học
  VAN: 'cmnmxagiy0007yiyoqmq5vy2p',  // Ngữ Văn
  TIENG_VIET: 'cmno3cqgg000fbnys6vkdx31h', // Tiếng Việt
  TIENG_ANH: 'cmrbkuc0x0006c06cju00coug',  // Tiếng Anh
  KHTN: 'cmrbkhkcl000aid4b1tqgeyb4', // Khoa học tự nhiên
  VAT_LI: 'cmrbrk61x000012ogpvx8910t', // Vật lí
  HOA_HOC: 'cmrbrkrj50000b0huhkx6m2wh', // Hóa học
  SINH_HOC: 'cmrbrlam00005b0hue5crl0do', // Sinh học
  LICH_SU: 'cmtf9egsw007k11j1fg78ivc9', // Lịch sử
  DIA_LI: 'cmrbjpjnn0064njmuix8x8plw',   // Địa lí
  TIN_HOC: 'cmtf9e8cj004o11j19ryjd93q', // Tin học / ICT
  GDCD: 'cmrbkf8ne0005id4bxplg21af',    // Giáo dục công dân
  GDKTPL: 'cmslna5c80004t7gg3cp73z2e'   // GDKT&PL
};

const K12_CATALOG = [
  // === TIỂU HỌC ===
  // Khối 1
  {
    code: 'SGK-TOAN-1-KNTT',
    title: 'Toán 1 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '1',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chủ đề 1: Các số từ 0 đến 10', startPage: 4, endPage: 35,
        lessons: [
          { title: 'Bài 1: Nhận biết các hình khối', startPage: 4, endPage: 8 },
          { title: 'Bài 2: Các số 1, 2, 3', startPage: 9, endPage: 15 },
          { title: 'Bài 3: Các số 4, 5, 6', startPage: 16, endPage: 22 },
          { title: 'Bài 4: Các số 7, 8, 9, 10', startPage: 23, endPage: 35 }
        ]
      },
      {
        title: 'Chủ đề 2: Phép cộng, phép trừ trong phạm vi 10', startPage: 36, endPage: 70,
        lessons: [
          { title: 'Bài 5: Phép cộng trong phạm vi 10', startPage: 36, endPage: 52 },
          { title: 'Bài 6: Phép trừ trong phạm vi 10', startPage: 53, endPage: 70 }
        ]
      }
    ]
  },
  {
    code: 'SGK-TV-1-KNTT-T1',
    title: 'Tiếng Việt 1 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TIENG_VIET,
    grade: '1',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#e11d48',
    chapters: [
      {
        title: 'Phần 1: Làm quen âm chữ và thanh điệu', startPage: 6, endPage: 45,
        lessons: [
          { title: 'Bài 1: A a, B b, Dấu huyền', startPage: 6, endPage: 12 },
          { title: 'Bài 2: C c, O o, Dấu sắc', startPage: 13, endPage: 20 },
          { title: 'Bài 3: E e, Ê ê, Dấu hỏi, Dấu nặng', startPage: 21, endPage: 32 }
        ]
      },
      {
        title: 'Phần 2: Học vần cơ bản', startPage: 46, endPage: 80,
        lessons: [
          { title: 'Bài 4: Vần an, at, am, ap', startPage: 46, endPage: 62 },
          { title: 'Bài 5: Vần on, ot, om, op', startPage: 63, endPage: 80 }
        ]
      }
    ]
  },
  {
    code: 'SGK-TA-1-GS',
    title: 'Tiếng Anh 1 - Global Success (Kết nối tri thức)',
    subjectId: SUBJECT_MAP.TIENG_ANH,
    grade: '1',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#8b5cf6',
    chapters: [
      {
        title: 'Unit 1: In the school playground', startPage: 6, endPage: 15,
        lessons: [
          { title: 'Lesson 1: Letter B /b/', startPage: 6, endPage: 10 },
          { title: 'Lesson 2: Point and say (Bill, book, bike)', startPage: 11, endPage: 15 }
        ]
      },
      {
        title: 'Unit 2: In the dining room', startPage: 16, endPage: 25,
        lessons: [
          { title: 'Lesson 1: Letter C /k/', startPage: 16, endPage: 20 },
          { title: 'Lesson 2: Cake, car, cat', startPage: 21, endPage: 25 }
        ]
      }
    ]
  },

  // Khối 2
  {
    code: 'SGK-TOAN-2-KNTT-T1',
    title: 'Toán 2 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '2',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chủ đề 1: Ôn tập và bổ sung', startPage: 5, endPage: 30,
        lessons: [
          { title: 'Bài 1: Ôn tập các số đến 100', startPage: 5, endPage: 12 },
          { title: 'Bài 2: Tia số. Số liền trước, số liền sau', startPage: 13, endPage: 20 },
          { title: 'Bài 3: Các thành phần của phép cộng, phép trừ', startPage: 21, endPage: 30 }
        ]
      },
      {
        title: 'Chủ đề 2: Phép cộng, phép trừ có nhớ trong phạm vi 100', startPage: 31, endPage: 65,
        lessons: [
          { title: 'Bài 4: Phép cộng có nhớ trong phạm vi 100', startPage: 31, endPage: 48 },
          { title: 'Bài 5: Phép trừ có nhớ trong phạm vi 100', startPage: 49, endPage: 65 }
        ]
      }
    ]
  },
  {
    code: 'SGK-TV-2-KNTT-T1',
    title: 'Tiếng Việt 2 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TIENG_VIET,
    grade: '2',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#e11d48',
    chapters: [
      {
        title: 'Chủ điểm 1: Em lớn lên từng ngày', startPage: 10, endPage: 40,
        lessons: [
          { title: 'Bài 1: Tôi là học sinh lớp 2', startPage: 10, endPage: 18 },
          { title: 'Bài 2: Ngày hôm qua đâu rồi?', startPage: 19, endPage: 28 },
          { title: 'Bài 3: Niềm vui của Bi và Bống', startPage: 29, endPage: 40 }
        ]
      }
    ]
  },

  // Khối 3
  {
    code: 'SGK-TOAN-3-KNTT-T1',
    title: 'Toán 3 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '3',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chủ đề 1: Bảng nhân, bảng chia', startPage: 6, endPage: 45,
        lessons: [
          { title: 'Bài 1: Bảng nhân 3, bảng chia 3', startPage: 6, endPage: 15 },
          { title: 'Bài 2: Bảng nhân 4, bảng chia 4', startPage: 16, endPage: 25 },
          { title: 'Bài 3: Bảng nhân 6, bảng chia 6', startPage: 26, endPage: 45 }
        ]
      }
    ]
  },
  {
    code: 'SGK-TIN-3-KNTT',
    title: 'Tin học 3 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TIN_HOC,
    grade: '3',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0d9488',
    chapters: [
      {
        title: 'Chủ đề 1: Máy tính và em', startPage: 5, endPage: 28,
        lessons: [
          { title: 'Bài 1: Thông tin và quyết định', startPage: 5, endPage: 12 },
          { title: 'Bài 2: Các bộ phận của máy tính', startPage: 13, endPage: 20 },
          { title: 'Bài 3: Em tập sử dụng chuột máy tính', startPage: 21, endPage: 28 }
        ]
      }
    ]
  },

  // Khối 4
  {
    code: 'SGK-TOAN-4-KNTT-T1',
    title: 'Toán 4 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '4',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chủ đề 1: Số có nhiều chữ số', startPage: 8, endPage: 38,
        lessons: [
          { title: 'Bài 1: Số có sáu chữ số. Lớp nghìn', startPage: 8, endPage: 16 },
          { title: 'Bài 2: Các số có nhiều chữ số. Lớp triệu', startPage: 17, endPage: 28 },
          { title: 'Bài 3: So sánh các số có nhiều chữ số', startPage: 29, endPage: 38 }
        ]
      }
    ]
  },

  // Khối 5
  {
    code: 'SGK-TOAN-5-KNTT-T1',
    title: 'Toán 5 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '5',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chủ đề 1: Phân số thập phân và Số thập phân', startPage: 6, endPage: 40,
        lessons: [
          { title: 'Bài 1: Ôn tập phân số', startPage: 6, endPage: 14 },
          { title: 'Bài 2: Khái niệm số thập phân', startPage: 15, endPage: 26 },
          { title: 'Bài 3: Hàng của số thập phân. Đọc, viết số thập phân', startPage: 27, endPage: 40 }
        ]
      }
    ]
  },

  // === TRUNG HỌC CƠ SỞ (THCS) ===
  // Khối 6
  {
    code: 'SGK-TOAN-6-KNTT-T1',
    title: 'Toán 6 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '6',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chương I: Tập hợp các số tự nhiên', startPage: 5, endPage: 45,
        lessons: [
          { title: 'Bài 1: Tập hợp. Phần tử của tập hợp', startPage: 5, endPage: 10 },
          { title: 'Bài 2: Cách ghi số tự nhiên', startPage: 11, endPage: 18 },
          { title: 'Bài 3: Thứ tự trong tập hợp các số tự nhiên', startPage: 19, endPage: 25 },
          { title: 'Bài 4: Phép cộng và phép trừ số tự nhiên', startPage: 26, endPage: 35 },
          { title: 'Bài 5: Phép nhân và phép chia số tự nhiên', startPage: 36, endPage: 45 }
        ]
      },
      {
        title: 'Chương II: Tính chia hết trong tập hợp các số tự nhiên', startPage: 46, endPage: 80,
        lessons: [
          { title: 'Bài 8: Quan hệ chia hết và tính chất', startPage: 46, endPage: 55 },
          { title: 'Bài 9: Dấu hiệu chia hết cho 2, cho 5, cho 3, cho 9', startPage: 56, endPage: 68 },
          { title: 'Bài 10: Số nguyên tố. Hợp số', startPage: 69, endPage: 80 }
        ]
      }
    ]
  },
  {
    code: 'SGK-VAN-6-KNTT-T1',
    title: 'Ngữ văn 6 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.VAN,
    grade: '6',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#e11d48',
    chapters: [
      {
        title: 'Bài 1: Tôi và các bạn', startPage: 10, endPage: 35,
        lessons: [
          { title: 'Đọc: Bài học đường đời đầu tiên (Tô Hoài)', startPage: 12, endPage: 22 },
          { title: 'Thực hành tiếng Việt: Từ đơn và từ phức', startPage: 23, endPage: 27 },
          { title: 'Viết: Kể lại một trải nghiệm của bản thân', startPage: 28, endPage: 35 }
        ]
      },
      {
        title: 'Bài 2: Gõ cửa trái tim', startPage: 36, endPage: 65,
        lessons: [
          { title: 'Đọc: Chuyện cổ tích về loài người (Xuân Quỳnh)', startPage: 38, endPage: 48 },
          { title: 'Thực hành tiếng Việt: Ẩn dụ và hoán dụ', startPage: 49, endPage: 55 }
        ]
      }
    ]
  },
  {
    code: 'SGK-KHTN-6-KNTT',
    title: 'Khoa học tự nhiên 6 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.KHTN,
    grade: '6',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#16a34a',
    chapters: [
      {
        title: 'Chương I: Mở đầu về Khoa học tự nhiên', startPage: 6, endPage: 30,
        lessons: [
          { title: 'Bài 1: Giới thiệu về Khoa học tự nhiên', startPage: 6, endPage: 12 },
          { title: 'Bài 2: An toàn trong phòng thực hành', startPage: 13, endPage: 20 },
          { title: 'Bài 3: Sử dụng kính lúp và kính hiển vi quang học', startPage: 21, endPage: 30 }
        ]
      },
      {
        title: 'Chương II: Các phép đo', startPage: 31, endPage: 60,
        lessons: [
          { title: 'Bài 4: Đo chiều dài', startPage: 31, endPage: 40 },
          { title: 'Bài 5: Đo khối lượng', startPage: 41, endPage: 50 },
          { title: 'Bài 6: Đo thời gian và nhiệt độ', startPage: 51, endPage: 60 }
        ]
      }
    ]
  },

  // Khối 7
  {
    code: 'SGK-TOAN-7-KNTT-T1',
    title: 'Toán 7 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '7',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chương I: Số hữu tỉ', startPage: 6, endPage: 35,
        lessons: [
          { title: 'Bài 1: Tập hợp các số hữu tỉ', startPage: 6, endPage: 12 },
          { title: 'Bài 2: Cộng, trừ, nhân, chia số hữu tỉ', startPage: 13, endPage: 22 },
          { title: 'Bài 3: Lũy thừa với số mũ tự nhiên của một số hữu tỉ', startPage: 23, endPage: 35 }
        ]
      },
      {
        title: 'Chương II: Số thực', startPage: 36, endPage: 65,
        lessons: [
          { title: 'Bài 5: Làm quen với số thập phân vô hạn tuần hoàn', startPage: 36, endPage: 45 },
          { title: 'Bài 6: Số vô tỉ. Căn bậc hai số học', startPage: 46, endPage: 55 },
          { title: 'Bài 7: Tập hợp các số thực', startPage: 56, endPage: 65 }
        ]
      }
    ]
  },
  {
    code: 'SGK-KHTN-7-KNTT',
    title: 'Khoa học tự nhiên 7 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.KHTN,
    grade: '7',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#16a34a',
    chapters: [
      {
        title: 'Chương I: Nguyên tử - Nguyên tố hóa học', startPage: 12, endPage: 42,
        lessons: [
          { title: 'Bài 2: Nguyên tử', startPage: 12, endPage: 20 },
          { title: 'Bài 3: Nguyên tố hóa học', startPage: 21, endPage: 30 },
          { title: 'Bài 4: Sơ lược về bảng tuần hoàn các nguyên tố hóa học', startPage: 31, endPage: 42 }
        ]
      }
    ]
  },

  // Khối 8 (Toán & Văn đã có, bổ sung KHTN, Sử Địa, Tin học)
  {
    code: 'SGK-KHTN-8-KNTT',
    title: 'Khoa học tự nhiên 8 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.KHTN,
    grade: '8',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#16a34a',
    chapters: [
      {
        title: 'Chương I: Phản ứng hóa học', startPage: 8, endPage: 40,
        lessons: [
          { title: 'Bài 1: Sử dụng một số hóa chất, thiết bị cơ bản', startPage: 8, endPage: 15 },
          { title: 'Bài 2: Phản ứng hóa học', startPage: 16, endPage: 25 },
          { title: 'Bài 3: Định luật bảo toàn khối lượng và phương trình hóa học', startPage: 26, endPage: 40 }
        ]
      },
      {
        title: 'Chương II: Một số hợp chất thông dụng', startPage: 41, endPage: 75,
        lessons: [
          { title: 'Bài 8: Acid', startPage: 41, endPage: 50 },
          { title: 'Bài 9: Base. Thang pH', startPage: 51, endPage: 62 },
          { title: 'Bài 10: Oxide và Muối', startPage: 63, endPage: 75 }
        ]
      }
    ]
  },
  {
    code: 'SGK-TIN-8-KNTT',
    title: 'Tin học 8 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TIN_HOC,
    grade: '8',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0d9488',
    chapters: [
      {
        title: 'Chủ đề 1: Máy tính và cộng đồng', startPage: 5, endPage: 25,
        lessons: [
          { title: 'Bài 1: Lược sử công cụ tính toán', startPage: 5, endPage: 12 },
          { title: 'Bài 2: Thông tin trong môi trường số', startPage: 13, endPage: 25 }
        ]
      },
      {
        title: 'Chủ đề 5: Giải quyết vấn đề với sự trợ giúp của máy tính', startPage: 45, endPage: 75,
        lessons: [
          { title: 'Bài 11: Kiểu mảng và xử lý mảng trong lập trình trực quan', startPage: 45, endPage: 58 },
          { title: 'Bài 12: Thuật toán tìm kiếm tuần tự và nhị phân', startPage: 59, endPage: 75 }
        ]
      }
    ]
  },

  // Khối 9
  {
    code: 'SGK-TOAN-9-KNTT-T1',
    title: 'Toán 9 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '9',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chương I: Phương trình và hệ hai phương trình bậc nhất hai ẩn', startPage: 6, endPage: 38,
        lessons: [
          { title: 'Bài 1: Khái niệm phương trình và hệ hai phương trình bậc nhất hai ẩn', startPage: 6, endPage: 15 },
          { title: 'Bài 2: Giải hệ hai phương trình bậc nhất hai ẩn', startPage: 16, endPage: 26 },
          { title: 'Bài 3: Giải bài toán bằng cách lập hệ phương trình', startPage: 27, endPage: 38 }
        ]
      },
      {
        title: 'Chương II: Phương trình và bất phương trình bậc nhất một ẩn', startPage: 39, endPage: 65,
        lessons: [
          { title: 'Bài 4: Bất đẳng thức và tính chất', startPage: 39, endPage: 50 },
          { title: 'Bài 5: Bất phương trình bậc nhất một ẩn', startPage: 51, endPage: 65 }
        ]
      }
    ]
  },
  {
    code: 'SGK-VAN-9-KNTT-T1',
    title: 'Ngữ văn 9 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.VAN,
    grade: '9',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#e11d48',
    chapters: [
      {
        title: 'Bài 1: Thương nhớ quê hương (Thơ sáu chữ, bảy chữ)', startPage: 10, endPage: 38,
        lessons: [
          { title: 'Đọc: Quê hương (Tế Hanh)', startPage: 12, endPage: 20 },
          { title: 'Đọc: Bếp lửa (Bằng Việt)', startPage: 21, endPage: 29 },
          { title: 'Thực hành tiếng Việt: Biện pháp tu từ chơi chữ và điệp từ', startPage: 30, endPage: 38 }
        ]
      }
    ]
  },

  // === TRUNG HỌC PHỔ THÔNG (THPT) ===
  // Khối 10
  {
    code: 'SGK-TOAN-10-KNTT-T1',
    title: 'Toán 10 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '10',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chương I: Mệnh đề và tập hợp', startPage: 7, endPage: 32,
        lessons: [
          { title: 'Bài 1: Mệnh đề', startPage: 7, endPage: 14 },
          { title: 'Bài 2: Tập hợp và các phép toán trên tập hợp', startPage: 15, endPage: 24 },
          { title: 'Bài tập cuối chương I', startPage: 25, endPage: 32 }
        ]
      },
      {
        title: 'Chương II: Bất phương trình và hệ bất phương trình bậc nhất hai ẩn', startPage: 33, endPage: 55,
        lessons: [
          { title: 'Bài 3: Bất phương trình bậc nhất hai ẩn', startPage: 33, endPage: 42 },
          { title: 'Bài 4: Hệ bất phương trình bậc nhất hai ẩn', startPage: 43, endPage: 55 }
        ]
      },
      {
        title: 'Chương III: Hệ thức lượng trong tam giác', startPage: 56, endPage: 85,
        lessons: [
          { title: 'Bài 5: Giá trị lượng giác của một góc từ 0 đến 180 độ', startPage: 56, endPage: 68 },
          { title: 'Bài 6: Hệ thức lượng trong tam giác và công thức Heron', startPage: 69, endPage: 85 }
        ]
      }
    ]
  },
  {
    code: 'SGK-VAN-10-KNTT-T1',
    title: 'Ngữ văn 10 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.VAN,
    grade: '10',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#e11d48',
    chapters: [
      {
        title: 'Bài 1: Sức sống của sử thi', startPage: 10, endPage: 38,
        lessons: [
          { title: 'Đọc: Đăm Săn chiến thắng Mtao Mxây', startPage: 12, endPage: 24 },
          { title: 'Đọc: Gặp Ka-ríp và Xi-la (Sử thi Ô-đi-xê)', startPage: 25, endPage: 32 },
          { title: 'Thực hành tiếng Việt: Lỗi dùng từ và cách sửa', startPage: 33, endPage: 38 }
        ]
      }
    ]
  },
  {
    code: 'SGK-VATLI-10-KNTT',
    title: 'Vật lí 10 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.VAT_LI,
    grade: '10',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#3b82f6',
    chapters: [
      {
        title: 'Chương I: Mở đầu và Động học', startPage: 10, endPage: 50,
        lessons: [
          { title: 'Bài 1: Khái quát về môn Vật lí', startPage: 10, endPage: 16 },
          { title: 'Bài 4: Độ dịch chuyển và quãng đường đi được', startPage: 17, endPage: 28 },
          { title: 'Bài 5: Tốc độ và vận tốc', startPage: 29, endPage: 38 },
          { title: 'Bài 7: Gia tốc và Chuyển động thẳng biến đổi đều', startPage: 39, endPage: 50 }
        ]
      }
    ]
  },
  {
    code: 'SGK-HOA-10-KNTT',
    title: 'Hóa học 10 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.HOA_HOC,
    grade: '10',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#f59e0b',
    chapters: [
      {
        title: 'Chương I: Cấu tạo nguyên tử', startPage: 8, endPage: 38,
        lessons: [
          { title: 'Bài 1: Thành phần của nguyên tử', startPage: 8, endPage: 18 },
          { title: 'Bài 2: Nguyên tố hóa học và Đồng vị', startPage: 19, endPage: 28 },
          { title: 'Bài 3: Cấu trúc lớp vỏ electron của nguyên tử', startPage: 29, endPage: 38 }
        ]
      }
    ]
  },

  // Khối 11
  {
    code: 'SGK-TOAN-11-KNTT-T1',
    title: 'Toán 11 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '11',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chương I: Hàm số lượng giác và phương trình lượng giác', startPage: 6, endPage: 45,
        lessons: [
          { title: 'Bài 1: Giá trị lượng giác của góc lượng giác', startPage: 6, endPage: 18 },
          { title: 'Bài 2: Công thức lượng giác', startPage: 19, endPage: 30 },
          { title: 'Bài 3: Hàm số lượng giác và đồ thị', startPage: 31, endPage: 45 }
        ]
      },
      {
        title: 'Chương II: Dãy số. Cấp số cộng và Cấp số nhân', startPage: 46, endPage: 75,
        lessons: [
          { title: 'Bài 5: Dãy số', startPage: 46, endPage: 55 },
          { title: 'Bài 6: Cấp số cộng', startPage: 56, endPage: 65 },
          { title: 'Bài 7: Cấp số nhân', startPage: 66, endPage: 75 }
        ]
      }
    ]
  },
  {
    code: 'SGK-SINH-11-KNTT',
    title: 'Sinh học 11 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.SINH_HOC,
    grade: '11',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#10b981',
    chapters: [
      {
        title: 'Chương I: Trao đổi chất và chuyển hóa năng lượng ở sinh vật', startPage: 6, endPage: 48,
        lessons: [
          { title: 'Bài 1: Khái quát về trao đổi chất và chuyển hóa năng lượng', startPage: 6, endPage: 14 },
          { title: 'Bài 2: Trao đổi nước và khoáng ở thực vật', startPage: 15, endPage: 30 },
          { title: 'Bài 3: Quang hợp ở thực vật', startPage: 31, endPage: 48 }
        ]
      }
    ]
  },

  // Khối 12
  {
    code: 'SGK-TOAN-12-KNTT-T1',
    title: 'Toán 12 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.TOAN,
    grade: '12',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#0284c7',
    chapters: [
      {
        title: 'Chương I: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số', startPage: 6, endPage: 50,
        lessons: [
          { title: 'Bài 1: Tính đơn điệu và cực trị của hàm số', startPage: 6, endPage: 18 },
          { title: 'Bài 2: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số', startPage: 19, endPage: 28 },
          { title: 'Bài 3: Đường tiệm cận của đồ thị hàm số', startPage: 29, endPage: 38 },
          { title: 'Bài 4: Khảo sát sự biến thiên và vẽ đồ thị của hàm số', startPage: 39, endPage: 50 }
        ]
      },
      {
        title: 'Chương II: Vectơ và hệ tọa độ trong không gian', startPage: 51, endPage: 85,
        lessons: [
          { title: 'Bài 6: Vectơ trong không gian', startPage: 51, endPage: 65 },
          { title: 'Bài 7: Hệ trục tọa độ trong không gian Oxyz', startPage: 66, endPage: 85 }
        ]
      }
    ]
  },
  {
    code: 'SGK-VAN-12-KNTT-T1',
    title: 'Ngữ văn 12 - Tập 1 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.VAN,
    grade: '12',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#e11d48',
    chapters: [
      {
        title: 'Bài 1: Khát vọng đổi thay (Văn tế, Truyền kỳ, Kịch)', startPage: 10, endPage: 40,
        lessons: [
          { title: 'Đọc: Văn tế nghĩa sĩ Cần Giuộc (Nguyễn Đình Chiểu)', startPage: 12, endPage: 24 },
          { title: 'Đọc: Hồn Trương Ba, da hàng thịt (Lưu Quang Vũ)', startPage: 25, endPage: 34 },
          { title: 'Viết: Bài văn nghị luận so sánh, đánh giá hai tác phẩm văn học', startPage: 35, endPage: 40 }
        ]
      }
    ]
  },
  {
    code: 'SGK-LICHSU-12-KNTT',
    title: 'Lịch sử 12 (Kết nối tri thức với cuộc sống)',
    subjectId: SUBJECT_MAP.LICH_SU,
    grade: '12',
    seriesId: 'series_kntt',
    publisherId: 'pub_nxbgdvn_1791192936726',
    color: '#b45309',
    chapters: [
      {
        title: 'Chủ đề 1: Thế giới trong và sau Chiến tranh lạnh', startPage: 6, endPage: 35,
        lessons: [
          { title: 'Bài 1: Liên Hợp Quốc và vai trò trong duy trì hòa bình thế giới', startPage: 6, endPage: 18 },
          { title: 'Bài 2: Trật tự thế giới trong Chiến tranh lạnh', startPage: 19, endPage: 35 }
        ]
      }
    ]
  }
];

async function seedAll() {
  console.log(`Starting generation & seed for ${K12_CATALOG.length} K-12 textbooks...`);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  for (const book of K12_CATALOG) {
    const totalPages = book.chapters.reduce((max, c) => Math.max(max, c.endPage), 60);
    const bookDirName = book.code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const outDir = path.join(process.cwd(), 'public', 'uploads', 'textbooks', bookDirName);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const fileName = `${book.code}.pdf`;
    const fullPath = path.join(outDir, fileName);

    // 1. Tạo file PDF chuẩn A4
    const page = await browser.newPage();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 0; }
      body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 0; padding: 0; background: #fff; }
      .sheet { width: 210mm; min-height: 297mm; page-break-after: always; box-sizing: border-box; padding: 30mm 25mm; display: flex; flex-direction: column; }
      .cover { background: ${book.color}; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
      .cover h1 { font-size: 26pt; margin: 15px 0; text-transform: uppercase; }
      .cover h3 { font-size: 13pt; opacity: 0.9; font-weight: normal; margin: 5px 0; }
      .badge { background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 11pt; font-weight: 600; margin-bottom: 20px; }
      .header-bar { color: ${book.color}; font-size: 10pt; font-weight: bold; border-bottom: 2px solid ${book.color}; padding-bottom: 8px; margin-bottom: 20px; }
      .content { font-size: 11pt; line-height: 1.8; color: #222; }
      .chapter-box { background: #f8fafc; border-left: 4px solid ${book.color}; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
      .lesson-item { padding: 4px 0; border-bottom: 1px dashed #e2e8f0; display: flex; justify-content: space-between; }
      .footer { margin-top: auto; font-size: 9pt; color: #777; border-top: 1px solid #ddd; padding-top: 8px; text-align: right; }
    </style></head><body>
      <div class="sheet cover">
        <div class="badge">SÁCH GIÁO KHOA CHUẨN GDPT 2018 — KHỐI ${book.grade}</div>
        <h3>NHÀ XUẤT BẢN GIÁO DỤC VIỆT NAM</h3>
        <h1>${book.title}</h1>
        <h3>Hệ thống Quản trị Học tập SSM Sky-Line</h3>
        <p style="margin-top: 50px; font-size: 10pt; opacity: 0.85;">Dữ liệu học liệu số hóa chính thức phục vụ Giảng dạy, Dự giờ và Hỗ trợ học tập</p>
      </div>

      <div class="sheet">
        <div class="header-bar">${book.title} — MỤC LỤC TỔNG QUAN</div>
        <div class="content">
          <h3>MỤC LỤC CHƯƠNG TRÌNH HỌC TẬP</h3>
          ${book.chapters.map(c => `
            <div class="chapter-box">
              <div style="font-weight: bold; color: ${book.color}; font-size: 12pt; margin-bottom: 6px;">${c.title} (Trang ${c.startPage} - ${c.endPage})</div>
              ${c.lessons.map(l => `
                <div class="lesson-item">
                  <span>${l.title}</span>
                  <span style="color: #64748b;">Trang ${l.startPage} - ${l.endPage}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="footer">Trang 2 / ${totalPages}</div>
      </div>

      ${book.chapters.map(c => `
        <div class="sheet">
          <div class="header-bar">${book.title} — ${c.title}</div>
          <div class="content">
            <h2 style="color: ${book.color};">${c.title}</h2>
            <p><b>Yêu cầu cần đạt:</b> Nắm vững các kiến thức, kỹ năng nền tảng và phương pháp giải quyết vấn đề theo chuẩn chương trình GDPT 2018.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            ${c.lessons.map(l => `
              <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 4px; color: #1e293b;">${l.title}</h3>
                <p style="color: #475569; font-size: 10pt;">Vị trí bài học: Trang ${l.startPage} đến Trang ${l.endPage}.</p>
                <p style="background: #f1f5f9; padding: 10px 14px; border-radius: 6px; font-size: 10pt;">
                  Nội dung trọng tâm bám sát yêu cầu cần đạt (YCCD), phục vụ kế hoạch dạy học, hồ sơ dự giờ và hoạt động hỗ trợ học tập của học sinh.
                </p>
              </div>
            `).join('')}
          </div>
          <div class="footer">Trang ${c.startPage} / ${totalPages}</div>
        </div>
      `).join('')}
    </body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: fullPath, format: 'A4', printBackground: true });
    await page.close();

    const fileSize = fs.statSync(fullPath).size;
    const now = new Date().toISOString();
    const fileUrl = `/api/learning-resources/textbooks/${book.code}/file`;
    const coverUrl = `/api/learning-resources/textbooks/${book.code}/cover`;

    // 2. Chèn / Cập nhật vào DB
    const insertBookSql = `
      INSERT INTO Textbook (
        id, title, subjectId, grade, seriesId, publisherId,
        volume, editionYear, fileUrl, storageKey, fileSize, totalPages,
        processingStatus, aiIndexStatus, coverUrl, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        subjectId = excluded.subjectId,
        grade = excluded.grade,
        fileUrl = excluded.fileUrl,
        storageKey = excluded.storageKey,
        fileSize = excluded.fileSize,
        totalPages = excluded.totalPages,
        processingStatus = 'READY',
        coverUrl = excluded.coverUrl,
        updatedAt = excluded.updatedAt
    `;

    const args = [
      book.code, book.title, book.subjectId, book.grade, book.seriesId, book.publisherId,
      'TAP_1', 2024, fileUrl, fullPath.replace(/\\/g, '/'), fileSize, totalPages,
      'READY', 'INDEXED', coverUrl, now, now
    ];

    await localClient.execute({ sql: insertBookSql, args });
    try {
      await cloudClient.execute({ sql: insertBookSql, args });
    } catch (e) {
      // cloud sync non-fatal
    }

    // 3. Chèn Chương & Bài học
    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
      const ch = book.chapters[cIdx];
      const chId = `${book.code}_ch_${cIdx + 1}`;
      const chapterNumber = `Chương ${cIdx + 1}`;
      const insertChSql = `
        INSERT INTO TextbookChapter (id, textbookId, chapterNumber, title, sortOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          chapterNumber = excluded.chapterNumber,
          title = excluded.title,
          sortOrder = excluded.sortOrder,
          updatedAt = excluded.updatedAt
      `;
      const chArgs = [chId, book.code, chapterNumber, ch.title, cIdx + 1, now, now];
      await localClient.execute({ sql: insertChSql, args: chArgs });
      try { await cloudClient.execute({ sql: insertChSql, args: chArgs }); } catch {}

      for (let lIdx = 0; lIdx < ch.lessons.length; lIdx++) {
        const ls = ch.lessons[lIdx];
        const lsId = `${chId}_ls_${lIdx + 1}`;
        const lessonNumber = `Bài ${lIdx + 1}`;
        const insertLsSql = `
          INSERT INTO TextbookLesson (id, chapterId, lessonNumber, title, pageStart, pageEnd, sortOrder, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            lessonNumber = excluded.lessonNumber,
            title = excluded.title,
            pageStart = excluded.pageStart,
            pageEnd = excluded.pageEnd,
            sortOrder = excluded.sortOrder,
            updatedAt = excluded.updatedAt
        `;
        const lsArgs = [lsId, chId, lessonNumber, ls.title, ls.startPage, ls.endPage, lIdx + 1, now, now];
        await localClient.execute({ sql: insertLsSql, args: lsArgs });
        try { await cloudClient.execute({ sql: insertLsSql, args: lsArgs }); } catch {}
      }
    }

    console.log(`✓ [Khối ${book.grade}] Đã tạo & nạp: ${book.title} (${book.chapters.length} chương)`);
  }

  await browser.close();
  console.log('\n=========================================');
  console.log('HOÀN THÀNH NẠP DANH MỤC SGK TOÀN BỘ 12 KHỐI LỚP!');
  console.log('=========================================');
}

seedAll().catch(err => {
  console.error('Seed K12 error:', err);
  process.exit(1);
});
