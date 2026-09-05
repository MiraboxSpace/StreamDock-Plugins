//==============================================================================
/**
@file       CountdownOverlay.cpp

@brief      Implementation of the recording countdown overlay.
            Uses Win32 layered windows + GDI+ to display a PNG card with
            dynamic save-key text and 3-2-1 countdown rendered on top.
**/
//==============================================================================

#include "recording/CountdownOverlay.h"
#include "logging/Logger.h"

#include <QCoreApplication>
#include <QString>
#include <cmath>
#include <cstdint>
#include <string>

#ifdef PLATFORM_WINDOWS
#include <gdiplus.h>

// Link gdiplus (pragma comment is the simplest way alongside CMake target_link_libraries)
#pragma comment(lib, "gdiplus")
#endif

//==============================================================================
// Text position constants (absolute pixels for the 300×300 overlay image)
// Source: countdown_overlay_coords.md
//==============================================================================

static constexpr int kCheckboxCenterX  = 69;   // Save key text centered in checkbox
static constexpr int kCheckboxCenterY  = 72;
static constexpr int kCountdownCenterX = 149;  // Countdown number centered in inner circle
static constexpr int kCountdownCenterY = 181;

//==============================================================================
// Construction / Destruction
//==============================================================================

CountdownOverlay::CountdownOverlay(QObject* parent)
    : QObject(parent)
    , mCountdownTimer(new QTimer(this))
{
#ifdef PLATFORM_WINDOWS
    Gdiplus::GdiplusStartupInput gdiplusStartupInput;
    Gdiplus::Status status = Gdiplus::GdiplusStartup(
        &mGdiplusToken, &gdiplusStartupInput, nullptr);
    if (status != Gdiplus::Ok) {
        Logger::instance()->log("[WARN] [Overlay] GdiplusStartup failed — status: %d", static_cast<int>(status));
        mGdiplusToken = 0;
    }
#endif

    mCountdownTimer->setTimerType(Qt::PreciseTimer);

    connect(mCountdownTimer, &QTimer::timeout,
            this, &CountdownOverlay::onCountdownTick);
}

CountdownOverlay::~CountdownOverlay()
{
    hide();
#ifdef PLATFORM_WINDOWS
    cleanupResources();
    if (mGdiplusToken) {
        Gdiplus::GdiplusShutdown(mGdiplusToken);
        mGdiplusToken = 0;
    }
#endif
}

void CountdownOverlay::setConfig(const OverlayConfig& config)
{
    mConfig = config;
}

//==============================================================================
// Show / Hide
//==============================================================================

