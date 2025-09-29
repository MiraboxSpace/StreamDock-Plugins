#include "imageHelper.h"
#include <cmath>
#include <cstdio>
#include <string>

#ifdef _WIN32
// GDI+ initialization
static ULONG_PTR gdiplusToken;
static bool gdiplusInitialized = false;

struct GdiPlusInitializer
{
    GdiPlusInitializer()
    {
        if (!gdiplusInitialized)
        {
            Gdiplus::GdiplusStartupInput gdiplusStartupInput;
            Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);
            gdiplusInitialized = true;
        }
    }

    ~GdiPlusInitializer()
    {
        if (gdiplusInitialized)
        {
            Gdiplus::GdiplusShutdown(gdiplusToken);
            gdiplusInitialized = false;
        }
    }
};

static GdiPlusInitializer gdiplusInitializer;
#endif

/// @brief 设定按钮的 128*128 图片,背景是黑色,外围是一个圆环,里面是 rate + unit 组成的白色文字,圆环的填充比例按照 rate 来决定,圆环的填充颜色由 colorString 决定
/// @param rate 0-100 占用率
/// @param unit 单位
/// @param colorInt 颜色16进制,如 0xRRGGBB
/// @return true 成功, false 失败
std::string imageHelper::getButtonImageBase64(int rate, const std::string &unit, const int colorInt)
{
#ifdef __APPLE__
    // Create bitmap context
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(NULL, 128, 128, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);
    if (!context)
        return "";
    // Fill black background
    CGContextSetRGBFillColor(context, 0, 0, 0, 1);
    CGContextFillRect(context, CGRectMake(0, 0, 128, 128));
    // Parse color
    unsigned int r = (colorInt >> 16) & 0xff;
    unsigned int g = (colorInt >> 8) & 0xff;
    unsigned int b = colorInt & 0xff;
    CGColorRef color = CGColorCreateGenericRGB(r / 255.0, g / 255.0, b / 255.0, 1);
    // Draw outer white ring
    CGContextSetRGBStrokeColor(context, 1, 1, 1, 1); // White color
    CGContextSetLineWidth(context, 2);
    CGContextAddArc(context, 64, 64, 55, 0, 2 * M_PI, 0); // Outer circle
    CGContextStrokePath(context);

    // Draw inner white ring
    CGContextSetRGBStrokeColor(context, 1, 1, 1, 1); // White color
    CGContextSetLineWidth(context, 2);
    CGContextAddArc(context, 64, 64, 45, 0, 2 * M_PI, 0); // Inner circle
    CGContextStrokePath(context);

    // Draw colored arc between the two rings (based on rate)
    CGContextSetStrokeColorWithColor(context, color);
    CGContextSetLineWidth(context, 8); // Fill the space between the two rings
    CGContextAddArc(context, 64, 64, 50, -M_PI / 2, -M_PI / 2 + 2 * M_PI * rate / 100.0, 0);
    CGContextStrokePath(context);

    // Draw text
    std::string text = std::to_string(rate) + unit;
    CGContextSetRGBFillColor(context, 1, 1, 1, 1);
    CGContextSelectFont(context, "Helvetica", 28, kCGEncodingMacRoman); // Increased font size from 20 to 28
    CGContextSetTextDrawingMode(context, kCGTextFill);

    // Calculate text width for centering
    CGContextSetTextMatrix(context, CGAffineTransformIdentity);

    // Use invisible text drawing to measure text width
    CGContextSetTextDrawingMode(context, kCGTextInvisible);
    CGContextShowTextAtPoint(context, 0, 0, text.c_str(), text.length());
    CGPoint endPos = CGContextGetTextPosition(context);
    float textWidth = endPos.x;

    // Draw centered text
    CGContextSetTextDrawingMode(context, kCGTextFill);
    // Adjust y position to account for font baseline and height
    float fontSize = 28.0;
    float yPos = 64 - fontSize / 3;                                                           // Adjust y position for vertical centering
    CGContextShowTextAtPoint(context, 64 - textWidth / 2, yPos, text.c_str(), text.length()); // Centered x and y position
    // Get image
    CGImageRef image = CGBitmapContextCreateImage(context);
    // Get PNG data
    CFMutableDataRef data = CFDataCreateMutable(kCFAllocatorDefault, 0);
    CGImageDestinationRef destination = CGImageDestinationCreateWithData(data, kUTTypePNG, 1, NULL);
    CGImageDestinationAddImage(destination, image, NULL);
    CGImageDestinationFinalize(destination);
    // Get data
    const unsigned char *bytes = CFDataGetBytePtr(data);
    size_t length = CFDataGetLength(data);
    // base64
    std::string b64 = base64Encode(bytes, length);
    // Clean up
    CFRelease(data);
    CFRelease(destination);
    CGImageRelease(image);
    CGContextRelease(context);
    CGColorSpaceRelease(colorSpace);
    CGColorRelease(color);
    return b64;
#elif defined(_WIN32)
    // Windows implementation using GDI+
    using namespace Gdiplus;

    // Create bitmap
    Bitmap bitmap(128, 128, PixelFormat32bppARGB);
    Graphics graphics(&bitmap);

    // Fill black background
    SolidBrush blackBrush(Color(255, 0, 0, 0));
    graphics.FillRectangle(&blackBrush, 0, 0, 128, 128);

    // Parse color
    unsigned int r = (colorInt >> 16) & 0xff;
    unsigned int g = (colorInt >> 8) & 0xff;
    unsigned int b = colorInt & 0xff;
    Color arcColor(255, r, g, b);

    // Draw outer white ring
    Pen whitePen(Color(255, 255, 255, 255), 2);
    graphics.DrawEllipse(&whitePen, 9, 9, 110, 110);

    // Draw inner white ring
    graphics.DrawEllipse(&whitePen, 19, 19, 90, 90);

    // Draw colored arc between the two rings (based on rate)
    Pen arcPen(arcColor, 8);
    graphics.DrawArc(&arcPen, 14, 14, 100, 100, -90, (float)(rate * 3.6));

    // Draw text
    std::string text = std::to_string(rate) + unit;
    std::wstring wtext(text.begin(), text.end());

    FontFamily fontFamily(L"Arial");
    Font font(&fontFamily, 28, FontStyleRegular, UnitPixel);
    SolidBrush textBrush(Color(255, 255, 255, 255));

    // Measure text for centering
    RectF boundingBox(0, 0, 128, 128);
    RectF textBounds;
    graphics.MeasureString(wtext.c_str(), wtext.length(), &font, boundingBox, &textBounds);

    // Draw centered text
    StringFormat format;
    format.SetAlignment(StringAlignmentCenter);
    format.SetLineAlignment(StringAlignmentCenter);
    graphics.DrawString(wtext.c_str(), wtext.length(), &font, boundingBox, &format, &textBrush);

    // Convert to PNG and base64
    IStream *stream = NULL;
    CreateStreamOnHGlobal(NULL, TRUE, &stream);

    CLSID pngClsid;
    GetEncoderClsid(L"image/png", &pngClsid);
    bitmap.Save(stream, &pngClsid, NULL);

    // Get stream size
    STATSTG stat;
    stream->Stat(&stat, STATFLAG_DEFAULT);
    LARGE_INTEGER pos = {0};
    stream->Seek(pos, STREAM_SEEK_SET, NULL);

    // Read data
    std::vector<BYTE> buffer(stat.cbSize.LowPart);
    ULONG bytesRead;
    stream->Read(buffer.data(), stat.cbSize.LowPart, &bytesRead);

    // Convert to base64
    std::string b64 = base64Encode(buffer.data(), bytesRead);

    // Clean up
    stream->Release();

    return b64;
#endif
}

