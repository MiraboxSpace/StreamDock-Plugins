#include "SoundpadAction.h"
#include "LogManager.h"
#include <QJsonDocument>

#include <qDebug>
#include <QString>
#include <conio.h>
#include <QDomDocument>
#include <QJsonArray>
#include <QFile>
#include <QFileInfo>
#include <QPainter>
#include <QImage>
#include <QFont>
#include <QBuffer>
#include <QApplication>

SoundpadAction::SoundpadAction(ConnectionManager *connection, const QString &action, const QString &context)
    : Action{connection, action, context}
{
    this->action = action;
}

SoundpadAction::~SoundpadAction()
{
    ClosePipeHandle();
    if(workThread.joinable())
        workThread.join();
}

void SoundpadAction::DidReceiveSettings(const QJsonObject &payload)
{
    if (LogManager::instance())
        LogManager::instance()->log(QString("DidReceiveSettings %1").arg(QString::fromUtf8(QJsonDocument(payload).toJson(QJsonDocument::Compact))));

    if (this->action == "com.hotspot.soundpadplay") {
        QJsonObject settings = payload["settings"].toObject();
        UpdateButtonImage(settings);
    }
}

void SoundpadAction::KeyDown(const QJsonObject &payload)
{
    if (LogManager::instance())
        LogManager::instance()->log("KeyDown");

    QJsonObject settings = payload["settings"].toObject();
    QString categorySelect = settings.contains("CategorySelect")
                                 ? settings["CategorySelect"].toString()
                                 : "default_category";
    QString soundSelect = settings.contains("SoundSelect")
                              ? settings["SoundSelect"].toString()
                              : "default_sound";
    QString soundIndexInput = settings.contains("SoundIndexInput")
                                  ? settings["SoundIndexInput"].toString()
                                  : "0";
    bool PTPModeCheck = settings.contains("PTPModeCheck")
                                  ? settings["PTPModeCheck"].toBool()
                                  : false;
    QString FilePathTextarea = settings.contains("FilePathTextarea")
                            ? settings["FilePathTextarea"].toString()
                            : "";

    if(this->action == "com.hotspot.soundpadplay")
    {
        int index = soundIndexInput.toInt();
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            if(PTPModeCheck)
            {
                // 线程执行
                if(workThread.joinable())
                    workThread.join();
                workThread = std::thread([this, index](){
                    if (LogManager::instance())
                        LogManager::instance()->log(QString("===========thread com.hotspot.soundpadplay: %1").arg(index));
                    ExecuteCommand(hPipe, QString("DoPlaySound(%1)").arg(index).toStdString());
                });
            }else
            {
                if (LogManager::instance())
                    LogManager::instance()->log(QString("===========sync com.hotspot.soundpadplay: %1").arg(index));
                ExecuteCommand(hPipe, QString("DoPlaySound(%1)").arg(index).toStdString());
            }
        }
    }else if(this->action == "com.hotspot.soundpadplayrand")
    {
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            QJsonArray categories = ExecuteCommand(hPipe, "GetCategories(true, false)").value("categories").toArray();
            int targetIndex = -1;
            for (int i = 0; i < categories.size(); ++i)
            {
                if (categories[i].toString() == categorySelect)
                {
                    targetIndex = i+2;
                    break;
                }
            }
            if (LogManager::instance())
                LogManager::instance()->log(QString("===========com.hotspot.soundpadplayrand: %1").arg(categorySelect));
            ExecuteCommand(hPipe, QString("DoPlayRandomSoundFromCategory(%1, true, true)").arg(targetIndex).toStdString());
        }
    }else if(this->action == "com.hotspot.soundpadpause")
    {
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            QString Invalid = ExecuteCommand(hPipe, "GetPlayStatus()").value("Invalid").toString();
            if(Invalid == "PAUSED" || Invalid == "PLAYING")
            {
                if (LogManager::instance())
                    LogManager::instance()->log(QString("===========com.hotspot.soundpadpause DoTogglePause"));
                ExecuteCommand(hPipe, "DoTogglePause()");
            }
        }
    }else if(this->action == "com.hotspot.soundpadremove")
    {
        int index = soundIndexInput.toInt();
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            if (LogManager::instance())
                LogManager::instance()->log(QString("===========com.hotspot.soundpadremove %1").arg(index));
            ExecuteCommand(hPipe, QString("DoSelectIndex(%1)").arg(index).toStdString());
            ExecuteCommand(hPipe, QString("DoRemoveSelectedEntries(%1)").arg(false).toStdString());
        }
    }else if(this->action == "com.hotspot.soundpadstop")
    {
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            if (LogManager::instance())
                LogManager::instance()->log(QString("===========com.hotspot.soundpadstop"));
            ExecuteCommand(hPipe, "DoStopSound()");
        }
    }else if(this->action == "com.hotspot.soundpadrecordptt")
    {
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            if (LogManager::instance())
                LogManager::instance()->log(QString("===========com.hotspot.soundpadrecordptt"));
            ExecuteCommand(hPipe, "DoStartRecording()");
        }
    }else if(this->action == "com.hotspot.soundpadloadsoundlist")
    {
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            if (LogManager::instance())
                LogManager::instance()->log(QString("===========com.hotspot.soundpadloadsoundlist"));
            if(!FilePathTextarea.isEmpty())
            {
                QList<SplStruct> spls;
                QList<QString> allSoundUrls;
                int currentIndex = 0;

                QFileInfo fileInfo(FilePathTextarea);
                ParseXMLFile(FilePathTextarea, spls, allSoundUrls, fileInfo.path());

                for (const auto &spl: spls)
                {
                    ExecuteCommand(hPipe, QString("DoAddCategory(%1, %2)")
                                              .arg(spl.category)
                                              .arg(spl.parentid).toStdString());
                    std::this_thread::sleep_for(std::chrono::microseconds(20));
                    for (int j = 0; j < spl.size; ++j)
                    {
                        ExecuteCommand(hPipe, QString("DoAddSound(%1, %2, %3)")
                                                  .arg(allSoundUrls[currentIndex++])
                                                  .arg(spl.id)
                                                  .arg(j).toStdString());
                        std::this_thread::sleep_for(std::chrono::microseconds(20));
                    }
                }
            }
        }
    }
}