bool CountdownOverlay::show()
{
    if (mVisible) {
        Logger::instance()->log("[WARN] [Overlay] Already visible");
        return true;
    }

#ifdef PLATFORM_WINDOWS
    if (!mGdiplusToken) {
        Logger::instance()->log("[WARN] [Overlay] GDI+ not initialized — cannot show overlay");
        return false;
    }

    // Convert image path to wide string for GDI+ (via Qt for reliable UTF-8 → UTF-16)
    QString qpath = QString::fromStdString(mConfig.imagePath);
    std::wstring widePath = qpath.toStdWString();

    // Load the background image
    if (!loadImage(widePath)) {
        Logger::instance()->log("[WARN] [Overlay] Image load failed — overlay disabled for this session");
        return false;
    }

    // Register window class (once)
    static bool sClassRegistered = false;
    if (!sClassRegistered) {
        WNDCLASSEXW wc = {};
        wc.cbSize        = sizeof(WNDCLASSEXW);
        wc.style         = CS_HREDRAW | CS_VREDRAW;
        wc.lpfnWndProc   = CountdownOverlay::wndProc;
        wc.hInstance     = GetModuleHandle(nullptr);
        wc.hCursor       = LoadCursor(nullptr, IDC_ARROW);
        wc.hbrBackground = nullptr;  // Not used for layered windows
        wc.lpszClassName = L"CountdownOverlayClass";

        if (!RegisterClassExW(&wc)) {
            Logger::instance()->log("[ERROR] [Overlay] RegisterClassExW failed (error: %lu)", GetLastError());
            cleanupResources();
            return false;
        }
        sClassRegistered = true;
    }

    // Calculate screen position (bottom-right corner)
    int screenW = GetSystemMetrics(SM_CXSCREEN);
    int screenH = GetSystemMetrics(SM_CYSCREEN);
    int x = screenW - mWindowWidth - mConfig.marginFromEdge;
    int y = screenH - mWindowHeight - mConfig.marginFromEdge;

    // Clamp to screen (safety for very large images)
    if (x < 0) x = 0;
    if (y < 0) y = 0;

    // Create layered window
    mHwnd = CreateWindowExW(
        WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE,
        L"CountdownOverlayClass",
        L"",                           // No title
        WS_POPUP,
        x, y,
        mWindowWidth, mWindowHeight,
        nullptr,                       // No parent
        nullptr,                       // No menu
        GetModuleHandle(nullptr),
        nullptr                        // No extra param
    );

    if (!mHwnd) {
        Logger::instance()->log("[ERROR] [Overlay] CreateWindowExW failed (error: %lu)", GetLastError());
        cleanupResources();
        return false;
    }

    // Initial render with starting countdown value
    mCountdownRemaining = mConfig.countdownSeconds;
    render();
    updateWindow();

    // Show without activating (don't steal focus)
    ShowWindow(mHwnd, SW_SHOWNOACTIVATE);
    mVisible = true;

    // Start the 1-second countdown timer
    mCountdownTimer->start(1000);

    Logger::instance()->log("[Overlay] Shown — %dx%d at (%d,%d), countdown: %ds, save key: %s",
        mWindowWidth, mWindowHeight, x, y,
        mConfig.countdownSeconds, mConfig.saveKeyText.c_str());

    return true;
#else
    Logger::instance()->log("[WARN] [Overlay] show() called on non-Windows platform");
    return false;
#endif
}

void CountdownOverlay::hide()
{
    if (!mVisible) return;

    Logger::instance()->log("[Overlay] Hiding overlay");

    mCountdownTimer->stop();
    mVisible = false;

#ifdef PLATFORM_WINDOWS
    if (mHwnd) {
        DestroyWindow(mHwnd);
        mHwnd = nullptr;
    }
    cleanupResources();
#endif
}

//==============================================================================
// GDI+ Rendering
//==============================================================================

#ifdef PLATFORM_WINDOWS

bool CountdownOverlay::loadImage(const std::wstring& path)
{
    mBackgroundImage = new Gdiplus::Bitmap(path.c_str());
    if (mBackgroundImage->GetLastStatus() != Gdiplus::Ok) {
        Logger::instance()->log("[ERROR] [Overlay] Failed to load image (GDI+ status: %d)",
            static_cast<int>(mBackgroundImage->GetLastStatus()));
        delete mBackgroundImage;
        mBackgroundImage = nullptr;
        return false;
    }

    mWindowWidth  = static_cast<int>(mBackgroundImage->GetWidth());
    mWindowHeight = static_cast<int>(mBackgroundImage->GetHeight());

    Logger::instance()->log("[Overlay] Image loaded: %dx%d", mWindowWidth, mWindowHeight);
    return true;
}

