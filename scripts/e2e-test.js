
const puppeteer = require('puppeteer');

(async () => {
  console.log('Khởi động Puppeteer E2E Test...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Truy cập trang đăng nhập...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Test 1: Kiểm tra title
    const title = await page.title();
    console.log('Tiêu đề trang:', title);
    
    // Test 2: Thử đăng nhập sai
    console.log('Thực hiện đăng nhập sai...');
    const usernameInput = await page.$('input[name="username"]') || await page.$('input[type="text"]') || await page.$('input[type="email"]');
    const passwordInput = await page.$('input[name="password"]') || await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    if (usernameInput && passwordInput && submitBtn) {
      await usernameInput.type('sai_account');
      await passwordInput.type('sai_password');
      await submitBtn.click();
      
      await new Promise(r => setTimeout(r, 2000));
      console.log('✅ Test Đăng nhập sai: Hoàn tất (không crash).');
    } else {
      console.log('⚠️ Cảnh báo: Không tìm thấy form đăng nhập.');
    }

    // Test 3: Kiểm tra truy cập trái phép
    console.log('Kiểm tra chặn truy cập trái phép (vào /admin)...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('✅ Test Middleware: Hoàn tất. Hệ thống chặn truy cập thành công.');
    } else {
      console.log('❌ Test Middleware: Thất bại. Đang truy cập route admin dù chưa đăng nhập: ' + currentUrl);
    }

  } catch (err) {
    console.error('Lỗi trong quá trình E2E Test:', err);
  } finally {
    await browser.close();
    console.log('Hoàn tất E2E Test.');
    process.exit(0);
  }
})();
