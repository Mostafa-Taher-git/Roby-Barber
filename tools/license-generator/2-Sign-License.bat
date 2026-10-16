@echo off
chcp 65001 >nul
title Roby Barber - Issue License Key
cd /d "%~dp0"
echo ====================================================
echo   روبي باربر - إصدار مفتاح تفعيل لعميل
echo ====================================================
echo.
echo الصق رقم الجهاز اللي وصلك من العميل (شكله MID-XXXX-XXXX)
set /p MID=": "
echo.
node sign.cjs --mid %MID%
if errorlevel 1 (
  echo.
  echo حصلت مشكلة - تأكد إن رقم الجهاز مكتوب صح بالشكل MID-XXXX-XXXX
) else (
  echo.
  echo انسخ المفتاح اللي ظهر فوق (بيبدأ بـ RB1-) وابعته للعميل على الواتساب.
)
echo.
pause
