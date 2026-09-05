//==============================================================================
/**
@file       MouseSimulationEngine.cpp

@brief      Playback engine implementation using Win32 SendInput.
**/
//==============================================================================

#include "simulation/MouseSimulationEngine.h"
#include "simulation/RecordStreamParser.h"
#include "logging/Logger.h"

#include <QThread>
#include <QCoreApplication>
#include <cmath>

#ifdef PLATFORM_WINDOWS
#include <windows.h>
#include <mmsystem.h>
#endif

//==============================================================================
// Construction
//==============================================================================

MouseSimulationEngine::MouseSimulationEngine(QObject* parent)
    : QObject(parent)
{
}

MouseSimulationEngine::~MouseSimulationEngine()
{
    requestStop();
}

void MouseSimulationEngine::setConfig(const SimulationConfig& config)
{
    mConfig = config;
}

void MouseSimulationEngine::requestStop()
{
    mStopRequested.storeRelaxed(1);
}

//==============================================================================
// Main playback loop
//==============================================================================

void MouseSimulationEngine::run()
{
    mStopRequested.storeRelaxed(0);

    // Parse the stream
    auto instructions = RecordStreamParser::parse(mConfig.rawStream);
    if (instructions.empty()) {
        Logger::instance()->log("[WARN] [Engine] No instructions parsed from stream");
        emit finished();
        return;
    }

    Logger::instance()->log("[Engine] Starting playback — %zu instructions, warp:%d softStart:%d ignoreDelay:%d loop:%d",
        instructions.size(), mConfig.warpEnabled, mConfig.softStartEnabled,
        mConfig.ignoreDelay, mConfig.loopCount);

    // Number of times to execute: 1 (normal) + loopCount (extra repeats)
    // loopCount = 0 → play once (1 total)
    // loopCount = -1 → infinite (loop until stopped)
    // loopCount = N → play N+1 times
    int totalRuns = (mConfig.loopCount < 0) ? -1 : (mConfig.loopCount + 1);
    int runCount = 0;

    while (totalRuns < 0 || runCount < totalRuns) {
        runCount++;

        // ── Soft Start: smoothly move mouse to first coordinate ──
        // (only on first run)
        if (mConfig.softStartEnabled && runCount == 1) {
            // Find first MOUSE_MOVE instruction
            for (const auto& inst : instructions) {
                if (inst.type == RecordInstruction::Type::MOUSE_MOVE) {
#ifdef PLATFORM_WINDOWS
                    POINT currentPos;
                    GetCursorPos(&currentPos);

                    // Compute total delta
                    float totalDx = static_cast<float>(inst.x - currentPos.x);
                    float totalDy = static_cast<float>(inst.y - currentPos.y);
                    float distance = std::sqrt(totalDx * totalDx + totalDy * totalDy);

                    // Scale steps with distance: min 20, max 60
                    // ~1 step per 15 pixels, clamped for very short / very long moves
                    int steps = static_cast<int>(distance / 15.0f);
                    if (steps < 20) steps = 20;
                    if (steps > 60) steps = 60;

                    // Use SendInput with relative moves for OS-level smooth cursor animation
                    float accumX = static_cast<float>(currentPos.x);
                    float accumY = static_cast<float>(currentPos.y);
                    for (int s = 1; s <= steps; s++) {
                        if (mStopRequested.loadRelaxed()) goto stop_playback;

                        float targetX = static_cast<float>(currentPos.x) + totalDx * s / steps;
                        float targetY = static_cast<float>(currentPos.y) + totalDy * s / steps;

                        int dx = static_cast<int>(targetX - accumX);
                        int dy = static_cast<int>(targetY - accumY);

                        if (dx != 0 || dy != 0) {
                            sendMouseMoveRelative(dx, dy);
                            accumX += static_cast<float>(dx);
                            accumY += static_cast<float>(dy);
                        }

                        QThread::msleep(16); // ~60fps
                    }
#endif
                    break;
                }
            }
        }

        // ── Execute instructions ──
        size_t i = 0;
        while (i < instructions.size()) {
            if (mStopRequested.loadRelaxed()) {
                goto stop_playback;
            }

            const auto& inst = instructions[i];

            // WARP: skip intermediate coordinate moves, only keep the
            // last coordinate in a sequence (before a non-move instruction).
            // Also skips DELAY→MOVE chains since delays between skipped moves
            // serve no purpose.
            if (mConfig.warpEnabled && inst.type == RecordInstruction::Type::MOUSE_MOVE) {
                // Look ahead: skip through MOUSE_MOVE and DELAY→MOUSE_MOVE chains
                size_t lastMoveIdx = i;
                size_t peek = i + 1;
                while (peek < instructions.size()) {
                    const auto& next = instructions[peek];
                    if (next.type == RecordInstruction::Type::MOUSE_MOVE) {
                        // Consecutive MOVE (no delay in between) — skip the earlier one
                        lastMoveIdx = peek;
                        peek = lastMoveIdx + 1;
                    } else if (next.type == RecordInstruction::Type::DELAY) {
                        // Skip through ALL consecutive DELAYs, then check
                        // whether the chain continues with a MOUSE_MOVE
                        size_t delayPeek = peek;
                        while (delayPeek < instructions.size()
                               && instructions[delayPeek].type == RecordInstruction::Type::DELAY) {
                            delayPeek++;
                        }
                        if (delayPeek < instructions.size()
                            && instructions[delayPeek].type == RecordInstruction::Type::MOUSE_MOVE) {
                            // DELAY(s) followed by MOVE — consume the delay chain
                            // and the earlier move
                            lastMoveIdx = delayPeek;  // The MOVE after the DELAY chain
                            peek = lastMoveIdx + 1;
                        } else {
                            // DELAY(s) NOT followed by MOVE — chain ends
                            break;
                        }
                    } else {
                        // Hit a non-move, non-delay instruction — stop scanning
                        break;
                    }
                }
                // Only execute the last coordinate
                if (i != lastMoveIdx) {
                    const auto& lastMove = instructions[lastMoveIdx];
                    sendMouseMoveAbsolute(lastMove.x, lastMove.y);
                    i = lastMoveIdx + 1;
                    continue;
                }
            }

            // Ignore delays if configured
            if (mConfig.ignoreDelay && inst.type == RecordInstruction::Type::DELAY) {
                i++;
                continue;
            }

            // Typewriter speed override for keyboard events:
            // KEY_PRESS:  keep the following stream DELAY — it represents
            //             key hold time, which is critical for apps that poll
            //             GetAsyncKeyState() (games, IDEs, etc.). Skipping it
            //             turns every key into an instant tap that many apps miss.
            // KEY_RELEASE: skip consecutive DELAYs after release — typewriter
            //             delay (applied inside executeInstruction) already
            //             controls inter-keystroke timing.
            if (inst.type == RecordInstruction::Type::KEY_PRESS) {
                executeInstruction(inst);
                i++;
                // Preserve the hold-time DELAY between KEY_PRESS and KEY_RELEASE
                continue;
            }
            if (inst.type == RecordInstruction::Type::KEY_RELEASE) {
                executeInstruction(inst);
                i++;
                // Skip consecutive DELAYs after KEY_RELEASE —
                // typewriter delay already covers the inter-key gap
                while (i < instructions.size()
                       && instructions[i].type == RecordInstruction::Type::DELAY) {
                    i++;
                }
                continue;
            }

            executeInstruction(inst);
            i++;
        }

        if (totalRuns < 0 || runCount < totalRuns) {
            // Small pause between loop iterations
            QThread::msleep(500);
        }
    }

stop_playback:
    Logger::instance()->log("[Engine] Playback stopped — completed %d runs", runCount);

    // Audio feedback on completion
    if (mConfig.audioEnabled && !mStopRequested.loadRelaxed()) {
#ifdef PLATFORM_WINDOWS
        QString wavPath = QCoreApplication::applicationDirPath()
                          + "/static/notification.wav";
        PlaySoundW(reinterpret_cast<LPCWSTR>(wavPath.utf16()),
                   NULL, SND_FILENAME | SND_SYNC);
#endif
    }

    emit finished();
}

