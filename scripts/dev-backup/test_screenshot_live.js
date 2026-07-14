const puppeteer = require('puppeteer');

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 1600 });
  
  console.log("Navigating to Vercel production login...");
  await page.goto('https://skyline-survey-rh4k.vercel.app/login', { waitUntil: 'networkidle2' });
  
  console.log("Entering credentials...");
  await page.waitForSelector('input[type="text"]');
  await page.type('input[type="text"]', '0201000475', { delay: 50 });
  await page.type('input[type="password"]', 'password123', { delay: 50 });
  
  console.log("Submitting login form...");
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null)
  ]);
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("Navigating to teacher assessments on live production...");
  await page.goto('https://skyline-survey-rh4k.vercel.app/teacher/input-assessments?type=general', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));

  console.log("Taking screenshot of live Grade Distribution chart...");
  const screenshotPathGrade = 'C:\\\\Users\\\\Windows 11\\\\.gemini\\\\antigravity\\\\brain\\\\95a43bbd-df26-4aaf-bfc3-3ae3736b846f\\\\live_screenshot_premium_grade.png';
  await page.screenshot({ path: screenshotPathGrade });
  console.log("Grade chart screenshot saved.");

  console.log("Selecting Kỳ khảo sát...");
  const periodValue = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const select = selects.find(s => s.innerHTML.includes('Chọn Kỳ khảo sát'));
    if (!select) return null;
    const options = Array.from(select.options);
    const validOpt = options.find(opt => opt.value !== "");
    if (validOpt) {
      select.value = validOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return validOpt.value;
    }
    return null;
  });
  console.log("Selected Period ID:", periodValue);
  await new Promise(r => setTimeout(r, 3000));

  console.log("Selecting Đợt khảo sát...");
  const batchValue = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const select = selects.find(s => s.innerHTML.includes('Chọn Đợt khảo sát'));
    if (!select) return null;
    const options = Array.from(select.options);
    const validOpt = options.find(opt => opt.value === "all") || options.find(opt => opt.value !== "");
    if (validOpt) {
      select.value = validOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return validOpt.value;
    }
    return null;
  });
  console.log("Selected Batch:", batchValue);
  await new Promise(r => setTimeout(r, 3000));

  console.log("Selecting Môn khảo sát...");
  const subjectValue = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const select = selects.find(s => s.innerHTML.includes('Chọn Môn khảo sát'));
    if (!select) return null;
    const options = Array.from(select.options);
    const validOpt = options.find(opt => opt.value !== "");
    if (validOpt) {
      select.value = validOpt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return validOpt.value;
    }
    return null;
  });
  console.log("Selected Subject ID:", subjectValue);
  await new Promise(r => setTimeout(r, 5000));

  console.log("Switching to Class Comparison Chart tab...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const classBtn = buttons.find(b => b.textContent.includes('So sánh giữa các Lớp'));
    if (classBtn) classBtn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  console.log("Taking screenshot of live Class Comparison chart...");
  const screenshotPathClass = 'C:\\\\Users\\\\Windows 11\\\\.gemini\\\\antigravity\\\\brain\\\\95a43bbd-df26-4aaf-bfc3-3ae3736b846f\\\\live_screenshot_premium_class.png';
  await page.screenshot({ path: screenshotPathClass });
  console.log("Class chart screenshot saved.");
  
  await browser.close();
}

run().catch(console.error);
