// @copyright  (c) 2022, ljj
// This source code is licensed under the MIT-style license found in the LICENSE file.

#include "HSDLogger.h"

#include "HSDConnectionManager.h"

#ifdef __APPLE__
#include <os/log.h>
#endif

namespace {
HSDConnectionManager* sConnectionManager = nullptr;
}// namespace

void HSDLogger::SetConnectionManager(HSDConnectionManager* hsd_connection) {
  sConnectionManager = hsd_connection;
}

void HSDLogger::LogToStreamDeckSoftware(const std::string& message) {
  if (sConnectionManager) {
      sConnectionManager->LogMessage(message);
  }
}

void HSDLogger::LogMessage(const std::string& context, const std::string& msg) {
  const auto message = ESD::format("{}: {}", context.substr(context.find_last_of("/\\") + 1), msg);
  LogToStreamDeckSoftware(message);
#ifndef NDEBUG
  LogToSystem(message);
#endif
}

#ifdef __APPLE__
void HSDLogger::LogToSystem(const std::string& message) {
  os_log_with_type(OS_LOG_DEFAULT, OS_LOG_TYPE_DEFAULT, "%{public}s", message.c_str());
}
#elif !defined(_MSC_VER)
#include <iostream>
#include <iostream>
#include <iostream>
#include <iostream>
void HSDLogger::LogToSystem(const std::string& message) {
  std::cerr << message << std::endl;
}
#endif
