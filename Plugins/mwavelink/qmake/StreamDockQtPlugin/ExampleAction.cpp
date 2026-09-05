#include "ExampleAction.h"
#include <Logger.h>
#include <QJsonDocument>

#include <elgatowaveclient.h>
#include <QSettings>
#include <QDir>
#include <QCoreApplication>
#include <QThread>

static QSettings globalQSettings(QCoreApplication::applicationDirPath() + QDir::separator() + "config.ini",
                   QSettings::IniFormat);
static const QMap<QString, QString> mixersMap = {
    { "monitor-mix", "com.elgato.mix.local" },
    { "stream-mix",  "com.elgato.mix.stream" },
    { "all",         "com.elgato.mix.all" }
};

void fadeOutput(ElgatoWaveClient* client,
                const QString& outputSelect,
                int startValue = -1,
                int targetValue = -1,
                int fadingTimeS = -1)
{

    QJsonObject params;
    params["property"] = "Output Level";
    params["mixerID"] = mixersMap[outputSelect];
    params["forceLink"] = (outputSelect == "all");

    int steps   = fadingTimeS * 1000;
    if (steps <= 0) steps = 1;

    double delta = (targetValue - startValue) / static_cast<double>(steps);
    for (int i = 1; i <= steps; ++i) {
        int currentValue = startValue + static_cast<int>(delta * i);
        params["value"] = currentValue;
        client->sendCommand("setOutputConfig", params);
    }
}