/// @brief Convert color from int to string
/// @param color  0xRRGGBB
/// @return "#RRGGBB"
std::string imageHelper::colorToString(const int color)
{
    char buffer[8];
    snprintf(buffer, sizeof(buffer), "#%06x", color);
    return std::string(buffer);
}

/// @brief Convert color from string to int
/// @param colorString "#RRGGBB"
/// @return 0xRRGGBB
int imageHelper::stringToColor(const std::string colorString)
{
    int color = 0;
    sscanf(colorString.c_str() + 1, "%06x", &color);
    return color;
}

/// @brief 返回一张显示网速的图片,图片大小128*128,背景黑色,  上方显示上传速度+单位, 下方显示下载速度+单位,单位会自己切换为 KB/s 或 MB/s, 颜色为白色
/// @param uploadRate 上传速度,单位为 KB/s
/// @param downloadRate 下载速度,单位为 KB/s
/// @return base64 编码的图片数据
std::string imageHelper::getDataRateImageBase64(double uploadRate, double downloadRate)
{
#ifdef __APPLE__
    // Create bitmap context
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(NULL, 128, 128, 8, 0, colorSpace, kCGImageAlphaPremultipliedLast);
    if (!context)
        return "";

    // Fill black background
    CGContextSetRGBFillColor(context, 0, 0, 0, 1);
    CGContextFillRect(context, CGRectMake(0, 0, 128, 128));

    // Draw decorative border
    CGContextSetRGBStrokeColor(context, 0.2, 0.2, 0.2, 1);
    CGContextSetLineWidth(context, 1);
    CGContextStrokeRect(context, CGRectMake(2, 2, 124, 124));

    // Convert rates to appropriate units and format strings
    auto formatRate = [](double rate)
    {
        char buffer[16];
        if (rate >= 1024)
        {
            snprintf(buffer, sizeof(buffer), "%.1f MB/s", rate / 1024.0);
        }
        else
        {
            snprintf(buffer, sizeof(buffer), "%.0f KB/s", rate);
        }
        return std::string(buffer);
    };

    std::string uploadText = formatRate(uploadRate);
    std::string downloadText = formatRate(downloadRate);

    // Draw upload icon (up arrow) - moved left
    CGContextSetRGBFillColor(context, 0.2, 0.8, 0.2, 1); // Green for upload
    CGContextBeginPath(context);
    CGContextMoveToPoint(context, 25, 40);    // Moved up and left
    CGContextAddLineToPoint(context, 35, 25); // Moved up and left
    CGContextAddLineToPoint(context, 45, 40); // Moved up and left
    CGContextAddLineToPoint(context, 40, 40);
    CGContextAddLineToPoint(context, 40, 50);
    CGContextAddLineToPoint(context, 30, 50);
    CGContextAddLineToPoint(context, 30, 40);
    CGContextClosePath(context);
    CGContextFillPath(context);

    // Draw download icon (down arrow) - moved left
    CGContextSetRGBFillColor(context, 0.2, 0.4, 0.8, 1); // Blue for download
    CGContextBeginPath(context);
    CGContextMoveToPoint(context, 25, 90);     // Moved down and left
    CGContextAddLineToPoint(context, 35, 105); // Moved down and left
    CGContextAddLineToPoint(context, 45, 90);  // Moved down and left
    CGContextAddLineToPoint(context, 40, 90);
    CGContextAddLineToPoint(context, 40, 80);
    CGContextAddLineToPoint(context, 30, 80);
    CGContextAddLineToPoint(context, 30, 90);
    CGContextClosePath(context);
    CGContextFillPath(context);

    // Draw upload text
    CGContextSetRGBFillColor(context, 1, 1, 1, 1);
    CGContextSelectFont(context, "Helvetica", 14, kCGEncodingMacRoman); // Further reduced font size to prevent wrapping
    CGContextSetTextDrawingMode(context, kCGTextFill);

    // Calculate upload text width for centering
    CGContextSetTextMatrix(context, CGAffineTransformIdentity);
    CGContextSetTextDrawingMode(context, kCGTextInvisible);
    CGContextShowTextAtPoint(context, 0, 0, uploadText.c_str(), uploadText.length());
    CGPoint uploadEndPos = CGContextGetTextPosition(context);
    float uploadTextWidth = uploadEndPos.x;

    // Draw centered upload text - moved further left and up for better visibility
    CGContextSetTextDrawingMode(context, kCGTextFill);
    CGContextShowTextAtPoint(context, 80 - uploadTextWidth / 2, 35, uploadText.c_str(), uploadText.length());

    // Draw download text
    CGContextSetTextMatrix(context, CGAffineTransformIdentity);
    CGContextSetTextDrawingMode(context, kCGTextInvisible);
    CGContextShowTextAtPoint(context, 0, 0, downloadText.c_str(), downloadText.length());
    CGPoint downloadEndPos = CGContextGetTextPosition(context);
    float downloadTextWidth = downloadEndPos.x;

    // Draw centered download text - moved further left and down for better visibility
    CGContextSetTextDrawingMode(context, kCGTextFill);
    CGContextShowTextAtPoint(context, 80 - downloadTextWidth / 2, 95, downloadText.c_str(), downloadText.length());

    // Draw separator line - moved left
    CGContextSetRGBStrokeColor(context, 0.3, 0.3, 0.3, 1);
    CGContextSetLineWidth(context, 1);
    CGContextBeginPath(context);
    CGContextMoveToPoint(context, 15, 65);
    CGContextAddLineToPoint(context, 113, 65);
    CGContextStrokePath(context);

    // Get image
    CGImageRef image = CGBitmapContextCreateImage(context);

    // Get PNG data
    CFMutableDataRef data = CFDataCreateMutable(kCFAllocatorDefault, 0);
    CGImageDestinationRef destination = CGImageDestinationCreateWithData(data, kUTTypePNG, 1, NULL);
    CGImageDestinationAddImage(destination, image, NULL);
    CGImageDestinationFinalize(destination);

    // Get data
    const unsigned char *bytes = CFDataGetBytePtr(data);
    size_t length = CFDataGetLength(data);

    // base64
    std::string b64 = base64Encode(bytes, length);

    // Clean up
    CFRelease(data);
    CFRelease(destination);
    CGImageRelease(image);
    CGContextRelease(context);
    CGColorSpaceRelease(colorSpace);

    return b64;
#elif defined(_WIN32)
    // Windows implementation using GDI+
    using namespace Gdiplus;

    // Create bitmap
    Bitmap bitmap(128, 128, PixelFormat32bppARGB);
    Graphics graphics(&bitmap);

    // Fill black background
    SolidBrush blackBrush(Color(255, 0, 0, 0));
    graphics.FillRectangle(&blackBrush, 0, 0, 128, 128);

    // Draw decorative border
    Pen borderPen(Color(255, 51, 51, 51), 1);
    graphics.DrawRectangle(&borderPen, 2, 2, 124, 124);

    // Convert rates to appropriate units and format strings
    auto formatRate = [](double rate)
    {
        char buffer[16];
        if (rate >= 1024)
        {
            snprintf(buffer, sizeof(buffer), "%.1f MB/s", rate / 1024.0);
        }
        else
        {
            snprintf(buffer, sizeof(buffer), "%.0f KB/s", rate);
        }
        return std::string(buffer);
    };

    std::string uploadText = formatRate(uploadRate);
    std::string downloadText = formatRate(downloadRate);
    std::wstring wUploadText(uploadText.begin(), uploadText.end());
    std::wstring wDownloadText(downloadText.begin(), downloadText.end());

    // Draw upload icon (up arrow) - moved left and up
    SolidBrush uploadBrush(Color(255, 51, 204, 51)); // Green for upload
    Point uploadArrowPoints[] = {
        Point(25, 40), // Moved up and left
        Point(35, 25), // Moved up and left
        Point(45, 40), // Moved up and left
        Point(40, 40),
        Point(40, 50),
        Point(30, 50),
        Point(30, 40)};
    graphics.FillPolygon(&uploadBrush, uploadArrowPoints, 7);

    // Draw download icon (down arrow) - moved left and down
    SolidBrush downloadBrush(Color(255, 51, 102, 204)); // Blue for download
    Point downloadArrowPoints[] = {
        Point(25, 90),  // Moved down and left
        Point(35, 105), // Moved down and left
        Point(45, 90),  // Moved down and left
        Point(40, 90),
        Point(40, 80),
        Point(30, 80),
        Point(30, 90)};
    graphics.FillPolygon(&downloadBrush, downloadArrowPoints, 7);

    // Draw upload text
    FontFamily fontFamily(L"Arial");
    Font font(&fontFamily, 14, FontStyleRegular, UnitPixel); // Further reduced font size to prevent wrapping
    SolidBrush textBrush(Color(255, 255, 255, 255));

    RectF uploadTextBox(45, 25, 80, 30); // Increased text area width and height to prevent wrapping
    StringFormat format;
    format.SetAlignment(StringAlignmentNear);
    format.SetLineAlignment(StringAlignmentCenter);
    format.SetFormatFlags(StringFormatFlagsNoWrap); // Prevent text wrapping
    graphics.DrawString(wUploadText.c_str(), wUploadText.length(), &font, uploadTextBox, &format, &textBrush);

    // Draw download text
    RectF downloadTextBox(45, 85, 80, 30); // Increased text area width and height to prevent wrapping
    graphics.DrawString(wDownloadText.c_str(), wDownloadText.length(), &font, downloadTextBox, &format, &textBrush);

    // Draw separator line - moved left
    Pen separatorPen(Color(255, 77, 77, 77), 1);
    graphics.DrawLine(&separatorPen, 15, 65, 113, 65);

    // Convert to PNG and base64
    IStream *stream = NULL;
    CreateStreamOnHGlobal(NULL, TRUE, &stream);

    CLSID pngClsid;
    GetEncoderClsid(L"image/png", &pngClsid);
    bitmap.Save(stream, &pngClsid, NULL);

    // Get stream size
    STATSTG stat;
    stream->Stat(&stat, STATFLAG_DEFAULT);
    LARGE_INTEGER pos = {0};
    stream->Seek(pos, STREAM_SEEK_SET, NULL);

    // Read data
    std::vector<BYTE> buffer(stat.cbSize.LowPart);
    ULONG bytesRead;
    stream->Read(buffer.data(), stat.cbSize.LowPart, &bytesRead);

    // Convert to base64
    std::string b64 = base64Encode(buffer.data(), bytesRead);

    // Clean up
    stream->Release();

    return b64;
#endif
}

