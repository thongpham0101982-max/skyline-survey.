const fs = require('fs');
const path = require('path');

const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_76_deep_entrance_audit.json'), 'utf8'));

audit.forEach((s, idx) => {
  s.records.forEach(r => {
    const hasEng = r.sasScores['TAv'] || r.sasScores['TAvd'] || r.sasScores['EPT'] || r.directScores.engW != null || r.directScores.engO != null;
    if (hasEng) {
      console.log(`STT ${idx+1} [${s.campus}] ${s.name} (Lớp ${s.className}, Khối ${s.grade}):`);
      console.log('   Direct:', { engW: r.directScores.engW, engO: r.directScores.engO });
      console.log('   SAS:', { TAv: r.sasScores['TAv']?.val, TAvd: r.sasScores['TAvd']?.val, EPT: r.sasScores['EPT']?.val });
    }
  });
});