//==============================================================================
// Instruction execution
//==============================================================================

void MouseSimulationEngine::executeInstruction(const RecordInstruction& inst)
{
    switch (inst.type) {
    case RecordInstruction::Type::MOUSE_MOVE:
        sendMouseMoveAbsolute(inst.x, inst.y);
        break;

    case RecordInstruction::Type::MOUSE_BUTTON_PRESS:
        sendMouseButton(inst.button, true);
        // Minimum button hold time when stream delays are ignored —
        // ensures the target application registers the click even at
        // maximum playback speed (e.g. WARP + IgnoreDelay combined).
        if (mConfig.ignoreDelay) {
            doSleep(30);
        }
        break;

    case RecordInstruction::Type::MOUSE_BUTTON_RELEASE:
        sendMouseButton(inst.button, false);
        break;

    case RecordInstruction::Type::MOUSE_WHEEL:
        sendMouseWheel(inst.wheelDelta);
        break;

    case RecordInstruction::Type::KEY_PRESS:
        sendKeyEvent(inst.vkCode, true);
        // Minimum key hold time when stream delays are ignored —
        // ensures target apps that poll GetAsyncKeyState() (games, IDEs)
        // register the key even at maximum playback speed.
        if (mConfig.ignoreDelay) {
            doSleep(50);
        }
        break;

    case RecordInstruction::Type::KEY_RELEASE:
        sendKeyEvent(inst.vkCode, false);
        // Typewriter delay after key release — controls inter-keystroke speed
        if (mConfig.typewriterDelay > 0) {
            doSleep(mConfig.typewriterDelay);
        }
        break;

    case RecordInstruction::Type::DELAY:
        if (!mConfig.ignoreDelay) {
            doSleep(inst.delayMs);
        }
        break;

    default:
        break;
    }
}

