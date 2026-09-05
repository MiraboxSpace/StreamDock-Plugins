// @copyright  (c) 2020, Frederick Emmott
// This source code is licensed under the MIT-style license found in the LICENSE file.
#pragma once

#include <string>

#include "HSDFormat.h"

class HSDConnectionManager;

class HSDLogger final {
 public:
  HSDLogger() = delete;
  static void SetConnectionManager(HSDConnectionManager* hsd_connection);

  static void LogMessage(
    const std::string& context,
    const std::string& message);
#ifdef _MSC_VER
  static void LogMessage(const std::string& context, const std::wstring& message);
#endif

 private:
  static void LogToStreamDeckSoftware(const std::string& message);
  static void LogToSystem(const std::string& message);
#ifdef _MSC_VER
  static void LogToSystem(const std::wstring& message);
#endif
};

template <class Str>
void HSDLogWithContext(const std::string& context, Str&& str) {
  HSDLogger::LogMessage(context, std::forward<Str>(str));
}

template <class First, class... Rest>
void HSDLogWithContext(
  const std::string& context,
  ESD::format_string<First, Rest...> str,
  First&& first,
  Rest&&... rest) {
  HSDLogger::LogMessage(context, ESD::format(str, std::forward<First>(first), std::forward<Rest>(rest)...));
}

#ifdef _MSC_VER
template <class First, class... Rest>
void HSDLogWithContext(
  const std::string& context,
  ESD::format_wstring<First, Rest...> str,
  First&& first,
  Rest&&... rest) {
  HSDLogger::LogMessage(context, ESD::format(str, std::forward<First>(first), std::forward<Rest>(rest)...));
}
#define HSDLog(...) HSDLogWithContext(__FILE__, __VA_ARGS__)
#else
#define HSDLog(...) HSDLogWithContext(__FILE__, ##__VA_ARGS__)
#endif

#ifndef NDEBUG
#define HSDDebug HSDLog
#else
template <class... Args>
inline void HSDDebug(Args&&...) {
}
#endif
