const fs = require('fs');
const path = require('path');

function getPreparedCkdvData() {
  const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  const campusOrder = { 'CS1': 1, 'CS2': 2, 'CS3': 3, 'CS4': 4, 'CS5': 5 };
  ckdv.sort((a, b) => (campusOrder[a.campus] || 9) - (campusOrder[b.campus] || 9));

  const ckdvByCampus = {};

  ckdv.forEach(st => {
    const cmp = st.campus || 'CS1';
    if (!ckdvByCampus[cmp]) ckdvByCampus[cmp] = [];

    const gradeNum = parseInt(st.grade, 10);
    const isElem = gradeNum <= 5;
    const comms = Array.isArray(st.committedSubjects) ? st.committedSubjects : [st.committedSubjects];

    // Filter valid subjects: only real committed subjects (Toán, Tiếng Việt, Ngữ Văn, Tiếng Anh, Tâm lý)
    // "Chung / Theo dõi thì cần làm rõ, môn Cam kết, còn không thì ko hiện thị"
    let subjects = comms
      .map(s => s.trim())
      .filter(s => s && !s.toLowerCase().includes('chung') && !s.toLowerCase().includes('theo dõi'));

    if (subjects.length === 0 && st.isPsychology) {
      subjects = ['Tâm lý'];
    }

    if (subjects.length === 0) {
      // Không có môn cam kết cụ thể -> không hiển thị trong bảng
      return;
    }

    const rows = [];

    subjects.forEach(sub => {
      let ksdv = null;
      let ksdn = null;
      let ksdvStr = '—';
      let ksdnStr = '—';
      let diff = null;
      let isProgress = false;
      let progressText = '—';
      let progressBadgeClass = 'badge-dim';
      let isBenchmark = false;
      let benchmarkText = '—';
      let benchmarkBadgeClass = 'badge-dim';
      let isEvaluated = false;

      const subLower = sub.toLowerCase();

      if (subLower.includes('toán')) {
        ksdv = st.ksdvMath;
        ksdn = st.ksdnMath;
        if (ksdv != null) {
          ksdvStr = `${ksdv}`;
        } else {
          ksdvStr = 'Chưa có điểm';
        }
        if (ksdn != null) ksdnStr = `${ksdn}`;
        else ksdnStr = gradeNum === 1 ? 'Chưa thi (Khối 1)' : 'Chưa thi';
      } else if (subLower.includes('tiếng việt')) {
        ksdv = st.ksdvViet;
        ksdn = st.ksdnViet;
        if (ksdv != null) ksdvStr = `${ksdv}`;
        else ksdvStr = 'Chưa có điểm';
        if (ksdn != null) ksdnStr = `${ksdn}`;
        else ksdnStr = gradeNum === 1 ? 'Chưa thi (Khối 1)' : 'Chưa thi';
      } else if (subLower.includes('văn')) {
        ksdv = st.ksdvVan;
        ksdn = st.ksdnVan;
        if (ksdv != null) ksdvStr = `${ksdv}`;
        else ksdvStr = 'Chưa có điểm';
        if (ksdn != null) ksdnStr = `${ksdn}`;
        else ksdnStr = gradeNum === 1 ? 'Chưa thi (Khối 1)' : 'Chưa thi';
      } else if (subLower.includes('anh')) {
        ksdv = st.ksdvEngScale10;
        ksdn = st.ksdnEng;
        if (ksdv != null) ksdvStr = `${ksdv % 1 === 0 ? ksdv : ksdv.toFixed(1)}`;
        else ksdvStr = 'Chưa có điểm';
        if (ksdn != null) ksdnStr = `${ksdn}`;
        else ksdnStr = gradeNum === 1 ? 'Chưa thi (Khối 1)' : 'Chưa thi';
      } else if (subLower.includes('tâm lý')) {
        ksdvStr = 'Theo dõi tâm lý';
        if (st.ksdnMath != null || st.ksdnVan != null || st.ksdnEng != null) {
          const parts = [];
          if (st.ksdnMath != null) parts.push(`Toán: ${st.ksdnMath}`);
          if (st.ksdnVan != null) parts.push(`Văn: ${st.ksdnVan}`);
          if (st.ksdnEng != null) parts.push(`Anh: ${st.ksdnEng}`);
          ksdnStr = parts.join('; ');
          progressText = 'Theo dõi tốt';
          progressBadgeClass = 'badge-success';
          benchmarkText = 'Đạt chuẩn';
          benchmarkBadgeClass = 'badge-success';
          isBenchmark = true;
          isProgress = true;
          isEvaluated = true;
        } else {
          ksdnStr = gradeNum === 1 ? 'Chưa có bài KSĐN (Khối 1)' : 'Theo dõi tâm lý';
          progressText = 'Theo dõi tâm lý';
          progressBadgeClass = 'badge-psychology';
          benchmarkText = 'Theo dõi tâm lý';
          benchmarkBadgeClass = 'badge-psychology';
        }
      } else {
        ksdvStr = 'Theo dõi chung';
        ksdnStr = '—';
      }

      // Logic Đánh giá Tiến bộ & Đạt chuẩn cho các môn văn hóa
      if (ksdn != null && ksdv != null) {
        isEvaluated = true;
        diff = +(ksdn - ksdv).toFixed(1);
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;

        if (isElem) {
          // BẬC TIỂU HỌC:
          // "Với Tiểu học: Điểm KSĐN phải Đạt 5.0 mới tính là Tiến bộ, Nhưng không đạt chuẩn"
          if (ksdn >= 7.0) {
            // Đạt chuẩn Tiểu học
            isBenchmark = true;
            benchmarkText = 'Đạt chuẩn';
            benchmarkBadgeClass = 'badge-success';

            if (diff > 0) {
              isProgress = true;
              progressText = diff >= 3.0 ? `Bứt phá (${diffStr})` : `Tiến bộ (${diffStr})`;
              progressBadgeClass = 'badge-success';
            } else if (diff === 0) {
              progressText = 'Duy trì tốt';
              progressBadgeClass = 'badge-success';
            } else {
              progressText = `Không tăng (${diffStr})`;
              progressBadgeClass = 'badge-warning';
            }
          } else if (ksdn >= 5.0) {
            // Đạt từ 5.0 - 6.9: Trung bình (Không đạt chuẩn Tiểu học)
            benchmarkText = 'Trung bình';
            benchmarkBadgeClass = 'badge-warning';

            if (diff > 0) {
              // Điểm KSĐN đạt >= 5.0 và có tăng: Tính là TIẾN BỘ!
              isProgress = true;
              progressText = `Tiến bộ (${diffStr})`;
              progressBadgeClass = 'badge-growth';
            } else {
              progressText = `Không tăng (${diffStr})`;
              progressBadgeClass = 'badge-warning';
            }
          } else {
            // Dưới 5.0: Dù có tăng hay không, KHÔNG TÍNH LÀ TIẾN BỘ!
            benchmarkText = 'Dưới TB';
            benchmarkBadgeClass = 'badge-danger';
            progressText = diff > 0 ? `Chưa tiến bộ (${diffStr})` : `Chưa tiến bộ`;
            progressBadgeClass = 'badge-danger';
          }
        } else {
          // BẬC TRUNG HỌC (THCS & THPT):
          if (ksdn >= 5.0) {
            isBenchmark = true;
            benchmarkText = 'Đạt chuẩn';
            benchmarkBadgeClass = 'badge-success';

            if (diff > 0) {
              isProgress = true;
              progressText = diff >= 3.0 ? `Bứt phá (${diffStr})` : `Tiến bộ (${diffStr})`;
              progressBadgeClass = 'badge-success';
            } else if (diff === 0) {
              progressText = 'Duy trì tốt';
              progressBadgeClass = 'badge-success';
            } else {
              progressText = `Không tăng (${diffStr})`;
              progressBadgeClass = 'badge-warning';
            }
          } else {
            benchmarkText = 'Dưới TB';
            benchmarkBadgeClass = 'badge-danger';
            if (diff > 0) {
              // THCS/THPT nếu tăng điểm nhưng < 5.0: có nỗ lực tăng nhưng chưa đạt chuẩn
              progressText = `Tăng nhẹ (${diffStr})`;
              progressBadgeClass = 'badge-warning';
            } else {
              progressText = `Chưa tiến bộ`;
              progressBadgeClass = 'badge-danger';
            }
          }
        }
      } else if (ksdn != null && ksdv == null) {
        // Chưa có điểm KSĐV nhưng đã có điểm KSĐN
        if (st.missingReason && st.missingReason.includes('Tuyển thẳng')) {
          benchmarkText = 'Đạt chuẩn';
          benchmarkBadgeClass = 'badge-success';
          progressText = 'Tuyển thẳng';
          progressBadgeClass = 'badge-warning';
          isBenchmark = true;
        } else {
          if (isElem) {
            benchmarkText = ksdn >= 7.0 ? 'Đạt chuẩn' : (ksdn >= 5.0 ? 'Trung bình' : 'Dưới TB');
          } else {
            benchmarkText = ksdn >= 5.0 ? 'Đạt chuẩn' : 'Dưới TB';
          }
          benchmarkBadgeClass = benchmarkText === 'Đạt chuẩn' ? 'badge-success' : (benchmarkText === 'Trung bình' ? 'badge-warning' : 'badge-danger');
          progressText = 'Chưa có KSĐV';
          progressBadgeClass = 'badge-dim';
        }
      } else if (ksdn == null && !subLower.includes('tâm lý')) {
        if (gradeNum === 1) {
          benchmarkText = 'Chưa KSĐN (Khối 1)';
          progressText = 'Khối 1';
        } else {
          benchmarkText = 'Chưa có bài KSĐN';
          progressText = 'Chưa thi KSĐN';
        }
        benchmarkBadgeClass = 'badge-dim';
        progressBadgeClass = 'badge-dim';
      }

      rows.push({
        subjectName: sub,
        ksdvScore: ksdv,
        ksdnScore: ksdn,
        ksdvStr,
        ksdnStr,
        diff,
        isEvaluated,
        isProgress,
        progressText,
        progressBadgeClass,
        isBenchmark,
        benchmarkText,
        benchmarkBadgeClass
      });
    });

    ckdvByCampus[cmp].push({
      ...st,
      subjectRows: rows
    });
  });

  return ckdvByCampus;
}