void SoundpadAction::KeyUp(const QJsonObject &payload)
{
    if (LogManager::instance())
        LogManager::instance()->log("KeyUp");
    if(this->action == "com.hotspot.soundpadplay")
    {
        // 马上停止
        QJsonObject settings = payload["settings"].toObject();
        bool PTPModeCheck = settings.contains("PTPModeCheck")
                                ? settings["PTPModeCheck"].toBool()
                                : false;
        if(PTPModeCheck)
        {
            ExecuteCommand(hPipe, "DoStopSound()");
            if(workThread.joinable())
                workThread.join();
        }
    }else if(this->action == "com.hotspot.soundpadrecordptt")
    {
        ExecuteCommand(hPipe, "DoStopRecording()");
    }
}

void SoundpadAction::WillAppear(const QJsonObject &payload)
{
    try {
        if (LogManager::instance())
            LogManager::instance()->log("WillAppear");

        if (this->action == "com.hotspot.soundpadplay") {
            QJsonObject settings = payload["settings"].toObject();
            UpdateButtonImage(settings);
        }
    } catch (...) {
        if (LogManager::instance()) {
            LogManager::instance()->logAndFlush("WillAppear: ERROR - exception caught (SEH or C++)");
        }
    }
}

void SoundpadAction::WillDisappear(const QJsonObject &payload)
{
    if (LogManager::instance())
        LogManager::instance()->log("WillDisappear");
}

void SoundpadAction::SendToPlugin(const QJsonObject &payload)
{
    QString payloadString = QJsonDocument(payload).toJson(QJsonDocument::Compact);
    if (LogManager::instance())
        LogManager::instance()->log(QString("SendToPlugin: %1").arg(payloadString));

    bool refresh = payload.contains("refresh")
                                 ? payload["refresh"].toBool()
                                 : false;
    if(refresh)
    {
        try {
            // 刷新一次sounds给属性检查器
            hPipe = FindAndConnectPipe();
            if(INVALID_HANDLE_VALUE != hPipe)
            {
                QJsonObject sendJson;
                sendJson["CategoryAndSounds"] = ExecuteCommand(hPipe, "GetCategories(true, false)");
                if (LogManager::instance())
                    LogManager::instance()->log(QJsonDocument(sendJson).toJson(QJsonDocument::Compact));
                this->SendToPropertyInspector(sendJson);
            }
        } catch (...) {
            if (LogManager::instance())
                LogManager::instance()->log("SendToPlugin refresh: ERROR - exception while refreshing sounds");
        }
    }
}

