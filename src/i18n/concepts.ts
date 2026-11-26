import { ConceptId, CONCEPT_ES, CONCEPT_DESC, SupportedLang } from '../types/poker';

const CONCEPT_TITLES: Partial<Record<SupportedLang, Record<ConceptId, string>>> = {
  en: CONCEPT_ES,
  es: {
    rfi_early: 'Open UTG/HJ',
    rfi_late: 'Open CO/BTN/SB',
    bb_def: 'Defensa de BB',
    sb_3b: 'SB vs open',
    vs3b: 'Vs 3-bet',
    cbet: 'C-bet flop',
    flop_def: 'Flop sin iniciativa',
    turn: 'Turn',
    river: 'River',
    m_mdf: 'MDF',
    m_bluff: 'Faroles',
    m_combos: 'Combos',
    m_equity: 'Equity vs rango',
    m_odds: 'Pot odds',
    m_outs: 'Outs',
    m_ev: 'EV'
  },
  pt: {
    rfi_early: 'Open UTG/HJ',
    rfi_late: 'Open CO/BTN/SB',
    bb_def: 'Defesa de BB',
    sb_3b: 'SB vs open',
    vs3b: 'Vs 3-bet',
    cbet: 'C-bet flop',
    flop_def: 'Flop sem iniciativa',
    turn: 'Turn',
    river: 'River',
    m_mdf: 'MDF',
    m_bluff: 'Blefes',
    m_combos: 'Combos',
    m_equity: 'Equity vs range',
    m_odds: 'Pot odds',
    m_outs: 'Outs',
    m_ev: 'EV'
  },
  fr: {
    rfi_early: 'Open UTG/HJ',
    rfi_late: 'Open CO/BTN/SB',
    bb_def: 'Défense BB',
    sb_3b: 'SB vs open',
    vs3b: 'Vs 3-bet',
    cbet: 'C-bet flop',
    flop_def: 'Flop sans initiative',
    turn: 'Turn',
    river: 'River',
    m_mdf: 'MDF',
    m_bluff: 'Bluffs',
    m_combos: 'Combos',
    m_equity: 'Équité vs range',
    m_odds: 'Cotes du pot',
    m_outs: 'Outs',
    m_ev: 'EV'
  },
  de: {
    rfi_early: 'Open UTG/HJ',
    rfi_late: 'Open CO/BTN/SB',
    bb_def: 'BB Defense',
    sb_3b: 'SB vs Open',
    vs3b: 'Vs 3-Bet',
    cbet: 'C-Bet Flop',
    flop_def: 'Flop ohne Initiative',
    turn: 'Turn',
    river: 'River',
    m_mdf: 'MDF',
    m_bluff: 'Bluffs',
    m_combos: 'Combos',
    m_equity: 'Equity vs Range',
    m_odds: 'Pot Odds',
    m_outs: 'Outs',
    m_ev: 'EV'
  }
};

const CONCEPT_DESCS: Partial<Record<SupportedLang, Record<ConceptId, string>>> = {
  en: CONCEPT_DESC,
  es: {
    rfi_early: 'Abrir desde posición temprana cuando llega limpio',
    rfi_late: 'Abrir desde cutoff, botón o ciega pequeña',
    bb_def: 'BB: pagar o hacer 3-bet ante una subida',
    sb_3b: 'SB vs subida: hacer 3-bet o foldear',
    vs3b: 'Abriste y te hicieron 3-bet: pagar, 4-bet o fold',
    cbet: 'Subiste preflop: ¿haces C-bet en el flop?',
    flop_def: 'Pagaste preflop y enfrentas una C-bet',
    turn: 'Cuarta carta: continuar, pagar o rendirse',
    river: 'Última carta: valor, farol o bluff-catch',
    m_mdf: 'Frecuencia mínima de defensa para no regalar faroles',
    m_bluff: 'Cuántos faroles incluir en tu rango de apuesta en river',
    m_combos: 'Contar combinaciones quitando tus cartas y el board',
    m_equity: 'Tu % de equity contra el rango del rival',
    m_odds: 'Qué % de equity necesitas para pagar una apuesta',
    m_outs: 'Cartas que mejoran tu mano a la mejor y su %',
    m_ev: 'Valor esperado de una jugada de media'
  }
};

export function conceptTitle(c: ConceptId, lang: SupportedLang): string {
  return CONCEPT_TITLES[lang]?.[c] || CONCEPT_ES[c];
}

export function conceptDesc(c: ConceptId, lang: SupportedLang): string {
  return CONCEPT_DESCS[lang]?.[c] || CONCEPT_DESC[c];
}
