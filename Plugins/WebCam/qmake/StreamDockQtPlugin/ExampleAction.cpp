#include "ExampleAction.h"
#include <Logger.h>
#include <QJsonArray>
#include <QJsonDocument>

ExampleAction::ExampleAction(ConnectionManager *connection, const QString &action, const QString &context)
    : Action{connection, action, context}
{
    this->action = action;
    this->context = context;
    hr = CoInitializeEx(NULL, COINIT_MULTITHREADED);
}

ExampleAction::~ExampleAction()
{
    delete camera;
    CoUninitialize();
}

void ExampleAction::DidReceiveSettings(const QJsonObject &payload)
{
    Logger::LogToServer("DidReceiveSettings");
    Logger::LogToServer(QJsonDocument(payload).toJson(QJsonDocument::Compact));
    QString webcamStr = "";
    QString propStr = "";
    long selectedDefaultValue = -1;
    long selectedMinValue = -1;
    long selectedMaxValue = -1;
    QJsonObject settings = payload["settings"].toObject();
    if (settings.contains("webcamStr"))
    {
        webcamStr = settings["webcamStr"].toString();
        if (!webcamStr.isEmpty()) {
            QRegExp regex("\\s?\\(.*\\)");
            webcamStr = webcamStr.replace(regex, "");
        }
    }
    if (settings.contains("propStr"))
    {
        propStr = settings["propStr"].toString();
    }
    // 回传摄像头数据
    {
        {
            hr = CameraHelper::EnumerateDevices(CLSID_VideoInputDeviceCategory, &pEnum);
            if (SUCCEEDED(hr))
            {
                camera= CameraHelper::seekSpecialDevice(pEnum, webcamStr);
                pEnum->Release();
            }
        }

        if(camera)
        {
            if(!camera->pInputFilter)
            {
                Logger::LogToServer("Failed to get pInputFilter");
                return;
            }
            IAMVideoProcAmp* pProcAmp = nullptr;
            if (SUCCEEDED(camera->pInputFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp)))
            {
                long Step, tFlags;
                long prop = -1;
                if(CameraHelper::isVideoProcAmpProperty(propStr))
                {
                    prop = CameraHelper::getVideoProcAmpProperty(propStr);
                }else if(CameraHelper::isCameraControlProperty(propStr))
                {
                    prop = CameraHelper::getCameraControlProperty(propStr);
                }
                hr = pProcAmp->GetRange(prop,
                                   &selectedMinValue,
                                   &selectedMaxValue,
                                   &Step,
                                   &selectedDefaultValue,
                                   &tFlags);
                pProcAmp->Release();

                Logger::LogToServer(QString("============ %1 %2 %3 %4").arg(prop).arg(selectedDefaultValue).arg(selectedMinValue).arg(selectedMaxValue));

                QJsonObject tmpSettings = settings;
                tmpSettings["Min"] = static_cast<qint64>(selectedMinValue);
                tmpSettings["Max"] = static_cast<qint64>(selectedMaxValue);
                tmpSettings["Support"] = SUCCEEDED(hr)? true: false;

                SetSettings(tmpSettings);
                Logger::LogToServer("回传摄像头数据");
            }
        }
    }
}

