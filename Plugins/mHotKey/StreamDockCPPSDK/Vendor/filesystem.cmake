include(FetchContent)
include(CheckCXXSourceCompiles)

# Download url
# https://github.com/gulrak/filesystem/archive/refs/tags/v1.5.14.zip
# https://github.com/gulrak/filesystem/archive/refs/tags/v1.5.14.tar.gz

check_cxx_source_compiles("
#ifdef __APPLE__
#include <Availability.h> // for deployment target to support pre-catalina targets without std::fs
#endif
#if ((defined(_MSVC_LANG) && _MSVC_LANG >= 201703L) || (defined(__cplusplus) && __cplusplus >= 201703L)) && defined(__has_include)
#if __has_include(<filesystem>) && (!defined(__MAC_OS_X_VERSION_MIN_REQUIRED) || __MAC_OS_X_VERSION_MIN_REQUIRED >= 101500)
#define GHC_USE_STD_FS
#endif
#endif
#ifndef GHC_USE_STD_FS
#error \"std::filesystem missing or unusable\"
#endif
" HAS_STD_FILESYSTEM)

if(NOT HAS_STD_FILESYSTEM)
  FetchContent_Declare(
    filesystem
    URL ${CMAKE_CURRENT_LIST_DIR}/filesystem-1.5.14.zip
    EXCLUDE_FROM_ALL
  )

  FetchContent_MakeAvailable(filesystem)
endif()