ExampleAction::ExampleAction(ConnectionManager *connection, const QString &action, const QString &context)
    : Action{connection, action, context}
{
    action_ = action;
    context_ = context;

    client = new ElgatoWaveClient();
    if(client->connectToApp())
    {
        QObject::connect(client, &ElgatoWaveClient::eventReceived, [&](const int& id, const QJsonObject& obj){
            Logger::LogToServer("receive++++ : " + QJsonDocument(obj).toJson(QJsonDocument::Compact));

            QJsonObject resultObj = obj["result"].toObject();
            QJsonObject outputsObj = resultObj["outputs"].toObject();

            for (const QString &key : { "localMixer", "streamMixer" })
            {
                QJsonArray arr = outputsObj[key].toArray();
                for (const QJsonValue &val : arr) {
                    QJsonObject obj = val.toObject();
                    allDevices.insert(obj["name"].toString(),
                                      obj["identifier"].toString());
                }
            }

            if (ids_.contains(id) && ids_.value(id) == "getOutputs")
            {
                QJsonObject settings = currentPayload_["settings"].toObject();

                settings["localMixer"] = outputsObj["localMixer"];
                settings["streamMixer"] = outputsObj["streamMixer"];

                Action::SetSettings(settings);
                ids_.remove(id);
            }else if(ids_.contains(id) && (ids_.value(id) == "wavelinkOutputSet"
                       || ids_.value(id) == "wavelinkOutputAdjust"))
            {
                if(ids_.value(id) == "wavelinkOutputSet")
                {
                    auto fadeSingle = [&](const QString &key, const QString &mapKey, int targetValue, int fadingTime) {
                        QJsonArray arr = resultObj[key].toArray();
                        if (arr.size() < 2) return;

                        int currentValue = arr[1].toInt();
                        fadeOutput(client, mapKey, currentValue, targetValue, fadingTime);
                    };

                    if (outPutInfoSet.outputSelect == "monitor-mix") {
                        fadeSingle("localMixer", "monitor-mix", outPutInfoSet.volumeRangeValue.toInt(),
                                   outPutInfoSet.fadingSelect.toInt());
                    } else if (outPutInfoSet.outputSelect == "stream-mix") {
                        fadeSingle("streamMixer", "stream-mix", outPutInfoSet.volumeRangeValue.toInt(),
                                   outPutInfoSet.fadingSelect.toInt());
                    } else if (outPutInfoSet.outputSelect == "all") {
                        fadeSingle("localMixer", "monitor-mix", outPutInfoSet.volumeRangeValue.toInt(),
                                   outPutInfoSet.fadingSelect.toInt());
                        fadeSingle("streamMixer", "stream-mix", outPutInfoSet.volumeRangeValue.toInt(),
                                   outPutInfoSet.fadingSelect.toInt());
                    }
                }else if(ids_.value(id) == "wavelinkOutputAdjust")
                {
                    auto applyStep = [&](const QString &key, const QString &mapKey) {
                        QJsonArray arr = resultObj[key].toArray();
                        if (arr.size() < 2) return;

                        int current = arr[1].toInt();
                        int target = current + outPutInfoAdjust.stepRangeValue.toInt();
                        target = qBound(0, target, 100);

                        fadeOutput(client, mapKey, current, target);
                    };

                    if (outPutInfoAdjust.outputSelect == "monitor-mix")
                    {
                        applyStep("localMixer", "monitor-mix");
                    } else if (outPutInfoAdjust.outputSelect == "stream-mix")
                    {
                        applyStep("streamMixer", "stream-mix");
                    } else if (outPutInfoAdjust.outputSelect == "all")
                    {
                        applyStep("localMixer", "monitor-mix");
                        applyStep("streamMixer", "stream-mix");
                    }
                }

                ids_.remove(id);
            }else if(ids_.contains(id) && ids_.value(id) == "wavelinkOutputMute")
            {
                auto getMuteFlag = [&](const QString &output) -> bool {
                    auto getArrayMute = [&](const QString &key) -> bool {
                        QJsonArray arr = resultObj[key].toArray();
                        return (arr.size() >= 2) ? arr[0].toBool() : false;
                    };

                    if (output == "monitor-mix") {
                        return getArrayMute("localMixer");
                    } else if (output == "stream-mix") {
                        return getArrayMute("streamMixer");
                    } else if (output == "all") {
                        return getArrayMute("localMixer") && getArrayMute("streamMixer");
                    }
                    return false;
                };

                bool muteFlag = getMuteFlag(outPutInfoMute.outputSelect);

                QJsonObject params;
                params["property"] = "Output Mute";
                params["mixerID"] = mixersMap[outPutInfoMute.outputSelect];
                params["value"] = !muteFlag;
                params["forceLink"] = (outPutInfoMute.outputSelect == "all");

                Logger::LogToServer(QString("Toggle mute: %1 -> %2")
                                        .arg(muteFlag).arg(!muteFlag));


                client->sendCommand("setOutputConfig", params);

                ids_.remove(id);
            }else if(ids_.contains(id) && (ids_.value(id) == "getInputConfigs"
                       || ids_.value(id) == "wavelinkInputSet"
                       || ids_.value(id) == "wavelinkInputAdjust"
                       || ids_.value(id) == "wavelinkInputMute"))
            {
                QJsonObject settings = currentPayload_["settings"].toObject();
                QJsonArray resultArr = obj["result"].toArray();
                inputsFilterArray = QJsonArray();
                for (const QJsonValue &val : resultArr)
                {
                    QJsonObject inputObj = val.toObject();
                    QJsonObject inputJson;

                    inputJson["name"] = inputObj["name"].toString();
                    inputJson["identifier"] = inputObj["identifier"].toString();

                    QJsonArray filtersArray;
                    if (inputObj.contains("filters"))
                    {
                        QJsonArray filters = inputObj["filters"].toArray();
                        for (const QJsonValue &f : filters)
                        {
                            QJsonObject filterObj = f.toObject();
                            QJsonObject filterJson;

                            filterJson["filterID"] = filterObj["filterID"].toString();
                            filterJson["name"]     = filterObj["name"].toString();
                            filterJson["isActive"] = filterObj["isActive"].toBool();
                            filterJson["pluginID"] = filterObj["pluginID"].toString();

                            filtersArray.append(filterJson);
                        }
                    }
                    inputJson["filters"] = filtersArray;

                    auto extractMixerValue = [](const QJsonObject &obj, const QString &key, int index, const QJsonValue &defaultValue) -> QJsonValue {
                        if (obj.contains(key))
                        {
                            QJsonArray arr = obj[key].toArray();
                            if (arr.size() > index)
                            {
                                return arr.at(index);
                            }
                        }
                        return defaultValue;
                    };

                    inputJson["localMute"]  = extractMixerValue(inputObj, "localMixer", 0, false).toBool();
                    inputJson["streamMute"] = extractMixerValue(inputObj, "streamMixer", 0, false).toBool();

                    inputJson["localVolume"]  = extractMixerValue(inputObj, "localMixer", 1, 0).toInt();
                    inputJson["streamVolume"] = extractMixerValue(inputObj, "streamMixer", 1, 0).toInt();

                    inputJson["localFilterBypass"]  = extractMixerValue(inputObj, "localMixer", 2, false).toBool();
                    inputJson["streamFilterBypass"] = extractMixerValue(inputObj, "streamMixer", 2, false).toBool();

                    inputsFilterArray.append(inputJson);
                }
                settings["inputs"] = inputsFilterArray;
                Action::SetSettings(settings);

                //
                if(ids_.value(id) == "wavelinkInputSet")
                {
                    QJsonObject params;
                    for (const QJsonValue &inputVal : inputsFilterArray)
                    {
                        QJsonObject inputObj = inputVal.toObject();

                        if (inputObj["name"].toString() == inPutInfoSet.inputSelect)
                        {
                            params["property"] = "Volume";
                            params["identifier"] = inputObj["identifier"].toString();
                            auto sendVolume = [=](const QString &mixerKey, const QString &volumeKey) {
                                QJsonObject p = params;
                                p["mixerID"]   = mixersMap[mixerKey];
                                p["forceLink"] = (inPutInfoSet.outputSelect == "all");

                                int startValue = inputObj[volumeKey].toInt();
                                int targetValue = inPutInfoSet.volumeRangeValue.toInt();

                                int steps   = inPutInfoSet.fadingSelect.toInt() * 1000;
                                if (steps <= 0) steps = 1;

                                double delta = (targetValue - startValue) / static_cast<double>(steps);
                                for (int i = 1; i <= steps; ++i) {
                                    int currentValue = startValue + static_cast<int>(delta * i);
                                    p["value"] = currentValue;
                                    client->sendCommand("setInputConfig", p);
                                }
                            };

                            if (inPutInfoSet.outputSelect == "monitor-mix")
                            {
                                sendVolume("monitor-mix", "localVolume");
                            }
                            else if (inPutInfoSet.outputSelect == "stream-mix")
                            {
                                sendVolume("stream-mix", "streamVolume");
                            }
                            else if (inPutInfoSet.outputSelect == "all")
                            {
                                sendVolume("monitor-mix", "localVolume");
                                // sendVolume("stream-mix", "streamVolume");
                            }
                            //
                            Action::SetTitle(inputObj["localVolume"].toString() + inputObj["streamVolume"].toString());
                            break;
                        }
                    }
                }else if(ids_.value(id) == "wavelinkInputAdjust")
                {
                    QJsonObject params;
                    for (const QJsonValue &inputVal : inputsFilterArray)
                    {
                        QJsonObject inputObj = inputVal.toObject();

                        if (inputObj["name"].toString() == inPutInfoAdjust.inputSelect)
                        {
                            params["property"]   = "Volume";
                            params["identifier"] = inputObj["identifier"].toString();

                            auto sendVolume = [&](const QString &mixerKey, const QString &volumeKey) {
                                QJsonObject p = params;
                                p["mixerID"]   = mixersMap[mixerKey];
                                p["value"]     = inPutInfoAdjust.stepRangeValue.toInt() + inputObj[volumeKey].toInt();
                                p["forceLink"] = (inPutInfoAdjust.outputSelect == "all");
                                client->sendCommand("setInputConfig", p);
                            };

                            if (inPutInfoAdjust.outputSelect == "monitor-mix")
                            {
                                sendVolume("monitor-mix", "localVolume");
                            }
                            else if (inPutInfoAdjust.outputSelect == "stream-mix")
                            {
                                sendVolume("stream-mix", "streamVolume");
                            }
                            else if (inPutInfoAdjust.outputSelect == "all")
                            {
                                sendVolume("monitor-mix", "localVolume");
                                sendVolume("stream-mix", "streamVolume");
                            }
                            Action::SetTitle(inputObj["localVolume"].toString() + inputObj["streamVolume"].toString());
                            break;

                        }
                    }
                }else if(ids_.value(id) == "wavelinkInputMute")
                {
                    QJsonObject params;
                    for (const QJsonValue &inputVal : inputsFilterArray)
                    {
                        QJsonObject inputObj = inputVal.toObject();
                        if (inputObj["name"].toString() == inPutInfoMute.inputSelect)
                        {
                            params["property"] = "Mute";
                            params["identifier"] = inputObj["identifier"].toString();
                            params["mixerID"] = mixersMap[inPutInfoMute.outputSelect];
                            if(inPutInfoMute.outputSelect == "monitor-mix")
                            {
                                params["value"] = !inputObj["localMute"].toBool();
                            }else if(inPutInfoMute.outputSelect == "stream-mix")
                            {
                                params["value"] = !inputObj["streamMute"].toBool();
                            }else if(inPutInfoMute.outputSelect == "all")
                            {
                                params["value"] = !(inputObj["localMute"].toBool()&&inputObj["streamMute"].toBool());
                            }
                            params["forceLink"] = inPutInfoMute.outputSelect=="all";
                            client->sendCommand("setInputConfig", params);

                            //
                            Logger::LogToServer("titleeeeeee +++++++++++ : " + inputObj["localVolume"].toString() + inputObj["streamVolume"].toString());

                            Action::SetTitle(inputObj["localVolume"].toString() + inputObj["streamVolume"].toString());
                            break;
                        }
                    }
                }
                //
                ids_.remove(id);
            }

        });
    }
}

