#include "tools.h"
#include <sstream>
#include <iomanip>
#include <math.h>
#include <vector>
#include <limits>

CGColorRef getPixelColorAtLocation(CGPoint point)
{
    CGColorRef color = NULL;
    CGImageRef image = CGDisplayCreateImageForRect(CGMainDisplayID(), CGRectMake(point.x, point.y, 1, 1));

    if (image != NULL)
    {
        CFDataRef data = CGDataProviderCopyData(CGImageGetDataProvider(image));
        if (data != NULL)
        {
            const uint8_t *buffer = CFDataGetBytePtr(data);
            if (buffer != NULL)
            {
                CGFloat components[4];

                // 根据颜色空间处理不同的像素格式
                CGColorSpaceRef colorSpace = CGImageGetColorSpace(image);
                CGColorSpaceModel model = CGColorSpaceGetModel(colorSpace);

                if (model == kCGColorSpaceModelRGB)
                {
                    size_t bitsPerPixel = CGImageGetBitsPerPixel(image);
                    if (bitsPerPixel == 32)
                    {
                        components[0] = buffer[0] / 255.0; // R
                        components[1] = buffer[1] / 255.0; // G
                        components[2] = buffer[2] / 255.0; // B
                        components[3] = buffer[3] / 255.0; // A
                    }
                    else if (bitsPerPixel == 24)
                    {
                        components[0] = buffer[0] / 255.0; // R
                        components[1] = buffer[1] / 255.0; // G
                        components[2] = buffer[2] / 255.0; // B
                        components[3] = 1.0;               // A
                    }
                    color = CGColorCreate(CGColorSpaceCreateDeviceRGB(), components);
                }
                // 可以添加其他颜色空间的处理
            }
            CFRelease(data);
        }
        CGImageRelease(image);
    }

    return color;
}

//
string returnBase64ImgFromColor(CGColorRef color, DisplayFormatType format)
{
    // 创建位图上下文
    size_t width = 128;
    size_t height = 128;
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(NULL, width, height, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);

    if (!context)
    {
        CGColorSpaceRelease(colorSpace);
        return "";
    }

    // 设置背景颜色
    CGContextSetFillColorWithColor(context, color);
    CGContextFillRect(context, CGRectMake(0, 0, width, height));

    // 设置文本属性
    std::string text = "";
    switch (format)
    {
    case COLOR_NAME:
        text = getColorName(color);
        break;
    case RGB:
        text += "R:" + std::to_string((int)(CGColorGetComponents(color)[0] * 255)) + '\n';
        text += "G:" + std::to_string((int)(CGColorGetComponents(color)[1] * 255)) + '\n';
        text += "B:" + std::to_string((int)(CGColorGetComponents(color)[2] * 255));
        break;
    case HEX:
    {
        std::stringstream ss;
        ss << std::hex << std::setfill('0') << std::setw(2) << (int)(CGColorGetComponents(color)[0] * 255)
           << std::setw(2) << (int)(CGColorGetComponents(color)[1] * 255)
           << std::setw(2) << (int)(CGColorGetComponents(color)[2] * 255);
        text = ss.str();
    }
    break;
    default:
        text = "Unknown";
        break;
    }

    // 根据背景颜色决定字体颜色
    const CGFloat *components = CGColorGetComponents(color);
    double brightness = (components[0] + components[1] + components[2]) / 3.0;
    CGColorRef fontColor = (brightness > 0.5) ? CGColorCreateGenericRGB(0, 0, 0, 1) : CGColorCreateGenericRGB(1, 1, 1, 1);

    // 设置字体
    CGContextSetFillColorWithColor(context, fontColor);
    CGContextSelectFont(context, "Helvetica", 32, kCGEncodingMacRoman);

    // 绘制文本（简化版本，居中）
    std::vector<std::string> lines;
    std::stringstream ss(text);
    std::string line;
    while (std::getline(ss, line, '\n'))
    {
        lines.push_back(line);
    }

    // 使用更大的行高和间距，适合32点字体
    CGFloat lineHeight = 38.0; // 字体大小32点的1.2倍
    CGFloat leftMargin = 10.0; // 左边距
    CGFloat y = height / 2 - (lines.size() * lineHeight) / 2;
    for (const auto &l : lines)
    {
        CGContextShowTextAtPoint(context, leftMargin, y, l.c_str(), l.length());
        y += lineHeight;
    }

    // 获取图像
    CGImageRef image = CGBitmapContextCreateImage(context);

    // 转换为 PNG 数据
    CFMutableDataRef data = CFDataCreateMutable(kCFAllocatorDefault, 0);
    CGImageDestinationRef destination = CGImageDestinationCreateWithData(data, kUTTypePNG, 1, NULL);
    CGImageDestinationAddImage(destination, image, NULL);
    CGImageDestinationFinalize(destination);

    // 编码为 Base64
    std::string base64Str = base64Encode((const unsigned char *)CFDataGetBytePtr(data), CFDataGetLength(data));

    // 释放资源
    CFRelease(data);
    CFRelease(destination);
    CGImageRelease(image);
    CGContextRelease(context);
    CGColorSpaceRelease(colorSpace);
    CGColorRelease(fontColor);

    return base64Str;
}

