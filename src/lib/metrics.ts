import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { LogEvent, AuthLogEvent, ChatLogEvent } from "./logger";

export interface ApiMetrics {
	totalRequests: number;
	requestsByEndpoint: Record<string, number>;
	requestsByMethod: Record<string, number>;
	statusCodes: Record<string, number>;
	averageResponseTime: number;
	errorRate: number;
	requestsByHour: Record<string, number>;
	uniqueUsers: number;
	authenticatedRequests: number;
}

export interface AuthMetrics {
	totalLogins: number;
	loginsByProvider: Record<string, number>;
	failedLogins: number;
	uniqueUsers: Set<string>;
	loginsByHour: Record<string, number>;
	averageSessionsPerUser: number;
}

export interface ChatMetrics {
	totalChats: number;
	chatsByModel: Record<string, number>;
	averageTokensPerChat: number;
	totalTokens: number;
	chatsByHour: Record<string, number>;
	uniqueChatUsers: number;
	averageResponseTime: number;
}

export interface SystemMetrics {
	api: ApiMetrics;
	auth: AuthMetrics;
	chat: ChatMetrics;
	timeRange: {
		start: string;
		end: string;
	};
}

class MetricsCollector {
	private logDir: string;

	constructor() {
		this.logDir = join(process.cwd(), "logs");
	}

	private readLogFiles(type: string, days: number = 7): LogEvent[] {
		const logs: LogEvent[] = [];
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		if (!existsSync(this.logDir)) {
			return logs;
		}

		const files = readdirSync(this.logDir)
			.filter(
				(file) => file.startsWith(`${type}-`) && file.endsWith(".jsonl")
			)
			.sort()
			.reverse()
			.slice(0, days);

		for (const file of files) {
			try {
				const content = readFileSync(join(this.logDir, file), "utf-8");
				const lines = content
					.trim()
					.split("\n")
					.filter((line) => line.trim());

				for (const line of lines) {
					try {
						const log = JSON.parse(line) as LogEvent;
						if (new Date(log.timestamp) >= cutoffDate) {
							logs.push(log);
						}
					} catch {
						console.warn(`Failed to parse log line: ${line}`);
					}
				}
			} catch (error) {
				console.warn(`Failed to read log file ${file}:`, error);
			}
		}

		return logs;
	}

	private getHourKey(timestamp: string): string {
		return new Date(timestamp).toISOString().slice(0, 13);
	}

	private calculateApiMetrics(logs: LogEvent[]): ApiMetrics {
		const requestsByEndpoint: Record<string, number> = {};
		const requestsByMethod: Record<string, number> = {};
		const statusCodes: Record<string, number> = {};
		const requestsByHour: Record<string, number> = {};
		const userEmails = new Set<string>();

		let totalResponseTime = 0;
		let responseTimeCount = 0;
		let errorCount = 0;
		let authenticatedCount = 0;

		for (const log of logs) {
			// Count requests by endpoint
			if (log.endpoint) {
				requestsByEndpoint[log.endpoint] =
					(requestsByEndpoint[log.endpoint] || 0) + 1;
			}

			// Count requests by method
			if (log.method) {
				requestsByMethod[log.method] =
					(requestsByMethod[log.method] || 0) + 1;
			}

			// Count status codes
			if (log.statusCode) {
				const statusKey = log.statusCode.toString();
				statusCodes[statusKey] = (statusCodes[statusKey] || 0) + 1;

				if (log.statusCode >= 400) {
					errorCount++;
				}
			}

			// Track response times
			if (log.responseTime) {
				totalResponseTime += log.responseTime;
				responseTimeCount++;
			}

			// Track unique users
			if (log.userEmail) {
				userEmails.add(log.userEmail);
			}

			// Count authenticated requests
			if (log.metadata?.authenticated) {
				authenticatedCount++;
			}

			// Requests by hour
			const hourKey = this.getHourKey(log.timestamp);
			requestsByHour[hourKey] = (requestsByHour[hourKey] || 0) + 1;
		}

		return {
			totalRequests: logs.length,
			requestsByEndpoint,
			requestsByMethod,
			statusCodes,
			averageResponseTime:
				responseTimeCount > 0
					? totalResponseTime / responseTimeCount
					: 0,
			errorRate: logs.length > 0 ? (errorCount / logs.length) * 100 : 0,
			requestsByHour,
			uniqueUsers: userEmails.size,
			authenticatedRequests: authenticatedCount,
		};
	}

