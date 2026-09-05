include(FetchContent)

# Download url
# https://github.com/fmtlib/fmt/releases/download/9.1.0/fmt-9.1.0.zip
# https://github.com/fmtlib/fmt/archive/refs/tags/9.1.0.zip
# https://github.com/fmtlib/fmt/archive/refs/tags/9.1.0.tar.gz

FetchContent_Declare(
  fmt
  URL ${CMAKE_CURRENT_LIST_DIR}/fmt-9.1.0.zip
  EXCLUDE_FROM_ALL
)

FetchContent_MakeAvailable(fmt)
