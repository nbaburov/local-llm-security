/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { metricsCollector } from "@/lib/metrics";
import { withLogging } from "@/lib/middleware";

async function metricsHandler(request: NextRequest): Promise<NextResponse> {
	try {
		// Check authentication for metrics access
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { searchParams } = new URL(request.url);
		const days = parseInt(searchParams.get("days") || "7");
		const format = searchParams.get("format") || "json";
		const realtime = searchParams.get("realtime") === "true";

		if (days < 1 || days > 30) {
			return NextResponse.json(
				{ error: "Days parameter must be between 1 and 30" },
				{ status: 400 }
			);
		}

		const metrics = realtime
			? metricsCollector.getRealTimeMetrics()
			: metricsCollector.getMetrics(days);

		// Return different formats based on request
		switch (format) {
			case "grafana":
				// Grafana-compatible format
				const grafanaMetrics = metricsCollector.getGrafanaMetrics(days);
				return NextResponse.json(grafanaMetrics);

			case "prometheus":
				// Prometheus metrics format
				const prometheusText = generatePrometheusMetrics(metrics);
				return new NextResponse(prometheusText, {
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});

			default:
				// Standard JSON format with all details
				return NextResponse.json({
					status: "success",
					data: {
						...metrics,
						auth: {
							...metrics.auth,
							uniqueUsers: Array.from(metrics.auth.uniqueUsers), // Convert Set to Array
						},
					},
					metadata: {
						generatedAt: new Date().toISOString(),
						daysIncluded: days,
						realtime,
					},
				});
		}
	} catch (error) {
		console.error("Metrics API error:", error);
		return NextResponse.json(
			{ error: "Failed to generate metrics" },
			{ status: 500 }
		);
	}
}

function generatePrometheusMetrics(metrics: any): string {
	const timestamp = Date.now();

	return `
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total ${metrics.api.totalRequests} ${timestamp}

# HELP api_response_time_avg Average API response time in milliseconds
# TYPE api_response_time_avg gauge
api_response_time_avg ${metrics.api.averageResponseTime} ${timestamp}

# HELP api_error_rate Percentage of failed requests
# TYPE api_error_rate gauge
api_error_rate ${metrics.api.errorRate} ${timestamp}

# HELP api_unique_users Number of unique users
# TYPE api_unique_users gauge
api_unique_users ${metrics.api.uniqueUsers} ${timestamp}

# HELP auth_logins_total Total number of successful logins
# TYPE auth_logins_total counter
auth_logins_total ${metrics.auth.totalLogins} ${timestamp}

# HELP auth_failed_logins_total Total number of failed login attempts
# TYPE auth_failed_logins_total counter
auth_failed_logins_total ${metrics.auth.failedLogins} ${timestamp}

# HELP chat_messages_total Total number of chat messages
# TYPE chat_messages_total counter
chat_messages_total ${metrics.chat.totalChats} ${timestamp}

# HELP chat_tokens_total Total tokens used in chat
# TYPE chat_tokens_total counter
chat_tokens_total ${metrics.chat.totalTokens} ${timestamp}

# HELP chat_unique_users Number of unique chat users
# TYPE chat_unique_users gauge
chat_unique_users ${metrics.chat.uniqueChatUsers} ${timestamp}
`.trim();
}

// Wrap the handler with logging
export const GET = withLogging(metricsHandler, "/api/metrics");
