//==============================================================================
/**
@file       InputRecorder.cpp

@brief      Implementation of Windows low-level hook recorder.
**/
//==============================================================================

#include "recording/InputRecorder.h"
#include "recording/CountdownOverlay.h"
#include "platform/WindowHelper.h"
#include "logging/Logger.h"

#include <QCoreApplication>
#include <QTimer>
#include <sstream>
#include <map>

// ── Save key name → VK code mapping ──────────────────────────

DWORD saveKeyNameToVk(const std::string& name)
{
    static const std::map<std::string, DWORD> map = {
        {"F1", VK_F1},   {"F2", VK_F2},   {"F3", VK_F3},
        {"F4", VK_F4},   {"F5", VK_F5},   {"F6", VK_F6},
        {"F7", VK_F7},   {"F8", VK_F8},   {"F9", VK_F9},
        {"F10", VK_F10}, {"F11", VK_F11}, {"F12", VK_F12},
        {"ESC", VK_ESCAPE},
    };
    auto it = map.find(name);
    return (it != map.end()) ? it->second : VK_F10;
}

// ── Singleton pointer ────────────────────────────────────────

InputRecorder* InputRecorder::sInstance = nullptr;

// ── Construction / Destruction ───────────────────────────────

InputRecorder::InputRecorder(QObject* parent)
    : QObject(parent)
{
    sInstance = this;
}

InputRecorder::~InputRecorder()
{
    stopRecording();
    sInstance = nullptr;
}

// ── Start / Stop ─────────────────────────────────────────────

bool InputRecorder::startRecording(const std::string& saveKeyName)
{
    if (mIsRecording.loadRelaxed()) {
        Logger::instance()->log("[WARN] [Recorder] Already recording");
        return false;
    }

    if (mCountdownActive) {
        Logger::instance()->log("[WARN] [Recorder] Countdown already active");
        return false;
    }

    mSaveKeyName = saveKeyName;
    mSaveKeyVk = saveKeyNameToVk(saveKeyName);

    // Clear state
    {
        QMutexLocker lock(&mBufferMutex);
        mInstructions.clear();
        mHasFirstEvent = false;
        mLastEventTicks = 0;
    }

    // Minimize parent process window immediately so user can interact with target app
    minimizeParentWindow();

    // ── Show countdown overlay before installing hooks ──
    // Create overlay if not yet created
    if (!mCountdownOverlay) {
        mCountdownOverlay = std::make_unique<CountdownOverlay>();
        connect(mCountdownOverlay.get(), &CountdownOverlay::countdownFinished,
                this, &InputRecorder::onCountdownFinished);
    }

    CountdownOverlay::OverlayConfig config;
    config.imagePath = QCoreApplication::applicationDirPath().toStdString()
                       + "/static/countdown_overlay.png";
    config.saveKeyText    = mSaveKeyName;
    config.countdownSeconds = 3;
    config.marginFromEdge = 20;

    mCountdownOverlay->setConfig(config);

    if (mCountdownOverlay->show()) {
        // Overlay is now visible and counting down.
        // Hooks will be installed when countdownFinished() fires.
        mCountdownActive = true;
        Logger::instance()->log("[Recorder] Countdown overlay shown — hooks deferred (save key: %s)", mSaveKeyName.c_str());
        return true;
    }

    // Overlay failed (e.g., image not found) — fall back to immediate recording
    Logger::instance()->log("[WARN] [Recorder] Countdown overlay unavailable — starting recording immediately");
    return installHooks();
}

bool InputRecorder::installHooks()
{
    // Install mouse hook
    mMouseHook = SetWindowsHookEx(
        WH_MOUSE_LL, mouseHookProc,
        GetModuleHandle(nullptr), 0);
    if (!mMouseHook) {
        Logger::instance()->log("[ERROR] [Recorder] Failed to install mouse hook (error: %lu)", GetLastError());
        return false;
    }

    // Install keyboard hook
    mKeyboardHook = SetWindowsHookEx(
        WH_KEYBOARD_LL, keyboardHookProc,
        GetModuleHandle(nullptr), 0);
    if (!mKeyboardHook) {
        Logger::instance()->log("[ERROR] [Recorder] Failed to install keyboard hook (error: %lu)", GetLastError());
        UnhookWindowsHookEx(mMouseHook);
        mMouseHook = nullptr;
        return false;
    }

    // Only mark recording as active AFTER hooks are confirmed installed
    mIsRecording.storeRelaxed(1);

    Logger::instance()->log("[Recorder] Hooks installed — recording active (save key: %s, vk: %lu)",
        mSaveKeyName.c_str(), mSaveKeyVk);

    return true;
}

