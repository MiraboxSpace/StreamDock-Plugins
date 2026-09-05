#include "SoundpadPlugin.h"
#include "LogManager.h"
#include <QMutexLocker>

SoundpadPlugin::SoundpadPlugin()
    : Plugin()
{
}

SoundpadPlugin::~SoundpadPlugin()
{
    QMutexLocker mMutexLocker(&mVisibleContextsMutex);

    QStringList keys = mActions.keys();
    for (qint32 i = 0; i < keys.size(); ++i) {
        delete mActions.value(keys[i]);
    }
}

Action *SoundpadPlugin::GetOrCreateAction(const QString &action, const QString &context)
{
    QMutexLocker mMutexLocker(&mVisibleContextsMutex);

    if (action == "com.hotspot.soundpadplay" ||
        action == "com.hotspot.soundpadplayrand" ||
        action == "com.hotspot.soundpadpause" ||
        action == "com.hotspot.soundpadremove" ||
        action == "com.hotspot.soundpadstop" ||
        action == "com.hotspot.soundpadrecordptt" ||
        action == "com.hotspot.soundpadloadsoundlist") {
        if (!mActions.contains(context)) {
            SoundpadAction *tmpAction = new SoundpadAction(mConnectionManager, action, context);
            mActions.insert(context, tmpAction);
        }
        return mActions.value(context);
    }

    if (LogManager::instance())
        LogManager::instance()->log(QString("Asked to get or create unknown action: ").append(action));
    return nullptr;
}

bool SoundpadPlugin::RemoveAction(const QString &action, const QString &context)
{
    QMutexLocker mMutexLocker(&mVisibleContextsMutex);

    if (action == "com.hotspot.soundpadplay" ||
        action == "com.hotspot.soundpadplayrand" ||
        action == "com.hotspot.soundpadpause" ||
        action == "com.hotspot.soundpadremove" ||
        action == "com.hotspot.soundpadstop" ||
        action == "com.hotspot.soundpadrecordptt" ||
        action == "com.hotspot.soundpadloadsoundlist") {
        if (mActions.contains(context)) {
            delete mActions.take(context);
            return true;
        } else {
            return false;
        }
    }

    if (LogManager::instance())
        LogManager::instance()->log(QString("Asked to remove unknown action: ").append(action));
    return false;
}
