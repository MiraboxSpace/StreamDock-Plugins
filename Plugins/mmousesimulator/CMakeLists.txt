cmake_minimum_required(VERSION 3.16)
project(com.hotspot.streamdock.mousesimulator VERSION 2.0 LANGUAGES CXX)

# C++20 standard (Qt 5.15 supports C++20 with MSVC)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)   # Qt MOC for signal/slot

if(MSVC)
    add_definitions("/Zc:__cplusplus" -DUNICODE=1 -DNOMINMAX)
endif()

# ── Qt 5.15.2 ────────────────────────────────────────────────
find_package(Qt5 5.15 REQUIRED COMPONENTS Core Network WebSockets)

# nlohmann/json (single-header, vendored)
add_library(nlohmann_json INTERFACE)
target_include_directories(nlohmann_json INTERFACE
    ${CMAKE_SOURCE_DIR}/thirdparty)

# ── Sources ───────────────────────────────────────────────────
set(SOURCES
    src/main.cpp
    src/connection/SdConnectionManager.cpp
    src/plugin/MouseSimulatorPlugin.cpp
    src/action/MouseSimulatorAction.cpp
    src/simulation/MouseSimulationEngine.cpp
    src/recording/InputRecorder.cpp
    src/recording/CountdownOverlay.cpp
    src/logging/Logger.cpp
)

set(HEADERS
    src/connection/SdConnectionManager.h
    src/plugin/MouseSimulatorPlugin.h
    src/action/MouseSimulatorAction.h
    src/protocol/SdProtocolDefines.h
    src/state/PluginSettings.h
    src/simulation/RecordStreamParser.h
    src/simulation/MouseSimulationEngine.h
    src/recording/InputRecorder.h
    src/recording/CountdownOverlay.h
    src/platform/WindowHelper.h
    src/logging/Logger.h
)

add_executable(mousesimulator_plugin ${SOURCES} ${HEADERS})

target_include_directories(mousesimulator_plugin PRIVATE ${CMAKE_SOURCE_DIR}/src)

target_link_libraries(mousesimulator_plugin
    PRIVATE
    Qt5::Core
    Qt5::Network
    Qt5::WebSockets
    nlohmann_json
)

# Windows: link user32 for SendInput
if(WIN32)
    target_link_libraries(mousesimulator_plugin PRIVATE user32 winmm gdiplus)
endif()

# Platform define
target_compile_definitions(mousesimulator_plugin PRIVATE
    $<$<PLATFORM_ID:Windows>:PLATFORM_WINDOWS>
)

# Console hidden for release (StreamDeck talks via CLI args + WebSocket)
set_target_properties(mousesimulator_plugin PROPERTIES
    WIN32_EXECUTABLE FALSE
)

# ── Deployment: assemble .sdPlugin folder ─────────────────────
set(SDPLUGIN_OUTPUT_DIR
    "${CMAKE_SOURCE_DIR}/bin/com.hotspot.streamdock.mousesimulator.sdPlugin")

# Copy Qt platform plugin (required for QCoreApplication to start)
set(QT_PLUGINS_DIR "C:/Qt/5.15.2/msvc2019_64/plugins")

add_custom_command(TARGET mousesimulator_plugin POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory "${SDPLUGIN_OUTPUT_DIR}"
    # Copy exe first
    COMMAND ${CMAKE_COMMAND} -E copy
        "$<TARGET_FILE:mousesimulator_plugin>"
        "${SDPLUGIN_OUTPUT_DIR}/mousesimulator_plugin.exe"
    # Copy Qt platform plugin (REQUIRED for Qt to run)
    COMMAND ${CMAKE_COMMAND} -E make_directory "${SDPLUGIN_OUTPUT_DIR}/platforms"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${QT_PLUGINS_DIR}/platforms/qwindows.dll"
        "${SDPLUGIN_OUTPUT_DIR}/platforms/qwindows.dll"
    # Copy Qt bearer plugin (for WebSocket)
    COMMAND ${CMAKE_COMMAND} -E make_directory "${SDPLUGIN_OUTPUT_DIR}/bearer"
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${QT_PLUGINS_DIR}/bearer/qgenericbearer.dll"
        "${SDPLUGIN_OUTPUT_DIR}/bearer/qgenericbearer.dll"
    # Copy frontend assets (properly structured per convention)
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_SOURCE_DIR}/frontend/"
        "${SDPLUGIN_OUTPUT_DIR}/"
    # Copy manifest
    COMMAND ${CMAKE_COMMAND} -E copy
        "${CMAKE_SOURCE_DIR}/deploy/manifest.json"
        "${SDPLUGIN_OUTPUT_DIR}/manifest.json"
    # Run windeployqt to copy Qt runtime DLLs
    COMMAND windeployqt --release --no-translations --no-system-d3d-compiler
        --no-opengl-sw --no-angle "${SDPLUGIN_OUTPUT_DIR}/mousesimulator_plugin.exe"
    COMMENT "Assembling .sdPlugin output directory"
)
