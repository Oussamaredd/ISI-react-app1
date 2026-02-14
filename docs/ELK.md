# ELK Stack Integration Guide

This document explains how to use the ELK (Elasticsearch, Logstash, Kibana) stack for centralized logging.

## Components

### Elasticsearch
- **URL**: http://localhost:9200
- **Purpose**: Stores and indexes log data
- **Health Check**: http://localhost:9200/_cluster/health

### Logstash
- **Input**: TCP port 5001 for JSON logs
- **Output**: Elasticsearch with daily indices
- **Configuration**: `infrastructure/tooling/monitoring/elk/logstash/logstash.conf`

### Kibana
- **URL**: http://localhost:5601
- **Purpose**: Visualize and search log data
- **Default Login**: elastic/changeme (demo only)

## Setup

### Start ELK Stack
```bash
docker compose --env-file infrastructure/environments/.env.docker -f infrastructure/docker-compose.yml --profile obs up -d --build
```

### Verify Services
```bash
# Elasticsearch
curl http://localhost:9200/_cluster/health

# Logstash
docker logs logstash

# Kibana
curl http://localhost:5601/api/status
```

## Log Data Structure

Backend logs are sent as structured JSON with these fields:
```json
{
  "time": 1705233600000,
  "level": 30,
  "msg": "request completed",
  "method": "GET",
  "path": "/api/tickets",
  "status": 200,
  "requestId": "uuid-v4",
  "duration": 150,
  "userId": "user_123"
}
```

## Kibana Usage

### Access Kibana
1. Open http://localhost:5601 in browser
2. Navigate to "Stack Management" > "Index Patterns"
3. Create index pattern: `backend-logs-*`
4. Select time field: `@timestamp`

### Example Queries

#### View All Backend Logs
```
msg:("request completed" OR "request failed")
```

#### Find Error Logs
```
level:>=50
```

#### Track Specific Request
```
requestId:"550e8400-e29b-41d4-a716-446655440000"
```

#### Monitor API Endpoints
```
path:"/api/tickets" AND level:>=50
```

#### Response Time Analysis
```
duration:>1000
```

## Troubleshooting

### Common Issues

#### No Logs in Kibana
1. Check Logstash is running: `docker logs logstash`
2. Verify port connectivity: `telnet localhost 5001`
3. Check Elasticsearch: `curl http://localhost:9200/_cluster/health`

#### High Memory Usage
1. Reduce Elasticsearch heap: Set `ES_JAVA_OPTS=-Xms512m -Xmx512m`
2. Monitor disk space: Elasticsearch needs free space

#### Connection Issues
1. Verify Docker network: `docker compose ps`
2. Check ports: 9200 (ES), 5601 (Kibana), 5001 (Logstash)
3. Firewall: Ensure ports are accessible

### Logstash Configuration Issues
```bash
# Test Logstash config
docker exec logstash /usr/share/logstash/bin/logstash --config.test_and_exit

# Check syntax errors
docker logs logstash | grep ERROR
```

### Performance Tuning

#### Elasticsearch
```yaml
# In docker-compose.yml
environment:
  - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
  - "discovery.type=single-node"
```

#### Logstash
```conf
# Adjust pipeline workers
pipeline.workers: 2
pipeline.batch.size: 125
```

## Security Considerations

### Production Setup
- Change default passwords
- Enable SSL/TLS
- Use proper encryption keys
- Set up access controls
- Monitor for security logs

### Network Security
- Restrict access to ELK ports
- Use VPN or private networks
- Implement authentication for Kibana

## Alternative: File-Based Monitoring

If ELK stack causes issues, you can monitor logs directly:

```bash
# View backend logs
docker logs -f ticket_backend

# View all logs
docker compose logs -f
```

## Integration with Alerts

### Email Alerts (Optional)
```conf
# In logstash.conf
output {
  email {
    to: "admin@example.com"
    subject: "Backend Alert: %{level}"
    body: "Service: %{service}\\nMessage: %{message}"
  }
}
```

### Slack Integration (Optional)
Use Webhook output plugin for real-time notifications.

## Monitoring Dashboards

### Recommended Kibana Visualizations
1. **Request Rate**: Count of requests over time
2. **Error Rate**: Number of errors per minute
3. **Response Time**: Histogram of request durations
4. **Status Codes**: Pie chart of HTTP status codes
5. **User Activity**: Authentication events

### Dashboard Metrics
- Requests per minute/hour
- Error percentage
- Average response time
- Top requested endpoints
- Geolocation of requests

## Cleanup and Maintenance

### Log Rotation
Elasticsearch indices are created daily with pattern `backend-logs-YYYY.MM.dd`.

```bash
# Delete old indices (7 days)
curl -X DELETE "localhost:9200/backend-logs-$(date -d '7 days ago' +%Y.%m.%d)"
```

### Disk Usage Monitoring
```bash
# Check Elasticsearch data directory
docker exec elasticsearch du -sh /usr/share/elasticsearch/data

# Monitor index sizes
curl localhost:9200/_cat/indices?v
```

This setup provides comprehensive visibility into application behavior and performance.
