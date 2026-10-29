const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false; // Run in fast production mode if built, or dev mode if needed
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Detect mode: default to PRODUCTION for high performance and stability
const fs = require('fs');
const path = require('path');
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

console.log(`[Skyline Server] Starting in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode on ${hostname}:${port}...`);

const app = next({ dev: isDev, hostname, port, dir: path.resolve(__dirname) });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
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
    let currentBuildId = fs.existsSync(buildIdFile) ? fs.readFileSync(buildIdFile, 'utf8').trim() : null;
    if (fs.existsSync(buildIdFile)) {
      let isRestarting = false;
      fs.watchFile(buildIdFile, { interval: 2000 }, () => {
        try {
          if (fs.existsSync(buildIdFile)) {
            const newBuildId = fs.readFileSync(buildIdFile, 'utf8').trim();
            if (newBuildId && newBuildId !== currentBuildId && !isRestarting) {
              isRestarting = true;
              console.log(`[Skyline Server] Phát hiện bản build mới (${newBuildId} != ${currentBuildId}).`);
              console.log('[Skyline Server] Đang tự động nạp lại máy chủ để cập nhật CSS và giao diện mới...');
              
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
            }
          }
        } catch (watchErr) {
          console.error('[Skyline Server] Lỗi kiểm tra cập nhật BUILD_ID:', watchErr);
        }
      });
    }
    
    // =========================================================================
    // GIÁM SÁT HỆ THỐNG SAO LƯU DỮ LIỆU ĐỊNH KỲ (PASSIVE WATCHDOG)
    // Master Scheduler: Windows Task Scheduler (SkylineSurvey_WeeklyBackup) lúc 23:00 Thứ 6
    // In-App Cron được cấu hình chế độ Giám sát thụ động (Passive Watchdog) để triệt tiêu hoàn toàn chạy trùng lặp
    // =========================================================================
    const lockFilePath = path.join(__dirname, 'data-backups', '.last_backup_date');
    let lastLoggedFridayDate = '';

    setInterval(() => {
      try {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 5 = Thứ Sáu (Friday)
        const hour = now.getHours();     // 23 = 23h00

        // Ghi nhận log giám sát định kỳ vào tối Thứ 6
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
    }, 60 * 1000); // Kiểm tra mỗi 60 giây
  });
}).catch((err) => {
  console.error('App prepare error:', err);
  process.exit(1);
});
