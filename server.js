const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Detect mode: default to PRODUCTION for high performance and stability
const hasBuild = fs.existsSync(path.resolve(__dirname, '.next/BUILD_ID'));
const isDev = process.env.NODE_ENV === 'development';
if (!isDev && !hasBuild) {
  console.warn('[Skyline Server] .next/BUILD_ID đang được cập nhật bởi next build. Đợi 3 giây để khởi động lại...');
  setTimeout(() => process.exit(1), 3000);
}

process.on('uncaughtException', (err) => {
  console.error('[Skyline Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Skyline Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

// =========================================================================
// BỘ ĐỆM CHUNK DỰ PHÒNG (ZERO-DOWNTIME CHUNK CACHE)
// Giữ lại các chunk tĩnh (.js/.css) của phiên bản trước trong .next-chunk-cache
// để tránh lỗi ChunkLoadError khi trình duyệt đang mở tab cũ hoặc trong lúc đang build
// =========================================================================
const CHUNK_CACHE_DIR = path.join(__dirname, '.next-chunk-cache', 'static', 'chunks');
const NEXT_CHUNKS_DIR = path.join(__dirname, '.next', 'static', 'chunks');

function syncChunksWithArchive() {
  try {
    fs.mkdirSync(CHUNK_CACHE_DIR, { recursive: true });

    const now = Date.now();
    const maxAgeMs = 24 * 60 * 60 * 1000; // Giữ chunk trong 24 giờ

    // 1. Sao lưu các chunk hiện tại từ .next/static/chunks sang .next-chunk-cache/static/chunks
    if (fs.existsSync(NEXT_CHUNKS_DIR)) {
      for (const file of fs.readdirSync(NEXT_CHUNKS_DIR)) {
        const src = path.join(NEXT_CHUNKS_DIR, file);
        const dest = path.join(CHUNK_CACHE_DIR, file);
        try {
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
          }
        } catch (_) {}
      }
    }

    // 2. Dọn chunk quá hạn trong .next-chunk-cache (không ghi ngược vào .next để tránh khóa thư mục trên Windows khi next build)
    if (fs.existsSync(CHUNK_CACHE_DIR)) {
      for (const file of fs.readdirSync(CHUNK_CACHE_DIR)) {
        const archiveFile = path.join(CHUNK_CACHE_DIR, file);
        try {
          const stat = fs.statSync(archiveFile);
          if (!stat.isFile()) continue;
          if (now - stat.mtimeMs > maxAgeMs) {
            fs.unlinkSync(archiveFile);
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[Skyline Server] Cảnh báo đồng bộ chunk cache:', err.message);
  }
}

syncChunksWithArchive();

console.log(`[Skyline Server] Starting in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode on ${hostname}:${port}...`);

const app = next({ dev: isDev, hostname, port, dir: path.resolve(__dirname) });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  syncChunksWithArchive();

  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const pathname = parsedUrl.pathname || '/';

      // Fallback phục vụ chunk từ .next-chunk-cache nếu đang trong quá trình build lại
      if (pathname.startsWith('/_next/static/chunks/')) {
        const chunkFileName = decodeURIComponent(path.basename(pathname));
        const liveChunkPath = path.join(NEXT_CHUNKS_DIR, chunkFileName);
        const archiveChunkPath = path.join(CHUNK_CACHE_DIR, chunkFileName);

        if (!fs.existsSync(liveChunkPath) && fs.existsSync(archiveChunkPath)) {
          const ext = path.extname(chunkFileName).toLowerCase();
          const contentType =
            ext === '.css'
              ? 'text/css; charset=utf-8'
              : ext === '.js'
                ? 'application/javascript; charset=utf-8'
                : 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600',
          });
          fs.createReadStream(archiveChunkPath).pipe(res);
          return;
        }
      }

      // Chống cache HTML & RSC payload trên Trình duyệt / Cloudflare / Proxy cho mọi trang động
      const isImmutableStatic =
        pathname.startsWith('/_next/static/') ||
        pathname.startsWith('/images/') ||
        pathname.startsWith('/icons/') ||
        pathname.startsWith('/uploads/') ||
        pathname.startsWith('/fonts/');

      if (!isImmutableStatic) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('CDN-Cache-Control', 'no-store');
        res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
        res.setHeader('Surrogate-Control', 'no-store');
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  })
  .once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  })
  .listen(port, hostname, () => {
    console.log(`[Skyline Server] Running 24/7 at http://localhost:${port} and http://192.168.10.239:${port}`);
    
    // =========================================================================
    // TỰ ĐỘNG TÁI KHỞI ĐỘNG KHI CÓ BẢN BUILD MỚI (CHỐNG VỠ GIAO DIỆN / MẤT CSS)
    // =========================================================================
    const buildIdFile = path.join(__dirname, '.next', 'BUILD_ID');
    const prerenderManifestFile = path.join(__dirname, '.next', 'prerender-manifest.json');
    let currentBuildId = fs.existsSync(buildIdFile) ? fs.readFileSync(buildIdFile, 'utf8').trim() : null;
    let isRestarting = false;
    setInterval(() => {
      try {
        if (fs.existsSync(buildIdFile) && fs.existsSync(prerenderManifestFile)) {
          const newBuildId = fs.readFileSync(buildIdFile, 'utf8').trim();
          if (newBuildId && newBuildId !== currentBuildId && !isRestarting) {
            isRestarting = true;
            console.log(`[Skyline Server] Phát hiện bản build mới (${newBuildId} != ${currentBuildId}).`);
            console.log('[Skyline Server] Đợi 1.5s cho tiến trình build hoàn tất ghi file rồi tự động nạp lại...');
            
            setTimeout(() => {
              syncChunksWithArchive();
              if (process.env.pm_id !== undefined) {
                process.exit(0);
              } else {
                const { spawn } = require('child_process');
                const child = spawn(process.argv[0], process.argv.slice(1), {
                  detached: true,
                  stdio: 'ignore',
                  cwd: __dirname
                });
                child.unref();
                process.exit(0);
              }
            }, 1500);
          }
        }
      } catch (watchErr) {
        console.error('[Skyline Server] Lỗi kiểm tra cập nhật BUILD_ID:', watchErr);
      }
    }, 2000);
    
    // =========================================================================
    // GIÁM SÁT HỆ THỐNG SAO LƯU DỮ LIỆU ĐỊNH KỲ (PASSIVE WATCHDOG)
    // =========================================================================
    const lockFilePath = path.join(__dirname, 'data-backups', '.last_backup_date');
    let lastLoggedFridayDate = '';

    setInterval(() => {
      try {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 5 = Thứ Sáu (Friday)
        const hour = now.getHours();     // 23 = 23h00

        if (dayOfWeek === 5 && hour === 23) {
          const todayStr = now.toISOString().split('T')[0];
          if (lastLoggedFridayDate !== todayStr) {
            lastLoggedFridayDate = todayStr;
            let hasBackupToday = false;
            if (fs.existsSync(lockFilePath)) {
              const lastDate = fs.readFileSync(lockFilePath, 'utf8').trim();
              if (lastDate === todayStr) hasBackupToday = true;
            }
            console.log(`[Backup Watchdog] Thứ 6 lúc 23h (${now.toLocaleString('vi-VN')}) - Master Scheduler: WINDOWS_SCHEDULER. Trạng thái sao lưu hôm nay: ${hasBackupToday ? 'ĐÃ HOÀN TẤT' : 'ĐANG CHỜ / ĐANG CHẠY'}`);
          }
        }
      } catch (scheduleErr) {
        console.error('[Backup Watchdog] Lỗi bộ giám sát sao lưu:', scheduleErr);
      }
    }, 60 * 1000);
  });
}).catch((err) => {
  console.error('App prepare error:', err);
  process.exit(1);
});
