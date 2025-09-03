#ifndef EXAMPLEACTION_H
#define EXAMPLEACTION_H

#include <Action.h>
#include <QJsonObject>
#include <thread>
#include <windows.h>

struct SplStruct
{
    int id = 0;
    int parentid;
    QString category;
    int size = 0;
};
class ExampleAction : public Action
{
public:
    ExampleAction(ConnectionManager *connection, const QString &action, const QString &context);
    ~ExampleAction();

    virtual void DidReceiveSettings(const QJsonObject &payload);
    virtual void KeyDown(const QJsonObject &payload);
    virtual void KeyUp(const QJsonObject &payload);
    virtual void SendToPlugin(const QJsonObject &payload);
    virtual void WillAppear(const QJsonObject &payload);
    virtual void WillDisappear(const QJsonObject &payload);
    virtual void PropertyInspectorDidAppear(const QJsonObject &payload);

private:
    HANDLE FindAndConnectPipe();
    QJsonObject  ExecuteCommand(HANDLE hPipe, const std::string& cmd);
    bool ParseXMLFile(QString filepath, QList<SplStruct> &spls, QList<QString> &allSoundUrls, QString basePath);

    HANDLE hPipe = INVALID_HANDLE_VALUE;
    QString action;

    std::thread workThread;
};

#endif // EXAMPLEACTION_H
