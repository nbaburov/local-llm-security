/* eslint-disable @typescript-eslint/no-explicit-any */
import { writeFileSync, existsSync, mkdirSync, statSync, renameSync } from "fs";
import { join } from "path";

export interface LogEvent {
	timestamp: string;
	level: "INFO" | "WARN" | "ERROR" | "DEBUG";
	service: string;
	endpoint?: string;
	userId?: string;
	userEmail?: string;
	sessionId?: string;
	ip?: string;
	userAgent?: string;
	method?: string;
	statusCode?: number;
	responseTime?: number;
	requestSize?: number;
	responseSize?: number;
	message: string;
	metadata?: Record<string, any>;
	error?: string;
}

export interface ChatLogEvent extends LogEvent {
	chatId?: string;
	messageCount?: number;
	model?: string;
	temperature?: number;
	tokens?: {
		prompt: number;
		completion: number;
		total: number;
	};
}

export interface AuthLogEvent extends LogEvent {
	action: "LOGIN" | "LOGOUT" | "LOGIN_FAILED" | "SIGNUP";
	provider?: string;
}

class Logger {
	private logDir: string;
	private maxFileSize: number = 50 * 1024 * 1024; // 50MB
	private maxFiles: number = 10;

	constructor() {
		this.logDir = join(process.cwd(), "logs");
		this.ensureLogDirectory();
	}

	private ensureLogDirectory(): void {
		if (!existsSync(this.logDir)) {
			mkdirSync(this.logDir, { recursive: true });
		}
	}

	private getLogFilePath(type: string): string {
		const date = new Date().toISOString().split("T")[0];
		return join(this.logDir, `${type}-${date}.jsonl`);
	}

	private rotateLogFile(filePath: string): void {
		if (!existsSync(filePath)) return;

		const stats = statSync(filePath);
		if (stats.size < this.maxFileSize) return;

		// Rotate files
		for (let i = this.maxFiles - 1; i > 0; i--) {
			const oldFile = `${filePath}.${i}`;
			const newFile = `${filePath}.${i + 1}`;
			if (existsSync(oldFile)) {
				renameSync(oldFile, newFile);
			}
		}

		renameSync(filePath, `${filePath}.1`);
	}

	private writeLog(type: string, logEvent: LogEvent): void {
		try {
			const filePath = this.getLogFilePath(type);
			this.rotateLogFile(filePath);

			const logLine = JSON.stringify(logEvent) + "\n";
			writeFileSync(filePath, logLine, { flag: "a" });

			// Update Prometheus metrics
			if (typeof window === "undefined") {
				// Only on server side
				try {
					// Use dynamic import to avoid circular dependencies
					import("./metrics")
						.then(({ metricsCollector }) => {
							metricsCollector.updatePrometheusMetrics(logEvent);
						})
						.catch(() => {
							// Ignore metrics update errors to prevent circular dependencies
						});
				} catch {
					// Ignore metrics update errors to prevent circular dependencies
				}
			}

			// Also log to console in development
			if (process.env.NODE_ENV === "development") {
				console.log(
					`[${logEvent.level}] ${logEvent.service}: ${logEvent.message}`
				);
			}
		} catch (error) {
			console.error("Failed to write log:", error);
		}
	}

	logApi(event: Partial<LogEvent>): void {
		const logEvent: LogEvent = {
			timestamp: new Date().toISOString(),
			level: "INFO",
			service: "api",
			message: `${event.method} ${event.endpoint}`,
			...event,
		};

		this.writeLog("api", logEvent);
	}

	logAuth(event: Partial<AuthLogEvent>): void {
		const logEvent: AuthLogEvent = {
			timestamp: new Date().toISOString(),
			level: "INFO",
			service: "auth",
			action: event.action || "LOGIN",
			message: `User ${event.action?.toLowerCase()} attempt`,
			...event,
		};

		this.writeLog("auth", logEvent);
	}

	logChat(event: Partial<ChatLogEvent>): void {
		const logEvent: ChatLogEvent = {
			timestamp: new Date().toISOString(),
			level: "INFO",
			service: "chat",
			message: `Chat interaction`,
			...event,
		};

		this.writeLog("chat", logEvent);
	}

	logError(
		service: string,
		error: Error | string,
		metadata?: Record<string, any>
	): void {
		const logEvent: LogEvent = {
			timestamp: new Date().toISOString(),
			level: "ERROR",
			service,
			message: error instanceof Error ? error.message : error,
			error: error instanceof Error ? error.stack : undefined,
			metadata,
		};

		this.writeLog("error", logEvent);
	}

	logInfo(
		service: string,
		message: string,
		metadata?: Record<string, any>
	): void {
		const logEvent: LogEvent = {
			timestamp: new Date().toISOString(),
			level: "INFO",
			service,
			message,
			metadata,
		};

		this.writeLog("general", logEvent);
	}
}

export const logger = new Logger();
