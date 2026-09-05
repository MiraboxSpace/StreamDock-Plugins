//==============================================================================
/**
@file       InputRecorder.h

@brief      Low-level mouse/keyboard input recorder using Windows hooks.
            Records to the #START#;...#STOP# stream format matching
            the original mouse simulator plugin.

            Uses SetWindowsHookEx (WH_MOUSE_LL + WH_KEYBOARD_LL).
            Must run on a thread with a Windows message pump.
**/
//==============================================================================

#pragma once

#include <QObject>
#include <QMutex>
#include <QAtomicInt>
#include <string>
#include <vector>
#include <memory>
#include <windows.h>

class CountdownOverlay;

/// Key name to VK code mapping for the save key dropdown
struct SaveKeyMapping {
    std::string name;
    DWORD vkCode;
};

/// Get VK code from save key name (F1-F12, ESC)
DWORD saveKeyNameToVk(const std::string& name);

class InputRecorder : public QObject
{
    Q_OBJECT

public:
    explicit InputRecorder(QObject* parent = nullptr);
    ~InputRecorder();

    /// Start recording with the given save key
    bool startRecording(const std::string& saveKeyName = "F10");

    /// Stop recording and finalize the stream
    void stopRecording();

    /// Get the recorded stream in #START#;...#STOP# format
    std::string recordedStream() const;

    /// Check if currently recording
    bool isRecording() const { return mIsRecording.loadRelaxed() != 0; }

    /// Cancel countdown overlay without installing hooks (called on user cancel)
    void cancelCountdown();

signals:
    /// Emitted when recording is saved (via save key press)
    void recordingSaved(const std::string& recordStream);

    /// Emitted when recording is cancelled
    void recordingCancelled();

private slots:
    /// Called when the countdown overlay finishes (3-2-1 → 0)
    void onCountdownFinished();

private:
    // Windows hook procs (must be static for Win32 API)
    static LRESULT CALLBACK mouseHookProc(int nCode, WPARAM wParam, LPARAM lParam);
    static LRESULT CALLBACK keyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam);

    // Instance methods called from static procs
    void onMouseEvent(WPARAM wParam, LPARAM lParam);
    void onKeyboardEvent(WPARAM wParam, LPARAM lParam);

    // Event recording
    void recordCoordinate(const POINT& pt);
    void recordMouseButton(int button, bool down);
    void recordMouseWheel(int delta);
    void recordKeyEvent(DWORD vkCode, bool down);
    void recordDelay();
    /// Install low-level hooks (extracted from startRecording for deferred execution)
    bool installHooks();

    void finalizeStream();
    void minimizeParentWindow();
    void flashParentWindow();

    // Write stream to clipboard (for PI polling)
    void writeToClipboard(const std::string& text);

    // Hooks
    HHOOK mMouseHook = nullptr;
    HHOOK mKeyboardHook = nullptr;

    // State
    QAtomicInt mIsRecording{0};
    DWORD mSaveKeyVk = VK_F10;
    std::string mSaveKeyName = "F10";
    HWND mParentWindow = nullptr;  // Main window of parent process (minimized on record, flashed on save)

    // Accumulated instructions
    mutable QMutex mBufferMutex;
    std::vector<std::string> mInstructions;
    POINT mLastMousePos = {0, 0};
    DWORD mLastEventTicks = 0;
    bool mHasFirstEvent = false;

    // Countdown overlay (shown before recording starts)
    std::unique_ptr<CountdownOverlay> mCountdownOverlay;
    bool mCountdownActive = false;  // True while overlay is showing (pre-recording phase)

    // Singleton pointer for hook procs to access the recorder instance
    static InputRecorder* sInstance;
};
