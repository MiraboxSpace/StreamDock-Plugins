//==============================================================================
/**
@file       CountdownOverlay.h

@brief      Countdown overlay window displayed before recording starts.
            Shows a neumorphic card with save-key text and 3-2-1 countdown.
            Uses Win32 layered windows + GDI+ for rendering.

            Lifecycle:
              show() → creates window, starts countdown timer
              countdownFinished() → emitted when countdown reaches 0
              hide()  → destroys window, stops timer
**/
//==============================================================================

#pragma once

#include <QObject>
#include <QTimer>
#include <QString>
#include <string>

#ifdef PLATFORM_WINDOWS
#include <windows.h>
#include <gdiplus.h>
#endif

class CountdownOverlay : public QObject
{
    Q_OBJECT

public:
    struct OverlayConfig {
        std::string imagePath;       // Full path to the PNG background
        std::string saveKeyText;     // e.g., "F10" — displayed in checkbox area
        int countdownSeconds = 3;    // Countdown duration
        int marginFromEdge  = 20;    // Pixels from screen right/bottom edge
    };

    explicit CountdownOverlay(QObject* parent = nullptr);
    ~CountdownOverlay();

    void setConfig(const OverlayConfig& config);

    /// Show the overlay window and start the countdown.
    /// Returns false if image cannot be loaded.
    bool show();

    /// Hide the overlay window and stop the countdown (e.g., on cancel).
    void hide();

    /// True while the overlay is visible.
    bool isVisible() const { return mVisible; }

signals:
    /// Emitted when the countdown reaches 0 and the overlay has been hidden.
    void countdownFinished();

private slots:
    void onCountdownTick();

private:
#ifdef PLATFORM_WINDOWS
    bool loadImage(const std::wstring& path);
    void render();
    void updateWindow();
    void cleanupResources();

    static LRESULT CALLBACK wndProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp);

    HWND mHwnd = nullptr;
    Gdiplus::Bitmap* mBackgroundImage = nullptr;
    Gdiplus::Bitmap* mRenderBuffer = nullptr;
    ULONG_PTR mGdiplusToken = 0;
#endif

    OverlayConfig mConfig;
    QTimer* mCountdownTimer = nullptr;
    int mCountdownRemaining = 0;
    bool mVisible = false;
    int mWindowWidth = 0;
    int mWindowHeight = 0;
};