void CountdownOverlay::render()
{
    if (!mBackgroundImage) return;

    // Release previous render buffer
    if (mRenderBuffer) {
        delete mRenderBuffer;
        mRenderBuffer = nullptr;
    }

    // Create 32-bit ARGB render buffer
    mRenderBuffer = new Gdiplus::Bitmap(
        mWindowWidth, mWindowHeight, PixelFormat32bppARGB);
    if (mRenderBuffer->GetLastStatus() != Gdiplus::Ok) {
        Logger::instance()->log("[ERROR] [Overlay] Failed to create render buffer");
        delete mRenderBuffer;
        mRenderBuffer = nullptr;
        return;
    }

    // Create graphics context with high-quality text rendering
    Gdiplus::Graphics graphics(mRenderBuffer);
    graphics.SetSmoothingMode(Gdiplus::SmoothingModeAntiAlias);
    graphics.SetTextRenderingHint(Gdiplus::TextRenderingHintAntiAlias);
    graphics.SetInterpolationMode(Gdiplus::InterpolationModeHighQualityBicubic);

    // ── Draw background image ──
    graphics.DrawImage(mBackgroundImage,
        static_cast<Gdiplus::REAL>(0),
        static_cast<Gdiplus::REAL>(0),
        static_cast<Gdiplus::REAL>(mWindowWidth),
        static_cast<Gdiplus::REAL>(mWindowHeight));

    // ── Draw save key text centered in the existing checkbox (from background PNG) ──
    {
        // Font size: ~10px per coords spec
        Gdiplus::REAL fontSize = 10.0f;
        Gdiplus::FontFamily fontFamily(L"Arial");
        Gdiplus::Font font(&fontFamily, fontSize, Gdiplus::FontStyleBold, Gdiplus::UnitPixel);

        // Convert save key text to wide string
        std::wstring saveKeyWide = QString::fromStdString(mConfig.saveKeyText).toStdWString();
        if (saveKeyWide.empty()) saveKeyWide = L"F10";

        Gdiplus::SolidBrush blackBrush(Gdiplus::Color::Black);
        Gdiplus::StringFormat stringFormat;
        stringFormat.SetAlignment(Gdiplus::StringAlignmentCenter);
        stringFormat.SetLineAlignment(Gdiplus::StringAlignmentCenter);
        stringFormat.SetFormatFlags(Gdiplus::StringFormatFlagsNoWrap);

        // Center text at the checkbox center point
        Gdiplus::RectF textRect(
            static_cast<Gdiplus::REAL>(kCheckboxCenterX - 10),
            static_cast<Gdiplus::REAL>(kCheckboxCenterY - 15),
            static_cast<Gdiplus::REAL>(21),
            static_cast<Gdiplus::REAL>(31));

        graphics.DrawString(saveKeyWide.c_str(), -1,
            &font, textRect, &stringFormat, &blackBrush);
    }

    // ── Draw countdown number centered in the pink inner circle ──
    {
        // Convert countdown number to wide string
        std::wstring countText = std::to_wstring(mCountdownRemaining);

        // Font size: ~50px per coords spec
        Gdiplus::REAL fontSize = 50.0f;

        Gdiplus::FontFamily fontFamily(L"Arial");
        Gdiplus::Font font(&fontFamily, fontSize, Gdiplus::FontStyleBold, Gdiplus::UnitPixel);

        // Pure black — visible against the pink circular background
        Gdiplus::SolidBrush blackBrush(Gdiplus::Color::Black);

        Gdiplus::StringFormat stringFormat;
        stringFormat.SetAlignment(Gdiplus::StringAlignmentCenter);
        stringFormat.SetLineAlignment(Gdiplus::StringAlignmentCenter);

        // Center the countdown text at the inner circle center (149, 181)
        // Inner circle radius = 61px → 122×122 bounding box
        Gdiplus::RectF layoutRect(
            static_cast<Gdiplus::REAL>(kCountdownCenterX - 61),
            static_cast<Gdiplus::REAL>(kCountdownCenterY - 61),
            static_cast<Gdiplus::REAL>(122),
            static_cast<Gdiplus::REAL>(122));

        graphics.DrawString(countText.c_str(), -1,
            &font, layoutRect, &stringFormat, &blackBrush);
    }
}

