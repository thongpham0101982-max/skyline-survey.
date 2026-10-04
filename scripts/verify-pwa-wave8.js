const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log("================================================================================");
console.log("             SSM PWA AUTOMATED COMPLIANCE & INTEGRITY TEST SUITE                ");
console.log("================================================================================\n");

// --- WAVE 1: PWA FOUNDATION ---
console.log(">> WAVE 1: PWA Foundation (Manifest, SW, Icons, Offline)");
const manifestPath = path.join(rootDir, 'public/manifest.webmanifest');
assert(fs.existsSync(manifestPath), "Manifest webmanifest file exists");
if (fs.existsSync(manifestPath)) {
  const raw = fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '');
  const manifest = JSON.parse(raw);
  assert(manifest.name && manifest.name.includes("Sky-Line"), "Manifest name is valid");
  assert(manifest.display === "standalone", "Display mode is standalone");
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 8, "Manifest defines at least 8 icons");
}

const swPath = path.join(rootDir, 'public/sw.js');
assert(fs.existsSync(swPath), "Service Worker (sw.js) exists");
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  assert(sw.includes("stale-while-revalidate") || sw.includes("caches.open"), "SW implements caching strategy");
  assert(sw.includes("addEventListener('push'"), "SW handles Web Push notifications");
  assert(sw.includes("skipWaiting"), "SW supports immediate activation (skipWaiting)");
}

const iconFiles = [
  'ssm-48.png', 'ssm-96.png', 'ssm-144.png', 'ssm-192.png',
  'ssm-512.png', 'ssm-maskable-192.png', 'ssm-maskable-512.png', 'apple-touch-icon.png'
];
const allIconsExist = iconFiles.every(file => fs.existsSync(path.join(rootDir, `public/icons/${file}`)));
assert(allIconsExist, "All 8 PWA icon assets exist in public/icons/");

assert(fs.existsSync(path.join(rootDir, 'src/app/offline/page.tsx')), "Offline fallback page exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/PwaManager.tsx')), "PwaManager component exists");

// --- WAVE 2: TODAY & NAVIGATION ---
console.log("\n>> WAVE 2: SSM Today & Role-Based Mobile Home");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/today/route.ts')), "API GET /api/pwa/today exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/SSMTodayHome.tsx')), "Component SSMTodayHome.tsx exists");

const bottomNavPath = path.join(rootDir, 'src/components/pwa/PwaBottomNav.tsx');
assert(fs.existsSync(bottomNavPath), "PwaBottomNav.tsx exists");
if (fs.existsSync(bottomNavPath)) {
  const nav = fs.readFileSync(bottomNavPath, 'utf8');
  assert(nav.includes("Hôm nay") && nav.includes("Việc") && nav.includes("SSM AI") && nav.includes("Thông báo") && nav.includes("Tôi"), "BottomNav contains all 5 required tabs");
}

const teacherPagePath = path.join(rootDir, 'src/app/teacher/page.tsx');
if (fs.existsSync(teacherPagePath)) {
  const teacherPage = fs.readFileSync(teacherPagePath, 'utf8');
  assert(teacherPage.includes("SSMTodayHome") || teacherPage.includes("isMobile"), "Teacher page implements Mobile responsive switcher");
}

// --- WAVE 3: TASK ENGINE ---
console.log("\n>> WAVE 3: My Tasks Engine");
assert(fs.existsSync(path.join(rootDir, 'src/services/taskEngine/types.ts')), "TaskEngine types.ts exists");
assert(fs.existsSync(path.join(rootDir, 'src/services/taskEngine/index.ts')), "TaskEngine aggregator index.ts exists");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/tasks/route.ts')), "API GET/PATCH /api/pwa/tasks exists");

// --- WAVE 4: NOTIFICATION HUB & WEB PUSH ---
console.log("\n>> WAVE 4: Notification Hub & Controlled Web Push");
assert(fs.existsSync(path.join(rootDir, 'src/lib/webpush.ts')), "WebPush helper exists");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/notifications/route.ts')), "API /api/pwa/notifications exists");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/morning-brief/route.ts')), "API /api/pwa/morning-brief exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/WebPushPrompt.tsx')), "WebPushPrompt component exists");

// --- WAVE 5: MOBILE BUSINESS MODULES ---
console.log("\n>> WAVE 5: Mobile Business Modules (Dự giờ & Hồ sơ Học sinh 360)");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/observations/route.ts')), "API /api/pwa/observations exists");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/students/summary/route.ts')), "API /api/pwa/students/summary exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/ObservationMobileView.tsx')), "ObservationMobileView component exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/StudentMobileView.tsx')), "StudentMobileView component exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/QuickActionFab.tsx')), "QuickActionFab component exists");

// --- WAVE 6: SSM AI WORK ASSISTANT ---
console.log("\n>> WAVE 6: SSM AI Work Assistant");
const aiPagePath = path.join(rootDir, 'src/app/teacher/ai/page.tsx');
assert(fs.existsSync(aiPagePath), "SSM AI page exists");
if (fs.existsSync(aiPagePath)) {
  const aiPage = fs.readFileSync(aiPagePath, 'utf8');
  assert(aiPage.includes("GVCN") && aiPage.includes("GVBM") && aiPage.includes("TTCM"), "AI page has role-based prompt pills");
  assert(aiPage.includes("Tạo nhắc việc") || aiPage.includes("Hồ sơ học sinh"), "AI page implements Action Cards");
}

// --- WAVE 7: ENTERPRISE SECURITY & DEVICE SESSIONS ---
console.log("\n>> WAVE 7: Enterprise Security & Device Sessions");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/devices/route.ts')), "API /api/pwa/devices exists");
assert(fs.existsSync(path.join(rootDir, 'src/app/api/pwa/devices/revoke/route.ts')), "API /api/pwa/devices/revoke exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/DeviceSessionManager.tsx')), "DeviceSessionManager component exists");
assert(fs.existsSync(path.join(rootDir, 'src/components/pwa/DeviceTracker.tsx')), "DeviceTracker component exists");

const nextConfigPath = path.join(rootDir, 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  assert(nextConfig.includes("X-Frame-Options") && nextConfig.includes("nosniff"), "next.config.js has security headers");
}

const proxyPath = path.join(rootDir, 'src/proxy.ts');
if (fs.existsSync(proxyPath)) {
  const proxy = fs.readFileSync(proxyPath, 'utf8');
  assert(proxy.includes("X-Frame-Options") && proxy.includes("nosniff"), "src/proxy.ts enforces security headers");
}

// --- WAVE 8: DUAL-RUN & CORE INTEGRITY ---
console.log("\n>> DUAL-RUN & CORE INTEGRITY VERIFICATION");
const schemaPath = path.join(rootDir, 'prisma/schema.prisma');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  assert(schema.includes("model User"), "Core model User is intact");
  assert(schema.includes("model Teacher"), "Core model Teacher is intact");
  assert(schema.includes("model Parent"), "Core model Parent is intact");
  assert(schema.includes("model DeviceSession"), "DeviceSession model is active");
  assert(schema.includes("model PushSubscription"), "PushSubscription model is active");
}

// Final Summary
console.log("\n================================================================================");
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log("================================================================================");

if (failedTests === 0) {
  console.log("\n🎉 ALL PWA INTEGRITY & COMPLIANCE CHECKS PASSED WITH 100% SUCCESS!");
  process.exit(0);
} else {
  console.error(`\n❌ ${failedTests} CHECKS FAILED! Please review errors above.`);
  process.exit(1);
}
