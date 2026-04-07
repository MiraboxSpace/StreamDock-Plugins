import log4js from "log4js";
const now = new Date();
const log = log4js
    .configure({
        appenders: {
            file: {
                type: "file",
                filename: `./log/${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.log`,
                maxLogSize: 5 * 1024 * 1024, // 每个日志文件最大 5MB
                backups: 3,
            },
            console: { type: "console" },
        },
        categories: {
            default: { appenders: ["file", "console"], level: "info" },
        },
    })
    .getLogger();
process.on("uncaughtException", (error) => {
    log.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason) => {
    log.error("Unhandled Rejection:", reason);
});
log.info("start log");
export { log };
