#ifndef SOUNDPADPLUGIN_H
#define SOUNDPADPLUGIN_H

#include <Plugin.h>
#include <SoundpadAction.h>
#include <QHash>
#include <QMutex>

class SoundpadPlugin : public Plugin
{
public:
    SoundpadPlugin();
    ~SoundpadPlugin();
    virtual Action *GetOrCreateAction(const QString &action, const QString &context) override;
    virtual bool RemoveAction(const QString &action, const QString &context) override;

private:
    QMutex mVisibleContextsMutex;
    QHash<QString, SoundpadAction *> mActions;
};

#endif // SOUNDPADPLUGIN_H
