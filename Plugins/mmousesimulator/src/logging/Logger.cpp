//==============================================================================
/**
@file       Logger.cpp

@brief      Implementation of the daily-rotating file logger.
**/
//==============================================================================

#include "logging/Logger.h"

#include <QCoreApplication>
#include <QTimer>
#include <QFile>
#include <QTextStream>
#include <QDir>
#include <QFileInfo>
#include <cstdio>

//==============================================================================
// Static Singleton
//==============================================================================

Logger* Logger::sInstance = nullptr;

Logger* Logger::instance()
{
    return sInstance;
}

void Logger::initialize(QObject* parent, const QString& logDir)
{
    if (sInstance) {
        fprintf(stderr, "[Logger] Already initialized.\n");
        return;
    }
    sInstance = new Logger(parent, logDir);
}

void Logger::shutdown()
{
    if (sInstance) {
        delete sInstance;
        // sInstance is set to nullptr in the destructor
    }
}

//==============================================================================
// Construction / Destruction
//==============================================================================

Logger::Logger(QObject* parent, const QString& logDir)
    : QObject(parent)
    , mCurrentDate(QDate::currentDate())
    , mLogDir(logDir.isEmpty() ? QCoreApplication::applicationDirPath() : logDir)
{
    // Open today's log file
    openLogFile();

    // Clean up old logs (>10 days)
    cleanupOldLogs();

    // Start 1-second flush timer
    mFlushTimer = new QTimer(this);
    mFlushTimer->setTimerType(Qt::CoarseTimer);
    connect(mFlushTimer, &QTimer::timeout,
            this, &Logger::onFlushTimer);
    mFlushTimer->start(1000);
}

Logger::~Logger()
{
    // Flush any remaining buffered messages before destruction
    onFlushTimer();
    closeLogFile();
    sInstance = nullptr;
}

//==============================================================================
// log()
//==============================================================================

void Logger::log(const QString& message)
{
    if (!sInstance) return;

    QMutexLocker lock(&mMutex);
    mBuffer.append(message);
}

void Logger::log(const char* format, ...)
{
    if (!sInstance) return;

    va_list args;
    va_start(args, format);
    QString message = QString::vasprintf(format, args);
    va_end(args);

    log(message);
}

//==============================================================================
// Flush Timer
//==============================================================================

void Logger::onFlushTimer()
{
    // ── Extract buffered messages under lock ──
    QStringList pending;
    {
        QMutexLocker lock(&mMutex);
        if (mBuffer.isEmpty()) return;
        pending.swap(mBuffer);
    }
    // Lock released — file I/O happens without blocking callers

    // ── Check for date change (midnight rollover) ──
    QDate today = QDate::currentDate();
    if (today != mCurrentDate) {
        closeLogFile();
        mCurrentDate = today;
        openLogFile();
        cleanupOldLogs();
    }

    // ── Write all pending lines ──
    if (!mLogFile || !mStream) return;

    for (const QString& line : pending) {
        *mStream << line;
        if (!line.endsWith(QLatin1Char('\n'))) {
            *mStream << QLatin1Char('\n');
        }
    }
    mStream->flush();
    mLogFile->flush();  // Sync C runtime buffer to OS
}

//==============================================================================
// File I/O
//==============================================================================

QString Logger::logFilePath(const QDate& date) const
{
    QString filename = QString("mousesimulator_%1.log")
                       .arg(date.toString("yyyy-MM-dd"));
    return mLogDir + "/" + filename;
}

void Logger::openLogFile()
{
    QString path = logFilePath(mCurrentDate);

    mLogFile = new QFile(path, this);
    if (!mLogFile->open(QIODevice::Append | QIODevice::Text)) {
        fprintf(stderr, "[Logger] Failed to open log file: %s\n", qPrintable(path));
        delete mLogFile;
        mLogFile = nullptr;
        mStream = nullptr;
        return;
    }

    mStream = new QTextStream(mLogFile);
}

void Logger::closeLogFile()
{
    if (mStream) {
        mStream->flush();
        if (mLogFile) {
            mLogFile->flush();  // Ensure all data reaches disk before close
        }
        delete mStream;
        mStream = nullptr;
    }
    if (mLogFile) {
        mLogFile->close();
        // mLogFile is parented to `this` and auto-deleted by Qt
        mLogFile = nullptr;
    }
}

//==============================================================================
// Cleanup
//==============================================================================

void Logger::cleanupOldLogs()
{
    QDir dir(mLogDir);
    QStringList filters;
    filters << "mousesimulator_????-??-??.log";
    dir.setNameFilters(filters);

    QDate cutoff = QDate::currentDate().addDays(-10);
    QString todayFilename = logFilePath(QDate::currentDate());

    const QFileInfoList entries = dir.entryInfoList(QDir::Files);
    for (const QFileInfo& fi : entries) {
        // Never delete today's log
        if (fi.absoluteFilePath() == todayFilename) continue;

        // Parse date from filename: "mousesimulator_YYYY-MM-DD.log"
        // Extract the 10-char date substring starting after "mousesimulator_"
        QString dateStr = fi.fileName().mid(16, 10);
        QDate fileDate = QDate::fromString(dateStr, "yyyy-MM-dd");
        if (!fileDate.isValid()) continue;

        // Delete files strictly older than 10 days
        if (fileDate <= cutoff) {
            fprintf(stderr, "[Logger] Removing old log: %s\n", qPrintable(fi.fileName()));
            QFile::remove(fi.absoluteFilePath());
        }
    }
}
