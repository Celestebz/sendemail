@echo off
:: 设置编码为 UTF-8，避免中文乱码
chcp 65001 >nul
title 批量发邮件工具

echo ==========================================
echo       正在启动批量发邮件工具...
echo ==========================================
echo.

:: 切换到当前脚本所在的目录
cd /d "%~dp0"

:: 检查 npm 是否可用
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 npm 命令。
    echo 请确保已安装 Node.js。
    pause
    exit
)

:: 检查是否需要安装依赖 (检查根目录、server目录、client目录)
if not exist "node_modules" (
    goto :InstallDependencies
)
if not exist "server\node_modules" (
    goto :InstallDependencies
)
if not exist "client\node_modules" (
    goto :InstallDependencies
)

goto :StartService

:InstallDependencies
echo [提示] 检测到是第一次运行（或缺少依赖库），正在自动执行安装...
echo        这通常需要几分钟时间，请耐心等待。
echo.
call npm run install-all
if %errorlevel% neq 0 (
    echo.
    echo [错误] 依赖安装失败，请检查网络设置。
    pause
    exit
)
echo.
echo [成功] 依赖安装完成！
echo.

:StartService
:: 启动服务
echo 正在启动服务，请稍候...
echo 启动成功后会自动打开浏览器。
echo.
echo [提示] 如果想停止服务，请直接关闭此窗口。
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [出错] 服务启动失败。
    pause
)
