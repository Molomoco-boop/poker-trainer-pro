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
    title: 'Free Poker Trainer: GTO 6-Max',
    short: 'Free 6-max GTO poker trainer: cash tables, ranges & math. Offline, no account.',
    bannerTag: '6-Max GTO Cash · Ranges · Leak Map · Math',
    bannerBadge: '100% Free · Offline · No Account',
    slides: [
      { h: 'Play 6-Max GTO Cash', s: 'Instant solver feedback on every street' },
      { h: 'Track Your True Rating', s: 'Daily sessions, cash bots & 60s sprint' },
      { h: 'Find & Fix Every Leak', s: 'Position × street accuracy heatmap' },
      { h: 'Master Flop Textures', s: 'C-bet & defense frequencies at a glance' },
      { h: 'Build Ranges 13×13', s: 'Paint & score your preflop ranges' }
    ],
    full: `Stop losing BB in tough spots. Train 6-Max No-Limit Hold'em with instant GTO solver feedback — 100% FREE, no ads, no subscriptions, and no account required.

Unlike expensive poker training apps that lock ranges and postflop spots behind monthly paywalls, Free Poker Trainer gives you full access offline on your device.

WHY PLAYERS SWITCH TO FREE POKER TRAINER
• 100% Free & No Account: Start training in 1 second. No login, no paywall, no ads.
• Saved Locally on Your Device: Your Glicko rating, hand history, and mistake queue stay private and offline.
• Honest Glicko Rating: Measure your real skill from a 12-spot placement test to advanced turn and river decisions.

COMPLETE 6-MAX TRAINING SUITE
• 6-Max Live Cash Table: Play full hands against GTO Regular, Tight/Nit, Loose/Recreational, Aggro, or Mixed opponents.
• Daily 10-Hand Session: Smart mix of your current curriculum topic, spaced-repetition reviews, and mixed spots.
• Leak Heatmap (Position × Street): Spot exactly where you lose EV (UTG to BB, Preflop to River) and drill those leaks directly.
• Flop Reports & Frequency Drills: Learn c-bet and defense frequencies across Ace-high, paired, rainbow, and monotone boards.
• 60-Second Open? Sprint: Test your preflop opening ranges under clock pressure (3 misses and out).
• Range Builder (13×13): Paint opening and defense ranges from memory and score your accuracy.
• Hand-by-Hand Review: Replay every cash hand street by street, filter errors, and mark doubts for spaced review.
• Built-in Poker Math & Tools: Interactive 13×13 Range Viewer, Pot Odds & Equity Calculator, Hand Rankings, MDF, Combos, and Outs drills.

BUILT FOR SERIOUS GRINDERS & LEARNERS
• Clean dark interface with 4-color or 2-color deck.
• Instant BB / € toggle across NL2, NL5, NL10, NL25, NL50, and NL100 stakes.
• Automatic language support in 10 languages.

Disclaimer: Free Poker Trainer is an educational poker strategy and probability trainer. It does not offer real-money gambling or cash prizes.`
  },
  es: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: 'Entrena póker 6-max GTO gratis: cash, rangos y mates. Sin anuncios ni cuenta.',
    bannerTag: 'Cash 6-Max GTO · Rangos · Fugas · Mates',
    bannerBadge: '100% Gratis · Offline · Sin Cuenta',
    slides: [
      { h: 'Mesa Cash 6-Max GTO', s: 'Feedback del solver tras cada decisión' },
      { h: 'Mide tu Nivel Real', s: 'Sesión diaria, bots cash y sprint 60s' },
      { h: 'Detecta y Corrige Fugas', s: 'Mapa de precisión por posición y calle' },
      { h: 'Domina Cada Flop', s: 'Frecuencias de C-bet y defensa al instante' },
      { h: 'Construye Rangos 13×13', s: 'Pinta y comprueba tus rangos preflop' }
    ],
    full: `Deja de regalar ciegas en spots difíciles. Entrena Texas Hold'em No-Limit 6-Max con feedback GTO al instante — 100% GRATIS, sin anuncios, sin suscripciones y sin crear cuenta.

A diferencia de otras apps que bloquean rangos y postflop tras pagos mensuales, Free Poker Trainer te da acceso completo offline en tu móvil.

¿POR QUÉ ELEGIR FREE POKER TRAINER?
• 100% Gratis y Sin Cuenta: Empieza en 1 segundo. Sin registro, sin muros de pago ni anuncios.
• Guardado en tu Dispositivo: Tu rating Glicko, historial de manos y repasos se guardan offline en tu móvil.
• Rating Glicko Real: Mide tu nivel desde el test inicial de 12 spots hasta decisiones avanzadas de turn y river.

MODOS DE ENTRENAMIENTO Y HERRAMIENTAS
• Mesa Cash 6-Max en vivo: Juega manos completas contra rivales GTO, Nits, Recreativos, Aggros o mesa mixta.
• Sesión Diaria de 10 Manos: Combina tu tema actual, repasos espaciados y spots mixtos.
• Mapa de Fugas (Posición × Calle): Detecta dónde pierdes EV (UTG a BB, Preflop a River) y entrénalo al momento.
• Informes de Flop: Aprende frecuencias de C-bet y defensa en boards con As, doblados, rainbow o monocolor.
• Sprint 60 s ¿Open?: Pon a prueba tus rangos preflop contrarreloj (3 fallos y fuera).
• Constructor de Rangos (13×13): Pinta rangos de apertura y defensa de memoria y evalúa tu precisión.
• Revisión de Manos: Repasa cada mano calle a calle, filtra errores y marca dudas para repaso.
• Matemáticas y Herramientas: Visor de rangos 13×13, Calculadora de Odds y Equity, Jerarquía, MDF, Combos y Outs.

Aviso: Free Poker Trainer es una app educativa de estrategia y matemáticas de póker. No incluye apuestas con dinero real ni premios monetarios.`
  },
  pt: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: 'Treine poker 6-max GTO grátis: mesas cash, ranges e matemática. Offline.',
    bannerTag: 'Cash 6-Max GTO · Ranges · Leaks · Mates',
    bannerBadge: '100% Grátis · Offline · Sem Conta',
    slides: [
      { h: 'Mesa Cash 6-Max GTO', s: 'Feedback do solver após cada jogada' },
      { h: 'Acompanhe seu Rating', s: 'Sessão diária, bots e sprint de 60s' },
      { h: 'Encontre seus Leaks', s: 'Mapa de precisão por posição e street' },
      { h: 'Domine Cada Flop', s: 'Frequências de C-bet e defesa' },
      { h: 'Monte Ranges 13×13', s: 'Pinte e teste seus ranges preflop' }
    ],
    full: `Domine o Texas Hold'em No-Limit 6-Max com um treinador GTO rápido — 100% GRÁTIS, sem anúncios, sem assinaturas e sem precisar criar conta.

• 100% Offline: Todo o progresso, rating Glicko e histórico de mãos ficam salvos no seu dispositivo.
• Mesa Cash 6-Max, Sessão Diária, Mapa de Leaks, Relatórios de Flop, Sprint 60s e Construtor de Ranges 13×13.`
  },
  fr: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: 'Entraîneur poker 6-max GTO gratuit : cash, ranges et maths. Hors ligne.',
    bannerTag: 'Cash 6-Max GTO · Ranges · Fuites · Maths',
    bannerBadge: '100% Gratuit · Hors Ligne · Sans Compte',
    slides: [
      { h: 'Table Cash 6-Max GTO', s: 'Analyse solver après chaque décision' },
      { h: 'Suivez Votre Niveau', s: 'Session du jour, bots et sprint 60s' },
      { h: 'Corrigez Vos Fuites', s: 'Carte de précision position × street' },
      { h: 'Maîtrisez Chaque Flop', s: 'Fréquences de C-bet et défense' },
      { h: 'Ranges 13×13', s: 'Dessinez vos ranges preflop de mémoire' }
    ],
    full: `Maîtrisez le Texas Hold'em No-Limit 6-Max avec un entraîneur GTO rapide — 100% GRATUIT, sans publicité, sans abonnement et sans création de compte.

• 100% Hors ligne : Votre classement Glicko, historique de mains et progression restent enregistrés sur votre appareil.
• Table Cash 6-Max, Session Quotidienne, Carte des Fuites, Rapports de Flop, Sprint 60s et Constructeur de Ranges 13×13.`
  },
  de: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: 'Kostenloser 6-Max GTO Poker-Trainer: Cash, Ranges & Mathe. Offline.',
    bannerTag: '6-Max GTO Cash · Ranges · Leaks · Mathe',
    bannerBadge: '100% Gratis · Offline · Kein Konto',
    slides: [
      { h: '6-Max GTO Cash-Tisch', s: 'Sofortiges Solver-Feedback pro Street' },
      { h: 'Echtes Glicko-Rating', s: 'Tages-Session, Bots & 60s-Sprint' },
      { h: 'Finde Jeden Leak', s: 'Position × Street Heatmap' },
      { h: 'Flop-Reports & C-Bet', s: 'Frequenzen auf jeder Textur' },
      { h: '13×13 Range-Builder', s: 'Preflop-Ranges aus dem Gedächtnis' }
    ],
    full: `Meistere 6-Max No-Limit Hold'em mit einem schnellen GTO-Pokertrainer — 100% KOSTENLOS, ohne Werbung, ohne Abo und ohne Konto.

• 100% Offline: Dein Glicko-Rating, Hand-Verlauf und Fortschritt werden lokal auf deinem Gerät gespeichert.
• 6-Max Cash-Tisch, Tages-Session, Leak-Heatmap, Flop-Reports, 60s Open?-Sprint und 13×13 Range-Builder.`
  },
  it: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: 'Trainer poker 6-max GTO gratis: tavoli cash, range e matematica. Offline.',
    bannerTag: 'Cash 6-Max GTO · Range · Leak · Matematica',
    bannerBadge: '100% Gratis · Offline · Senza Account',
    slides: [
      { h: 'Tavolo Cash 6-Max GTO', s: 'Feedback immediato dopo ogni scelta' },
      { h: 'Monitora il tuo Rating', s: 'Sessione giornaliera, bot e sprint 60s' },
      { h: 'Scopri i tuoi Leak', s: 'Mappa precisione posizione × street' },
      { h: 'Report Flop e C-Bet', s: 'Frequenze su ogni texture del board' },
      { h: 'Costruisci Range 13×13', s: 'Disegna e verifica i range preflop' }
    ],
    full: `Padroneggia il Texas Hold'em No-Limit 6-Max con un trainer GTO veloce — 100% GRATIS, senza pubblicità, senza abbonamenti e senza registrazione.

• 100% Offline: Rating Glicko, cronologia mani e progressi salvati localmente sul dispositivo.
• Tavolo Cash 6-Max, Sessione Giornaliera, Mappa Leak, Report Flop, Sprint 60s e Costruttore Range 13×13.`
  },
  ru: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: 'Бесплатный 6-max GTO покер-тренажёр: кэш, диапазоны и математика. Офлайн.',
    bannerTag: 'Кэш 6-Max GTO · Диапазоны · Лики',
    bannerBadge: '100% Бесплатно · Офлайн · Без аккаунта',
    slides: [
      { h: 'Кэш-стол 6-Max GTO', s: 'Мгновенный разбор солвера' },
      { h: 'Честный рейтинг Glicko', s: 'Дневная сессия, боты и спринт 60с' },
      { h: 'Карта ликов', s: 'Точность по позициям и улицам' },
      { h: 'Отчёты по флопу', s: 'Частоты конт-бета и защиты' },
      { h: 'Конструктор 13×13', s: 'Рисуй диапазоны по памяти' }
    ],
    full: `Освойте 6-Max No-Limit Hold'em с быстрым GTO-тренажёром — 100% БЕСПЛАТНО, без рекламы, без подписок и регистрации.

• 100% Офлайн: рейтинг Glicko, история раздач и прогресс сохраняются прямо на устройстве.
• Живой кэш-стол 6-Max, дневная сессия, карта ликов, отчёты по флопу, спринт 60 с и конструктор диапазонов 13×13.`
  },
  zh: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: '免费 6人桌 GTO 德州扑克训练器：常规桌、范围与赔率计算。离线免登录。',
    bannerTag: '6人桌 GTO 常规桌 · 范围 · 漏洞图 · 数学',
    bannerBadge: '100% 免费 · 离线 · 无需账号',
    slides: [
      { h: '6人桌 GTO 实战模拟', s: '每一步决策即时显示 Solver 频率' },
      { h: '真实 Glicko 积分', s: '每日训练、AI 对战与 60 秒冲刺' },
      { h: '精准定位漏洞', s: '位置 × 街次胜率热力图' },
      { h: '翻牌面策略报告', s: '掌握各类牌面的 C-bet 与防守频率' },
      { h: '13×13 范围构建器', s: '凭记忆绘制并检验翻前范围' }
    ],
    full: `100% 免费、无广告、免登录的 6人桌无限注德州扑克 GTO 训练器。

• 100% 离线本地保存：无需注册账号，积分、牌局复盘和进度安全保存在您的设备上。
• 6人桌常规桌实战、每日10手训练、漏洞热力图、翻牌报告、60秒开池冲刺及 13×13 范围构建器。`
  },
  ja: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: '無料の6-max GTOポーカートレーナー：キャッシュ、レンジ表、確率計算。オフライン対応。',
    bannerTag: '6-Max GTO キャッシュ · レンジ · リーク分析',
    bannerBadge: '完全無料 · オフライン · 登録不要',
    slides: [
      { h: '6-Max GTO キャッシュ戦', s: '毎アクション後にソルバー頻度を表示' },
      { h: 'Glicko レート計測', s: 'デイリー練習・AI対戦・60秒スプリント' },
      { h: 'リークを可視化', s: 'ポジション×ストリート別ヒートマップ' },
      { h: 'フロップ別戦略ガイド', s: 'CB頻度とディフェンスを一目で理解' },
      { h: '13×13 レンジ作成', s: '記憶でプリフロップレンジを塗って採点' }
    ],
    full: `完全無料・広告なし・アカウント登録不要・オフライン対応の本格 6-Max GTO ポーカートレーナー。

• 端末ローカル保存：レート、ハンド履歴、復習リストはすべて端末内に保存されます。
• 6-Max キャッシュテーブル、デイリー10ハンド、リーク分析、フロップレポート、60秒スプリント、13×13レンジ作成を搭載。`
  },
  ko: {
    title: 'Free Poker Trainer: GTO 6-Max',
    short: '무료 6-max GTO 포커 트레이너: 캐시 게임, 레인지, 확률 계산. 오프라인 지원.',
    bannerTag: '6-Max GTO 캐시 · 레인지 · 리크 분석',
    bannerBadge: '100% 무료 · 오프라인 · 계정 불필요',
    slides: [
      { h: '6-Max GTO 캐시 테이블', s: '모든 결정 직후 솔버 빈도 즉시 확인' },
      { h: '실제 Glicko 레이팅', s: '일일 훈련, 봇 대전 & 60초 스프린트' },
      { h: '리크 히트맵 분석', s: '포지션 × 스트리트별 정확도 확인' },
      { h: '플랍 리포트 가이드', s: '보드별 C-bet 및 방어 빈도 마스터' },
      { h: '13×13 레인지 빌더', s: '기억으로 프리플랍 레인지 그리기' }
    ],
    full: `완전 무료·광고 없음·회원가입 없이 오프라인으로 즐기는 6-Max 노리미트 홀덤 GTO 트레이너.

• 100% 기기 로컬 저장: 레이팅, 핸드 기록, 복습 내역이 기기에 안전하게 저장됩니다.
• 6-Max 캐시 게임, 일일 10핸드 훈련, 리크 히트맵, 플랍 리포트, 60초 스프린트, 13×13 레인지 빌더 제공.`
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
