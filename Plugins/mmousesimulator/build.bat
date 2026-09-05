@echo off
echo [LOG] build.bat started >> "%~dp0\debug_bat.log"
cd /d "%~dp0"
echo [LOG] cwd changed to %cd% >> "%~dp0\debug_bat.log"

if not exist build mkdir build
echo [LOG] build dir created/verified >> "%~dp0\debug_bat.log"
cd build
echo [LOG] entered build dir >> "%~dp0\debug_bat.log"

echo [LOG] running cmake configure... >> "%~dp0\debug_bat.log"
cmake .. -DCMAKE_PREFIX_PATH=C:/Qt/5.15.2/msvc2019_64 -G "Visual Studio 17 2022" -A x64 >> "%~dp0\debug_bat.log" 2>&1
echo [LOG] cmake configure finished, exit code: %errorlevel% >> "%~dp0\debug_bat.log"

if %errorlevel% neq 0 (
    echo [FAIL] CMake configure failed >> "%~dp0\debug_bat.log"
    exit /b 1
)

echo [LOG] running cmake build... >> "%~dp0\debug_bat.log"
cmake --build . --config Release >> "%~dp0\debug_bat.log" 2>&1
echo [LOG] cmake build finished, exit code: %errorlevel% >> "%~dp0\debug_bat.log"

if %errorlevel% neq 0 (
    echo [FAIL] Build failed >> "%~dp0\debug_bat.log"
    exit /b 1
)

echo [OK] Build succeeded >> "%~dp0\debug_bat.log"
exit /b 0
