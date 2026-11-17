@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=C:\Users\migue\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo ==============================================
echo Building Poker Trainer Pro APK with Gradle...
echo ==============================================
cd /d "%~dp0android"
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Gradle build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================
echo Installing APK to device...
echo ==============================================
cd /d "%~dp0"
set "ADB=C:\Users\migue\AppData\Local\Android\Sdk\platform-tools\adb.exe"

"%ADB%" devices -l

echo.
echo Installing android\app\build\outputs\apk\debug\app-debug.apk ...
"%ADB%" install -r "%~dp0android\app\build\outputs\apk\debug\app-debug.apk"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: ADB installation failed!
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================
echo Launching App on Mobile...
echo ==============================================
"%ADB%" shell am start -n com.pokertrainer.pro/com.pokertrainer.pro.MainActivity

echo.
echo SUCCESS: App installed and running on mobile!
