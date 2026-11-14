@echo off
chcp 65001 >nul
echo =====================================================================
echo   DONG GOI PHAN MEM SOLARDESIGN PRO THANH FILE .EXE (WINDOWS 64-BIT)
echo =====================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] May tinh chua cai dat Node.js!
    echo Vui long tai va cai dat Node.js LTS tai: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Dang cai dat cac thu vien cua du an...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [LOI] Khong the cai dat thu vien npm.
    pause
    exit /b 1
)

echo.
echo [2/3] Dang cai dat cong cu dong goi Electron va Electron-Builder...
call npm install --save-dev electron electron-builder --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [LOI] Khong the cai dat Electron.
    pause
    exit /b 1
)

echo.
echo [3/3] Dang bien dich giao dien va xuat file .EXE trong thu muc release\...
call npm run electron:exe
if %errorlevel% neq 0 (
    echo [LOI] Qua trinh dong goi .exe gap loi.
    pause
    exit /b 1
)

echo.
echo =====================================================================
echo   HOAN TAT! File .EXE cua ban nam trong thu muc: release\
echo   - SolarDesign Pro-1.0.0-portable.exe (Chay ngay khong can cai dat)
echo   - SolarDesign Pro-1.0.0-nsis.exe     (Bo cai dat tao icon Desktop)
echo =====================================================================
explorer release
pause
