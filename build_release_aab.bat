@echo off
setlocal
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

if not defined POKER_KEYSTORE_PROPERTIES (
  if exist "%USERPROFILE%\.poker-trainer-keys\keystore.properties" (
    set "POKER_KEYSTORE_PROPERTIES=%USERPROFILE%\.poker-trainer-keys\keystore.properties"
  )
)

echo ==================================================
echo 1/3 Building production web assets...
echo ==================================================
call npm run build
if errorlevel 1 exit /b 1

echo ==================================================
echo 2/3 Syncing Capacitor Android project...
echo ==================================================
call npx cap sync android
if errorlevel 1 exit /b 1

echo ==================================================
echo 3/3 Building Release Android App Bundle (.aab)...
echo ==================================================
pushd android
call gradlew.bat bundleRelease
set "ERR=%ERRORLEVEL%"
popd
if not "%ERR%"=="0" exit /b %ERR%

echo.
echo ==================================================
echo SUCCESS! Release AAB ready for Google Play:
echo android\app\build\outputs\bundle\release\app-release.aab
echo ==================================================
