@echo off
chcp 65001 >nul
echo ==========================================
echo       正在构建最新版本...
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/3] 正在构建前端界面...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    pause
    exit /b %errorlevel%
)
cd ..

echo [2/3] 正在打包后端服务...
call npx pkg server/index.js --targets node18-win-x64 --output dist/SendEmail.exe --config package.json
if %errorlevel% neq 0 (
    echo [错误] 后端打包失败
    pause
    exit /b %errorlevel%
)

echo [3/3] 正在更新资源文件...
if exist "dist\client_build" (
    rmdir /s /q "dist\client_build"
)
xcopy /E /I /Y "client\build" "dist\client_build"

echo [4/4] 正在生成压缩包...
:: 获取当前日期，格式：YYMMDD
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
:: 如果上述命令取到的格式不对（依赖系统区域设置），尝试更通用的 PowerShell 方式
for /f "usebackq delims=" %%i in (`powershell -Command "Get-Date -Format 'yyMMdd'"`) do set DATE_TAG=%%i

set "ZIP_NAME=SendEmail_%DATE_TAG%.zip"

if exist "%ZIP_NAME%" del "%ZIP_NAME%"
powershell -Command "Compress-Archive -Path 'dist\*' -DestinationPath '%ZIP_NAME%' -Force"

echo.
echo ==========================================
echo       构建完成！
echo       1. 可执行文件位于 dist 文件夹
echo       2. 已生成压缩包: %ZIP_NAME%
echo          (您可以直接把这个zip发给朋友)
echo ==========================================
echo.
pause
