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
