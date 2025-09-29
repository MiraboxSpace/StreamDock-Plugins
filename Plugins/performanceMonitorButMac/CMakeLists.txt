cmake_minimum_required(VERSION 3.10)

project(performanceMonitor VERSION 1.0)
# set the C++ standard to C++ 17
set(CMAKE_CXX_STANDARD 17)
set(CXX_STANDARD_REQUIRED true)
if (MSVC)
  add_definitions("/Zc:__cplusplus" -DUNICODE=1)
endif()
include_directories("${CMAKE_SOURCE_DIR}")

# Platform-specific libraries
if (APPLE)
    find_library(COCOA_LIBRARY Cocoa)
    find_library(CORE_GRAPHICS_LIBRARY CoreGraphics)
    find_library(CORE_FOUNDATION_LIBRARY CoreFoundation)
    find_library(IOKIT_LIBRARY IOKit)
elseif (WIN32)
    # Windows libraries - these are system libraries, no need for find_package
    set(WINDOWS_LIBS gdi32 ole32 gdiplus pdh iphlpapi psapi)
endif()

# StreamDock CPP SDK
add_subdirectory(StreamDockCPPSDK/Vendor)
add_subdirectory(StreamDockCPPSDK/StreamDockSDK)

set(
  SOURCES
  performanceHelper.cpp
  cpuUsageRateAction.cpp
  main.cpp
  imageHelper.cpp
  HSDExamplePlugin.cpp
)
add_executable(
  performanceMonitor
  ${SOURCES}
)

# Link StreamDock CPP SDK
if (APPLE)
    target_link_libraries(performanceMonitor StreamDockSDK
        ${COCOA_LIBRARY}
        ${CORE_GRAPHICS_LIBRARY}
        ${CORE_FOUNDATION_LIBRARY}
        ${IOKIT_LIBRARY})
elseif (WIN32)
    target_link_libraries(performanceMonitor StreamDockSDK ${WINDOWS_LIBS})
endif()
# 如果运行时需要链接的dll动态库，同时需要把这些dll动态库拷贝到exe同级目录下
# 需要把lib文件拷贝到.sln文件所在目录下（也就是cmake的build目录下）
