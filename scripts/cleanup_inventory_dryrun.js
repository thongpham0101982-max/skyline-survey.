/**
 * Safe Dry-Run Inventory Script for Generated Files, Caches, Temp Files, and Exports
 * Default mode: --dry-run (chế độ chỉ liệt kê). Never deletes business records or PII.
 */
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function getDirStats(dirPath, filterFn = null) {
  let fileCount = 0;
  let totalBytes = 0;
  if (!fs.existsSync(dirPath)) return { exists: false, fileCount: 0, totalBytes: 0 };

  function walk(curr) {
    let entries = [];
    try {
      entries = fs.readdirSync(curr, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(curr, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        if (filterFn && !filterFn(entry.name, full)) continue;
        try {
          const st = fs.statSync(full);
          fileCount++;
          totalBytes += st.size;
        } catch {}
      }
    }
  }

  walk(dirPath);
  return { exists: true, fileCount, totalBytes };
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function runInventory() {
  const categories = [
    {
      id: "NEXT_BUILD_CACHE",
      label: "Thư mục build & cache Next.js (.next)",
      owner: "Next.js Build System",
      retentionPolicy: "Tái tạo tự động khi chạy npm run build / dev",
      safeToClean: true,
      stats: getDirStats(path.join(ROOT, ".next"))
    },
    {
      id: "TSBUILDINFO_AND_LOGS",
      label: "Tệp cache biên dịch TypeScript & log phát sinh (*.tsbuildinfo, *.log)",
      owner: "TypeScript / Node Runtime",
      retentionPolicy: "Tái tạo tự động; xóa log tạm quá 7 ngày",
      safeToClean: true,
      stats: getDirStats(ROOT, (name, full) => {
        if (full.includes("node_modules") || full.includes(".next") || full.includes(".git")) return false;
        return name.endsWith(".tsbuildinfo") || name.endsWith(".log") || name.startsWith("build_output");
      })
    },
    {
      id: "EXPIRED_PDF_EXPORTS",
      label: "Tệp PDF xuất tạm trong public/exports/pdf",
      owner: "Export PDF Service (/api/admin/export-pdf)",
      retentionPolicy: "Lưu tạm 24 giờ phục vụ tải xuống, tự động dọn sau 24 giờ",
      safeToClean: true,
      stats: getDirStats(path.join(ROOT, "public", "exports", "pdf"))
    },
    {
      id: "REDUNDANT_DB_BACKUPS_TMP",
      label: "Tệp sao lưu tạm (.tmp_*) hoặc bản .db thô đã có bản nén .db.gz trong data-backups",
      owner: "Backup Service (scripts/backup-db.js)",
      retentionPolicy: "Giữ bản nén .db.gz và _meta.json theo chính sách 30 ngày; chỉ dọn tệp .tmp_*",
      safeToClean: true,
      stats: getDirStats(path.join(ROOT, "data-backups"), (name, full) => {
        if (name.startsWith(".tmp_")) return true;
        if (name.startsWith("skyline_backup_") && name.endsWith(".db")) {
          return fs.existsSync(`${full}.gz`);
        }
        return false;
      })
    },
    {
      id: "PROTECTED_STUDENT_PHOTOS",
      label: "Ảnh hồ sơ học sinh (public/uploads/students & data-backups/student_photos_vault)",
      owner: "Student Profile & Photo Portal",
      retentionPolicy: "BẢO TOÀN VĨNH VIỄN theo hồ sơ học sinh (Cấm xóa tự động)",
      safeToClean: false,
      stats: getDirStats(path.join(ROOT, "public", "uploads", "students"))
    }
  ];

  const summary = {
    mode: "DRY_RUN_LIST_ONLY",
    generatedAt: new Date().toISOString(),
    piiIncluded: false,
    categories: categories.map((c) => ({
      id: c.id,
      label: c.label,
      owner: c.owner,
      retentionPolicy: c.retentionPolicy,
      safeToClean: c.safeToClean,
      fileCount: c.stats.fileCount,
      sizeBytes: c.stats.totalBytes,
      sizeFormatted: formatMB(c.stats.totalBytes)
    }))
  };

  console.log(JSON.stringify(summary, null, 2));
}

runInventory();
