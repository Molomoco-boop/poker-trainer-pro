import React, { useState } from 'react';
import { useGame } from '../context/useGame';
import { playChipSound } from '../utils/audio';
import { StakeLevel, LanguagePref } from '../types/poker';
import { ModalPortal } from '../components/ModalPortal';
import { Panel, Title, BtnFlat } from '../components/ui';
import { useBackLayer } from '../navigation/BackProvider';
import { useI18n, SUPPORTED_LANGS, LANG_LABELS } from '../i18n';

const STAKES: StakeLevel[] = ['NL2', 'NL5', 'NL10', 'NL25', 'NL50', 'NL100'];

const Segmented: React.FC<{ options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }> = ({ options, value, onChange }) => (
  <div className="flex border border-line rounded-[4px] overflow-hidden shrink-0">
    {options.map(o => (
      <button
        key={o.id}
        onClick={() => onChange(o.id)}
        className={`h-10 min-w-[52px] px-3 text-[13px] font-semibold ${value === o.id ? 'bg-acc text-white' : 'bg-panel2 text-txt'}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 min-h-[48px] px-3">
    <span className="text-[14px] text-hi">{label}</span>
    {children}
  </div>
);

export const ProfileView: React.FC = () => {
  const { stats, updatePreferences, resetAllStats, updateUserProfile, setStake } = useGame();
  const { t, pref, lang } = useI18n();
  const [confirm, setConfirm] = useState(false);
  useBackLayer(confirm, () => setConfirm(false));
  const [name, setName] = useState(stats.username);
  const prefs = stats.preferences;

  return (
    <div className="space-y-3 animate-fadeIn">
      <div>
        <Title>{t.player}</Title>
        <Panel className="p-3 flex items-center gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => updateUserProfile(name.trim() || 'Player', stats.email)}
            aria-label={t.player}
            className="flex-1 min-w-0 h-10 bg-bg border border-line rounded-[4px] px-2 text-[14px] text-hi"
          />
          <span className="text-right"><span className="block text-[10px] text-dim leading-none">Rating</span><span className="num text-[20px] font-semibold text-hi">{Math.round(stats.rating.r)}</span></span>
        </Panel>
        <div className="text-[11px] text-dim px-0.5 mt-1">{t.savedOnDevice}</div>
      </div>

      <div>
        <Title>{t.stakesEuro}</Title>
        <div className="grid grid-cols-6 gap-1">
          {STAKES.map(s => (
            <button key={s} onClick={() => setStake(s)} className={`h-10 rounded-[4px] text-[12px] font-semibold border ${stats.stake === s ? 'bg-acc border-acc text-white' : 'bg-panel border-line text-txt'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Title>{t.settings}</Title>
        <Panel className="divide-y divide-line">
          <Row label={t.language}>
            <select
              value={pref}
              aria-label={t.language}
              onChange={e => updatePreferences({ language: e.target.value as LanguagePref })}
              className="h-10 bg-panel2 border border-line rounded-[4px] px-2 text-[13px] font-semibold text-hi max-w-[175px]"
            >
              <option value="auto">{t.langAuto} ({LANG_LABELS[lang]})</option>
              {SUPPORTED_LANGS.map(code => (
                <option key={code} value={code}>{LANG_LABELS[code]}</option>
              ))}
            </select>
          </Row>
          <Row label={t.units}>
            <Segmented options={[{ id: 'bb', label: 'BB' }, { id: 'units', label: '€' }]} value={prefs.displayUnits} onChange={id => updatePreferences({ displayUnits: id as 'bb' | 'units' })} />
          </Row>
          <Row label={t.deck}>
            <Segmented options={[{ id: '4color', label: t.fourCol }, { id: '2color', label: t.twoCol }]} value={prefs.deckColorMode} onChange={id => updatePreferences({ deckColorMode: id as '4color' | '2color' })} />
          </Row>
          <Row label={`${t.sound} ${prefs.volume} %`}>
            <input
              type="range" min="0" max="100" value={prefs.volume} aria-label={t.sound}
              onChange={e => { const v = Number(e.target.value); updatePreferences({ volume: v, soundEnabled: v > 0 }); playChipSound(v); }}
              className="w-32 h-10 accent-[#3692e7]"
            />
          </Row>
          <Row label={t.haptics}>
            <Segmented options={[{ id: 'on', label: t.on }, { id: 'off', label: t.off }]} value={prefs.hapticsEnabled ? 'on' : 'off'} onChange={id => updatePreferences({ hapticsEnabled: id === 'on' })} />
          </Row>
        </Panel>
      </div>

      <BtnFlat onClick={() => setConfirm(true)} className="w-full !text-badtx">{t.eraseData}</BtnFlat>

      {confirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
            <Panel className="p-4 max-w-xs w-full space-y-3 text-center">
              <p className="text-[15px] text-hi">{t.eraseConfirm}</p>
              <div className="flex gap-2">
                <BtnFlat onClick={() => setConfirm(false)} className="flex-1">{t.cancel}</BtnFlat>
                <button onClick={() => { resetAllStats(); setConfirm(false); }} className="flex-1 h-11 rounded-[4px] bg-bad text-white font-semibold text-[14px]">{t.erase}</button>
              </div>
            </Panel>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
