// @copyright  (c) 2022, ljj
// This source code is licensed under the MIT-style license found in the LICENSE file.

#include <Windows.h>

#include <map>
#include <string>

#include "HSDLogger.h"
#include "HSDUtilities.h"

namespace {
std::wstring MakeWideString(const std::string& str) {
  const int wlen = MultiByteToWideChar(CP_UTF8, NULL, str.data(), (int)str.size(), NULL, NULL);
  std::wstring wstr(wlen, 0);
  MultiByteToWideChar(CP_UTF8, NULL, str.data(), (int)str.size(), &wstr[0], wlen);
  return wstr;
}

std::wstring GetWideContext(const std::string& context) {
  static std::map<std::string, std::wstring> cache;

  auto it = cache.find(context);
  if (it != cache.end()) {
    return it->second;
  }
  auto wstr = MakeWideString(context.substr(context.find_last_of("/\\") + 1));
  cache[context] = wstr;
  return wstr;
}

std::string GetWin32DebugPrefixA() {
  static std::string cache;
  if (cache.empty()) {
    cache = HSDUtilities::GetPluginExecutablePath().filename().string();
  }
  return cache;
}

std::wstring GetWin32DebugPrefixW() {
  static std::wstring cache;
  if (cache.empty()) {
    cache = HSDUtilities::GetPluginExecutablePath().filename().wstring();
  }
  return cache;
}

}// namespace

void HSDLogger::LogMessage(const std::string& context, const std::wstring& wmsg) {
  const auto wbuf = ESD::format(L"{}: {}", GetWideContext(context), wmsg);
#ifndef NDEBUG
  LogToSystem(wbuf);
#endif

  const auto len = WideCharToMultiByte(CP_UTF8, NULL, &wbuf[0], (int)wbuf.size(), nullptr, -1, 0, 0);
  std::string buf(len, 0);
  WideCharToMultiByte(CP_UTF8, NULL, &wbuf[0], (int)wbuf.size(), &buf[0], len, 0, 0);
  LogToStreamDeckSoftware(buf);
}

void HSDLogger::LogToSystem(const std::string& message) {
  const auto buf = ESD::format("[{}] {}", GetWin32DebugPrefixA(), message);
  OutputDebugStringA(buf.c_str());
}

void HSDLogger::LogToSystem(const std::wstring& message) {
  const auto buf = ESD::format(L"[{}] {}", GetWin32DebugPrefixW(), message);
  OutputDebugStringW(buf.c_str());
}