void ExampleAction::DidReceiveSettings(const QJsonObject &payload)
{
    Logger::LogToServer("DidReceiveSettings");
    currentPayload_  = payload;
}

void ExampleAction::KeyDown(const QJsonObject &payload)
{
    QJsonObject settings = payload["settings"].toObject();
    QString TypeRadioValue = settings.contains("TypeRadioValue")
                                 ? settings["TypeRadioValue"].toString()
                                 : "";

    QString inputSelect = settings.contains("inputSelect")
                              ? settings["inputSelect"].toString()
                              : "";

    QString outputSelect = settings.contains("outputSelect")
                               ? settings["outputSelect"].toString()
                               : "";

    QString fadingSelect = settings.contains("fadingSelect")
                               ? settings["fadingSelect"].toString()
                               : "";

    QString volumeRangeValue = settings.contains("volumeRangeValue")
                                   ? settings["volumeRangeValue"].toString()
                                   : "";

    QString stepRangeValue = settings.contains("stepRangeValue")
                                 ? settings["stepRangeValue"].toString()
                                 : "";
    QString submixSelect = settings.contains("submixSelect")
                               ? settings["submixSelect"].toString()
                               : "";

    QString primarySelect = settings.contains("primarySelect")
                                   ? settings["primarySelect"].toString()
                                   : "";

    QString secondarySelect = settings.contains("secondarySelect")
                                 ? settings["secondarySelect"].toString()
                                 : "";

    QString EffectSelect = settings.contains("EffectSelect")
                                  ? settings["EffectSelect"].toString()
                                  : "";

    Logger::LogToServer("KeyDown +++++++++++ : " + TypeRadioValue);

    if(action_ == "com.hotspot.stream.wavelinkInput")
    {
        if(TypeRadioValue == "set")
        {
            inPutInfoSet.inputSelect = inputSelect;
            inPutInfoSet.outputSelect = outputSelect;
            inPutInfoSet.fadingSelect = fadingSelect;
            inPutInfoSet.volumeRangeValue = volumeRangeValue;
            ids_.insert(client->sendCommand("getInputConfigs"), "wavelinkInputSet");
        }else if(TypeRadioValue == "adjust")
        {
            inPutInfoAdjust.inputSelect    = inputSelect;
            inPutInfoAdjust.outputSelect   = outputSelect;
            inPutInfoAdjust.stepRangeValue = stepRangeValue;

            isLongPress = false;
            longPressTimer.setSingleShot(true);
            QObject::connect(&longPressTimer, &QTimer::timeout, [this]() {
                    isLongPress = true;
                    Logger::LogToServer("LongPress triggered!");

                    QObject::connect(&longPressRepeatTimer, &QTimer::timeout, [this]() {
                            ids_.insert(client->sendCommand("getInputConfigs"), "wavelinkInputAdjust");
                        });

                    longPressRepeatTimer.start(100);
                    ids_.insert(client->sendCommand("getInputConfigs"), "wavelinkInputAdjust");
                });

            longPressTimer.start(500);
        }else if(TypeRadioValue == "mute"){
            inPutInfoMute.inputSelect = inputSelect;
            inPutInfoMute.outputSelect = outputSelect;

            ids_.insert(client->sendCommand("getInputConfigs"), "wavelinkInputMute");
        }else if(TypeRadioValue == "add")
        {

        }
    }else if(action_ == "com.hotspot.stream.wavelinkOutput")
    {
        if(TypeRadioValue == "set")
        {
            outPutInfoSet.outputSelect = outputSelect;
            outPutInfoSet.fadingSelect = fadingSelect;
            outPutInfoSet.volumeRangeValue = volumeRangeValue;
            ids_.insert(client->sendCommand("getOutputConfig"), "wavelinkOutputSet");

        }else if(TypeRadioValue == "adjust")
        {
            outPutInfoAdjust.outputSelect = outputSelect;
            outPutInfoAdjust.stepRangeValue = stepRangeValue;

            isLongPress = false;
            longPressTimer.setSingleShot(true);
            QObject::connect(&longPressTimer, &QTimer::timeout, [this]() {
                isLongPress = true;
                Logger::LogToServer("LongPress triggered!");

                QObject::connect(&longPressRepeatTimer, &QTimer::timeout, [this]() {
                    ids_.insert(client->sendCommand("getOutputConfig"), "wavelinkOutputAdjust");
                });

                longPressRepeatTimer.start(100);
                ids_.insert(client->sendCommand("getOutputConfig"), "wavelinkOutputAdjust");
            });

            longPressTimer.start(500);
        }else if(TypeRadioValue == "mute")
        {
            outPutInfoMute.outputSelect = outputSelect;
            ids_.insert(client->sendCommand("getOutputConfig"), "wavelinkOutputMute");
        }else if(TypeRadioValue == "toggle")
        {
            client->sendCommand("switchOutput");
        }
    }else if(action_ == "com.hotspot.stream.wavelinkDeivce")
    {
        if(TypeRadioValue == "set")
        {
            QJsonObject params;
            params["name"] = submixSelect;
            params["mixerID"] = mixersMap[outputSelect];
            params["identifier"] = allDevices[submixSelect];
            client->sendCommand("setSelectedOutput", params);
        }else if(TypeRadioValue == "toggle")
        {
            int num = globalQSettings.value(QString("wavelink/%1").arg(context_), 1).toInt();
            QString select = (num % 2 == 0) ? primarySelect : secondarySelect;
            num = (num % 2) + 1;
            globalQSettings.setValue(QString("wavelink/%1").arg(context_), num);

            QJsonObject params;
            params["name"] = select;
            params["mixerID"] = mixersMap[outputSelect];
            params["identifier"] = allDevices[select];
            client->sendCommand("setSelectedOutput", params);

            Logger::LogToServer("toggle ++++++++++++++ ：" + QString::fromStdString(std::to_string(num)));
        }else if(TypeRadioValue == "manage")
        {
        }
    }else if(action_ == "com.hotspot.stream.wavelinkEffects")
    {
        if(TypeRadioValue == "effect")
        {
            Logger::LogToServer("effect ++++++++++++++ ：" + inputSelect + EffectSelect);
            QJsonObject params;
            for (const QJsonValue &inputVal : inputsFilterArray)
            {
                QJsonObject inputObj = inputVal.toObject();

                if (inputObj["name"].toString() == inputSelect)
                {
                    params["identifier"] = inputObj["identifier"].toString();

                    QJsonArray filters = inputObj["filters"].toArray();
                    for (const QJsonValue &f : filters) {
                        QJsonObject filterObj = f.toObject();
                        if (filterObj["filterID"].toString() == EffectSelect)
                        {
                            params["filterID"] = filterObj["filterID"].toString();
                            bool lastValue = globalQSettings.value(
                                                                QString("wavelinkEffect/%1").arg(context_),
                                                                filterObj["isActive"].toBool()).toBool();
                            params["value"] = !lastValue;
                            globalQSettings.setValue(
                                QString("wavelinkEffect/%1").arg(context_),
                                !lastValue);
                            break;
                        }
                    }
                    break;
                }
            }
            client->sendCommand("setFilter", params);
        }else if(TypeRadioValue == "chain")
        {
            Logger::LogToServer("chain ++++++++++++++ ：" + inputSelect + "::" + outputSelect);
            QJsonObject params;
            for (const QJsonValue &inputVal : inputsFilterArray)
            {
                QJsonObject inputObj = inputVal.toObject();

                if (inputObj["name"].toString() == inputSelect)
                {
                    params["identifier"] = inputObj["identifier"].toString();

                    auto sendBypass = [&](const QString &mixerKey, const QString &bypassKey) {
                        QJsonObject p = params;
                        bool lastValue = globalQSettings.value(QString("wavelinkEffect/%1/%2").arg(context_, mixerKey),
                                                            inputObj[bypassKey].toBool()).toBool();
                        p["mixerID"] = mixersMap[mixerKey];
                        p["value"]   = !lastValue;
                        globalQSettings.setValue(QString("wavelinkEffect/%1/%2").arg(context_, mixerKey),
                            !lastValue);

                        client->sendCommand("setFilterBypass", p);
                    };

                    if (outputSelect == "monitor-mix")
                    {
                        sendBypass("monitor-mix", "localFilterBypass");
                    }
                    else if (outputSelect == "stream-mix")
                    {
                        sendBypass("stream-mix", "streamFilterBypass");
                    }
                    else if (outputSelect == "all")
                    {
                        sendBypass("monitor-mix", "localFilterBypass");
                        sendBypass("stream-mix", "streamFilterBypass");
                    }
                    break;
                }
            }

        }
    }
}

