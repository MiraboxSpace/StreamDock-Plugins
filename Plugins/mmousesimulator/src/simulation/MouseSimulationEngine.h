//==============================================================================
/**
@file       MouseSimulationEngine.h

@brief      Playback engine that replays a parsed record stream using
            Win32 SendInput. Runs on a QThread.

            Supports: WARP mode, Soft Start, Ignore Delay, Typewriter delay,
            Loop count, and Audio feedback on completion.
**/
//==============================================================================

#pragma once

#include <QObject>
#include <QAtomicInt>
#include <string>

class MouseSimulationEngine : public QObject
{
    Q_OBJECT

public:
    struct SimulationConfig {
        std::string rawStream;       // Raw uncompressed stream (#START#;...#STOP#)
        bool warpEnabled     = false;
        bool softStartEnabled = false;
        bool ignoreDelay     = false;
        int  typewriterDelay = 10;  // ms between keystrokes
        int  loopCount       = 0;   // 0 = play once, -1 = infinite, N = extra repeats
        bool audioEnabled    = false;
    };

    explicit MouseSimulationEngine(QObject* parent = nullptr);
    ~MouseSimulationEngine();

    void setConfig(const SimulationConfig& config);

    /// Request the running simulation to stop (thread-safe)
    void requestStop();

public slots:
    /// Main playback loop — runs on the worker QThread
    void run();

signals:
    /// Emitted when playback finishes (natural completion or stop request)
    void finished();

private:
    void executeInstruction(const class RecordInstruction& inst);

    // Win32 SendInput wrappers
    void sendMouseMoveAbsolute(int x, int y);
    void sendMouseMoveRelative(int dx, int dy);
    void sendMouseButton(int button, bool down);
    void sendMouseWheel(int delta);
    void sendKeyEvent(uint16_t vkCode, bool down);
    void doSleep(int ms);

    // WARP helpers
    bool isCoordinateInSequence(size_t idx,
                                const std::vector<class RecordInstruction>& instructions) const;

    SimulationConfig mConfig;
    QAtomicInt mStopRequested{0};
};
