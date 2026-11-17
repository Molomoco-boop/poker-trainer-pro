# Poker Trainer Pro — Documentación de Traspaso para Grokbot

Este documento contiene toda la información técnica, arquitectónica y de diseño para que el agente **Grokbot** continúe el desarrollo y refinamiento de **Poker Trainer Pro**.

---

## 📌 1. Visión del Proyecto y Stack Tecnológico

- **Propósito**: Entrenador móvil profesional de póker Texas Hold'em 6-Max No-Limit Cash (estilo GTO Wizard / GGPoker), sin estética "IA", con lógica GTO rigurosa y respuesta ultra-rápida.
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4.
- **Móvil / Wrapper**: Capacitor 8 (Android nativo).
- **Audio**: Web Audio API sintetizado proceduralmente (sin assets pesados de audio).
- **Almacenamiento**: LocalStorage mediante React Context (`GameContext.tsx`).
- **Target móvil**: Viewports de 360px a 430px de ancho (`100dvh`), compatible con safe areas (notch y barra de gestos).

---

## 📂 2. Arquitectura de Archivos

```
src/
├── types/
│   └── poker.ts               # Tipos principales: HandStep, PlayerState, DecisionOption, etc.
├── context/
│   └── GameContext.tsx         # Estado global: stats, historial, stakes, persistencia.
├── views/
│   ├── LobbyView.tsx          # Pantalla de inicio (Daily Drill, Categorías, Herramientas).
│   ├── CategoryView.tsx       # Subcategorías (Simulator, Math, Fundamentals).
│   ├── PracticeView.tsx       # Orquestador del juego/drill con auto-avance snappy.
│   └── ProfileView.tsx        # Perfil, configuración de stakes, moneda (€/BB) y audio.
├── components/
│   ├── PokerTable.tsx         # Mesa de juego 6-Max (Header, Tapete, Panel de Decisión).
│   ├── CardView.tsx           # Renderizado de cartas 2-color o 4-color con jumbo index.
│   ├── Header.tsx             # Cabecera superior con safe-area padding.
│   ├── BottomNav.tsx          # Barra de navegación inferior con safe-area padding.
│   ├── RangeViewerModal.tsx   # Visor de rangos 13×13 (169 combos).
│   ├── OddsCalculatorModal.tsx# Calculadora visual de outs y pot odds.
│   ├── StatsMistakesModal.tsx # Historial de precisión y errores.
│   ├── LevelSettingsModal.tsx # Selector de nivel de dificultad y stake monetario.
│   ├── CustomizeSetupModal.tsx# Configuración de formato de juego (6-max, stacks).
│   ├── GameplanModal.tsx      # Matriz de estrategia postflop por texturas.
│   ├── ToolsSection.tsx       # Acceso rápido a herramientas de análisis.
│   └── TrainingCategories.tsx # Lista de categorías principales.
├── utils/
│   ├── fullHandEngine.ts      # Generador de manos completas preflop/postflop y drills.
│   ├── pokerEvaluator.ts      # Evaluador de combinaciones de póker de 5 y 7 cartas.
│   ├── audio.ts               # Síntesis Web Audio (reparto, fichas, acierto/fallo).
│   ├── difficultyEngine.ts    # Conversión monetaria (€ / BB) y control de dificultad.
│   └── pokerMath.ts           # Fórmulas de Pot Odds, SPR y Equity.
└── data/
    ├── preflopRanges.ts       # Tablas de rangos GTO (RFI, defensa, 3-bet).
    └── questionGenerator.ts   # Generador de preguntas procedimentales.
```

---

## 🃏 3. Reglas Críticas de Lógica de Póker Implementadas

1. **Orden Circular de Asientos 6-Max**:
   - Orden horario fijo: `["UTG", "HJ", "CO", "BTN", "SB", "BB"]`.
   - El Hero siempre ocupa el Asiento 0 (abajo centro, posición 6 en punto).
   - El botón de Dealer ("D") está siempre anclado al asiento con la etiqueta `"BTN"`.

2. **Unidades de Apuesta y Conversión (€ / BB)**:
   - Configuración de Stakes:
     - `NL2`: 1 BB = 0.02 €
     - `NL5`: 1 BB = 0.05 €
     - `NL10`: 1 BB = 0.10 €
     - `NL25`: 1 BB = 0.25 €
     - `NL50`: 1 BB = 0.50 €
     - `NL100`: 1 BB = 1.00 €
   - El botón `[ BB | € ]` en la mesa conmuta instantáneamente entre ciegas y valor en euros.

3. **Cálculo de Call e Inversión**:
   - Para pagar (`CALL`), se descuenta lo ya invertido por el jugador en la calle activa. Ejemplo: Hero en BB (1 BB invertida) contra subida a 2.5 BB paga exactamente `1.5 BB`.

4. **Flujo de Feedback**:
   - **Acierto**: Flash verde sutil y auto-avance automático tras 750ms.
   - **Error / Mixta**: Ficha compacta directa que **NUNCA** requiere scroll. Muestra el veredicto, el movimiento óptimo, la barra horizontal del solver GTO y el botón grande `SIGUIENTE →`.

---

## 🎨 4. Directrices de Diseño UI/UX Móvil

- **Sin estética IA**: Se eliminaron títulos verbose, emojis decorativos innecesarios, chips tridimensionales artificiales y badges redundantes.
- **Tipografía y Legibilidad**: Números de stacks y bote en `font-black` de alto contraste sobre fondos oscuros limpios.
- **Safe Areas**: Uso de `.safe-top` y `.safe-bottom` (`env(safe-area-inset-*)`) para evitar solapamientos con el notch de cámara y la barra de navegación de Android/iOS.

---

## 🛠️ 5. Comandos de Desarrollo y Compilación

### Servidor Local
```bash
npm install
npm run dev
```
Acceso en navegador: `http://localhost:5173/`

### Build Web de Producción
```bash
npm run build
```

### Compilar e Instalar en Dispositivo Android (vía USB)
El script automatizado en la raíz del proyecto es `build_and_install.bat`:
```cmd
build_and_install.bat
```
*(Requiere Android SDK y Java JDK configurados en el sistema).*

---

## 🎯 6. Tareas Pendientes Prioritarias para Grokbot

1. **Refinamiento del Evaluador Postflop (`fullHandEngine.ts`)**:
   - Añadir soporte para texturas de board más complejas (boards monocolor, emparejados dobles).
   - Ajustar las frecuencias de C-bet en boards dinámicos vs secos según las tablas GTO de PioSolver/GTO Wizard.

2. **Personalización Avanzada de Mesas**:
   - Permitir al usuario cambiar el color del tapete (Azul Medianoche, Verde Clásico, Negro Carbón).

3. **Modo Quiz / Examen Cronometrado**:
   - Añadir una modalidad opcional de contrarreloj (e.g. 60 segundos para responder la mayor cantidad de manos posibles).
