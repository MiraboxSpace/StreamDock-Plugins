//==============================================================================
/**
@file       Logger.h

@brief      Daily-rotating file logger with buffered writes.
            Messages are appended to an in-memory buffer from any thread
            (thread-safe), then flushed to disk every second via QTimer.

            Log files are written to the same directory as the executable
            with the naming pattern: mousesimulator_YYYY-MM-DD.log.
            Files older than 10 days are automatically deleted on startup
            and on date change.
**/
//==============================================================================

#pragma once

#include <QObject>
#include <QMutex>
#include <QStringList>
#include <QDate>

class QTimer;
class QFile;
class QTextStream;

class Logger : public QObject
{
    Q_OBJECT

public:
    /// Call once after QCoreApplication is constructed to initialize
    /// the singleton. The Logger instance is parented to `parent`.
    /// @param parent  QObject parent (typically the QCoreApplication).
    /// @param logDir  Directory for log files. If empty, defaults to
    ///                QCoreApplication::applicationDirPath().
    static void initialize(QObject* parent, const QString& logDir = QString());

    /// Destroy the singleton instance. Safe to call even if not initialized.
    /// After shutdown(), initialize() can be called again.
    static void shutdown();

    /// Get the singleton instance (nullptr before initialize()).
    static Logger* instance();

    /// Thread-safe: append a message to the in-memory buffer.
    /// A trailing newline is added automatically if not present.
    void log(const QString& message);

    /// Thread-safe convenience overload using C printf-style formatting.
    /// Internally calls QString::vasprintf then delegates to log(QString).
    void log(const char* format, ...);

private slots:
    void onFlushTimer();

private:
    explicit Logger(QObject* parent, const QString& logDir);
    ~Logger();

    // Non-copyable, non-movable
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;

    void openLogFile();
    void closeLogFile();
    void cleanupOldLogs();
    QString logFilePath(const QDate& date) const;

    static Logger* sInstance;

    // ── Thread safety ──
    QMutex mMutex;

    // ── Buffered writes ──
    QStringList mBuffer;

    // ── Timer ──
    QTimer* mFlushTimer = nullptr;

    // ── File I/O ──
    QFile* mLogFile = nullptr;
    QTextStream* mStream = nullptr;

    // ── State ──
    QDate mCurrentDate;
    QString mLogDir;
};
