import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  User,
  Volume2,
  VolumeX,
  Coins,
  Palette,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { playChipSound, triggerHaptic } from '../utils/audio';
import {
  STAKE_CONFIG,
  PEDAGOGICAL_LEVEL_NAMES,
  StakeLevel,
  PedagogicalLevel,
  OpponentProfile
} from '../types/poker';

export const ProfileView: React.FC = () => {
  const {
    stats,
    updatePreferences,
    resetAllStats,
    updateUserProfile,
    setStake,
    setPedagogicalLevel,
    setOpponentProfile
  } = useGame();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(stats.username);
  const [tempEmail, setTempEmail] = useState(stats.email);
  const [onlyErrorsFilter, setOnlyErrorsFilter] = useState(false);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    updatePreferences({ volume: vol, soundEnabled: vol > 0 });
    playChipSound(vol);
  };

  const handleSaveProfile = () => {
    updateUserProfile(tempName, tempEmail);
    setIsEditingProfile(false);
  };

  const isBB = stats.preferences.displayUnits === 'bb';
  const is4Color = stats.preferences.deckColorMode === '4color';

  const stakes: StakeLevel[] = ['NL2', 'NL5', 'NL10', 'NL25', 'NL50', 'NL100'];
  const pedagogicalLevels: PedagogicalLevel[] = [1, 2, 3, 4];

  const sessionHistory = stats.sessionHands || [];
  const filteredSession = onlyErrorsFilter
    ? sessionHistory.filter(h => h.verdict === 'error')
    : sessionHistory;

  return (
    <div className="space-y-4 pb-20 animate-fadeIn select-none font-sans">
      
      {/* 1. Account Info Card */}
      <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#175eff]/15 border border-[#175eff]/30 flex items-center justify-center text-[#175eff] shrink-0">
            <User className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            {isEditingProfile ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
                  placeholder="Username"
                />
                <input
                  type="email"
                  value={tempEmail}
                  onChange={e => setTempEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                  placeholder="Email"
                />
                <button
                  onClick={handleSaveProfile}
                  className="text-[11px] px-3 py-1 bg-[#175eff] text-white rounded font-bold"
                >
                  Guardar
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-base font-[800] text-white tracking-wide truncate">
                  {stats.username}
                </h2>
                <p className="text-xs text-slate-400 truncate">{stats.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold">
                    {stats.stake}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 font-bold">
                    {PEDAGOGICAL_LEVEL_NAMES[stats.pedagogicalLevel].name.split(' - ')[0]}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons: Edit Profile & Delete */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="flex-1 py-1.5 px-3 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/50 text-xs font-semibold transition-all active:scale-95"
          >
            {isEditingProfile ? 'Cancelar' : 'Editar perfil'}
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex-1 py-1.5 px-3 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all active:scale-95"
          >
            Reiniciar datos
          </button>
        </div>
      </div>

      {/* 2. Poker Strategy Preferences */}
      <div className="space-y-2">
        <div className="mb-1">
          <h3 className="text-sm font-[800] text-white">Configuración de Estrategia</h3>
        </div>

        {/* Stake Selector */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Stake Activo</span>
            <span className="text-xs font-mono text-blue-400 font-bold">{STAKE_CONFIG[stats.stake].label}</span>
          </div>
          <div className="grid grid-cols-6 gap-1 pt-1">
            {stakes.map(stk => (
              <button
                key={stk}
                onClick={() => setStake(stk)}
                className={`py-1.5 rounded-lg text-xs font-black border transition-all ${
                  stats.stake === stk
                    ? 'bg-blue-600 border-blue-400 text-white shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {stk}
              </button>
            ))}
          </div>
        </div>

        {/* Pedagogical Level */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Dificultad Pedagógica</span>
            <span className="text-xs text-sky-400 font-bold">
              {PEDAGOGICAL_LEVEL_NAMES[stats.pedagogicalLevel].name}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {pedagogicalLevels.map(lvl => (
              <button
                key={lvl}
                onClick={() => setPedagogicalLevel(lvl)}
                className={`py-2 rounded-xl text-xs font-black border transition-all ${
                  stats.pedagogicalLevel === lvl
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Nivel {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Opponent Profile */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2">
          <span className="text-xs font-bold text-white block">Perfil de Rivales Simulado</span>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => setOpponentProfile('gto_balanced')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                stats.opponentProfile === 'gto_balanced'
                  ? 'bg-blue-600 border-blue-400 text-white shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              GTO Equilibrado
            </button>
            <button
              onClick={() => setOpponentProfile('micro_exploitative')}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                stats.opponentProfile === 'micro_exploitative'
                  ? 'bg-blue-600 border-blue-400 text-white shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Microlímites Explotativo
            </button>
          </div>
        </div>
      </div>

      {/* 3. Display & Gameplay Preferences */}
      <div className="space-y-2">
        <div className="mb-1">
          <h3 className="text-sm font-[800] text-white">Visualización y Audio</h3>
        </div>

        {/* Currency Switch: BB vs Euros (€) */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">Visualización de Apuestas</span>
            </div>
            <span className="text-xs font-semibold text-blue-400">
              {isBB ? 'Ciegas Grandes (BB)' : 'Euros (€)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => updatePreferences({ displayUnits: 'bb' })}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                isBB
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              BB (Big Blinds)
            </button>
            <button
              onClick={() => updatePreferences({ displayUnits: 'units' })}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                !isBB
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Unidades (€)
            </button>
          </div>
        </div>

        {/* 4-Color vs 2-Color Deck */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white">Paleta de Baraja</span>
            </div>
            <span className="text-xs font-semibold text-sky-400">
              {is4Color ? '4 Colores (GTO)' : '2 Colores (Clásica)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => updatePreferences({ deckColorMode: '4color' })}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                is4Color
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>♠♥♦♣ 4 Colores</span>
            </button>
            <button
              onClick={() => updatePreferences({ deckColorMode: '2color' })}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                !is4Color
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>♠♥ 2 Colores</span>
            </button>
          </div>
        </div>

        {/* Show Hand Strength Toggle */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white">Nombre de jugada</h4>
            <p className="text-[11px] text-slate-400">Muestra "Doble Pareja", "Color", etc.</p>
          </div>

          <button
            onClick={() => updatePreferences({ showHandStrength: !stats.preferences.showHandStrength })}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
              stats.preferences.showHandStrength ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                stats.preferences.showHandStrength ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Volume Slider Card */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Volumen</span>
            <span className="text-xs text-slate-400 font-bold">{stats.preferences.volume}%</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min="0"
              max="100"
              value={stats.preferences.volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
            />
            <Volume2 className="w-4 h-4 text-[#2563EB] shrink-0" />
          </div>
        </div>

        {/* Haptics Toggle */}
        <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white">Vibración Háptica</h4>
            <p className="text-[11px] text-slate-400">Vibración al responder</p>
          </div>

          <button
            onClick={() => updatePreferences({ hapticsEnabled: !stats.preferences.hapticsEnabled })}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
              stats.preferences.hapticsEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                stats.preferences.hapticsEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 4. Session History */}
      <div className="bg-[#121929] border border-slate-800/90 rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-[800] text-white">Historial de Sesión</h3>
            <p className="text-[11px] text-slate-400">Últimas {sessionHistory.length} decisiones</p>
          </div>

          <button
            onClick={() => setOnlyErrorsFilter(!onlyErrorsFilter)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all ${
              onlyErrorsFilter
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Solo errores</span>
          </button>
        </div>

        {filteredSession.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs bg-slate-900/60 rounded-xl">
            {onlyErrorsFilter ? 'Sin errores en la sesión actual.' : 'No has jugado manos todavía.'}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {filteredSession.map(h => (
              <div
                key={h.id}
                className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white text-[11px]">{h.handName}</div>
                  <div className="text-[10px] text-slate-400">
                    {h.position} · {h.street.toUpperCase()} · {h.userAnswer}
                  </div>
                </div>

                <span className={`font-mono font-bold text-xs ${h.evDiffNum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {h.evDiffNum >= 0 ? `+${h.evDiffNum.toFixed(2)}` : h.evDiffNum.toFixed(2)} BB
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0e1422] border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">¿Reiniciar todas las estadísticas?</h3>
            <p className="text-xs text-slate-400">
              Esta acción borrará todos tus registros, historial de manos y progreso acumulado.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetAllStats();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Sí, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