void saveColorToClipboard(CGColorRef color, DisplayFormatType format)
{
    // 获取颜色的字符串表示
    std::string colorStr;
    switch (format)
    {
    case COLOR_NAME:
        colorStr = getColorName(color);
        break;
    case RGB:
        colorStr += std::to_string((int)(CGColorGetComponents(color)[0] * 255)) + ",";
        colorStr += std::to_string((int)(CGColorGetComponents(color)[1] * 255)) + ",";
        colorStr += std::to_string((int)(CGColorGetComponents(color)[2] * 255));
        break;
    case HEX:
    {
        std::stringstream ss;
        ss << std::hex << std::setfill('0') << std::setw(2) << (int)(CGColorGetComponents(color)[0] * 255)
           << std::setw(2) << (int)(CGColorGetComponents(color)[1] * 255)
           << std::setw(2) << (int)(CGColorGetComponents(color)[2] * 255);
        colorStr = ss.str();
    }
    break;
    default:
        colorStr = "Unknown";
        break;
    }
    // 将字符串复制到剪贴板
    std::string command = "echo '" + colorStr + "' | pbcopy";
    system(command.c_str());
}

// Base64 编码字符集
static const std::string base64_chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

// Base64 编码函数
std::string base64Encode(const unsigned char *data, size_t size)
{
    std::string result;
    int i = 0;
    int j = 0;
    unsigned char char_array_3[3];
    unsigned char char_array_4[4];

    while (size--)
    {
        char_array_3[i++] = *(data++);
        if (i == 3)
        {
            char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
            char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
            char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
            char_array_4[3] = char_array_3[2] & 0x3f;

            for (i = 0; i < 4; i++)
                result += base64_chars[char_array_4[i]];
            i = 0;
        }
    }

    if (i)
    {
        for (j = i; j < 3; j++)
            char_array_3[j] = '\0';

        char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
        char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
        char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
        char_array_4[3] = char_array_3[2] & 0x3f;

        for (j = 0; j < i + 1; j++)
            result += base64_chars[char_array_4[j]];

        while ((i++ < 3))
            result += '=';
    }

    return result;
}

