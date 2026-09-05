/**
 * Minimal reproduction test for the WillAppear crash when ShowTitle is checked.
 *
 * This test mimics the exact QPainter + QFont + QImage sequence used in
 * SoundpadAction::UpdateButtonImage(), calling it 5 times in a loop to
 * detect whether QCoreApplication + repeated QPainter::drawText() causes
 * an SEH access violation.
 *
 * BUILD (from qmake/StreamDockQtPlugin/):
 *   cl /EHsc /std:c++17 /I<Qt include> test_qpainter_crash.cpp /link /LIBPATH:<Qt lib> Qt5Core.lib Qt5Gui.lib
 *
 * Or simpler — add this file temporarily to SoundpadPlugin.pro SOURCES:
 *   SOURCES += ... test_qpainter_crash.cpp
 *
 * TEST WITH QCoreApplication → expected crash on 2nd or 3rd iteration
 * TEST WITH QApplication   → should work all 5 iterations
 */

#ifdef USE_QAPPLICATION
#include <QGuiApplication>   // TEST B: the fix — use QGuiApplication (sufficient for QPainter+QFont)
#else
#include <QCoreApplication> // TEST A: current code — expected to crash
#endif
#include <QImage>
#include <QPainter>
#include <QFont>
#include <QBuffer>
#include <QFileInfo>
#include <QDebug>
#include <QString>

#include <cstdio>
#include <windows.h>

int main(int argc, char **argv)
{
    // ============================================================
    // TEST A: QCoreApplication (current code — expected to crash)
    // TEST B: QApplication (fix — expected to work)
    // Toggle via: DEFINES += USE_QAPPLICATION in the .pro file
    // ============================================================
#ifdef USE_QAPPLICATION
    QGuiApplication app(argc, argv);
    fprintf(stdout, "=== TEST B: Using QGuiApplication (expected: PASS) ===\n");
#else
    QCoreApplication app(argc, argv);
    fprintf(stdout, "=== TEST A: Using QCoreApplication (expected: CRASH on 2nd iteration) ===\n");
#endif

    // Resolve the image path (same logic as UpdateButtonImage)
    QString appDir = QCoreApplication::applicationDirPath();
    QString imagePath = appDir + "/Images/sound.png";

    // Try alternate path if not found (exe might be in debug/ subfolder)
    if (!QFileInfo::exists(imagePath)) {
        imagePath = appDir + "/../Images/sound.png";
    }
    if (!QFileInfo::exists(imagePath)) {
        imagePath = appDir + "/../../Images/sound.png";
    }

    qDebug() << "Using image path:" << imagePath;
    qDebug() << "File exists:" << QFileInfo::exists(imagePath);

    if (!QFileInfo::exists(imagePath)) {
        fprintf(stderr, "ERROR: sound.png not found at %s\n",
                imagePath.toUtf8().constData());
        fprintf(stderr, "Copy sound.png to the same directory as this test exe, "
                        "or run from the plugin directory.\n");
        return 1;
    }

    const int ITERATIONS = 5;
    const QString titleText = "Test Sound Name";

    fprintf(stdout, "=== Starting QPainter stress test: %d iterations ===\n", ITERATIONS);

    for (int i = 0; i < ITERATIONS; ++i) {
        fprintf(stdout, "\n--- Iteration %d ---\n", i + 1);

        // STEP 1: Load image (identical to UpdateButtonImage)
        fprintf(stdout, "  [1/5] Loading image...\n");
        QImage baseImage(imagePath);
        if (baseImage.isNull()) {
            fprintf(stderr, "  FAILED: QImage is null\n");
            return 2;
        }
        fprintf(stdout, "  OK: loaded %dx%d, format=%d\n",
                baseImage.width(), baseImage.height(), (int)baseImage.format());

        // STEP 2: Convert to ARGB32 (identical to UpdateButtonImage)
        fprintf(stdout, "  [2/5] Converting to ARGB32...\n");
        baseImage = baseImage.convertToFormat(QImage::Format_ARGB32);
        if (baseImage.isNull()) {
            fprintf(stderr, "  FAILED: convertToFormat returned null\n");
            return 3;
        }
        fprintf(stdout, "  OK: %dx%d, format=%d\n",
                baseImage.width(), baseImage.height(), (int)baseImage.format());

        // STEP 3: QPainter - fillRect (identical to UpdateButtonImage)
        fprintf(stdout, "  [3/5] Creating QPainter...\n");
        QPainter painter(&baseImage);
        if (!painter.isActive()) {
            fprintf(stderr, "  FAILED: QPainter is not active\n");
            return 4;
        }
        fprintf(stdout, "  OK: painter active\n");

        painter.fillRect(0, baseImage.height() - 18, baseImage.width(), 18,
                         QColor(0, 0, 0, 140));
        fprintf(stdout, "  OK: fillRect done\n");

        // STEP 4: QFont + drawText (identical to UpdateButtonImage)
        // THIS IS THE LIKELY CRASH POINT on 2nd iteration with QCoreApplication
        fprintf(stdout, "  [4/5] Setting font and drawing text...\n");
        fflush(stdout); // Force flush before possible crash

        QFont font("Arial", 11, QFont::Bold);
        painter.setFont(font);
        painter.setPen(Qt::white);
        int padding = 4;
        painter.drawText(QRect(padding, baseImage.height() - 18,
                               baseImage.width() - padding * 2, 18),
                         Qt::AlignCenter, titleText);
        painter.end();

        fprintf(stdout, "  OK: drawText done\n");

        // STEP 5: Save to PNG (identical to UpdateButtonImage)
        fprintf(stdout, "  [5/5] Saving to PNG buffer...\n");
        QByteArray byteArray;
        QBuffer buffer(&byteArray);
        buffer.open(QIODevice::WriteOnly);
        bool saved = baseImage.save(&buffer, "PNG", 90);
        buffer.close();

        if (!saved || byteArray.isEmpty()) {
            fprintf(stderr, "  FAILED: save returned empty/false (saved=%d, size=%d)\n",
                    (int)saved, (int)byteArray.size());
            return 5;
        }

        QString base64 = QString::fromLatin1(byteArray.toBase64());
        fprintf(stdout, "  OK: saved %d bytes → base64 length=%d\n",
                (int)byteArray.size(), (int)base64.length());
    }

    fprintf(stdout, "\n=== ALL %d ITERATIONS PASSED ===\n", ITERATIONS);
    fprintf(stdout, "If you see this message, the bug is FIXED.\n");
    fprintf(stdout, "If the program crashed silently before this, the bug is REPRODUCED.\n");

    return 0;
}
