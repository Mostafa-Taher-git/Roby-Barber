@echo off
chcp 65001 >nul
title Roby Barber - Generate Keys (ONCE)
cd /d "%~dp0"
echo ====================================================
echo   روبي باربر - إنشاء مفاتيح الترخيص (مرة واحدة فقط)
echo ====================================================
echo.
node keygen.cjs
echo.
echo لو ظهرت رسالة "already exists" فمعناها المفاتيح موجودة بالفعل - تمام، مفيش حاجة تعملها.
echo.
pause
