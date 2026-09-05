#pragma once

#include <QObject>
#include <QWebSocket>
#include <QJsonObject>
#include <QJsonDocument>
#include <QJsonArray>
#include <QMap>
#include <QEventLoop>
#include <QTimer>

#pragma once
#include <random>
#include <string>
#include <sstream>
#include <iomanip>

class TransactionTracker
{
public:
    TransactionTracker(int baseNum = 0, int transactionId = 1)
        : baseNum_(baseNum), transactionId_(transactionId) {}

    int nextTransactionId() {
        if (baseNum_ == 0) {
            std::random_device rd;
            std::mt19937 gen(rd());
            std::uniform_int_distribution<> dist(0, 120);
            baseNum_ = dist(gen);
        }

        transactionId_++;

        if (transactionId_ >= 5752191) {
            transactionId_ = 0;
            baseNum_++;
            if (baseNum_ >= 121) {
                baseNum_ = 0;
            }
        }

        std::ostringstream oss;
        oss << std::setw(3) << std::setfill('0') << baseNum_
            << std::setw(7) << std::setfill('0') << transactionId_;

        return std::stoi(oss.str());
    }

private:
    int baseNum_;
    int transactionId_;
};

class ElgatoWaveClient : public QObject {
    Q_OBJECT
public:
    explicit ElgatoWaveClient(QObject* parent = nullptr,
                              QString host = "127.0.0.1",
                              int portStart = 1824,
                              int portRange = 10,
                              int maxAttempts = 2);

    bool connectToApp();
    void disconnectFromApp();

    int sendCommand(const QString& method, const QJsonObject& params = QJsonObject());

signals:
    void connected();
    void disconnected();
    void eventReceived(const int& id, const QJsonObject& obj);

private slots:
    void onConnected();
    void onDisconnected();
    void onTextMessageReceived(QString message);

private:
    QString host_;
    int portStart_;
    int portRange_;
    int maxAttempts_;

    QWebSocket socket_;
    bool isConnected_ = false;

    int nextId_ = 1;
    QMap<int, QJsonObject> responses_;
};