std::string getColorName(CGColorRef color)
{
    const CGFloat *components = CGColorGetComponents(color);
    int r = (int)(components[0] * 255);
    int g = (int)(components[1] * 255);
    int b = (int)(components[2] * 255);

    struct Color
    {
        std::string name;
        int r, g, b;
    };

    std::vector<Color> colors = {
        {"Red", 255, 0, 0},
        {"Green", 0, 255, 0},
        {"Blue", 0, 0, 255},
        {"Yellow", 255, 255, 0},
        {"Cyan", 0, 255, 255},
        {"Magenta", 255, 0, 255},
        {"Black", 0, 0, 0},
        {"White", 255, 255, 255},
        {"Gray", 128, 128, 128},
        {"Orange", 255, 165, 0},
        {"Purple", 128, 0, 128},
        {"Pink", 255, 192, 203},
        {"Brown", 165, 42, 42},
        {"Lime", 0, 255, 0},
        {"Teal", 0, 128, 128},
        {"Navy", 0, 0, 128},
        {"Maroon", 128, 0, 0},
        {"Olive", 128, 128, 0},
        {"Silver", 192, 192, 192},
        {"Gold", 255, 215, 0},
        {"AliceBlue", 240, 248, 255},
        {"AntiqueWhite", 250, 235, 215},
        {"Aqua", 0, 255, 255},
        {"Aquamarine", 127, 255, 212},
        {"Azure", 240, 255, 255},
        {"Beige", 245, 245, 220},
        {"Bisque", 255, 228, 196},
        {"BlanchedAlmond", 255, 235, 205},
        {"BlueViolet", 138, 43, 226},
        {"BurlyWood", 222, 184, 135},
        {"CadetBlue", 95, 158, 160},
        {"Chartreuse", 127, 255, 0},
        {"Chocolate", 210, 105, 30},
        {"Coral", 255, 127, 80},
        {"CornflowerBlue", 100, 149, 237},
        {"Cornsilk", 255, 248, 220},
        {"Crimson", 220, 20, 60},
        {"DarkBlue", 0, 0, 139},
        {"DarkCyan", 0, 139, 139},
        {"DarkGoldenRod", 184, 134, 11},
        {"DarkGray", 169, 169, 169},
        {"DarkGreen", 0, 100, 0},
        {"DarkKhaki", 189, 183, 107},
        {"DarkMagenta", 139, 0, 139},
        {"DarkOliveGreen", 85, 107, 47},
        {"DarkOrange", 255, 140, 0},
        {"DarkOrchid", 153, 50, 204},
        {"DarkRed", 139, 0, 0},
        {"DarkSalmon", 233, 150, 122},
        {"DarkSeaGreen", 143, 188, 143},
        {"DarkSlateBlue", 72, 61, 139},
        {"DarkSlateGray", 47, 79, 79},
        {"DarkTurquoise", 0, 206, 209},
        {"DarkViolet", 148, 0, 211},
        {"DeepPink", 255, 20, 147},
        {"DeepSkyBlue", 0, 191, 255},
        {"DimGray", 105, 105, 105},
        {"DodgerBlue", 30, 144, 255},
        {"FireBrick", 178, 34, 34},
        {"FloralWhite", 255, 250, 240},
        {"ForestGreen", 34, 139, 34},
        {"Fuchsia", 255, 0, 255},
        {"Gainsboro", 220, 220, 220},
        {"GhostWhite", 248, 248, 255},
        {"GoldenRod", 218, 165, 32},
        {"GreenYellow", 173, 255, 47},
        {"HoneyDew", 240, 255, 240},
        {"HotPink", 255, 105, 180},
        {"IndianRed", 205, 92, 92},
        {"Indigo", 75, 0, 130},
        {"Ivory", 255, 255, 240},
        {"Khaki", 240, 230, 140},
        {"Lavender", 230, 230, 250},
        {"LavenderBlush", 255, 240, 245},
        {"LawnGreen", 124, 252, 0},
        {"LemonChiffon", 255, 250, 205},
        {"LightBlue", 173, 216, 230},
        {"LightCoral", 240, 128, 128},
        {"LightCyan", 224, 255, 255},
        {"LightGoldenRodYellow", 250, 250, 210},
        {"LightGray", 211, 211, 211},
        {"LightGreen", 144, 238, 144},
        {"LightPink", 255, 182, 193},
        {"LightSalmon", 255, 160, 122},
        {"LightSeaGreen", 32, 178, 170},
        {"LightSkyBlue", 135, 206, 250},
        {"LightSlateGray", 119, 136, 153},
        {"LightSteelBlue", 176, 196, 222},
        {"LightYellow", 255, 255, 224},
        {"LimeGreen", 50, 205, 50},
        {"Linen", 250, 240, 230},
        {"MediumAquaMarine", 102, 205, 170},
        {"MediumBlue", 0, 0, 205},
        {"MediumOrchid", 186, 85, 211},
        {"MediumPurple", 147, 112, 219},
        {"MediumSeaGreen", 60, 179, 113},
        {"MediumSlateBlue", 123, 104, 238},
        {"MediumSpringGreen", 0, 250, 154},
        {"MediumTurquoise", 72, 209, 204},
        {"MediumVioletRed", 199, 21, 133},
        {"MidnightBlue", 25, 25, 112},
        {"MintCream", 245, 255, 250},
        {"MistyRose", 255, 228, 225},
        {"Moccasin", 255, 228, 181},
        {"NavajoWhite", 255, 222, 173},
        {"OldLace", 253, 245, 230},
        {"OliveDrab", 107, 142, 35},
        {"OrangeRed", 255, 69, 0},
        {"Orchid", 218, 112, 214},
        {"PaleGoldenRod", 238, 232, 170},
        {"PaleGreen", 152, 251, 152},
        {"PaleTurquoise", 175, 238, 238},
        {"PaleVioletRed", 219, 112, 147},
        {"PapayaWhip", 255, 239, 213},
        {"PeachPuff", 255, 218, 185},
        {"Peru", 205, 133, 63},
        {"Plum", 221, 160, 221},
        {"PowderBlue", 176, 224, 230},
        {"RosyBrown", 188, 143, 143},
        {"RoyalBlue", 65, 105, 225},
        {"SaddleBrown", 139, 69, 19},
        {"Salmon", 250, 128, 114},
        {"SandyBrown", 244, 164, 96},
        {"SeaGreen", 46, 139, 87},
        {"SeaShell", 255, 245, 238},
        {"Sienna", 160, 82, 45},
        {"SkyBlue", 135, 206, 235},
        {"SlateBlue", 106, 90, 205},
        {"SlateGray", 112, 128, 144},
        {"Snow", 255, 250, 250},
        {"SpringGreen", 0, 255, 127},
        {"SteelBlue", 70, 130, 180},
        {"Tan", 210, 180, 140},
        {"Thistle", 216, 191, 216},
        {"Tomato", 255, 99, 71},
        {"Turquoise", 64, 224, 208},
        {"Violet", 238, 130, 238},
        {"Wheat", 245, 222, 179},
        {"WhiteSmoke", 245, 245, 245},
        {"YellowGreen", 154, 205, 50}};

    double minDist = DBL_MAX;
    std::string closestName = "Unknown";

    for (const auto &c : colors)
    {
        double dist = sqrt(pow(r - c.r, 2) + pow(g - c.g, 2) + pow(b - c.b, 2));
        if (dist < minDist)
        {
            minDist = dist;
            closestName = c.name;
        }
    }

    // 在多个单词组成的颜色名称中间添加换行符
    std::string processedName;
    for (size_t i = 0; i < closestName.length(); ++i)
    {
        if (i > 0 && isupper(closestName[i]))
        {
            processedName += '\n';
        }
        processedName += closestName[i];
    }

    return processedName;
}

