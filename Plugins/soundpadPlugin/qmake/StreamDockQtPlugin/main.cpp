#include <QApplication>
#include <CustomMain.h>
#include "SoundpadPlugin.h"
#include "LogManager.h"

int main(int argc, const char **argv)
{
    QApplication a(argc, (char **)argv);

    LogManager::initialize(QApplication::applicationDirPath());

    SoundpadPlugin *myPlugin = new SoundpadPlugin();
    QObject::connect(&a, &QApplication::destroyed, [myPlugin](){
        delete myPlugin;
        delete LogManager::instance();
    });
    if (CustomMain(argc, argv, myPlugin)) {
        return 1;
    }

    return a.exec();
}
