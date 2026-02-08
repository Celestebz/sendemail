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
echo [步骤 2] 正在清理可能的后台残留 (Electron)...
taskkill /F /IM "electron.exe" >nul 2>nul

echo.
echo [步骤 3] 正在强制清理所有 Node.js 进程...
taskkill /F /IM node.exe >nul 2>nul
echo    ✅ 已清理所有 Node.js 进程。

echo.
echo ==========================================
echo       [完成] 服务已停止。
echo       窗口将在 3 秒后自动关闭...
echo ==========================================
echo.

timeout /t 3 >nul
exit
