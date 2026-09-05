#include "MyStreamDockPlugin.h"

#include "StreamDockCPPSDK/StreamDockSDK/HSDMain.h"

int main(int argc, const char** argv) {

    return esd_main(argc, argv, new MyStreamDockPlugin());
}

