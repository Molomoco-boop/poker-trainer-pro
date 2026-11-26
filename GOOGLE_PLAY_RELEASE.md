# Google Play Store Release Guide — Free Poker Trainer

Esta guía contiene todo lo necesario para subir **Free Poker Trainer** (`com.pokertrainer.pro`) a **Google Play Console**.

---

## 1. Generar la firma digital (solo la primera vez)

Google Play exige que el `.aab` esté firmado con una clave de subida (Upload Keystore).

1. Ejecuta en la raíz del proyecto:
   ```cmd
   generate_keystore.bat
   ```
2. Sigue las instrucciones en pantalla. El script creará fuera del repositorio:
   - `%USERPROFILE%\.poker-trainer-keys\poker-upload.jks`
   - `%USERPROFILE%\.poker-trainer-keys\keystore.properties`
3. **IMPORTANTE:** Haz una copia de seguridad segura de esa carpeta. Si pierdes la clave, no podrás actualizar la app en Google Play sin solicitar un reset de clave.

---

## 2. Compilar el Android App Bundle (`.aab`)

Ejecuta:
```cmd
build_release_aab.bat
```
Esto compila el frontend (`npm run build`), sincroniza Capacitor (`npx cap sync android`) y genera el archivo firmado listo para subir a Google Play:
`android\app\build\outputs\bundle\release\app-release.aab`

*(Para futuras actualizaciones, sube `versionCode` y `versionName` en `android/app/build.gradle` antes de compilar).*

---

## 3. Configuración en Google Play Console

### A. Acceso a la aplicación (App Access)
- **¿Todas las funciones están disponibles sin acceso especial?** → **Sí** (la app no requiere cuenta ni inicio de sesión; todo se guarda en el dispositivo).

### B. Anuncios (Ads)
- **¿Contiene anuncios?** → **No**.

### C. Seguridad de los datos (Data Safety)
- **¿Tu app recoge o comparte alguno de los tipos de datos de usuario requeridos?** → **No**.
- Todo el progreso, historial de manos y preferencias se guardan exclusivamente en el almacenamiento local del dispositivo (`localStorage`).

### D. Política de Privacidad
- Puedes usar la versión estática incluida en `PRIVACY_POLICY.md` o habilitar GitHub Pages en el repositorio y enlazar `https://<tu-usuario>.github.io/<repo>/privacy.html`.

### E. Clasificación de Contenido (IARC)
- **Categoría:** Educación / Estrategia (o Juegos de cartas sin apuestas reales).
- **Apuestas reales / premios en dinero:** **No**.
- **Compras integradas de fichas / moneda virtual:** **No**.

### F. Ficha de Play Store (Sugerencia)
- **Nombre:** Poker Trainer Pro
- **Descripción corta (EN):** GTO 6-max poker trainer, cash table, hand review & poker math. Offline, no account.
- **Descripción corta (ES):** Entrenador de póker 6-max GTO, mesa cash, revisión de manos y matemáticas. Sin cuenta.
- **Idiomas incluidos automáticamente en la app:** Inglés, Español, Portugués, Francés, Alemán, Italiano, Ruso, Chino, Japonés y Coreano (detección automática del idioma del dispositivo + selector manual en Perfil).
