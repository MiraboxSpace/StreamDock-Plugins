#ifndef LOGMANAGER_H
#define LOGMANAGER_H

#include <QObject>
#include <QMutex>
#include <QString>
#include <QStringList>
#include <QTimer>

class LogManager : public QObject
{
    Q_OBJECT

public:
    static LogManager* instance();
    static void initialize(const QString &basePath);

    void log(const QString &message);
    void logAndFlush(const QString &message);
    void flush();

    ~LogManager();

private:
    explicit LogManager(const QString &basePath, QObject *parent = nullptr);

    static LogManager *m_instance;

    QString m_logDir;
    QMutex m_mutex;
    QStringList m_buffer;
    QTimer *m_flushTimer;
    QString m_currentDate;

private slots:
    void onFlushTimer();
};

#endif // LOGMANAGER_H
