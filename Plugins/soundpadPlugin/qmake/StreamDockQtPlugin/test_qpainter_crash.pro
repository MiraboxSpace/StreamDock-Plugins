# Standalone test to reproduce the QPainter crash with QCoreApplication
# Build: qmake test_qpainter_crash.pro && nmake

QT       += core gui
CONFIG   += c++17 console

# Toggle this to test both scenarios:
DEFINES += USE_QAPPLICATION   # <-- test with QApplication (the fix)

TARGET   = test_qpainter_crash
DESTDIR  = $$shell_path($$PWD/../../com.hotspot.soundpad.sdPlugin)

SOURCES += test_qpainter_crash.cpp

INCLUDEPATH += $$PWD/../../SDK