void SoundpadAction::PropertyInspectorDidAppear(const QJsonObject &payload)
{
    try {
        QString payloadString = QJsonDocument(payload).toJson(QJsonDocument::Compact);
        if (LogManager::instance())
            LogManager::instance()->log(QString("PropertyInspectorDidAppear: %1").arg(payloadString));

        if (LogManager::instance())
            LogManager::instance()->log("PropertyInspectorDidAppear: connecting to pipe...");
        hPipe = FindAndConnectPipe();
        if(INVALID_HANDLE_VALUE != hPipe)
        {
            if (LogManager::instance())
                LogManager::instance()->log("PropertyInspectorDidAppear: pipe connected, fetching categories...");
            QJsonObject sendJson;
            sendJson["CategoryAndSounds"] = ExecuteCommand(hPipe, "GetCategories(true, false)");
            if (LogManager::instance())
                LogManager::instance()->log(QJsonDocument(sendJson).toJson(QJsonDocument::Compact));
            this->SendToPropertyInspector(sendJson);
            if (LogManager::instance())
                LogManager::instance()->log("PropertyInspectorDidAppear: categories sent to PI");
        } else {
            if (LogManager::instance())
                LogManager::instance()->log("PropertyInspectorDidAppear: ERROR - failed to connect to pipe");
        }
    } catch (...) {
        if (LogManager::instance())
            LogManager::instance()->log("PropertyInspectorDidAppear: ERROR - exception in handler");
    }
}
void SoundpadAction::UpdateButtonImage(const QJsonObject &settings)
{
    try {
        if (this->action != "com.hotspot.soundpadplay")
            return;
        if (settings.isEmpty()) {
            LogManager::instance()->log("UpdateButtonImage: empty settings, skipping");
            return;
        }
        LogManager::instance()->log("UpdateButtonImage start.......");
        bool showTitleCheck = settings.contains("ShowTitleCheck")
                                  ? settings["ShowTitleCheck"].toBool()
                                  : false;

        // Resolve image path
        QString appDir = QApplication::applicationDirPath();
        QString imagePath = appDir + "/Images/sound.png";

        QImage baseImage(imagePath);
        if (baseImage.isNull()) {
            if (LogManager::instance())
                LogManager::instance()->log(QString("UpdateButtonImage: Failed to load image from %1").arg(imagePath));
            return;
        }

        // 转换为 ARGB32 确保 QPainter 兼容
        baseImage = baseImage.convertToFormat(QImage::Format_ARGB32);

        if (showTitleCheck) {
            QString titleText = settings.contains("SoundSelect")
            ? settings["SoundSelect"].toString()
            : settings.contains("SoundIndexInput")
                ? settings["SoundIndexInput"].toString()
                : "";

            if (!titleText.isEmpty()) {
                try {
                QPainter painter(&baseImage);
                if (!painter.isActive()) {
                    if (LogManager::instance())
                        LogManager::instance()->log("UpdateButtonImage: painter failed to start");
                    return;
                }
                // Dark semi-transparent bar at bottom (matching JS: rgba(0,0,0,0.55))
                painter.fillRect(0, baseImage.height() - 18, baseImage.width(), 18, QColor(0, 0, 0, 140));
                // White title text (matching JS: bold 11px Arial, center aligned)
                QFont font("Arial", 11, QFont::Bold);
                painter.setFont(font);
                painter.setPen(Qt::white);
                int padding = 4;
                painter.drawText(QRect(padding, baseImage.height() - 18,
                                       baseImage.width() - padding * 2, 18),
                                 Qt::AlignCenter, titleText);
                painter.end();
                } catch (...) {
                    if (LogManager::instance()) {
                        LogManager::instance()->logAndFlush("UpdateButtonImage: ERROR - exception in QPainter");
                    }
                    return;
                }
            }
        }

        QByteArray byteArray;
        QBuffer buffer(&byteArray);
        buffer.open(QIODevice::WriteOnly);
        baseImage.save(&buffer, "PNG", 90);
        buffer.close();

        if (byteArray.isEmpty()) {
            if (LogManager::instance())
                LogManager::instance()->log("UpdateButtonImage: Failed to encode image to PNG");
            return;
        }

        QString base64 = QString::fromLatin1(byteArray.toBase64());
        SetImage(base64);

        if (LogManager::instance())
            LogManager::instance()->log(QString("UpdateButtonImage: Set image showTitle=%1 title=%2")
                                            .arg(showTitleCheck)
                                            .arg(settings.contains("SoundSelect") ? settings["SoundSelect"].toString() : "none"));
    } catch (...) {
        if (LogManager::instance())
            LogManager::instance()->logAndFlush("UpdateButtonImage: ERROR - exception caught");
    }

}

