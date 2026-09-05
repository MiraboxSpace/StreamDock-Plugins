QT       += core gui
QTPLUGIN += qjpeg qpng

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets xml

CONFIG += c++17

# Enable SEH exception catching via C++ catch(...)
# /EHa allows catch(...) to handle access violations and other SEH exceptions
# Must replace Qt's default -EHsc to avoid override warning D9025
QMAKE_CXXFLAGS -= -EHsc
QMAKE_CXXFLAGS_EXCEPTIONS_ON = -EHa

# You can make your code fail to compile if it uses deprecated APIs.
# In order to do so, uncomment the following line.
#DEFINES += QT_DISABLE_DEPRECATED_BEFORE=0x060000    # disables all the APIs deprecated before Qt 6.0.0

# 版本
VERSION = 1.0.0
# 版本号（VERSION_STR可以在代码中调用）
DEFINES += VERSION_STR=\\\"$$VERSION\\\"
# Static/compile-time major version of the Stream Dock.
DEFINES += SD_VERSION_MAJOR=1
# Static/compile-time minor version of the Stream Dock.
DEFINES += SD_VERSION_MINOR=0
# Static/compile-time patch version of the Stream Dock.
DEFINES += SD_VERSION_PATCH=0
# 目标文件名
TARGET = "SoundpadPlugin"
# DESTDIR（可执行文件存放的文件路径）
DESTDIR = $$shell_path($$PWD/../../com.hotspot.soundpad.sdPlugin)
# 屏蔽 QDebug
DEFINES += QT_NO_DEBUG_OUTPUT
# 在Release模式下，也能输出文件信息，行数
DEFINES += QT_MESSAGELOGCONTEXT
# MOC命令将含Q_OBJECT的头文件转换为标准的头文件寄存的目录
MOC_DIR = ./temp/moc
# RCC将qrc文件转化为头文件所寄存的目录
RCC_DIR = ./temp/rcc
# UIC将ui转化为头文件所寄存的目录
UI_DIR = ./temp/ui
# 指定所有中间文件.o（.obj）放置的目录。
OBJECTS_DIR = ./temp/obj

SOURCES += \
    SoundpadAction.cpp \
    SoundpadPlugin.cpp \
    LogManager.cpp \
    main.cpp

HEADERS += \
    SoundpadAction.h \
    SoundpadPlugin.h \
    LogManager.h

include(../../SDK/SDK.pri)

# Win
win32 {
    QMAKE_CFLAGS += /utf-8
    QMAKE_CXXFLAGS += /utf-8

    # Auto-deploy Qt runtime dependencies after build
    WINdeployqt_EXE = $$shell_quote($$shell_path($$[QT_INSTALL_BINS]/windeployqt.exe))
    WINdeployqt_TARGET = $$shell_quote($$shell_path($${DESTDIR}/$${TARGET}.exe))
    QMAKE_POST_LINK += $$WINdeployqt_EXE $$WINdeployqt_TARGET --no-translations --no-compiler-runtime
}

# Default rules for deployment.
qnx: target.path = /tmp/$${TARGET}/bin
else: unix:!android: target.path = /opt/$${TARGET}/bin
!isEmpty(target.path): INSTALLS += target
