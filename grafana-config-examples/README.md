# Grafana Configuration Examples

This directory contains example configuration files for integrating your NextJS LLM application with Grafana monitoring.

## Files

-   `prometheus.yml` - Standalone Prometheus configuration
-   `grafana-agent.yml` - Grafana Agent configuration for Grafana Cloud

## Quick Setup

### 1. Set Your API Key

First, set your Grafana API key in your environment:

```bash
# In your .env.local file
GRAFANA_API_KEY=your-secure-api-key-here
```

Generate a secure key:

```bash
openssl rand -hex 32
```

### 2. Choose Your Setup

#### Option A: Standalone Prometheus + Grafana

1. Copy `prometheus.yml` to your Prometheus directory
2. Update the `credentials` field with your API key
3. Update the `targets` field with your app URL
4. Start Prometheus: `./prometheus --config.file=prometheus.yml`
5. Configure Grafana to use Prometheus as data source

#### Option B: Grafana Cloud with Agent

1. Copy `grafana-agent.yml` to your agent directory
2. Update all `<your_grafana_cloud_*>` placeholders with your Grafana Cloud details
3. Update the `credentials` field with your app's API key
4. Update the `targets` field with your app URL
5. Start the agent: `grafana-agent --config.file=grafana-agent.yml`

## Testing Your Setup

Test that metrics are accessible:

```bash
# Test the metrics endpoint
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3000/api/metrics/prometheus

# Should return Prometheus-formatted metrics
```

## Grafana Dashboard

Once your metrics are flowing, create dashboards with queries like:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time 95th percentile
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Troubleshooting

-   **401 Unauthorized**: Check your API key is correct
-   **No metrics**: Verify your app is running and accessible
-   **Connection refused**: Check target URLs and network connectivity

For more detailed setup instructions, see the main `LOGGING_SETUP.md` file.
