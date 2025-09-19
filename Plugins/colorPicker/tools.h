#include <ApplicationServices/ApplicationServices.h>
#include <CoreGraphics/CoreGraphics.h>
#include <string>
#include <thread>
#include <atomic>
#include <chrono>
using namespace std;
enum DisplayFormatType
{
    COLOR_NAME,
    RGB,
    HEX,
};

enum SelectType
{
    KEY_PRESS,
    DYNAMIC,
    FIXED
};

struct ProcessState
{
    std::atomic<bool> isKeyPress = false;
    std::atomic<bool> copyToClipboard = false;
    std::atomic<int> displayFormat = COLOR_NAME;
    std::atomic<int> selectType = KEY_PRESS;
    std::atomic<double> pointX = 0;
    std::atomic<double> pointY = 0;
    std::atomic<CGColorRef> preColor = NULL;
    std::unique_ptr<std::thread> colorUpdateThread;
    bool isRunning = false;
};

CGColorRef getPixelColorAtLocation(CGPoint point);

string returnBase64ImgFromColor(CGColorRef color, DisplayFormatType format);

void saveColorToClipboard(CGColorRef color, DisplayFormatType format);

std::string base64Encode(const unsigned char *data, size_t size);

std::string getColorName(CGColorRef color);

bool checkThreadStatus(ProcessState &state);
bool startThread(ProcessState &state);
bool stopThread(ProcessState &state);