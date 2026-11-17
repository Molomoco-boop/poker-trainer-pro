const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'capturas');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=430,932']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });

  console.log('Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await wait(800);

  // 1. Lobby
  console.log('1. Capturing Lobby...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_inicio_lobby.png') });

  // 2. Profile (BB)
  console.log('2. Capturing Profile (BB)...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, nav button'));
    const perfilBtn = buttons.find(b => b.textContent.includes('Perfil'));
    if (perfilBtn) perfilBtn.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_perfil_bb.png') });

  // 3. Profile (Unidades €)
  console.log('3. Capturing Profile (Unidades €)...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const euroBtn = buttons.find(b => b.textContent.includes('Unidades (€)'));
    if (euroBtn) euroBtn.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_perfil_unidades_euro.png') });

  // Switch back to BB for consistency in training captures
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const bbBtn = buttons.find(b => b.textContent.includes('BB (Big Blinds)'));
    if (bbBtn) bbBtn.click();
  });
  await wait(400);

  // Go back to Inicio
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, nav button'));
    const inicioBtn = buttons.find(b => b.textContent.includes('Inicio'));
    if (inicioBtn) inicioBtn.click();
  });
  await wait(600);

  // 4. Simulator Category
  console.log('4. Capturing Simulator Category...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div, h3'));
    const sim = items.find(el => el.textContent.trim() === 'Simulator');
    if (sim) sim.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_categoria_simulator.png') });

  // 5. Customize Setup Modal
  console.log('5. Capturing Customize Setup Modal...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3, div'));
    const cust = items.find(el => el.textContent.includes('Customize setup'));
    if (cust) cust.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_modal_customize_setup.png') });

  // Close Customize Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await wait(400);

  // 6. Gameplan Modal
  console.log('6. Capturing Gameplan Modal...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3, div'));
    const gp = items.find(el => el.textContent.includes('Gameplan'));
    if (gp) gp.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_modal_gameplan.png') });

  // Close Gameplan Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await wait(400);

  // 7. Stats & Mistakes Modal
  console.log('7. Capturing Stats & Mistakes Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const statsBtn = btns.find(b => b.textContent.includes('View stats & mistakes'));
    if (statsBtn) statsBtn.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_modal_stats_mistakes.png') });

  // Close Stats Modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await wait(400);

  // Return to Lobby
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[class*="rounded-full"]');
    if (backBtn) backBtn.click();
  });
  await wait(500);

  // 8. Math Category
  console.log('8. Capturing Math Category...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3'));
    const math = items.find(el => el.textContent.trim() === 'Math');
    if (math) math.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_categoria_math.png') });

  // Return to Lobby
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[class*="rounded-full"]');
    if (backBtn) backBtn.click();
  });
  await wait(500);

  // 9. Fundamentals Category
  console.log('9. Capturing Fundamentals Category...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3'));
    const fund = items.find(el => el.textContent.trim() === 'Fundamentals');
    if (fund) fund.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09_categoria_fundamentals.png') });

  // Return to Lobby
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[class*="rounded-full"]');
    if (backBtn) backBtn.click();
  });
  await wait(500);

  // 10. Tool: Range Viewer
  console.log('10. Capturing Range Viewer...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3'));
    const rv = items.find(el => el.textContent.includes('Range Viewer'));
    if (rv) rv.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '10_tool_range_viewer.png') });

  // Close Range Viewer
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await wait(400);

  // 11. Tool: Odds Calculator
  console.log('11. Capturing Odds Calculator...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3'));
    const oc = items.find(el => el.textContent.includes('Odds Calculator'));
    if (oc) oc.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '11_tool_odds_calculator.png') });

  // Close Odds Calculator
  await page.evaluate(() => {
    const closeBtn = document.querySelector('div[class*="fixed"] button');
    if (closeBtn) closeBtn.click();
  });
  await wait(400);

  // 12. Level Settings Modal (from Lobby -> Start Playing -> tap Level pill)
  console.log('Launching Start Playing...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const playBtn = btns.find(b => b.textContent.includes('Start Playing'));
    if (playBtn) playBtn.click();
  });
  await wait(800);

  console.log('12. Capturing Level Settings Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const lvlBtn = btns.find(b => b.textContent.includes('NL'));
    if (lvlBtn) lvlBtn.click();
  });
  await wait(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '12_modal_level_settings.png') });

  // Close Level Settings
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const okBtn = btns.find(b => b.textContent.includes('Aceptar') || b.querySelector('svg'));
    if (okBtn) okBtn.click();
  });
  await wait(400);

  // 13. Mesa Preflop Pregunta Inicial
  console.log('13. Capturing Mesa Preflop Pregunta Inicial...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '13_mesa_preflop_pregunta.png') });

  // 14. Mesa Preflop Fallo (Click an intentionally incorrect option e.g. LIMP)
  console.log('14. Capturing Mesa Preflop Fallo...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const limpBtn = btns.find(b => b.textContent.includes('LIMP') || b.textContent.includes('3-BET'));
    if (limpBtn) limpBtn.click();
    else if (btns.length > 2) btns[2].click();
  });
  await wait(600);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '14_mesa_preflop_fallo.png') });

  // Click Continuar to advance
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const contBtn = btns.find(b => b.textContent.includes('Continuar'));
    if (contBtn) contBtn.click();
  });
  await wait(700);

  // Now we might be in next hand or flop; let's check
  // 15. Mesa Preflop Acierto (submit correct answer)
  console.log('15. Capturing Mesa Preflop / Flop Pregunta...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '15_mesa_ejercicio_en_curso.png') });

  // Answer correctly
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const callOrRaise = btns.find(b => b.textContent.includes('RAISE') || b.textContent.includes('21 %') || b.textContent.includes('CALL'));
    if (callOrRaise) callOrRaise.click();
    else if (btns.length > 1) btns[1].click();
  });
  await wait(600);
  console.log('16. Capturing Mesa Acierto Feedback...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '16_mesa_acierto_feedback.png') });

  // Advance to next street (Flop / Turn)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const contBtn = btns.find(b => b.textContent.includes('Continuar'));
    if (contBtn) contBtn.click();
  });
  await wait(700);

  // 17. Street Flop / Turn
  console.log('17. Capturing Mesa Street Avanzada...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '17_mesa_street_avanzada.png') });

  // Submit answer
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const opt = btns.find(b => b.textContent.includes('%') || b.textContent.includes('BET') || b.textContent.includes('CALL'));
    if (opt) opt.click();
    else if (btns.length > 0) btns[0].click();
  });
  await wait(600);
  console.log('18. Capturing Mesa Feedback Segunda Calle...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '18_mesa_feedback_segunda_calle.png') });

  // Advance to next street (Turn / River)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const contBtn = btns.find(b => b.textContent.includes('Continuar'));
    if (contBtn) contBtn.click();
  });
  await wait(700);

  // 19. Street River / Showdown
  console.log('19. Capturing Mesa River Showdown...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '19_mesa_river_showdown.png') });

  // Submit answer on River
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const callBtn = btns.find(b => b.textContent.includes('CALL') || b.textContent.includes('FOLD'));
    if (callBtn) callBtn.click();
  });
  await wait(600);
  console.log('20. Capturing Mesa River Feedback...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '20_mesa_river_feedback.png') });

  // Exit back to lobby
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[aria-label="Volver"]');
    if (backBtn) backBtn.click();
  });
  await wait(600);

  // Now change currency to Units (€) and take table screenshot in Euro
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, nav button'));
    const perfilBtn = buttons.find(b => b.textContent.includes('Perfil'));
    if (perfilBtn) perfilBtn.click();
  });
  await wait(500);

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const euroBtn = buttons.find(b => b.textContent.includes('Unidades (€)'));
    if (euroBtn) euroBtn.click();
  });
  await wait(400);

  // Go to Inicio -> Start Playing in Euro
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, nav button'));
    const inicioBtn = buttons.find(b => b.textContent.includes('Inicio'));
    if (inicioBtn) inicioBtn.click();
  });
  await wait(500);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const playBtn = btns.find(b => b.textContent.includes('Start Playing'));
    if (playBtn) playBtn.click();
  });
  await wait(800);

  console.log('21. Capturing Mesa en Unidades Euro...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '21_mesa_en_unidades_euro.png') });

  // Answer in Euro
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const firstOpt = btns.find(b => b.textContent.includes('FOLD') || b.textContent.includes('RAISE'));
    if (firstOpt) firstOpt.click();
  });
  await wait(600);
  console.log('22. Capturing Mesa Feedback en Unidades Euro...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '22_mesa_feedback_euro.png') });

  // Drill Simulator: Preflop spot directly from Category
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[aria-label="Volver"]');
    if (backBtn) backBtn.click();
  });
  await wait(500);

  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3'));
    const sim = items.find(el => el.textContent.trim() === 'Simulator');
    if (sim) sim.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(600);

  // Click "Preflop" drill
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3'));
    const pre = items.find(el => el.textContent.trim() === 'Preflop');
    if (pre) pre.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(800);

  console.log('23. Capturing Drill Preflop...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '23_drill_preflop.png') });

  // Back to Category
  await page.evaluate(() => {
    const backBtn = document.querySelector('button[aria-label="Volver"]');
    if (backBtn) backBtn.click();
  });
  await wait(600);

  // Click "Postflop" drill
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('h3'));
    const post = items.find(el => el.textContent.trim() === 'Postflop');
    if (post) post.closest('div[class*="cursor-pointer"]')?.click();
  });
  await wait(800);

  console.log('24. Capturing Drill Postflop...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '24_drill_postflop.png') });

  await browser.close();
  console.log('All 24 screenshots completed and saved to:', OUTPUT_DIR);
}

run().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
