import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'play_store_assets');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:5173/';

const LANGS = [
  { code: 'en', play: 'en-US', name: 'English' },
  { code: 'es', play: 'es-ES', name: 'Español' },
  { code: 'pt', play: 'pt-BR', name: 'Português' },
  { code: 'fr', play: 'fr-FR', name: 'Français' },
  { code: 'de', play: 'de-DE', name: 'Deutsch' },
  { code: 'it', play: 'it-IT', name: 'Italiano' },
  { code: 'ru', play: 'ru-RU', name: 'Русский' },
  { code: 'zh', play: 'zh-CN', name: '中文' },
  { code: 'ja', play: 'ja-JP', name: '日本語' },
  { code: 'ko', play: 'ko-KR', name: '한국어' }
];

const COPY = {
  en: {
    title: 'Free Poker Trainer',
    short: 'Learn & practice poker for free. Tables, puzzles & odds. No ads, no account.',
    bannerTag: 'Play · Practice · Improve Your Poker',
    bannerBadge: '100% Free · No Ads · No Account',
    slides: [
      { h: 'Play Full Cash Tables', s: 'Clear feedback after every hand' },
      { h: 'Track Your Skill Rating', s: 'Daily training, tables & 60s sprint' },
      { h: 'Spot Your Weaknesses', s: 'See where you make mistakes & fix them' },
      { h: 'Simple Flop Guides', s: 'Know when to bet, check or fold' },
      { h: 'Train Starting Hands', s: 'Test your hand memory in seconds' }
    ],
    full: `A fast, clean, 100% free poker trainer built for the community — no ads, no paywalls, no subscriptions, and no account required.

Inspired by the best open training apps: open it and start playing or practicing in 1 second. Everything stays saved offline on your device.

WHY FREE POKER TRAINER?
• Free Forever: Every table, puzzle, and tool is unlocked from day one. No VIP tiers, no locked features.
• Zero Ads & Zero Tracking: No pop-ups, no banners, no login walls.
• Works Offline on Your Device: Your rating, hand history, and progress stay saved locally on your phone.

EVERYTHING YOU NEED TO IMPROVE
• Practice Tables: Play full hands against tight, loose, aggressive, or balanced bots and get clear feedback on every move.
• Daily 10-Hand Training: A quick daily mix of your current lesson, past mistakes, and real spots.
• Skill Rating & Progress Chart: Watch your rating grow as you learn, from beginner to advanced.
• Mistake Map: See at a glance which table seats or streets give you trouble and practice them directly.
• Simple Flop Guides: Clear visual guides showing how often to bet or check on different boards.
• 60-Second Speed Challenge: Decide fast whether to play or fold your starting hand before time runs out.
• Hand Memory Grid: Paint starting hands from memory and check your score instantly.
• Hand-by-Hand Replay: Review your played hands anytime and save tricky spots to practice again.
• Built-in Poker Tools: Odds & probability calculator, hand ranking chart, and starting hand guide.

MADE FOR EVERYONE
• Clean dark interface with 4-color or classic 2-color cards.
• Switch between chips/blinds and € values anytime.
• Automatic support for 10 languages.

Disclaimer: Free Poker Trainer is an educational poker training app. It does not offer real-money gambling or cash prizes.`
  },
  es: {
    title: 'Free Poker Trainer',
    short: 'Aprende y entrena póker gratis. Mesas, ejercicios y odds. Sin anuncios ni cuenta.',
    bannerTag: 'Juega · Entrena · Mejora tu Póker',
    bannerBadge: '100% Gratis · Sin Anuncios · Sin Cuenta',
    slides: [
      { h: 'Juega Mesas Completas', s: 'Explicación clara tras cada jugada' },
      { h: 'Mide tu Progreso Real', s: 'Entreno diario, mesas y reto de 60s' },
      { h: 'Detecta tus Fallos', s: 'Mira dónde fallas y corrígelo al momento' },
      { h: 'Guías Claras de Flop', s: 'Aprende cuándo apostar o pasar' },
      { h: 'Domina las Manos Iniciales', s: 'Pon a prueba tu memoria en segundos' }
    ],
    full: `Un entrenador de póker rápido, limpio y 100% gratis pensado para la comunidad — sin anuncios, sin pagos ocultos, sin suscripciones y sin necesidad de crear cuenta.

Inspirado en las mejores plataformas abiertas de entrenamiento: abre la app y empieza a jugar o practicar en 1 segundo. Todo se guarda en tu dispositivo.

¿POR QUÉ FREE POKER TRAINER?
• Gratis para Siempre: Todas las mesas, ejercicios y herramientas desbloqueadas desde el primer día. Sin planes VIP ni muros de pago.
• Sin Anuncios ni Registro: Sin publicidad, sin ventanas molestas y sin pedirte correo ni contraseña.
• Funciona Offline en tu Móvil: Tu puntuación, historial de manos y progreso se guardan en la memoria de tu dispositivo.

TODO LO QUE NECESITAS PARA MEJORAR
• Mesas de Práctica: Juega manos completas contra rivales con distintos estilos (pasivos, agresivos, cerrados o equilibrados) con respuesta clara tras cada acción.
• Sesión Diaria de 10 Manos: Un entreno rápido cada día que combina tu tema actual y tus errores anteriores.
• Puntuación y Gráfica de Nivel: Sigue tu evolución real mientras aprendes paso a paso.
• Mapa de Fallos: Descubre de un vistazo en qué posiciones o momentos de la mano pierdes más y practícalo al instante.
• Guías Sencillas de Flop: Aprende visualmente con qué frecuencia conviene apostar o pasar según las cartas de la mesa.
• Reto Rápido de 60 Segundos: Decide en segundos si jugar o retirarte con tus cartas iniciales antes de que acabe el tiempo.
• Práctica de Manos Iniciales: Marca qué manos jugarías de memoria y comprueba tu acierto al instante.
• Repaso de Manos Jugadas: Vuelve a ver cualquier mano jugada y guarda las dudas para repasarlas luego.
• Herramientas Integradas: Calculadora de probabilidades, tabla de jugadas y guía de manos iniciales.

PENSADA PARA JUGADORES DE TODOS LOS NIVELES
• Interfaz oscura limpia con baraja de 4 colores o clásica de 2 colores.
• Cambia entre ciegas y € en cualquier momento.
• Disponible automáticamente en 10 idiomas.

Aviso: Free Poker Trainer es una app educativa de póker. No incluye apuestas con dinero real ni premios monetarios.`
  },
  pt: {
    title: 'Free Poker Trainer',
    short: 'Aprenda e treine poker grátis. Mesas, exercícios e odds. Sem anúncios ou conta.',
    bannerTag: 'Jogue · Treine · Evolua no Poker',
    bannerBadge: '100% Grátis · Sem Anúncios · Sem Conta',
    slides: [
      { h: 'Jogue Mesas Completas', s: 'Feedback claro após cada jogada' },
      { h: 'Acompanhe seu Nível', s: 'Treino diário, mesas e desafio de 60s' },
      { h: 'Encontre seus Erros', s: 'Veja onde você erra e corrija rápido' },
      { h: 'Guias Simples de Flop', s: 'Saiba quando apostar ou dar check' },
      { h: 'Treine Mãos Iniciais', s: 'Teste sua memória em segundos' }
    ],
    full: `Um treinador de poker rápido, limpo e 100% gratuito feito para a comunidade — sem anúncios, sem assinaturas e sem precisar criar conta.

• Grátis para Sempre: Todas as mesas, exercícios e ferramentas liberados desde o início.
• Offline no seu Dispositivo: Seu rating, histórico de mãos e progresso ficam salvos no seu celular.
• Mesas de Prática, Treino Diário, Mapa de Erros, Desafio de 60s, Calculadora de Odds e Tabela de Mãos.`
  },
  fr: {
    title: 'Free Poker Trainer',
    short: 'Apprenez et pratiquez le poker gratuitement. Sans pub, sans compte, hors ligne.',
    bannerTag: 'Jouez · Entraînez-vous · Progressez',
    bannerBadge: '100% Gratuit · Sans Pub · Sans Compte',
    slides: [
      { h: 'Tables Complètes', s: 'Conseils clairs après chaque coup' },
      { h: 'Suivez Votre Niveau', s: 'Session du jour, tables et sprint 60s' },
      { h: 'Corrigez Vos Erreurs', s: 'Repérez vos points faibles en un coup d’œil' },
      { h: 'Guides de Flop Simples', s: 'Savoir quand miser ou checker' },
      { h: 'Mains de Départ', s: 'Testez votre mémoire en quelques secondes' }
    ],
    full: `Un entraîneur de poker rapide, simple et 100% gratuit conçu pour la communauté — sans publicité, sans abonnement et sans création de compte.

• Gratuit pour Toujours : Toutes les tables, exercices et outils débloqués dès le premier jour.
• Hors Ligne sur Votre Appareil : Votre niveau, historique de mains et progression restent enregistrés sur votre téléphone.
• Tables d'entraînement, Session du jour, Carte des erreurs, Défi 60s et Calculateur de probabilités.`
  },
  de: {
    title: 'Free Poker Trainer',
    short: 'Poker kostenlos lernen & trainieren. Tische, Übungen & Odds. Ohne Werbung.',
    bannerTag: 'Spielen · Üben · Besser Werden',
    bannerBadge: '100% Gratis · Keine Werbung · Kein Konto',
    slides: [
      { h: 'Komplette Tische spielen', s: 'Klares Feedback nach jeder Hand' },
      { h: 'Dein Level verfolgen', s: 'Tages-Training, Tische & 60s-Sprint' },
      { h: 'Schwächen erkennen', s: 'Sieh sofort, wo Fehler passieren' },
      { h: 'Einfache Flop-Guides', s: 'Wann setzen, checken oder folden' },
      { h: 'Starthände trainieren', s: 'Teste dein Gedächtnis in Sekunden' }
    ],
    full: `Ein schneller, sauberer und 100% kostenloser Poker-Trainer für die Community — ohne Werbung, ohne Abo und ohne Konto.

• Dauerhaft Kostenlos: Alle Tische, Übungen und Tools ab Tag eins freigeschaltet.
• Offline auf deinem Gerät: Dein Rating, Hand-Verlauf und Fortschritt werden lokal gespeichert.
• Übungstische, Tages-Training, Fehlerkarte, 60s-Sprint und Wahrscheinlichkeits-Rechner.`
  },
  it: {
    title: 'Free Poker Trainer',
    short: 'Impara e allena il poker gratis. Tavoli, esercizi e odds. Senza pubblicità.',
    bannerTag: 'Gioca · Allenati · Migliora Gratis',
    bannerBadge: '100% Gratis · Zero Pub · Senza Account',
    slides: [
      { h: 'Gioca Tavoli Completi', s: 'Feedback chiaro dopo ogni mano' },
      { h: 'Segui il tuo Livello', s: 'Allenamento quotidiano e sprint 60s' },
      { h: 'Trova i tuoi Errori', s: 'Scopri subito dove migliorare' },
      { h: 'Guide Flop Semplici', s: 'Quando puntare, fare check o fold' },
      { h: 'Allena le Mani Iniziali', s: 'Metti alla prova la tua memoria' }
    ],
    full: `Un trainer di poker veloce, pulito e 100% gratuito pensato per la community — senza pubblicità, senza abbonamenti e senza registrazione.

• Gratis per Sempre: Tutti i tavoli, esercizi e strumenti sbloccati fin da subito.
• Offline sul tuo Dispositivo: Rating, cronologia mani e progressi salvati sul telefono.
• Tavoli di pratica, Sessione giornaliera, Mappa errori, Sfida 60s e Calcolatore probabilità.`
  },
  ru: {
    title: 'Free Poker Trainer',
    short: 'Учись и тренируй покер бесплатно. Столы, задачи и шансы. Без рекламы и аккаунта.',
    bannerTag: 'Играй · Тренируйся · Расти Бесплатно',
    bannerBadge: '100% Бесплатно · Без рекламы · Без аккаунта',
    slides: [
      { h: 'Игра за полным столом', s: 'Понятный разбор после каждой раздачи' },
      { h: 'Честный рейтинг уровня', s: 'Дневная тренировка и спринт 60с' },
      { h: 'Находи свои ошибки', s: 'Карта слабых мест по позициям' },
      { h: 'Простые гиды по флопу', s: 'Когда ставить, чекать или пасовать' },
      { h: 'Тренировка стартовых рук', s: 'Проверь память за пару секунд' }
    ],
    full: `Быстрый, понятный и 100% бесплатный покер-тренажёр для сообщества — без рекламы, подписок и регистрации.

• Бесплатно навсегда: все столы, тренировки и инструменты открыты с первого дня.
• Офлайн на устройстве: рейтинг, история раздач и прогресс хранятся у вас на телефоне.`
  },
  zh: {
    title: 'Free Poker Trainer',
    short: '免费学习与训练德州扑克。实战牌桌、练习题与概率计算。无广告，免登录。',
    bannerTag: '实战 · 练习 · 免费提升牌技',
    bannerBadge: '100% 免费 · 无广告 · 无需账号',
    slides: [
      { h: '完整实战牌桌', s: '每手牌后提供清晰解析' },
      { h: '追踪真实水平', s: '每日训练、牌桌与60秒冲刺' },
      { h: '定位薄弱环节', s: '一眼看清失误位置并针对练习' },
      { h: '简明翻牌指南', s: '轻松掌握何时下注或过牌' },
      { h: '起手牌记忆训练', s: '几秒钟测试你的起手牌记忆' }
    ],
    full: `专为扑克社区打造的极速、纯净、100% 免费扑克训练器——无广告、无内购、无订阅、无需注册账号。

• 永久免费：所有牌桌、练习和工具从第一天起全部开放。
• 本地离线保存：您的积分、牌局记录和学习进度安全保存在您的设备上。`
  },
  ja: {
    title: 'Free Poker Trainer',
    short: '完全無料のポーカートレーナー。テーブル対戦、問題演習、確率計算。広告・登録なし。',
    bannerTag: '遊ぶ · 学ぶ · 無料で上達',
    bannerBadge: '完全無料 · 広告なし · 登録不要',
    slides: [
      { h: '実戦テーブルで練習', s: '毎ハンドわかりやすい解説付き' },
      { h: '実力レートを記録', s: '毎日の練習と60秒スピード挑戦' },
      { h: '弱点をひと目で発見', s: 'ミスしやすい場面をすぐ復習' },
      { h: 'シンプルなフロップ解説', s: 'ベットかチェックか迷わない' },
      { h: 'スターティングハンド練習', s: '記憶テストですぐに定着' }
    ],
    full: `コミュニティのために作られた、シンプルで完全無料のポーカートレーナー。広告なし・課金なし・アカウント登録不要。

• ずっと無料：すべての練習モードと計算ツールを最初から制限なく使えます。
• オフライン端末保存：レートやハンド履歴はすべて端末内に保存されます。`
  },
  ko: {
    title: 'Free Poker Trainer',
    short: '무료로 배우고 연습하는 포커 트레이너. 테이블, 문제 풀이, 확률 계산. 광고·가입 없음.',
    bannerTag: '플레이 · 연습 · 무료 실력 향상',
    bannerBadge: '100% 무료 · 광고 없음 · 가입 불필요',
    slides: [
      { h: '실전 테이블 플레이', s: '매 핸드 직후 명확한 피드백' },
      { h: '실력 레이팅 추적', s: '일일 훈련, 테이블 & 60초 스피드' },
      { h: '약점 한눈에 파악', s: '실수가 잦은 구간을 바로 복습' },
      { h: '쉬운 플랍 가이드', s: '베팅과 체크 타이밍 완벽 이해' },
      { h: '스타팅 핸드 훈련', s: '몇 초 만에 핸드 기억력 테스트' }
    ],
    full: `커뮤니티를 위해 만든 빠르고 깔끔한 100% 무료 포커 트레이너 — 광고 없음, 구독 없음, 회원가입 불필요.

• 평생 무료: 모든 테이블, 훈련 모드, 계산기 도구를 첫날부터 제한 없이 이용할 수 있습니다.
• 기기 오프라인 저장: 레이팅, 핸드 기록, 학습 진행도가 기기에 안전하게 저장됩니다.`
  }
};

