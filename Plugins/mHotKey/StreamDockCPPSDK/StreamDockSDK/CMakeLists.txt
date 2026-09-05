set(
  SOURCES
  HSDAction.cpp
  HSDConnectionManager.cpp
  HSDFilesystem.cpp
  HSDUtilities.cpp
  HSDLogger.cpp
  HSDLocalizer.cpp
  HSDMain.cpp
  HSDPlugin.cpp
)
if (WIN32)
  list(APPEND SOURCES HSDUtilitiesWindows.cpp HSDLoggerWindows.cpp)
elseif (APPLE)
  list(APPEND SOURCES HSDUtilitiesPOSIX.cpp HSDUtilitiesMac.cpp)
else()
  list(APPEND SOURCES HSDUtilitiesPOSIX.cpp HSDUtilitiesLinux.cpp)
endif()

add_library(
  StreamDockSDK
  STATIC
  ${SOURCES}
)
target_compile_definitions(StreamDockSDK PRIVATE JSON_USE_IMPLICIT_CONVERSIONS=0)
target_link_libraries(
  StreamDockSDK
  PUBLIC
  asio
  json
  websocketpp
)

# ghc::filesystem only supports UTF-8 locales, which is not common on Windows.
# In lieu of all callers properly using UTF-8 locales, we just require
# std::filesystem.
if ((NOT WIN32) AND HAS_STD_FILESYSTEM)
  target_compile_definitions(StreamDockSDK PUBLIC ESD_HAS_STD_FILESYSTEM)
else()
  target_link_libraries(StreamDockSDK PUBLIC ghc_filesystem)
endif()
if (NOT MSVC)
  target_link_libraries(StreamDockSDK PUBLIC fmt)
endif()
if(${CMAKE_SYSTEM_NAME} STREQUAL "Linux")
  target_link_libraries(StreamDockSDK PUBLIC pthread)
endif()

file(GLOB HEADERS *.h)
set_target_properties(
  StreamDockSDK
  PROPERTIES
  PUBLIC_HEADER "${HEADERS}"
  CXX_STANDARD 20
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
target_include_directories(StreamDockSDK PUBLIC "${CMAKE_CURRENT_LIST_DIR}/..")

install(
  TARGETS
  StreamDockSDK
  PUBLIC_HEADER DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/StreamDockSDK"
  ARCHIVE DESTINATION "${CMAKE_INSTALL_LIBDIR}"
)