void ExampleAction::KeyUp(const QJsonObject &payload)
{
    // Log in release and debug builds
    Logger::LogToServer("KeyUp");

    if(action_ == "com.hotspot.stream.wavelinkInput" ||
        action_ == "com.hotspot.stream.wavelinkOutput")
    {
        QJsonObject settings = currentPayload_["settings"].toObject();
        QString TypeRadioValue = settings.contains("TypeRadioValue")
                                     ? settings["TypeRadioValue"].toString()
                                     : "";
        if(TypeRadioValue == "adjust")
        {
            if (longPressTimer.isActive())
                longPressTimer.stop();

            if (longPressRepeatTimer.isActive())
                longPressRepeatTimer.stop();

            if (!isLongPress) {
                Logger::LogToServer("LongPress released!");
                if(action_ == "com.hotspot.stream.wavelinkInput")
                {
                    ids_.insert(client->sendCommand("getInputConfigs"), "wavelinkInputAdjust");
                }else if(action_ == "com.hotspot.stream.wavelinkOutput")
                {
                    ids_.insert(client->sendCommand("getOutputConfig"), "wavelinkOutputAdjust");
                }
            }
        }
    }
}

void ExampleAction::WillAppear(const QJsonObject &payload)
{
    Logger::LogToServer("WillAppear");
    currentPayload_  = payload;

    if(action_ == "com.hotspot.stream.wavelinkInput")
    {
        ids_.insert(client->sendCommand("getInputConfigs"), "getInputConfigs");
    }else if(action_ == "com.hotspot.stream.wavelinkDeivce")
    {
        ids_.insert(client->sendCommand("getOutputs"), "getOutputs");
    }else if(action_ == "com.hotspot.stream.wavelinkEffects")
    {
        ids_.insert(client->sendCommand("getInputConfigs"), "getInputConfigs");
    }
}

void ExampleAction::WillDisappear(const QJsonObject &payload)
{
    Logger::LogToServer("WillAppear");
}

void ExampleAction::SendToPlugin(const QJsonObject &payload)
{
    QString payloadString = QJsonDocument(payload).toJson(QJsonDocument::Compact);
    Logger::LogToServer(QString("Received message from property inspector: %1").arg(payloadString));
}

void ExampleAction::PropertyInspectorDidAppear(const QJsonObject &payload)
{
    QString payloadString = QJsonDocument(payload).toJson(QJsonDocument::Compact);
    Logger::LogToServer(QString("PropertyInspectorDidAppear: %1").arg(payloadString));

    if(action_ == "com.hotspot.stream.wavelinkInput")
    {
        ids_.insert(client->sendCommand("getInputConfigs"), "getInputConfigs");
    }else if(action_ == "com.hotspot.stream.wavelinkDeivce")
    {
        ids_.insert(client->sendCommand("getOutputs"), "getOutputs");
    }else if(action_ == "com.hotspot.stream.wavelinkEffects")
    {
        ids_.insert(client->sendCommand("getInputConfigs"), "getInputConfigs");
    }
}
