/**
 * 日志级别。
 */
export enum LogLevel {
	Debug = 0,
	Info = 1,
	Warn = 2,
	Error = 3,
	Silent = 4,
}

/**
 * 简单日志工具，支持级别过滤和前缀。
 */
export class Logger {
	private level: LogLevel;
	private readonly prefix: string;

	constructor(prefix: string = "Container", level: LogLevel = LogLevel.Info) {
		this.prefix = prefix;
		this.level = level;
	}

	/** 设置日志级别。 */
	setLevel(level: LogLevel): void {
		this.level = level;
	}

	/** 获取当前日志级别。 */
	getLevel(): LogLevel {
		return this.level;
	}

	/** 输出调试日志。 */
	debug(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Debug) {
			console.debug(`[${this.prefix}] ${message}`, ...args);
		}
	}

	/** 输出信息日志。 */
	info(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Info) {
			console.info(`[${this.prefix}] ${message}`, ...args);
		}
	}

	/** 输出警告日志。 */
	warn(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Warn) {
			console.warn(`[${this.prefix}] ${message}`, ...args);
		}
	}

	/** 输出错误日志。 */
	error(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Error) {
			console.error(`[${this.prefix}] ${message}`, ...args);
		}
	}
}
