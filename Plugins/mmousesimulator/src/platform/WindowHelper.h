//==============================================================================
/**
@file       WindowHelper.h

@brief      Win32 window manipulation helpers for the Mouse Simulator plugin.
            All functions are inline to avoid cross-TU linking issues.

            Provides:
              - findParentProcessId()     Walk process tree to find parent PID
              - findMainWindowForProcess() EnumWindows to find main visible window
              - minimizeWindow()          ShowWindow(SW_MINIMIZE)
              - flashWindow()             FlashWindowEx for taskbar attention
**/
//==============================================================================

#pragma once

#include <windows.h>
#include <tlhelp32.h>

#include "logging/Logger.h"

namespace WindowHelper {

// ── EnumWindows callback context ─────────────────────────────────

struct EnumContext {
    DWORD processId;
    HWND foundHwnd;
};

static BOOL CALLBACK enumWindowCallback(HWND hwnd, LPARAM lParam)
{
    auto* ctx = reinterpret_cast<EnumContext*>(lParam);

    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);
    if (pid != ctx->processId) return TRUE;  // Not our process — continue

    // Only consider visible, top-level windows that aren't owned by another window
    if (!IsWindowVisible(hwnd)) return TRUE;
    if (GetWindow(hwnd, GW_OWNER) != nullptr) return TRUE;

    // Found a candidate — take the first one
    ctx->foundHwnd = hwnd;
    return FALSE;  // Stop enumeration
}

// ── findParentProcessId ─────────────────────────────────────────

/// Walk the process tree to find the PID of the process that launched us.
/// Returns 0 on failure.
static inline DWORD findParentProcessId()
{
    DWORD myPid    = GetCurrentProcessId();
    DWORD parentPid = 0;

    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) {
        Logger::instance()->log("[WARN] [WindowHelper] CreateToolhelp32Snapshot failed (error: %lu)",
            GetLastError());
        return 0;
    }

    PROCESSENTRY32 pe = {};
    pe.dwSize = sizeof(PROCESSENTRY32);

    if (Process32First(hSnapshot, &pe)) {
        do {
            if (pe.th32ProcessID == myPid) {
                parentPid = pe.th32ParentProcessID;
                break;
            }
        } while (Process32Next(hSnapshot, &pe));
    }

    CloseHandle(hSnapshot);

    if (parentPid == 0) {
        Logger::instance()->log("[WARN] [WindowHelper] Could not find parent process for PID %lu, trying fallback...", myPid);

        // Fallback: try to find StreamDeck by known window title
        HWND sdHwnd = FindWindowA(nullptr, "Stream Deck");
        if (!sdHwnd) {
            sdHwnd = FindWindowA(nullptr, "Elgato Stream Deck");
        }
        if (sdHwnd) {
            DWORD pid = 0;
            GetWindowThreadProcessId(sdHwnd, &pid);
            if (pid != 0) {
                Logger::instance()->log("[WindowHelper] Fallback: found StreamDeck via FindWindow, PID: %lu", pid);
                return pid;
            }
        }
        Logger::instance()->log("[WARN] [WindowHelper] Fallback also failed — no StreamDeck window found");
    }
    return parentPid;
}

// ── findMainWindowForProcess ────────────────────────────────────

/// Enumerate all top-level windows and return the first visible,
/// unowned window belonging to the given process.
/// Returns nullptr on failure.
static inline HWND findMainWindowForProcess(DWORD processId)
{
    EnumContext ctx = { processId, nullptr };
    EnumWindows(enumWindowCallback, reinterpret_cast<LPARAM>(&ctx));

    if (ctx.foundHwnd) {
        char title[256] = {};
        GetWindowTextA(ctx.foundHwnd, title, sizeof(title));
        Logger::instance()->log("[WindowHelper] Found main window for PID %lu: HWND=%p, title=\"%s\"",
            processId, ctx.foundHwnd, title);
    } else {
        Logger::instance()->log("[WARN] [WindowHelper] No visible top-level window found for PID %lu", processId);
    }

    return ctx.foundHwnd;
}

// ── minimizeWindow ──────────────────────────────────────────────

/// Minimize the given window. Logs success or failure.
static inline void minimizeWindow(HWND hwnd)
{
    if (!hwnd) {
        Logger::instance()->log("[WARN] [WindowHelper] minimizeWindow called with null HWND");
        return;
    }
    if (!ShowWindow(hwnd, SW_MINIMIZE)) {
        Logger::instance()->log("[WARN] [WindowHelper] ShowWindow(SW_MINIMIZE) failed (error: %lu)",
            GetLastError());
    }
    // Give the window manager time to complete the minimize animation
    // before the target app has a chance to auto-restore itself
    Sleep(50);
}

// ── flashWindow ─────────────────────────────────────────────────

/// Flash the window's taskbar icon until the user activates the window.
/// Does NOT restore or foreground the window — only taskbar flashing.
static inline void flashWindow(HWND hwnd)
{
    if (!hwnd) {
        Logger::instance()->log("[WARN] [WindowHelper] flashWindow called with null HWND");
        return;
    }

    FLASHWINFO info = {};
    info.cbSize    = sizeof(FLASHWINFO);
    info.hwnd      = hwnd;
    info.dwFlags   = FLASHW_ALL | FLASHW_TIMERNOFG;
    info.uCount    = 0;   // Flash until foreground (TIMERNOFG handles this)
    info.dwTimeout = 0;   // Default cursor blink rate

    FlashWindowEx(&info);
}

} // namespace WindowHelper
