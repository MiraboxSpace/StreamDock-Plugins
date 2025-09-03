#include "HSDSwitchAudioPlugin.h"

#include "StreamDockCPPSDK/StreamDockSDK/HSDMain.h"

#include "Mmdeviceapi.h"
#include "PolicyConfig.h"
#include <propkey.h>

#include <vector>
#include <string>
#include <locale>
#include <codecvt>

#include <thread>
#include <fstream>

int main(int argc, const char** argv) {
    //std::ofstream log("log.txt");

    //log << "Number of arguments: " << argc << std::endl;

    //for (int i = 0; i < argc; ++i) {
    //    log << "Argument " << i << ": " << argv[i] << std::endl;
    //}
    //log.close();

   
  auto plugin = std::make_unique<HSDSwitchAudioPlugin>();
  return esd_main(argc, argv, plugin.get());
}