	private calculateAuthMetrics(logs: AuthLogEvent[]): AuthMetrics {
		const loginsByProvider: Record<string, number> = {};
		const loginsByHour: Record<string, number> = {};
		const uniqueUsers = new Set<string>();

		let totalLogins = 0;
		let failedLogins = 0;

		for (const log of logs) {
			if (log.action === "LOGIN") {
				totalLogins++;

				if (log.provider) {
					loginsByProvider[log.provider] =
						(loginsByProvider[log.provider] || 0) + 1;
				}

				if (log.userEmail) {
					uniqueUsers.add(log.userEmail);
				}

				const hourKey = this.getHourKey(log.timestamp);
				loginsByHour[hourKey] = (loginsByHour[hourKey] || 0) + 1;
			} else if (log.action === "LOGIN_FAILED") {
				failedLogins++;
			}
		}

		return {
			totalLogins,
			loginsByProvider,
			failedLogins,
			uniqueUsers,
			loginsByHour,
			averageSessionsPerUser:
				uniqueUsers.size > 0 ? totalLogins / uniqueUsers.size : 0,
		};
	}

	private calculateChatMetrics(logs: ChatLogEvent[]): ChatMetrics {
		const chatsByModel: Record<string, number> = {};
		const chatsByHour: Record<string, number> = {};
		const uniqueUsers = new Set<string>();

		let totalTokens = 0;
		let totalResponseTime = 0;
		let responseTimeCount = 0;

		for (const log of logs) {
			if (log.model) {
				chatsByModel[log.model] = (chatsByModel[log.model] || 0) + 1;
			}

			if (log.tokens) {
				totalTokens += log.tokens.total;
			}

			if (log.userEmail) {
				uniqueUsers.add(log.userEmail);
			}

			if (log.responseTime) {
				totalResponseTime += log.responseTime;
				responseTimeCount++;
			}

			const hourKey = this.getHourKey(log.timestamp);
			chatsByHour[hourKey] = (chatsByHour[hourKey] || 0) + 1;
		}

		return {
			totalChats: logs.length,
			chatsByModel,
			averageTokensPerChat:
				logs.length > 0 ? totalTokens / logs.length : 0,
			totalTokens,
			chatsByHour,
			uniqueChatUsers: uniqueUsers.size,
			averageResponseTime:
				responseTimeCount > 0
					? totalResponseTime / responseTimeCount
					: 0,
		};
	}

	getMetrics(days: number = 7): SystemMetrics {
		const apiLogs = this.readLogFiles("api", days);
		const authLogs = this.readLogFiles("auth", days) as AuthLogEvent[];
		const chatLogs = this.readLogFiles("chat", days) as ChatLogEvent[];

		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - days);

		return {
			api: this.calculateApiMetrics(apiLogs),
			auth: this.calculateAuthMetrics(authLogs),
			chat: this.calculateChatMetrics(chatLogs),
			timeRange: {
				start: startDate.toISOString(),
				end: endDate.toISOString(),
			},
		};
	}

	// Get real-time metrics for the last hour
	getRealTimeMetrics(): SystemMetrics {
		return this.getMetrics(1);
	}

	// Get aggregated metrics for Grafana
	getGrafanaMetrics(days: number = 7): Record<string, string | number> {
		const metrics = this.getMetrics(days);

		return {
			api_total_requests: metrics.api.totalRequests,
			api_error_rate: metrics.api.errorRate,
			api_avg_response_time: metrics.api.averageResponseTime,
			api_unique_users: metrics.api.uniqueUsers,
			auth_total_logins: metrics.auth.totalLogins,
			auth_failed_logins: metrics.auth.failedLogins,
			auth_unique_users: metrics.auth.uniqueUsers.size,
			chat_total_chats: metrics.chat.totalChats,
			chat_total_tokens: metrics.chat.totalTokens,
			chat_unique_users: metrics.chat.uniqueChatUsers,
			timestamp: new Date().toISOString(),
		};
	}
}

export const metricsCollector = new MetricsCollector();
