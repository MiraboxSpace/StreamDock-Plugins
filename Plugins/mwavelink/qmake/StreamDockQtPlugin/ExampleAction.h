#ifndef EXAMPLEACTION_H
#define EXAMPLEACTION_H

#include <Action.h>
#include <QJsonArray>
#include <QJsonObject>
#include <QTimer>

struct InPutInfoSet
{
    QString inputSelect;
    QString outputSelect;
    QString volumeRangeValue;
    QString fadingSelect;
};
struct InPutInfoAdjust
{
    QString inputSelect;
    QString outputSelect;
    QString stepRangeValue;
};
struct InPutInfoMute
{
    QString inputSelect;
    QString outputSelect;
};
struct OutputDevice
{
    QString identifier;
    QString name;
};
// 后续考虑放队列里面匹配id
struct OutPutInfoSet
{
    QString outputSelect;
    QString volumeRangeValue;
    QString fadingSelect;
};
struct OutPutInfoAdjust
{
    QString outputSelect;
    QString stepRangeValue;
};
struct OutPutInfoMute
{
    QString outputSelect;
};
struct EffectsInfo
{
    QString inputSelect;
    QString EffectSelect;
};
struct EffectsChainInfo
{
    QString inputSelect;
    QString outputSelect;
};


class ElgatoWaveClient;
class ExampleAction : public Action
{
public:
    ExampleAction(ConnectionManager *connection, const QString &action, const QString &context);

    virtual void DidReceiveSettings(const QJsonObject &payload);
    virtual void KeyDown(const QJsonObject &payload);
    virtual void KeyUp(const QJsonObject &payload);
    virtual void SendToPlugin(const QJsonObject &payload);
    virtual void WillAppear(const QJsonObject &payload);
    virtual void WillDisappear(const QJsonObject &payload);
    virtual void PropertyInspectorDidAppear(const QJsonObject &payload);

private:
    QString action_;
    QString context_;
    ElgatoWaveClient* client;
    QMap<QString, QList<OutputDevice>> outputsMap;
    QMap<int, QString> ids_;
    QJsonObject currentPayload_;
    QMap<QString, QString> allDevices;

    InPutInfoSet inPutInfoSet;
    InPutInfoAdjust inPutInfoAdjust;
    InPutInfoMute inPutInfoMute;
    OutPutInfoSet outPutInfoSet;
    OutPutInfoAdjust outPutInfoAdjust;
    OutPutInfoMute outPutInfoMute;
    EffectsChainInfo effectsChainInfo;

    QJsonArray inputsFilterArray;

    QTimer longPressTimer;       // 用来判定是否是长按
    QTimer longPressRepeatTimer; // 长按后的循环定时器
    bool isLongPress = false;

};

#endif // EXAMPLEACTION_H