void CountdownOverlay::updateWindow()
{
    if (!mHwnd || !mRenderBuffer) return;

    // Get bitmap data from GDI+ render buffer
    Gdiplus::Rect rect(0, 0, mWindowWidth, mWindowHeight);
    Gdiplus::BitmapData bitmapData;
    Gdiplus::Status lockStatus = mRenderBuffer->LockBits(
        &rect, Gdiplus::ImageLockModeRead, PixelFormat32bppARGB, &bitmapData);
    if (lockStatus != Gdiplus::Ok) {
        Logger::instance()->log("[WARN] [Overlay] LockBits failed (status: %d)",
            static_cast<int>(lockStatus));
        return;
    }

    // Create a bitmap header for a 32-bit DIB
    BITMAPINFO bmi = {};
    bmi.bmiHeader.biSize        = sizeof(BITMAPINFOHEADER);
    bmi.bmiHeader.biWidth       = mWindowWidth;
    bmi.bmiHeader.biHeight      = -mWindowHeight;  // Top-down (negative height)
    bmi.bmiHeader.biPlanes      = 1;
    bmi.bmiHeader.biBitCount    = 32;
    bmi.bmiHeader.biCompression = BI_RGB;

    // Create a DIB section and copy pixel data
    HDC screenDC = GetDC(nullptr);
    void* pBits = nullptr;
    HBITMAP hBitmap = CreateDIBSection(
        screenDC, &bmi, DIB_RGB_COLORS, &pBits, nullptr, 0);
    if (hBitmap && pBits) {
        // Copy GDI+ pixels to the DIB section
        memcpy(pBits, bitmapData.Scan0, mWindowWidth * mWindowHeight * 4);

        // Create a memory DC and select the bitmap
        HDC memDC = CreateCompatibleDC(screenDC);
        HBITMAP oldBitmap = (HBITMAP)SelectObject(memDC, hBitmap);

        // Prepare for UpdateLayeredWindow
        POINT ptDest = {};
        {
            RECT winRect;
            GetWindowRect(mHwnd, &winRect);
            ptDest.x = winRect.left;
            ptDest.y = winRect.top;
        }

        SIZE size = { mWindowWidth, mWindowHeight };
        POINT ptSrc = { 0, 0 };

        BLENDFUNCTION blend = {};
        blend.BlendOp             = AC_SRC_OVER;
        blend.BlendFlags          = 0;
        blend.SourceConstantAlpha = 255;  // Fully opaque
        blend.AlphaFormat         = AC_SRC_ALPHA;

        UpdateLayeredWindow(mHwnd, screenDC, &ptDest, &size,
            memDC, &ptSrc, 0, &blend, ULW_ALPHA);

        // Cleanup
        SelectObject(memDC, oldBitmap);
        DeleteDC(memDC);
        DeleteObject(hBitmap);
    }
    ReleaseDC(nullptr, screenDC);

    mRenderBuffer->UnlockBits(&bitmapData);
}

void CountdownOverlay::cleanupResources()
{
    if (mRenderBuffer) {
        delete mRenderBuffer;
        mRenderBuffer = nullptr;
    }
    if (mBackgroundImage) {
        delete mBackgroundImage;
        mBackgroundImage = nullptr;
    }
}

//==============================================================================
// Window Procedure (static)
//==============================================================================

LRESULT CALLBACK CountdownOverlay::wndProc(HWND hwnd, UINT msg,
                                            WPARAM wp, LPARAM lp)
{
    switch (msg) {
    case WM_DESTROY:
        // Do NOT call PostQuitMessage — it would poison the thread's message
        // queue with WM_QUIT and kill low-level hook dispatch for recording.
        return 0;
    // WM_PAINT is not needed — UpdateLayeredWindow handles all visual updates
    }
    return DefWindowProc(hwnd, msg, wp, lp);
}

#endif // PLATFORM_WINDOWS

//==============================================================================
// Countdown Timer
//==============================================================================

void CountdownOverlay::onCountdownTick()
{
    // Decrement first so each number is visible for exactly one tick interval.
    // (show() already rendered the starting value — re-rendering it before
    // decrementing would leave it on screen for two full intervals.)
    mCountdownRemaining--;

    Logger::instance()->log("[Overlay] Countdown: %d", mCountdownRemaining);

    if (mCountdownRemaining <= 0) {
        mCountdownTimer->stop();
        hide();
        emit countdownFinished();
        return;
    }

    // Re-render with the new countdown number
    render();
    updateWindow();
}
