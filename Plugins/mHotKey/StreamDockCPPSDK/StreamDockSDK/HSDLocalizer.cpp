//==============================================================================
/**
@file       HSDLocalizer.cpp

@brief      Utility functions to handle localization
**/
//==============================================================================

#include "HSDLocalizer.h"

#include <fstream>

#include "NlohmannJSONUtils.h"
#include "HSDUtilities.h"

static HSDLocalizer *sLocalizer = nullptr;

void HSDLocalizer::Initialize(const std::string &inLanguageCode) {
  if (!sLocalizer) {
    sLocalizer = new HSDLocalizer(inLanguageCode);
  }
}

HSDLocalizer::HSDLocalizer(const std::string &inLanguageCode) {
  try {
    const std::string pluginPath(HSDUtilities::GetPluginExecutablePath().string());
    if (!inLanguageCode.empty() && !pluginPath.empty()) {
      std::string localizationFilePath = HSDUtilities::AddPathComponent(pluginPath, inLanguageCode + ".json");
      std::ifstream localizationFile(localizationFilePath, std::ifstream::in);
      if (localizationFile.is_open()) {
        json jsonData = json::parse(localizationFile);
        NlohmannJSONUtils::GetObjectByName(jsonData, "Localization", mLocalizationData);
      }
    }
  } catch (...) {
  }
}

std::string HSDLocalizer::GetLocalizedString(const std::string &inDefaultString) {
  if (sLocalizer) {
    return sLocalizer->GetLocalizedStringIntern(inDefaultString);
  }

  return inDefaultString;
}

std::string HSDLocalizer::GetLocalizedStringIntern(const std::string &inDefaultString) {
  return NlohmannJSONUtils::GetStringByName(mLocalizationData, inDefaultString, inDefaultString);
}
