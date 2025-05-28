# Logging and Monitoring Setup Guide

This guide explains how to set up and use the comprehensive logging and monitoring system for your Next.js LLM application.

## Features

-   ✅ **Centralized Logging**: All API requests, authentication events, and chat interactions
-   ✅ **Real-time Metrics**: Performance monitoring with response times and error rates
-   ✅ **Standalone Dashboard**: Built-in monitoring interface at `/monitoring`
-   ✅ **Grafana Integration**: Full Prometheus-compatible metrics export with API key auth
-   ✅ **Log Rotation**: Automatic file management with size limits
-   ✅ **Security Tracking**: Failed login attempts and suspicious activity

## Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   API Requests  │───▶│   Middleware │───▶│   Logger    │
└─────────────────┘    └──────────────┘    └─────────────┘
                                                   │
┌─────────────────┐    ┌──────────────┐           ▼
│   Auth Events   │───▶│  NextAuth    │    ┌─────────────┐
└─────────────────┘    └──────────────┘    │ Log Files   │
                                           │ (JSONL)     │
┌─────────────────┐    ┌──────────────┐    └─────────────┘
│  Chat Activity  │───▶│ Chat Handler │           │
└─────────────────┘    └──────────────┘           ▼
                                           ┌─────────────┐
                                           │ Prometheus  │
                                           │  Metrics    │
                                           │ (prom-client)│
                                           └─────────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              ▼                    ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  Dashboard  │     │  API JSON   │     │ Prometheus  │
                    │ /monitoring │     │ /api/metrics│     │/api/metrics/│
                    └─────────────┘     └─────────────┘     │ prometheus  │
                                                           └─────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm install prom-client
```

### 2. Environment Configuration

Create a `.env.local` file with:

```bash
# Grafana Metrics API Key
# This key is used for Grafana to access the /api/metrics endpoints
# Change this to a secure random string in production
GRAFANA_API_KEY=your-secure-api-key-here

# Optional: Other logging configuration
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

### 3. Files Already Created

The logging system includes these new files:

-   `src/lib/logger.ts` - Core logging functionality with Prometheus integration
-   `src/lib/middleware.ts` - Request/response logging middleware
-   `src/lib/metrics.ts` - Metrics aggregation with prom-client integration
-   `src/app/api/metrics/route.ts` - Main metrics API endpoint
-   `src/app/api/metrics/prometheus/route.ts` - Dedicated Prometheus endpoint
-   `src/app/monitoring/page.tsx` - Standalone dashboard

### 4. Automatic Setup

The logging system will automatically:

-   Create a `logs/` directory in your project root
-   Generate daily log files in JSONL format
-   Update Prometheus metrics in real-time
-   Rotate log files when they exceed 50MB
-   Keep the last 10 rotated files per log type

## Grafana Integration

### Authentication Methods

The system supports **API key authentication** for Grafana, eliminating the need for session-based auth:

1. **Authorization Header** (Recommended):

    ```
    Authorization: Bearer your-secure-api-key-here
    ```

2. **Query Parameter** (Alternative):
    ```
    /api/metrics/prometheus?api_key=your-secure-api-key-here
    ```

### Setup Options

#### Option 1: Prometheus + Grafana (Recommended)

This is the standard approach following Grafana's Node.js integration pattern.

**Step 1: Configure Prometheus**

Create `prometheus.yml`:

```yaml
global:
    scrape_interval: 30s

scrape_configs:
    - job_name: "nextjs-llm-app"
      static_configs:
          - targets: ["localhost:3000"] # Your app URL
      metrics_path: "/api/metrics/prometheus"
      authorization:
          credentials: "your-secure-api-key-here" # Your GRAFANA_API_KEY
      scrape_interval: 30s
      scrape_timeout: 10s
```

**Step 2: Run Prometheus**

```bash
# Download and run Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.darwin-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
./prometheus --config.file=prometheus.yml
```

**Step 3: Configure Grafana**

1. Add Prometheus data source in Grafana:

    ```
    URL: http://localhost:9090
    Access: Server (default)
    ```

2. Import dashboard or create panels with queries like:

    ```promql
    # HTTP Request Rate
    rate(http_requests_total[5m])

    # Response Time 95th Percentile
    histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

    # Error Rate
    rate(http_requests_total{status_code=~"4..|5.."}[5m]) / rate(http_requests_total[5m])

    # Active Users
    active_users_total

    # Chat Messages
    rate(chat_messages_total[5m])
    ```

