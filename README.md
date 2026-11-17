# Poker Trainer · GTO Simulator & Training App

Una aplicación de entrenamiento de póker profesional, minimalista, **100% gratuita, sin anuncios y sin muros de pago**.

---

## 🚀 Características Principales

### 1. Dos Pestañas de Navegación (Inferior)
- **Inicio**: Lobby principal con estadísticas diarias, Daily Drill, categorías de entrenamiento y herramientas.
- **Perfil**: Configuración de audio, velocidad de animaciones, personalización de tapete de la mesa, reseteo de niveles y estado de cuenta **PRO Gratis de por vida**.

### 2. Estructura Exacta y Sin Tutoriales
- **Simulator**:
  - `Full hand` (Mano completa calle por calle)
  - `Preflop` (Rangos de Open-Raise, Defensa y 3-Bet)
  - `Postflop` (C-Betting, Bluff Catching, Sizing y Turn/River)
  - Tarjeta de **Decision Accuracy (90% GTO)** con historial de errores y estadísticas.
  - **Customize setup**: 6-max, Cash 100bb, MTT, etc.
  - **Gameplan**: Matriz de estrategia postflop para texturas secas, coordinadas y sizings.
- **Poker Math**:
  - `Odds`: Cálculo de Pot Odds en % y en ratio (3:1, 4:1, etc.).
  - `Equity`: Regla del 2 y del 4, proyectos de color (9 outs), escaleras (8 y 4 outs), combos.
  - `EV`: Valor esperado exacto en euros/BB y decisiones +EV vs -EV.
- **Fundamentals**:
  - `Hand ranking`: Comparación de jerarquías oficiales y desempate por kicker.
  - `Best hand`: Identificación de la mejor mano de 5 cartas en el board.

### 3. Sistema de 10 Niveles por Apartado
Cada una de las 8 subcategorías cuenta con un selector de **10 niveles** (de más novato a High Roller GTO):
1. Principiante Bronce
2. Principiante Plata
3. Principiante Oro
4. Intermedio Bronce
5. Intermedio Plata
6. Intermedio Oro
7. Avanzado Bronce
8. Avanzado Plata
9. Maestro Pro
10. High Roller GTO

- **Libre elección**: Puedes saltar a cualquier nivel en cualquier momento.
- **Porcentajes de completado**: Barra de progreso y seguimiento de manos completadas (e.g. 15/15 dominado).
- **Celebración de logros**: Efecto confetti y fanfarria sonora al completar niveles.

### 4. Base Gigante de Datos (Generación Infinita)
- Algoritmo de generación de problemas procedurales y calibrados matemáticamente para que puedas practicar **durante horas sin que se repitan**.

### 5. Mesa de Poker Minimalista
- Visualización limpia con felt oscuro personalizable (Dark Slate, Casino Green, Midnight Blue).
- Cartas comunitarias y del jugador de alta legibilidad.
- Indicador de bote, acción del villano y posición de Hero.
- **Explicaciones sencillas**: Tras cada decisión recibes la justificación estratégica y matemática clara.

### 6. Herramientas Integradas
- **Range Viewer**: Cuadrícula interactiva 13x13 (169 manos) con rangos GTO oficiales para UTG, MP, CO, BTN, SB y BB.
- **Odds Calculator**: Selector visual de cartas y cálculo en tiempo real de Pot Odds y valor de mano.

### 7. Efectos de Sonido Procedurales (Web Audio API)
- Sonido realista de reparto de cartas, fichas, acierto armónico y aviso sutil de fallo (sin necesidad de descargar archivos de audio externos).
- Control de volumen y modo silencioso desde Perfil.

---

## 🛠️ Cómo Ejecutar la App

Para arrancar el servidor de desarrollo local:

```bash
npm run dev
```

Abre en tu navegador: **`http://localhost:5173/`**

Para generar la versión de producción optimizada:

```bash
npm run build
```