void ExampleAction::KeyDown(const QJsonObject &payload)
{
    QString webcamStr = "";
    QString propStr = "";
    long propValue = -1;
    long selectedSliderValue = -1;
    long selectedDefaultValue = -1;
    long selectedFadeValue = 0;
    long selectedStepValue = -1;
    long selectedMinValue = -1;
    long selectedMaxValue = -1;
    long selectedPTT = 0;

    QJsonObject settings = payload["settings"].toObject();
    if (settings.contains("webcamStr"))
    {
        webcamStr = settings["webcamStr"].toString();
        if (!webcamStr.isEmpty()) {
            QRegExp regex("\\s?\\(.*\\)");
            webcamStr = webcamStr.replace(regex, "");
        }
    }
    if (settings.contains("propStr"))
    {
        propStr = settings["propStr"].toString();
    }
    if (settings.contains("selected"))
    {
        propValue = settings["selected"].toInt();
    }
    if (settings.contains("selectedSlider"))
    {
        selectedSliderValue = settings["selectedSlider"].toInt();
    }
    if (settings.contains("selectedFade"))
    {
        selectedFadeValue = settings["selectedFade"].toInt();
    }
    if (settings.contains("selectedStep"))
    {
        selectedStepValue = settings["selectedStep"].toInt();
    }
    if (settings.contains("selectedStep"))
    {
        selectedPTT = settings["selectedPTT"].toInt();
    }

    Logger::LogToServer(QString("KeyDown: enter %1 %2 %3 %4 %5 %6 %7")
                            .arg(propValue)
                            .arg(selectedSliderValue)
                            .arg(selectedFadeValue)
                            .arg(selectedStepValue)
                            .arg(selectedMinValue)
                            .arg(selectedMaxValue)
                            .arg(selectedPTT));

    Logger::LogToServer("=========================1");
    long oldValue = -1;
    if(camera == nullptr)
    {
        hr = CameraHelper::EnumerateDevices(CLSID_VideoInputDeviceCategory, &pEnum);
        if (SUCCEEDED(hr))
        {
            camera= CameraHelper::seekSpecialDevice(pEnum, webcamStr);
            pEnum->Release();
        }
    }
    if(camera)
    {
        if(CameraHelper::isVideoProcAmpProperty(propStr))
        {
            Logger::LogToServer(QString("=========================2 %1 %2").arg(CameraHelper::getVideoProcAmpProperty(propStr)).arg(propStr));
            QThread::msleep(selectedFadeValue);
            if(propValue == 1)// auto
            {
                oldValue = CameraHelper::changeVideoProperty(camera->pInputFilter,CameraHelper::getVideoProcAmpProperty(propStr), -100086, VideoProcAmp_Flags_Auto);
            }else if(propValue == 2)// default
            {
                oldValue = CameraHelper::changeVideoProperty(camera->pInputFilter,CameraHelper::getVideoProcAmpProperty(propStr), selectedDefaultValue, VideoProcAmp_Flags_Manual);
            }else if(propValue == 3)// manual set
            {
                oldValue = CameraHelper::changeVideoProperty(camera->pInputFilter,CameraHelper::getVideoProcAmpProperty(propStr), selectedSliderValue, VideoProcAmp_Flags_Manual);
            }else// manual step
            {
                oldValue = CameraHelper::changeVideoProperty(camera->pInputFilter,CameraHelper::getVideoProcAmpProperty(propStr), -100086, VideoProcAmp_Flags_Manual,selectedStepValue);
            }
        }else if(CameraHelper::isCameraControlProperty(propStr))
        {
            Logger::LogToServer(QString("=========================3 %1 %2").arg(CameraHelper::getCameraControlProperty(propStr)).arg(propStr));
            QThread::msleep(selectedFadeValue);
            if(propValue == 1)  // auto
            {
                oldValue = CameraHelper::changeVideoControl(camera->pCameraControl,CameraHelper::getCameraControlProperty(propStr), -100086, CameraControl_Flags_Auto);
            }else if(propValue == 2)// default
            {
                int tmpValue = (selectedMinValue+selectedMaxValue)/2;
                oldValue = CameraHelper::changeVideoControl(camera->pCameraControl,CameraHelper::getCameraControlProperty(propStr), tmpValue, CameraControl_Flags_Manual);
            }else if(propValue == 3)// manual set
            {
                oldValue = CameraHelper::changeVideoControl(camera->pCameraControl,CameraHelper::getCameraControlProperty(propStr), selectedSliderValue, CameraControl_Flags_Manual);
            }else// manual step
            {
                oldValue = CameraHelper::changeVideoControl(camera->pCameraControl,CameraHelper::getCameraControlProperty(propStr), -100086, CameraControl_Flags_Manual, selectedStepValue);
            }
        }else if(propStr == "Low Light Compensation"){

        }else if(propStr == "Powerline Frequency (50/60)"){

        }
        // 对PTT进行额外处理
        if("com.mirabox.webcamptt.settings" == action)
        {
            QThread::msleep(selectedPTT);
            if(CameraHelper::isVideoProcAmpProperty(propStr))
            {
                CameraHelper::changeVideoProperty(camera->pInputFilter,CameraHelper::getVideoProcAmpProperty(propStr), oldValue, VideoProcAmp_Flags_Manual);
            }else if(CameraHelper::isCameraControlProperty(propStr))
            {
                CameraHelper::changeVideoControl(camera->pCameraControl,CameraHelper::getCameraControlProperty(propStr), oldValue, CameraControl_Flags_Manual);
            }else if(propStr == "Low Light Compensation"){
            }else if(propStr == "Powerline Frequency (50/60)"){
            }
        }

    }else
    {
        Logger::LogToServer("======================-1 失效");
    }
}

void ExampleAction::KeyUp(const QJsonObject &payload)
{
    Logger::LogToServer("KeyUp");
}

void ExampleAction::WillAppear(const QJsonObject &payload)
{
    Logger::LogToServer("WillAppear");
}

void ExampleAction::WillDisappear(const QJsonObject &payload)
{
    Logger::LogToServer("WillAppear");
}

void ExampleAction::SetSettings(const QJsonObject &inPayload)
{
    Action::SetSettings(inPayload);
}

void ExampleAction::DialUp(const QJsonObject &payload)
{
    Logger::LogToServer("DialUp" + QJsonDocument(payload).toJson(QJsonDocument::Compact));
}