void SoundpadAction::ClosePipeHandle()
{
    try {
        if (this->hPipe != INVALID_HANDLE_VALUE) {
            if (LogManager::instance())
                LogManager::instance()->log(QString("ClosePipeHandle: closing handle"));
            CloseHandle(this->hPipe);
            this->hPipe = INVALID_HANDLE_VALUE;
            if (LogManager::instance())
                LogManager::instance()->log("ClosePipeHandle: handle closed successfully");
        }
    } catch (...) {
        if (LogManager::instance())
            LogManager::instance()->log("ClosePipeHandle: ERROR - exception while closing pipe handle");
    }
}

void SoundpadAction::PropertyInspectorDidDisappear(const QJsonObject &payload)
{
    try {
        if (LogManager::instance())
            LogManager::instance()->log("PropertyInspectorDidDisappear");
        ClosePipeHandle();
    } catch (...) {
        if (LogManager::instance())
            LogManager::instance()->log("PropertyInspectorDidDisappear: ERROR - exception in handler");
    }
}

#include <windows.h>
#include <psapi.h>
#include <string>
#include <stdio.h>
#include <stdlib.h>
#include <QFileInfo>
#include <QDir>
#pragma comment(lib, "psapi.lib")
bool seekProcessFileNameEx(std::wstring baseName)
{
    DWORD processList[1024], processCount;

    if (!EnumProcesses(processList, sizeof(processList), &processCount)) {
        if (LogManager::instance())
            LogManager::instance()->log("Failed to enumerate processes.");
        return false;
    }

    processCount /= sizeof(DWORD);
    for (DWORD i = 0; i < processCount; ++i) {
        DWORD processID = processList[i];
        if (processID == 0) continue;

        HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS | PROCESS_QUERY_INFORMATION, FALSE, processID);
        if (hProcess == NULL) continue;

        TCHAR processNameBuffer[MAX_PATH];
        if (GetModuleBaseName(hProcess, NULL, processNameBuffer, sizeof(processNameBuffer) / sizeof(TCHAR))) {
            if (baseName == processNameBuffer) {
                if (LogManager::instance())
                    LogManager::instance()->log(QString("process is running: %1").arg(baseName));
                CloseHandle(hProcess);
                return true;
            }
        }
        CloseHandle(hProcess);
    }
    if (LogManager::instance())
        LogManager::instance()->log("Process not found.");
    return false;
}

