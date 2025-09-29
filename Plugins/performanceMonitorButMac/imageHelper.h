/*
 * @Author: JKWTCN jkwtcn@icloud.com
 * @Date: 2025-09-08 10:26:31
 * @LastEditors: JKWTCN jkwtcn@icloud.com
 * @LastEditTime: 2025-09-11 19:03:06
 * @FilePath: \performanceMonitorButMac\imageHelper.h
 * @Description: help to change the button's image
 */
#pragma once
#include <string>

#include "StreamDockCPPSDK/StreamDockSDK/HSDAction.h"

#ifdef __APPLE__
#include <CoreGraphics/CoreGraphics.h>
#include <CoreFoundation/CoreFoundation.h>
#include <ImageIO/ImageIO.h>
#include <CoreServices/CoreServices.h>
#elif defined(_WIN32)
#include <windows.h>
#include <gdiplus.h>
#include <objidl.h>
#include <gdiplusinit.h>
#pragma comment(lib, "gdiplus.lib")
#endif

class imageHelper
{
public:
    ~imageHelper();
    static std::string getButtonImageBase64(int rate, const std::string &unit, const int colorInt);
    static std::string colorToString(const int color);
    static int stringToColor(const std::string colorString);
    static std::string getDataRateImageBase64(double uploadRate, double downloadRate);

private:
    static std::string base64Encode(const unsigned char *data, size_t size);
#ifdef _WIN32
    static int GetEncoderClsid(const WCHAR *format, CLSID *pClsid);
#endif
};
