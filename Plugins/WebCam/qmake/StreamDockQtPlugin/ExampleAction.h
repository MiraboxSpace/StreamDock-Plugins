#ifndef EXAMPLEACTION_H
#define EXAMPLEACTION_H

#include <Action.h>
#include <QJsonObject>
#include "Camera.hpp"

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
    virtual void SetSettings(const QJsonObject &inPayload);

    virtual void DialUp(const QJsonObject &payload);
    virtual void DialDown(const QJsonObject &payload);
    virtual void RotateClockwise(const QJsonObject &payload, const unsigned int ticks, const bool pressed);
    virtual void RotateCounterClockwise(const QJsonObject &payload, const unsigned int ticks, const bool pressed);

private:
    QString action;
    QString context;
    IEnumMoniker *pEnum;
    HRESULT hr;

    DShowCamera* camera = nullptr;

    // void myexec(struct Info info);
    void dialSpecialAction(bool isClockwise, const QJsonObject &payload);
};

#endif // EXAMPLEACTION_H