#### Option 2: Direct HTTP Data Source

For simpler setups without Prometheus:

**Step 1: Add HTTP Data Source in Grafana**

```
Name: NextJS LLM Metrics
URL: http://your-app-domain/api/metrics
Auth: Custom Headers
Header Name: Authorization
Header Value: Bearer your-secure-api-key-here
```

**Step 2: Create Dashboard Panels**

Use JSON path queries:

```
# Total Requests
$.data.api.totalRequests

# Error Rate
$.data.api.errorRate

# Response Time
$.data.api.averageResponseTime
```

#### Option 3: Grafana Agent (Cloud/Enterprise)

For Grafana Cloud integration:

**Step 1: Install Grafana Agent**

```bash
# macOS
brew install grafana-agent

# Linux
wget https://github.com/grafana/agent/releases/latest/download/grafana-agent-linux-amd64.zip
```

**Step 2: Configure Agent**

Create `agent.yml`:

```yaml
integrations:
    prometheus_remote_write:
        - basic_auth:
              password: <your_grafana_cloud_token>
              username: <your_grafana_cloud_user>
          url: <your_grafana_cloud_prometheus_url>

metrics:
    configs:
        - name: integrations
          remote_write:
              - basic_auth:
                    password: <your_grafana_cloud_token>
                    username: <your_grafana_cloud_user>
                url: <your_grafana_cloud_prometheus_url>
          scrape_configs:
              - job_name: integrations/nodejs
                static_configs:
                    - targets: ["localhost:3000"]
                metrics_path: "/api/metrics/prometheus"
                authorization:
                    credentials: "your-secure-api-key-here"
                relabel_configs:
                    - replacement: "your-instance-name"
                      target_label: instance
    global:
        scrape_interval: 60s
```

**Step 3: Run Agent**

```bash
grafana-agent --config.file=agent.yml
```

### Security Configuration

#### API Key Management

1. **Generate Secure Key**:

    ```bash
    # Generate a secure random key
    openssl rand -hex 32
    ```

2. **Set Environment Variable**:

    ```bash
    # In .env.local
    GRAFANA_API_KEY=your-generated-secure-key
    ```

3. **Rotate Keys Regularly**:
    - Update the key in your environment
    - Update Grafana/Prometheus configuration
    - Restart services

#### Network Security

1. **Firewall Rules**: Restrict access to metrics endpoints
2. **HTTPS**: Use TLS in production
3. **Rate Limiting**: Consider adding rate limits to metrics endpoints

## Available Metrics

### Prometheus Metrics (Standard Format)

The system exports these Prometheus-compatible metrics:

#### HTTP Metrics

-   `http_requests_total{method, endpoint, status_code}` - Total HTTP requests
-   `http_request_duration_seconds{method, endpoint}` - Request duration histogram

#### Authentication Metrics

-   `auth_events_total{action, provider}` - Authentication events counter

#### Chat Metrics

-   `chat_messages_total{model}` - Chat messages counter
-   `chat_tokens_total{model, type}` - Token usage counter

#### System Metrics

-   `active_users_total{timeframe}` - Active users gauge
-   `nodejs_*` - Standard Node.js metrics (memory, CPU, etc.)
-   `process_*` - Process metrics

### Custom Dashboard Metrics (JSON Format)

Access via `/api/metrics?format=json`:

#### API Metrics

-   `totalRequests`: Total number of API requests
-   `averageResponseTime`: Mean response time in milliseconds
-   `errorRate`: Percentage of requests resulting in 4xx/5xx status codes
-   `uniqueUsers`: Number of distinct users (by email/IP)
-   `requestsByEndpoint`: Request count per API endpoint
-   `statusCodes`: Distribution of HTTP response codes

#### Authentication Metrics

-   `totalLogins`: Successful authentication attempts
-   `failedLogins`: Failed authentication attempts
-   `uniqueUsers`: Distinct users who have logged in
-   `loginsByProvider`: Login distribution by OAuth provider
-   `averageSessionsPerUser`: Average logins per user

#### Chat Metrics