// Function to compute summary statistics for each campus
function computeCampusSummary(students) {
  const subCounts = {
    'Tiếng Anh': 0,
    'Toán': 0,
    'Tiếng Việt': 0,
    'Ngữ Văn': 0,
    'Tâm lý': 0
  };

  let totalStudents = students.length;
  let totalSubjectRows = 0;
  let totalEvaluated = 0;
  let totalProgress = 0;
  let totalBenchmark = 0;
  let totalAverage = 0;
  let totalBelowAvg = 0;

  students.forEach(st => {
    st.subjectRows.forEach(r => {
      totalSubjectRows++;
      const s = r.subjectName.toLowerCase();
      if (s.includes('anh')) subCounts['Tiếng Anh']++;
      else if (s.includes('toán')) subCounts['Toán']++;
      else if (s.includes('tiếng việt')) subCounts['Tiếng Việt']++;
      else if (s.includes('văn')) subCounts['Ngữ Văn']++;
      else if (s.includes('tâm lý')) subCounts['Tâm lý']++;

      if (r.isEvaluated) {
        totalEvaluated++;
        if (r.isProgress) totalProgress++;
        if (r.isBenchmark) totalBenchmark++;
        if (r.benchmarkText === 'Trung bình') totalAverage++;
        if (r.benchmarkText === 'Dưới TB') totalBelowAvg++;
      }
    });
  });

  const progressRate = totalEvaluated > 0 ? ((totalProgress / totalEvaluated) * 100).toFixed(1) + '%' : '0.0%';
  const benchmarkRate = totalEvaluated > 0 ? ((totalBenchmark / totalEvaluated) * 100).toFixed(1) + '%' : '0.0%';

  return {
    totalStudents,
    totalSubjectRows,
    subCounts,
    totalEvaluated,
    totalProgress,
    progressRate,
    totalBenchmark,
    benchmarkRate,
    totalAverage,
    totalBelowAvg
  };
}

module.exports = {
  getPreparedCkdvData,
  computeCampusSummary
};