HANDLE SoundpadAction::FindAndConnectPipe()
{
    try {
        HANDLE hPipe;
        LPCWSTR lpszPipename = L"\\\\.\\pipe\\sp_remote_control";

        // 尝试打开命名管道
        while (1) {
            if(seekProcessFileNameEx(L"Soundpad.exe")) {
                // Close stale handle before resetting (prevent handle leak)
                if (this->hPipe != INVALID_HANDLE_VALUE) {
                    if (LogManager::instance())
                        LogManager::instance()->log(QString("FindAndConnectPipe: closing stale handle before reconnect"));
                    CloseHandle(this->hPipe);
                }
                this->hPipe = INVALID_HANDLE_VALUE;
            }

            if(this->hPipe != INVALID_HANDLE_VALUE)
                return this->hPipe;

            hPipe = CreateFile(
                lpszPipename,
                GENERIC_READ | GENERIC_WRITE,
                0,
                NULL,
                OPEN_EXISTING,
                0,
                NULL);

            if (hPipe != INVALID_HANDLE_VALUE) {
                BOOL   fSuccess = FALSE;
                DWORD dwMode;
                dwMode = PIPE_READMODE_MESSAGE;
                fSuccess = SetNamedPipeHandleState(
                    hPipe,
                    &dwMode,
                    NULL,
                    NULL);
                // 设置管道为消息读取模式
                if (!fSuccess) {
                    if (LogManager::instance())
                        LogManager::instance()->log(QString("SetNamedPipeHandleState failed. GLE=%1").arg(GetLastError()));
                }
                if (LogManager::instance())
                    LogManager::instance()->log(QString("FindAndConnectPipe: connected successfully"));
                return hPipe;
            }
            if (GetLastError() != ERROR_PIPE_BUSY) {
                if (LogManager::instance())
                    LogManager::instance()->log(QString("Could not open pipe. GLE=%1").arg(GetLastError()));
                return INVALID_HANDLE_VALUE;
            }

            if (!WaitNamedPipe(lpszPipename, 5000)) {
                if (LogManager::instance())
                    LogManager::instance()->log("Could not open pipe: 5 second wait timed out.");
                return INVALID_HANDLE_VALUE;
            }
        }
    } catch (...) {
        if (LogManager::instance())
            LogManager::instance()->log("FindAndConnectPipe: ERROR - exception while connecting to pipe");
        return INVALID_HANDLE_VALUE;
    }
}

QJsonObject  SoundpadAction::ExecuteCommand(HANDLE hPipe, const std::string& cmd)
{
    try {
        const char* lpvMessage = cmd.c_str();
        const int BUFSIZE = 4096;
        char chBuf[BUFSIZE];
        BOOL   fSuccess = FALSE;
        DWORD  cbRead, cbToWrite, cbWritten;

        // 发送命令
        cbToWrite = (DWORD)strlen(lpvMessage);
        if (LogManager::instance())
            LogManager::instance()->log(QString("Sending %1 byte message: %2").arg(cbToWrite).arg(lpvMessage));

        fSuccess = WriteFile(
            hPipe,
            lpvMessage,
            cbToWrite,
            &cbWritten,
            NULL);

        if (!fSuccess) {
            if (LogManager::instance())
                LogManager::instance()->log(QString("WriteFile to pipe failed. GLE=%1").arg(GetLastError()));
            return QJsonObject ();
        }

        // 读取响应
        QByteArray responseData;
        do {
            fSuccess = ReadFile(
                hPipe,
                chBuf,
                BUFSIZE,
                &cbRead,
                NULL);

            if (!fSuccess && GetLastError() != ERROR_MORE_DATA) break;
            responseData.append(chBuf, cbRead);
        } while (!fSuccess);

        QJsonObject  resultJson;
        if(!responseData.isEmpty())
        {
            // 解析XML响应
            QString response = QString::fromUtf8(responseData);
            QDomDocument doc;
            if (doc.setContent(response)) {
                QDomElement root = doc.documentElement();

                // 获取分类和声音
                QDomNodeList categoryNodes = root.elementsByTagName("Category");
                QJsonArray categoriesArray;
                QJsonArray soundsArray;
                QJsonArray indexArray;

                for (int i = 0; i < categoryNodes.count(); ++i) {
                    QDomElement category = categoryNodes.at(i).toElement();

                    QString hidden = category.attribute("hidden", "false");
                    if(hidden == "false")
                    {
                        QString categoryName = category.attribute("name");
                        categoriesArray.append(categoryName);
                        QString index = category.attribute("index");
                        indexArray.append(index);

                        QDomNodeList soundNodes = category.elementsByTagName("Sound");
                        for (int j = 0; j < soundNodes.count(); ++j) {
                            QDomElement sound = soundNodes.at(j).toElement();
                            QJsonObject soundObj;
                            soundObj["name"] = sound.attribute("title");
                            soundObj["index"] = sound.attribute("index").toInt();
                            soundObj["category"] = categoryName;
                            soundsArray.append(soundObj);
                        }
                    }
                }
                resultJson["categories"] = categoriesArray;
                resultJson["sounds"] = soundsArray;
                resultJson["indexs"] = indexArray;
                if (LogManager::instance())
                    LogManager::instance()->log(QString("ExecuteCommand: parsed %1 categories, %2 sounds")
                        .arg(categoriesArray.size())
                        .arg(soundsArray.size()));
            } else {
                if (LogManager::instance())
                    LogManager::instance()->log(QString("Invalid XML response: %1").arg(response));
                resultJson["Invalid"] = response;
            }
        } else {
            if (LogManager::instance())
                LogManager::instance()->log("ExecuteCommand: empty response from pipe");
        }

        return resultJson;
    } catch (...) {
        if (LogManager::instance())
            LogManager::instance()->log(QString("ExecuteCommand: ERROR - exception executing command: %1")
                .arg(QString::fromStdString(cmd)));
        return QJsonObject();
    }
}

