const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'capturas');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Testing app gameplay with Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await wait(500);

  // 1. Lobby check
  console.log('1. Checking Lobby...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_lobby_clean.png') });

  // 2. Click Start Playing
  console.log('2. Clicking Start Playing...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const startBtn = btns.find(b => b.textContent.includes('Start Playing'));
    if (startBtn) startBtn.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_practice_table.png') });

  // 3. Play a decision
  console.log('3. Clicking an option in table...');
  const buttonsInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div.grid button'));
    return btns.map(b => b.textContent.trim());
  });
  console.log('Available action buttons:', buttonsInfo);

  // Click the first button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div.grid button'));
    if (btns.length > 0) btns[0].click();
  });
  await wait(250);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_after_answer.png') });

  // Wait 1 second to observe auto-advance or feedback
  await wait(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_after_advance.png') });

  // Go back to lobby
  console.log('4. Returning to lobby...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[aria-label="Salir"]');
    if (backBtn) backBtn.click();
  });
  await wait(500);

  // 5. Test Math Category -> Odds
  console.log('5. Testing Poker Math category...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, h3, span'));
    const mathCard = cards.find(c => c.textContent === 'Poker Math' || c.textContent.includes('Poker Math'));
    if (mathCard) {
      const parent = mathCard.closest('div[class*="cursor-pointer"]') || mathCard;
      parent.click();
    }
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_category_math.png') });

  // Click Odds subcategory
  console.log('6. Clicking Odds subcategory...');
  await page.evaluate(() => {
    const subs = Array.from(document.querySelectorAll('h3'));
    const oddsSub = subs.find(s => s.textContent === 'Odds');
    if (oddsSub) {
      const parent = oddsSub.closest('div[class*="cursor-pointer"]');
      if (parent) parent.click();
    }
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_pot_odds_drill.png') });

  // Go back
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[aria-label="Salir"]');
    if (backBtn) backBtn.click();
  });
  await wait(500);

  // 7. Test Fundamentals -> Best hand
  console.log('7. Testing Fundamentals category...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('button');
    if (backBtn) backBtn.click();
  });
  await wait(500);

  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, h3, span'));
    const fundCard = cards.find(c => c.textContent === 'Fundamentals');
    if (fundCard) {
      const parent = fundCard.closest('div[class*="cursor-pointer"]');
      if (parent) parent.click();
    }
  });
  await wait(600);

  // Click Best hand
  console.log('8. Clicking Best hand...');
  await page.evaluate(() => {
    const subs = Array.from(document.querySelectorAll('h3'));
    const bestHandSub = subs.find(s => s.textContent === 'Best hand');
    if (bestHandSub) {
      const parent = bestHandSub.closest('div[class*="cursor-pointer"]');
      if (parent) parent.click();
    }
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_best_hand_drill.png') });

  // 9. Profile view check
  console.log('9. Checking Profile view...');
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[aria-label="Salir"]');
    if (backBtn) backBtn.click();
  });
  await wait(400);
  await page.evaluate(() => {
    const backBtn = document.querySelector('button');
    if (backBtn) backBtn.click();
  });
  await wait(400);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, nav button'));
    const perfilBtn = btns.find(b => b.textContent.includes('Perfil'));
    if (perfilBtn) perfilBtn.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_profile_clean.png') });

  await browser.close();
  console.log('Test completed successfully! All captures saved.');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
