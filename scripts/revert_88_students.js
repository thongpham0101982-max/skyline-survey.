const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
require('dotenv').config();

async function revert88Students(dryRun = true) {
  const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
  const libsql = createClient({
    url: tursoUrl.replace(/^libsql:\/\//, 'https://'),
    authToken: tursoToken,
  });
  const prisma = new PrismaClient({ adapter: new PrismaLibSQL(libsql) });

  console.log(`=== ${dryRun ? 'DRY-RUN' : 'THỰC HIỆN'} HOÀN TRẢ 88 HỌC SINH VỀ LỚP BAN ĐẦU ===`);

  const configs = [
    {
      name: '1S_CS4',
      currentClassId: 'cmrekxr2h004bhy95jirm4pdt',
      originalClassId: 'cmnoeo4p0004p3gfge0wg2fbs',
      expectedCount: 26,
      filter: (s) => s.id.startsWith('cmsmqq') || s.id.startsWith('cmsmqr')
    },
    {
      name: '8.1_CS1',
      currentClassId: 'cmrekxo6s0037hy95jhbldyrp',
      originalClassId: 'cmnoeo3c5000z3gfg2vct9yu3',
      expectedCount: 23,
      filter: (s) => s.id.startsWith('cmt18k')
    },
    {
      name: '8.2_CS1',
      currentClassId: 'cmrekxobr0039hy9503lkjoc7',
      originalClassId: 'cmnoeo3cn00113gfg58kssqgr',
      expectedCount: 18,
      filter: (s) => s.id.startsWith('cmt18k') || s.studentCode === '2503775384'
    },
    {
      name: '8.3_CS1',
      currentClassId: 'cmrekxogq003bhy95tabvqr4k',
      originalClassId: 'cmnoeo3da00133gfgy67pe034',
      expectedCount: 21,
      filter: (s) => s.id.startsWith('cmt18l')
    }
  ];

  let grandTotal = 0;
  const revertList = [];

  for (const cfg of configs) {
    const students = await prisma.student.findMany({
      where: {
        classId: cfg.currentClassId,
        academicYearId: 'cmnseevbh0000wjbmoigji2zd'
      },
      select: { id: true, studentCode: true, studentName: true }
    });

    const matched = students.filter(cfg.filter);
    console.log(`\n[Lớp ${cfg.name}] Tìm thấy: ${matched.length}/${cfg.expectedCount} học sinh cần hoàn trả.`);

    if (matched.length !== cfg.expectedCount) {
      console.error(`CẢNH BÁO: Số lượng không khớp với kỳ vọng ${cfg.expectedCount}!`);
    }

    grandTotal += matched.length;
    revertList.push({ cfg, matched });
  }

  console.log(`\nTổng số học sinh được xác định để hoàn trả: ${grandTotal}/88.`);

  if (grandTotal !== 88) {
    console.error("LỖI: Tổng số học sinh không bằng 88. Dừng thao tác!");
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log("\n[DRY-RUN THÀNH CÔNG] Dữ liệu khớp 100%. Sẵn sàng thực thi.");
    await prisma.$disconnect();
    return;
  }

  // Thực thi cập nhật
  let updatedCount = 0;
  for (const item of revertList) {
    const ids = item.matched.map(s => s.id);
    const res = await prisma.student.updateMany({
      where: { id: { in: ids } },
      data: { classId: item.cfg.originalClassId }
    });
    console.log(`Đã hoàn trả ${res.count} học sinh lớp ${item.cfg.name} về ${item.cfg.originalClassId}`);
    updatedCount += res.count;
  }

  console.log(`\n=== HOÀN TẤT: Đã hoàn trả thành công ${updatedCount}/88 học sinh về đúng trạng thái ban đầu! ===`);

  await prisma.$disconnect();
}

const isExecute = process.argv.includes('--execute');
revert88Students(!isExecute).catch(console.error);
