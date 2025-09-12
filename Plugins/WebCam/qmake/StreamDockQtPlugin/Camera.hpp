#ifndef CAMERA_HPP
#define CAMERA_HPP

#include <windows.h>
#include <dshow.h>
#include <ks.h>
#include <ksmedia.h>
#include <vidcap.h>
#include <strmif.h>
#include <QThread>
#include <qDebug>
#include <Logger.h>

#pragma comment(lib, "strmiids")

// const static QMap<QString, VideoProcAmpProperty> propSettingsMap = {
//     {"Backlight Compensation", VideoProcAmp_BacklightCompensation},
//     {"Brightness", VideoProcAmp_Brightness},
//     {"ColorEnable", VideoProcAmp_ColorEnable},
//     {"Contrast", VideoProcAmp_Contrast},
//     {"Gain", VideoProcAmp_Gain},
//     {"Gamma", VideoProcAmp_Gamma},
//     {"Hue", VideoProcAmp_Hue},
//     {"Saturation", VideoProcAmp_Saturation},
//     {"Sharpness", VideoProcAmp_Sharpness},
//     {"White Balance", VideoProcAmp_WhiteBalance}
// };
// const static QMap<QString, CameraControlProperty> propControlMap = {
//     {"Pan", CameraControl_Pan},
//     {"Tilt", CameraControl_Tilt},
//     {"Roll", CameraControl_Roll},
//     {"Zoom", CameraControl_Zoom},
//     {"Exposure", CameraControl_Exposure},
//     {"Iris", CameraControl_Iris},
//     {"Focus", CameraControl_Focus}
// };



struct DShowCamera
{
    ICameraControl* pCameraControl = nullptr;
    IBaseFilter* pInputFilter = nullptr;
};


class CameraHelper
{
public:
    static HRESULT EnumerateDevices(REFGUID category, IEnumMoniker **ppEnum)
    {
        ICreateDevEnum *pDevEnum;
        HRESULT hr = CoCreateInstance(CLSID_SystemDeviceEnum, NULL,
                                      CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&pDevEnum));

