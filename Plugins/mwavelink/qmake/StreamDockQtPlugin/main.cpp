#include <QCoreApplication>
#include <CustomMain.h>
#include <QFile>
#include <QDir>
#include "ExamplePlugin.h"

int main(int argc, const char **argv)
{
    QCoreApplication a(argc, (char **)argv);

    if (!QFile::exists(QCoreApplication::applicationDirPath() + QDir::separator() + "config.ini")) {
        QFile file(QCoreApplication::applicationDirPath() + QDir::separator() + "config.ini");
        if (file.open(QIODevice::WriteOnly))
            file.close();
    }


    ExamplePlugin *myPlugin = new ExamplePlugin();
    QObject::connect(&a, &QCoreApplication::destroyed, [myPlugin](){
        delete myPlugin;
    });
    if (CustomMain(argc, argv, myPlugin)) {
        return 1;
    }

    return a.exec();
}
