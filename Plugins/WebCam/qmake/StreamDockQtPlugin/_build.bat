@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" > NUL 2>&1
cd /d "C:\Users\Dell\Desktop\StreamDock-Plugins\Plugins\WebCam\qmake\StreamDockQtPlugin"
C:\Qt\5.15.2\msvc2019_64\bin\qmake.exe StreamDockQtPlugin.pro
nmake 2>&1
