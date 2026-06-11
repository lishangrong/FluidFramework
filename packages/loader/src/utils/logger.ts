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
 * 简易日志器。包装 console 并支持日志级别过滤。
 */
export class Logger {
	private level: LogLevel;
	private readonly prefix: string;

	constructor(prefix: string, level: LogLevel = LogLevel.Info) {
		this.prefix = prefix;
		this.level = level;
	}

	setLevel(level: LogLevel): void {
		this.level = level;
	}

	debug(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Debug) {
			console.debug(`[${this.prefix}] ${message}`, ...args);
		}
	}

	info(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Info) {
			console.info(`[${this.prefix}] ${message}`, ...args);
		}
	}

	warn(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Warn) {
			console.warn(`[${this.prefix}] ${message}`, ...args);
		}
	}

	error(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.Error) {
			console.error(`[${this.prefix}] ${message}`, ...args);
		}
	}
}
