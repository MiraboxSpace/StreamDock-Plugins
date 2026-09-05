@echo off
set "SRC=%~dp0bin\com.hotspot.streamdock.mousesimulator.sdPlugin"
set "DST=C:\Users\Dell\AppData\Roaming\HotSpot\StreamDock\plugins\com.hotspot.streamdock.mousesimulator.sdPlugin"

echo [INFO] Deploying mousesimulator plugin...

if exist "%DST%" (
    echo [INFO] Removing existing plugin at: %DST%
    rmdir /s /q "%DST%"
    if %errorlevel% neq 0 (
        echo [FAIL] Could not remove existing plugin directory.
        pause
        exit /b 1
    )
    echo [OK] Removed.
)

if not exist "%SRC%" (
    echo [FAIL] Source not found: %SRC%
    echo        Run build first.
    pause
    exit /b 1
)

echo [INFO] Copying from: %SRC%
echo [INFO]            to: %DST%
robocopy "%SRC%" "%DST%" /E /NFL /NDL /NJH /NJS
if %errorlevel% geq 8 (
    echo [FAIL] Copy failed (robocopy exit code: %errorlevel%)
    pause
    exit /b 1
)

echo [OK] Deploy complete.
exit /b 0
