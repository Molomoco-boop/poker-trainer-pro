import React, { useState } from 'react';
import { useGame } from '../context/useGame';
import { User, AlertTriangle, ChevronRight, Pencil } from 'lucide-react';
import { playChipSound } from '../utils/audio';
import { STAKE_CONFIG, PEDAGOGICAL_LEVEL_NAMES, StakeLevel, PedagogicalLevel } from '../types/poker';
import { ModalPortal } from '../components/ModalPortal';
import { StatsMistakesModal } from '../components/StatsMistakesModal';

const STAKES: StakeLevel[] = ['NL2', 'NL5', 'NL10', 'NL25', 'NL50', 'NL100'];
const LEVELS: PedagogicalLevel[] = [1, 2, 3, 4];

const Segmented: React.FC<{ options: { id: string; label: string }[]; value: string; onChange: (id: string) => void }> = ({ options, value, onChange }) => (
  <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 shrink-0">
    {options.map(o => (
      <button
        key={o.id}
        onClick={() => onChange(o.id)}
        className={`h-10 min-w-[52px] px-3 rounded-[10px] text-xs font-bold transition-all ${value === o.id ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Toggle: React.FC<{ on: boolean; onClick: () => void; label: string }> = ({ on, onClick, label }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`w-12 h-10 border-y-8 border-transparent bg-clip-padding rounded-full transition-colors relative shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-700'}`}
  >
    <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${on ? 'left-7' : 'left-1'}`} />
  </button>
);

const Row: React.FC<{ label: string; sub?: string; children: React.ReactNode }> = ({ label, sub, children }) => (
  <div className="flex items-center justify-between gap-3 min-h-[44px]">
    <div className="min-w-0">
      <div className="text-xs font-bold text-white">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 truncate">{sub}</div>}
    </div>
    {children}
  </div>
);

export const ProfileView: React.FC = () => {
  const { stats, updatePreferences, resetAllStats, updateUserProfile, setStake, setPedagogicalLevel } = useGame();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(stats.username);
  const [tempEmail, setTempEmail] = useState(stats.email);
  const prefs = stats.preferences;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    updatePreferences({ volume: vol, soundEnabled: vol > 0 });
    playChipSound(vol);
  };

  const card = 'bg-[#121929] border border-slate-800/90 rounded-2xl px-3.5 py-2.5 shadow-sm';

  return (
    <div className="space-y-2.5 animate-fadeIn select-none font-sans">
      {/* Cuenta */}
      <div className={card}>
        {isEditingProfile ? (
          <div className="space-y-1.5">
            <input value={tempName} onChange={e => setTempName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg h-10 px-2 text-xs text-white font-bold" placeholder="Nombre" />
            <input type="email" value={tempEmail} onChange={e => setTempEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg h-10 px-2 text-xs text-slate-300" placeholder="Correo" />
            <div className="flex gap-2">
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 h-10 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">Cancelar</button>
              <button onClick={() => { updateUserProfile(tempName, tempEmail); setIsEditingProfile(false); }} className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-xs font-bold">Guardar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#175eff]/15 border border-[#175eff]/30 flex items-center justify-center text-[#175eff] shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-[800] text-white truncate">{stats.username}</h2>
              <p className="text-[11px] text-slate-400 truncate">{stats.email || `${stats.stake} · ${PEDAGOGICAL_LEVEL_NAMES[stats.pedagogicalLevel].name}`}</p>
            </div>
            <button onClick={() => { setTempName(stats.username); setTempEmail(stats.email); setIsEditingProfile(true); }} aria-label="Editar perfil" className="w-10 h-10 rounded-full border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Estrategia */}
      <div className={`${card} space-y-2`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">Stake</span>
          <span className="text-[11px] font-mono text-blue-400 font-bold">{STAKE_CONFIG[stats.stake].label}</span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {STAKES.map(stk => (
            <button key={stk} onClick={() => setStake(stk)} className={`h-10 rounded-lg text-[11px] font-black border transition-all ${stats.stake === stk ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              {stk}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-white">Nivel</span>
          <span className="text-[11px] text-sky-400 font-bold truncate ml-2">{PEDAGOGICAL_LEVEL_NAMES[stats.pedagogicalLevel].name} · {PEDAGOGICAL_LEVEL_NAMES[stats.pedagogicalLevel].desc}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {LEVELS.map(lvl => (
            <button key={lvl} onClick={() => setPedagogicalLevel(lvl)} className={`h-10 rounded-lg text-xs font-black border transition-all ${stats.pedagogicalLevel === lvl ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Visualización y sonido */}
      <div className={`${card} divide-y divide-slate-800/80`}>
        <Row label="Unidades">
          <Segmented options={[{ id: 'bb', label: 'BB' }, { id: 'units', label: '€' }]} value={prefs.displayUnits} onChange={id => updatePreferences({ displayUnits: id as 'bb' | 'units' })} />
        </Row>
        <Row label="Baraja">
          <Segmented options={[{ id: '4color', label: '4 colores' }, { id: '2color', label: '2 colores' }]} value={prefs.deckColorMode} onChange={id => updatePreferences({ deckColorMode: id as '4color' | '2color' })} />
        </Row>
        <Row label={`Volumen ${prefs.volume}%`}>
          <input type="range" min="0" max="100" value={prefs.volume} onChange={handleVolumeChange} aria-label="Volumen" className="w-36 h-10 cursor-pointer accent-[#2563EB]" />
        </Row>
        <Row label="Vibración">
          <Toggle label="Vibración" on={prefs.hapticsEnabled} onClick={() => updatePreferences({ hapticsEnabled: !prefs.hapticsEnabled })} />
        </Row>
      </div>

      {/* Historial y datos */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setShowHistory(true)} className="h-11 rounded-2xl bg-[#121929] border border-slate-800/90 text-xs font-bold text-slate-200 flex items-center justify-center gap-1">
          Historial <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
        <button onClick={() => setShowResetConfirm(true)} className="h-11 rounded-2xl border border-red-500/40 text-red-400 text-xs font-bold">
          Reiniciar datos
        </button>
      </div>

      {showHistory && <StatsMistakesModal onClose={() => setShowHistory(false)} />}

      {showResetConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0e1422] border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">¿Borrar todos los datos?</h3>
              <p className="text-xs text-slate-400">Estadísticas, errores e historial.</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 h-11 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold">Cancelar</button>
                <button onClick={() => { resetAllStats(); setShowResetConfirm(false); }} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-xs font-bold">Borrar</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