void InputRecorder::onCountdownFinished()
{
    Logger::instance()->log("[Recorder] Countdown finished — installing hooks");
    mCountdownActive = false;
    installHooks();
}

void InputRecorder::cancelCountdown()
{
    if (mCountdownOverlay && mCountdownOverlay->isVisible()) {
        Logger::instance()->log("[Recorder] Countdown cancelled by user");
        mCountdownOverlay->hide();
    }
    mCountdownActive = false;
    // Do NOT install hooks — user cancelled
}

void InputRecorder::stopRecording()
{
    // If countdown is still active, cancel it instead of stopping hooks
    if (mCountdownActive) {
        cancelCountdown();
        return;
    }

    if (!mIsRecording.loadRelaxed()) return;

    Logger::instance()->log("[Recorder] Recording stopped");

    // Uninstall hooks
    if (mMouseHook) {
        UnhookWindowsHookEx(mMouseHook);
        mMouseHook = nullptr;
    }
    if (mKeyboardHook) {
        UnhookWindowsHookEx(mKeyboardHook);
        mKeyboardHook = nullptr;
    }

    mIsRecording.storeRelaxed(0);
}

std::string InputRecorder::recordedStream() const
{
    QMutexLocker lock(&mBufferMutex);
    std::stringstream ss;
    ss << "#START#";
    for (const auto& inst : mInstructions) {
        ss << ";" << inst;
    }
    ss << ";#STOP#";
    return ss.str();
}

// ── Windows Hook Procs (static) ──────────────────────────────

LRESULT CALLBACK InputRecorder::mouseHookProc(int nCode, WPARAM wParam, LPARAM lParam)
{
    if (nCode >= 0 && sInstance && sInstance->mIsRecording.loadRelaxed()) {
        sInstance->onMouseEvent(wParam, lParam);
    }
    return CallNextHookEx(nullptr, nCode, wParam, lParam);
}

LRESULT CALLBACK InputRecorder::keyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam)
{
    if (nCode >= 0 && sInstance && sInstance->mIsRecording.loadRelaxed()) {
        sInstance->onKeyboardEvent(wParam, lParam);
    }
    return CallNextHookEx(nullptr, nCode, wParam, lParam);
}

// ── Mouse Event Handler ──────────────────────────────────────

void InputRecorder::onMouseEvent(WPARAM wParam, LPARAM lParam)
{
    MSLLHOOKSTRUCT* pMouse = reinterpret_cast<MSLLHOOKSTRUCT*>(lParam);
    if (!pMouse) return;

    recordDelay();

    switch (wParam) {
    case WM_MOUSEMOVE:
        recordCoordinate(pMouse->pt);
        break;
    case WM_LBUTTONDOWN:
        recordMouseButton(1, true);
        break;
    case WM_LBUTTONUP:
        recordMouseButton(1, false);
        break;
    case WM_RBUTTONDOWN:
        recordMouseButton(2, true);
        break;
    case WM_RBUTTONUP:
        recordMouseButton(2, false);
        break;
    case WM_MBUTTONDOWN:
        recordMouseButton(3, true);
        break;
    case WM_MBUTTONUP:
        recordMouseButton(3, false);
        break;
    case WM_XBUTTONDOWN:
        recordMouseButton(
            (GET_XBUTTON_WPARAM(pMouse->mouseData) == XBUTTON1) ? 4 : 5, true);
        break;
    case WM_XBUTTONUP:
        recordMouseButton(
            (GET_XBUTTON_WPARAM(pMouse->mouseData) == XBUTTON1) ? 4 : 5, false);
        break;
    case WM_MOUSEWHEEL:
        recordMouseWheel(GET_WHEEL_DELTA_WPARAM(pMouse->mouseData) / WHEEL_DELTA);
        break;
    default:
        break;
    }
}

// ── Keyboard Event Handler ───────────────────────────────────

