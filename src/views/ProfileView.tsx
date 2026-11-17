import React, { useState } from 'react';
import { useGame } from '../context/useGame';
import { playChipSound } from '../utils/audio';
import { StakeLevel } from '../types/poker';
import { ModalPortal } from '../components/ModalPortal';
import { Panel, Title, BtnFlat } from '../components/ui';

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
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(stats.username);
  const prefs = stats.preferences;

  return (
    <div className="space-y-3 animate-fadeIn">
      <div>
        <Title>Jugador</Title>
        <Panel className="p-3 flex items-center gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => updateUserProfile(name.trim() || 'Jugador', stats.email)}
            aria-label="Nombre"
            className="flex-1 min-w-0 h-10 bg-bg border border-line rounded-[4px] px-2 text-[14px] text-hi"
          />
          <span className="num text-[20px] font-semibold text-hi">{Math.round(stats.rating.r)}</span>
        </Panel>
      </div>

      <div>
        <Title>Stake para mostrar €</Title>
        <div className="grid grid-cols-6 gap-1">
          {STAKES.map(s => (
            <button key={s} onClick={() => setStake(s)} className={`h-10 rounded-[4px] text-[12px] font-semibold border ${stats.stake === s ? 'bg-acc border-acc text-white' : 'bg-panel border-line text-txt'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Title>Ajustes</Title>
        <Panel className="divide-y divide-line">
          <Row label="Unidades">
            <Segmented options={[{ id: 'bb', label: 'BB' }, { id: 'units', label: '€' }]} value={prefs.displayUnits} onChange={id => updatePreferences({ displayUnits: id as 'bb' | 'units' })} />
          </Row>
          <Row label="Baraja">
            <Segmented options={[{ id: '4color', label: '4 col.' }, { id: '2color', label: '2 col.' }]} value={prefs.deckColorMode} onChange={id => updatePreferences({ deckColorMode: id as '4color' | '2color' })} />
          </Row>
          <Row label={`Sonido ${prefs.volume} %`}>
            <input
              type="range" min="0" max="100" value={prefs.volume} aria-label="Volumen"
              onChange={e => { const v = Number(e.target.value); updatePreferences({ volume: v, soundEnabled: v > 0 }); playChipSound(v); }}
              className="w-32 h-10 accent-[#3692e7]"
            />
          </Row>
          <Row label="Vibración">
            <Segmented options={[{ id: 'on', label: 'Sí' }, { id: 'off', label: 'No' }]} value={prefs.hapticsEnabled ? 'on' : 'off'} onChange={id => updatePreferences({ hapticsEnabled: id === 'on' })} />
          </Row>
        </Panel>
      </div>

      <BtnFlat onClick={() => setConfirm(true)} className="w-full !text-badtx">Borrar datos</BtnFlat>

      {confirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
            <Panel className="p-4 max-w-xs w-full space-y-3 text-center">
              <p className="text-[15px] text-hi">¿Borrar rating, historial y repasos?</p>
              <div className="flex gap-2">
                <BtnFlat onClick={() => setConfirm(false)} className="flex-1">Cancelar</BtnFlat>
                <button onClick={() => { resetAllStats(); setConfirm(false); }} className="flex-1 h-11 rounded-[4px] bg-bad text-white font-semibold text-[14px]">Borrar</button>
              </div>
            </Panel>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
