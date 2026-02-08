@echo off
chcp 65001 >nul
title 停止批量发邮件工具

echo ==========================================
echo       正在停止所有相关服务...
echo ==========================================
echo.

echo [步骤 1] 正在终止占用端口 5001 (后端) 和 3000 (前端) 的进程...
powershell -Command "$ports = 5001,3000; $processes = Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique; if ($processes) { $processes | ForEach-Object { Write-Host '   正在终止进程 ID: ' $_; Stop-Process -Id $_ -Force } } else { Write-Host '   未发现占用端口的进程。' }"

echo.
echo [步骤 2] 正在清理可能的后台残留...
taskkill /F /IM "electron.exe" >nul 2>nul

echo.
echo ==========================================
echo ⚠️  强力清理模式
echo    如果遇到 "端口被占用" 或 "程序无法启动"
echo    通常是因为后台残留了多个 node.exe 进程。
echo.
echo    注意：这将关闭电脑上所有正在运行的 Node.js 程序。
echo ==========================================
echo.
set /p choice="是否强制关闭所有 Node.js 进程？(输入 y 确认，直接回车默认 y): "
if "%choice%"=="" set choice=y

if /i "%choice%"=="y" (
    echo.
    echo    正在执行强力清理...
    taskkill /F /IM node.exe >nul 2>nul
    echo    ✅ 已清理所有 Node.js 进程。
) else (
    echo    已跳过强力清理。
)

echo.
echo [完成] 服务已停止。您可以放心关闭此窗口。
echo.
pause