void ExampleAction::DialDown(const QJsonObject &payload)
{
    Logger::LogToServer("DialDown" + QJsonDocument(payload).toJson(QJsonDocument::Compact));

    QString webcamStr = "";
    QString propStr = "";
    long selectedFadeValue = 0;
    long selectedSliderValue = -1;

    QJsonObject settings = payload["settings"].toObject();
    if (settings.contains("webcamStr"))
    {
        webcamStr = settings["webcamStr"].toString();
        if (!webcamStr.isEmpty()) {
            QRegExp regex("\\s?\\(.*\\)");
            webcamStr = webcamStr.replace(regex, "");
        }
    }
    if (settings.contains("propStr"))
    {
        propStr = settings["propStr"].toString();
    }
    if (settings.contains("selectedSlider"))
    {
        selectedSliderValue = settings["selectedSlider"].toInt();
    }
    if (settings.contains("selectedFade"))
    {
        selectedFadeValue = settings["selectedFade"].toInt();
    }

    if(camera == nullptr)
    {
        hr = CameraHelper::EnumerateDevices(CLSID_VideoInputDeviceCategory, &pEnum);
        if (SUCCEEDED(hr))
        {
            camera= CameraHelper::seekSpecialDevice(pEnum, webcamStr);
            pEnum->Release();
        }
    }
    if(camera)
    {
        QThread::msleep(selectedFadeValue);
        if(CameraHelper::isVideoProcAmpProperty(propStr))
        {
            CameraHelper::changeVideoProperty(camera->pInputFilter,CameraHelper::getVideoProcAmpProperty(propStr), selectedSliderValue, VideoProcAmp_Flags_Manual);
        }else if(CameraHelper::isCameraControlProperty(propStr))
        {
            CameraHelper::changeVideoControl(camera->pCameraControl,CameraHelper::getCameraControlProperty(propStr), selectedSliderValue, CameraControl_Flags_Manual);
        }else if(propStr == "Low Light Compensation"){
        }else if(propStr == "Powerline Frequency (50/60)"){
        }
        delete camera;
    }
    CoUninitialize();
}

void ExampleAction::RotateClockwise(const QJsonObject &payload, const unsigned int ticks, const bool pressed)
{
    Logger::LogToServer("RotateClockwise");

    this->dialSpecialAction(true, payload);
}

void ExampleAction::RotateCounterClockwise(const QJsonObject &payload, const unsigned int ticks, const bool pressed)
{
    Logger::LogToServer("RotateCounterClockwise");

    this->dialSpecialAction(false, payload);
}

void ExampleAction::dialSpecialAction(bool isClockwise, const QJsonObject &payload)
{
    QString webcamStr = "";
    QString propStr = "";
    long selectedFadeValue = 0;
    long rotationStep = -1;

    QJsonObject settings = payload["settings"].toObject();
    if (settings.contains("webcamStr"))
    {
        webcamStr = settings["webcamStr"].toString();
        if (!webcamStr.isEmpty()) {
            QRegExp regex("\\s?\\(.*\\)");
            webcamStr = webcamStr.replace(regex, "");
        }
    }
    if (settings.contains("propStr"))
    {
        propStr = settings["propStr"].toString();
    }
    if (settings.contains("rotationStep"))
    {
        rotationStep = settings["rotationStep"].toInt();
        rotationStep = isClockwise?rotationStep:-rotationStep;
    }
    if (settings.contains("selectedFade"))
    {
        selectedFadeValue = settings["selectedFade"].toInt();
    }

    if(camera == nullptr)
    {
        hr = CameraHelper::EnumerateDevices(CLSID_VideoInputDeviceCategory, &pEnum);
        if (SUCCEEDED(hr))
        {
            camera= CameraHelper::seekSpecialDevice(pEnum, webcamStr);
            pEnum->Release();
        }
    }
    if(camera)
    {
        QThread::msleep(selectedFadeValue);
        if(CameraHelper::isVideoProcAmpProperty(propStr))
        {
            Logger::LogToServer("changeVideoProperty");
            CameraHelper::changeVideoProperty(camera->pInputFilter,CameraHelper::getVideoProcAmpProperty(propStr), -100086, VideoProcAmp_Flags_Manual,rotationStep);
        }else if(CameraHelper::isCameraControlProperty(propStr))
        {
            Logger::LogToServer("changeVideoControl");
            CameraHelper::changeVideoControl(camera->pCameraControl,CameraHelper::getCameraControlProperty(propStr), -100086, CameraControl_Flags_Manual,rotationStep);
        }else if(propStr == "Low Light Compensation"){
        }else if(propStr == "Powerline Frequency (50/60)"){
        }
        delete camera;
    }
    CoUninitialize();
}

void ExampleAction::SendToPlugin(const QJsonObject &payload)
{
    QString payloadString = QJsonDocument(payload).toJson(QJsonDocument::Compact);
    Logger::LogToServer(QString("Received message from property inspector: %1").arg(payloadString));
}