//==============================================================================
// Win32 SendInput wrappers
//==============================================================================

#ifdef PLATFORM_WINDOWS

void MouseSimulationEngine::sendMouseMoveAbsolute(int x, int y)
{
    // Map record coordinates (virtual desktop pixels) to 0-65535 range
    int virtX = GetSystemMetrics(SM_XVIRTUALSCREEN);
    int virtY = GetSystemMetrics(SM_YVIRTUALSCREEN);
    int virtW = GetSystemMetrics(SM_CXVIRTUALSCREEN);
    int virtH = GetSystemMetrics(SM_CYVIRTUALSCREEN);

    int normalizedX = static_cast<int>(
        (static_cast<long long>(x - virtX) * 65535) / virtW);
    int normalizedY = static_cast<int>(
        (static_cast<long long>(y - virtY) * 65535) / virtH);

    INPUT input = {};
    input.type = INPUT_MOUSE;
    input.mi.dx = normalizedX;
    input.mi.dy = normalizedY;
    input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK;
    input.mi.mouseData = 0;
    input.mi.time = 0;
    input.mi.dwExtraInfo = 0;

    SendInput(1, &input, sizeof(INPUT));
}

void MouseSimulationEngine::sendMouseMoveRelative(int dx, int dy)
{
    INPUT input = {};
    input.type = INPUT_MOUSE;
    input.mi.dx = dx;
    input.mi.dy = dy;
    input.mi.dwFlags = MOUSEEVENTF_MOVE;  // Relative move (no ABSOLUTE flag)
    input.mi.mouseData = 0;
    input.mi.time = 0;
    input.mi.dwExtraInfo = 0;
    SendInput(1, &input, sizeof(INPUT));
}

void MouseSimulationEngine::sendMouseButton(int button, bool down)
{
    INPUT input = {};
    input.type = INPUT_MOUSE;
    input.mi.mouseData = 0;
    input.mi.time = 0;
    input.mi.dwExtraInfo = 0;

    switch (button) {
    case 1: // Left button
        input.mi.dwFlags = down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
        break;
    case 2: // Right button
        input.mi.dwFlags = down ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
        break;
    case 3: // Middle button
        input.mi.dwFlags = down ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP;
        break;
    case 4: // XButton1
        input.mi.dwFlags = down ? MOUSEEVENTF_XDOWN : MOUSEEVENTF_XUP;
        input.mi.mouseData = XBUTTON1;
        break;
    case 5: // XButton2
        input.mi.dwFlags = down ? MOUSEEVENTF_XDOWN : MOUSEEVENTF_XUP;
        input.mi.mouseData = XBUTTON2;
        break;
    default:
        Logger::instance()->log("[WARN] [Engine] Unknown mouse button: %d", button);
        return;
    }

    SendInput(1, &input, sizeof(INPUT));
}

void MouseSimulationEngine::sendMouseWheel(int delta)
{
    INPUT input = {};
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_WHEEL;
    input.mi.mouseData = delta * WHEEL_DELTA;  // Convert to WHEEL_DELTA units
    input.mi.time = 0;
    input.mi.dwExtraInfo = 0;

    SendInput(1, &input, sizeof(INPUT));
}

void MouseSimulationEngine::sendKeyEvent(uint16_t vkCode, bool down)
{
    INPUT input = {};
    input.type = INPUT_KEYBOARD;
    input.ki.wVk = vkCode;
    input.ki.wScan = static_cast<WORD>(MapVirtualKey(vkCode, MAPVK_VK_TO_VSC));
    input.ki.dwFlags = down ? 0 : KEYEVENTF_KEYUP;
    input.ki.time = 0;
    input.ki.dwExtraInfo = 0;

    SendInput(1, &input, sizeof(INPUT));
}

void MouseSimulationEngine::doSleep(int ms)
{
    // Sleep in small increments so we can respond to stop requests quickly
    int remaining = ms;
    while (remaining > 0 && !mStopRequested.loadRelaxed()) {
        int chunk = std::min(remaining, 50);  // Check for stop every 50ms
        QThread::msleep(chunk);
        remaining -= chunk;
    }
}

#else

// Non-Windows stubs
void MouseSimulationEngine::sendMouseMoveAbsolute(int, int) {}
void MouseSimulationEngine::sendMouseMoveRelative(int, int) {}
void MouseSimulationEngine::sendMouseButton(int, bool) {}
void MouseSimulationEngine::sendMouseWheel(int) {}
void MouseSimulationEngine::sendKeyEvent(uint16_t, bool) {}
void MouseSimulationEngine::doSleep(int ms) { QThread::msleep(ms); }

#endif
