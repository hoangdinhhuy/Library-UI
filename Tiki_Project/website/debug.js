const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:5500', { waitUntil: 'networkidle0' });

  // 1. Enter keyword "sạc"
  await page.type('input[type="text"]', 'sạc');

  // 2. Click "Phân tích" button (it's the button with class bg-blue-600 in the first container)
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Tim Kiem') || text.includes('Phân tích')) {
      await btn.click();
      break;
    }
  }

  // 3. Wait for the table to appear (meaning analysis is done)
  try {
    await page.waitForSelector('table', { timeout: 60000 });
  } catch (e) {
    console.log('Table did not appear:', e.message);
    await browser.close();
    return;
  }

  console.log('Table appeared. Clicking Đánh giá...');

  // 4. Click the first "Đánh giá" button
  const reviewBtns = await page.$$('button');
  let clicked = false;
  for (const btn of reviewBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Đánh giá')) {
      await btn.click();
      clicked = true;
      break;
    }
  }
  
  if (!clicked) {
      console.log('Could not find Đánh giá button');
  }

  // 5. Wait a bit to catch errors
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Done.');
  await browser.close();
})();
