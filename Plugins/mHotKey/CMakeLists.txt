
cmake_minimum_required(VERSION 3.10)

project(com.hotspot.streamdock.hotkey VERSION 1.0)  #1

set(CMAKE_CXX_STANDARD 20)
set(CXX_STANDARD_REQUIRED true)
if (MSVC)
  add_definitions("/Zc:__cplusplus" -DUNICODE=1)
endif()
include_directories("${CMAKE_SOURCE_DIR}")

# StreamDock CPP SDK
add_subdirectory(StreamDockCPPSDK/Vendor)
add_subdirectory(StreamDockCPPSDK/StreamDockSDK)

set(
  SOURCES
  MyStreamDockPlugin.cpp
  main.cpp
)
if (APPLE)
#  list(APPEND SOURCES macOS/MemoryUsageHelper.cpp)
#  list(APPEND SOURCES macOS/CpuUsageHelper.cpp)
elseif (WIN32)
#  list(APPEND SOURCES Windows/get_cpu_temperature.cpp)
#  list(APPEND SOURCES Windows/Cli_Cpu_temperature.cpp)
#  list(APPEND SOURCES Windows/CpuUsageHelper.cpp)
#  list(APPEND SOURCES Windows/MemoryUsageHelper.cpp)  
#  list(APPEND SOURCES Windows/OpenHardwareMonitorLib.dll)
endif()
add_executable(
  HotKey
  ${SOURCES}
)

# Link StreamDock CPP SDK
target_link_libraries(HotKey StreamDockSDK)     
