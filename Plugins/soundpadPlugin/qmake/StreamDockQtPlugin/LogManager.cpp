#include "LogManager.h"
#include <QCoreApplication>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QMutexLocker>

LogManager *LogManager::m_instance = nullptr;

LogManager::LogManager(const QString &basePath, QObject *parent)
    : QObject(parent)
    , m_flushTimer(nullptr)
{
    m_logDir = QDir::cleanPath(basePath + QDir::separator() + "log");
    m_currentDate = QDateTime::currentDateTime().toString("yyyy-MM-dd");

    m_flushTimer = new QTimer(this);
    connect(m_flushTimer, &QTimer::timeout, this, &LogManager::onFlushTimer);
    m_flushTimer->start(1000);
}

LogManager::~LogManager()
{
    if (m_flushTimer) {
        m_flushTimer->stop();
    }
    flush();
}

void LogManager::initialize(const QString &basePath)
{
    if (m_instance) {
        return;
    }
    m_instance = new LogManager(basePath);
}

LogManager* LogManager::instance()
{
    return m_instance;
}

void LogManager::log(const QString &message)
{
    QMutexLocker mMutexLocker(&m_mutex);

    QString timeString = QString("[%1] %2")
        .arg(QDateTime::currentDateTime().toString("yyyy-MM-dd hh:mm:ss"))
        .arg(message);
    m_buffer.append(timeString);
}

void LogManager::logAndFlush(const QString &message)
{
    log(message);
    flush();
}

void LogManager::flush()
{
    QMutexLocker mMutexLocker(&m_mutex);

    if (m_buffer.isEmpty()) {
        return;
    }

    QString today = QDateTime::currentDateTime().toString("yyyy-MM-dd");
    if (today != m_currentDate) {
        m_currentDate = today;
    }

    QDir().mkpath(m_logDir);

    QString filePath = m_logDir + QDir::separator() + m_currentDate + ".log";
    QFile file(filePath);
    if (file.open(QFile::WriteOnly | QFile::Append)) {
        QString content = m_buffer.join("\r\n") + "\r\n";
        file.write(content.toUtf8());
        file.flush();
        file.close();
    }

    m_buffer.clear();
}

void LogManager::onFlushTimer()
{
    flush();
}