bool checkThreadStatus(ProcessState &state)
{
    return state.isRunning;
}

bool startThread(ProcessState &state)
{
    if (state.isRunning)
        return false;

    state.isRunning = true;
    state.colorUpdateThread = std::make_unique<std::thread>([&]()
                                                            {
                while (state.isRunning)
                {
                    if (!state.isKeyPress.load())
                    {
                        CGEventRef event = CGEventCreate(NULL);
                        CGPoint point = CGEventGetLocation(event);
                        CFRelease(event);
                        if (FIXED == state.selectType.load())
                        {
                            point.x = state.pointX.load();
                            point.y = state.pointY.load();
                        }
                        CGColorRef color = getPixelColorAtLocation(point);
                        if (color != NULL)
                        {
                            // Note: SetImage is not available here, need to handle in caller
                            // SetImage(returnBase64ImgFromColor(color, (DisplayFormatType)state.displayFormat.load()));
                            if (!CGColorEqualToColor(state.preColor.load(), color) && state.selectType.load() == FIXED)
                            {
                                state.preColor.store(color);
                                if (state.copyToClipboard.load())
                                    saveColorToClipboard(color, (DisplayFormatType)state.displayFormat.load());
                            }
                        }
                    }
                    std::this_thread::sleep_for(std::chrono::milliseconds(100));
                } });
    state.colorUpdateThread->detach();
    return true;
}

bool stopThread(ProcessState &state)
{
    state.isRunning = false;
    if (state.colorUpdateThread && state.colorUpdateThread->joinable())
    {
        state.colorUpdateThread->join();
    }
    return true;
}
