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

echo.
echo ==========================================
echo       构建完成！
echo       新版本位于 dist 文件夹
echo ==========================================
echo.
pause
