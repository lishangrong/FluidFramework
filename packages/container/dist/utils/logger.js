/**
 * 日志级别。
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Debug"] = 0] = "Debug";
    LogLevel[LogLevel["Info"] = 1] = "Info";
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    LogLevel[LogLevel["Error"] = 3] = "Error";
    LogLevel[LogLevel["Silent"] = 4] = "Silent";
})(LogLevel || (LogLevel = {}));
/**
 * 简单日志工具，支持级别过滤和前缀。
 */
export class Logger {
    level;
    prefix;
    constructor(prefix = "Container", level = LogLevel.Info) {
        this.prefix = prefix;
        this.level = level;
    }
    /** 设置日志级别。 */
    setLevel(level) {
        this.level = level;
    }
    /** 获取当前日志级别。 */
    getLevel() {
        return this.level;
    }
    /** 输出调试日志。 */
    debug(message, ...args) {
        if (this.level <= LogLevel.Debug) {
            console.debug(`[${this.prefix}] ${message}`, ...args);
        }
    }
    /** 输出信息日志。 */
    info(message, ...args) {
        if (this.level <= LogLevel.Info) {
            console.info(`[${this.prefix}] ${message}`, ...args);
        }
    }
    /** 输出警告日志。 */
    warn(message, ...args) {
        if (this.level <= LogLevel.Warn) {
            console.warn(`[${this.prefix}] ${message}`, ...args);
        }
    }
    /** 输出错误日志。 */
    error(message, ...args) {
        if (this.level <= LogLevel.Error) {
            console.error(`[${this.prefix}] ${message}`, ...args);
        }
    }
}
//# sourceMappingURL=logger.js.map