/// @brief Encode data to base64
/// @param data Pointer to the data to encode
/// @param size Size of the data to encode
/// @return base64 encoded string
std::string imageHelper::base64Encode(const unsigned char *data, size_t size)
{
    const std::string base64_chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "0123456789+/";
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

#ifdef _WIN32
/// @brief Get the CLSID for the specified image encoder
/// @param format The image format (e.g., "image/png")
/// @param pClsid Pointer to receive the CLSID
/// @return True if successful, false otherwise
int imageHelper::GetEncoderClsid(const WCHAR *format, CLSID *pClsid)
{
    using namespace Gdiplus;

    UINT num = 0;
    UINT size = 0;

    GetImageEncodersSize(&num, &size);
    if (size == 0)
        return -1;

    ImageCodecInfo *pImageCodecInfo = (ImageCodecInfo *)(malloc(size));
    if (pImageCodecInfo == NULL)
        return -1;

    GetImageEncoders(num, size, pImageCodecInfo);

    for (UINT j = 0; j < num; ++j)
    {
        if (wcscmp(pImageCodecInfo[j].MimeType, format) == 0)
        {
            *pClsid = pImageCodecInfo[j].Clsid;
            free(pImageCodecInfo);
            return j;
        }
    }

    free(pImageCodecInfo);
    return -1;
}
#endif
