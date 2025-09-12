#ifndef EXAMPLEPLUGIN_H
#define EXAMPLEPLUGIN_H

#include <Plugin.h>
#include <Action.h>
#include <QHash>
#include <QMutex>

class ExamplePlugin : public Plugin
{
public:
    ExamplePlugin();
    ~ExamplePlugin();
    virtual Action *GetOrCreateAction(const QString &action, const QString &context) override;
    virtual bool RemoveAction(const QString &action, const QString &context) override;

private:
    QMutex mVisibleContextsMutex;
    QHash<QString, Action *> mActions;
};

#endif // EXAMPLEPLUGIN_H
