#include "elgatowaveclient.h"
#include <QCoreApplication>
#include <QDebug>

ElgatoWaveClient::ElgatoWaveClient(QObject* parent, QString host, int portStart, int portRange, int maxAttempts)
    : QObject(parent),
    host_(host),
    portStart_(portStart),
    portRange_(portRange),
    maxAttempts_(maxAttempts) {
    connect(&socket_, &QWebSocket::connected, this, &ElgatoWaveClient::onConnected);
    connect(&socket_, &QWebSocket::disconnected, this, &ElgatoWaveClient::onDisconnected);
    connect(&socket_, &QWebSocket::textMessageReceived, this, &ElgatoWaveClient::onTextMessageReceived);
}

bool ElgatoWaveClient::connectToApp()
{
    int attempts = 0;
    while (attempts < maxAttempts_) {
        for (int port = portStart_; port <= portStart_ + portRange_; ++port) {
            QString url = QString("ws://%1:%2").arg(host_).arg(port);
            qDebug() << "Trying to connect:" << url;

            socket_.open(QUrl(url));

            QEventLoop loop;
            connect(this, &ElgatoWaveClient::connected, &loop, &QEventLoop::quit);
            connect(this, &ElgatoWaveClient::disconnected, &loop, &QEventLoop::quit);

            QTimer::singleShot(1000, &loop, &QEventLoop::quit);
            loop.exec();

            if (isConnected_) return true;
        }
        attempts++;
    }
    qWarning() << "Could not connect after" << maxAttempts_ << "attempts.";
    return false;
}

void ElgatoWaveClient::disconnectFromApp() {
    socket_.close();
    isConnected_ = false;
}
#include <Logger.h>
int ElgatoWaveClient::sendCommand(const QString& method, const QJsonObject& params) {
    if (!isConnected_)
    {
        Logger::LogToServer("sendCommand +++++ ++++++++++ disconnect");
        return -1;
    }

    static TransactionTracker tracker;
    int id = tracker.nextTransactionId();

    QJsonObject msg;
    msg["jsonrpc"] = "2.0";
    msg["id"] = id;
    msg["method"] = method;
    msg["params"] = params;

    Logger::LogToServer("sendCommand +++++ " + QJsonDocument(msg).toJson(QJsonDocument::Compact));

    QJsonDocument doc(msg);
    socket_.sendTextMessage(QString::fromUtf8(doc.toJson(QJsonDocument::Compact)));
    return id;
}

void ElgatoWaveClient::onConnected() {
    isConnected_ = true;
    qDebug() << "Connected!";
    emit connected();
}

void ElgatoWaveClient::onDisconnected() {
    isConnected_ = false;
    qDebug() << "Disconnected.";
    emit disconnected();
}

void ElgatoWaveClient::onTextMessageReceived(QString message)
{
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    if (!doc.isObject()) return;

    QJsonObject obj = doc.object();
    if (obj.contains("id"))
    {
        emit eventReceived(obj["id"].toInt(), obj);
    }
}