void InputRecorder::onKeyboardEvent(WPARAM wParam, LPARAM lParam)
{
    KBDLLHOOKSTRUCT* pKbd = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
    if (!pKbd) return;

    DWORD vkCode = pKbd->vkCode;

    // Check for save key
    if (vkCode == mSaveKeyVk && (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN)) {
        // Save key pressed — finalize and stop
        finalizeStream();
        return;
    }

    // Ignore injected events (from our own SendInput during playback)
    if (pKbd->flags & LLKHF_INJECTED) return;

    recordDelay();

    if (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN) {
        recordKeyEvent(vkCode, true);
    } else if (wParam == WM_KEYUP || wParam == WM_SYSKEYUP) {
        recordKeyEvent(vkCode, false);
    }
}

// ── Recording helpers ────────────────────────────────────────

void InputRecorder::recordCoordinate(const POINT& pt)
{
    QMutexLocker lock(&mBufferMutex);

    // Accumulate consecutive moves (we could merge them for efficiency,
    // but the original plugin records every move, so we'll do the same)

    // Convert to virtual desktop coordinates (same as original plugin)
    std::stringstream ss;
    ss << pt.x << "x" << pt.y;
    mInstructions.push_back(ss.str());

    mLastMousePos = pt;
}

void InputRecorder::recordMouseButton(int button, bool down)
{
    QMutexLocker lock(&mBufferMutex);
    std::stringstream ss;
    ss << "M" << button << (down ? "P" : "R");
    mInstructions.push_back(ss.str());
}

void InputRecorder::recordMouseWheel(int delta)
{
    QMutexLocker lock(&mBufferMutex);
    std::stringstream ss;
    ss << "W" << delta;
    mInstructions.push_back(ss.str());
}

void InputRecorder::recordKeyEvent(DWORD vkCode, bool down)
{
    QMutexLocker lock(&mBufferMutex);
    std::stringstream ss;
    ss << (down ? "KP" : "KR") << vkCode;
    mInstructions.push_back(ss.str());
}

void InputRecorder::recordDelay()
{
    DWORD now = GetTickCount();
    QMutexLocker lock(&mBufferMutex);

    if (mHasFirstEvent) {
        DWORD elapsed = now - mLastEventTicks;
        if (elapsed > 0) {
            std::stringstream ss;
            ss << "D" << elapsed;
            mInstructions.push_back(ss.str());
        }
    } else {
        mHasFirstEvent = true;
    }
    mLastEventTicks = now;
}

void InputRecorder::finalizeStream()
{
    std::string stream = recordedStream();
    Logger::instance()->log("[Recorder] Recording finalized — stream length: %zu", stream.size());

    // Write to clipboard so the PI's polling detects it
    writeToClipboard(stream);

    // Stop hooks
    stopRecording();

    // Notify listeners
    emit recordingSaved(stream);

    // Flash parent window in taskbar to signal recording completion
    flashParentWindow();
}

// ── Parent window management ────────────────────────────────────

void InputRecorder::minimizeParentWindow()
{
    DWORD parentPid = WindowHelper::findParentProcessId();
    if (parentPid == 0) {
        Logger::instance()->log("[WARN] [Recorder] Could not find parent process");
        return;
    }
    mParentWindow = WindowHelper::findMainWindowForProcess(parentPid);
    if (!mParentWindow) {
        Logger::instance()->log("[WARN] [Recorder] Could not find main window for parent PID %lu", parentPid);
        return;
    }
    WindowHelper::minimizeWindow(mParentWindow);
    Logger::instance()->log("[Recorder] Parent window minimized (PID: %lu, HWND: %p)", parentPid, mParentWindow);
}

void InputRecorder::flashParentWindow()
{
    if (!mParentWindow) {
        Logger::instance()->log("[WARN] [Recorder] No parent window handle to flash");
        return;
    }
    WindowHelper::flashWindow(mParentWindow);
    Logger::instance()->log("[Recorder] Parent window flash started (HWND: %p)", mParentWindow);
}

void InputRecorder::writeToClipboard(const std::string& text)
{
    if (!OpenClipboard(nullptr)) {
        Logger::instance()->log("[WARN] [Recorder] Failed to open clipboard");
        return;
    }

    EmptyClipboard();

    size_t size = text.size() + 1;
    HGLOBAL hGlobal = GlobalAlloc(GMEM_MOVEABLE, size);
    if (hGlobal) {
        char* pData = static_cast<char*>(GlobalLock(hGlobal));
        if (pData) {
            memcpy(pData, text.c_str(), size);
            GlobalUnlock(hGlobal);
        }
        SetClipboardData(CF_TEXT, hGlobal);
    }

    CloseClipboard();
}