-   `totalChats`: Total chat interactions
-   `totalTokens`: Sum of all tokens used
-   `averageTokensPerChat`: Mean tokens per conversation
-   `chatsByModel`: Usage distribution by AI model
-   `uniqueChatUsers`: Distinct users who have used chat
-   `averageResponseTime`: Mean chat response time

## Sample Grafana Dashboard

### Dashboard JSON Template

```json
{
	"dashboard": {
		"title": "LLM Application Monitoring",
		"tags": ["nodejs", "llm", "monitoring"],
		"panels": [
			{
				"title": "HTTP Request Rate",
				"type": "graph",
				"targets": [
					{
						"expr": "rate(http_requests_total[5m])",
						"legendFormat": "{{method}} {{endpoint}}"
					}
				]
			},
			{
				"title": "Response Time P95",
				"type": "graph",
				"targets": [
					{
						"expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
						"legendFormat": "95th Percentile"
					}
				]
			},
			{
				"title": "Error Rate",
				"type": "singlestat",
				"targets": [
					{
						"expr": "rate(http_requests_total{status_code=~\"4..|5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
						"legendFormat": "Error Rate %"
					}
				]
			},
			{
				"title": "Active Users",
				"type": "stat",
				"targets": [
					{
						"expr": "active_users_total{timeframe=\"24h\"}",
						"legendFormat": "24h Active Users"
					}
				]
			},
			{
				"title": "Chat Activity",
				"type": "graph",
				"targets": [
					{
						"expr": "rate(chat_messages_total[5m])",
						"legendFormat": "Messages/sec"
					}
				]
			},
			{
				"title": "Memory Usage",
				"type": "graph",
				"targets": [
					{
						"expr": "nodejs_heap_size_used_bytes / 1024 / 1024",
						"legendFormat": "Heap Used (MB)"
					}
				]
			}
		]
	}
}
```

### Alert Rules

Create these alert rules in Grafana:

```yaml
# High Error Rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 2m
  labels:
      severity: warning
  annotations:
      summary: "High error rate detected"

# High Response Time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
      severity: warning
  annotations:
      summary: "High response time detected"

# Memory Usage
- alert: HighMemoryUsage
  expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.9
  for: 5m
  labels:
      severity: critical
  annotations:
      summary: "High memory usage detected"
```

## Troubleshooting

### Common Issues

1. **Metrics endpoint returns 401**

    ```bash
    # Check API key is set
    echo $GRAFANA_API_KEY

    # Test endpoint
    curl -H "Authorization: Bearer your-api-key" \
      http://localhost:3000/api/metrics/prometheus
    ```

2. **Prometheus can't scrape metrics**

    ```yaml
    # Check prometheus.yml configuration
    # Verify target URL is accessible
    # Check authorization credentials
    ```

3. **Missing metrics in Grafana**

    ```bash
    # Verify Prometheus is scraping
    # Check Prometheus targets page
    # Verify data source configuration
    ```

4. **High memory usage**
    ```bash
    # Check metrics registry size
    # Consider reducing scrape frequency
    # Monitor log file sizes
    ```

### Performance Optimization

1. **Reduce Scrape Frequency**:

    ```yaml
    scrape_interval: 60s # Instead of 15s
    ```

2. **Filter Metrics**:

    ```yaml
    metric_relabel_configs:
        - source_labels: [__name__]
          regex: "nodejs_gc_.*"
          action: drop
    ```

3. **Optimize Log Rotation**:
    ```typescript
    // In logger.ts
    private maxFileSize: number = 10 * 1024 * 1024; // 10MB
    private maxFiles: number = 5; // Keep fewer files
    ```

## Security & Privacy

### Data Protection

-   **No sensitive data** is logged (passwords, tokens, etc.)
-   **User identification** uses email addresses only
-   **IP addresses** are logged for security monitoring
-   **API keys** are environment-based and rotatable

### Access Control

-   **Metrics endpoints**: Require API key authentication
-   **Dashboard**: Requires user session authentication
-   **Log files**: Server filesystem access only

### Best Practices

1. **Rotate API keys** regularly (monthly recommended)
2. **Use HTTPS** in production
3. **Restrict network access** to metrics endpoints
4. **Monitor access logs** for suspicious activity
5. **Set up alerts** for authentication failures

This comprehensive setup provides enterprise-grade monitoring for your LLM application with minimal configuration required.