function csvEscape(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function writeTranslationsCsv() {
  const header = ['Attribute', ...LANGS.map(l => l.play)].map(csvEscape).join(',');
  const rows = [
    ['App title', ...LANGS.map(l => COPY[l.code].title)].map(csvEscape).join(','),
    ['Short description', ...LANGS.map(l => COPY[l.code].short)].map(csvEscape).join(','),
    ['Full description', ...LANGS.map(l => COPY[l.code].full)].map(csvEscape).join(',')
  ];
  const csv = '\uFEFF' + [header, ...rows].join('\r\n');
  fs.writeFileSync(path.join(OUT, 'play_store_translations.csv'), csv, 'utf8');
  console.log('Wrote play_store_translations.csv');
}

function seedStats(lang) {
  const today = new Date().toLocaleDateString('sv-SE');
  return {
    username: 'Hero',
    email: '',
    stake: 'NL10',
    rating: { r: 1642, rd: 68, n: 64 },
    conceptRatings: {
      rfi_early: { r: 1680, rd: 70, n: 14 },
      rfi_late: { r: 1710, rd: 65, n: 16 },
      bb_def: { r: 1615, rd: 75, n: 12 },
      sb_3b: { r: 1590, rd: 80, n: 10 },
      vs3b: { r: 1625, rd: 85, n: 8 },
      cbet: { r: 1660, rd: 72, n: 11 },
      flop_def: { r: 1560, rd: 82, n: 9 },
      turn: { r: 1605, rd: 88, n: 6 },
      river: { r: 1545, rd: 95, n: 5 }
    },
    ratingHistory: [1500, 1525, 1518, 1546, 1572, 1565, 1598, 1615, 1630, 1622, 1642],
    consecutiveCorrect: 7,
    bestStreak: 12,
    totalHandsPlayed: 84,
    totalCorrectDecisions: 66,
    totalDecisions: 84,
    totalChance: 38.2,
    leakStats: {
      'UTG|preflop': { n: 14, ok: 12, chance: 6.5 },
      'UTG|flop': { n: 9, ok: 7, chance: 4.1 },
      'UTG|turn': { n: 5, ok: 3, chance: 2.2 },
      'HJ|preflop': { n: 12, ok: 10, chance: 5.4 },
      'HJ|flop': { n: 8, ok: 6, chance: 3.6 },
      'CO|preflop': { n: 16, ok: 14, chance: 7.2 },
      'CO|flop': { n: 11, ok: 9, chance: 4.9 },
      'CO|turn': { n: 6, ok: 4, chance: 2.7 },
      'BTN|preflop': { n: 18, ok: 16, chance: 8.1 },
      'BTN|flop': { n: 14, ok: 11, chance: 6.3 },
      'BTN|turn': { n: 8, ok: 6, chance: 3.6 },
      'BTN|river': { n: 5, ok: 2, chance: 2.3 },
      'SB|preflop': { n: 11, ok: 8, chance: 5.0 },
      'SB|flop': { n: 7, ok: 3, chance: 3.2 },
      'BB|preflop': { n: 15, ok: 12, chance: 6.8 },
      'BB|flop': { n: 12, ok: 9, chance: 5.4 },
      'BB|turn': { n: 7, ok: 4, chance: 3.1 },
      'BB|river': { n: 4, ok: 3, chance: 1.8 }
    },
    placementDone: true,
    curriculumIndex: 6,
    sprintBest: 24,
    rangeBest: { u1: 94 },
    dayStreak: 6,
    lastActiveDay: today,
    todayDecisions: 14,
    lastReviewAt: 79,
    dailyDrillCount: 7,
    dailyDrillDate: today,
    schemaVersion: 4,
    sessionHands: [],
    preferences: {
      volume: 80,
      soundEnabled: false,
      hapticsEnabled: true,
      animationSpeed: 'normal',
      dailyReminder: true,
      displayUnits: 'bb',
      deckColorMode: '4color',
      trainingPositions: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
      language: lang
    },
    categoryStats: {
      RFI_OPEN: { total: 20, correct: 17 },
      BB_DEFENSE: { total: 15, correct: 12 },
      SB_VS_OPEN: { total: 10, correct: 8 },
      '3BET_POT': { total: 8, correct: 6 },
      CBET_FLOP: { total: 14, correct: 11 },
      FACING_CBET: { total: 9, correct: 6 },
      TURN_RIVER_DECISION: { total: 6, correct: 4 },
      POT_ODDS_DRILL: { total: 2, correct: 2 }
    },
    mistakeQueue: []
  };
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function composeScreenshot(page, rawPngPath, outPngPath, headline, subline, width = 1080, height = 1920) {
  const b64 = fs.readFileSync(rawPngPath).toString('base64');
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${width}px; height: ${height}px;
      background: radial-gradient(circle at 50% 15%, #262421 0%, #161512 65%, #0f0e0c 100%);
      font-family: 'Noto Sans', 'Segoe UI', Roboto, Arial, sans-serif;
      color: #e8e6e3; display: flex; flex-direction: column; align-items: center;
      padding: ${Math.round(height * 0.05)}px 56px 0 56px; overflow: hidden;
    }
    .head { text-align: center; margin-bottom: ${Math.round(height * 0.035)}px; }
    h1 { font-size: ${width > 1100 ? 64 : 60}px; font-weight: 800; line-height: 1.12; color: #ffffff; letter-spacing: -0.02em; }
    p { font-size: ${width > 1100 ? 34 : 32}px; font-weight: 500; color: #bababa; margin-top: 16px; line-height: 1.25; }
    .phone {
      flex: 1; width: 100%; max-width: ${width > 1100 ? 920 : 840}px;
      background: #161512; border: 10px solid #3d3a36; border-bottom: none;
      border-radius: 52px 52px 0 0; padding: 14px 14px 0 14px;
      box-shadow: 0 30px 90px rgba(0,0,0,0.75); overflow: hidden;
    }
    .phone img { width: 100%; height: auto; display: block; border-radius: 38px 38px 0 0; }
  </style></head>
  <body>
    <div class="head"><h1>${headline}</h1><p>${subline}</p></div>
    <div class="phone"><img src="data:image/png;base64,${b64}" /></div>
  </body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outPngPath });
}

async function composeBanner(page, iconB64, tableB64, leakB64, copy, outPath) {
  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  const html = `<!doctype html>
  <html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1024px; height: 500px; overflow: hidden; position: relative;
      background: linear-gradient(135deg, #161512 0%, #201e1a 55%, #262421 100%);
      font-family: 'Noto Sans', 'Segoe UI', Roboto, Arial, sans-serif; color: #e8e6e3;
      display: flex; align-items: center; padding: 0 48px;
    }
    .left { width: 54%; z-index: 2; display: flex; flex-direction: column; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 16px; }
    .logo { width: 84px; height: 84px; border-radius: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .app-name { font-size: 38px; font-weight: 800; color: #ffffff; line-height: 1.08; letter-spacing: -0.02em; }
    .tag { font-size: 21px; font-weight: 600; color: #8fc04b; line-height: 1.3; }
    .badge {
      align-self: flex-start; background: #302e2b; border: 1.5px solid #3d3a36;
      color: #e8e6e3; font-size: 15px; font-weight: 700; padding: 7px 14px; border-radius: 6px;
    }
    .right { position: absolute; right: 24px; top: 26px; width: 440px; height: 470px; }
    .shot {
      position: absolute; border-radius: 22px; border: 5px solid #3d3a36;
      box-shadow: 0 24px 60px rgba(0,0,0,0.8); overflow: hidden; background: #161512;
    }
    .shot img { width: 100%; display: block; }
    .shot-back { width: 220px; right: 10px; top: 38px; transform: rotate(7deg); opacity: 0.92; }
    .shot-front { width: 245px; left: 10px; top: 6px; transform: rotate(-4deg); z-index: 2; }
  </style></head>
  <body>
    <div class="left">
      <div class="brand">
        <img class="logo" src="data:image/png;base64,${iconB64}" />
        <div class="app-name">Free Poker Trainer</div>
      </div>
      <div class="tag">${copy.bannerTag}</div>
      <div class="badge">${copy.bannerBadge}</div>
    </div>
    <div class="right">
      <div class="shot shot-back"><img src="data:image/png;base64,${leakB64}" /></div>
      <div class="shot shot-front"><img src="data:image/png;base64,${tableB64}" /></div>
    </div>
  </body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: outPath });
}

async function run() {
  writeTranslationsCsv();
  const iconB64 = fs.readFileSync(path.join(ROOT, 'public', 'icon-512.png')).toString('base64');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const rawDir = path.join(OUT, '_raw');
  fs.mkdirSync(rawDir, { recursive: true });
  const appPage = await browser.newPage();
  const clickSel = async (sel) => {
    await appPage.evaluate(s => { document.querySelector(s)?.click(); }, sel);
  };

  for (const l of LANGS) {
    console.log(`Capturing ${l.code} (${l.play})...`);
    await appPage.setViewport({ width: 412, height: 840, deviceScaleFactor: 2 });
    await appPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await wait(500);
    await appPage.evaluate(stats => {
      localStorage.setItem('poker_trainer_pro_v5', JSON.stringify(stats));
    }, seedStats(l.code));
    await appPage.reload({ waitUntil: 'domcontentloaded' });
    await wait(550);

    const langRaw = path.join(rawDir, l.code);
    const langShots = path.join(OUT, 'screenshots', l.code);
    const langBanner = path.join(OUT, 'banners', l.code);
    fs.mkdirSync(langRaw, { recursive: true });
    fs.mkdirSync(langShots, { recursive: true });
    fs.mkdirSync(langBanner, { recursive: true });

    // 1. Lobby
    await appPage.screenshot({ path: path.join(langRaw, '02_lobby.png') });

    // 2. Cash Table (real 6-max table)
    await clickSel('.cash-row');
    await wait(600);
    await appPage.screenshot({ path: path.join(langRaw, '01_table.png') });

    // Return to tabs
    await appPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await wait(450);

    // 3. Progress / Leak Map
    await clickSel('button[data-tab="progreso"]');
    await wait(350);
    await appPage.screenshot({ path: path.join(langRaw, '03_progress.png') });

    // 4. Flop Reports
    await clickSel('.progress-flops');
    await wait(500);
    await appPage.screenshot({ path: path.join(langRaw, '04_flops.png') });

    // 5. Range Builder
    await appPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await wait(450);
    await clickSel('.builder-row');
    await wait(400);
    // Paint a realistic UTG opening range using real mouse clicks
    const paintHands = ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', 'AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'AKo', 'AQo'];
    for (const h of paintHands) {
      const box = await appPage.evaluate(hand => {
        const el = document.querySelector(`.range-grid [data-hand="${hand}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, h);
      if (box) await appPage.mouse.click(box.x, box.y);
    }
    await wait(200);
    await appPage.screenshot({ path: path.join(langRaw, '05_ranges.png') });

    // Iteration 2: Compose 1080x1920 Google Play Phone Screenshots for this language
    const copy = COPY[l.code];
    const files = ['01_table.png', '02_lobby.png', '03_progress.png', '04_flops.png', '05_ranges.png'];
    for (let i = 0; i < files.length; i++) {
      await composeScreenshot(
        appPage,
        path.join(langRaw, files[i]),
        path.join(langShots, files[i]),
        copy.slides[i].h,
        copy.slides[i].s,
        1080,
        1920
      );
    }

    // Compose 1024x500 Feature Graphic Banner (ZERO AI — built from real screenshots + logo)
    const tableB64 = fs.readFileSync(path.join(langRaw, '01_table.png')).toString('base64');
    const leakB64 = fs.readFileSync(path.join(langRaw, '03_progress.png')).toString('base64');
    const bannerPath = path.join(langBanner, 'feature_graphic_1024x500.png');
    await composeBanner(appPage, iconB64, tableB64, leakB64, copy, bannerPath);
    if (l.code === 'en') {
      fs.copyFileSync(bannerPath, path.join(OUT, 'feature_graphic_1024x500.png'));
    }
  }

  // Tablet screenshots (1200x1920) in EN & ES
  const tabletDir = path.join(OUT, 'tablet');
  fs.mkdirSync(tabletDir, { recursive: true });
  for (const code of ['en', 'es']) {
    await appPage.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
    await appPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await wait(450);
    await appPage.evaluate(stats => localStorage.setItem('poker_trainer_pro_v5', JSON.stringify(stats)), seedStats(code));
    await appPage.reload({ waitUntil: 'domcontentloaded' });
    await wait(450);
    await clickSel('.cash-row');
    await wait(550);
    const rawTab = path.join(rawDir, `tablet_${code}.png`);
    await appPage.screenshot({ path: rawTab });
    await composeScreenshot(appPage, rawTab, path.join(tabletDir, `tablet_01_table_${code}.png`), COPY[code].slides[0].h, COPY[code].slides[0].s, 1200, 1920);
  }

  await browser.close();
  fs.rmSync(rawDir, { recursive: true, force: true });
  console.log('ALL PLAY STORE ASSETS GENERATED!');
}

run().catch(e => { console.error(e); process.exit(1); });
