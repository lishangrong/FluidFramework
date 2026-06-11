/**
 * 日志级别。
 */
export declare enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
    Silent = 4
}
/**
 * 简单日志工具，支持级别过滤和前缀。
 */
export declare class Logger {
    private level;
    private readonly prefix;
    constructor(prefix?: string, level?: LogLevel);
    /** 设置日志级别。 */
    setLevel(level: LogLevel): void;
    /** 获取当前日志级别。 */
    getLevel(): LogLevel;
    /** 输出调试日志。 */
    debug(message: string, ...args: unknown[]): void;
    /** 输出信息日志。 */
    info(message: string, ...args: unknown[]): void;
    /** 输出警告日志。 */
    warn(message: string, ...args: unknown[]): void;
    /** 输出错误日志。 */
    error(message: string, ...args: unknown[]): void;
}
//# sourceMappingURL=logger.d.ts.map