void printSplToString(const SplStruct& spl)
{
    QString str;
    QTextStream stream(&str);
    stream << "SplStruct{"
           << "id=" << spl.id << ", "
           << "parentid=" << spl.parentid << ", "
           << "category=" << spl.category << ", "
           << "size=" << spl.size
           << "}";
    if (LogManager::instance())
        LogManager::instance()->log(str);
}
int countDirectSounds(const QDomElement& categoryElement) {
    int count = 0;
    QDomNodeList childNodes = categoryElement.childNodes();
    for(int i = 0; i < childNodes.count(); i++) {
        QDomNode node = childNodes.at(i);
        if(node.isElement() && node.nodeName() == "Sound")
            count++;
    }
    return count;
}
void parseCategories(const QDomElement& parentElement,
                     QList<SplStruct>& spls,
                     int parentId = -1,
                     const QString& parentName = "")
{
    QDomNodeList childNodes = parentElement.childNodes();
    for(int i = 0; i < childNodes.count(); i++) {
        QDomNode node = childNodes.at(i);
        if(!node.isElement() || node.nodeName() != "Category")
            continue;

        QDomElement categoryElement = node.toElement();
        if(categoryElement.isNull() || categoryElement.attribute("hidden") == "true")
            continue;

        // 创建当前分类
        SplStruct spl;
        spl.id = spls.size()+2;
        spl.parentid = parentId;
        spl.category = categoryElement.attribute("name");
        spl.size = countDirectSounds(categoryElement);

        spls.append(spl);
        printSplToString(spl);

        parseCategories(categoryElement, spls, spl.id, spl.category);
    }
}


bool SoundpadAction::ParseXMLFile(QString filepath, QList<SplStruct> &spls, QList<QString> &allSoundUrls, QString basePath)
{
    QFile file(filepath);
    if(!file.open(QFile::ReadOnly | QFile::Text))
    {
        qDebug() << (QString("Failed to open file: %1").arg(filepath));
        return false;
    }
    QDomDocument doc;
    if(!doc.setContent(&file))
    {
        qDebug() << (QString("Failed to parse the file: %1").arg(filepath));
        return false;
    }
    file.close();

    // 开始解析
    QDomElement root = doc.documentElement();
    if(root.isNull() || root.tagName() != "Soundlist")
    {
        qDebug() << ("Invalid XML format: Root element is not Soundlist");
        return false;
    }

    QDomNodeList soundNodes = root.elementsByTagName("Sound");
    for(int i = 0; i < soundNodes.count(); i++)
    {
        QDomElement soundElement = soundNodes.at(i).toElement();
        if(!soundElement.isNull())
        {
            QString path = QDir::toNativeSeparators(basePath + QDir::separator() + soundElement.attribute("url"));
            allSoundUrls.append(path);
            if (LogManager::instance())
                LogManager::instance()->log(QString("path +======= %1").arg(path));
        }
    }
    QDomElement categoriesElement = root.firstChildElement("Categories");
    if(categoriesElement.isNull())
    {
        return false;
    }
    parseCategories(categoriesElement, spls);
    return true;
}
