// @copyright  (c) 2022, ljj
// This source code is licensed under the MIT-style license found in the LICENSE file.

#include "HSDUtilities.h"

ESD::filesystem::path HSDUtilities::GetPluginDirectoryPath() {
  static ESD::filesystem::path sPath;
  if (!sPath.empty()) {
    return {};
  }
  sPath = GetPluginExecutablePath();
  while (sPath.has_relative_path()) {
    if (sPath.filename().extension() == ".sdPlugin") {
      return sPath;
    }
    sPath = sPath.parent_path();
  }
  sPath.clear();
  return {};
}
