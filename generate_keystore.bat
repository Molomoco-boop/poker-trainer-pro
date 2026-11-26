@echo off
setlocal
set "KEYTOOL=C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
if not exist "%KEYTOOL%" set "KEYTOOL=keytool"

set "OUT_DIR=%USERPROFILE%\.poker-trainer-keys"
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

set "KEYSTORE=%OUT_DIR%\poker-upload.jks"
set "PROPS=%OUT_DIR%\keystore.properties"

if exist "%KEYSTORE%" (
  echo Keystore already exists at: %KEYSTORE%
  echo Keep this file and %PROPS% backed up safely!
  exit /b 0
)

echo ==================================================
echo Generating Google Play Upload Keystore...
echo Output: %KEYSTORE%
echo ==================================================
"%KEYTOOL%" -genkey -v -keystore "%KEYSTORE%" -keyalg RSA -keysize 2048 -validity 10000 -alias poker_upload
if errorlevel 1 (
  echo ERROR: Failed to generate keystore.
  exit /b 1
)

echo.
echo Enter the passwords you just used to create %PROPS%
set /p STORE_PASS=Keystore password: 
set /p KEY_PASS=Key password (press Enter if same): 
if "%KEY_PASS%"=="" set "KEY_PASS=%STORE_PASS%"

(
  echo storeFile=%KEYSTORE:\=/%
  echo storePassword=%STORE_PASS%
  echo keyAlias=poker_upload
  echo keyPassword=%KEY_PASS%
) > "%PROPS%"

echo.
echo Saved signing config to: %PROPS%
echo IMPORTANT: Never commit %KEYSTORE% or %PROPS% to Git! Back them up safely.