        if (SUCCEEDED(hr))
        {
            hr = pDevEnum->CreateClassEnumerator(category, ppEnum, 0);
            if (hr == S_FALSE)
            {
                hr = VFW_E_NOT_FOUND;
            }
            pDevEnum->Release();
        }
        return hr;
    }

    static bool isVideoProcAmpProperty(const QString& key) {
        return (key == "Backlight Compensation" || key == "Brightness" ||
                key == "ColorEnable" || key == "Contrast" ||
                key == "Gain" || key == "Gamma" ||
                key == "Hue" || key == "Saturation" ||
                key == "Sharpness" || key == "White Balance");
    }

    static bool isCameraControlProperty(const QString& key) {
        return (key == "Pan" || key == "Tilt" || key == "Roll" ||
                key == "Zoom" || key == "Exposure" ||
                key == "Iris" || key == "Focus");
    }

    static VideoProcAmpProperty getVideoProcAmpProperty(const QString& key) {
        if (key == "Backlight Compensation") return VideoProcAmp_BacklightCompensation;
        if (key == "Brightness") return VideoProcAmp_Brightness;
        if (key == "ColorEnable") return VideoProcAmp_ColorEnable;
        if (key == "Contrast") return VideoProcAmp_Contrast;
        if (key == "Gain") return VideoProcAmp_Gain;
        if (key == "Gamma") return VideoProcAmp_Gamma;
        if (key == "Hue") return VideoProcAmp_Hue;
        if (key == "Saturation") return VideoProcAmp_Saturation;
        if (key == "Sharpness") return VideoProcAmp_Sharpness;
        if (key == "White Balance") return VideoProcAmp_WhiteBalance;
    }

    static CameraControlProperty getCameraControlProperty(const QString& key) {
        if (key == "Pan") return CameraControl_Pan;
        if (key == "Tilt") return CameraControl_Tilt;
        if (key == "Roll") return CameraControl_Roll;
        if (key == "Zoom") return CameraControl_Zoom;
        if (key == "Exposure") return CameraControl_Exposure;
        if (key == "Iris") return CameraControl_Iris;
        if (key == "Focus") return CameraControl_Focus;
    }


    struct DeviceContext {
        QString curDevice = "";
        QString curProp = "";
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
    };

    static QStringList getDeviceLists(IEnumMoniker *pEnum, const QString& seekDevice)
    {
        QStringList list;
        IMoniker *pMoniker = NULL;
        while (pEnum->Next(1, &pMoniker, NULL) == S_OK)
        {
            IPropertyBag *pPropBag;
            HRESULT hr = pMoniker->BindToStorage(0, 0, IID_PPV_ARGS(&pPropBag));
            if (FAILED(hr))
            {
                pMoniker->Release();
                continue;
            }

            VARIANT var;
            VariantInit(&var);
            hr = pPropBag->Read(L"FriendlyName", &var, 0);
            list.append(QString::fromWCharArray(var.bstrVal));
        }
        return list;
    }

    static DShowCamera* seekSpecialDevice(IEnumMoniker *pEnum, const QString& seekDevice)
    {
        IMoniker *pMoniker = NULL;
        while (pEnum->Next(1, &pMoniker, NULL) == S_OK)
        {
            IPropertyBag *pPropBag;
            HRESULT hr = pMoniker->BindToStorage(0, 0, IID_PPV_ARGS(&pPropBag));
            if (FAILED(hr))
            {
                pMoniker->Release();
                continue;
            }

            VARIANT var;
            VariantInit(&var);
            hr = pPropBag->Read(L"FriendlyName", &var, 0);
            DShowCamera* camera = new DShowCamera();
            if (SUCCEEDED(hr))
            {
                if (seekDevice == var.bstrVal)
                {
                    Logger::LogToServer("DShow Device: " + QString::fromWCharArray(var.bstrVal));
                    hr = pMoniker->BindToObject(nullptr, nullptr, IID_IBaseFilter, (void**)&camera->pInputFilter);

                    IKsTopologyInfo* pKsTopology = nullptr;
                    HRESULT hr = camera->pInputFilter->QueryInterface(__uuidof(IKsTopologyInfo), (void**)&pKsTopology);
                    if (FAILED(hr))
                    {
                        Logger::LogToServer("Failed to get IKsTopologyInfo");
                        pPropBag->Release();
                        pMoniker->Release();
                        break;
                    }

                    DWORD nodeCount = 0;
                    pKsTopology->get_NumNodes(&nodeCount);
                    for (DWORD i = 0; i < nodeCount; ++i)
                    {
                        GUID nodeType;
                        hr = pKsTopology->get_NodeType(i, &nodeType);
                        if (FAILED(hr)) continue;

                        if (nodeType == KSNODETYPE_VIDEO_CAMERA_TERMINAL)
                        {
                            hr = pKsTopology->CreateNodeInstance(i, __uuidof(ICameraControl), (void**)&camera->pCameraControl);
                            if(FAILED(hr))
                                Logger::LogToServer("Failed to create node instance for ICameraControl");
                            break;
                        }
                    }

                    pPropBag->Release();
                    pMoniker->Release();
                    pKsTopology->Release();

                    return camera;
                }
            }

            pPropBag->Release();
            pMoniker->Release();
        }
        return nullptr;
    }

    static long changeVideoProperty(IBaseFilter* pInputFilter,long Property, long lValue, long Flags, long AdditonalValue=0)
    {
        if(!pInputFilter)
        {
            Logger::LogToServer("Failed to get pInputFilter");
            return -1;
        }
        long oldValue = -1;
        IAMVideoProcAmp* pProcAmp = nullptr;
        if (SUCCEEDED(pInputFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp)))
        {
            long Min, Max, Step, Default, tFlags;
            HRESULT globalhr = pProcAmp->Get(Property, &oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                pProcAmp->GetRange(Property, &Min, &Max, &Step, &Default, &tFlags);

                if(lValue == -100086)
                    lValue = oldValue;

                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ Property:  %1 %2 ").arg(Property).arg(lValue).arg(Flags));
                pProcAmp->Set(Property, lValue, Flags);
            }

            pProcAmp->Release();
        }
        return oldValue;
    }

    static long changeVideoControl(ICameraControl* pCameraControl, long Property, long lValue, long Flags, long AdditonalValue=0)
    {
        if(!pCameraControl)
        {
            Logger::LogToServer("Failed to get pCameraControl");
            return -1;
        }
        long Min, Max, Step, Default, tFlags;
        long oldValue = -1;
        HRESULT globalhr;
        switch (Property) {
        case CameraControl_Pan:
            globalhr = pCameraControl->get_Pan(&oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                if(lValue == -100086)
                    lValue = oldValue;

                pCameraControl->getRange_Pan(&Min, &Max, &Step, &Default, &tFlags);
                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ Pan:  %1 %2 ").arg(lValue).arg(Flags));
                pCameraControl->put_Pan(lValue, Flags);
            }
            break;
        case CameraControl_Tilt:
            globalhr = pCameraControl->get_Tilt(&oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                if(lValue == -100086)
                    lValue = oldValue;

                pCameraControl->getRange_Tilt(&Min, &Max, &Step, &Default, &tFlags);
                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ Tilt:  %1 %2 ").arg(lValue).arg(Flags));
                pCameraControl->put_Tilt(lValue, Flags);
            }
            break;
        case CameraControl_Roll:
            globalhr = pCameraControl->get_Roll(&oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                if(lValue == -100086)
                    lValue = oldValue;

                pCameraControl->getRange_Roll(&Min, &Max, &Step, &Default, &tFlags);
                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ Roll:  %1 %2 ").arg(lValue).arg(Flags));
                pCameraControl->put_Roll(lValue, Flags);
            }
            break;
        case CameraControl_Zoom:
            globalhr = pCameraControl->get_Zoom(&oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                if(lValue == -100086)
                    lValue = oldValue;

                pCameraControl->getRange_Zoom(&Min, &Max, &Step, &Default, &tFlags);
                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ zoom:  %1 %2 ").arg(lValue).arg(Flags));
                pCameraControl->put_Zoom(lValue, Flags);
            }
            break;
        case CameraControl_Exposure:
            globalhr = pCameraControl->get_Exposure(&oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                if(lValue == -100086)
                    lValue = oldValue;

                pCameraControl->getRange_Exposure(&Min, &Max, &Step, &Default, &tFlags);
                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ Exposure:  %1 %2 ").arg(lValue).arg(Flags));
                pCameraControl->put_Exposure(lValue, Flags);
            }
            break;
        case CameraControl_Iris:
            globalhr = pCameraControl->get_Iris(&oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                if(lValue == -100086)
                    lValue = oldValue;

                pCameraControl->getRange_Iris(&Min, &Max, &Step, &Default, &tFlags);
                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ Iris:  %1 %2 ").arg(lValue).arg(Flags));
                pCameraControl->put_Iris(lValue, Flags);
            }
            break;
        case CameraControl_Focus:
            globalhr = pCameraControl->get_Focus(&oldValue, &tFlags);
            if(SUCCEEDED(globalhr))
            {
                if(lValue == -100086)
                    lValue = oldValue;

                pCameraControl->getRange_Focus(&Min, &Max, &Step, &Default, &tFlags);
                lValue += AdditonalValue;
                if(lValue > Max) lValue=Max;
                if(lValue < Min) lValue=Min;
                Logger::LogToServer(QString("================ Focus:  %1 %2 ").arg(lValue).arg(Flags));
                pCameraControl->put_Focus(lValue, Flags);
            }
            break;
        default:
            break;
        }
        return oldValue;
    }
};


#endif // CAMERA_HPP
